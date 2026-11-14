# Digi Hisab SuperAdmin Dashboard

Zero-trust enterprise administration and sentinel control desk for **Digi Hisab**.
Exclusively targets Pakistani **Dukandar (Commercial Retail POS & Khata)** and **Household (Ghar Ka Hisab)** personas, completely omitting student/hostel components.

## Getting Started

```bash
cd superadmin-frontend
npm install
npm run dev
```

Visit [http://localhost:3000/admin](http://localhost:3000/admin) to view the SuperAdmin console.

## Architecture

```
app/(superadmin)/admin/
├── layout.tsx                     # Zero-trust Admin shell (Sidebar + System Telemetry)
├── page.tsx                       # Master Financial Cockpit (MRR, GMV, Gateway Health)
├── users/                         # Merchant & Household Management + SBP KYC Desk
│   ├── page.tsx                   # User Table with Filters, Inline KYC, & Actions
│   └── [id]/page.tsx              # Deep-dive Ledger Audit & Session Controller
├── complaints/                    # Dispute & Ticket Desk (Khata, Failed IPN, Sub-meter)
│   ├── page.tsx                   # Priority Queue & WhatsApp Resolver
│   └── [id]/page.tsx              # Diagnostic Ledger Inspector
├── notifications/                 # Broadcast Dispatcher (FCM Tray + In-App Ticker)
│   └── page.tsx                   # Push Dispatcher with Android Preview Frame
├── security/                      # Forensic Tamper Logs, Cashier Overrides, & Sentinel
│   └── page.tsx                   # Immutable Audit Trails & Brute-Force Unlock Desk
└── finance/                       # Subscriptions, Merchant Settlements, & Webhooks
    └── page.tsx                   # Gateway Reconciliation & Manual IPN Replayer
```
