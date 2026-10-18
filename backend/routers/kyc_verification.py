from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pymysql import IntegrityError
from pathlib import Path
import uuid
import shutil

from raw_database import get_connection

from schemas.kyc_verification import (
    KYCVerificationCreate,
    KYCVerificationReview
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/kyc-verifications",
    tags=["KYC Verifications"]
)


# ============================================================
# CREATE KYC RECORD
# ============================================================

@router.post("/")
def create_kyc_verification(
    data: KYCVerificationCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # --------------------------------
        # 1. Validate customer
        # --------------------------------

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (data.customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # --------------------------------
        # 2. Validate application if given
        # --------------------------------

        if data.application_id is not None:

            cursor.execute(
                """
                SELECT
                    application_id,
                    customer_id,
                    status
                FROM account_applications
                WHERE application_id = %s
                """,
                (data.application_id,)
            )

            application = cursor.fetchone()

            if not application:

                raise HTTPException(
                    status_code=404,
                    detail="Account application not found"
                )

            if (
                application["customer_id"]
                != data.customer_id
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Account application does not "
                        "belong to this customer"
                    )
                )

        # --------------------------------
        # 3. Create KYC record
        # --------------------------------

        cursor.execute(
            """
            INSERT INTO kyc_verifications
            (
                customer_id,
                application_id,
                nid_document,
                photo_document,
                address_document,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                'PENDING'
            )
            """,
            (
                data.customer_id,
                data.application_id,
                data.nid_document,
                data.photo_document,
                data.address_document
            )
        )

        kyc_id = cursor.lastrowid

        # --------------------------------
        # 4. Notification
        # --------------------------------

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="KYC Submitted",
            message=(
                "Your KYC information has been submitted "
                "and is waiting for verification."
            ),
            notification_type="KYC"
        )

        # --------------------------------
        # 5. Audit log
        # --------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="KYC_CREATED",
            entity_type="KYC_VERIFICATION",
            entity_id=kyc_id,

            old_value=None,

            new_value={
                "customer_id":
                    data.customer_id,

                "application_id":
                    data.application_id,

                "status":
                    "PENDING"
            },

            ip_address=None
        )

        # --------------------------------
        # 6. Load created record
        # --------------------------------

        cursor.execute(
            """
            SELECT *
            FROM kyc_verifications
            WHERE kyc_id = %s
            """,
            (kyc_id,)
        )

        kyc = cursor.fetchone()

        connection.commit()

        return kyc

    except HTTPException:

        connection.rollback()
        raise

    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid KYC relationship data"
        )

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"KYC creation failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ALL KYC RECORDS
# ============================================================

@router.get("/")
def get_kyc_verifications():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT
                k.kyc_id,
                k.customer_id,
                k.application_id,
                k.verified_by,
                k.nid_document,
                k.photo_document,
                k.address_document,
                k.status,
                k.verified_at,
                k.remarks
            FROM kyc_verifications k
            ORDER BY k.kyc_id DESC
            """
        )

        return cursor.fetchall()

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load KYC records: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET KYC BY ID
# ============================================================

@router.get("/{kyc_id}")
def get_kyc_verification(
    kyc_id: int
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT *
            FROM kyc_verifications
            WHERE kyc_id = %s
            """,
            (kyc_id,)
        )

        kyc = cursor.fetchone()

        if not kyc:

            raise HTTPException(
                status_code=404,
                detail="KYC verification not found"
            )

        return kyc

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load KYC verification: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# REVIEW KYC
# ============================================================

