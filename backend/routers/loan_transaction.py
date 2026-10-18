from fastapi import APIRouter, HTTPException
from pymysql import IntegrityError
from pydantic import BaseModel
from typing import Optional

from decimal import Decimal, ROUND_HALF_UP
import uuid

from raw_database import get_connection

from schemas.loan_transaction import (
    LoanDisbursementCreate,
    LoanPaymentCreate
)

from utils.system_events import (
    create_notification,
    create_audit_log
)


router = APIRouter(
    prefix="/loan-transactions",
    tags=["Loan Transactions"]
)


# ============================================================
# MONEY HELPERS
# ============================================================

MONEY_STEP = Decimal("0.01")


def money(value):
    """
    Convert a numeric database value into Decimal
    rounded to two decimal places.
    """

    return Decimal(
        str(value or 0)
    ).quantize(
        MONEY_STEP,
        rounding=ROUND_HALF_UP
    )


# ============================================================
# CUSTOMER LOAN PAYMENT SCHEMA
# ============================================================

class CustomerLoanPaymentCreate(BaseModel):

    customer_id: int
    user_id: int
    loan_id: int
    loan_payment_id: int
    description: Optional[str] = None


# ============================================================
# LOAN DISBURSEMENT
# ============================================================

@router.post("/disburse")
def disburse_loan(
    data: LoanDisbursementCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()


        # ====================================================
        # 1. LOCK AND RETRIEVE LOAN
        # ====================================================

        cursor.execute(
            """
            SELECT
                loan_id,
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
            FROM loans
            WHERE loan_id = %s
            FOR UPDATE
            """,
            (
                data.loan_id,
            )
        )

        loan = cursor.fetchone()


        if not loan:

            raise HTTPException(
                status_code=404,
                detail="Loan not found"
            )


        # ====================================================
        # 2. LOAN MUST BE APPROVED
        # ====================================================

        if loan["status"] != "APPROVED":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Only approved loans "
                    "can be disbursed"
                )
            )


        # ====================================================
        # 3. LOCK DISBURSEMENT ACCOUNT
        # ====================================================

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                customer_id,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (
                loan["disbursement_account_id"],
            )
        )

        account = cursor.fetchone()


        if not account:

            raise HTTPException(
                status_code=404,
                detail="Disbursement account not found"
            )


        if account["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Disbursement account "
                    "is not active"
                )
            )


        if (
            account["customer_id"]
            != loan["customer_id"]
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Disbursement account does not "
                    "belong to the loan customer"
                )
            )


        # ====================================================
        # 4. GENERATE REFERENCE NUMBER
        # ====================================================

        reference_no = (
            "LDS-"
            +
            uuid.uuid4().hex[:20].upper()
        )


        # ====================================================
        # 5. CREATE DISBURSEMENT TRANSACTION
        # transaction_type_id = 5
        # ====================================================

        cursor.execute(
            """
            INSERT INTO transactions
            (
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            )
            VALUES
            (
                5,
                %s,
                %s,
                %s,
                0.00,
                NOW(),
                'SUCCESS',
                %s
            )
            """,
            (
                reference_no,
                data.initiated_by_user_id,
                loan["principal_amount"],
                data.description
                or "Loan disbursement"
            )
        )

        transaction_id = cursor.lastrowid


        # ====================================================
        # 6. CREATE CREDIT TRANSACTION ENTRY
        # ====================================================

        cursor.execute(
            """
            INSERT INTO transaction_entries
            (
                transaction_id,
                account_id,
                entry_type,
                amount
            )
            VALUES
            (
                %s,
                %s,
                'CREDIT',
                %s
            )
            """,
            (
                transaction_id,
                loan["disbursement_account_id"],
                loan["principal_amount"]
            )
        )


        # ====================================================
        # 7. CREDIT CUSTOMER ACCOUNT
        # ====================================================

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance =
                    balance + %s,

                available_balance =
                    available_balance + %s
            WHERE account_id = %s
            """,
            (
                loan["principal_amount"],
                loan["principal_amount"],
                loan["disbursement_account_id"]
            )
        )


        # ====================================================
        # 8. ACTIVATE LOAN
        # ====================================================

        cursor.execute(
            """
            UPDATE loans
            SET
                outstanding_amount =
                    principal_amount,

                disbursement_date =
                    CURDATE(),

                status =
                    'ACTIVE'
            WHERE loan_id = %s
            """,
            (
                data.loan_id,
            )
        )


        # ====================================================
        # 9. CHECK EXISTING REPAYMENT SCHEDULE
        # ====================================================

        cursor.execute(
            """
            SELECT
                COUNT(*) AS payment_count
            FROM loan_payments
            WHERE loan_id = %s
            """,
            (
                data.loan_id,
            )
        )

        existing_schedule = cursor.fetchone()


        payment_count = (
            int(
                existing_schedule[
                    "payment_count"
                ]
            )
            if existing_schedule
            else 0
        )


        # ====================================================
        # 10. CREATE REPAYMENT SCHEDULE
        # ====================================================

        if payment_count == 0:

            principal = money(
                loan["principal_amount"]
            )

            annual_interest_rate = Decimal(
                str(
                    loan["interest_rate"]
                    or 0
                )
            )

            duration_months = int(
                loan["duration_months"]
            )

            monthly_emi = money(
                loan["monthly_emi"]
            )


            monthly_interest_rate = (
                annual_interest_rate
                /
                Decimal("100")
                /
                Decimal("12")
            )


            remaining_principal = principal


            for installment_no in range(
                1,
                duration_months + 1
            ):

                # --------------------------------------------
                # INTEREST FOR CURRENT MONTH
                # --------------------------------------------

                interest_amount = (
                    remaining_principal
                    *
                    monthly_interest_rate
                ).quantize(
                    MONEY_STEP,
                    rounding=ROUND_HALF_UP
                )


                # --------------------------------------------
                # FINAL INSTALLMENT
                # --------------------------------------------

                if (
                    installment_no
                    ==
                    duration_months
                ):

                    installment_amount = (
                        remaining_principal
                        +
                        interest_amount
                    ).quantize(
                        MONEY_STEP,
                        rounding=ROUND_HALF_UP
                    )

                    principal_component = (
                        remaining_principal
                    )


                else:

                    installment_amount = (
                        monthly_emi
                    )

                    principal_component = (
                        installment_amount
                        -
                        interest_amount
                    ).quantize(
                        MONEY_STEP,
                        rounding=ROUND_HALF_UP
                    )


                    if principal_component < 0:

                        principal_component = (
                            Decimal("0.00")
                        )


                    if (
                        principal_component
                        >
                        remaining_principal
                    ):

                        principal_component = (
                            remaining_principal
                        )


                # --------------------------------------------
                # UPDATE SIMULATED PRINCIPAL
                # --------------------------------------------

                remaining_principal = (
                    remaining_principal
                    -
                    principal_component
                ).quantize(
                    MONEY_STEP,
                    rounding=ROUND_HALF_UP
                )


                if remaining_principal < 0:

                    remaining_principal = (
                        Decimal("0.00")
                    )


                # --------------------------------------------
                # CREATE INSTALLMENT
                # --------------------------------------------

                cursor.execute(
                    """
                    INSERT INTO loan_payments
                    (
                        loan_id,
                        installment_no,
                        due_date,
                        amount_due,
                        amount_paid,
                        late_fee,
                        payment_date,
                        status,
                        transaction_id
                    )
                    VALUES
                    (
                        %s,
                        %s,

                        DATE_ADD(
                            CURDATE(),
                            INTERVAL %s MONTH
                        ),

                        %s,
                        0.00,
                        0.00,
                        NULL,
                        'PENDING',
                        NULL
                    )
                    """,
                    (
                        data.loan_id,
                        installment_no,
                        installment_no,
                        installment_amount
                    )
                )


        # ====================================================
        # 11. GET CUSTOMER USER ID
        # ====================================================

        cursor.execute(
            """
            SELECT
                user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (
                loan["customer_id"],
            )
        )

        customer = cursor.fetchone()


        customer_user_id = (
            customer["user_id"]
            if customer
            else None
        )


        # ====================================================
        # 12. GET UPDATED LOAN
        # ====================================================

        cursor.execute(
            """
            SELECT
                outstanding_amount,
                disbursement_date,
                status
            FROM loans
            WHERE loan_id = %s
            """,
            (
                data.loan_id,
            )
        )

        updated_loan = cursor.fetchone()


        # ====================================================
        # 13. CREATE CUSTOMER NOTIFICATION
        # ====================================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Loan Disbursed",
            message=(
                f"Your loan of BDT "
                f"{float(loan['principal_amount']):.2f} "
                f"has been disbursed successfully "
                f"to your Nexa Bank account."
            ),
            notification_type="LOAN"
        )


        # ====================================================
        # 14. CREATE AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,
            user_id=data.initiated_by_user_id,
            action="LOAN_DISBURSED",
            entity_type="LOAN",
            entity_id=data.loan_id,

            old_value={
                "status":
                    loan["status"],

                "outstanding_amount":
                    float(
                        loan[
                            "outstanding_amount"
                        ]
                    ),

                "disbursement_date":
                    (
                        str(
                            loan[
                                "disbursement_date"
                            ]
                        )
                        if loan[
                            "disbursement_date"
                        ]
                        else None
                    )
            },

            new_value={
                "status":
                    updated_loan["status"],

                "outstanding_amount":
                    float(
                        updated_loan[
                            "outstanding_amount"
                        ]
                    ),

                "disbursement_date":
                    (
                        str(
                            updated_loan[
                                "disbursement_date"
                            ]
                        )
                        if updated_loan[
                            "disbursement_date"
                        ]
                        else None
                    ),

                "transaction_id":
                    transaction_id,

                "reference_no":
                    reference_no,

                "amount":
                    float(
                        loan[
                            "principal_amount"
                        ]
                    )
            },

            ip_address=None
        )


        # ====================================================
        # 15. COMMIT
        # ====================================================

        connection.commit()


        return {

            "message":
                "Loan disbursed successfully",

            "loan_id":
                data.loan_id,

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "customer_id":
                loan["customer_id"],

            "account_id":
                loan[
                    "disbursement_account_id"
                ],

            "account_number":
                account["account_number"],

            "amount":
                float(
                    loan["principal_amount"]
                ),

            "monthly_emi":
                float(
                    loan["monthly_emi"]
                ),

            "duration_months":
                int(
                    loan["duration_months"]
                ),

            "transaction_type":
                "LOAN_DISBURSEMENT",

            "entry_type":
                "CREDIT",

            "status":
                "ACTIVE"
        }


    except HTTPException:

        connection.rollback()
        raise


    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Loan disbursement failed because "
                "of a database constraint"
            )
        )


    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Loan disbursement failed: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()


