"""
Dynamic Credit Ceiling Calculator for DigiHisab
Calculates individualized, safe borrowing limits for Pakistani retail customers based on repayment velocity.
"""

from typing import Dict, Any
from app.models.risk_features import CreditCeilingCalculationRequest, CreditCeilingResponse

class CreditCeilingEngine:
    @staticmethod
    def calculate_ceiling(req: CreditCeilingCalculationRequest) -> CreditCeilingResponse:
        turnover = max(0.0, float(req.trailing_90d_turnover))
        avg_days = max(1.0, float(req.avg_settlement_velocity_days))
        trust = max(0.0, min(100.0, float(req.trust_score)))
        disputes = max(0, int(req.disputed_count))
        current_bal = max(0.0, float(req.current_balance))

        # 1. Base 30-day capacity
        monthly_run_rate = turnover / 3.0 if turnover > 0 else 5000.0

        # 2. Velocity multiplier (Faster settlement => higher borrowing capacity)
        # Baseline is 14 days repayment cycle
        if avg_days <= 3.0:
            velocity_mult = 1.6
        elif avg_days <= 7.0:
            velocity_mult = 1.3
        elif avg_days <= 14.0:
            velocity_mult = 1.0
        elif avg_days <= 30.0:
            velocity_mult = 0.65
        else:
            velocity_mult = 0.35

        # 3. Trust & dispute penalty
        trust_factor = trust / 100.0
        dispute_penalty = max(0.0, 1.0 - (disputes * 0.25))
        combined_trust_factor = trust_factor * dispute_penalty

        # 4. Computed safe ceiling
        raw_ceiling = monthly_run_rate * velocity_mult * combined_trust_factor

        # Round to neat Pakistani Rupee multiples (e.g. nearest 500)
        ceiling = round(max(1000.0, raw_ceiling) / 500.0) * 500.0

        available_headroom = max(0.0, ceiling - current_bal)

        formula_breakdown = (
            f"Monthly Capacity (PKR {monthly_run_rate:,.0f}) x "
            f"Velocity Multiplier ({velocity_mult:.2f} for {avg_days:.0f}d) x "
            f"Trust/Dispute Factor ({combined_trust_factor:.2f})"
        )

        rec_en = (
            f"Maximum safe credit limit is PKR {ceiling:,.0f}. "
            f"Customer currently owes PKR {current_bal:,.0f}, leaving PKR {available_headroom:,.0f} available headroom."
        )

        rec_ur = (
            f"گاہک کی محفوظ ادھار حد PKR {ceiling:,.0f} ہے۔ "
            f"موجودہ بقایا PKR {current_bal:,.0f} ہے، بقایا محفوظ ادھار PKR {available_headroom:,.0f} کی گنجائش ہے۔"
        )

        return CreditCeilingResponse(
            success=True,
            customer_id=req.customer_id,
            dynamic_ceiling=float(ceiling),
            available_credit_headroom=float(available_headroom),
            turnover_velocity_multiplier=float(velocity_mult),
            trust_adjustment_pct=round(combined_trust_factor * 100.0, 1),
            formula_breakdown=formula_breakdown,
            recommendation_en=rec_en,
            recommendation_ur=rec_ur
        )

credit_ceiling_engine = CreditCeilingEngine()
