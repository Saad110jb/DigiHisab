import {
  IRawJournalEntry,
  OmniSearchResult,
  IDatabaseHealthMetrics,
  ISbpAuditRecord,
  AccountHeadType
} from '@/types/admin';

// ==========================================
// 1. RAW JOURNAL ENTRY VOUCHERS (JEVs)
// ==========================================
export const INITIAL_RAW_JEV_ENTRIES: IRawJournalEntry[] = [
  {
    id: 'JEV_001',
    voucherRef: 'JV-2026-1049',
    timestamp: '2026-11-04 17:42:10 PKT',
    branchName: 'Saad store',
    branchCity: 'Faisalabad (Chak 110 JB)',
    entityPersona: 'DUKANDAR',
    accountHead: 'CASH_IN_HAND',
    accountSubCategory: 'Counter Cash Till #1',
    narration: 'Cash sale & daily wasooli settlement from customer batch A',
    counterpartyName: 'Chaudhry Akram (Karyana Customer)',
    debitPKR: 14500,
    creditPKR: 0,
    runningBalancePKR: 84500,
    isBalanced: true,
    hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'JEV_002',
    voucherRef: 'JV-2026-1049',
    timestamp: '2026-11-04 17:42:10 PKT',
    branchName: 'Saad store',
    branchCity: 'Faisalabad (Chak 110 JB)',
    entityPersona: 'DUKANDAR',
    accountHead: 'CUSTOMER_RECEIVABLES',
    accountSubCategory: 'Customer Udhaar Register',
    narration: 'Udhaar reduction on partial wasooli receipt',
    counterpartyName: 'Chaudhry Akram (Karyana Customer)',
    debitPKR: 0,
    creditPKR: 14500,
    runningBalancePKR: 35000,
    isBalanced: true,
    hashSha256: '9f83c6832cedc4322c4253da32a30d20546532fe32411329847b6826dd4ec456'
  },
  {
    id: 'JEV_003',
    voucherRef: 'JV-2026-1048',
    timestamp: '2026-11-04 15:18:22 PKT',
    branchName: 'Saad store',
    branchCity: 'Faisalabad (Chak 110 JB)',
    entityPersona: 'DUKANDAR',
    accountHead: 'SUPPLIER_PAYABLES',
    accountSubCategory: 'Akbari Mandi Wholesaler Khata',
    narration: 'Payment voucher for 50x 16kg Cooking Oil Ghee tins',
    counterpartyName: 'Habib Oil Mills Wholesale Agency',
    debitPKR: 120000,
    creditPKR: 0,
    runningBalancePKR: 45000,
    isBalanced: true,
    hashSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
  },
  {
    id: 'JEV_004',
    voucherRef: 'JV-2026-1048',
    timestamp: '2026-11-04 15:18:22 PKT',
    branchName: 'Saad store',
    branchCity: 'Faisalabad (Chak 110 JB)',
    entityPersona: 'DUKANDAR',
    accountHead: 'BANK_ACCOUNTS',
    accountSubCategory: 'Meezan Bank Corp (Raast Settled)',
    narration: 'IBFT Raast payment settlement to supplier IBAN',
    counterpartyName: 'Habib Oil Mills Wholesale Agency',
    debitPKR: 0,
    creditPKR: 120000,
    runningBalancePKR: 340000,
    isBalanced: true,
    hashSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d'
  },
  {
    id: 'JEV_005',
    voucherRef: 'JV-2026-1047',
    timestamp: '2026-11-04 13:05:44 PKT',
    branchName: 'Mehmood House #14',
    branchCity: 'Lahore (Model Town)',
    entityPersona: 'HOUSEHOLD',
    accountHead: 'BANK_ACCOUNTS',
    accountSubCategory: 'HBL Family Vault Account',
    narration: 'LESCO Sub-meter electric distribution split & domestic grocery withdrawal',
    counterpartyName: 'LESCO Sub-meter #8812-4B',
    debitPKR: 0,
    creditPKR: 28500,
    runningBalancePKR: 165000,
    isBalanced: true,
    hashSha256: 'b5a2c96250612366ac8b2731f8899a14993861ff39243752764ec5558661f432'
  },
  {
    id: 'JEV_006',
    voucherRef: 'JV-2026-1047',
    timestamp: '2026-11-04 13:05:44 PKT',
    branchName: 'Mehmood House #14',
    branchCity: 'Lahore (Model Town)',
    entityPersona: 'HOUSEHOLD',
    accountHead: 'OPERATIONAL_EXPENSE',
    accountSubCategory: 'Domestic Utility Allocation',
    narration: 'LESCO Sub-meter tenant & main household utility recognition',
    counterpartyName: 'LESCO Sub-meter #8812-4B',
    debitPKR: 28500,
    creditPKR: 0,
    runningBalancePKR: 28500,
    isBalanced: true,
    hashSha256: '6a80c85023730704443b7e77d07936a28292c20f18c89b3f03b9b47bbd940a45'
  },
  {
    id: 'JEV_007',
    voucherRef: 'JV-2026-1046',
    timestamp: '2026-11-04 10:14:02 PKT',
    branchName: 'Qudoos Medical & Superstore',
    branchCity: 'Karachi (Saddar)',
    entityPersona: 'DUKANDAR',
    accountHead: 'SALES_REVENUE',
    accountSubCategory: 'POS OTC Direct Counter Sales',
    narration: 'Bulk pharmaceutical sales & OTC cash receipt',
    counterpartyName: 'Walk-in Retail Cash Customers',
    debitPKR: 0,
    creditPKR: 64200,
    runningBalancePKR: 890000,
    isBalanced: true,
    hashSha256: '7d1a54127b222502f5b79b5fb0803061152a44f92b37e23c65dd0e336d10e77f'
  },
  {
    id: 'JEV_008',
    voucherRef: 'JV-2026-1046',
    timestamp: '2026-11-04 10:14:02 PKT',
    branchName: 'Qudoos Medical & Superstore',
    branchCity: 'Karachi (Saddar)',
    entityPersona: 'DUKANDAR',
    accountHead: 'CASH_IN_HAND',
    accountSubCategory: 'Central Cashier Safe Vault',
    narration: 'Till drawer cash deposit from pharmacy counter sales',
    counterpartyName: 'Walk-in Retail Cash Customers',
    debitPKR: 64200,
    creditPKR: 0,
    runningBalancePKR: 312000,
    isBalanced: true,
    hashSha256: 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2'
  },
  {
    id: 'JEV_009',
    voucherRef: 'JV-2026-1045',
    timestamp: '2026-11-03 21:30:15 PKT',
    branchName: 'Kamran Bakers & Store',
    branchCity: 'Jhang',
    entityPersona: 'DUKANDAR',
    accountHead: 'CUSTOMER_RECEIVABLES',
    accountSubCategory: 'Udhaar Book (Kacha Khata)',
    narration: 'Udhaar issued to local restaurant for bakery bulk order',
    counterpartyName: 'Madina Tikka & Shinwari Hotel',
    debitPKR: 18000,
    creditPKR: 0,
    runningBalancePKR: 42000,
    isBalanced: true,
    hashSha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
  },
  {
    id: 'JEV_010',
    voucherRef: 'JV-2026-1045',
    timestamp: '2026-11-03 21:30:15 PKT',
    branchName: 'Kamran Bakers & Store',
    branchCity: 'Jhang',
    entityPersona: 'DUKANDAR',
    accountHead: 'SALES_REVENUE',
    accountSubCategory: 'Wholesale Bakery Supply',
    narration: 'Recorded credit sale against restaurant ledger',
    counterpartyName: 'Madina Tikka & Shinwari Hotel',
    debitPKR: 0,
    creditPKR: 18000,
    runningBalancePKR: 215000,
    isBalanced: true,
    hashSha256: '13a404988e15a657a1d519b543fb38820114e4f10bf319fcdc8337078e023d81'
  }
];

