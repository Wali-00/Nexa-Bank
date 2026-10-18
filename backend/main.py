from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from raw_database import get_connection

from routers import (
    customer,
    account_application,
    account,
    beneficiary,
    user,
    login,
    employee,
    department,
    position,
    transaction,
    transaction_entry,
    transfer,
    account_transaction,
    bill_payment,
    loan_transaction,
    card_transaction,
    fixed_deposit,
    notification,
    audit_log,
    kyc_verification,
    loan_application,
    loan_type,
    card,
    biller,
    loan,
    loan_payment,
    branch
)
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Nexa Bank API",
    version="1.0.0"
)
UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(customer.router)
app.include_router(account_application.router)
app.include_router(account.router)
app.include_router(beneficiary.router)

app.include_router(user.router)
app.include_router(login.router)

app.include_router(employee.router)
app.include_router(department.router)
app.include_router(position.router)

app.include_router(transaction.router)
app.include_router(transaction_entry.router)

app.include_router(transfer.router)
app.include_router(account_transaction.router)
app.include_router(bill_payment.router)

app.include_router(loan_application.router)
app.include_router(loan_transaction.router)

app.include_router(card_transaction.router)
app.include_router(fixed_deposit.router)

app.include_router(notification.router)
app.include_router(audit_log.router)
app.include_router(kyc_verification.router)
app.include_router(loan_type.router)
app.include_router(card.router)
app.include_router(biller.router)

app.include_router(loan.router)
app.include_router(loan_payment.router)
app.include_router(branch.router)
# ============================================================
# ROOT
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to Nexa Bank API"
    }


# ============================================================
# RAW SQL DATABASE TEST
# ============================================================

@app.get("/test-db")
def test_database():

    connection = get_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT DATABASE() AS database_name
            """
        )

        result = cursor.fetchone()

        return {
            "message": "Database connection successful",
            "database": result["database_name"]
        }

    finally:

        cursor.close()
        connection.close()