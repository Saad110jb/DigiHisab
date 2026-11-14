"""
Transaction Data Models for DigiHisab AI Microservice
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TransactionVector(BaseModel):
    transaction_id: Optional[str] = None
    profile_id: Optional[str] = None
    amount: float = Field(..., gt=0, description="Amount in PKR")
    payment_mode: str = Field(default="CASH", description="CASH, BANK, WALLET, or CREDIT")
    entry_type: str = Field(default="CASH_IN", description="RECEIVABLE, PAYABLE, CASH_IN, CASH_OUT")
    category: str = Field(default="General")
    created_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BatchTransactionPayload(BaseModel):
    profile_id: str
    transactions: List[TransactionVector]
    window_days: int = 30
