from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection

from schemas.loan_application import (
    LoanApplicationCreate,
    LoanApplicationReview,
    ApprovedLoanCreate
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/loan-applications",
    tags=["Loan Applications"]
)


# ============================================================
# HELPER - GET ACTIVE LOAN OFFICER
# ============================================================

def get_active_loan_officer(
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
          AND r.role_name = 'LOAN_OFFICER'

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
            detail="Loan Officer employee record not found"
        )

    if not officer["branch_id"]:

        raise HTTPException(
            status_code=400,
            detail="Loan Officer is not assigned to a branch"
        )

    if officer["status"] != "ACTIVE":

        raise HTTPException(
            status_code=403,
            detail="Loan Officer is not active"
        )

    return officer


# ============================================================
# CREATE LOAN APPLICATION
# ============================================================

@router.post("/")
def create_loan_application(
    data: LoanApplicationCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. VALIDATE CUSTOMER
        # ========================================

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
                data.customer_id,
            )
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

        # ========================================
        # 2. VALIDATE LOAN TYPE
        # ========================================

        cursor.execute(
            """
            SELECT
                loan_type_id
            FROM loan_types
            WHERE loan_type_id = %s
            """,
            (
                data.loan_type_id,
            )
        )

        loan_type = cursor.fetchone()

        if not loan_type:

            raise HTTPException(
                status_code=404,
                detail="Loan type not found"
            )

        # ========================================
        # 3. CREATE APPLICATION
        # ========================================

        cursor.execute(
            """
            INSERT INTO loan_applications
            (
                customer_id,
                loan_type_id,
                requested_amount,
                duration_months,
                purpose,
                monthly_income,
                employment,
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
                'SUBMITTED'
            )
            """,
            (
                data.customer_id,
                data.loan_type_id,
                data.requested_amount,
                data.duration_months,
                data.purpose,
                data.monthly_income,
                data.employment
            )
        )

        loan_application_id = cursor.lastrowid

        # ========================================
        # 4. NOTIFY CUSTOMER
        # ========================================

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="Loan Application Submitted",
            message=(
                f"Your loan application "
                f"#{loan_application_id} for BDT "
                f"{float(data.requested_amount):.2f} "
                f"has been submitted successfully."
            ),
            notification_type="LOAN_APPLICATION"
        )

        # ========================================
        # 5. AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="LOAN_APPLICATION_CREATED",
            entity_type="LOAN_APPLICATION",
            entity_id=loan_application_id,

            old_value=None,

            new_value={
                "customer_id":
                    data.customer_id,

                "branch_id":
                    customer["branch_id"],

                "loan_type_id":
                    data.loan_type_id,

                "requested_amount":
                    float(
                        data.requested_amount
                    ),

                "duration_months":
                    data.duration_months,

                "purpose":
                    data.purpose,

                "monthly_income":
                    float(
                        data.monthly_income
                    ),

                "employment":
                    data.employment,

                "status":
                    "SUBMITTED"
            },

            ip_address=None
        )

        # ========================================
        # 6. LOAD CREATED APPLICATION
        # ========================================

        cursor.execute(
            """
            SELECT *
            FROM loan_applications
            WHERE loan_application_id = %s
            """,
            (
                loan_application_id,
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
            detail="Invalid loan application data"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Loan application creation failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL LOAN APPLICATIONS
#
# ADMIN / SYSTEM-WIDE ENDPOINT
# ============================================================

@router.get("/")
def get_loan_applications():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                la.loan_application_id,
                la.customer_id,
                la.loan_type_id,
                la.assigned_officer_id,
                la.requested_amount,
                la.duration_months,
                la.purpose,
                la.monthly_income,
                la.employment,
                la.status,
                la.submitted_at,
                la.reviewed_at,
                la.rejection_reason

            FROM loan_applications la

            ORDER BY
                la.loan_application_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load loan applications: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET LOAN APPLICATIONS FOR LOGGED-IN LOAN OFFICER'S BRANCH
# ============================================================

@router.get("/officer/{user_id}")
def get_loan_applications_for_officer(
    user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ========================================
        # 1. RESOLVE LOAN OFFICER
        # ========================================

        officer = get_active_loan_officer(
            cursor,
            user_id
        )

        branch_id = officer["branch_id"]

        # ========================================
        # 2. LOAD BRANCH APPLICATIONS
        # ========================================

        cursor.execute(
            """
            SELECT
                la.loan_application_id,
                la.customer_id,
                la.loan_type_id,
                la.assigned_officer_id,
                la.requested_amount,
                la.duration_months,
                la.purpose,
                la.monthly_income,
                la.employment,
                la.status,
                la.submitted_at,
                la.reviewed_at,
                la.rejection_reason,

                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.nid,
                c.branch_id,
                c.status AS customer_status,

                b.branch_name,
                b.branch_code,

                lt.type_name AS loan_type_name,
                lt.interest_rate,
                lt.max_amount,
                lt.max_duration_months,

                CONCAT(
                    assigned.first_name,
                    ' ',
                    assigned.last_name
                ) AS assigned_officer_name

            FROM loan_applications la

            JOIN customers c
                ON c.customer_id = la.customer_id

            JOIN branches b
                ON b.branch_id = c.branch_id

            JOIN loan_types lt
                ON lt.loan_type_id = la.loan_type_id

            LEFT JOIN employees assigned
                ON assigned.employee_id =
                   la.assigned_officer_id

            WHERE c.branch_id = %s

            ORDER BY
                la.loan_application_id DESC
            """,
            (
                branch_id,
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
                "Failed to load branch loan applications: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET SINGLE APPLICATION FOR LOAN OFFICER
# ============================================================

@router.get(
    "/officer/{user_id}/application/{loan_application_id}"
)
def get_loan_application_for_officer(
    user_id: int,
    loan_application_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ========================================
        # 1. RESOLVE OFFICER
        # ========================================

        officer = get_active_loan_officer(
            cursor,
            user_id
        )

        # ========================================
        # 2. LOAD APPLICATION ONLY FROM BRANCH
        # ========================================

        cursor.execute(
            """
            SELECT
                la.*,

                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.nid,
                c.branch_id,

                b.branch_name,
                b.branch_code,

                lt.type_name AS loan_type_name,
                lt.interest_rate

            FROM loan_applications la

            JOIN customers c
                ON c.customer_id = la.customer_id

            JOIN branches b
                ON b.branch_id = c.branch_id

            JOIN loan_types lt
                ON lt.loan_type_id = la.loan_type_id

            WHERE la.loan_application_id = %s
              AND c.branch_id = %s
            """,
            (
                loan_application_id,
                officer["branch_id"]
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Loan application not found "
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
                "Failed to load loan application: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET LOAN APPLICATION BY ID
#
# GENERAL / ADMIN ENDPOINT
# ============================================================

@router.get("/{loan_application_id}")
def get_loan_application(
    loan_application_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM loan_applications
            WHERE loan_application_id = %s
            """,
            (
                loan_application_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail="Loan application not found"
            )

        return application

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load loan application: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# REVIEW LOAN APPLICATION
#
# officer_user_id = logged-in users.user_id
#
# Example:
#
# PUT /loan-applications/5/review?officer_user_id=10
# ============================================================

@router.put("/{loan_application_id}/review")
def review_loan_application(
    loan_application_id: int,
    data: LoanApplicationReview,
    officer_user_id: int
):

    allowed_statuses = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED"
    ]

    status = data.status.upper()

    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail="Invalid loan application status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. RESOLVE LOGGED-IN LOAN OFFICER
        # ========================================

        officer = get_active_loan_officer(
            cursor,
            officer_user_id
        )

        officer_employee_id = (
            officer["employee_id"]
        )

        officer_branch_id = (
            officer["branch_id"]
        )

        # ========================================
        # 2. LOCK APPLICATION
        # ========================================

        cursor.execute(
            """
            SELECT *
            FROM loan_applications
            WHERE loan_application_id = %s
            FOR UPDATE
            """,
            (
                loan_application_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail="Loan application not found"
            )

        old_status = application["status"]

        # ========================================
        # 3. LOAD CUSTOMER + VERIFY BRANCH
        # ========================================

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

        # ----------------------------------------
        # BRANCH ACCESS CONTROL
        # ----------------------------------------

        if (
            int(customer["branch_id"])
            !=
            int(officer_branch_id)
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot review a loan application "
                    "from another branch"
                )
            )

        # ========================================
        # 4. ASSIGN LOGGED-IN OFFICER
        #
        # DO NOT TRUST assigned_officer_id
        # FROM THE FRONTEND.
        # ========================================

        assigned_officer_id = (
            officer_employee_id
        )

        # ========================================
        # 5. REJECTION REASON RULE
        # ========================================

        if (
            status == "REJECTED"
            and not data.rejection_reason
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Rejection reason is required "
                    "when rejecting a loan application"
                )
            )

        rejection_reason = (
            data.rejection_reason
            if status == "REJECTED"
            else None
        )

        # ========================================
        # 6. UPDATE APPLICATION
        # ========================================

        if status in (
            "APPROVED",
            "REJECTED"
        ):

            cursor.execute(
                """
                UPDATE loan_applications
                SET
                    status = %s,
                    assigned_officer_id = %s,
                    reviewed_at = NOW(),
                    rejection_reason = %s
                WHERE loan_application_id = %s
                """,
                (
                    status,
                    assigned_officer_id,
                    rejection_reason,
                    loan_application_id
                )
            )

        else:

            cursor.execute(
                """
                UPDATE loan_applications
                SET
                    status = %s,
                    assigned_officer_id = %s,
                    reviewed_at = NULL,
                    rejection_reason = NULL
                WHERE loan_application_id = %s
                """,
                (
                    status,
                    assigned_officer_id,
                    loan_application_id
                )
            )

        # ========================================
        # 7. CUSTOMER USER
        # ========================================

        customer_user_id = (
            customer["user_id"]
        )

        # ========================================
        # 8. CUSTOMER NOTIFICATION
        # ========================================

        if status == "UNDER_REVIEW":

            title = (
                "Loan Application Under Review"
            )

            message = (
                f"Your loan application "
                f"#{loan_application_id} "
                f"is now under review."
            )

        elif status == "APPROVED":

            title = (
                "Loan Application Approved"
            )

            message = (
                f"Your loan application "
                f"#{loan_application_id} "
                f"has been approved."
            )

        elif status == "REJECTED":

            title = (
                "Loan Application Rejected"
            )

            message = (
                f"Your loan application "
                f"#{loan_application_id} "
                f"has been rejected. "
                f"Reason: {rejection_reason}"
            )

        else:

            title = (
                "Loan Application Updated"
            )

            message = (
                f"Your loan application "
                f"#{loan_application_id} "
                f"status is now {status}."
            )

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title=title,
            message=message,
            notification_type="LOAN_APPLICATION"
        )

        # ========================================
        # 9. AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,

            user_id=officer["user_id"],

            action="LOAN_APPLICATION_UPDATED",

            entity_type="LOAN_APPLICATION",

            entity_id=loan_application_id,

            old_value={
                "status":
                    old_status,

                "assigned_officer_id":
                    application[
                        "assigned_officer_id"
                    ],

                "reviewed_at":
                    (
                        str(
                            application[
                                "reviewed_at"
                            ]
                        )
                        if application[
                            "reviewed_at"
                        ]
                        else None
                    ),

                "rejection_reason":
                    application[
                        "rejection_reason"
                    ]
            },

            new_value={
                "status":
                    status,

                "assigned_officer_id":
                    assigned_officer_id,

                "officer_user_id":
                    officer["user_id"],

                "branch_id":
                    officer_branch_id,

                "rejection_reason":
                    rejection_reason
            },

            ip_address=None
        )

        # ========================================
        # 10. LOAD UPDATED APPLICATION
        # ========================================

        cursor.execute(
            """
            SELECT *
            FROM loan_applications
            WHERE loan_application_id = %s
            """,
            (
                loan_application_id,
            )
        )

        updated_application = (
            cursor.fetchone()
        )

        # ========================================
        # 11. COMMIT
        # ========================================

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
                "Loan application update failed "
                "because of a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Loan application review failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CREATE LOAN FROM APPROVED APPLICATION
#
# officer_user_id = logged-in users.user_id
#
# Example:
#
# POST /loan-applications/5/create-loan?officer_user_id=10
# ============================================================

@router.post("/{loan_application_id}/create-loan")
def create_loan_from_application(
    loan_application_id: int,
    data: ApprovedLoanCreate,
    officer_user_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ========================================
        # 1. RESOLVE LOGGED-IN LOAN OFFICER
        # ========================================

        officer = get_active_loan_officer(
            cursor,
            officer_user_id
        )

        # ========================================
        # 2. LOCK LOAN APPLICATION
        # ========================================

        cursor.execute(
            """
            SELECT
                loan_application_id,
                customer_id,
                loan_type_id,
                assigned_officer_id,
                requested_amount,
                duration_months,
                status
            FROM loan_applications
            WHERE loan_application_id = %s
            FOR UPDATE
            """,
            (
                loan_application_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            raise HTTPException(
                status_code=404,
                detail="Loan application not found"
            )

        # ========================================
        # 3. VERIFY CUSTOMER + BRANCH
        # ========================================

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
            int(customer["branch_id"])
            !=
            int(officer["branch_id"])
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot create a loan for "
                    "a customer from another branch"
                )
            )

        # ========================================
        # 4. APPLICATION MUST BE APPROVED
        # ========================================

        if application["status"] != "APPROVED":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Only approved loan applications "
                    "can be converted into loans"
                )
            )

        # ========================================
        # 5. PREVENT DUPLICATE LOAN
        # ========================================

        cursor.execute(
            """
            SELECT
                loan_id
            FROM loans
            WHERE loan_application_id = %s
            """,
            (
                loan_application_id,
            )
        )

        existing_loan = cursor.fetchone()

        if existing_loan:

            raise HTTPException(
                status_code=400,
                detail=(
                    "A loan has already been created "
                    "for this application"
                )
            )

        # ========================================
        # 6. GET LOAN TYPE RULES
        # ========================================

        cursor.execute(
            """
            SELECT
                loan_type_id,
                type_name,
                interest_rate,
                max_amount,
                max_duration_months
            FROM loan_types
            WHERE loan_type_id = %s
            """,
            (
                application[
                    "loan_type_id"
                ],
            )
        )

        loan_type = cursor.fetchone()

        if not loan_type:

            raise HTTPException(
                status_code=404,
                detail="Loan type not found"
            )

        requested_amount = float(
            application[
                "requested_amount"
            ]
        )

        interest_rate = float(
            loan_type[
                "interest_rate"
            ]
        )

        duration_months = int(
            application[
                "duration_months"
            ]
        )

        # ========================================
        # 7. VALIDATE LOAN TYPE LIMITS
        # ========================================

        if requested_amount > float(
            loan_type["max_amount"]
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Requested amount exceeds maximum "
                    f"allowed amount of "
                    f"{float(loan_type['max_amount']):.2f}"
                )
            )

        if duration_months > int(
            loan_type[
                "max_duration_months"
            ]
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Requested duration exceeds maximum "
                    f"allowed duration of "
                    f"{loan_type['max_duration_months']} "
                    f"months"
                )
            )

        # ========================================
        # 8. VALIDATE DISBURSEMENT ACCOUNT
        # ========================================

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                branch_id,
                account_number,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (
                data.disbursement_account_id,
            )
        )

        account = cursor.fetchone()

        if not account:

            raise HTTPException(
                status_code=404,
                detail="Disbursement account not found"
            )

        if (
            account["customer_id"]
            !=
            application["customer_id"]
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Disbursement account does not "
                    "belong to the loan customer"
                )
            )

        # ----------------------------------------
        # ACCOUNT MUST ALSO BELONG TO SAME BRANCH
        # ----------------------------------------

        if (
            int(account["branch_id"])
            !=
            int(officer["branch_id"])
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Disbursement account does not "
                    "belong to your assigned branch"
                )
            )

        if account["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Disbursement account is not active"
                )
            )

        # ========================================
        # 9. CALCULATE MONTHLY EMI
        # ========================================

        monthly_rate = (
            interest_rate
            / 100
            / 12
        )

        if monthly_rate == 0:

            monthly_emi = (
                requested_amount
                /
                duration_months
            )

        else:

            monthly_emi = (
                requested_amount
                *
                monthly_rate
                *
                (
                    (1 + monthly_rate)
                    ** duration_months
                )
                /
                (
                    (
                        (1 + monthly_rate)
                        ** duration_months
                    )
                    - 1
                )
            )

        monthly_emi = round(
            monthly_emi,
            2
        )

        # ========================================
        # 10. CREATE LOAN
        # ========================================

        cursor.execute(
            """
            INSERT INTO loans
            (
                loan_application_id,
                customer_id,
                loan_type_id,
                disbursement_account_id,
                principal_amount,
                outstanding_amount,
                interest_rate,
                duration_months,
                monthly_emi,
                disbursement_date,
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
                NULL,
                'APPROVED'
            )
            """,
            (
                loan_application_id,
                application[
                    "customer_id"
                ],
                application[
                    "loan_type_id"
                ],
                data.disbursement_account_id,
                requested_amount,
                requested_amount,
                interest_rate,
                duration_months,
                monthly_emi
            )
        )

        loan_id = cursor.lastrowid

        # ========================================
        # 11. CUSTOMER USER
        # ========================================

        customer_user_id = (
            customer["user_id"]
        )

        # ========================================
        # 12. CUSTOMER NOTIFICATION
        # ========================================

        create_notification(
            cursor=cursor,

            user_id=customer_user_id,

            title="Loan Created",

            message=(
                f"Your approved "
                f"{loan_type['type_name']} "
                f"loan of BDT "
                f"{requested_amount:.2f} "
                f"has been created successfully. "
                f"Monthly EMI: BDT "
                f"{monthly_emi:.2f}. "
                f"The loan is awaiting disbursement."
            ),

            notification_type="LOAN"
        )

        # ========================================
        # 13. AUDIT LOG
        # ========================================

        create_audit_log(
            cursor=cursor,

            user_id=officer["user_id"],

            action="LOAN_CREATED",

            entity_type="LOAN",

            entity_id=loan_id,

            old_value=None,

            new_value={
                "loan_application_id":
                    loan_application_id,

                "customer_id":
                    application[
                        "customer_id"
                    ],

                "branch_id":
                    officer[
                        "branch_id"
                    ],

                "loan_type_id":
                    application[
                        "loan_type_id"
                    ],

                "loan_type":
                    loan_type[
                        "type_name"
                    ],

                "disbursement_account_id":
                    data.disbursement_account_id,

                "principal_amount":
                    requested_amount,

                "outstanding_amount":
                    requested_amount,

                "interest_rate":
                    interest_rate,

                "duration_months":
                    duration_months,

                "monthly_emi":
                    monthly_emi,

                "created_by_employee_id":
                    officer[
                        "employee_id"
                    ],

                "status":
                    "APPROVED"
            },

            ip_address=None
        )

        # ========================================
        # 14. LOAD CREATED LOAN
        # ========================================

        cursor.execute(
            """
            SELECT *
            FROM loans
            WHERE loan_id = %s
            """,
            (
                loan_id,
            )
        )

        loan = cursor.fetchone()

        # ========================================
        # 15. COMMIT
        # ========================================

        connection.commit()

        return {
            "message":
                "Loan created successfully",

            "loan":
                loan,

            "next_step":
                (
                    "Loan can now be disbursed using "
                    "/loan-transactions/disburse"
                )
        }

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Loan creation failed because of "
                "a database constraint"
            )
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Loan creation failed: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()