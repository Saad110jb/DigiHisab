"""
DigiHisab RAG Financial Advisor Agent
Orchestrates merchant financial health analysis and provides personalized Urdu/English business advice.
"""

from typing import Dict, Any, Optional
from app.rag.vector_store import vector_store
from app.rag.prompts import ADVISORY_QUERY_TEMPLATE, SYSTEM_PROMPT_URDU_MUNSHI

class AdvisorAgent:
    def advise(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        ctx = context or {}
        store_name = ctx.get("store_name", "آپ کی دکان")
        cash_in_hand = float(ctx.get("cash_in_hand", 0.0))
        bank_balance = float(ctx.get("bank_balance", 0.0))
        total_rec = float(ctx.get("total_receivables", 0.0))
        total_pay = float(ctx.get("total_payables", 0.0))
        daily_burn = float(ctx.get("daily_burn", 2500.0))
        runway_days = float(ctx.get("runway_days", 14.0))
        stockouts = int(ctx.get("stockout_count", 0))

        # 1. Retrieve domain knowledge from vector store
        relevant_docs = vector_store.search_similar(query, top_k=2)
        knowledge_text = "\n".join([
            f"- [{d['title']}]: {d['content_en']} (اردو: {d['content_ur']})"
            for d in relevant_docs
        ])

        # 2. Build structured analysis
        liquidity_total = cash_in_hand + bank_balance
        net_worth = liquidity_total + total_rec - total_pay

        # Synthesis: Practical, numbers-grounded advice
        summary_lines = []
        action_plan = []
        thirty_day_outlook = []

        # Liquidity & Runway Assessment
        if runway_days < 10.0:
            status_ur = f"⚠️ الرٹ: آپ کے پاس صرف {runway_days:.0f} دن کا کیش باقی ہے!"
            action_plan.append("فوری طور پر ان گاہکوں سے رابطہ کریں جن پر 5,000 سے زائد ادھار 15 دن سے واجب الادا ہے۔")
            action_plan.append("غیر ضروری ہول سیل آرڈرز کو فی الحال موخر کریں تاکہ کیش باہر نہ جائے۔")
        else:
            status_ur = f"✅ تسلی بخش: آپ کے پاس {runway_days:.0f} دن کا مالیاتی بفر موجود ہے۔"
            action_plan.append("تیز فروخت ہونے والے سامان (آٹا، چینی، دالیں) کے اسٹاک کو برقرار رکھیں۔")

        # Receivables vs Payables Assessment
        if total_rec > total_pay * 1.5:
            summary_lines.append(f"مارکیٹ میں آپ کا ادھار (PKR {total_rec:,.0f}) ہول سیلر کے واجبات (PKR {total_pay:,.0f}) سے بہت زیادہ ہے۔")
            action_plan.append("جمعہ کے دن تمام مقروض گاہکوں کو خودکار واٹس ایپ پرچی بھیجیں۔")
        elif total_pay > liquidity_total * 2:
            summary_lines.append(f"ہول سیلر کو فوری واجب الادا رقم (PKR {total_pay:,.0f}) نقد کیش (PKR {liquidity_total:,.0f}) سے زیادہ ہے۔")
            action_plan.append("ہول سیلر سے 15 دن کی اضافی مہلت لیں یا ادائیگیاں دو حصوں میں تقسیم کریں۔")

        thirty_day_outlook.append(f"کل لیکویڈیٹی: PKR {liquidity_total:,.0f} | خالص پوزیشن: PKR {net_worth:,.0f}")
        thirty_day_outlook.append("مہینے کے شروع میں بجلی کا بل اور کرایہ پہلے سے الگ رکھیں۔")

        advice_ur = (
            f"محترم دکاندار! {status_ur}\n\n"
            f"📊 صورتحال کا خلاصہ:\n" + "\n".join(f"• {l}" for l in summary_lines) + "\n\n"
            f"⚡ فوری حل (Action Steps):\n" + "\n".join(f"{i+1}. {a}" for i, a in enumerate(action_plan)) + "\n\n"
            f"📅 آئندہ 30 دن کی حکمت عملی:\n" + "\n".join(f"• {o}" for o in thirty_day_outlook)
        )

        advice_en = (
            f"Financial Advisory for {store_name}:\n"
            f"Current Runway: {runway_days:.0f} days (Liquid Cash: PKR {liquidity_total:,.0f}).\n"
            f"Receivables: PKR {total_rec:,.0f} | Payables: PKR {total_pay:,.0f}.\n"
            f"Key Priority: Prioritize recovery of overdue receivables and protect liquidity before paying bulk supplier invoices."
        )

        return {
            "success": True,
            "query": query,
            "advice_ur": advice_ur,
            "advice_en": advice_en,
            "runway_days": runway_days,
            "liquidity_total": liquidity_total,
            "net_position": net_worth,
            "cited_documents": [d["id"] for d in relevant_docs],
            "is_fallback": False
        }

advisor_agent = AdvisorAgent()
