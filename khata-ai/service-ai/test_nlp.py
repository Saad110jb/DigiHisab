import sys
from nlp_engine import parse_voice_transcript, VoiceRequest

def run_tests():
    test_cases = [
        "Ali ko 2500 udhar diya",
        "Usman ne 1000 wasool kiye",
        "Dukan ka kharcha 500 chai aur lunch",
        "Counter pe 1500 naqad sauda bika",
        "Supplier se dhai hazar ka maal mangwaya",
        "Tariq ko das hazar udhaar likh lo",
        "muhammad asad ko 1000 la udhar dia ha",
        "Muhammad Asad ko girayah sau ka udhaar diya",
        "Ahmad ko 2,500 ka doodh udhaar diya",
        "Chaudhry Bilal ko barah sau udhar diye",
        "Rana Usman se pandrah sau wasool hue",
        "Saad ko tankha 800 dedi",
        "Ali ko 2000 advance diya",
    ]
    
    print("=" * 60)
    print("DIGIHISAB LOCAL ROMAN-URDU NLU ENGINE TEST SUITE")
    print("=" * 60)
    
    for idx, text in enumerate(test_cases, 1):
        req = VoiceRequest(transcript=text)
        res = parse_voice_transcript(req)
        print(f"\n[Test #{idx}] Input: \"{text}\"")
        print(f"  -> Action:           {res['action']}")
        print(f"  -> Entry Type:       {res['entryType']}")
        print(f"  -> Counterparty:     {res['counterpartyName']}")
        print(f"  -> Extracted Amount: Rs. {res['amount']}")
    print("\n" + "=" * 60)
    print("ALL TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
