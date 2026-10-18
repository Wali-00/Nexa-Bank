from fastapi import APIRouter, HTTPException
from pwdlib import PasswordHash

from raw_database import get_connection
from schemas.login import (
    LoginRequest,
    LoginResponse
)

from utils.system_events import (
    create_audit_log
)


router = APIRouter(
    prefix="/login",
    tags=["Login"]
)


password_hash = PasswordHash.recommended()


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/",
    response_model=LoginResponse
)
def login(
    login_data: LoginRequest
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. FIND USER BY USERNAME OR EMAIL
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                user_id,
                username,
                email,
                password_hash,
                status
            FROM users
            WHERE username = %s
               OR email = %s
            LIMIT 1
            """,
            (
                login_data.username_or_email,
                login_data.username_or_email
            )
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=401,
                detail="Invalid username/email or password"
            )

        # ----------------------------------------------------
        # 2. CHECK USER ACCOUNT STATUS
        # ----------------------------------------------------

        if user["status"] != "ACTIVE":

            raise HTTPException(
                status_code=403,
                detail="User account is not active"
            )

        # ----------------------------------------------------
        # 3. VERIFY PASSWORD
        # ----------------------------------------------------

        if not password_hash.verify(
            login_data.password,
            user["password_hash"]
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid username/email or password"
            )

        # ----------------------------------------------------
        # 4. GET ALL ROLES ASSIGNED TO USER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                r.role_name
            FROM user_roles ur
            INNER JOIN roles r
                ON ur.role_id = r.role_id
            WHERE ur.user_id = %s
            """,
            (user["user_id"],)
        )

        user_roles = cursor.fetchall()

        role_names = [
            row["role_name"]
            for row in user_roles
        ]

        print(
            "LOGIN USER ID:",
            user["user_id"]
        )

        print(
            "LOGIN ROLE NAMES:",
            role_names
        )

        # ----------------------------------------------------
        # 5. MAP FRONTEND ROLE TO DATABASE ROLE
        # ----------------------------------------------------

        requested_role_map = {
            "customer": "CUSTOMER",
            "officer": "ACCOUNT_OFFICER",
            "loan": "LOAN_OFFICER",
            "branch": "BRANCH_MANAGER",
            "admin": "ADMIN"
        }

        requested_role = requested_role_map.get(
            login_data.role
        )

        if not requested_role:

            raise HTTPException(
                status_code=400,
                detail="Invalid role selected"
            )

        # ----------------------------------------------------
        # 6. VERIFY USER HAS REQUESTED ROLE
        # ----------------------------------------------------

        if requested_role not in role_names:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorized "
                    "to login as this role"
                )
            )

        # ----------------------------------------------------
        # Default response values
        # ----------------------------------------------------

        customer_id = None

        # ====================================================
        # 7. CUSTOMER LOGIN
        # ====================================================

        if login_data.role == "customer":

            # ------------------------------------------------
            # 7.1 Find customer by linked user ID
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT
                    customer_id,
                    user_id,
                    email,
                    status
                FROM customers
                WHERE user_id = %s
                LIMIT 1
                """,
                (user["user_id"],)
            )

            customer = cursor.fetchone()

            # ------------------------------------------------
            # Temporary fallback for older customer rows
            # ------------------------------------------------

            if not customer:

                cursor.execute(
                    """
                    SELECT
                        customer_id,
                        user_id,
                        email,
                        status
                    FROM customers
                    WHERE email = %s
                    LIMIT 1
                    """,
                    (user["email"],)
                )

                customer = cursor.fetchone()

            # ------------------------------------------------
            # Customer profile must exist
            # ------------------------------------------------

            if not customer:

                raise HTTPException(
                    status_code=404,
                    detail="Customer profile not found"
                )

            # ------------------------------------------------
            # 7.2 Customer must be ACTIVE
            # ------------------------------------------------

            if customer["status"] != "ACTIVE":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Customer profile is "
                        f"{customer['status']}. "
                        "Only ACTIVE customers can login."
                    )
                )

            customer_id = customer["customer_id"]

            # ------------------------------------------------
            # 7.3 GET LATEST ACCOUNT APPLICATION
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT
                    application_id,
                    customer_id,
                    status,
                    rejection_reason
                FROM account_applications
                WHERE customer_id = %s
                ORDER BY application_id DESC
                LIMIT 1
                """,
                (customer_id,)
            )

            application = cursor.fetchone()

            # ------------------------------------------------
            # No application
            # ------------------------------------------------

            if not application:

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account application has not "
                        "been submitted yet. "
                        "Please wait for Account Officer approval."
                    )
                )

            # ------------------------------------------------
            # Application SUBMITTED
            # ------------------------------------------------

            if application["status"] == "SUBMITTED":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account application is pending "
                        "approval. You cannot login until an "
                        "Account Officer approves it."
                    )
                )

            # ------------------------------------------------
            # Application UNDER_REVIEW
            # ------------------------------------------------

            if application["status"] == "UNDER_REVIEW":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account application is currently "
                        "under review. Please wait for Account "
                        "Officer approval."
                    )
                )

            # ------------------------------------------------
            # Application REJECTED
            # ------------------------------------------------

            if application["status"] == "REJECTED":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account application has been "
                        "rejected. You cannot login."
                    )
                )

            # ------------------------------------------------
            # Must be APPROVED
            # ------------------------------------------------

            if application["status"] != "APPROVED":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account application has not "
                        "been approved yet. You cannot login."
                    )
                )

        # ====================================================
        # 8. EMPLOYEE LOGIN
        # ====================================================

        elif login_data.role in [
            "officer",
            "loan",
            "branch"
        ]:

            cursor.execute(
                """
                SELECT
                    employee_id,
                    user_id,
                    status
                FROM employees
                WHERE user_id = %s
                LIMIT 1
                """,
                (user["user_id"],)
            )

            employee = cursor.fetchone()

            # ------------------------------------------------
            # Employee profile must exist
            # ------------------------------------------------

            if not employee:

                raise HTTPException(
                    status_code=404,
                    detail="Employee profile not found"
                )

            # ------------------------------------------------
            # Employee must be ACTIVE
            # ------------------------------------------------

            if employee["status"] != "ACTIVE":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Employee profile is "
                        f"{employee['status']}. "
                        "Only ACTIVE employees can login."
                    )
                )

        # ====================================================
        # 9. ADMIN LOGIN
        # ====================================================

        # Admin intentionally has no separate employee/customer
        # profile check.
        #
        # users.status and ADMIN role authorization above
        # control admin access.

        # ====================================================
        # 10. CREATE SUCCESSFUL LOGIN AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,
            user_id=user["user_id"],
            action="LOGIN_SUCCESS",
            entity_type="USER",
            entity_id=user["user_id"],

            old_value=None,

            new_value={
                "username":
                    user["username"],

                "role":
                    login_data.role,

                "database_role":
                    requested_role,

                "customer_id":
                    customer_id
            },

            ip_address=None
        )

        # ====================================================
        # 11. COMMIT AUDIT RECORD
        # ====================================================

        connection.commit()

        # ====================================================
        # 12. LOGIN SUCCESS
        # ====================================================

        return {
            "message": "Login successful",
            "user_id": user["user_id"],
            "role": login_data.role,
            "customer_id": customer_id
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()