// ==========================================
// 2. CROSS-ENTITY OMNI-SEARCH INDEX
// ==========================================
export const MASTER_SEARCH_RECORDS: OmniSearchResult[] = [
  // Merchants
  {
    id: 'USR_9921',
    category: 'MERCHANT',
    title: 'Muhammad Saad (Saad store)',
    subtitle: 'Dukandar POS • Faisalabad (Chak 110 JB)',
    matchKey: 'CNIC / Phone / Shop NTN',
    matchValue: '33101-2155778-3 | +923009663004 | NTN-7412980-3',
    statusBadge: 'ACTIVE • SBP VERIFIED',
    linkUrl: '/admin/users/USR_9921',
    meta: {
      cnic: '33101-2155778-3',
      phone: '+923009663004',
      ntn: 'NTN-7412980-3',
      city: 'Faisalabad',
      tier: 'PRO_MALIK_250'
    }
  },
  {
    id: 'USR_8812',
    category: 'HOUSEHOLD',
    title: 'Tariq Mehmood (Mehmood House #14)',
    subtitle: 'Ghar Ka Hisab • Model Town Block C, Lahore',
    matchKey: 'CNIC / Phone',
    matchValue: '35201-9876543-3 | +923014589211',
    statusBadge: 'KYC_PENDING',
    linkUrl: '/admin/users/USR_8812',
    meta: {
      cnic: '35201-9876543-3',
      phone: '+923014589211',
      city: 'Lahore',
      tier: 'GHAR_HUB_150'
    }
  },
  {
    id: 'USR_4409',
    category: 'MERCHANT',
    title: 'Haji Abdul Qudoos (Qudoos Medical)',
    subtitle: 'Commercial Pharmacy • Saddar, Karachi',
    matchKey: 'CNIC / NTN / Phone',
    matchValue: '42101-5544332-1 | +923334112288 | NTN-8821940-1',
    statusBadge: 'ACTIVE • PRO 2500',
    linkUrl: '/admin/users/USR_4409',
    meta: {
      cnic: '42101-5544332-1',
      phone: '+923334112288',
      ntn: 'NTN-8821940-1',
      city: 'Karachi'
    }
  },
  // Customer Khatas
  {
    id: 'CUST_4412',
    category: 'CUSTOMER_KHATA',
    title: 'Chaudhry Akram (Udhaar Customer)',
    subtitle: 'Karyana Udhaar Balance: Rs. 35,000 • Linked to Saad store',
    matchKey: 'Customer Phone / CNIC',
    matchValue: '03007654321 | 33101-4455667-1',
    statusBadge: 'CREDIT CEILING OK',
    linkUrl: '/admin/users/USR_9921',
    meta: {
      phone: '+923007654321',
      cnic: '33101-4455667-1',
      balance: 35000,
      limit: 50000
    }
  },
  {
    id: 'CUST_5590',
    category: 'CUSTOMER_KHATA',
    title: 'Madina Tikka & Shinwari Hotel',
    subtitle: 'Commercial Wholesale Khata • Rs. 42,000 Udhaar • Jhang',
    matchKey: 'Phone',
    matchValue: '03451122334',
    statusBadge: 'ACTIVE KHATA',
    linkUrl: '/admin/users/USR_6610',
    meta: {
      phone: '+923451122334',
      balance: 42000
    }
  },
  // Vouchers
  {
    id: 'JV-2026-1049',
    category: 'VOUCHER',
    title: 'Voucher Ref: JV-2026-1049',
    subtitle: 'Double-Entry Balanced (Rs. 14,500) • Saad store • Cash Wasooli',
    matchKey: 'Voucher Number',
    matchValue: 'JV-2026-1049',
    statusBadge: 'BALANCED JEV',
    linkUrl: '/admin/explorer?tab=jev&voucher=JV-2026-1049',
    meta: {
      debit: 14500,
      credit: 14500,
      branch: 'Saad store'
    }
  },
  {
    id: 'JV-2026-1048',
    category: 'VOUCHER',
    title: 'Voucher Ref: JV-2026-1048',
    subtitle: 'Double-Entry Balanced (Rs. 120,000) • Wholesale Oil Inventory',
    matchKey: 'Voucher Number',
    matchValue: 'JV-2026-1048',
    statusBadge: 'BALANCED JEV',
    linkUrl: '/admin/explorer?tab=jev&voucher=JV-2026-1048',
    meta: {
      debit: 120000,
      credit: 120000,
      branch: 'Saad store'
    }
  },
  // Transactions
  {
    id: 'TXN_9921_0491',
    category: 'TRANSACTION',
    title: 'Txn UUID: TXN_9921_0491',
    subtitle: 'Raast P2M Settlement • Rs. 84,500 • Meezan Corp Desk',
    matchKey: 'Transaction UUID',
    matchValue: 'TXN_9921_0491',
    statusBadge: 'SETTLED SBP',
    linkUrl: '/admin/finance',
    meta: {
      amount: 84500,
      gateway: 'RAAST_P2M'
    }
  },
  {
    id: 'TXN_8812_0102',
    category: 'TRANSACTION',
    title: 'Txn UUID: TXN_8812_0102',
    subtitle: 'JazzCash Direct OTC • Rs. 15,000 • Subscription Upgrade',
    matchKey: 'Transaction UUID',
    matchValue: 'TXN_8812_0102',
    statusBadge: 'CONFIRMED',
    linkUrl: '/admin/finance',
    meta: {
      amount: 15000,
      gateway: 'JAZZCASH_DIRECT'
    }
  },
  // Sub-meters
  {
    id: 'SM_8812_4B',
    category: 'SUB_METER',
    title: 'LESCO Sub-meter #8812-4B',
    subtitle: 'Domestic Distribution • Mehmood House #14, Model Town Lahore',
    matchKey: 'LESCO Sub-meter Serial',
    matchValue: 'LESCO-SM-8812-4B',
    statusBadge: 'ACTIVE METER',
    linkUrl: '/admin/users/USR_8812',
    meta: {
      serial: 'LESCO-SM-8812-4B',
      unitsThisMonth: 412,
      splitRatio: '60/40 Tenant'
    }
  },
  {
    id: 'SM_9921_2A',
    category: 'SUB_METER',
    title: 'FESCO Commercial Sub-meter #9921-2A',
    subtitle: 'Store Cold Storage & Deep Freezer • Saad store Faisalabad',
    matchKey: 'FESCO Sub-meter Serial',
    matchValue: 'FESCO-SM-9921-2A',
    statusBadge: 'ACTIVE METER',
    linkUrl: '/admin/users/USR_9921',
    meta: {
      serial: 'FESCO-SM-9921-2A',
      unitsThisMonth: 680
    }
  },
  // Bank IBANs
  {
    id: 'IBAN_MEEZAN_01',
    category: 'BANK_IBAN',
    title: 'Meezan Bank Corp (Raast Alias)',
    subtitle: 'Saad store Settlement Node • Branch Code 0204 (Jhang Rd)',
    matchKey: 'IBAN',
    matchValue: 'PK88MEZN0000002234567801',
    statusBadge: 'LINKED RAAST',
    linkUrl: '/admin/finance',
    meta: {
      iban: 'PK88MEZN0000002234567801',
      bank: 'Meezan Bank Limited'
    }
  },
  {
    id: 'IBAN_SCB_02',
    category: 'BANK_IBAN',
    title: 'Standard Chartered Bank',
    subtitle: 'Qudoos Medical Commercial Vault • Karachi I.I. Chundrigar',
    matchKey: 'IBAN',
    matchValue: 'PK36SCBL0000001123456701',
    statusBadge: 'LINKED RAAST',
    linkUrl: '/admin/finance',
    meta: {
      iban: 'PK36SCBL0000001123456701',
      bank: 'Standard Chartered Pakistan'
    }
  }
];

