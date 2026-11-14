"""
Cash Runway & Liquidity Forecasting Data Models
"""

from typing import List, Optional
from pydantic import BaseModel, Field

class DailyCashFlowRecord(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    inflow: float = Field(0.0, ge=0.0, description="Total cash & bank deposits (PKR)")
    outflow: float = Field(0.0, ge=0.0, description="Total expenses & supplier disbursements (PKR)")
    net_flow: Optional[float] = None

class FixedMonthlyCommitment(BaseModel):
    category: str = Field(..., description="Rent, Salaries, Electric Bill, Wholesaler Installment")
    amount: float = Field(..., gt=0.0)
    due_day_of_month: int = Field(..., ge=1, le=31)

class CashRunwayRequest(BaseModel):
    profile_id: str
    current_liquid_cash: float = Field(..., description="Total cash across Till, Bank, and Digital Wallets (PKR)")
    historical_daily_cashflows: List[DailyCashFlowRecord] = Field(..., min_length=3)
    fixed_commitments: List[FixedMonthlyCommitment] = []
    forecast_horizon_days: int = Field(60, ge=7, le=180)

class DailyForecastPoint(BaseModel):
    day_offset: int
    projected_date: str
    projected_balance: float
    expected_inflow: float
    expected_outflow: float
    confidence_lower: float
    confidence_upper: float

class SeasonalWarning(BaseModel):
    event: str
    severity: str
    impact_days_window: str
    advice_ur: str
    advice_en: str

class CashRunwayResponse(BaseModel):
    success: bool = True
    profile_id: str
    current_cash: float
    avg_daily_inflow: float
    avg_daily_outflow: float
    net_daily_burn_rate: float
    trend_slope: float
    runway_days: float
    depletion_date: Optional[str] = None
    urgency_tier: str  # CRITICAL, WARNING, HEALTHY, SURPLUS
    projected_points: List[DailyForecastPoint] = []
    seasonal_warnings: List[SeasonalWarning] = []
    summary_ur: str
    summary_en: str
    is_fallback: bool = False
