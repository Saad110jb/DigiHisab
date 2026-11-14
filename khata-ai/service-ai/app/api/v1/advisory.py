"""
Urdu Financial Advisory RAG Endpoints for DigiHisab
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.rag.advisor_agent import advisor_agent

router = APIRouter(prefix="/advisory", tags=["Financial Advisory RAG"])

class AdvisoryChatRequest(BaseModel):
    query: str = Field(..., description="User financial question in Roman Urdu, Urdu, or English")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Merchant store financial metrics")

@router.post("/chat")
async def chat_with_advisor(payload: AdvisoryChatRequest):
    """
    Submits merchant query and store context to Munshi AI RAG advisor.
    """
    return advisor_agent.advise(query=payload.query, context=payload.context)
