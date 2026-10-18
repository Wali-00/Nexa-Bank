from fastapi import APIRouter, HTTPException, Query
from pymysql import IntegrityError

from raw_database import get_connection

from schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)


# ============================================================
# CREATE CUSTOMER
# ============================================================

@router.post(
    "/",
    response_model=CustomerResponse
)
def create_customer(customer_data: CustomerCreate):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        cursor.execute(
            """
            INSERT INTO customers
            (
                user_id,
                branch_id,
                first_name,
                last_name,
                date_of_birth,
                nid,
                phone,
                email,
                address,
                occupation
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
                %s
            )
            """,
            (
                customer_data.user_id,
                customer_data.branch_id,
                customer_data.first_name,
                customer_data.last_name,
                customer_data.date_of_birth,
                customer_data.nid,
                customer_data.phone,
                customer_data.email,
                customer_data.address,
                customer_data.occupation
            )
        )

        customer_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                branch_id,
                first_name,
                last_name,
                date_of_birth,
                nid,
                phone,
                email,
                address,
                occupation,
                status,
                created_at
            FROM customers
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        connection.commit()

        return customer

    except IntegrityError:
        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Customer with the same NID or "
                "phone number already exists"
            )
        )

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Customer creation failed: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# GET ALL CUSTOMERS
# ============================================================

@router.get(
    "/",
    response_model=list[CustomerResponse]
)
def get_customers():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                branch_id,
                first_name,
                last_name,
                date_of_birth,
                nid,
                phone,
                email,
                address,
                occupation,
                status,
                created_at
            FROM customers
            ORDER BY customer_id DESC
            """
        )

        customers = cursor.fetchall()

        return customers

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load customers: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# GET APPROVED CUSTOMERS
# ============================================================

@router.get(
    "/approved",
    response_model=list[CustomerResponse]
)
def get_approved_customers():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT DISTINCT
                c.customer_id,
                c.user_id,
                c.branch_id,
                c.first_name,
                c.last_name,
                c.date_of_birth,
                c.nid,
                c.phone,
                c.email,
                c.address,
                c.occupation,
                c.status,
                c.created_at
            FROM customers c
            INNER JOIN account_applications aa
                ON aa.customer_id = c.customer_id
            WHERE aa.status = 'APPROVED'
            ORDER BY c.customer_id DESC
            """
        )

        customers = cursor.fetchall()

        return customers

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load approved customers: "
                f"{str(e)}"
            )
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# ACCOUNT OFFICER - GET ALL CUSTOMER MANAGEMENT RECORDS
# ============================================================

