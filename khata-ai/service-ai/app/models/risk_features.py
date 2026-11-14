"""
Customer Credit Risk & Ceiling Data Models
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field

RiskTier = Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]

class CreditRiskRequest(BaseModel):
    customer_id: str = Field(..., description="Counterparty / Customer identifier")
    customer_name: Optional[str] = "Customer"
    current_outstanding_balance: float = Field(0.0, ge=0.0, description="Current unpaid balance (PKR)")
    total_lifetime_settled: float = Field(0.0, ge=0.0, description="Total amount settled over relationship lifetime (PKR)")
    total_transactions_count: int = Field(0, ge=0, description="Total number of transactions completed")
    avg_repayment_days: float = Field(14.0, ge=0.0, description="Average days taken to settle credit bills")
    overdue_transactions_count: int = Field(0, ge=0, description="Number of times payments were delayed past due date")
    max_days_past_due: int = Field(0, ge=0, description="Maximum days past due in historical transactions")
    recent_bounce_or_dispute_count: int = Field(0, ge=0, description="Count of disputed entries or bounced transactions")
    monthly_purchase_volume: float = Field(0.0, ge=0.0, description="Estimated monthly purchase volume (PKR)")
    requested_credit_amount: Optional[float] = Field(0.0, ge=0.0, description="New proposed credit amount (PKR)")

class RiskFactor(BaseModel):
    factor: str
    weight: float
    description_en: str
    description_ur: str

class CreditRiskResponse(BaseModel):
    success: bool = True
    customer_id: str
    default_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated default probability (0.0 to 1.0)")
    risk_score: int = Field(..., ge=0, le=100, description="Score between 0 (highest risk) and 100 (prime)")
    risk_tier: RiskTier
    recommended_credit_ceiling: float = Field(..., ge=0.0, description="Maximum recommended safe credit in PKR")
    approval_recommendation: Literal["APPROVE", "APPROVE_WITH_SECURITY", "REDUCE_AMOUNT", "REJECT"]
    max_safe_tenure_days: int
    risk_factors: List[RiskFactor] = []
    reason_en: str
    reason_ur: str
    is_fallback: bool = False

class CreditCeilingCalculationRequest(BaseModel):
    customer_id: str
    customer_name: Optional[str] = "Customer"
    trailing_90d_turnover: float = Field(..., ge=0.0, description="Total purchases/repayments over past 90 days in PKR")
    avg_settlement_velocity_days: float = Field(..., ge=1.0, description="Average days from credit taken to full payment")
    trust_score: float = Field(default=80.0, ge=0.0, le=100.0, description="Customer reputation score (0-100)")
    disputed_count: int = Field(default=0, ge=0)
    current_balance: float = Field(default=0.0, ge=0.0)

class CreditCeilingResponse(BaseModel):
    success: bool = True
    customer_id: str
    dynamic_ceiling: float
    available_credit_headroom: float
    turnover_velocity_multiplier: float
    trust_adjustment_pct: float
    formula_breakdown: str
    recommendation_ur: str
    recommendation_en: str