export function performOmniSearch(rawQuery: string): OmniSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  // Normalize phone numbers (e.g. 0300 -> +92300 or matching raw)
  const cleanPhone = query.replace(/[^0-9]/g, '');

  return MASTER_SEARCH_RECORDS.filter((rec) => {
    const titleMatch = rec.title.toLowerCase().includes(query);
    const subtitleMatch = rec.subtitle.toLowerCase().includes(query);
    const valueMatch = rec.matchValue.toLowerCase().includes(query);
    const idMatch = rec.id.toLowerCase().includes(query);

    let phoneMatch = false;
    if (cleanPhone.length >= 7 && rec.matchValue.replace(/[^0-9]/g, '').includes(cleanPhone)) {
      phoneMatch = true;
    }

    return titleMatch || subtitleMatch || valueMatch || idMatch || phoneMatch;
  });
}

// ==========================================
// 3. DATABASE HEALTH & TABLE AUDITOR METRICS
// ==========================================
export const MOCK_DB_HEALTH_METRICS: IDatabaseHealthMetrics = {
  databaseEngine: 'PostgreSQL 16.3 + MongoDB 7.0 Cluster',
  totalStorageUsedGB: 1.84,
  totalStorageAllocatedGB: 10.0,
  indexCacheHitRatio: 99.4,
  avgQueryLatencyMs: 12.8,
  activeConnections: 14,
  maxConnections: 50,
  tables: [
    {
      tableName: 'profiles',
      description: 'Dukandar merchant & Gharana household profiles',
      rowCount: 1420,
      dataSizeMB: 18.4,
      indexSizeMB: 4.2,
      totalSizeMB: 22.6,
      primaryIndex: 'idx_profiles_phone_cnic',
      lastVacuumAt: '2026-11-04 04:00 PKT',
      status: 'HEALTHY'
    },
    {
      tableName: 'counterparties',
      description: 'Customer udhaar registries & supplier wholesale accounts',
      rowCount: 48920,
      dataSizeMB: 84.2,
      indexSizeMB: 22.8,
      totalSizeMB: 107.0,
      primaryIndex: 'idx_counterparty_profile_phone',
      lastVacuumAt: '2026-11-04 04:00 PKT',
      status: 'HEALTHY'
    },
    {
      tableName: 'ledger_entries',
      description: 'Raw double-entry transactions (JEV debit/credit journals)',
      rowCount: 382410,
      dataSizeMB: 540.6,
      indexSizeMB: 142.1,
      totalSizeMB: 682.7,
      primaryIndex: 'idx_ledger_created_voucher_profile',
      lastVacuumAt: '2026-11-04 04:00 PKT',
      status: 'HEALTHY'
    },
    {
      tableName: 'invoices_ocr',
      description: 'Kacha Parcha OCR transcripts & optical scan blobs',
      rowCount: 24510,
      dataSizeMB: 412.0,
      indexSizeMB: 48.5,
      totalSizeMB: 460.5,
      primaryIndex: 'idx_invoices_profile_date',
      lastVacuumAt: '2026-11-03 04:00 PKT',
      status: 'OPTIMIZATION_RECOMMENDED'
    },
    {
      tableName: 'audit_logs',
      description: 'Immutable financial override audits & SBP compliance records',
      rowCount: 128900,
      dataSizeMB: 188.5,
      indexSizeMB: 39.8,
      totalSizeMB: 228.3,
      primaryIndex: 'idx_audit_profile_action_ts',
      lastVacuumAt: '2026-11-04 04:00 PKT',
      status: 'HEALTHY'
    },
    {
      tableName: 'sub_meters_utility',
      description: 'Domestic & commercial multi-tenant electrical unit splits',
      rowCount: 3200,
      dataSizeMB: 6.8,
      indexSizeMB: 1.9,
      totalSizeMB: 8.7,
      primaryIndex: 'idx_utility_serial_profile',
      lastVacuumAt: '2026-11-04 04:00 PKT',
      status: 'HEALTHY'
    }
  ]
};

