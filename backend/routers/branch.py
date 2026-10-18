from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from pymysql import IntegrityError

from raw_database import get_connection

from utils.system_events import create_audit_log


router = APIRouter(
    prefix="/branches",
    tags=["Branches"]
)


# ============================================================
# SCHEMAS
# ============================================================

class BranchCreate(BaseModel):
    branch_code: str = Field(min_length=1)
    branch_name: str = Field(min_length=1)
    address: str = Field(min_length=1)
    city: str = Field(min_length=1)
    phone: Optional[str] = None
    manager_employee_id: Optional[int] = None
    status: str = "ACTIVE"


class BranchUpdate(BaseModel):
    branch_code: str = Field(min_length=1)
    branch_name: str = Field(min_length=1)
    address: str = Field(min_length=1)
    city: str = Field(min_length=1)
    phone: Optional[str] = None
    manager_employee_id: Optional[int] = None
    status: str


# ============================================================
# GET ALL BRANCHES
# ============================================================

@router.get("/")
def get_branches():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                b.branch_id,
                b.branch_code,
                b.branch_name,
                b.address,
                b.city,
                b.phone,
                b.manager_employee_id,
                b.status,

                CONCAT(
                    e.first_name,
                    ' ',
                    e.last_name
                ) AS manager_name

            FROM branches b

            LEFT JOIN employees e
                ON e.employee_id = b.manager_employee_id

            ORDER BY b.branch_id ASC
            """
        )

        branches = cursor.fetchall()

        return branches if branches else []

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load branches: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# GET ONE BRANCH
# ============================================================

@router.get("/{branch_id}")
def get_branch(branch_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                b.branch_id,
                b.branch_code,
                b.branch_name,
                b.address,
                b.city,
                b.phone,
                b.manager_employee_id,
                b.status,

                CONCAT(
                    e.first_name,
                    ' ',
                    e.last_name
                ) AS manager_name

            FROM branches b

            LEFT JOIN employees e
                ON e.employee_id = b.manager_employee_id

            WHERE b.branch_id = %s
            """,
            (branch_id,)
        )

        branch = cursor.fetchone()

        if not branch:
            raise HTTPException(
                status_code=404,
                detail="Branch not found"
            )

        return branch

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load branch: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# CREATE BRANCH
# ============================================================

@router.post("/")
def create_branch(branch_data: BranchCreate):

    allowed_statuses = [
        "ACTIVE",
        "INACTIVE",
        "CLOSED"
    ]

    status = branch_data.status.upper()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid branch status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        # ----------------------------------------------------
        # CHECK BRANCH CODE
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT branch_id
            FROM branches
            WHERE branch_code = %s
            """,
            (branch_data.branch_code,)
        )

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Branch code already exists"
            )

        # ----------------------------------------------------
        # CHECK MANAGER
        # ----------------------------------------------------

        if branch_data.manager_employee_id is not None:

            cursor.execute(
                """
                SELECT
                    employee_id
                FROM employees
                WHERE employee_id = %s
                """,
                (branch_data.manager_employee_id,)
            )

            manager = cursor.fetchone()

            if not manager:
                raise HTTPException(
                    status_code=400,
                    detail="Selected manager employee does not exist"
                )

        # ----------------------------------------------------
        # INSERT BRANCH
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO branches
            (
                branch_code,
                branch_name,
                address,
                city,
                phone,
                manager_employee_id,
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
                %s
            )
            """,
            (
                branch_data.branch_code,
                branch_data.branch_name,
                branch_data.address,
                branch_data.city,
                branch_data.phone,
                branch_data.manager_employee_id,
                status
            )
        )

        branch_id = cursor.lastrowid

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="BRANCH_CREATED",
            entity_type="BRANCH",
            entity_id=branch_id,
            old_value=None,
            new_value={
                "branch_code": branch_data.branch_code,
                "branch_name": branch_data.branch_name,
                "address": branch_data.address,
                "city": branch_data.city,
                "phone": branch_data.phone,
                "manager_employee_id": (
                    branch_data.manager_employee_id
                ),
                "status": status
            },
            ip_address=None
        )

        connection.commit()

        return {
            "message": "Branch created successfully",
            "branch_id": branch_id
        }

    except HTTPException:
        connection.rollback()
        raise

    except IntegrityError as e:
        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Unable to create branch: {str(e)}"
        )

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Branch creation failed: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# UPDATE BRANCH
# ============================================================

@router.put("/{branch_id}")
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate
):

    allowed_statuses = [
        "ACTIVE",
        "INACTIVE",
        "CLOSED"
    ]

    status = branch_data.status.upper()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid branch status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        # ----------------------------------------------------
        # LOCK BRANCH
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                branch_id,
                branch_code,
                branch_name,
                address,
                city,
                phone,
                manager_employee_id,
                status
            FROM branches
            WHERE branch_id = %s
            FOR UPDATE
            """,
            (branch_id,)
        )

        branch = cursor.fetchone()

        if not branch:
            raise HTTPException(
                status_code=404,
                detail="Branch not found"
            )

        # ----------------------------------------------------
        # UNIQUE CODE
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT branch_id
            FROM branches
            WHERE branch_code = %s
              AND branch_id != %s
            """,
            (
                branch_data.branch_code,
                branch_id
            )
        )

        duplicate = cursor.fetchone()

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Branch code already exists"
            )

        # ----------------------------------------------------
        # VALIDATE MANAGER
        # ----------------------------------------------------

        if branch_data.manager_employee_id is not None:

            cursor.execute(
                """
                SELECT employee_id
                FROM employees
                WHERE employee_id = %s
                """,
                (branch_data.manager_employee_id,)
            )

            manager = cursor.fetchone()

            if not manager:
                raise HTTPException(
                    status_code=400,
                    detail="Selected manager employee does not exist"
                )

        # ----------------------------------------------------
        # UPDATE
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE branches
            SET
                branch_code = %s,
                branch_name = %s,
                address = %s,
                city = %s,
                phone = %s,
                manager_employee_id = %s,
                status = %s
            WHERE branch_id = %s
            """,
            (
                branch_data.branch_code,
                branch_data.branch_name,
                branch_data.address,
                branch_data.city,
                branch_data.phone,
                branch_data.manager_employee_id,
                status,
                branch_id
            )
        )

        # ----------------------------------------------------
        # AUDIT
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="BRANCH_UPDATED",
            entity_type="BRANCH",
            entity_id=branch_id,
            old_value={
                "branch_code": branch["branch_code"],
                "branch_name": branch["branch_name"],
                "address": branch["address"],
                "city": branch["city"],
                "phone": branch["phone"],
                "manager_employee_id": (
                    branch["manager_employee_id"]
                ),
                "status": branch["status"]
            },
            new_value={
                "branch_code": branch_data.branch_code,
                "branch_name": branch_data.branch_name,
                "address": branch_data.address,
                "city": branch_data.city,
                "phone": branch_data.phone,
                "manager_employee_id": (
                    branch_data.manager_employee_id
                ),
                "status": status
            },
            ip_address=None
        )

        connection.commit()

        return {
            "message": "Branch updated successfully",
            "branch_id": branch_id
        }

    except HTTPException:
        connection.rollback()
        raise

    except IntegrityError as e:
        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Unable to update branch: {str(e)}"
        )

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Branch update failed: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()