from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection
from schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate
)

from utils.system_events import create_audit_log


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


# ========================================
# CREATE TRANSACTION
# ========================================

@router.post(
    "/",
    response_model=TransactionResponse
)
def create_transaction(
    transaction_data: TransactionCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

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
                'PENDING',
                %s
            )
            """,
            (
                transaction_data.transaction_type_id,
                transaction_data.reference_no,
                transaction_data.initiated_by_user_id,
                transaction_data.amount,
                transaction_data.fee,
                transaction_data.description
            )
        )

        transaction_id = cursor.lastrowid

        # ----------------------------------------
        # Audit log
        # ----------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=transaction_data.initiated_by_user_id,
            action="TRANSACTION_CREATED",
            entity_type="TRANSACTION",
            entity_id=transaction_id,

            old_value=None,

            new_value={
                "transaction_type_id":
                    transaction_data.transaction_type_id,

                "reference_no":
                    transaction_data.reference_no,

                "amount":
                    float(transaction_data.amount),

                "fee":
                    float(transaction_data.fee),

                "status":
                    "PENDING",

                "description":
                    transaction_data.description
            },

            ip_address=None
        )

        # ----------------------------------------
        # Load created transaction
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                transaction_id,
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            FROM transactions
            WHERE transaction_id = %s
            """,
            (transaction_id,)
        )

        transaction = cursor.fetchone()

        connection.commit()

        return transaction

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid transaction type/user "
                "or duplicate reference number"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# GET ALL TRANSACTIONS
# ========================================

@router.get(
    "/",
    response_model=list[TransactionResponse]
)
def get_all_transactions():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                transaction_id,
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            FROM transactions
            ORDER BY transaction_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve transactions: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# GET TRANSACTION BY ID
# ========================================

@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse
)
def get_transaction(
    transaction_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                transaction_id,
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            FROM transactions
            WHERE transaction_id = %s
            """,
            (transaction_id,)
        )

        transaction = cursor.fetchone()

        if not transaction:

            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        return transaction

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve transaction: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# UPDATE TRANSACTION
# ========================================

@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------
        # 1. Lock transaction
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                transaction_id,
                initiated_by_user_id,
                status,
                fee,
                description
            FROM transactions
            WHERE transaction_id = %s
            FOR UPDATE
            """,
            (transaction_id,)
        )

        transaction = cursor.fetchone()

        if not transaction:

            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        # ----------------------------------------
        # 2. Validate status
        # ----------------------------------------

        allowed_statuses = [
            "PENDING",
            "SUCCESS",
            "FAILED",
            "REVERSED"
        ]

        if transaction_data.status not in allowed_statuses:

            raise HTTPException(
                status_code=400,
                detail="Invalid transaction status"
            )

        # ----------------------------------------
        # 3. Update
        # ----------------------------------------

        cursor.execute(
            """
            UPDATE transactions
            SET
                status = %s,
                fee = %s,
                description = %s
            WHERE transaction_id = %s
            """,
            (
                transaction_data.status,
                transaction_data.fee,
                transaction_data.description,
                transaction_id
            )
        )

        # ----------------------------------------
        # 4. Audit log
        # ----------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=transaction["initiated_by_user_id"],
            action="TRANSACTION_UPDATED",
            entity_type="TRANSACTION",
            entity_id=transaction_id,

            old_value={
                "status":
                    transaction["status"],

                "fee":
                    float(transaction["fee"]),

                "description":
                    transaction["description"]
            },

            new_value={
                "status":
                    transaction_data.status,

                "fee":
                    float(transaction_data.fee),

                "description":
                    transaction_data.description
            },

            ip_address=None
        )

        # ----------------------------------------
        # 5. Load updated transaction
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                transaction_id,
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            FROM transactions
            WHERE transaction_id = %s
            """,
            (transaction_id,)
        )

        updated_transaction = cursor.fetchone()

        connection.commit()

        return updated_transaction

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Transaction update failed because of a database constraint"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# DELETE TRANSACTION
# ========================================

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------
        # 1. Lock transaction
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                transaction_id,
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                status,
                description
            FROM transactions
            WHERE transaction_id = %s
            FOR UPDATE
            """,
            (transaction_id,)
        )

        transaction = cursor.fetchone()

        if not transaction:

            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        # ----------------------------------------
        # 2. Check transaction entries
        # ----------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS entry_count
            FROM transaction_entries
            WHERE transaction_id = %s
            """,
            (transaction_id,)
        )

        result = cursor.fetchone()

        if result["entry_count"] > 0:

            raise HTTPException(
                status_code=409,
                detail=(
                    "Transaction cannot be deleted because "
                    "transaction entries already exist"
                )
            )

        # ----------------------------------------
        # 3. Audit before deletion
        # ----------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=transaction["initiated_by_user_id"],
            action="TRANSACTION_DELETED",
            entity_type="TRANSACTION",
            entity_id=transaction_id,

            old_value={
                "transaction_type_id":
                    transaction["transaction_type_id"],

                "reference_no":
                    transaction["reference_no"],

                "amount":
                    float(transaction["amount"]),

                "fee":
                    float(transaction["fee"]),

                "status":
                    transaction["status"],

                "description":
                    transaction["description"]
            },

            new_value=None,

            ip_address=None
        )

        # ----------------------------------------
        # 4. Delete transaction
        # ----------------------------------------

        cursor.execute(
            """
            DELETE FROM transactions
            WHERE transaction_id = %s
            """,
            (transaction_id,)
        )

        connection.commit()

        return {
            "message": "Transaction deleted successfully",
            "transaction_id": transaction_id
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Transaction cannot be deleted because "
                "related records still exist"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction deletion failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()