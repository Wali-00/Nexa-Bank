from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

import uuid

from raw_database import get_connection

from schemas.account_application import (
    AccountApplicationCreate,
    AccountApplicationUpdate,
    AccountApplicationResponse
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/account-applications",
    tags=["Account Applications"]
)


# ============================================================
# HELPER
# GET ACTIVE ACCOUNT OFFICER BY USER ID
# ============================================================

def get_active_account_officer(
    cursor,
    user_id: int
):

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
            detail="Account Officer employee record not found"
        )

    if not officer["branch_id"]:

        raise HTTPException(
            status_code=400,
            detail="Account Officer is not assigned to a branch"
        )

    if officer["status"] != "ACTIVE":

        raise HTTPException(
            status_code=403,
            detail="Account Officer is not active"
        )

    return officer


# ============================================================
# CREATE ACCOUNT APPLICATION
# ============================================================

@router.post(
    "/",
    response_model=AccountApplicationResponse
)
def create_account_application(
    application_data: AccountApplicationCreate
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
                user_id,
                branch_id,
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (
                application_data.customer_id,
            )
        )

        customer = cursor.fetchone()

        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # ----------------------------------------------------
        # 2. Verify branch exists
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                branch_id,
                branch_name,
                status
            FROM branches
            WHERE branch_id = %s
            """,
            (
                application_data.branch_id,
            )
        )

        branch = cursor.fetchone()

        if not branch:

            raise HTTPException(
                status_code=404,
                detail="Branch not found"
            )

        # ----------------------------------------------------
        # 3. Customer must apply through own branch
        # ----------------------------------------------------

        if (
            int(customer["branch_id"])
            !=
            int(application_data.branch_id)
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Account application branch must match "
                    "the customer's assigned branch"
                )
            )

        # ----------------------------------------------------
        # 4. Create application
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO account_applications
            (
                customer_id,
                account_type_id,
                branch_id
            )
            VALUES
            (
                %s,
                %s,
                %s
            )
            """,
            (
                application_data.customer_id,
                application_data.account_type_id,
                application_data.branch_id
            )
        )

        application_id = cursor.lastrowid

        # ----------------------------------------------------
        # 5. Audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="ACCOUNT_APPLICATION_CREATED",
            entity_type="ACCOUNT_APPLICATION",
            entity_id=application_id,

            old_value=None,

            new_value={
                "customer_id":
                    application_data.customer_id,

                "account_type_id":
                    application_data.account_type_id,

                "branch_id":
                    application_data.branch_id
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 6. Load application
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM account_applications
            WHERE application_id = %s
            """,
            (
                application_id,
            )
        )

        application = cursor.fetchone()

        connection.commit()

        return application

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid customer, account type, or branch"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Account application creation failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL ACCOUNT APPLICATIONS
#
# ADMIN / SYSTEM-WIDE ENDPOINT
# ============================================================

@router.get(
    "/",
    response_model=list[AccountApplicationResponse]
)
def get_account_applications():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM account_applications
            ORDER BY application_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load account applications: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ACCOUNT APPLICATIONS FOR ACCOUNT OFFICER'S BRANCH
# ============================================================

@router.get(
    "/officer/{user_id}"
)
def get_account_applications_for_officer(
    user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # 1. Resolve logged-in Account Officer
        # ----------------------------------------------------

        officer = get_active_account_officer(
            cursor,
            user_id
        )

        branch_id = officer["branch_id"]

        # ----------------------------------------------------
        # 2. Load applications from same branch only
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                aa.application_id,
                aa.customer_id,
                aa.account_type_id,
                aa.branch_id,
                aa.reviewed_by,
                aa.submitted_at,
                aa.reviewed_at,
                aa.status,
                aa.rejection_reason,

                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.nid,
                c.status AS customer_status,

                at.type_name AS account_type_name,

                b.branch_name,
                b.branch_code,

                CONCAT(
                    reviewer.first_name,
                    ' ',
                    reviewer.last_name
                ) AS reviewer_name

            FROM account_applications aa

            JOIN customers c
                ON c.customer_id = aa.customer_id

            JOIN account_types at
                ON at.account_type_id = aa.account_type_id

            JOIN branches b
                ON b.branch_id = aa.branch_id

            LEFT JOIN employees reviewer
                ON reviewer.employee_id = aa.reviewed_by

            WHERE aa.branch_id = %s
              AND c.branch_id = %s

            ORDER BY
                aa.application_id DESC
            """,
            (
                branch_id,
                branch_id
            )
        )

        applications = cursor.fetchall()

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

            "applications":
                applications if applications else []
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load branch account applications: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET SINGLE APPLICATION FOR ACCOUNT OFFICER
# ============================================================

