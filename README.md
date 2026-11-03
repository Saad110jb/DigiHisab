# DigiHisab

> **DigiHisab Technologies** — Smart Financial Management for Retailers, Households & Commercial Marts across Pakistan.

DigiHisab is a high-precision, institutional-grade digital ledger, point-of-sale (POS), and dual-entry accounting ecosystem. Built to integrate seamlessly with Pakistan's national payment rails (Raast P2M, JazzCash, EasyPaisa, PayFast 3DS, and 1LINK/PayPak cards).

---

## 🌟 Key Features

- **Dukandar Retail & POS**: Rapid barcode scanning, daily bahi-khata udhaar limits, automated WhatsApp payment collection links with instant Raast P2M QR codes.
- **Ghar Ka Hisab**: Domestic household budgeting, Kameti savings envelopes, elderly medication alerts, and automated Zakat & Nisab calculators.
- **Pro Malik Sentinel**: Real-time cash drawer discrepancy detection, manager PIN overrides, forensic shift audit trails, and theft prevention.
- **Enterprise Mandi Mart**: Multi-counter terminal synchronization, wholesale commission (Aarthi) ledger, freight reconciliation, and multi-warehouse SKU tracking.
- **Offline-First Resilience**: Encrypted local SQLite engine ensuring uninterrupted operations during broadband outages, syncing seamlessly once online.
- **Public Compliance & Audit Ready**: 7-day unconditional 100% money-back guarantee, SECP incorporation disclosures, and zero data resale guarantee.

---

## 🏗️ Monorepo Architecture

```text
DigiHisab/
├── frontend/             # Standalone public compliance, pricing & onboarding portal
├── khata-ai/
│   ├── frontend/         # React 19 + Vite + Tailwind CSS portal & web ledger dashboard
│   ├── mobile/           # Mobile cross-platform application (React Native / Expo)
│   ├── server-node/      # Backend API, webhooks & transaction reconciliation
│   └── service-ai/       # AI-powered receipt scanning & khata intelligence
└── README.md
```

---

## 🚀 Quick Start (Frontend Portal)

```bash
# Navigate to the frontend workspace
cd khata-ai/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 🔒 Compliance & Governance

- **SECP Registered Entity**: DigiHisab Technologies (Private) Limited
- **Federal Board of Revenue (FBR)**: Active Taxpayer NTN: `9283011-4`
- **Supported Rails**: Raast P2M, 1LINK PayPak, JazzCash, EasyPaisa, Visa / Mastercard
- **Refund Policy**: 7-Day 100% reimbursement to originating payment channel
- **Support Helpline**: `+92 318 9663004` | `muhammad110jb@gmail.com`
