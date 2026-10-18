from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/billers",
    tags=["Billers"]
)


# ========================================
# GET ALL BILLERS
# ========================================

@router.get("/")
def get_billers():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                biller_id,
                biller_name,
                category,
                status
            FROM billers
            ORDER BY biller_name
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load billers: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ========================================
# GET BILLER BY ID
# ========================================

@router.get("/{biller_id}")
def get_biller(
    biller_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                biller_id,
                biller_name,
                category,
                status
            FROM billers
            WHERE biller_id = %s
            """,
            (biller_id,)
        )

        biller = cursor.fetchone()

        if not biller:

            raise HTTPException(
                status_code=404,
                detail="Biller not found"
            )

        return biller

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load biller: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()