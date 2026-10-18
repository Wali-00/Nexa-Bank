from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection

from schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"]
)


# ============================================================
# CREATE ACCOUNT
# ============================================================

@router.post(
    "/",
    response_model=AccountResponse
)
def create_account(
    account_data: AccountCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Verify customer
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (account_data.customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # ----------------------------------------------------
        # 2. Create account
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO accounts
            (
                account_number,
                customer_id,
                account_type_id,
                branch_id,
                balance,
                available_balance,
                opened_date
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                account_data.account_number,
                account_data.customer_id,
                account_data.account_type_id,
                account_data.branch_id,
                account_data.balance,
                account_data.available_balance,
                account_data.opened_date
            )
        )

        account_id = cursor.lastrowid

        # ----------------------------------------------------
        # 3. Create customer notification
        # ----------------------------------------------------

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="Bank Account Created",
            message=(
                f"Your Nexa Bank account "
                f"{account_data.account_number} "
                f"has been created successfully."
            ),
            notification_type="ACCOUNT"
        )

        # ----------------------------------------------------
        # 4. Create audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="ACCOUNT_CREATED",
            entity_type="ACCOUNT",
            entity_id=account_id,

            old_value=None,

            new_value={
                "account_number":
                    account_data.account_number,

                "customer_id":
                    account_data.customer_id,

                "account_type_id":
                    account_data.account_type_id,

                "branch_id":
                    account_data.branch_id,

                "balance":
                    float(account_data.balance),

                "available_balance":
                    float(account_data.available_balance),

                "opened_date":
                    str(account_data.opened_date)
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 5. Load created account
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM accounts
            WHERE account_id = %s
            """,
            (account_id,)
        )

        account = cursor.fetchone()

        # ----------------------------------------------------
        # 6. Commit
        # ----------------------------------------------------

        connection.commit()

        return account

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid customer, account type, branch, "
                "or duplicate account number"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Account creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL ACCOUNTS
# ============================================================

@router.get(
    "/",
    response_model=list[AccountResponse]
)
def get_accounts():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM accounts
            ORDER BY account_id DESC
            """
        )

        accounts = cursor.fetchall()

        return accounts

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load accounts: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()

# ============================================================
# GET AUTOMATIC DISBURSEMENT ACCOUNT FOR CUSTOMER
# ============================================================

@router.get("/customer/{customer_id}/disbursement-account")
def get_customer_disbursement_account(
    customer_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # VERIFY CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT customer_id
            FROM customers
            WHERE customer_id = %s
            """,
            (
                customer_id,
            )
        )

        customer = cursor.fetchone()


        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )


        # ----------------------------------------------------
        # FIND ACTIVE ACCOUNT AUTOMATICALLY
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                customer_id,
                account_type_id,
                branch_id,
                balance,
                available_balance,
                opened_date,
                status
            FROM accounts
            WHERE customer_id = %s
              AND status = 'ACTIVE'
            ORDER BY account_id ASC
            LIMIT 1
            """,
            (
                customer_id,
            )
        )

        account = cursor.fetchone()


        if not account:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Customer has no active account "
                    "available for loan disbursement"
                )
            )


        return account


    except HTTPException:
        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to detect customer account: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET AUTOMATIC REPAYMENT ACCOUNT
# ============================================================

@router.get("/customer/{customer_id}/repayment-account")
def get_customer_repayment_account(
    customer_id: int,
    required_amount: float
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        if required_amount <= 0:

            raise HTTPException(
                status_code=400,
                detail="Required amount must be greater than zero"
            )


        # ----------------------------------------------------
        # VERIFY CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT customer_id
            FROM customers
            WHERE customer_id = %s
            """,
            (
                customer_id,
            )
        )

        customer = cursor.fetchone()


        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )


        # ----------------------------------------------------
        # FIND ACTIVE ACCOUNT WITH ENOUGH BALANCE
        #
        # Highest available balance is preferred.
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                customer_id,
                account_type_id,
                branch_id,
                balance,
                available_balance,
                opened_date,
                status
            FROM accounts
            WHERE customer_id = %s
              AND status = 'ACTIVE'
              AND available_balance >= %s
            ORDER BY
                available_balance DESC,
                account_id ASC
            LIMIT 1
            """,
            (
                customer_id,
                required_amount
            )
        )

        account = cursor.fetchone()


        if not account:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Customer has no active account "
                    "with sufficient balance for this payment"
                )
            )


        return account


    except HTTPException:
        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to detect repayment account: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()
# ============================================================
# GET ACCOUNT BY ID
# ============================================================

@router.get(
    "/{account_id}",
    response_model=AccountResponse
)
def get_account(
    account_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM accounts
            WHERE account_id = %s
            """,
            (account_id,)
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        return account

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load account: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE ACCOUNT
# ============================================================

@router.put(
    "/{account_id}",
    response_model=AccountResponse
)
def update_account(
    account_id: int,
    account_data: AccountUpdate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Lock account
        # ----------------------------------------------------

        cursor.execute(
            """
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
            """,
            (account_id,)
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        # ----------------------------------------------------
        # 2. Get linked customer/user
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (account["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        old_balance = float(
            account["balance"]
        )

        old_available_balance = float(
            account["available_balance"]
        )

        old_status = account["status"]

        # ----------------------------------------------------
        # 3. Update account
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = %s,
                available_balance = %s,
                status = %s
            WHERE account_id = %s
            """,
            (
                account_data.balance,
                account_data.available_balance,
                account_data.status,
                account_id
            )
        )

        # ----------------------------------------------------
        # 4. Notify customer if status changed
        # ----------------------------------------------------

        if old_status != account_data.status:

            create_notification(
                cursor=cursor,
                user_id=customer_user_id,
                title="Account Status Updated",
                message=(
                    f"Your Nexa Bank account "
                    f"{account['account_number']} "
                    f"status has been changed from "
                    f"{old_status} to "
                    f"{account_data.status}."
                ),
                notification_type="ACCOUNT_STATUS"
            )

        # ----------------------------------------------------
        # 5. Create audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="ACCOUNT_UPDATED",
            entity_type="ACCOUNT",
            entity_id=account_id,

            old_value={
                "balance":
                    old_balance,

                "available_balance":
                    old_available_balance,

                "status":
                    old_status
            },

            new_value={
                "balance":
                    float(account_data.balance),

                "available_balance":
                    float(
                        account_data.available_balance
                    ),

                "status":
                    account_data.status
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 6. Load updated account
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM accounts
            WHERE account_id = %s
            """,
            (account_id,)
        )

        updated_account = cursor.fetchone()

        # ----------------------------------------------------
        # 7. Commit
        # ----------------------------------------------------

        connection.commit()

        return updated_account

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to update account"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Account update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()