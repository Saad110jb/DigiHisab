from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.ml.anomalies.isolation_forest import chor_nazar_engine

router = APIRouter(prefix="/anomalies", tags=["Chor Nazar Anomaly Detection"])


class AnomalyScoreRequest(BaseModel):
    amount_deviation_ratio: float = Field(
        1.0, description="Transaction amount / 30-day cashier average amount"
    )
    time_skew: float = Field(
        120.0, description="Minutes from shift start or evening skew"
    )
    void_ratio: float = Field(
        0.0, description="Voided ticket amount / total shift sales volume"
    )
    drawer_variance: float = Field(
        0.0, description="Abs(counted cash - expected cash) in PKR"
    )
    velocity: float = Field(
        1.0, description="Number of cash sales committed per minute"
    )
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    till_id: Optional[str] = None


class AnomalyFactor(BaseModel):
    factor: str
    en: str
    ur: str


class AnomalyScoreResponse(BaseModel):
    success: bool = True
    is_anomaly: bool
    anomaly_score: int
    raw_decision_score: float
    risk_score: float
    risk_percentage: float
    tier: str
    requires_biometric: bool
    alert_title_en: str
    alert_title_ur: str
    factors: List[AnomalyFactor]


@router.post("/score", response_model=AnomalyScoreResponse)
def score_till_anomaly(payload: AnomalyScoreRequest):
    """
    Evaluates cashier till operation and returns ML anomaly risk probability (0.0 to 1.0).
    If risk_score > 0.75, flags transaction as 'Chor Nazar Red Alert' requiring Manager Biometric Override.
    """
    try:
        result = chor_nazar_engine.score_event(
            amount_deviation_ratio=payload.amount_deviation_ratio,
            time_skew=payload.time_skew,
            void_ratio=payload.void_ratio,
            drawer_variance=payload.drawer_variance,
            velocity=payload.velocity,
        )
        return AnomalyScoreResponse(
            success=True,
            is_anomaly=bool(result["is_anomaly"]),
            anomaly_score=int(result["anomaly_score"]),
            raw_decision_score=float(result["raw_decision_score"]),
            risk_score=float(result["risk_score"]),
            risk_percentage=float(result["risk_percentage"]),
            tier=str(result["tier"]),
            requires_biometric=bool(result["requires_biometric"]),
            alert_title_en=str(result["alert_title_en"]),
            alert_title_ur=str(result["alert_title_ur"]),
            factors=[AnomalyFactor(**f) for f in result["factors"]],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly scoring failed: {str(e)}")
