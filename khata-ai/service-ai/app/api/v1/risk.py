"""
Credit Risk Scoring & Dynamic Ceiling Endpoints for DigiHisab
"""

from fastapi import APIRouter
from app.models.risk_features import (
    CreditRiskRequest,
    CreditRiskResponse,
    CreditCeilingCalculationRequest,
    CreditCeilingResponse
)
from app.ml.risk.default_scorer import default_risk_scorer
from app.ml.risk.credit_ceiling import credit_ceiling_engine

router = APIRouter(prefix="/risk", tags=["Credit Risk & Default Scorer"])

@router.post("/score", response_model=CreditRiskResponse)
async def score_credit_risk(payload: CreditRiskRequest):
    """
    Evaluates probability of default (PD), assigns risk tier, and produces safe credit recommendation.
    """
    return default_risk_scorer.score_customer(payload)

@router.post("/credit-ceiling", response_model=CreditCeilingResponse)
async def calculate_credit_ceiling(payload: CreditCeilingCalculationRequest):
    """
    Calculates dynamic borrowing ceiling and available headroom based on 90-day settlement velocity.
    """
    return credit_ceiling_engine.calculate_ceiling(payload)
