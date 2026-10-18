from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
import json

from raw_database import get_connection
from schemas.audit_log import AuditLogCreate


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


# ============================================================
# CREATE AUDIT LOG
# ============================================================

@router.post("/")
def create_audit_log(data: AuditLogCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        old_value_json = (
            json.dumps(
                data.old_value,
                default=str
            )
            if data.old_value is not None
            else None
        )

        new_value_json = (
            json.dumps(
                data.new_value,
                default=str
            )
            if data.new_value is not None
            else None
        )

        cursor.execute(
            """
            INSERT INTO audit_logs
            (
                user_id,
                action,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address
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
                data.user_id,
                data.action,
                data.entity_type,
                data.entity_id,
                old_value_json,
                new_value_json,
                data.ip_address
            )
        )

        audit_id = cursor.lastrowid

        connection.commit()

        return {
            "message":
                "Audit log created successfully",

            "audit_id":
                audit_id
        }

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Audit log could not be created"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Audit log creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL AUDIT LOGS
# ============================================================

@router.get("/")
def get_audit_logs():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                audit_id,
                user_id,
                action,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC,
                     audit_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load audit logs: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET AUDIT LOG BY ID
# ============================================================

@router.get("/{audit_id}")
def get_audit_log(
    audit_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                audit_id,
                user_id,
                action,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                created_at
            FROM audit_logs
            WHERE audit_id = %s
            """,
            (audit_id,)
        )

        audit = cursor.fetchone()

        if not audit:

            raise HTTPException(
                status_code=404,
                detail="Audit log not found"
            )

        return audit

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load audit log: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET AUDIT LOGS BY ENTITY
# ============================================================

@router.get(
    "/entity/{entity_type}/{entity_id}"
)
def get_audit_logs_by_entity(
    entity_type: str,
    entity_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                audit_id,
                user_id,
                action,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                created_at
            FROM audit_logs
            WHERE entity_type = %s
              AND entity_id = %s
            ORDER BY created_at DESC,
                     audit_id DESC
            """,
            (
                entity_type,
                entity_id
            )
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load entity audit logs: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET AUDIT LOGS BY USER
# ============================================================

@router.get("/user/{user_id}")
def get_audit_logs_by_user(
    user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                audit_id,
                user_id,
                action,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                created_at
            FROM audit_logs
            WHERE user_id = %s
            ORDER BY created_at DESC,
                     audit_id DESC
            """,
            (user_id,)
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load user audit logs: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()