from fastapi import APIRouter, HTTPException

from raw_database import get_connection
from schemas.fixed_deposit import FixedDepositCreate

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/fixed-deposits",
    tags=["Fixed Deposits"]
)


# ============================================================
# CREATE FIXED DEPOSIT
# ============================================================

@router.post("/")
def create_fixed_deposit(data: FixedDepositCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. VALIDATE DATES
        # ========================================

        if data.maturity_date <= data.start_date:
            raise HTTPException(
                status_code=400,
                detail="Maturity date must be after start date"
            )

        # ========================================
        # 2. CHECK CUSTOMER
        # ========================================

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (data.customer_id,)
        )

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

        # ========================================
        # 3. LOCK ACCOUNT
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
            (data.account_id,)
        )

        account = cursor.fetchone()

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        # ========================================
        # 4. VERIFY OWNERSHIP
        # ========================================

        if account["customer_id"] != data.customer_id:
            raise HTTPException(
                status_code=403,
                detail="Account does not belong to this customer"
            )

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )

        # ========================================
        # 5. CHECK AVAILABLE BALANCE
        # ========================================

        if (
            float(account["available_balance"])
            < float(data.principal_amount)
        ):
            raise HTTPException(
                status_code=400,
                detail="Insufficient available balance"
            )

        # ========================================
        # 6. CALCULATE TERM
        # ========================================

        days = (
            data.maturity_date
            - data.start_date
        ).days

        years = days / 365

        interest = (
            data.principal_amount
            * (data.interest_rate / 100)
            * years
        )

        maturity_amount = (
            data.principal_amount
            + interest
        )

        maturity_amount = round(
            maturity_amount,
            2
        )

        # ========================================
        # 7. CREATE FIXED DEPOSIT
        # ========================================

        cursor.execute(
            """
            INSERT INTO fixed_deposits
            (
                customer_id,
                account_id,
                principal_amount,
                interest_rate,
                start_date,
                maturity_date,
                maturity_amount,
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
                %s,
                'ACTIVE'
            )
            """,
            (
                data.customer_id,
                data.account_id,
                data.principal_amount,
                data.interest_rate,
                data.start_date,
                data.maturity_date,
                maturity_amount
            )
        )

        fd_id = cursor.lastrowid

        # ========================================
        # 8. DEDUCT PRINCIPAL FROM ACCOUNT
        # ========================================

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance - %s,
                available_balance =
                    available_balance - %s
            WHERE account_id = %s
            """,
            (
                data.principal_amount,
                data.principal_amount,
                data.account_id
            )
        )

        # ========================================
        # 9. CREATE NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Fixed Deposit Created",
            message=(
                f"Your fixed deposit of BDT "
                f"{float(data.principal_amount):.2f} "
                f"was created successfully. "
                f"Maturity amount: BDT "
                f"{float(maturity_amount):.2f}."
            ),
            notification_type="FIXED_DEPOSIT"
        )

        # ========================================
        # 10. CREATE AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="FIXED_DEPOSIT_CREATED",
            entity_type="FIXED_DEPOSIT",
            entity_id=fd_id,
            old_value=None,
            new_value={
                "customer_id":
                    data.customer_id,

                "account_id":
                    data.account_id,

                "principal_amount":
                    float(data.principal_amount),

                "interest_rate":
                    float(data.interest_rate),

                "start_date":
                    str(data.start_date),

                "maturity_date":
                    str(data.maturity_date),

                "maturity_amount":
                    float(maturity_amount),

                "status":
                    "ACTIVE"
            },
            ip_address=None
        )

        # ========================================
        # 11. COMMIT
        # ========================================

        connection.commit()

        return {
            "message": "Fixed deposit created successfully",
            "fd_id": fd_id,
            "customer_id": data.customer_id,
            "account_id": data.account_id,
            "principal_amount":
                float(data.principal_amount),
            "interest_rate":
                float(data.interest_rate),
            "start_date":
                data.start_date,
            "maturity_date":
                data.maturity_date,
            "maturity_amount":
                maturity_amount,
            "status":
                "ACTIVE"
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Fixed deposit creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# MATURE FIXED DEPOSIT
# ============================================================

@router.post("/{fd_id}/mature")
def mature_fixed_deposit(fd_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. LOCK FIXED DEPOSIT
        # ========================================

        cursor.execute(
            """
            SELECT
                fd_id,
                customer_id,
                account_id,
                principal_amount,
                interest_rate,
                start_date,
                maturity_date,
                maturity_amount,
                status
            FROM fixed_deposits
            WHERE fd_id = %s
            FOR UPDATE
            """,
            (fd_id,)
        )

        fd = cursor.fetchone()

        if not fd:
            raise HTTPException(
                status_code=404,
                detail="Fixed deposit not found"
            )

        # ========================================
        # 2. MUST STILL BE ACTIVE
        # ========================================

        if fd["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail=f"Fixed deposit is already {fd['status']}"
            )

        # ========================================
        # 3. CHECK MATURITY DATE
        # ========================================

        cursor.execute(
            """
            SELECT
                CASE
                    WHEN CURDATE() >= %s
                    THEN 1
                    ELSE 0
                END AS matured
            """,
            (fd["maturity_date"],)
        )

        maturity_check = cursor.fetchone()

        if maturity_check["matured"] != 1:
            raise HTTPException(
                status_code=400,
                detail="Fixed deposit has not reached maturity yet"
            )

        # ========================================
        # 4. LOCK LINKED ACCOUNT
        # ========================================

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (fd["account_id"],)
        )

        account = cursor.fetchone()

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Linked account not found"
            )

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Linked account is not active"
            )

        # ========================================
        # 5. GET CUSTOMER USER ID
        # ========================================

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (fd["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        # ========================================
        # 6. CREDIT MATURITY AMOUNT
        # ========================================

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance + %s,
                available_balance =
                    available_balance + %s
            WHERE account_id = %s
            """,
            (
                fd["maturity_amount"],
                fd["maturity_amount"],
                fd["account_id"]
            )
        )

        # ========================================
        # 7. UPDATE FD STATUS
        # ========================================

        cursor.execute(
            """
            UPDATE fixed_deposits
            SET status = 'MATURED'
            WHERE fd_id = %s
            """,
            (fd_id,)
        )

        # ========================================
        # 8. CREATE NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Fixed Deposit Matured",
            message=(
                f"Your fixed deposit #{fd_id} has matured. "
                f"BDT {float(fd['maturity_amount']):.2f} "
                f"has been credited to your linked account."
            ),
            notification_type="FIXED_DEPOSIT"
        )

        # ========================================
        # 9. CREATE AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="FIXED_DEPOSIT_MATURED",
            entity_type="FIXED_DEPOSIT",
            entity_id=fd_id,
            old_value={
                "status": "ACTIVE"
            },
            new_value={
                "status": "MATURED",
                "account_id":
                    fd["account_id"],
                "principal_amount":
                    float(fd["principal_amount"]),
                "credited_amount":
                    float(fd["maturity_amount"])
            },
            ip_address=None
        )

        # ========================================
        # 10. COMMIT
        # ========================================

        connection.commit()

        return {
            "message": "Fixed deposit matured successfully",
            "fd_id": fd_id,
            "customer_id": fd["customer_id"],
            "account_id": fd["account_id"],
            "principal_amount":
                float(fd["principal_amount"]),
            "maturity_amount":
                float(fd["maturity_amount"]),
            "credited_amount":
                float(fd["maturity_amount"]),
            "status":
                "MATURED"
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Fixed deposit maturity failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# PREMATURELY CLOSE FIXED DEPOSIT
# ============================================================

@router.post("/{fd_id}/premature-close")
def prematurely_close_fixed_deposit(fd_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. LOCK FIXED DEPOSIT
        # ========================================

        cursor.execute(
            """
            SELECT
                fd_id,
                customer_id,
                account_id,
                principal_amount,
                maturity_amount,
                maturity_date,
                status
            FROM fixed_deposits
            WHERE fd_id = %s
            FOR UPDATE
            """,
            (fd_id,)
        )

        fd = cursor.fetchone()

        if not fd:
            raise HTTPException(
                status_code=404,
                detail="Fixed deposit not found"
            )

        # ========================================
        # 2. MUST BE ACTIVE
        # ========================================

        if fd["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail=f"Fixed deposit is already {fd['status']}"
            )

        # ========================================
        # 3. MAKE SURE IT HAS NOT MATURED
        # ========================================

        cursor.execute(
            """
            SELECT
                CASE
                    WHEN CURDATE() >= %s
                    THEN 1
                    ELSE 0
                END AS matured
            """,
            (fd["maturity_date"],)
        )

        maturity_check = cursor.fetchone()

        if maturity_check["matured"] == 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Fixed deposit has already matured. "
                    "Use the maturity endpoint instead."
                )
            )

        # ========================================
        # 4. LOCK ACCOUNT
        # ========================================

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (fd["account_id"],)
        )

        account = cursor.fetchone()

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Linked account not found"
            )

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Linked account is not active"
            )

        # ========================================
        # 5. GET CUSTOMER USER ID
        # ========================================

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (fd["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        # ========================================
        # 6. RETURN PRINCIPAL
        # ========================================

        refund_amount = fd["principal_amount"]

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance = balance + %s,
                available_balance =
                    available_balance + %s
            WHERE account_id = %s
            """,
            (
                refund_amount,
                refund_amount,
                fd["account_id"]
            )
        )

        # ========================================
        # 7. UPDATE FD STATUS
        # ========================================

        cursor.execute(
            """
            UPDATE fixed_deposits
            SET status = 'PREMATURELY_CLOSED'
            WHERE fd_id = %s
            """,
            (fd_id,)
        )

        # ========================================
        # 8. CREATE NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Fixed Deposit Closed",
            message=(
                f"Your fixed deposit #{fd_id} was "
                f"closed before maturity. "
                f"BDT {float(refund_amount):.2f} "
                f"has been returned to your account."
            ),
            notification_type="FIXED_DEPOSIT"
        )

        # ========================================
        # 9. CREATE AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="FIXED_DEPOSIT_PREMATURELY_CLOSED",
            entity_type="FIXED_DEPOSIT",
            entity_id=fd_id,
            old_value={
                "status": "ACTIVE"
            },
            new_value={
                "status":
                    "PREMATURELY_CLOSED",
                "account_id":
                    fd["account_id"],
                "credited_amount":
                    float(refund_amount),
                "interest_paid":
                    0
            },
            ip_address=None
        )

        # ========================================
        # 10. COMMIT
        # ========================================

        connection.commit()

        return {
            "message":
                "Fixed deposit closed prematurely",

            "fd_id":
                fd_id,

            "customer_id":
                fd["customer_id"],

            "account_id":
                fd["account_id"],

            "principal_amount":
                float(fd["principal_amount"]),

            "credited_amount":
                float(refund_amount),

            "interest_paid":
                0,

            "status":
                "PREMATURELY_CLOSED"
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Premature FD closure failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()
        
        
        
# ============================================================
# GET ALL FIXED DEPOSITS
# ============================================================

@router.get("/")
def get_fixed_deposits():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                fd_id,
                customer_id,
                account_id,
                principal_amount,
                interest_rate,
                start_date,
                maturity_date,
                maturity_amount,
                status
            FROM fixed_deposits
            ORDER BY fd_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load fixed deposits: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()