# ============================================================
# LOAN PAYMENT
# LOAN OFFICER / GENERAL PAYMENT ENGINE
# ============================================================

@router.post("/payment")
def make_loan_payment(
    payment_data: LoanPaymentCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    try:

        connection.begin()


        # ====================================================
        # 1. LOCK LOAN
        # ====================================================

        cursor.execute(
            """
            SELECT
                loan_id,
                customer_id,
                principal_amount,
                outstanding_amount,
                interest_rate,
                duration_months,
                monthly_emi,
                status
            FROM loans
            WHERE loan_id = %s
            FOR UPDATE
            """,
            (
                payment_data.loan_id,
            )
        )

        loan = cursor.fetchone()


        if not loan:

            raise HTTPException(
                status_code=404,
                detail="Loan not found"
            )


        if loan["status"] not in (
            "ACTIVE",
            "DEFAULTED"
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Loan is not eligible "
                    "for payment"
                )
            )


        # ====================================================
        # 2. LOCK REPAYMENT ACCOUNT
        # ====================================================

        cursor.execute(
            """
            SELECT
                account_id,
                customer_id,
                account_number,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (
                payment_data.account_id,
            )
        )

        account = cursor.fetchone()


        if not account:

            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )


        if account["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )


        # ====================================================
        # 3. VERIFY CUSTOMER OWNERSHIP
        # ====================================================

        if (
            account["customer_id"]
            != loan["customer_id"]
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Account does not belong "
                    "to the loan customer"
                )
            )


        # ====================================================
        # 4. LOCK LOAN INSTALLMENT
        # ====================================================

        cursor.execute(
            """
            SELECT
                loan_payment_id,
                loan_id,
                installment_no,
                due_date,
                amount_due,
                amount_paid,
                late_fee,
                payment_date,
                status
            FROM loan_payments
            WHERE loan_payment_id = %s
              AND loan_id = %s
            FOR UPDATE
            """,
            (
                payment_data.loan_payment_id,
                payment_data.loan_id
            )
        )

        installment = cursor.fetchone()


        if not installment:

            raise HTTPException(
                status_code=404,
                detail="Loan installment not found"
            )


        # ====================================================
        # 5. CHECK INSTALLMENT STATUS
        # ====================================================

        if installment["status"] == "PAID":

            raise HTTPException(
                status_code=400,
                detail=(
                    "This installment has "
                    "already been paid"
                )
            )


        # ====================================================
        # 6. CALCULATE INSTALLMENT AMOUNT
        # ====================================================

        amount_due = money(
            installment["amount_due"]
        )

        amount_paid_before = money(
            installment["amount_paid"]
        )

        late_fee = money(
            installment["late_fee"]
        )


        remaining_installment = (
            amount_due
            -
            amount_paid_before
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        if remaining_installment < 0:

            remaining_installment = (
                Decimal("0.00")
            )


        total_due = (
            remaining_installment
            +
            late_fee
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        payment_amount = money(
            payment_data.amount
        )


        # ====================================================
        # 7. VALIDATE PAYMENT AMOUNT
        # FULL PAYMENT ONLY
        # ====================================================

        if payment_amount > total_due:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Payment cannot exceed total "
                    f"amount due: {total_due:.2f}"
                )
            )


        if payment_amount < total_due:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Full payment required: "
                    f"{total_due:.2f}"
                )
            )


        # ====================================================
        # 8. CHECK ACCOUNT BALANCE
        # ====================================================

        available_balance = money(
            account["available_balance"]
        )


        if (
            available_balance
            <
            payment_amount
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Insufficient available balance"
                )
            )


        # ====================================================
        # 9. CALCULATE INTEREST + PRINCIPAL COMPONENT
        # ====================================================

        current_outstanding = money(
            loan["outstanding_amount"]
        )


        annual_interest_rate = Decimal(
            str(
                loan["interest_rate"]
                or 0
            )
        )


        monthly_interest_rate = (
            annual_interest_rate
            /
            Decimal("100")
            /
            Decimal("12")
        )


        interest_component = (
            current_outstanding
            *
            monthly_interest_rate
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        principal_payment = (
            remaining_installment
            -
            interest_component
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        if principal_payment < 0:

            principal_payment = (
                Decimal("0.00")
            )


        if (
            principal_payment
            >
            current_outstanding
        ):

            principal_payment = (
                current_outstanding
            )


        # Final installment
        if (
            int(
                installment[
                    "installment_no"
                ]
            )
            >=
            int(
                loan[
                    "duration_months"
                ]
            )
        ):

            principal_payment = (
                current_outstanding
            )


        new_outstanding = (
            current_outstanding
            -
            principal_payment
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        if new_outstanding < 0:

            new_outstanding = (
                Decimal("0.00")
            )


        # ====================================================
        # 10. GET CUSTOMER USER ID
        # ====================================================

        cursor.execute(
            """
            SELECT
                user_id
            FROM customers
            WHERE customer_id = %s
            """,
            (
                loan["customer_id"],
            )
        )

        customer_user = cursor.fetchone()


        customer_user_id = (
            customer_user["user_id"]
            if customer_user
            else None
        )


        # ====================================================
        # 11. GENERATE PAYMENT REFERENCE
        # ====================================================

        reference_no = (
            "LPM-"
            +
            uuid.uuid4().hex[:20].upper()
        )


        # ====================================================
        # 12. CREATE PAYMENT TRANSACTION
        # transaction_type_id = 6
        # ====================================================

        cursor.execute(
            """
            INSERT INTO transactions
            (
                transaction_type_id,
                reference_no,
                initiated_by_user_id,
                amount,
                fee,
                transaction_date,
                status,
                description
            )
            VALUES
            (
                6,
                %s,
                %s,
                %s,
                0,
                NOW(),
                'SUCCESS',
                %s
            )
            """,
            (
                reference_no,
                payment_data.initiated_by_user_id,
                payment_amount,
                payment_data.description
                or "Loan payment"
            )
        )

        transaction_id = cursor.lastrowid


        # ====================================================
        # 13. CREATE DEBIT TRANSACTION ENTRY
        # ====================================================

        cursor.execute(
            """
            INSERT INTO transaction_entries
            (
                transaction_id,
                account_id,
                entry_type,
                amount
            )
            VALUES
            (
                %s,
                %s,
                'DEBIT',
                %s
            )
            """,
            (
                transaction_id,
                payment_data.account_id,
                payment_amount
            )
        )


        # ====================================================
        # 14. DEBIT CUSTOMER ACCOUNT
        # ====================================================

        cursor.execute(
            """
            UPDATE accounts
            SET
                balance =
                    balance - %s,

                available_balance =
                    available_balance - %s
            WHERE account_id = %s
            """,
            (
                payment_amount,
                payment_amount,
                payment_data.account_id
            )
        )


        # ====================================================
        # 15. MARK INSTALLMENT AS PAID
        # ====================================================

        cursor.execute(
            """
            UPDATE loan_payments
            SET
                transaction_id = %s,

                payment_date =
                    CURDATE(),

                amount_paid =
                    amount_due,

                status =
                    'PAID'
            WHERE loan_payment_id = %s
            """,
            (
                transaction_id,
                payment_data.loan_payment_id
            )
        )


        # ====================================================
        # 16. DETERMINE LOAN STATUS
        # ====================================================

        if new_outstanding <= Decimal("0.00"):

            new_outstanding = (
                Decimal("0.00")
            )

            loan_status = (
                "COMPLETED"
            )

        else:

            loan_status = (
                "ACTIVE"
            )


        # ====================================================
        # 17. UPDATE LOAN
        # ====================================================

        cursor.execute(
            """
            UPDATE loans
            SET
                outstanding_amount = %s,
                status = %s
            WHERE loan_id = %s
            """,
            (
                new_outstanding,
                loan_status,
                payment_data.loan_id
            )
        )


        # ====================================================
        # 18. CREATE PAYMENT NOTIFICATION
        # ====================================================

        create_notification(
            cursor=cursor,
            user_id=customer_user_id,
            title="Loan Payment Successful",
            message=(
                f"Your loan installment "
                f"#{installment['installment_no']} "
                f"payment of BDT "
                f"{float(payment_amount):.2f} "
                f"was completed successfully."
            ),
            notification_type="LOAN_PAYMENT"
        )


        # ====================================================
        # 19. CREATE AUDIT LOG
        # ====================================================

        create_audit_log(
            cursor=cursor,
            user_id=
                payment_data.initiated_by_user_id,

            action=
                "LOAN_PAYMENT_COMPLETED",

            entity_type=
                "LOAN_PAYMENT",

            entity_id=
                payment_data.loan_payment_id,

            old_value={

                "amount_paid":
                    float(
                        amount_paid_before
                    ),

                "installment_status":
                    installment["status"],

                "loan_outstanding":
                    float(
                        current_outstanding
                    )
            },

            new_value={

                "transaction_id":
                    transaction_id,

                "loan_id":
                    payment_data.loan_id,

                "account_id":
                    payment_data.account_id,

                "installment_no":
                    installment[
                        "installment_no"
                    ],

                "payment_amount":
                    float(
                        payment_amount
                    ),

                "installment_amount":
                    float(
                        remaining_installment
                    ),

                "interest_paid":
                    float(
                        interest_component
                    ),

                "principal_paid":
                    float(
                        principal_payment
                    ),

                "late_fee_paid":
                    float(
                        late_fee
                    ),

                "new_outstanding":
                    float(
                        new_outstanding
                    ),

                "installment_status":
                    "PAID",

                "loan_status":
                    loan_status,

                "reference_no":
                    reference_no
            },

            ip_address=None
        )


        # ====================================================
        # 20. COMMIT
        # ====================================================

        connection.commit()


        return {

            "message":
                "Loan payment completed successfully",

            "loan_payment_id":
                payment_data.loan_payment_id,

            "loan_id":
                payment_data.loan_id,

            "transaction_id":
                transaction_id,

            "reference_no":
                reference_no,

            "account_id":
                payment_data.account_id,

            "account_number":
                account["account_number"],

            "installment_no":
                installment["installment_no"],

            "amount_paid":
                float(
                    payment_amount
                ),

            "installment_amount_paid":
                float(
                    remaining_installment
                ),

            "interest_paid":
                float(
                    interest_component
                ),

            "principal_paid":
                float(
                    principal_payment
                ),

            "late_fee_paid":
                float(
                    late_fee
                ),

            "remaining_installment":
                0.00,

            "outstanding_loan":
                float(
                    new_outstanding
                ),

            "transaction_type":
                "LOAN_PAYMENT",

            "entry_type":
                "DEBIT",

            "installment_status":
                "PAID",

            "loan_status":
                loan_status
        }


    except HTTPException:

        connection.rollback()
        raise


    except IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Loan payment failed because "
                "of a database constraint"
            )
        )


    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Loan payment failed: "
                f"{str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()


# ============================================================
# CUSTOMER SELF-SERVICE LOAN PAYMENT
# ============================================================

@router.post("/customer-payment")
def make_customer_loan_payment(
    data: CustomerLoanPaymentCreate
):

    connection = get_connection()
    cursor = connection.cursor()

    account_id = None
    account_number = None
    payment_amount = None

    try:

        # ====================================================
        # 1. VERIFY CUSTOMER + USER
        # ====================================================

        cursor.execute(
            """
            SELECT
                customer_id,
                user_id,
                status
            FROM customers
            WHERE customer_id = %s
              AND user_id = %s
            """,
            (
                data.customer_id,
                data.user_id
            )
        )

        customer = cursor.fetchone()


        if not customer:

            raise HTTPException(
                status_code=403,
                detail="Invalid customer session"
            )


        if customer["status"] != "ACTIVE":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Customer profile is not active"
                )
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
                data.loan_id,
                data.customer_id
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


        if loan["status"] not in (
            "ACTIVE",
            "DEFAULTED"
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "This loan is not eligible "
                    "for repayment"
                )
            )


        # ====================================================
        # 3. VERIFY INSTALLMENT BELONGS TO LOAN
        # ====================================================

        cursor.execute(
            """
            SELECT
                loan_payment_id,
                loan_id,
                installment_no,
                amount_due,
                amount_paid,
                late_fee,
                status
            FROM loan_payments
            WHERE loan_payment_id = %s
              AND loan_id = %s
            """,
            (
                data.loan_payment_id,
                data.loan_id
            )
        )

        installment = cursor.fetchone()


        if not installment:

            raise HTTPException(
                status_code=404,
                detail="Loan installment not found"
            )


        if installment["status"] == "PAID":

            raise HTTPException(
                status_code=400,
                detail=(
                    "This installment has "
                    "already been paid"
                )
            )


        # ====================================================
        # 4. CALCULATE EXACT PAYMENT AMOUNT
        # ====================================================

        amount_due = money(
            installment["amount_due"]
        )

        amount_paid = money(
            installment["amount_paid"]
        )

        late_fee = money(
            installment["late_fee"]
        )


        remaining_installment = (
            amount_due
            -
            amount_paid
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        if remaining_installment < 0:

            remaining_installment = (
                Decimal("0.00")
            )


        total_due = (
            remaining_installment
            +
            late_fee
        ).quantize(
            MONEY_STEP,
            rounding=ROUND_HALF_UP
        )


        if total_due <= Decimal("0.00"):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Nothing is due for "
                    "this installment"
                )
            )


        # ====================================================
        # 5. AUTOMATICALLY DETECT PAYMENT ACCOUNT
        #
        # Only:
        # - same customer
        # - ACTIVE account
        # - enough available balance
        #
        # Highest available balance preferred.
        # ====================================================

        cursor.execute(
            """
            SELECT
                account_id,
                account_number,
                customer_id,
                balance,
                available_balance,
                status
            FROM accounts
            WHERE customer_id = %s
              AND status = 'ACTIVE'
              AND available_balance >= %s
            ORDER BY
                available_balance DESC,
                account_id ASC
            LIMIT 1
            """,
            (
                data.customer_id,
                total_due
            )
        )

        account = cursor.fetchone()


        if not account:

            raise HTTPException(
                status_code=400,
                detail=(
                    "You do not have an active "
                    "account with sufficient balance "
                    "for this installment"
                )
            )


        account_id = int(
            account["account_id"]
        )

        account_number = (
            account["account_number"]
        )

        payment_amount = float(
            total_due
        )


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to prepare customer "
                f"loan payment: {str(e)}"
            )
        )


    finally:

        cursor.close()
        connection.close()


    # ========================================================
    # 6. REUSE EXISTING PAYMENT ENGINE
    #
    # make_loan_payment() will:
    #
    # - start transaction
    # - lock loan
    # - lock account
    # - verify ownership
    # - lock installment
    # - verify exact amount
    # - check balance again
    # - create transaction
    # - debit account
    # - mark installment PAID
    # - update outstanding loan
    # - create notification
    # - create audit log
    # - commit
    # ========================================================

    payment_request = LoanPaymentCreate(

        loan_id=
            data.loan_id,

        loan_payment_id=
            data.loan_payment_id,

        account_id=
            account_id,

        amount=
            payment_amount,

        initiated_by_user_id=
            data.user_id,

        description=
            data.description
            or "Online loan payment by customer"
    )


    result = make_loan_payment(
        payment_request
    )


    # ========================================================
    # 7. CUSTOMER-SPECIFIC RESPONSE
    # ========================================================

    result[
        "payment_channel"
    ] = "CUSTOMER_ONLINE"


    result[
        "customer_id"
    ] = data.customer_id


    result[
        "debited_account_number"
    ] = account_number


    return result