@router.get(
    "/officer/{user_id}/application/{application_id}"
)
def get_account_application_for_officer(
    user_id: int,
    application_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ----------------------------------------------------
        # 1. Resolve officer
        # ----------------------------------------------------

        officer = get_active_account_officer(
            cursor,
            user_id
        )

        # ----------------------------------------------------
        # 2. Load only if application belongs to same branch
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                aa.*,

                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.nid,

                at.type_name AS account_type_name,

                b.branch_name,
                b.branch_code

            FROM account_applications aa

            JOIN customers c
                ON c.customer_id = aa.customer_id

            JOIN account_types at
                ON at.account_type_id = aa.account_type_id

            JOIN branches b
                ON b.branch_id = aa.branch_id

            WHERE aa.application_id = %s
              AND aa.branch_id = %s
              AND c.branch_id = %s
            """,
            (
                application_id,
                officer["branch_id"],
                officer["branch_id"]
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Account application not found "
                    "for your assigned branch"
                )
            )

        return application

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load account application: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ACCOUNT APPLICATION BY ID
#
# GENERAL / ADMIN ENDPOINT
# ============================================================

@router.get(
    "/{application_id}",
    response_model=AccountApplicationResponse
)
def get_account_application(
    application_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM account_applications
            WHERE application_id = %s
            """,
            (
                application_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail="Account application not found"
            )

        return application

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load account application: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE / REVIEW ACCOUNT APPLICATION
#
# ACCOUNT OFFICER BRANCH RESTRICTION:
#
# PUT /account-applications/{application_id}
#     ?officer_user_id=<logged_in_user_id>
#
# reviewed_by is resolved automatically from employees.
# ============================================================

@router.put(
    "/{application_id}",
    response_model=AccountApplicationResponse
)
def update_account_application(
    application_id: int,
    application_data: AccountApplicationUpdate,
    officer_user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Resolve reviewing Account Officer
        # ----------------------------------------------------

        officer = get_active_account_officer(
            cursor,
            officer_user_id
        )

        officer_employee_id = (
            officer["employee_id"]
        )

        officer_branch_id = (
            officer["branch_id"]
        )

        # ----------------------------------------------------
        # 2. Lock application
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM account_applications
            WHERE application_id = %s
            FOR UPDATE
            """,
            (
                application_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail="Account application not found"
            )

        # ----------------------------------------------------
        # 3. BRANCH ACCESS CONTROL
        # ----------------------------------------------------

        if (
            int(
                application["branch_id"]
            )
            !=
            int(
                officer_branch_id
            )
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot review an account application "
                    "from another branch"
                )
            )

        # ----------------------------------------------------
        # 4. Verify customer also belongs to officer branch
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                branch_id,
                first_name,
                last_name,
                status
            FROM customers
            WHERE customer_id = %s
            FOR UPDATE
            """,
            (
                application["customer_id"],
            )
        )

        customer = cursor.fetchone()

        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        if (
            int(
                customer["branch_id"]
            )
            !=
            int(
                officer_branch_id
            )
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "This customer does not belong to "
                    "your assigned branch"
                )
            )

        # ----------------------------------------------------
        # 5. Determine status
        # ----------------------------------------------------

        old_status = application["status"]

        new_status = (
            application_data.status.value

            if hasattr(
                application_data.status,
                "value"
            )

            else str(
                application_data.status
            )
        ).upper()

        allowed_statuses = [
            "SUBMITTED",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED"
        ]

        if new_status not in allowed_statuses:

            raise HTTPException(
                status_code=400,
                detail="Invalid account application status"
            )

        # ----------------------------------------------------
        # 6. Rejection reason handling
        # ----------------------------------------------------

        rejection_reason = (
            application_data.rejection_reason

            if new_status == "REJECTED"

            else None
        )

        if (
            new_status == "REJECTED"
            and not rejection_reason
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Rejection reason is required "
                    "when rejecting an application"
                )
            )

        # ====================================================
        # 7. APPROVAL REQUIRES VERIFIED KYC
        # ====================================================

        if new_status == "APPROVED":

            # ------------------------------------------------
            # Get latest KYC for this application/customer
            # ------------------------------------------------

            cursor.execute(
                """
                SELECT
                    kyc_id,
                    customer_id,
                    application_id,
                    status,
                    verified_by,
                    verified_at,
                    remarks
                FROM kyc_verifications
                WHERE application_id = %s
                  AND customer_id = %s
                ORDER BY kyc_id DESC
                LIMIT 1
                FOR UPDATE
                """,
                (
                    application_id,
                    application["customer_id"]
                )
            )

            latest_kyc = cursor.fetchone()

            # ------------------------------------------------
            # No KYC
            # ------------------------------------------------

            if not latest_kyc:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "KYC verification must be submitted "
                        "before approving this application"
                    )
                )

            # ------------------------------------------------
            # KYC exists but not VERIFIED
            # ------------------------------------------------

            if latest_kyc["status"] != "VERIFIED":

                if latest_kyc["status"] == "PENDING":

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "KYC verification is still PENDING. "
                            "Verify the customer's KYC before "
                            "approving this application."
                        )
                    )

                if (
                    latest_kyc["status"]
                    == "DOCUMENT_REQUIRED"
                ):

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Additional KYC documents are required "
                            "before this application can be approved."
                        )
                    )

                if latest_kyc["status"] == "REJECTED":

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "The customer's KYC verification was "
                            "rejected. A verified KYC is required "
                            "before approving this application."
                        )
                    )

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "KYC verification must be VERIFIED "
                        "before approving this application."
                    )
                )

        # ----------------------------------------------------
        # 8. Update application
        #
        # reviewed_by is NOT trusted from frontend.
        # It is automatically taken from logged-in officer.
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE account_applications
            SET
                status = %s,
                reviewed_by = %s,
                rejection_reason = %s,
                reviewed_at = NOW()
            WHERE application_id = %s
            """,
            (
                new_status,
                officer_employee_id,
                rejection_reason,
                application_id
            )
        )

        customer_user_id = customer["user_id"]

        created_account = None
        account_created = False

        # ====================================================
        # 9. APPROVAL → CREATE ACTUAL BANK ACCOUNT
        # ====================================================

        if new_status == "APPROVED":

            # ------------------------------------------------
            # Check whether matching account already exists
            # ------------------------------------------------

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
                  AND account_type_id = %s
                  AND branch_id = %s
                ORDER BY account_id DESC
                LIMIT 1
                FOR UPDATE
                """,
                (
                    application["customer_id"],
                    application["account_type_id"],
                    application["branch_id"]
                )
            )

            existing_account = cursor.fetchone()

            # ------------------------------------------------
            # No account exists → create
            # ------------------------------------------------

            if not existing_account:

                account_number = (
                    "NXB-"
                    + uuid.uuid4().hex[:16].upper()
                )

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
                        opened_date,
                        status
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        0.00,
                        0.00,
                        CURDATE(),
                        'ACTIVE'
                    )
                    """,
                    (
                        account_number,
                        application["customer_id"],
                        application["account_type_id"],
                        application["branch_id"]
                    )
                )

                account_id = cursor.lastrowid

                account_created = True

                # --------------------------------------------
                # Load created account
                # --------------------------------------------

                cursor.execute(
                    """
                    SELECT *
                    FROM accounts
                    WHERE account_id = %s
                    """,
                    (
                        account_id,
                    )
                )

                created_account = cursor.fetchone()

                # --------------------------------------------
                # Account creation audit log
                # --------------------------------------------

                create_audit_log(
                    cursor=cursor,

                    user_id=officer["user_id"],

                    action=(
                        "ACCOUNT_CREATED_FROM_APPLICATION"
                    ),

                    entity_type="ACCOUNT",

                    entity_id=account_id,

                    old_value=None,

                    new_value={
                        "application_id":
                            application_id,

                        "account_number":
                            account_number,

                        "customer_id":
                            application["customer_id"],

                        "account_type_id":
                            application["account_type_id"],

                        "branch_id":
                            application["branch_id"],

                        "balance":
                            0.00,

                        "available_balance":
                            0.00,

                        "status":
                            "ACTIVE"
                    },

                    ip_address=None
                )

            else:

                created_account = existing_account

                # --------------------------------------------
                # Older PENDING account → activate
                # --------------------------------------------

                if (
                    existing_account["status"]
                    == "PENDING"
                ):

                    cursor.execute(
                        """
                        UPDATE accounts
                        SET status = 'ACTIVE'
                        WHERE account_id = %s
                        """,
                        (
                            existing_account[
                                "account_id"
                            ],
                        )
                    )

                    created_account["status"] = (
                        "ACTIVE"
                    )

        # ====================================================
        # 10. CUSTOMER NOTIFICATION
        # ====================================================

        status_changed = (
            old_status != new_status
        )

        if (
            new_status == "APPROVED"
            and (
                status_changed
                or account_created
            )
        ):

            account_text = ""

            if created_account:

                account_text = (
                    f" Your account number is "
                    f"{created_account['account_number']}."
                )

            create_notification(
                cursor=cursor,

                user_id=customer_user_id,

                title="Account Application Approved",

                message=(
                    f"Your account application "
                    f"#{application_id} has been approved."
                    f"{account_text}"
                ),

                notification_type=(
                    "ACCOUNT_APPLICATION"
                )
            )

        elif (
            new_status == "REJECTED"
            and status_changed
        ):

            create_notification(
                cursor=cursor,

                user_id=customer_user_id,

                title="Account Application Rejected",

                message=(
                    f"Your account application "
                    f"#{application_id} has been rejected. "
                    f"Reason: {rejection_reason}"
                ),

                notification_type=(
                    "ACCOUNT_APPLICATION"
                )
            )

        elif (
            new_status == "UNDER_REVIEW"
            and status_changed
        ):

            create_notification(
                cursor=cursor,

                user_id=customer_user_id,

                title="Account Application Under Review",

                message=(
                    f"Your account application "
                    f"#{application_id} is currently "
                    f"under review."
                ),

                notification_type=(
                    "ACCOUNT_APPLICATION"
                )
            )

        # ====================================================
        # 11. APPLICATION AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,

            user_id=officer["user_id"],

            action="ACCOUNT_APPLICATION_UPDATED",

            entity_type="ACCOUNT_APPLICATION",

            entity_id=application_id,

            old_value={
                "status":
                    old_status,

                "reviewed_by":
                    application["reviewed_by"],

                "rejection_reason":
                    application["rejection_reason"]
            },

            new_value={
                "status":
                    new_status,

                "reviewed_by":
                    officer_employee_id,

                "officer_user_id":
                    officer["user_id"],

                "branch_id":
                    officer_branch_id,

                "rejection_reason":
                    rejection_reason,

                "account_created":
                    account_created,

                "account_id":
                    (
                        created_account["account_id"]

                        if created_account

                        else None
                    )
            },

            ip_address=None
        )

        # ====================================================
        # 12. LOAD UPDATED APPLICATION
        # ====================================================

        cursor.execute(
            """
            SELECT *
            FROM account_applications
            WHERE application_id = %s
            """,
            (
                application_id,
            )
        )

        updated_application = cursor.fetchone()

        # ====================================================
        # 13. COMMIT
        # ====================================================

        connection.commit()

        return updated_application

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Account application update failed "
                "because of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Account application update failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()