@router.put("/{kyc_id}/review")
def review_kyc_verification(
    kyc_id: int,
    data: KYCVerificationReview
):

    allowed_statuses = [
        "PENDING",
        "VERIFIED",
        "REJECTED",
        "DOCUMENT_REQUIRED"
    ]

    status = data.status.upper()

    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail="Invalid KYC status"
        )

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()

        # --------------------------------
        # 1. Lock KYC
        # --------------------------------

        cursor.execute(
            """
            SELECT
                kyc_id,
                customer_id,
                application_id,
                verified_by,
                status,
                remarks
            FROM kyc_verifications
            WHERE kyc_id = %s
            FOR UPDATE
            """,
            (kyc_id,)
        )

        kyc = cursor.fetchone()

        if not kyc:

            raise HTTPException(
                status_code=404,
                detail="KYC verification not found"
            )

        old_status = kyc["status"]

        # --------------------------------
        # 2. Validate verifier if provided
        # --------------------------------

        if data.verified_by is not None:

            cursor.execute(
                """
                SELECT
                    employee_id,
                    status
                FROM employees
                WHERE employee_id = %s
                """,
                (data.verified_by,)
            )

            employee = cursor.fetchone()

            if not employee:

                raise HTTPException(
                    status_code=404,
                    detail="Verifier employee not found"
                )

        # --------------------------------
        # 3. Update KYC
        # --------------------------------

        verified_at_sql = (
            "NOW()"
            if status in (
                "VERIFIED",
                "REJECTED"
            )
            else "NULL"
        )

        cursor.execute(
            f"""
            UPDATE kyc_verifications
            SET
                status = %s,
                verified_by = %s,
                verified_at = {verified_at_sql},
                remarks = %s
            WHERE kyc_id = %s
            """,
            (
                status,
                data.verified_by,
                data.remarks,
                kyc_id
            )
        )

        # --------------------------------
        # 4. Get customer user
        # --------------------------------

        cursor.execute(
            """
            SELECT user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (kyc["customer_id"],)
        )

        customer = cursor.fetchone()

        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )

        # --------------------------------
        # 5. Notification
        # --------------------------------

        notification_map = {

            "VERIFIED": (
                "KYC Verified",
                "Your KYC verification has been completed successfully."
            ),

            "REJECTED": (
                "KYC Rejected",
                (
                    "Your KYC verification has been rejected."
                    + (
                        f" Remarks: {data.remarks}"
                        if data.remarks
                        else ""
                    )
                )
            ),

            "DOCUMENT_REQUIRED": (
                "Additional Documents Required",
                (
                    "Additional documents are required "
                    "to complete your KYC verification."
                    + (
                        f" Remarks: {data.remarks}"
                        if data.remarks
                        else ""
                    )
                )
            ),

            "PENDING": (
                "KYC Under Review",
                "Your KYC verification is currently pending."
            )
        }

        title, message = notification_map[status]

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title=title,
            message=message,
            notification_type="KYC"
        )

        # --------------------------------
        # 6. Audit log
        # --------------------------------

        create_audit_log(
            cursor=cursor,
            user_id=None,
            action="KYC_STATUS_UPDATED",
            entity_type="KYC_VERIFICATION",
            entity_id=kyc_id,

            old_value={
                "status":
                    old_status,

                "verified_by":
                    kyc["verified_by"],

                "remarks":
                    kyc["remarks"]
            },

            new_value={
                "status":
                    status,

                "verified_by":
                    data.verified_by,

                "remarks":
                    data.remarks
            },

            ip_address=None
        )

        # --------------------------------
        # 7. Reload
        # --------------------------------

        cursor.execute(
            """
            SELECT *
            FROM kyc_verifications
            WHERE kyc_id = %s
            """,
            (kyc_id,)
        )

        updated_kyc = cursor.fetchone()

        connection.commit()

        return updated_kyc

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"KYC review failed: {str(e)}"
        )

    finally:

        cursor.close()
        connection.close()
        
# ============================================================
# SUBMIT KYC WITH FILE UPLOADS
# ============================================================

@router.post("/submit-files")
def submit_kyc_files(
    customer_id: int = Form(...),
    application_id: int = Form(...),
    nid_document: UploadFile = File(...),
    photo_document: UploadFile = File(...),
    address_document: UploadFile = File(...)
):

    connection = get_connection()
    cursor = connection.cursor()

    saved_files = []

    try:

        connection.begin()


        # ====================================================
        # 1. VERIFY CUSTOMER
        # ====================================================

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                status
            FROM customers
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()


        if not customer:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )


        # ====================================================
        # 2. VERIFY APPLICATION
        # ====================================================

        cursor.execute(
            """
            SELECT
                application_id,
                customer_id,
                status
            FROM account_applications
            WHERE application_id = %s
            """,
            (application_id,)
        )

        application = cursor.fetchone()


        if not application:

            raise HTTPException(
                status_code=404,
                detail="Account application not found"
            )


        if (
            int(application["customer_id"])
            !=
            int(customer_id)
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Account application does not "
                    "belong to this customer"
                )
            )


        # ====================================================
        # 3. OPTIONAL DUPLICATE CHECK
        # ====================================================

        cursor.execute(
            """
            SELECT
                kyc_id,
                status
            FROM kyc_verifications
            WHERE customer_id = %s
              AND application_id = %s
            ORDER BY kyc_id DESC
            LIMIT 1
            """,
            (
                customer_id,
                application_id
            )
        )

        existing_kyc = cursor.fetchone()


        if (
            existing_kyc
            and
            existing_kyc["status"]
            in (
                "PENDING",
                "VERIFIED"
            )
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "A KYC submission already exists "
                    "for this application"
                )
            )


        # ====================================================
        # 4. VALIDATE EXTENSIONS
        # ====================================================

        allowed_documents = {
            ".jpg",
            ".jpeg",
            ".png",
            ".pdf"
        }


        allowed_photos = {
            ".jpg",
            ".jpeg",
            ".png"
        }


        def get_extension(
            uploaded_file: UploadFile
        ):

            filename = (
                uploaded_file.filename
                or
                ""
            )

            return Path(
                filename
            ).suffix.lower()


        nid_extension = get_extension(
            nid_document
        )


        photo_extension = get_extension(
            photo_document
        )


        address_extension = get_extension(
            address_document
        )


        if (
            nid_extension
            not in
            allowed_documents
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "NID document must be "
                    "JPG, JPEG, PNG or PDF"
                )
            )


        if (
            photo_extension
            not in
            allowed_photos
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Customer photo must be "
                    "JPG, JPEG or PNG"
                )
            )


        if (
            address_extension
            not in
            allowed_documents
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Address document must be "
                    "JPG, JPEG, PNG or PDF"
                )
            )


        # ====================================================
        # 5. CREATE UPLOAD DIRECTORY
        # ====================================================

        upload_directory = (
            Path("uploads")
            /
            "kyc"
            /
            str(customer_id)
            /
            str(application_id)
        )


        upload_directory.mkdir(
            parents=True,
            exist_ok=True
        )


        # ====================================================
        # 6. SAVE FILE HELPER
        # ====================================================

        def save_uploaded_file(
            uploaded_file: UploadFile,
            prefix: str
        ):

            extension = get_extension(
                uploaded_file
            )


            filename = (
                f"{prefix}_"
                f"{uuid.uuid4().hex}"
                f"{extension}"
            )


            file_path = (
                upload_directory
                /
                filename
            )


            with open(
                file_path,
                "wb"
            ) as buffer:

                shutil.copyfileobj(
                    uploaded_file.file,
                    buffer
                )


            saved_files.append(
                file_path
            )


            return (
                str(file_path)
                .replace(
                    "\\",
                    "/"
                )
            )


        # ====================================================
        # 7. SAVE FILES
        # ====================================================

        nid_path = save_uploaded_file(
            nid_document,
            "nid"
        )


        photo_path = save_uploaded_file(
            photo_document,
            "photo"
        )


        address_path = save_uploaded_file(
            address_document,
            "address"
        )


        # ====================================================
        # 8. INSERT KYC
        # ====================================================

        cursor.execute(
            """
            INSERT INTO kyc_verifications
            (
                customer_id,
                application_id,
                nid_document,
                photo_document,
                address_document,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                'PENDING'
            )
            """,
            (
                customer_id,
                application_id,
                nid_path,
                photo_path,
                address_path
            )
        )


        kyc_id = cursor.lastrowid


        # ====================================================
        # 9. NOTIFICATION
        # ====================================================

        create_notification(
            cursor=cursor,
            user_id=customer["user_id"],
            title="KYC Submitted",
            message=(
                "Your KYC documents have been submitted "
                "and are waiting for verification."
            ),
            notification_type="KYC"
        )


        # ====================================================
        # 10. AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,
            user_id=customer["user_id"],
            action="KYC_FILES_SUBMITTED",
            entity_type="KYC_VERIFICATION",
            entity_id=kyc_id,
            old_value=None,
            new_value={
                "customer_id":
                    customer_id,

                "application_id":
                    application_id,

                "status":
                    "PENDING"
            },
            ip_address=None
        )


        # ====================================================
        # 11. LOAD CREATED KYC
        # ====================================================

        cursor.execute(
            """
            SELECT *
            FROM kyc_verifications
            WHERE kyc_id = %s
            """,
            (kyc_id,)
        )


        created_kyc = cursor.fetchone()


        connection.commit()


        return created_kyc


    except HTTPException:

        connection.rollback()


        for file_path in saved_files:

            try:

                if file_path.exists():

                    file_path.unlink()

            except Exception:

                pass


        raise


    except Exception as e:

        connection.rollback()


        for file_path in saved_files:

            try:

                if file_path.exists():

                    file_path.unlink()

            except Exception:

                pass


        raise HTTPException(
            status_code=500,
            detail=(
                "KYC document upload failed: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()

        connection.close()