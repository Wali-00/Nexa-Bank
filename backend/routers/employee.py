from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
from pwdlib import PasswordHash

from raw_database import get_connection
from schemas.employee import EmployeeCreate

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


password_hash = PasswordHash.recommended()


# ========================================
# GET ALL EMPLOYEES
# ========================================

@router.get("/")
def get_employees():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                e.employee_id,
                e.user_id,
                e.branch_id,
                e.department_id,
                e.position_id,
                e.first_name,
                e.last_name,
                d.department_name,
                p.position_name,
                b.branch_name,
                e.status
            FROM employees e
            JOIN departments d
                ON e.department_id = d.department_id
            JOIN positions p
                ON e.position_id = p.position_id
            JOIN branches b
                ON e.branch_id = b.branch_id
            ORDER BY e.employee_id
            """
        )

        employees = cursor.fetchall()

        return employees

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load employees: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# DASHBOARD STATISTICS
# ========================================

@router.get("/stats")
def get_employee_stats():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT COUNT(*) AS total_employees
            FROM employees
            """
        )

        total_employees = cursor.fetchone()["total_employees"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total_users
            FROM users
            """
        )

        total_users = cursor.fetchone()["total_users"]

        cursor.execute(
            """
            SELECT COUNT(*) AS active_users
            FROM users
            WHERE status = 'ACTIVE'
            """
        )

        active_users = cursor.fetchone()["active_users"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total_customers
            FROM customers
            """
        )

        total_customers = cursor.fetchone()["total_customers"]

        return {
            "total_employees": total_employees,
            "total_users": total_users,
            "active_users": active_users,
            "total_customers": total_customers
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load dashboard statistics: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# CREATE EMPLOYEE
# ========================================

@router.post("/")
def create_employee(
    employee_data: EmployeeCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # --------------------------------
        # 1. HASH PASSWORD
        # --------------------------------

        hashed_password = password_hash.hash(
            employee_data.password
        )

        # --------------------------------
        # 2. CREATE USER
        # --------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (
                username,
                email,
                password_hash,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                'ACTIVE'
            )
            """,
            (
                employee_data.username,
                employee_data.email,
                hashed_password
            )
        )

        user_id = cursor.lastrowid

        # --------------------------------
        # 3. FIND ROLE
        # --------------------------------

        cursor.execute(
            """
            SELECT role_id
            FROM roles
            WHERE role_name = %s
            """,
            (employee_data.role,)
        )

        role_result = cursor.fetchone()

        if not role_result:

            raise HTTPException(
                status_code=400,
                detail="Selected role does not exist"
            )

        role_id = role_result["role_id"]

        # --------------------------------
        # 4. CREATE USER ROLE
        # --------------------------------

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
                role_id
            )
        )

        # --------------------------------
        # 5. CREATE EMPLOYEE
        # --------------------------------

        cursor.execute(
            """
            INSERT INTO employees
            (
                user_id,
                branch_id,
                department_id,
                position_id,
                first_name,
                last_name,
                nid,
                phone,
                joining_date,
                salary,
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
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                user_id,
                employee_data.branch_id,
                employee_data.department_id,
                employee_data.position_id,
                employee_data.first_name,
                employee_data.last_name,
                employee_data.nid,
                employee_data.phone,
                employee_data.joining_date,
                employee_data.salary,
                employee_data.status
            )
        )

        employee_id = cursor.lastrowid

        # --------------------------------
        # 6. CREATE NOTIFICATION
        # --------------------------------

        create_notification(
            cursor=cursor,
            user_id=user_id,
            title="Employee Account Created",
            message=(
                "Your Nexa Bank employee account "
                "has been created successfully."
            ),
            notification_type="EMPLOYEE"
        )

        # --------------------------------
        # 7. CREATE AUDIT LOG
        # --------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="EMPLOYEE_CREATED",
            entity_type="EMPLOYEE",
            entity_id=employee_id,
            old_value=None,
            new_value={
                "user_id": user_id,
                "role": employee_data.role,
                "branch_id": employee_data.branch_id,
                "department_id": employee_data.department_id,
                "position_id": employee_data.position_id,
                "status": employee_data.status
            },
            ip_address=None
        )

        # --------------------------------
        # 8. COMMIT
        # --------------------------------

        connection.commit()

        return {
            "message": "Employee created successfully",
            "user_id": user_id,
            "employee_id": employee_id
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError as e:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Employee creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# UPDATE EMPLOYEE STATUS
# ========================================

@router.put("/{employee_id}/status")
def update_employee_status(
    employee_id: int,
    status: str
):

    allowed_statuses = [
        "ACTIVE",
        "ON_LEAVE",
        "INACTIVE"
    ]

    status = status.upper()

    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail="Invalid employee status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # --------------------------------
        # 1. LOCK EMPLOYEE
        # --------------------------------

        cursor.execute(
            """
            SELECT
                employee_id,
                user_id,
                first_name,
                last_name,
                status
            FROM employees
            WHERE employee_id = %s
            FOR UPDATE
            """,
            (employee_id,)
        )

        employee = cursor.fetchone()

        if not employee:

            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

        old_status = employee["status"]

        # --------------------------------
        # 2. AVOID UNNECESSARY UPDATE
        # --------------------------------

        if old_status == status:

            return {
                "message":
                    "Employee already has this status",
                "employee_id":
                    employee_id,
                "status":
                    status
            }

        # --------------------------------
        # 3. UPDATE EMPLOYEE STATUS
        # --------------------------------

        cursor.execute(
            """
            UPDATE employees
            SET status = %s
            WHERE employee_id = %s
            """,
            (
                status,
                employee_id
            )
        )

        # --------------------------------
        # 4. CREATE EMPLOYEE NOTIFICATION
        # --------------------------------

        notification_messages = {

            "ACTIVE":
                (
                    "Your employee status is now ACTIVE."
                ),

            "ON_LEAVE":
                (
                    "Your employee status has been changed "
                    "to ON_LEAVE."
                ),

            "INACTIVE":
                (
                    "Your employee status has been changed "
                    "to INACTIVE."
                )
        }

        create_notification(
            cursor=cursor,
            user_id=employee["user_id"],
            title="Employee Status Updated",
            message=notification_messages[status],
            notification_type="EMPLOYEE_STATUS"
        )

        # --------------------------------
        # 5. CREATE AUDIT LOG
        # --------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="EMPLOYEE_STATUS_UPDATED",
            entity_type="EMPLOYEE",
            entity_id=employee_id,

            old_value={
                "status":
                    old_status
            },

            new_value={
                "status":
                    status
            },

            ip_address=None
        )

        # --------------------------------
        # 6. COMMIT
        # --------------------------------

        connection.commit()

        return {
            "message":
                "Employee status updated successfully",
            "employee_id":
                employee_id,
            "status":
                status
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Employee status update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()