@router.get("/management/all")
def get_all_customer_management_records():

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                c.customer_id,
                c.user_id,
                c.branch_id,
                c.first_name,
                c.last_name,
                c.date_of_birth,
                c.nid,
                c.phone,
                c.email,
                c.address,
                c.occupation,
                c.status AS customer_status,

                a.account_id,
                a.account_number,
                a.account_type_id,
                a.balance,
                a.available_balance,
                a.status AS account_status,
                a.opened_date,

                aa.application_id,
                aa.status AS application_status

            FROM customers c

            LEFT JOIN accounts a
                ON a.customer_id = c.customer_id

            LEFT JOIN account_applications aa
                ON aa.application_id = (
                    SELECT MAX(aa2.application_id)
                    FROM account_applications aa2
                    WHERE aa2.customer_id = c.customer_id
                )

            ORDER BY
                c.customer_id DESC,
                a.account_id ASC
            """
        )

        results = cursor.fetchall()

        return results if results else []

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load customer management records: "
                f"{str(e)}"
            )
        )

    finally:
        cursor.close()
        connection.close()
        
# ============================================================
# ACCOUNT OFFICER - GET CUSTOMERS FROM ASSIGNED BRANCH
# ============================================================

@router.get("/management/officer/{user_id}")
def get_officer_branch_customer_management_records(
    user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # 1. FIND LOGGED-IN ACCOUNT OFFICER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                e.employee_id,
                e.user_id,
                e.branch_id,
                e.first_name,
                e.last_name,
                e.status,
                b.branch_name,
                b.branch_code
            FROM employees e

            JOIN branches b
                ON b.branch_id = e.branch_id

            JOIN user_roles ur
                ON ur.user_id = e.user_id

            JOIN roles r
                ON r.role_id = ur.role_id

            WHERE e.user_id = %s
              AND r.role_name = 'ACCOUNT_OFFICER'

            LIMIT 1
            """,
            (
                user_id,
            )
        )

        officer = cursor.fetchone()

        if not officer:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Account Officer employee record "
                    "not found"
                )
            )

        # ----------------------------------------------------
        # 2. OFFICER MUST BE ACTIVE
        # ----------------------------------------------------

        if officer["status"] != "ACTIVE":

            raise HTTPException(
                status_code=403,
                detail="Account Officer is not active"
            )

        # ----------------------------------------------------
        # 3. OFFICER MUST HAVE A BRANCH
        # ----------------------------------------------------

        if not officer["branch_id"]:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Account Officer is not assigned "
                    "to a branch"
                )
            )

        branch_id = officer["branch_id"]

        # ----------------------------------------------------
        # 4. LOAD ONLY CUSTOMERS FROM OFFICER BRANCH
        #
        # SAME DATA STRUCTURE AS /management/all
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                c.customer_id,
                c.user_id,
                c.branch_id,
                c.first_name,
                c.last_name,
                c.date_of_birth,
                c.nid,
                c.phone,
                c.email,
                c.address,
                c.occupation,
                c.status AS customer_status,

                b.branch_name,
                b.branch_code,

                a.account_id,
                a.account_number,
                a.account_type_id,
                a.balance,
                a.available_balance,
                a.status AS account_status,
                a.opened_date,

                aa.application_id,
                aa.status AS application_status

            FROM customers c

            JOIN branches b
                ON b.branch_id = c.branch_id

            LEFT JOIN accounts a
                ON a.customer_id = c.customer_id
               AND a.branch_id = c.branch_id

            LEFT JOIN account_applications aa
                ON aa.application_id = (

                    SELECT
                        MAX(aa2.application_id)

                    FROM account_applications aa2

                    WHERE aa2.customer_id = c.customer_id
                      AND aa2.branch_id = c.branch_id
                )

            WHERE c.branch_id = %s

            ORDER BY
                c.customer_id DESC,
                a.account_id ASC
            """,
            (
                branch_id,
            )
        )

        customers = cursor.fetchall()

        # ----------------------------------------------------
        # 5. RETURN OFFICER + BRANCH + CUSTOMER INFORMATION
        # ----------------------------------------------------

        return {
            "employee_id":
                officer["employee_id"],

            "user_id":
                officer["user_id"],

            "branch_id":
                branch_id,

            "branch_name":
                officer["branch_name"],

            "branch_code":
                officer["branch_code"],

            "customers":
                customers if customers else []
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load branch customer "
                f"management records: {str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# ACCOUNT OFFICER - SEARCH CUSTOMERS
# ============================================================

@router.get("/search/by-query")
def search_customers(
    query: str = Query(
        ...,
        min_length=1
    )
):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        search_value = f"%{query.strip()}%"

        cursor.execute(
            """
            SELECT
                c.customer_id,
                c.user_id,
                c.branch_id,
                c.first_name,
                c.last_name,
                c.date_of_birth,
                c.nid,
                c.phone,
                c.email,
                c.address,
                c.occupation,
                c.status AS customer_status,

                a.account_id,
                a.account_number,
                a.account_type_id,
                a.balance,
                a.available_balance,
                a.status AS account_status,
                a.opened_date,

                aa.application_id,
                aa.status AS application_status

            FROM customers c

            LEFT JOIN accounts a
                ON a.customer_id = c.customer_id

            LEFT JOIN account_applications aa
                ON aa.application_id = (
                    SELECT MAX(aa2.application_id)
                    FROM account_applications aa2
                    WHERE aa2.customer_id = c.customer_id
                )

            WHERE
                CAST(c.customer_id AS CHAR) LIKE %s
                OR c.first_name LIKE %s
                OR c.last_name LIKE %s
                OR CONCAT(
                    c.first_name,
                    ' ',
                    c.last_name
                ) LIKE %s
                OR c.email LIKE %s
                OR c.phone LIKE %s
                OR c.nid LIKE %s
                OR a.account_number LIKE %s

            ORDER BY
                c.customer_id DESC,
                a.account_id ASC
            """,
            (
                search_value,
                search_value,
                search_value,
                search_value,
                search_value,
                search_value,
                search_value,
                search_value
            )
        )

        results = cursor.fetchall()

        return results if results else []

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Customer search failed: "
                f"{str(e)}"
            )
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# GET CUSTOMER BY ID
# ============================================================

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse
)
def get_customer(customer_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                branch_id,
                first_name,
                last_name,
                date_of_birth,
                nid,
                phone,
                email,
                address,
                occupation,
                status,
                created_at
            FROM customers
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        return customer

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load customer: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# UPDATE CUSTOMER
# ============================================================

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse
)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        # ----------------------------------------------------
        # 1. LOCK CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                first_name,
                last_name,
                date_of_birth,
                phone,
                email,
                address,
                occupation
            FROM customers
            WHERE customer_id = %s
            FOR UPDATE
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        linked_user = None

        # ----------------------------------------------------
        # 2. GET LINKED USER
        # ----------------------------------------------------

        if customer["user_id"]:
            cursor.execute(
                """
                SELECT
                    user_id,
                    username,
                    email
                FROM users
                WHERE user_id = %s
                FOR UPDATE
                """,
                (customer["user_id"],)
            )

            linked_user = cursor.fetchone()

        # ----------------------------------------------------
        # 3. CHECK NEW EMAIL
        # ----------------------------------------------------

        if (
            linked_user
            and customer_data.email != customer["email"]
        ):
            cursor.execute(
                """
                SELECT
                    user_id
                FROM users
                WHERE email = %s
                  AND user_id != %s
                """,
                (
                    customer_data.email,
                    linked_user["user_id"]
                )
            )

            existing_user = cursor.fetchone()

            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Email is already registered"
                )

        # ----------------------------------------------------
        # 4. UPDATE CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE customers
            SET
                first_name = %s,
                last_name = %s,
                date_of_birth = %s,
                phone = %s,
                email = %s,
                address = %s,
                occupation = %s
            WHERE customer_id = %s
            """,
            (
                customer_data.first_name,
                customer_data.last_name,
                customer_data.date_of_birth,
                customer_data.phone,
                customer_data.email,
                customer_data.address,
                customer_data.occupation,
                customer_id
            )
        )

        # ----------------------------------------------------
        # 5. SYNCHRONIZE LINKED USER EMAIL
        # ----------------------------------------------------

        if linked_user:
            cursor.execute(
                """
                UPDATE users
                SET
                    email = %s,
                    username = %s
                WHERE user_id = %s
                """,
                (
                    customer_data.email,
                    customer_data.email,
                    linked_user["user_id"]
                )
            )

        # ----------------------------------------------------
        # 6. CREATE AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="CUSTOMER_PROFILE_UPDATED",
            entity_type="CUSTOMER",
            entity_id=customer_id,
            old_value={
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "date_of_birth": str(
                    customer["date_of_birth"]
                ),
                "phone": customer["phone"],
                "email": customer["email"],
                "address": customer["address"],
                "occupation": customer["occupation"]
            },
            new_value={
                "first_name": customer_data.first_name,
                "last_name": customer_data.last_name,
                "date_of_birth": str(
                    customer_data.date_of_birth
                ),
                "phone": customer_data.phone,
                "email": customer_data.email,
                "address": customer_data.address,
                "occupation": customer_data.occupation
            },
            ip_address=None
        )

        # ----------------------------------------------------
        # 7. LOAD UPDATED CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                branch_id,
                first_name,
                last_name,
                date_of_birth,
                nid,
                phone,
                email,
                address,
                occupation,
                status,
                created_at
            FROM customers
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        updated_customer = cursor.fetchone()

        connection.commit()

        return updated_customer

    except HTTPException:
        connection.rollback()
        raise

    except IntegrityError:
        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to update customer information"
        )

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Customer update failed: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# DELETE CUSTOMER
# ============================================================

