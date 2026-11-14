"""
Liquidity & Cash Runway Forecasting Endpoints for DigiHisab
"""

from fastapi import APIRouter
from app.models.forecast_types import CashRunwayRequest, CashRunwayResponse
from app.ml.forecasting.cash_runway import cash_runway_forecaster

router = APIRouter(prefix="/forecast", tags=["Cash Runway & Forecasting"])

@router.post("/cash-runway", response_model=CashRunwayResponse)
async def forecast_cash_runway(payload: CashRunwayRequest):
    """
    Computes time-series trend cash depletion runway, daily trajectory points, and seasonal warnings.
    """
    return cash_runway_forecaster.forecast_runway(payload)
