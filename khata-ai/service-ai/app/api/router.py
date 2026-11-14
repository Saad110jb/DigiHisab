from fastapi import APIRouter
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.nlp import router as nlp_router
from app.api.v1.risk import router as risk_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.advisory import router as advisory_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(anomalies_router)
api_router.include_router(nlp_router)
api_router.include_router(risk_router)
api_router.include_router(forecast_router)
api_router.include_router(advisory_router)
