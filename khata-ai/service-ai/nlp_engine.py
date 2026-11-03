import re
from fastapi import FastAPI
from pydantic import BaseModel
import spacy

app = FastAPI(title="DigiHisab Local Roman-Urdu NLU Engine")

# Load lightweight spaCy model with graceful fallback
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = spacy.blank("en")

class VoiceRequest(BaseModel):
    transcript: str

# Comprehensive Roman-Urdu Number Normalizer Dictionary
URDU_NUMBERS = {
    # 1. Hundreds Combinations (1100 - 9900)
    "gyarah sau": 1100, "girayah sau": 1100, "giyarah sau": 1100, "gyara so": 1100, "giraya so": 1100, "gyarah so": 1100, "girayah so": 1100,
    "barah sau": 1200, "bara sau": 1200, "barah so": 1200, "bara so": 1200,
    "teerah sau": 1300, "tera sau": 1300, "teerah so": 1300, "tera so": 1300,
    "choudah sau": 1400, "chawdah sau": 1400, "chauda so": 1400, "chouda so": 1400,
    "pandrah sau": 1500, "pandra sau": 1500, "pandrah so": 1500, "pandra so": 1500,
    "soolah sau": 1600, "sola sau": 1600, "soolah so": 1600, "sola so": 1600,
    "satrah sau": 1700, "satra sau": 1700, "satrah so": 1700, "satra so": 1700,
    "athaarah sau": 1800, "athara sau": 1800, "athara so": 1800, "atharah so": 1800,
    "unnees sau": 1900, "unnis sau": 1900, "unnees so": 1900, "unnis so": 1900,
    "bees sau": 2000, "bis sau": 2000, "bees so": 2000, "bis so": 2000,
    "pachees sau": 2500, "pachis sau": 2500, "pachees so": 2500, "pachis so": 2500,
    "pentees sau": 3500, "pentis so": 3500,
    "paintalis sau": 4500, "paintalis so": 4500,

    # 2. Fractions & Spoken Thousands
    "dedh hazar": 1500, "dedh hazaar": 1500, "dhedh hazar": 1500,
    "dhai hazar": 2500, "dhai hazaar": 2500, "dhai hazhar": 2500,
    "saadhe do hazar": 2500, "sadhe do hazar": 2500,
    "saadhe teen hazar": 3500, "sadhe teen hazar": 3500,
    "saadhe char hazar": 4500, "sadhe char hazar": 4500,
    "saadhe paanch hazar": 5500, "sadhe panch hazar": 5500,

    # 3. Exact Thousands
    "aik hazar": 1000, "ek hazar": 1000, "ek hazaar": 1000, "hazar": 1000, "hazaar": 1000,
    "do hazar": 2000, "do hazaar": 2000,
    "teen hazar": 3000, "teen hazaar": 3000,
    "char hazar": 4000, "chaar hazar": 4000,
    "paanch hazar": 5000, "panch hazar": 5000, "panch hazaar": 5000,
    "cheh hazar": 6000, "chay hazar": 6000,
    "saat hazar": 7000, "saat hazaar": 7000,
    "aath hazar": 8000, "aath hazaar": 8000,
    "nau hazar": 9000, "no hazar": 9000,
    "das hazar": 10000, "das hazaar": 10000,
    "giyarah hazar": 11000, "gyarah hazar": 11000, "girayah hazar": 11000,
    "barah hazar": 12000, "bara hazar": 12000,
    "pandrah hazar": 15000, "pandra hazar": 15000,
    "bees hazar": 20000, "bis hazar": 20000,
    "pachees hazar": 25000, "pachis hazar": 25000,
    "pachaas hazar": 50000, "pachas hazar": 50000,
    "sattar hazar": 70000,
    "assi hazar": 80000,
    "nabbe hazar": 90000,

    # 4. Lakhs / Hundreds of Thousands
    "aik laakh": 100000, "ek lakh": 100000, "laakh": 100000, "lakh": 100000,
    "do laakh": 200000, "do lakh": 200000,
    "paanch laakh": 500000, "panch lakh": 500000,
    "das laakh": 1000000, "das lakh": 1000000,

    # 5. Hundreds (100 - 900)
    "aik so": 100, "ek sau": 100, "ek so": 100, "sau": 100, "so": 100,
    "do so": 200, "do sau": 200,
    "teen so": 300, "teen sau": 300,
    "char so": 400, "chaar sau": 400,
    "paanch so": 500, "panch so": 500, "paanch sau": 500, "panch sau": 500,
    "cheh so": 600, "chay sau": 600,
    "saat so": 700, "saat sau": 700,
    "aath so": 800, "aath sau": 800,
    "nau so": 900, "no sau": 900,

    # 6. Standalone Urdu Numbers
    "gyarah": 11, "girayah": 11, "giyarah": 11, "gyara": 11, "giraya": 11,
    "barah": 12, "bara": 12,
    "teerah": 13, "tera": 13,
    "choudah": 14, "chauda": 14,
    "pandrah": 15, "pandra": 15,
    "soolah": 16, "sola": 16,
    "satrah": 17, "satra": 17,
    "athaarah": 18, "athara": 18,
    "unnees": 19, "unnis": 19,
    "bees": 20, "bis": 20,
    "tees": 30,
    "chalis": 40, "chaalis": 40,
    "pachaas": 50, "pachas": 50,
    "saath": 60,
    "sattar": 70,
    "assi": 80,
    "nabbe": 90,
    "aik": 1, "ek": 1,
    "do": 2,
    "teen": 3,
    "char": 4, "chaar": 4,
    "paanch": 5, "panch": 5
}

