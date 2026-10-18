from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/loan-types",
    tags=["Loan Types"]
)


# ========================================
# GET ALL LOAN TYPES
# ========================================

@router.get("/")
def get_loan_types():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                loan_type_id,
                type_name,
                interest_rate,
                max_amount,
                max_duration_months
            FROM loan_types
            ORDER BY loan_type_id
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load loan types: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()