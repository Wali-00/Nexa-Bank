from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
import uuid

from raw_database import get_connection

from schemas.account_transaction import (
    AccountTransactionCreate,
    OfficerDepositCreate
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/account-transactions",
    tags=["Account Transactions"]
)


# ============================================================
# LOOKUP ACCOUNT BY ACCOUNT NUMBER
# ============================================================
# Used by Account Officer dashboard before making a deposit.
# ============================================================

@router.get("/account/{account_number}")
def lookup_account_by_number(
    account_number: str
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                a.account_id,
                a.account_number,
                a.customer_id,
                a.account_type_id,
                a.branch_id,
                a.balance,
                a.available_balance,
                a.status,

                c.first_name,
                c.last_name,
                c.phone,
                c.email,
                c.status AS customer_status

            FROM accounts a

            INNER JOIN customers c
                ON a.customer_id = c.customer_id

            WHERE a.account_number = %s
            """,
            (account_number,)
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        return {
            "account_id":
                account["account_id"],

            "account_number":
                account["account_number"],

            "customer_id":
                account["customer_id"],

            "customer_name":
                (
                    f"{account['first_name']} "
                    f"{account['last_name']}"
                ),

            "phone":
                account["phone"],

            "email":
                account["email"],

            "account_type_id":
                account["account_type_id"],

            "branch_id":
                account["branch_id"],

            "balance":
                float(account["balance"]),

            "available_balance":
                float(
                    account["available_balance"]
                ),

            "account_status":
                account["status"],

            "customer_status":
                account["customer_status"]
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Account lookup failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# ACCOUNT OFFICER DEPOSIT BY ACCOUNT NUMBER
# ============================================================

@router.post("/officer-deposit")
def officer_deposit_money(
    deposit_data: OfficerDepositCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ====================================================
        # 1. VERIFY INITIATING USER IS ACCOUNT OFFICER
        # ====================================================

        cursor.execute(
            """
            SELECT
                u.user_id,
                u.status,
                r.role_name

            FROM users u

            INNER JOIN user_roles ur
                ON u.user_id = ur.user_id

            INNER JOIN roles r
                ON ur.role_id = r.role_id

            WHERE
                u.user_id = %s
                AND r.role_name = 'ACCOUNT_OFFICER'
            LIMIT 1
            """,
            (
                deposit_data.initiated_by_user_id,
            )
        )

        officer = cursor.fetchone()

        if not officer:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only an Account Officer "
                    "can perform this deposit"
                )
            )

        if officer["status"] != "ACTIVE":

            raise HTTPException(
                status_code=403,
                detail="Account Officer user is not active"
            )


        # ====================================================
        # 2. LOCK ACCOUNT BY ACCOUNT NUMBER
        # ====================================================

        cursor.execute(
            """
            SELECT
                a.account_id,
                a.account_number,
                a.customer_id,
                a.balance,
                a.available_balance,
                a.status,

                c.user_id AS customer_user_id,
                c.first_name,
                c.last_name,
                c.status AS customer_status

            FROM accounts a

            INNER JOIN customers c
                ON a.customer_id = c.customer_id

            WHERE a.account_number = %s

            FOR UPDATE
            """,
            (
                deposit_data.account_number,
            )
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )


        # ====================================================
        # 3. VERIFY CUSTOMER
        # ====================================================

        if (
            account["customer_status"]
            !=
            "ACTIVE"
        ):

            raise HTTPException(
                status_code=400,
                detail="Customer is not active"
            )


        # ====================================================
        # 4. VERIFY ACCOUNT
        # ====================================================

        if account["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )


        # ====================================================
        # 5. VALIDATE AMOUNT
        # ====================================================

        if deposit_data.amount <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Deposit amount must be "
                    "greater than zero"
                )
            )


        # ====================================================
        # 6. STORE OLD BALANCE
        # ====================================================

        previous_balance = (
            account["balance"]
        )

        previous_available_balance = (
            account["available_balance"]
        )


        # ====================================================
        # 7. GENERATE REFERENCE NUMBER
        # ====================================================

        reference_no = (
            "DEP-"
            +
            uuid.uuid4()
            .hex[:20]
            .upper()
        )


        # ====================================================
        # 8. CREATE TRANSACTION
        #
        # transaction_type_id = 1 → DEPOSIT
        # ====================================================

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
                1,
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
                deposit_data.initiated_by_user_id,
                deposit_data.amount,
                (
                    deposit_data.description
                    or
                    "Cash deposit by Account Officer"
                )
            )
        )

        transaction_id = (
            cursor.lastrowid
        )


        # ====================================================
        # 9. CREATE CREDIT ENTRY
        # ====================================================

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
                account["account_id"],
                deposit_data.amount
            )
        )


        # ====================================================
        # 10. UPDATE ACCOUNT BALANCE
        # ====================================================

        cursor.execute(
            """
            UPDATE accounts

            SET
                balance =
                    balance + %s,

                available_balance =
                    available_balance + %s

            WHERE account_id = %s
            """,
            (
                deposit_data.amount,
                deposit_data.amount,
                account["account_id"]
            )
        )


        # ====================================================
        # 11. GET UPDATED BALANCE
        # ====================================================

        cursor.execute(
            """
            SELECT
                balance,
                available_balance

            FROM accounts

            WHERE account_id = %s
            """,
            (
                account["account_id"],
            )
        )

        updated_account = (
            cursor.fetchone()
        )


        # ====================================================
        # 12. CUSTOMER NOTIFICATION
        # ====================================================

        if account["customer_user_id"]:

            create_notification(
                cursor=cursor,

                user_id=
                    account["customer_user_id"],

                title=
                    "Money Deposited",

                message=(
                    f"BDT "
                    f"{float(deposit_data.amount):.2f} "
                    f"has been deposited into "
                    f"your account "
                    f"{account['account_number']}. "
                    f"Reference: {reference_no}."
                ),

                notification_type=
                    "DEPOSIT"
            )


        # ====================================================
        # 13. AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,

            user_id=
                deposit_data.initiated_by_user_id,

            action=
                "ACCOUNT_OFFICER_DEPOSIT",

            entity_type=
                "ACCOUNT",

            entity_id=
                account["account_id"],

            old_value={
                "balance":
                    float(
                        previous_balance
                    ),

                "available_balance":
                    float(
                        previous_available_balance
                    )
            },

            new_value={
                "balance":
                    float(
                        updated_account[
                            "balance"
                        ]
                    ),

                "available_balance":
                    float(
                        updated_account[
                            "available_balance"
                        ]
                    ),

                "deposit_amount":
                    float(
                        deposit_data.amount
                    ),

                "transaction_id":
                    transaction_id,

                "reference_no":
                    reference_no
            },

            ip_address=None
        )


        # ====================================================
        # 14. COMMIT EVERYTHING
        # ====================================================

        connection.commit()


        # ====================================================
        # 15. RESPONSE
        # ====================================================

        return {

            "message":
                "Deposit completed successfully",

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "account_id":
                account["account_id"],

            "account_number":
                account["account_number"],

            "customer_id":
                account["customer_id"],

            "customer_name":
                (
                    f"{account['first_name']} "
                    f"{account['last_name']}"
                ),

            "previous_balance":
                float(
                    previous_balance
                ),

            "deposit_amount":
                float(
                    deposit_data.amount
                ),

            "new_balance":
                float(
                    updated_account[
                        "balance"
                    ]
                ),

            "available_balance":
                float(
                    updated_account[
                        "available_balance"
                    ]
                ),

            "transaction_type":
                "DEPOSIT",

            "entry_type":
                "CREDIT",

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
                "Deposit could not be completed "
                "because of a database constraint"
            )
        )


    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Officer deposit failed: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()


# ============================================================
# EXISTING DEPOSIT
# ============================================================

@router.post("/deposit")
def deposit_money(
    transaction_data: AccountTransactionCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------
        # Lock account
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (
                transaction_data.account_id,
            )
        )

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


        # ----------------------------------------
        # Validate amount
        # ----------------------------------------

        if transaction_data.amount <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Deposit amount must be "
                    "greater than zero"
                )
            )


        # ----------------------------------------
        # Generate reference
        # ----------------------------------------

        reference_no = (
            "DEP-"
            +
            uuid.uuid4()
            .hex[:20]
            .upper()
        )


        # ----------------------------------------
        # Create transaction
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
                1,
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
                transaction_data.initiated_by_user_id,
                transaction_data.amount,
                transaction_data.description
            )
        )

        transaction_id = (
            cursor.lastrowid
        )


        # ----------------------------------------
        # CREDIT entry
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
                transaction_data.account_id,
                transaction_data.amount
            )
        )


        # ----------------------------------------
        # Update balance
        # ----------------------------------------

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance =
                    balance + %s,

                available_balance =
                    available_balance + %s

            WHERE account_id = %s
            """,
            (
                transaction_data.amount,
                transaction_data.amount,
                transaction_data.account_id
            )
        )


        connection.commit()


        return {

            "message":
                "Deposit completed successfully",

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "account_id":
                transaction_data.account_id,

            "amount":
                float(
                    transaction_data.amount
                ),

            "transaction_type":
                "DEPOSIT",

            "entry_type":
                "CREDIT",

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
                "Deposit could not be completed "
                "because of a database constraint"
            )
        )


    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Deposit failed: {str(e)}"
        )


    finally:

        cursor.close()
        connection.close()


