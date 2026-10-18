from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
import uuid

from raw_database import get_connection
from schemas.card_transaction import CardPaymentCreate

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/card-transactions",
    tags=["Card Transactions"]
)


@router.post("/")
def create_card_transaction(data: CardPaymentCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. LOCK AND LOAD CARD
        # ========================================

        cursor.execute(
            """
            SELECT
                card_id,
                account_id,
                customer_id,
                card_type,
                expiry_date,
                status
            FROM cards
            WHERE card_id = %s
            FOR UPDATE
            """,
            (data.card_id,)
        )

        card = cursor.fetchone()

        if not card:
            raise HTTPException(
                status_code=404,
                detail="Card not found"
            )

        # ========================================
        # 2. CHECK CARD STATUS
        # ========================================

        if card["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail=f"Card is {card['status']}"
            )

        # ========================================
        # 3. CHECK CARD EXPIRY
        # ========================================

        cursor.execute(
            """
            SELECT
                CASE
                    WHEN %s < CURDATE()
                    THEN 1
                    ELSE 0
                END AS expired
            """,
            (card["expiry_date"],)
        )

        expiry_result = cursor.fetchone()

        if expiry_result["expired"] == 1:

            cursor.execute(
                """
                UPDATE cards
                SET status = 'EXPIRED'
                WHERE card_id = %s
                """,
                (data.card_id,)
            )

            raise HTTPException(
                status_code=400,
                detail="Card has expired"
            )

        # ========================================
        # 4. CURRENT DATABASE SUPPORTS
        #    DEBIT CARD SPENDING
        # ========================================

        if card["card_type"] != "DEBIT":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Credit card spending is not "
                    "supported by the current database structure"
                )
            )

        # ========================================
        # 5. LOCK LINKED ACCOUNT
        # ========================================

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (card["account_id"],)
        )

        account = cursor.fetchone()

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Linked account not found"
            )

        # ========================================
        # 6. CHECK ACCOUNT STATUS
        # ========================================

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Linked account is not active"
            )

        # ========================================
        # 7. VERIFY CUSTOMER OWNERSHIP
        # ========================================

        if account["customer_id"] != card["customer_id"]:
            raise HTTPException(
                status_code=400,
                detail="Card and account customer mismatch"
            )

        # ========================================
        # 8. CHECK AVAILABLE BALANCE
        # ========================================

        if (
            float(account["available_balance"])
            < float(data.amount)
        ):
            raise HTTPException(
                status_code=400,
                detail="Insufficient available balance"
            )

        # ========================================
        # 9. GET CUSTOMER USER ID
        # ========================================

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (card["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        # ========================================
        # 10. GENERATE REFERENCE NUMBER
        # ========================================

        reference_no = (
            "CRD-" +
            uuid.uuid4().hex[:20].upper()
        )

        # ========================================
        # 11. CREATE TRANSACTION
        # transaction_type_id = 7 → CARD
        # ========================================

        cursor.execute(
            """
            INSERT INTO transactions
            (
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            )
            VALUES
            (
                7,
                %s,
                %s,
                %s,
                0.00,
                NOW(),
                'SUCCESS',
                %s
            )
            """,
            (
                reference_no,
                data.initiated_by_user_id,
                data.amount,
                data.description or "Card payment"
            )
        )

        transaction_id = cursor.lastrowid

        # ========================================
        # 12. CREATE DEBIT ENTRY
        # ========================================

        cursor.execute(
            """
            INSERT INTO transaction_entries
            (
                transaction_id,
                account_id,
                entry_type,
                amount
            )
            VALUES
            (
                %s,
                %s,
                'DEBIT',
                %s
            )
            """,
            (
                transaction_id,
                card["account_id"],
                data.amount
            )
        )

        # ========================================
        # 13. DEDUCT ACCOUNT BALANCE
        # ========================================

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance - %s,
                available_balance = available_balance - %s
            WHERE account_id = %s
            """,
            (
                data.amount,
                data.amount,
                card["account_id"]
            )
        )

        # ========================================
        # 14. CREATE CARD TRANSACTION RECORD
        # ========================================

        cursor.execute(
            """
            INSERT INTO card_transactions
            (
                card_id,
                transaction_id,
                merchant_name,
                merchant_category
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                data.card_id,
                transaction_id,
                data.merchant_name,
                data.merchant_category
            )
        )

        card_transaction_id = cursor.lastrowid

        # ========================================
        # 15. CREATE CUSTOMER NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Card Payment Successful",
            message=(
                f"BDT {float(data.amount):.2f} "
                f"was charged to your debit card"
                + (
                    f" at {data.merchant_name}."
                    if data.merchant_name
                    else "."
                )
            ),
            notification_type="CARD"
        )

        # ========================================
        # 16. CREATE AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=data.initiated_by_user_id,
            action="CARD_PAYMENT_COMPLETED",
            entity_type="CARD_TRANSACTION",
            entity_id=card_transaction_id,

            old_value={
                "account_balance":
                    float(account["balance"]),

                "available_balance":
                    float(account["available_balance"])
            },

            new_value={
                "transaction_id":
                    transaction_id,

                "card_id":
                    data.card_id,

                "account_id":
                    card["account_id"],

                "customer_id":
                    card["customer_id"],

                "amount":
                    float(data.amount),

                "merchant_name":
                    data.merchant_name,

                "merchant_category":
                    data.merchant_category,

                "reference_no":
                    reference_no,

                "status":
                    "SUCCESS"
            },

            ip_address=None
        )

        # ========================================
        # 17. COMMIT EVERYTHING
        # ========================================

        connection.commit()

        return {
            "message":
                "Card payment completed successfully",

            "card_transaction_id":
                card_transaction_id,

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "card_id":
                data.card_id,

            "account_id":
                card["account_id"],

            "amount":
                float(data.amount),

            "merchant_name":
                data.merchant_name,

            "merchant_category":
                data.merchant_category,

            "transaction_type":
                "CARD",

            "entry_type":
                "DEBIT",

            "status":
                "SUCCESS"
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Card transaction failed because "
                "of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Card transaction failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()
        


@router.get("/")
def get_card_transactions():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                card_transaction_id,
                card_id,
                transaction_id,
                merchant_name,
                merchant_category
            FROM card_transactions
            ORDER BY card_transaction_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load card transactions: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()