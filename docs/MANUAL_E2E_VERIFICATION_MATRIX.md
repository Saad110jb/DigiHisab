# DigiHisab: Comprehensive End-to-End (E2E) Manual Verification Matrix

This document provides a field-tested, step-by-step verification checklist for QA engineers, product managers, and store owners. It validates real-time synchronization between the **SuperAdmin Control Center (Redis/DB)** and the user-facing **Dukandar Retail POS** and **Household Ghar Ka Hisab** applications.

---

## Pre-Test Environment Setup
1. **SuperAdmin URL**: `http://localhost:3000` (Next.js Root Console)
2. **Backend API**: `http://localhost:5000/api/v1` (Express/Node Gateway)
3. **Mobile Client**: Expo Go or Android APK connected to local Wi-Fi LAN
4. **Primary Test Account**: `03009663004` (Muhammad Saad Store)
5. **SuperAdmin Root Handle**: `admin.root@digihisab.pk` / `Password123!`

---

## Verification Matrix (10 Core Modules)

### Module 1: SuperAdmin Zero-Trust Authentication & 2FA (`/admin/login`)

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M1.1** | Unauthenticated Redirection | Open an Incognito window. Type `http://localhost:3000/admin`. Press Enter. | Immediate redirect to `/admin/login`. URL query preserves redirect intent. | [ ] |
| **M1.2** | Credential Challenge | Enter email `admin.root@digihisab.pk` and password. Click `[ Continue to 2FA Challenge ]`. | Transitions smoothly to 6-digit TOTP input card (`000 000`). | [ ] |
| **M1.3** | Invalid TOTP Token | Enter wrong code `000000`. Click Submit. | Red alert: "Invalid TOTP or expired token". Access denied. | [ ] |
| **M1.4** | Valid TOTP Authorization | Enter correct 6-digit Authenticator code (or test bypass `123456`). | Sets `HttpOnly` session cookie; redirects to `/admin` dashboard. | [ ] |
| **M1.5** | Anonymous Directory | Navigate to `/admin/security`. Inspect Admin Directory. | Zero personal headshots or consumer names. Node labels only (`SA_01`, `SA_02`). Eye icon reveals/masks password. | [ ] |
| **M1.6** | Emergency Session Invalidation | Under `/admin/settings` (Security tab), click `[ Invalidate All Sessions ]`. Refresh any open `/admin` tab. | All session tokens purged from Redis. Open tabs immediately forced back to `/admin/login`. | [ ] |

---

### Module 2: Dynamic Subscriptions & Persona Access Gates (`/admin/subscriptions`)

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M2.1** | Freemium Quota (20 Khata Cap) | Log in as Free Starter Dukandar. Add 20 customers to Khata ledger. Attempt to add customer #21. | Modal appears: "20-Khata Limit Reached". Blocked with upgrade prompt to Dukandar Standard. | [ ] |
| **M2.2** | Cross-Persona: Ghar ➔ POS | Log in with Household persona. Attempt to open Retail POS `/dukandar/pos` or record a customer debt. | Blocked with `Cross-Persona Restricted`. Prompts upgrade to Dual-Persona VIP (Rs. 750). | [ ] |
| **M2.3** | Cross-Persona: POS ➔ Ghar | Log in with Dukandar persona. Attempt to open Household Sub-Meter or Kameti tools. | Blocked with `Cross-Persona Restricted`. | [ ] |
| **M2.4** | Dual-Persona VIP Master | Log in as a `DUAL_VIP_750` user. Switch between Dukan and Ghar tabs. | Both POS and Household hubs open seamlessly. Sub-account manager allows up to 10 cashier/family users. | [ ] |
| **M2.5** | Dynamic Price Sync | In SuperAdmin, update Dukandar Standard price from `Rs. 250` to `Rs. 300`. Open mobile app subscription modal. | Mobile modal immediately displays `Rs. 300` without requiring an app store update. | [ ] |

---

