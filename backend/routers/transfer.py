from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
import uuid

from raw_database import get_connection
from schemas.transfer import TransferCreate
from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/transfers",
    tags=["Transfers"]
)


@router.post("/")
def create_transfer(transfer_data: TransferCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------
        # 1. Prevent same account transfer
        # ----------------------------------------

        if (
            transfer_data.sender_account_id
            == transfer_data.receiver_account_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Sender and receiver accounts cannot be the same"
            )

        # ----------------------------------------
        # 2. Start MySQL transaction
        # ----------------------------------------

        connection.begin()

        # ----------------------------------------
        # 3. Get sender account
        # ----------------------------------------

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
            (transfer_data.sender_account_id,)
        )

        sender = cursor.fetchone()

        if not sender:
            raise HTTPException(
                status_code=404,
                detail="Sender account not found"
            )

        # ----------------------------------------
        # 4. Get receiver account
        # ----------------------------------------

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
            (transfer_data.receiver_account_id,)
        )

        receiver = cursor.fetchone()

        if not receiver:
            raise HTTPException(
                status_code=404,
                detail="Receiver account not found"
            )

        # ----------------------------------------
        # 5. Check account status
        # ----------------------------------------

        if sender["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Sender account is not active"
            )

        if receiver["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Receiver account is not active"
            )

        # ----------------------------------------
        # 6. Check sender balance
        # ----------------------------------------

        if float(sender["available_balance"]) < float(
            transfer_data.amount
        ):
            raise HTTPException(
                status_code=400,
                detail="Insufficient available balance"
            )

        # ----------------------------------------
        # 7. Get sender user ID
        # ----------------------------------------

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (sender["customer_id"],)
        )

        sender_customer = cursor.fetchone()

        sender_user_id = (
            sender_customer["user_id"]
            if sender_customer
            else None
        )

        # ----------------------------------------
        # 8. Get receiver user ID
        # ----------------------------------------

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (receiver["customer_id"],)
        )

        receiver_customer = cursor.fetchone()

        receiver_user_id = (
            receiver_customer["user_id"]
            if receiver_customer
            else None
        )

        # ----------------------------------------
        # 9. Generate reference number
        # ----------------------------------------

        reference_no = (
            "TRF-"
            + uuid.uuid4().hex[:20].upper()
        )

        # ----------------------------------------
        # 10. Create transaction
        # transaction_type_id = 3 → TRANSFER
        # ----------------------------------------

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
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW(),
                'SUCCESS',
                %s
            )
            """,
            (
                3,
                reference_no,
                transfer_data.initiated_by_user_id,
                transfer_data.amount,
                0.00,
                transfer_data.description
            )
        )

        transaction_id = cursor.lastrowid

        # ----------------------------------------
        # 11. Create DEBIT entry
        # ----------------------------------------

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
                transfer_data.sender_account_id,
                transfer_data.amount
            )
        )

        # ----------------------------------------
        # 12. Create CREDIT entry
        # ----------------------------------------

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
                'CREDIT',
                %s
            )
            """,
            (
                transaction_id,
                transfer_data.receiver_account_id,
                transfer_data.amount
            )
        )

        # ----------------------------------------
        # 13. Update sender balance
        # ----------------------------------------

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance - %s,
                available_balance = available_balance - %s
            WHERE account_id = %s
            """,
            (
                transfer_data.amount,
                transfer_data.amount,
                transfer_data.sender_account_id
            )
        )

        # ----------------------------------------
        # 14. Update receiver balance
        # ----------------------------------------

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance + %s,
                available_balance = available_balance + %s
            WHERE account_id = %s
            """,
            (
                transfer_data.amount,
                transfer_data.amount,
                transfer_data.receiver_account_id
            )
        )

        # ----------------------------------------
        # 15. Create sender notification
        # ----------------------------------------

        create_notification(
            cursor=cursor,
            user_id=sender_user_id,
            title="Transfer Successful",
            message=(
                f"BDT {float(transfer_data.amount):.2f} "
                f"was transferred successfully "
                f"from your account."
            ),
            notification_type="TRANSFER"
        )

        # ----------------------------------------
        # 16. Create receiver notification
        # ----------------------------------------

        create_notification(
            cursor=cursor,
            user_id=receiver_user_id,
            title="Money Received",
            message=(
                f"BDT {float(transfer_data.amount):.2f} "
                f"was received in your account."
            ),
            notification_type="TRANSFER"
        )

        # ----------------------------------------
        # 17. Create audit log
        # ----------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=transfer_data.initiated_by_user_id,
            action="TRANSFER_COMPLETED",
            entity_type="TRANSACTION",
            entity_id=transaction_id,
            old_value=None,
            new_value={
                "sender_account_id":
                    transfer_data.sender_account_id,

                "receiver_account_id":
                    transfer_data.receiver_account_id,

                "amount":
                    float(transfer_data.amount),

                "reference_no":
                    reference_no,

                "status":
                    "SUCCESS"
            },
            ip_address=None
        )

        # ----------------------------------------
        # 18. Commit everything
        # ----------------------------------------

        connection.commit()

        return {
            "message": "Transfer completed successfully",
            "transaction_id": transaction_id,
            "reference_no": reference_no,
            "amount": float(transfer_data.amount),
            "sender_account_id":
                transfer_data.sender_account_id,
            "receiver_account_id":
                transfer_data.receiver_account_id,
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
                "Transfer could not be completed "
                "because of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transfer failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()