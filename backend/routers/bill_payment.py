from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
import uuid

from raw_database import get_connection
from schemas.bill_payment import BillPaymentCreate
from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/bill-payments",
    tags=["Bill Payments"]
)


@router.post("/")
def create_bill_payment(payment_data: BillPaymentCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ------------------------------------------------
        # 1. Check customer
        # ------------------------------------------------

        cursor.execute("""
            SELECT
                customer_id,
                user_id,
                status
            FROM customers
            WHERE customer_id = %s
        """, (payment_data.customer_id,))

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        if customer["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Customer is not active"
            )

        customer_user_id = customer["user_id"]

        # ------------------------------------------------
        # 2. Lock and check account
        # ------------------------------------------------

        cursor.execute("""
            SELECT
                account_id,
                account_number,
                customer_id,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
        """, (payment_data.account_id,))

        account = cursor.fetchone()

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )

        # Make sure account belongs to customer
        if account["customer_id"] != payment_data.customer_id:
            raise HTTPException(
                status_code=403,
                detail="This account does not belong to the customer"
            )

        # ------------------------------------------------
        # 3. Check available balance
        # ------------------------------------------------

        if float(account["available_balance"]) < float(
            payment_data.amount
        ):
            raise HTTPException(
                status_code=400,
                detail="Insufficient available balance"
            )

        # ------------------------------------------------
        # 4. Check biller
        # ------------------------------------------------

        cursor.execute("""
            SELECT
                biller_id,
                biller_name,
                category,
                status
            FROM billers
            WHERE biller_id = %s
        """, (payment_data.biller_id,))

        biller = cursor.fetchone()

        if not biller:
            raise HTTPException(
                status_code=404,
                detail="Biller not found"
            )

        if biller["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Biller is not active"
            )

        # ------------------------------------------------
        # 5. Generate transaction reference
        # ------------------------------------------------

        reference_no = (
            "BIL-" +
            uuid.uuid4().hex[:20].upper()
        )

        # ------------------------------------------------
        # 6. Create transaction
        # transaction_type_id = 4 → BILL_PAYMENT
        # ------------------------------------------------

        cursor.execute("""
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
                4,
                %s,
                %s,
                %s,
                0.00,
                NOW(),
                'SUCCESS',
                %s
            )
        """, (
            reference_no,
            payment_data.initiated_by_user_id,
            payment_data.amount,
            f"Bill payment to {biller['biller_name']}"
        ))

        transaction_id = cursor.lastrowid

        # ------------------------------------------------
        # 7. Create DEBIT entry
        # ------------------------------------------------

        cursor.execute("""
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
        """, (
            transaction_id,
            payment_data.account_id,
            payment_data.amount
        ))

        # ------------------------------------------------
        # 8. Deduct money from account
        # ------------------------------------------------

        cursor.execute("""
            UPDATE accounts
            SET
                balance = balance - %s,
                available_balance = available_balance - %s
            WHERE account_id = %s
        """, (
            payment_data.amount,
            payment_data.amount,
            payment_data.account_id
        ))

        # ------------------------------------------------
        # 9. Create bill payment record
        # ------------------------------------------------

        cursor.execute("""
            INSERT INTO bill_payments
            (
                customer_id,
                account_id,
                biller_id,
                transaction_id,
                customer_reference,
                amount,
                payment_date,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW(),
                'SUCCESS'
            )
        """, (
            payment_data.customer_id,
            payment_data.account_id,
            payment_data.biller_id,
            transaction_id,
            payment_data.customer_reference,
            payment_data.amount
        ))

        bill_payment_id = cursor.lastrowid

        # ------------------------------------------------
        # 10. Create customer notification
        # ------------------------------------------------

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Bill Payment Successful",
            message=(
                f"Your payment of BDT "
                f"{float(payment_data.amount):.2f} "
                f"to {biller['biller_name']} "
                f"was completed successfully."
            ),
            notification_type="BILL_PAYMENT"
        )

        # ------------------------------------------------
        # 11. Create audit log
        # ------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=payment_data.initiated_by_user_id,
            action="BILL_PAYMENT_COMPLETED",
            entity_type="BILL_PAYMENT",
            entity_id=bill_payment_id,
            old_value=None,
            new_value={
                "transaction_id":
                    transaction_id,

                "customer_id":
                    payment_data.customer_id,

                "account_id":
                    payment_data.account_id,

                "biller_id":
                    payment_data.biller_id,

                "biller_name":
                    biller["biller_name"],

                "customer_reference":
                    payment_data.customer_reference,

                "amount":
                    float(payment_data.amount),

                "reference_no":
                    reference_no,

                "status":
                    "SUCCESS"
            },
            ip_address=None
        )

        # ------------------------------------------------
        # 12. Commit everything
        # ------------------------------------------------

        connection.commit()

        return {
            "message": "Bill payment completed successfully",
            "bill_payment_id": bill_payment_id,
            "transaction_id": transaction_id,
            "reference_no": reference_no,
            "customer_id": payment_data.customer_id,
            "account_id": payment_data.account_id,
            "biller_id": payment_data.biller_id,
            "biller_name": biller["biller_name"],
            "amount": float(payment_data.amount),
            "transaction_type": "BILL_PAYMENT",
            "entry_type": "DEBIT",
            "status": "SUCCESS"
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Bill payment could not be completed "
                "because of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Bill payment failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()
        
# ========================================
# GET ALL BILL PAYMENTS
# ========================================

@router.get("/")
def get_bill_payments():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                bill_payment_id,
                customer_id,
                account_id,
                biller_id,
                transaction_id,
                customer_reference,
                amount,
                payment_date,
                status
            FROM bill_payments
            ORDER BY bill_payment_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load bill payments: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()