@router.delete("/{customer_id}")
def delete_customer(customer_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        # ----------------------------------------------------
        # 1. LOCK CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                first_name,
                last_name,
                email
            FROM customers
            WHERE customer_id = %s
            FOR UPDATE
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # ----------------------------------------------------
        # 2. CHECK DEPENDENCIES
        # ----------------------------------------------------

        dependency_checks = {
            "accounts": "accounts",
            "account applications": "account_applications",
            "KYC records": "kyc_verifications",
            "beneficiaries": "beneficiaries",
            "loan applications": "loan_applications",
            "loans": "loans",
            "cards": "cards",
            "bill payments": "bill_payments",
            "fixed deposits": "fixed_deposits"
        }

        existing_records = []

        for name, table_name in dependency_checks.items():

            query = f"""
                SELECT COUNT(*) AS record_count
                FROM {table_name}
                WHERE customer_id = %s
            """

            cursor.execute(
                query,
                (customer_id,)
            )

            result = cursor.fetchone()

            count = result["record_count"]

            if count and count > 0:
                existing_records.append(
                    f"{name} : {count}"
                )

        if existing_records:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Customer cannot be deleted because "
                    "related records exist: "
                    + ", ".join(existing_records)
                )
            )

        linked_user_id = customer["user_id"]

        # ----------------------------------------------------
        # 3. AUDIT BEFORE DELETION
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=linked_user_id,
            action="CUSTOMER_DELETED",
            entity_type="CUSTOMER",
            entity_id=customer_id,
            old_value={
                "customer_id": customer_id,
                "name": (
                    f"{customer['first_name']} "
                    f"{customer['last_name']}"
                ),
                "email": customer["email"]
            },
            new_value=None,
            ip_address=None
        )

        # ----------------------------------------------------
        # 4. DELETE CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            DELETE FROM customers
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        # ----------------------------------------------------
        # 5. DELETE LINKED ROLE + USER
        # ----------------------------------------------------

        if linked_user_id:
            cursor.execute(
                """
                DELETE FROM user_roles
                WHERE user_id = %s
                """,
                (linked_user_id,)
            )

            cursor.execute(
                """
                DELETE FROM users
                WHERE user_id = %s
                """,
                (linked_user_id,)
            )

        connection.commit()

        return {
            "message": "Customer deleted successfully",
            "customer_id": customer_id
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Customer deletion failed: {str(e)}"
        )

    finally:
        cursor.close()
        connection.close()


