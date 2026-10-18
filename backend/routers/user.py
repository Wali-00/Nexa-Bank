from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
from pwdlib import PasswordHash

from raw_database import get_connection

from schemas.user import (
    UserCreate,
    UserResponse
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


password_hash = PasswordHash.recommended()


# ============================================================
# GET ALL USERS
# ADMIN DASHBOARD
# ============================================================

@router.get("/")
def get_users():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                u.user_id,
                u.username,
                u.email,
                u.status,
                u.created_at,

                GROUP_CONCAT(
                    DISTINCT r.role_name
                    ORDER BY r.role_name
                    SEPARATOR ', '
                ) AS role_name

            FROM users u

            LEFT JOIN user_roles ur
                ON ur.user_id = u.user_id

            LEFT JOIN roles r
                ON r.role_id = ur.role_id

            GROUP BY
                u.user_id,
                u.username,
                u.email,
                u.status,
                u.created_at

            ORDER BY
                u.user_id ASC
            """
        )

        users = cursor.fetchall()

        return users if users else []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load users: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CREATE USER
# ============================================================

@router.post(
    "/",
    response_model=UserResponse
)
def create_user(
    user_data: UserCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. HASH PASSWORD
        # ========================================

        hashed_password = password_hash.hash(
            user_data.password
        )

        # ========================================
        # 2. CREATE USER
        # ========================================

        cursor.execute(
            """
            INSERT INTO users
            (
                username,
                email,
                password_hash
            )
            VALUES
            (
                %s,
                %s,
                %s
            )
            """,
            (
                user_data.username,
                user_data.email,
                hashed_password
            )
        )

        user_id = cursor.lastrowid

        # ========================================
        # 3. FIND CUSTOMER ROLE
        # ========================================

        cursor.execute(
            """
            SELECT
                role_id,
                role_name
            FROM roles
            WHERE role_name = 'CUSTOMER'
            """
        )

        customer_role = cursor.fetchone()

        if not customer_role:

            raise HTTPException(
                status_code=500,
                detail="CUSTOMER role not found in database"
            )

        # ========================================
        # 4. ASSIGN CUSTOMER ROLE
        # ========================================

        cursor.execute(
            """
            INSERT INTO user_roles
            (
                user_id,
                role_id
            )
            VALUES
            (
                %s,
                %s
            )
            """,
            (
                user_id,
                customer_role["role_id"]
            )
        )

        # ========================================
        # 5. CREATE WELCOME NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=user_id,
            title="Welcome to Nexa Bank",
            message=(
                "Your Nexa Bank user account has been "
                "created successfully. Complete your "
                "customer application to continue."
            ),
            notification_type="ACCOUNT"
        )

        # ========================================
        # 6. CREATE AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=user_id,
            action="USER_CREATED",
            entity_type="USER",
            entity_id=user_id,

            old_value=None,

            new_value={
                "username":
                    user_data.username,

                "email":
                    user_data.email,

                "role":
                    "CUSTOMER"
            },

            ip_address=None
        )

        # ========================================
        # 7. LOAD CREATED USER
        #
        # IMPORTANT:
        # Keep SELECT * here because UserResponse
        # requires created_at.
        # ========================================

        cursor.execute(
            """
            SELECT *
            FROM users
            WHERE user_id = %s
            """,
            (
                user_id,
            )
        )

        user = cursor.fetchone()

        # ========================================
        # 8. COMMIT EVERYTHING
        # ========================================

        connection.commit()

        return user

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"User creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()