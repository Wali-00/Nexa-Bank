from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError

from raw_database import get_connection

from schemas.beneficiary import (
    BeneficiaryCreate,
    BeneficiaryUpdate,
    BeneficiaryResponse
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/beneficiaries",
    tags=["Beneficiaries"]
)


# ============================================================
# CREATE BENEFICIARY
# ============================================================

@router.post(
    "/",
    response_model=BeneficiaryResponse
)
def create_beneficiary(
    beneficiary_data: BeneficiaryCreate
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
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (beneficiary_data.customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # Preserve customer relationship safely
        if customer["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail="Customer is not active"
            )

        # ----------------------------------------------------
        # 2. Create beneficiary
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO beneficiaries
            (
                customer_id,
                beneficiary_name,
                bank_name,
                account_number,
                nickname
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                beneficiary_data.customer_id,
                beneficiary_data.beneficiary_name,
                beneficiary_data.bank_name,
                beneficiary_data.account_number,
                beneficiary_data.nickname
            )
        )

        beneficiary_id = cursor.lastrowid

        # ----------------------------------------------------
        # 3. Create notification
        # ----------------------------------------------------

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="Beneficiary Added",
            message=(
                f"{beneficiary_data.beneficiary_name} "
                f"has been added to your beneficiary list."
            ),
            notification_type="BENEFICIARY"
        )

        # ----------------------------------------------------
        # 4. Create audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="BENEFICIARY_CREATED",
            entity_type="BENEFICIARY",
            entity_id=beneficiary_id,

            old_value=None,

            new_value={
                "customer_id":
                    beneficiary_data.customer_id,

                "beneficiary_name":
                    beneficiary_data.beneficiary_name,

                "bank_name":
                    beneficiary_data.bank_name,

                "account_number":
                    beneficiary_data.account_number,

                "nickname":
                    beneficiary_data.nickname
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 5. Load created beneficiary
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM beneficiaries
            WHERE beneficiary_id = %s
            """,
            (beneficiary_id,)
        )

        beneficiary = cursor.fetchone()

        # ----------------------------------------------------
        # 6. Commit
        # ----------------------------------------------------

        connection.commit()

        return beneficiary

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid customer or beneficiary information"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Beneficiary creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL BENEFICIARIES
# ============================================================

@router.get(
    "/",
    response_model=list[BeneficiaryResponse]
)
def get_beneficiaries():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM beneficiaries
            ORDER BY beneficiary_id DESC
            """
        )

        beneficiaries = cursor.fetchall()

        return beneficiaries

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load beneficiaries: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET BENEFICIARY BY ID
# ============================================================

@router.get(
    "/{beneficiary_id}",
    response_model=BeneficiaryResponse
)
def get_beneficiary(
    beneficiary_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM beneficiaries
            WHERE beneficiary_id = %s
            """,
            (beneficiary_id,)
        )

        beneficiary = cursor.fetchone()

        if not beneficiary:

            raise HTTPException(
                status_code=404,
                detail="Beneficiary not found"
            )

        return beneficiary

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load beneficiary: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE BENEFICIARY
# ============================================================

@router.put(
    "/{beneficiary_id}",
    response_model=BeneficiaryResponse
)
def update_beneficiary(
    beneficiary_id: int,
    beneficiary_data: BeneficiaryUpdate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # ----------------------------------------------------
        # 1. Lock beneficiary
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM beneficiaries
            WHERE beneficiary_id = %s
            FOR UPDATE
            """,
            (beneficiary_id,)
        )

        beneficiary = cursor.fetchone()

        if not beneficiary:

            raise HTTPException(
                status_code=404,
                detail="Beneficiary not found"
            )

        # ----------------------------------------------------
        # 2. Get linked customer/user
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (beneficiary["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        # ----------------------------------------------------
        # 3. Save previous values
        # ----------------------------------------------------

        old_value = {
            "beneficiary_name":
                beneficiary["beneficiary_name"],

            "bank_name":
                beneficiary["bank_name"],

            "account_number":
                beneficiary["account_number"],

            "nickname":
                beneficiary["nickname"],

            "status":
                beneficiary["status"]
        }

        # ----------------------------------------------------
        # 4. Update beneficiary
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE beneficiaries
            SET
                beneficiary_name = %s,
                bank_name = %s,
                account_number = %s,
                nickname = %s,
                status = %s
            WHERE beneficiary_id = %s
            """,
            (
                beneficiary_data.beneficiary_name,
                beneficiary_data.bank_name,
                beneficiary_data.account_number,
                beneficiary_data.nickname,
                beneficiary_data.status,
                beneficiary_id
            )
        )

        # ----------------------------------------------------
        # 5. Create notification
        # ----------------------------------------------------

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Beneficiary Updated",
            message=(
                f"Your beneficiary "
                f"{beneficiary_data.beneficiary_name} "
                f"has been updated successfully."
            ),
            notification_type="BENEFICIARY"
        )

        # ----------------------------------------------------
        # 6. Create audit log
        # ----------------------------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=customer_user_id,
            action="BENEFICIARY_UPDATED",
            entity_type="BENEFICIARY",
            entity_id=beneficiary_id,

            old_value=old_value,

            new_value={
                "beneficiary_name":
                    beneficiary_data.beneficiary_name,

                "bank_name":
                    beneficiary_data.bank_name,

                "account_number":
                    beneficiary_data.account_number,

                "nickname":
                    beneficiary_data.nickname,

                "status":
                    beneficiary_data.status
            },

            ip_address=None
        )

        # ----------------------------------------------------
        # 7. Load updated beneficiary
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM beneficiaries
            WHERE beneficiary_id = %s
            """,
            (beneficiary_id,)
        )

        updated_beneficiary = cursor.fetchone()

        # ----------------------------------------------------
        # 8. Commit
        # ----------------------------------------------------

        connection.commit()

        return updated_beneficiary

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to update beneficiary information"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Beneficiary update failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()