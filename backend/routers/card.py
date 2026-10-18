from fastapi import APIRouter, HTTPException

from raw_database import get_connection


router = APIRouter(
    prefix="/cards",
    tags=["Cards"]
)


@router.get("/")
def get_cards():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                card_id,
                account_id,
                customer_id,
                card_type,
                expiry_date,
                status,
                issued_date
            FROM cards
            ORDER BY card_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load cards: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


@router.get("/{card_id}")
def get_card(card_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                card_id,
                account_id,
                customer_id,
                card_type,
                expiry_date,
                status,
                issued_date
            FROM cards
            WHERE card_id = %s
            """,
            (card_id,)
        )

        card = cursor.fetchone()

        if not card:

            raise HTTPException(
                status_code=404,
                detail="Card not found"
            )

        return card

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load card: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()