from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/positions",
    tags=["Positions"]
)


# ========================================
# GET ALL POSITIONS
# ========================================

@router.get("/")
def get_positions():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                position_id,
                position_name,
                department_id,
                description
            FROM positions
            ORDER BY position_id
            """
        )

        positions = cursor.fetchall()

        return positions

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load positions: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()