# ============================================================
# UPDATE CUSTOMER STATUS
# ============================================================

@router.put("/{customer_id}/status")
def update_customer_status(
    customer_id: int,
    status: str
):

    allowed_statuses = [
        "ACTIVE",
        "INACTIVE",
        "BLOCKED"
    ]

    status = status.upper()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid customer status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:
        connection.begin()

        # ----------------------------------------------------
        # 1. LOCK CUSTOMER
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                first_name,
                last_name,
                status
            FROM customers
            WHERE customer_id = %s
            FOR UPDATE
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        old_status = customer["status"]

        # ----------------------------------------------------
        # 2. AVOID UNNECESSARY UPDATE
        # ----------------------------------------------------

        if old_status == status:
            connection.rollback()

            return {
                "message": "Customer already has this status",
                "customer_id": customer_id,
                "status": status
            }

        # ----------------------------------------------------
        # 3. UPDATE CUSTOMER STATUS
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE customers
            SET status = %s
            WHERE customer_id = %s
            """,
            (
                status,
                customer_id
            )
        )

        # ----------------------------------------------------
        # 4. CREATE CUSTOMER NOTIFICATION
        # ----------------------------------------------------

        notification_messages = {
            "ACTIVE": (
                "Your Nexa Bank customer profile "
                "is now active."
            ),
            "INACTIVE": (
                "Your Nexa Bank customer profile "
                "has been set to inactive."
            ),
            "BLOCKED": (
                "Your Nexa Bank customer profile "
                "has been blocked."
            )
        }

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="Customer Status Updated",
            message=notification_messages[status],
            notification_type="ACCOUNT_STATUS"
        )

        # ----------------------------------------------------
        # 5. CREATE AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="CUSTOMER_STATUS_UPDATED",
            entity_type="CUSTOMER",
            entity_id=customer_id,
            old_value={
                "status": old_status
            },
            new_value={
                "status": status
            },
            ip_address=None
        )

        # ----------------------------------------------------
        # 6. COMMIT
        # ----------------------------------------------------

        connection.commit()

        return {
            "message": "Customer status updated successfully",
            "customer_id": customer_id,
            "status": status
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Customer status update failed: "
                f"{str(e)}"
            )
        )

    finally:
        cursor.close()
        connection.close()