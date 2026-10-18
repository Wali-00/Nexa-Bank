from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)


# ========================================
# GET ALL DEPARTMENTS
# ========================================

@router.get("/")
def get_departments():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                department_id,
                department_name,
                description
            FROM departments
            ORDER BY department_id
            """
        )

        departments = cursor.fetchall()

        return departments

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load departments: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()