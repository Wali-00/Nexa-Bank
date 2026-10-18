from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/loans",
    tags=["Loans"]
)


# ============================================================
# GET ALL LOANS
# ============================================================

@router.get("/")
def get_loans():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.loan_application_id,
                l.customer_id,
                l.loan_type_id,
                lt.type_name AS loan_type_name,
                l.disbursement_account_id,
                a.account_number AS disbursement_account_number,
                l.principal_amount,
                l.outstanding_amount,
                l.interest_rate,
                l.duration_months,
                l.monthly_emi,
                l.disbursement_date,
                l.status
            FROM loans l

            LEFT JOIN loan_types lt
                ON l.loan_type_id = lt.loan_type_id

            LEFT JOIN accounts a
                ON l.disbursement_account_id = a.account_id

            ORDER BY l.loan_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load loans: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET LOAN BY ID
# ============================================================

@router.get("/{loan_id}")
def get_loan_by_id(
    loan_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.loan_application_id,
                l.customer_id,
                l.loan_type_id,
                lt.type_name AS loan_type_name,
                l.disbursement_account_id,
                a.account_number AS disbursement_account_number,
                l.principal_amount,
                l.outstanding_amount,
                l.interest_rate,
                l.duration_months,
                l.monthly_emi,
                l.disbursement_date,
                l.status
            FROM loans l

            LEFT JOIN loan_types lt
                ON l.loan_type_id = lt.loan_type_id

            LEFT JOIN accounts a
                ON l.disbursement_account_id = a.account_id

            WHERE l.loan_id = %s
            """,
            (
                loan_id,
            )
        )

        loan = cursor.fetchone()

        if not loan:

            raise HTTPException(
                status_code=404,
                detail="Loan not found"
            )

        return loan

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load loan: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()