def extract_amount(text: str) -> float:
    text_lower = text.lower()
    
    # 1. Direct digits handling commas (e.g., 1000, 1100, 2,500, 10,000, 500.50)
    digit_match = re.search(r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b', text)
    if digit_match:
        clean_str = digit_match.group(0).replace(',', '')
        try:
            return float(clean_str)
        except ValueError:
            pass
        
    # 2. Spoken Roman-Urdu words (multi-word phrases prioritized by length descending)
    sorted_numbers = sorted(URDU_NUMBERS.items(), key=lambda x: len(x[0]), reverse=True)
    for phrase, val in sorted_numbers:
        if phrase in text_lower:
            return float(val)
            
    return 0.0

def detect_action(text: str) -> str:
    text_lower = text.lower()
    
    # 1. Wasooli / Cash Settlement (CASH_IN / SETTLEMENT)
    if any(k in text_lower for k in ["wasool", "wasooli", "jama karwaye", "wapis kiye", "paise diye", "miley", "mila", "wasool hue"]):
        return "RECORD_WASOOLI"

    # 2. Supplier Purchase / Credit (PAYABLE)
    if any(k in text_lower for k in ["maal mangwaya", "wholesaler", "supplier", "stock aya", "vendor", "khareeda"]):
        return "RECORD_SUPPLIER_CREDIT"

    # 3. Cash Sale (CASH_IN)
    if any(k in text_lower for k in ["naqad", "cash sale", "counter pe", "sauda bika", "bikri"]):
        return "RECORD_CASH_SALE"

    # 4. General Store Expenses (CASH_OUT / EXPENSE) - Only chai, lunch, bill, kiraya without a person
    if any(k in text_lower for k in ["dukan kharcha", "kharch", "chai", "lunch", "safai", "jharoo", "bill", "bijli", "kiraya", "rent"]):
        return "RECORD_STORE_EXPENSE"

    # 5. Default: Udhaar Diya / Customer Credit (RECEIVABLE) - Covers all customer entries like "Saad ko 800 tankwa dedi ha", "Amna ko 1000 udhar"
    return "RECORD_UDHAAR"

def extract_person_name(doc, text: str) -> str:
    stop_words = {
        "dukan", "counter", "aaj", "kal", "bhai", "shukriya", "supplier",
        "maal", "sauda", "kharcha", "chai", "lunch", "safai", "jharoo", "bill",
        "wasool", "wasooli", "udhar", "udhaar", "naqad", "cash", "pe", "se", "ko", "ka", "ne", "la", "mangwaya",
        "das", "hazar", "hazaar", "so", "sau", "dhai", "dedh", "sadhe", "saadhe", "diya", "liye", "khatay", "mein", "daal", "likh", "lo", "dia", "ha", "hai", "rupees", "rs", "rupay", "rupaye", "doodh",
        "gyarah", "girayah", "giyarah", "gyara", "giraya", "barah", "bara", "teerah", "tera", "choudah", "chauda", "pandrah", "pandra", "soolah", "sola", "satrah", "satra", "athaarah", "athara", "unnees", "unnis", "bees", "bis", "pachees", "pachis", "lakh", "laakh"
    }

    # 1. Clean numbers and spoken Urdu number phrases from search string
    clean_text = re.sub(r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b', '', text)
    for phrase in sorted(URDU_NUMBERS.keys(), key=len, reverse=True):
        clean_text = re.sub(r'\b' + re.escape(phrase) + r'\b', '', clean_text, flags=re.IGNORECASE)

    # 2. Heuristic pattern extraction for Urdu names: "Muhammad Asad ko", "Saad ko", "Ali Raza se", etc.
    match = re.search(r'\b([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,2})\b\s+(?:ka|ko|se|ne|la)\b', clean_text, re.IGNORECASE)
    if match:
        raw_candidate = match.group(1).strip()
        words = [w for w in raw_candidate.split() if w.lower() not in stop_words]
        if words:
            return " ".join(words).title()

    # 3. Fallback: spaCy PERSON entity sanitized
    if hasattr(doc, "ents"):
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                clean_ent = re.sub(r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b', '', ent.text)
                words = [w for w in clean_ent.split() if w.lower() not in stop_words]
                if words:
                    return " ".join(words).title()

    return "Gahak"

@app.get("/")
def health_check():
    return {"status": "ok", "service": "DigiHisab Local Roman-Urdu NLU Engine"}

@app.post("/parse")
def parse_voice_transcript(req: VoiceRequest):
    text = req.transcript.strip()
    doc = nlp(text)
    
    action = detect_action(text)
    amount = extract_amount(text)
    name = extract_person_name(doc, text)
    
    # Map to double-entry system types
    entry_type_map = {
        "RECORD_UDHAAR": "RECEIVABLE",
        "RECORD_WASOOLI": "SETTLEMENT",
        "RECORD_CASH_SALE": "CASH_IN",
        "RECORD_STORE_EXPENSE": "CASH_OUT",
        "RECORD_SUPPLIER_CREDIT": "PAYABLE"
    }
    
    return {
        "success": True,
        "action": action,
        "entryType": entry_type_map.get(action, "RECEIVABLE"),
        "counterpartyName": name if action in ["RECORD_UDHAAR", "RECORD_WASOOLI", "RECORD_SUPPLIER_CREDIT"] or (name and name != "Gahak") else None,
        "amount": amount,
        "rawTranscript": text
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
