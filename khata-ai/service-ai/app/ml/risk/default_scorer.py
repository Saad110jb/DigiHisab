"""
Default Probability Scorer for DigiHisab Khata Ledger
Evaluates borrower default risk (Probability of Default - PD) using logistic-calibrated credit risk modeling.
"""

import math
from typing import List
from app.models.risk_features import CreditRiskRequest, CreditRiskResponse, RiskFactor, RiskTier

class DefaultRiskScorer:
    def score_customer(self, req: CreditRiskRequest) -> CreditRiskResponse:
        current_bal = max(0.0, float(req.current_outstanding_balance))
        lifetime_settled = max(0.0, float(req.total_lifetime_settled))
        tx_count = max(0, int(req.total_transactions_count))
        avg_days = max(1.0, float(req.avg_repayment_days))
        overdue_count = max(0, int(req.overdue_transactions_count))
        max_dpd = max(0, int(req.max_days_past_due))
        disputes = max(0, int(req.recent_bounce_or_dispute_count))
        monthly_vol = max(1000.0, float(req.monthly_purchase_volume))
        new_credit = max(0.0, float(req.requested_credit_amount or 0.0))

        factors: List[RiskFactor] = []

        # 1. Base logit
        logit = -2.2  # Base low default prior for normal customers (~10%)

        # 2. Overdue ratio
        overdue_ratio = overdue_count / max(1, tx_count)
        if overdue_ratio > 0.4:
            logit += 1.8
            factors.append(RiskFactor(
                factor="HIGH_OVERDUE_RATIO",
                weight=0.35,
                description_en=f"Overdue on {overdue_ratio*100:.1f}% of prior credit transactions.",
                description_ur=f"ماضی کے ادھار میں {overdue_ratio*100:.1f} فیصد اقساط تاخیر کا شکار رہیں۔"
            ))
        elif overdue_ratio > 0.15:
            logit += 0.8
            factors.append(RiskFactor(
                factor="MODERATE_OVERDUE_RATIO",
                weight=0.15,
                description_en=f"Occasional payment delays ({overdue_ratio*100:.1f}% of transactions).",
                description_ur=f"کبھی کبھار ادائیگی میں تاخیر ({overdue_ratio*100:.1f} فیصد)۔"
            ))

        # 3. Days Past Due (DPD) severity
        if max_dpd >= 60:
            logit += 2.2
            factors.append(RiskFactor(
                factor="EXTREME_DPD",
                weight=0.40,
                description_en=f"Severe historical delinquency: payments delayed up to {max_dpd} days.",
                description_ur=f"ماضی میں {max_dpd} دن تک شدید تاخیر کا ریکارڈ۔"
            ))
        elif max_dpd >= 30:
            logit += 1.2
            factors.append(RiskFactor(
                factor="MODERATE_DPD",
                weight=0.20,
                description_en=f"Payment delinquency reached {max_dpd} days past agreed date.",
                description_ur=f"ادائیگی میں {max_dpd} دن کی تاخیر ہو چکی ہے۔"
            ))

        # 4. Disputes / Bounces
        if disputes > 0:
            logit += (disputes * 0.9)
            factors.append(RiskFactor(
                factor="DISPUTED_TRANSACTIONS",
                weight=0.30,
                description_en=f"{disputes} transaction disputes or unhonored counter chits on record.",
                description_ur=f"{disputes} متنازعہ یا منسوخ شدہ پرچیاں موجود ہیں۔"
            ))

        # 5. Leverage ratio (Total Exposure / Monthly Volume)
        total_exposure = current_bal + new_credit
        leverage = total_exposure / monthly_vol
        if leverage > 2.5:
            logit += 1.5
            factors.append(RiskFactor(
                factor="EXCESSIVE_LEVERAGE",
                weight=0.25,
                description_en=f"Requested credit exceeds monthly purchase capacity by {leverage:.1f}x.",
                description_ur=f"مطلوبہ ادھار گاہک کی ماہانہ خریداری سے {leverage:.1f} گنا زیادہ ہے۔"
            ))
        elif leverage > 1.2:
            logit += 0.6

        # 6. Repayment Track Credit (Mitigating factor)
        if lifetime_settled >= total_exposure * 3 and tx_count >= 10:
            logit -= 1.4
            factors.append(RiskFactor(
                factor="EXCELLENT_TRACK_RECORD",
                weight=-0.30,
                description_en=f"Demonstrated track record: PKR {lifetime_settled:,.0f} reliably settled across {tx_count} transactions.",
                description_ur=f"شاندار ریکارڈ: {tx_count} ٹرانزیکشنز میں PKR {lifetime_settled:,.0f} بروقت ادا کیے۔"
            ))

        # 7. Slow repayment velocity
        if avg_days > 35:
            logit += 0.9
            factors.append(RiskFactor(
                factor="SLOW_SETTLEMENT_VELOCITY",
                weight=0.20,
                description_en=f"Slow average repayment turnaround ({avg_days:.0f} days).",
                description_ur=f"ادائیگی کی سست رفتار (اوسط {avg_days:.0f} دن)۔"
            ))

        # Calibrated Sigmoid
        pd = 1.0 / (1.0 + math.exp(-logit))
        pd = max(0.01, min(0.99, pd))

        # Score on 0-100 scale (100 = prime/safe, 0 = imminent default)
        risk_score = int(round((1.0 - pd) * 100))

        # Tier assignment
        if pd < 0.15:
            tier: RiskTier = "LOW"
            recommendation = "APPROVE"
            tenure_days = 30
            rec_en = "Low default risk. Customer has strong repayment capacity. Full credit approved."
            rec_ur = "محفوظ گاہک: ادھار کی باآسانی منظوری دی جا سکتی ہے۔"
        elif pd < 0.35:
            tier: RiskTier = "MODERATE"
            recommendation = "APPROVE" if new_credit <= monthly_vol else "REDUCE_AMOUNT"
            tenure_days = 15
            rec_en = "Moderate risk. Approved with standard 15-day settlement window."
            rec_ur = "درمیانہ رسک: 15 دن کی قسط پر ادھار دیا جا سکتا ہے۔"
        elif pd < 0.65:
            tier: RiskTier = "HIGH"
            recommendation = "APPROVE_WITH_SECURITY" if new_credit < monthly_vol * 0.5 else "REDUCE_AMOUNT"
            tenure_days = 7
            rec_en = "High risk of delayed payment. Require advance token or limit tenure to 7 days."
            rec_ur = "زیادہ رسک: ٹوکن رقم لیں یا ادھار کی مدت صرف 7 دن رکھیں۔"
        else:
            tier: RiskTier = "CRITICAL"
            recommendation = "REJECT"
            tenure_days = 0
            rec_en = "Critical default probability. Further credit extension is strictly unadvisable."
            rec_ur = "خطرناک رسک: مزید ادھار دینے سے پرہیز کریں (پیسے ڈوبنے کا اندیشہ)۔"

        # Safe credit ceiling limit
        safe_ceiling = max(0.0, monthly_vol * (1.0 - pd) * (14.0 / avg_days))
        safe_ceiling = round(safe_ceiling / 500.0) * 500.0

        return CreditRiskResponse(
            success=True,
            customer_id=req.customer_id,
            default_probability=round(pd, 4),
            risk_score=risk_score,
            risk_tier=tier,
            recommended_credit_ceiling=float(safe_ceiling),
            approval_recommendation=recommendation,
            max_safe_tenure_days=tenure_days,
            risk_factors=factors,
            reason_en=rec_en,
            reason_ur=rec_ur,
            is_fallback=False
        )

default_risk_scorer = DefaultRiskScorer()
