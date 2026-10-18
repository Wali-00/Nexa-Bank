from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection

from schemas.transaction_entry import (
    TransactionEntryCreate,
    TransactionEntryResponse,
    TransactionEntryUpdate
)

from utils.system_events import create_audit_log


router = APIRouter(
    prefix="/transaction-entries",
    tags=["Transaction Entries"]
)


# ============================================================
# CREATE TRANSACTION ENTRY
# ============================================================

@router.post(
    "/",
    response_model=TransactionEntryResponse
)
def create_transaction_entry(
    entry_data: TransactionEntryCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Validate entry type
        # ----------------------------------------------------

        allowed_entry_types = [
            "DEBIT",
            "CREDIT"
        ]

        if entry_data.entry_type not in allowed_entry_types:

            raise HTTPException(
                status_code=400,
                detail="Invalid entry type. Use DEBIT or CREDIT"
            )

        # ----------------------------------------------------
        # 2. Check transaction
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                transaction_id,
                initiated_by_user_id,
                status
            FROM transactions
            WHERE transaction_id = %s
            """,
            (entry_data.transaction_id,)
        )

        transaction = cursor.fetchone()

        if not transaction:

            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )

        # ----------------------------------------------------
        # 3. Check account
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                status
            FROM accounts
            WHERE account_id = %s
            """,
            (entry_data.account_id,)
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        # ----------------------------------------------------
        # 4. Create entry
        # ----------------------------------------------------

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
                %s,
                %s
            )
            """,
            (
                entry_data.transaction_id,
                entry_data.account_id,
                entry_data.entry_type,
                entry_data.amount
            )
        )

        entry_id = cursor.lastrowid

        # ----------------------------------------------------
        # 5. Audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=transaction["initiated_by_user_id"],
            action="TRANSACTION_ENTRY_CREATED",
            entity_type="TRANSACTION_ENTRY",
            entity_id=entry_id,

            old_value=None,

            new_value={
                "transaction_id":
                    entry_data.transaction_id,

                "account_id":
                    entry_data.account_id,

                "entry_type":
                    entry_data.entry_type,

                "amount":
                    float(entry_data.amount)
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 6. Load created entry
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            WHERE entry_id = %s
            """,
            (entry_id,)
        )

        entry = cursor.fetchone()

        connection.commit()

        return entry

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid transaction or account"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Transaction entry creation failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL TRANSACTION ENTRIES
# ============================================================

@router.get(
    "/",
    response_model=list[TransactionEntryResponse]
)
def get_all_transaction_entries():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            ORDER BY entry_id DESC
            """
        )

        entries = cursor.fetchall()

        return entries

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to retrieve transaction entries: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET TRANSACTION ENTRY BY ID
# ============================================================

@router.get(
    "/{entry_id}",
    response_model=TransactionEntryResponse
)
def get_transaction_entry(
    entry_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            WHERE entry_id = %s
            """,
            (entry_id,)
        )

        entry = cursor.fetchone()

        if not entry:

            raise HTTPException(
                status_code=404,
                detail="Transaction entry not found"
            )

        return entry

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to retrieve transaction entry: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE TRANSACTION ENTRY
# ============================================================

@router.put(
    "/{entry_id}",
    response_model=TransactionEntryResponse
)
def update_transaction_entry(
    entry_id: int,
    entry_data: TransactionEntryUpdate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Lock existing entry
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            WHERE entry_id = %s
            FOR UPDATE
            """,
            (entry_id,)
        )

        entry = cursor.fetchone()

        if not entry:

            raise HTTPException(
                status_code=404,
                detail="Transaction entry not found"
            )

        # ----------------------------------------------------
        # 2. Validate entry type
        # ----------------------------------------------------

        allowed_entry_types = [
            "DEBIT",
            "CREDIT"
        ]

        if entry_data.entry_type not in allowed_entry_types:

            raise HTTPException(
                status_code=400,
                detail="Invalid entry type. Use DEBIT or CREDIT"
            )

        # ----------------------------------------------------
        # 3. Get transaction user
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT initiated_by_user_id
            FROM transactions
            WHERE transaction_id = %s
            """,
            (entry["transaction_id"],)
        )

        transaction = cursor.fetchone()

        initiated_by_user_id = (
            transaction["initiated_by_user_id"]
            if transaction
            else None
        )

        # ----------------------------------------------------
        # 4. Update entry
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE transaction_entries
            SET
                entry_type = %s,
                amount = %s
            WHERE entry_id = %s
            """,
            (
                entry_data.entry_type,
                entry_data.amount,
                entry_id
            )
        )

        # ----------------------------------------------------
        # 5. Audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=initiated_by_user_id,
            action="TRANSACTION_ENTRY_UPDATED",
            entity_type="TRANSACTION_ENTRY",
            entity_id=entry_id,

            old_value={
                "entry_type":
                    entry["entry_type"],

                "amount":
                    float(entry["amount"])
            },

            new_value={
                "entry_type":
                    entry_data.entry_type,

                "amount":
                    float(entry_data.amount)
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 6. Load updated entry
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            WHERE entry_id = %s
            """,
            (entry_id,)
        )

        updated_entry = cursor.fetchone()

        connection.commit()

        return updated_entry

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Transaction entry update failed because "
                "of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction entry update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# DELETE TRANSACTION ENTRY
# ============================================================

@router.delete("/{entry_id}")
def delete_transaction_entry(
    entry_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Lock entry
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                entry_id,
                transaction_id,
                account_id,
                entry_type,
                amount
            FROM transaction_entries
            WHERE entry_id = %s
            FOR UPDATE
            """,
            (entry_id,)
        )

        entry = cursor.fetchone()

        if not entry:

            raise HTTPException(
                status_code=404,
                detail="Transaction entry not found"
            )

        # ----------------------------------------------------
        # 2. Get transaction user
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT initiated_by_user_id
            FROM transactions
            WHERE transaction_id = %s
            """,
            (entry["transaction_id"],)
        )

        transaction = cursor.fetchone()

        initiated_by_user_id = (
            transaction["initiated_by_user_id"]
            if transaction
            else None
        )

        # ----------------------------------------------------
        # 3. Audit before deletion
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=initiated_by_user_id,
            action="TRANSACTION_ENTRY_DELETED",
            entity_type="TRANSACTION_ENTRY",
            entity_id=entry_id,

            old_value={
                "transaction_id":
                    entry["transaction_id"],

                "account_id":
                    entry["account_id"],

                "entry_type":
                    entry["entry_type"],

                "amount":
                    float(entry["amount"])
            },

            new_value=None,

            ip_address=None
        )

        # ----------------------------------------------------
        # 4. Delete entry
        # ----------------------------------------------------

        cursor.execute(
            """
            DELETE FROM transaction_entries
            WHERE entry_id = %s
            """,
            (entry_id,)
        )

        connection.commit()

        return {
            "message":
                "Transaction entry deleted successfully",

            "entry_id":
                entry_id
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Transaction entry cannot be deleted "
                "because of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction entry deletion failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()