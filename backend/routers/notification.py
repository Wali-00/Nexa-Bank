from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection
from schemas.notification import NotificationCreate

from utils.system_events import create_audit_log


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


# ============================================================
# CREATE NOTIFICATION
# ============================================================

@router.post("/")
def create_notification(data: NotificationCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Verify user exists
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                user_id
            FROM users
            WHERE user_id = %s
            """,
            (data.user_id,)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # ----------------------------------------------------
        # 2. Create notification
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO notifications
            (
                user_id,
                title,
                message,
                notification_type,
                is_read
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                0
            )
            """,
            (
                data.user_id,
                data.title,
                data.message,
                data.notification_type
            )
        )

        notification_id = cursor.lastrowid

        # ----------------------------------------------------
        # 3. Audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=data.user_id,
            action="NOTIFICATION_CREATED",
            entity_type="NOTIFICATION",
            entity_id=notification_id,

            old_value=None,

            new_value={
                "user_id":
                    data.user_id,

                "title":
                    data.title,

                "message":
                    data.message,

                "notification_type":
                    data.notification_type,

                "is_read":
                    False
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 4. Commit
        # ----------------------------------------------------

        connection.commit()

        return {
            "message":
                "Notification created successfully",

            "notification_id":
                notification_id,

            "user_id":
                data.user_id,

            "is_read":
                False
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Notification could not be created"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Notification creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()

# ============================================================
# GET ALL NOTIFICATIONS
# ============================================================

@router.get("/")
def get_all_notifications():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                n.notification_id,
                n.user_id,
                u.username,
                u.email,
                n.title,
                n.message,
                n.notification_type,
                n.is_read,
                n.created_at
            FROM notifications n

            LEFT JOIN users u
                ON u.user_id = n.user_id

            ORDER BY
                n.created_at DESC,
                n.notification_id DESC
            """
        )

        notifications = cursor.fetchall()

        return notifications if notifications else []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load notifications: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()
# ============================================================
# GET USER NOTIFICATIONS
# ============================================================

@router.get("/user/{user_id}")
def get_user_notifications(user_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # 1. Verify user exists
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # ----------------------------------------------------
        # 2. Load notifications
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                notification_id,
                user_id,
                title,
                message,
                notification_type,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC,
                     notification_id DESC
            """,
            (user_id,)
        )

        notifications = cursor.fetchall()

        return notifications

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load notifications: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# MARK NOTIFICATION AS READ
# ============================================================

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Lock notification
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                notification_id,
                user_id,
                is_read
            FROM notifications
            WHERE notification_id = %s
            FOR UPDATE
            """,
            (notification_id,)
        )

        notification = cursor.fetchone()

        if not notification:

            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        # ----------------------------------------------------
        # 2. Already read
        # ----------------------------------------------------

        if notification["is_read"]:

            connection.commit()

            return {
                "message":
                    "Notification is already marked as read",

                "notification_id":
                    notification_id,

                "is_read":
                    True
            }

        # ----------------------------------------------------
        # 3. Mark as read
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE notifications
            SET is_read = 1
            WHERE notification_id = %s
            """,
            (notification_id,)
        )

        connection.commit()

        return {
            "message":
                "Notification marked as read",

            "notification_id":
                notification_id,

            "is_read":
                True
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Notification update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()