// ==========================================
// 4. SBP TRANSACTION AUDIT TRAIL RECORDS
// ==========================================
export const MOCK_SBP_AUDIT_TRAIL: ISbpAuditRecord[] = [
  {
    stan: '009821',
    rrn: '261104009821',
    transactionUuid: 'TXN_9921_0491',
    merchantName: 'Saad store',
    merchantCnic: '33101-2155778-3',
    merchantNtn: 'NTN-7412980-3',
    remitterIbanOrPhone: 'PK36SCBL0000001123456701',
    beneficiaryIbanOrWallet: 'PK88MEZN0000002234567801',
    amountPKR: 84500,
    currency: 'PKR',
    channel: 'RAAST_P2M',
    settlementStatus: 'SETTLED',
    timestampPkt: '2026-11-04 17:42:10 PKT',
    timestampUtc: '2026-11-04T12:42:10.000Z',
    tamperProofFingerprint: 'SHA256:7a4f91c920ba11fe3b1c8e001948bd2148af712954a1bbcc9201948fec001842'
  },
  {
    stan: '009822',
    rrn: '261104009822',
    transactionUuid: 'TXN_9921_0492',
    merchantName: 'Saad store',
    merchantCnic: '33101-2155778-3',
    merchantNtn: 'NTN-7412980-3',
    remitterIbanOrPhone: '+923009663004',
    beneficiaryIbanOrWallet: 'PK33HABB0000009988776601',
    amountPKR: 120000,
    currency: 'PKR',
    channel: 'POS_DIGITAL',
    settlementStatus: 'SETTLED',
    timestampPkt: '2026-11-04 15:18:22 PKT',
    timestampUtc: '2026-11-04T10:18:22.000Z',
    tamperProofFingerprint: 'SHA256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
  },
  {
    stan: '009823',
    rrn: '261104009823',
    transactionUuid: 'TXN_8812_0102',
    merchantName: 'Mehmood House #14',
    merchantCnic: '35201-9876543-3',
    merchantNtn: 'N/A (HOUSEHOLD)',
    remitterIbanOrPhone: '+923014589211',
    beneficiaryIbanOrWallet: 'JAZZCASH_03014589211',
    amountPKR: 15000,
    currency: 'PKR',
    channel: 'JAZZCASH_IPN',
    settlementStatus: 'SETTLED',
    timestampPkt: '2026-11-04 13:05:44 PKT',
    timestampUtc: '2026-11-04T08:05:44.000Z',
    tamperProofFingerprint: 'SHA256:b5a2c96250612366ac8b2731f8899a14993861ff39243752764ec5558661f432'
  },
  {
    stan: '009824',
    rrn: '261104009824',
    transactionUuid: 'TXN_4409_0881',
    merchantName: 'Qudoos Medical & Superstore',
    merchantCnic: '42101-5544332-1',
    merchantNtn: 'NTN-8821940-1',
    remitterIbanOrPhone: 'OTC_WALKIN_CASH',
    beneficiaryIbanOrWallet: 'PK36SCBL0000001123456701',
    amountPKR: 64200,
    currency: 'PKR',
    channel: 'OTC_CASH',
    settlementStatus: 'SETTLED',
    timestampPkt: '2026-11-04 10:14:02 PKT',
    timestampUtc: '2026-11-04T05:14:02.000Z',
    tamperProofFingerprint: 'SHA256:f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2'
  },
  {
    stan: '009825',
    rrn: '261104009825',
    transactionUuid: 'TXN_6610_0221',
    merchantName: 'Kamran Bakers & Store',
    merchantCnic: '33100-8812399-7',
    merchantNtn: 'NTN-9912001-4',
    remitterIbanOrPhone: '+923456781290',
    beneficiaryIbanOrWallet: 'EASYPAISA_03456781290',
    amountPKR: 18000,
    currency: 'PKR',
    channel: 'EASYPAISA',
    settlementStatus: 'SETTLED',
    timestampPkt: '2026-11-03 21:30:15 PKT',
    timestampUtc: '2026-11-03T16:30:15.000Z',
    tamperProofFingerprint: 'SHA256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
  }
];
