from nlp_engine import app
from app.api.router import api_router

# Mount v1 API routers (Chor Nazar Anomaly Detection, Forecasting, etc.)
app.include_router(api_router)

__all__ = ["app"]
