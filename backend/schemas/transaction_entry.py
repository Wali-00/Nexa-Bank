from pydantic import BaseModel, Field


class TransactionEntryCreate(BaseModel):
    transaction_id: int
    account_id: int
    entry_type: str
    amount: float = Field(gt=0)
    
class TransactionEntryUpdate(BaseModel):
    entry_type: str
    amount: float = Field(gt=0)


class TransactionEntryResponse(BaseModel):
    entry_id: int
    transaction_id: int
    account_id: int
    entry_type: str
    amount: float