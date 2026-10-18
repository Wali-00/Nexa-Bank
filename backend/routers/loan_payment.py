from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/loan-payments",
    tags=["Loan Payments"]
)


# ============================================================
# GET ALL LOAN INSTALLMENTS
# ============================================================

@router.get("/")
def get_loan_payments():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                lp.loan_payment_id,
                lp.loan_id,
                lp.installment_no,
                lp.due_date,
                lp.amount_due,
                lp.amount_paid,
                lp.late_fee,
                lp.payment_date,
                lp.status,
                lp.transaction_id
            FROM loan_payments lp
            ORDER BY
                lp.loan_id DESC,
                lp.installment_no ASC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load loan installments: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET INSTALLMENTS FOR ONE LOAN
# ============================================================

@router.get("/loan/{loan_id}")
def get_loan_payments_by_loan(
    loan_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                lp.loan_payment_id,
                lp.loan_id,
                lp.installment_no,
                lp.due_date,
                lp.amount_due,
                lp.amount_paid,
                lp.late_fee,
                lp.payment_date,
                lp.status,
                lp.transaction_id
            FROM loan_payments lp
            WHERE lp.loan_id = %s
            ORDER BY lp.installment_no ASC
            """,
            (
                loan_id,
            )
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load loan installments: "
                f"{str(e)}"
            )
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET CUSTOMER LOAN INSTALLMENTS
# ============================================================

@router.get(
    "/customer/{customer_id}/loan/{loan_id}"
)
def get_customer_loan_payments(
    customer_id: int,
    loan_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # ====================================================
        # 1. VERIFY CUSTOMER EXISTS
        # ====================================================

        cursor.execute(
            """
            SELECT
                customer_id,
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (
                customer_id,
            )
        )

        customer = cursor.fetchone()


        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )


        # ====================================================
        # 2. VERIFY LOAN BELONGS TO CUSTOMER
        # ====================================================

        cursor.execute(
            """
            SELECT
                loan_id,
                customer_id,
                status
            FROM loans
            WHERE loan_id = %s
              AND customer_id = %s
            """,
            (
                loan_id,
                customer_id
            )
        )

        loan = cursor.fetchone()


        if not loan:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Loan not found for this customer"
                )
            )


        # ====================================================
        # 3. LOAD INSTALLMENTS
        # ====================================================

        cursor.execute(
            """
            SELECT
                lp.loan_payment_id,
                lp.loan_id,
                lp.installment_no,
                lp.due_date,
                lp.amount_due,
                lp.amount_paid,
                lp.late_fee,
                lp.payment_date,
                lp.status,
                lp.transaction_id
            FROM loan_payments lp
            WHERE lp.loan_id = %s
            ORDER BY
                lp.installment_no ASC
            """,
            (
                loan_id,
            )
        )

        installments = cursor.fetchall()


        return {
            "loan_id":
                loan_id,

            "customer_id":
                customer_id,

            "loan_status":
                loan["status"],

            "installments":
                installments
        }


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load customer "
                f"loan installments: {str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()