### Module 3: Live Settings Propagation & Kill-Switches (`/admin/settings`)

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M3.1** | Master Paywall Kill-Switch | In SuperAdmin General Settings, toggle **Enforce Subscription Paywalls** to `OFF`. Click `Save`. | Redis publishes `SUBSCRIPTION_ENFORCEMENT=OFF`. Mobile client changes badge to `مفت فعال`. Customer #21+ added freely without paywall. | [ ] |
| **M3.2** | Emergency Maintenance Interceptor | In SuperAdmin, toggle **Platform Maintenance Mode** to `ON`. Open mobile or user web portal. | User portal immediately displays bilingual maintenance screen. SuperAdmin (`/admin/*`) remains fully accessible. | [ ] |
| **M3.3** | Operational Threshold Sync | Update `Chor Nazar Alert Threshold` to `Rs. 1,000`. In mobile POS, simulate a till discrepancy of `Rs. 800`. | No alert triggered. Increase discrepancy to `Rs. 1,200` ➔ Alert triggered immediately. | [ ] |

---

### Module 4: Payment Lifecycle & Webhook Gateways

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M4.1** | Manual Pilot TID Submission | In mobile checkout, select `Pro Malik (Rs. 400)`. Enter test TID `9988776655`. Click Submit. | State set to `PENDING_APPROVAL`. Re-submitting the same TID shows error: "TID already submitted". | [ ] |
| **M4.2** | SuperAdmin Approval Desk | In SuperAdmin Payment Approvals, locate TID `9988776655`. Click `[ Approve & Unlock Plan ]`. | User's tier instantly transitions to `ACTIVE`, unlocking Pro features and setting 30-day expiry. | [ ] |
| **M4.3** | Easypaisa Gateway Callback | Send mock POST webhook to `/api/v1/payments/easypaisa/callback` with `responseCode: 0000`. | Webhook activates subscription, logs financial transaction, and sends push receipt. | [ ] |
| **M4.4** | 1-Click WhatsApp Udhaar Link | In customer ledger, generate payment link for `Rs. 1,850`. Tap `Send WhatsApp`. | WhatsApp opens with pre-filled Urdu message and secure invoice payment link. | [ ] |
| **M4.5** | Udhaar Webhook Clearance | Trigger successful payment webhook for the above invoice. | Customer udhaar balance drops to `Rs. 0`. Dukandar available liquidity increments by `Rs. 1,850`. | [ ] |

---

### Module 5: JEV Double-Entry Engine & Safe OPEX Guardian

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M5.1** | Double-Entry Balancing Law | Attempt posting a manual JEV voucher where Debit (`Rs. 5,000`) != Credit (`Rs. 4,500`). | Blocked with `422 Unbalanced Voucher`. Difference must equal zero. | [ ] |
| **M5.2** | Safe Daily OPEX Budget Meter | Open `Dukan Daily Kharcha`. Enter an expense amount within safe limit (`Rs. 500`). | Progress gauge stays in green (`🟢 محفوظ حد Safe`). Submit button is active in sticky footer. | [ ] |
| **M5.3** | Overbudget Warning & PIN Gate | Enter an expense amount exceeding 30-day profit margin (`Rs. 8,000`). | Gauge turns red (`🔴 بجٹ ختم Overbudget`). System requires Manager PIN before logging. | [ ] |
| **M5.4** | Wholesale PO Auto-Accrual | Approve a Wholesale PO of `Rs. 51,240`. Inspect ledger. | Automated JEV posted: Debit `Inventory Stock`, Credit `Wholesaler Accounts Payable`. | [ ] |

---

### Module 6: Dukandar Retail POS, Barcode Scanner & Cash Galla

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M6.1** | Rapid 60 FPS Barcode Scanning | Open Barcode Scanner modal. Point camera at product barcode. | Audio beep triggers, laser pulses, item adds to floating cart with 1200ms debounce. | [ ] |
| **M6.2** | Manual Barcode Fallback | Cover camera or tap `Keyboard` icon in scanner header. | Opens clean manual input keypad. Entering barcode/name and tapping `Add` populates cart cleanly. | [ ] |
| **M6.3** | Galla Bandi Reconciliation | Open evening Galla Bandi modal. Input note counts (e.g. 2 x 5000, 5 x 1000 = 15,000). | Correctly calculates physical vs expected cash. Flags Surplus, Shortage, or Exact Match cleanly. | [ ] |
| **M6.4** | Sticky Footer Navigation | Scroll down on small Android device with 3-button navigation bar (`||| O <`). | Primary action buttons (`Done & Charge`, `Galla Bandi Submit`) remain anchored and never cut off. | [ ] |