# ============================================================
# EXISTING WITHDRAWAL
# ============================================================

@router.post("/withdraw")
def withdraw_money(
    transaction_data: AccountTransactionCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()


        # ----------------------------------------
        # Lock account
        # ----------------------------------------

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (
                transaction_data.account_id,
            )
        )

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


        # ----------------------------------------
        # Validate amount
        # ----------------------------------------

        if transaction_data.amount <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Withdrawal amount must be "
                    "greater than zero"
                )
            )


        # ----------------------------------------
        # Check balance
        # ----------------------------------------

        if (
            account["available_balance"]
            <
            transaction_data.amount
        ):

            raise HTTPException(
                status_code=400,
                detail="Insufficient available balance"
            )


        # ----------------------------------------
        # Reference number
        # ----------------------------------------

        reference_no = (
            "WDL-"
            +
            uuid.uuid4()
            .hex[:20]
            .upper()
        )


        # ----------------------------------------
        # Create transaction
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
                2,
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
                transaction_data.initiated_by_user_id,
                transaction_data.amount,
                transaction_data.description
            )
        )

        transaction_id = (
            cursor.lastrowid
        )


        # ----------------------------------------
        # DEBIT entry
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
                transaction_data.account_id,
                transaction_data.amount
            )
        )


        # ----------------------------------------
        # Update account
        # ----------------------------------------

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance =
                    balance - %s,

                available_balance =
                    available_balance - %s

            WHERE account_id = %s
            """,
            (
                transaction_data.amount,
                transaction_data.amount,
                transaction_data.account_id
            )
        )


        connection.commit()


        return {

            "message":
                "Withdrawal completed successfully",

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "account_id":
                transaction_data.account_id,

            "amount":
                float(
                    transaction_data.amount
                ),

            "transaction_type":
                "WITHDRAWAL",

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
                "Withdrawal could not be completed "
                "because of a database constraint"
            )
        )


    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Withdrawal failed: {str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()