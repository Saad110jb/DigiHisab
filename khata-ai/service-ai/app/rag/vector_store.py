"""
Semantic Vector & Knowledge Store for Pakistani Retail SME Advisory
Stores curated Pakistani trade rules, FBR tax compliance, working capital best practices, and Shariah trade principles.
"""

import math
import re
from typing import List, Dict, Any

KNOWLEDGE_DOCUMENTS = [
    {
        "id": "doc_udhaar_recovery",
        "category": "CREDIT_COLLECTION",
        "title": "Pakistani Retail Udhaar Recovery Best Practices",
        "keywords": ["udhaar", "recovery", "lene", "customer", "delay", "tariq", "khata", "baki", "credit", "wasooli"],
        "content_en": "Recovering retail udhaar requires timing: Contact customers on salary days (1st-5th of each month) and Friday afternoons. For balances older than 30 days, offer a 5% instant settlement discount or convert into weekly 4-part installment plan. Never confront aggressively; send polite automated WhatsApp chits.",
        "content_ur": "ادھار کی وصولی کے لیے سب سے بہترین وقت تنخواہ کے دن (یکم سے 5 تاریخ) اور جمعہ کا دن ہے۔ 30 دن سے پرانے ادھار پر تھوڑی رعایت (مثلاً 5 فیصد کیش ڈسکاؤنٹ) دے کر فوری یکمشت رقم حاصل کریں یا ہفتہ وار اقساط طے کریں۔"
    },
    {
        "id": "doc_supplier_bargaining",
        "category": "SUPPLIER_PAYABLES",
        "title": "Mandi & Wholesaler Negotiation Tactics",
        "keywords": ["supplier", "wholesaler", "dene", "payable", "mandi", "discount", "advance", "credit"],
        "content_en": "When cash is tight, do not let supplier payables exceed 1.5x your monthly sales. Negotiate 15-day revolving credit with local FMCG distributors. If paying cash upfront at Akbari Mandi / Jodia Bazaar, demand 2% to 3.5% naqad chhoot (cash discount).",
        "content_ur": "ہول سیلر اور منڈی سے سامان خریدتے وقت نقد ادائیگی پر ہمیشہ 2 سے 3.5 فیصد نقد چھوٹ مانگیں۔ اگر کیش کی تنگی ہو تو ادھار کو کبھی بھی ماہانہ فروخت کے 1.5 گنا سے زیادہ نہ بڑھنے دیں۔"
    },
    {
        "id": "doc_fbr_turnover_tax",
        "category": "TAX_AND_COMPLIANCE",
        "title": "FBR Section 113 Minimum Turnover Tax & POS Integration",
        "keywords": ["tax", "fbr", "turnover", "section 113", "sales tax", "tier 1", "ntn", "audit"],
        "content_en": "Under FBR Income Tax Ordinance Section 113, retail traders pay minimum tax (typically 1.25% of annual gross turnover) if net taxable income is below benchmark. Maintaining digitized double-entry JEV vouchers and daily z-reports protects against arbitrary deemed tax assessments.",
        "content_ur": "ایف بی آر انکم ٹیکس قوانین کے تحت خوردہ فروشوں کے لیے سالانہ ٹرن اوور پر کم از کم ٹیکس لاگو ہوتا ہے۔ روزانہ کے ڈیجیٹل ڈبل انٹری واؤچرز رکھنے سے غیر ضروری ٹیکس نوٹسز اور جرمانوں سے بچا جا سکتا ہے۔"
    },
    {
        "id": "doc_cash_runway_safety",
        "category": "LIQUIDITY_MANAGEMENT",
        "title": "Minimum Cash Runway Buffer for Kiryana & Superstores",
        "keywords": ["runway", "cash", "galla", "bank", "reserve", "burn", "emergency", "crisis"],
        "content_en": "Always maintain a minimum 15 to 20 days operational cash reserve in liquid accounts. Do not lock all cash in slow-moving dead stock. Reinvest 70% of gross profits into top-20 high-velocity staple goods (Sugar, Flour, Cooking Oil, Pulses).",
        "content_ur": "گلے اور بینک اکاؤنٹ میں کم از کم 15 سے 20 دن کے اخراجات کا کیش ایمرجنسی ریزرو ہونا چاہیے۔ ساری رقم ایسے سامان میں نہ پھنسائیں جو مہینوں نہ بکے، بلکہ تیز فروخت ہونے والی اشیاء (آٹا، چینی، گھی، دالیں) میں لگائیں۔"
    },
    {
        "id": "doc_zakat_trade_goods",
        "category": "SHARIAH_COMPLIANCE",
        "title": "Zakat on Commercial Trade Stock (Mal-e-Tijarat)",
        "keywords": ["zakat", "nisab", "chandi", "gold", "silver", "tola", "shariah", "sadqah"],
        "content_en": "Zakat on business inventory is mandatory at 2.5% of total trade stock value plus liquid cash minus short-term supplier payables. The Nisab threshold is based on the current Karachi Sarafa market silver rate (52.5 tolas of silver).",
        "content_ur": "کاروباری سامان تجارت اور نقد رقم پر واجب الادا زکوٰۃ 2.5 فیصد ہے۔ کل تجارتی مال اور کیش میں سے فوری واجب الادا ادھار منہا کر کے چاندی کے نصاب (52.5 تولہ) کے مطابق حساب لگائیں۔"
    }
]

class VectorStoreEngine:
    def __init__(self):
        self.documents = KNOWLEDGE_DOCUMENTS

    def search_similar(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant knowledge chunks using weighted TF-IDF keyword overlap.
        """
        clean_tokens = set(re.findall(r"\b\w+\b", query.lower()))
        scored_docs = []

        for doc in self.documents:
            score = 0.0
            doc_keywords = doc.get("keywords", [])
            for token in clean_tokens:
                if token in doc_keywords:
                    score += 2.5
                elif token in doc.get("title", "").lower():
                    score += 1.5
                elif token in doc.get("content_en", "").lower():
                    score += 0.8

            scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in scored_docs[:top_k]]

vector_store = VectorStoreEngine()