---

### Module 7: Chor Nazar Sentinel & Fraud Detection Radar

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M7.1** | Till Shortage Alert | Complete Galla Bandi with a shortage of `Rs. 1,500` (threshold: Rs. 1,000). | Red alert banner triggers in owner dashboard; high-priority push notification dispatched. | [ ] |
| **M7.2** | Rapid Credit Surge Freeze | Log 4 high-value credit sales to the same customer within 10 minutes. | Customer risk tier elevated to `HIGH`. Credit limit locks until unlocked by Owner PIN. | [ ] |
| **M7.3** | Offline SQLite Sync | Turn off Wi-Fi/Mobile Data on phone. Record 3 cash sales. Re-enable internet. | App operates without crashing. When online, transactions automatically sync without duplication. | [ ] |

---

### Module 8: Household (Ghar Ka Hisab) Domestic Ledger & Utilities

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M8.1** | Sub-Meter Slab Calculation | Open Sub-Meter calculator. Enter Previous: `1200`, Current: `1350`, Tariff: `Rs. 52.00`. | Net: 150 units. Total Bill: `Rs. 7,800`. Generates downloadable Urdu tenant receipt slip. | [ ] |
| **M8.2** | Kameti Committee Cycle | Set up a 10-member Kameti of `Rs. 10,000/mo`. Advance cycle to Month 4. | Calculates monthly pot (`Rs. 100,000`). Logs lucky draw recipient and flags overdue members. | [ ] |
| **M8.3** | Kitchen Grocery Runway | Input total kitchen pantry stock and daily burn rate. | Displays live remaining runway in days. Warns if runway drops below 7 days. | [ ] |

---

### Module 9: Roman Urdu AI Voice & WhatsApp Taqaza Generator

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M9.1** | Roman Urdu Speech Recognition | Speak or type: `"Rashid se 1200 wasool kiye aur 300 ka petrol kharcha likho"`. | AI parses two entries: Recovery `Rs. 1,200` (Rashid) and Expense `Rs. 300` (Petrol). | [ ] |
| **M9.2** | Taqaza Polite Reminder | Select customer with 3 days overdue debt. Generate `POLITE` reminder. | Generates courteous Urdu text with payment link. Tapping WhatsApp launches chat. | [ ] |
| **M9.3** | Taqaza Final Notice | Select customer with 30+ days overdue debt. Generate `FINAL_NOTICE`. | Generates firm reminder stating SBP credit reporting warning. | [ ] |

---

### Module 10: State Bank of Pakistan (SBP) CNIC KYC Compliance & Audit Logs

| Test ID | Test Scenario | Step-by-Step Execution | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **M10.1** | CNIC Smart Card Upload | Open KYC verification. Capture CNIC front image. Submit for review. | Status updates to `UNDER_REVIEW`. Unverified transaction limits apply (`Rs. 25,000`). | [ ] |
| **M10.2** | SuperAdmin KYC Approval | In SuperAdmin ID Checks desk, locate document `DOC_001`. Click `[ Approve CNIC ]`. | Mobile profile status transitions to `VERIFIED`. SBP transaction ceiling unlocked. | [ ] |
| **M10.3** | Immutable Audit Trail | In SuperAdmin, toggle a feature switch and adjust a customer balance. Check `/admin/audit-logs`. | Audit record contains timestamp, admin node ID, IP address, old value, and new value. | [ ] |

---

## Sign-Off & Release Approval

* **QA Lead Signature**: ___________________________
* **Engineering Lead Signature**: ___________________________
* **Release Date**: November 14, 2026
* **Build Target**: DigiHisab v2.4.1 (Web & Mobile)
