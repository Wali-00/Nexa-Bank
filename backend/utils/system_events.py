import json


# ============================================================
# CREATE NOTIFICATION
# ============================================================

def create_notification(
    cursor,
    user_id,
    title,
    message,
    notification_type
):

    if user_id is None:
        return None

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
            user_id,
            title,
            message,
            notification_type
        )
    )

    return cursor.lastrowid


# ============================================================
# CREATE AUDIT LOG
# ============================================================

def create_audit_log(
    cursor,
    user_id,
    action,
    entity_type,
    entity_id=None,
    old_value=None,
    new_value=None,
    ip_address=None
):

    old_value_json = (
        json.dumps(
            old_value,
            default=str
        )
        if old_value is not None
        else None
    )

    new_value_json = (
        json.dumps(
            new_value,
            default=str
        )
        if new_value is not None
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
            user_id,
            action,
            entity_type,
            entity_id,
            old_value_json,
            new_value_json,
            ip_address
        )
    )

    return cursor.lastrowid