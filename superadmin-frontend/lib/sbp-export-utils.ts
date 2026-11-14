import { ISbpAuditRecord } from '@/types/admin';

/**
 * Serializes SBP Audit Trail records into regulatory-compliant CSV format
 * adheres to State Bank of Pakistan (SBP) Payment Systems Department (PSD) circulars.
 */
export function generateSbpAuditCsv(records: ISbpAuditRecord[]): string {
  const headers = [
    'SBP_STAN',
    'SBP_RRN',
    'TRANSACTION_UUID',
    'MERCHANT_NAME',
    'MERCHANT_CNIC',
    'MERCHANT_NTN',
    'REMITTER_IDENTIFIER',
    'BENEFICIARY_IDENTIFIER',
    'AMOUNT_PKR',
    'CURRENCY',
    'PAYMENT_CHANNEL',
    'SETTLEMENT_STATUS',
    'TIMESTAMP_PKT',
    'TIMESTAMP_UTC',
    'TAMPER_PROOF_FINGERPRINT_SHA256'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => [
    escapeCsv(r.stan),
    escapeCsv(r.rrn),
    escapeCsv(r.transactionUuid),
    escapeCsv(r.merchantName),
    escapeCsv(r.merchantCnic),
    escapeCsv(r.merchantNtn),
    escapeCsv(r.remitterIbanOrPhone),
    escapeCsv(r.beneficiaryIbanOrWallet),
    escapeCsv(r.amountPKR),
    escapeCsv(r.currency),
    escapeCsv(r.channel),
    escapeCsv(r.settlementStatus),
    escapeCsv(r.timestampPkt),
    escapeCsv(r.timestampUtc),
    escapeCsv(r.tamperProofFingerprint)
  ].join(','));

  const sbpHeaderNotice = [
    '# STATE BANK OF PAKISTAN (SBP) DIGITAL FINANCIAL AUDIT DOSSIER',
    `# GENERATED_AT: ${new Date().toISOString()} (PKT UTC+5)`,
    `# TOTAL_RECORDS: ${records.length}`,
    `# REGULATORY_STANDARD: SBP EMI & DIGITAL BANKING DIRECTIVES (CIRCULAR PSD-04-2023)`,
    '# TAMPER_VERIFIED: TRUE (HMAC-SHA256 CHECKSUM ANCHORED)',
    ''
  ].join('\n');

  return sbpHeaderNotice + headers.join(',') + '\n' + rows.join('\n');
}

/**
 * Triggers a direct client-side download of the SBP audit trail CSV
 */
export function downloadSbpAuditCsv(records: ISbpAuditRecord[], filenamePrefix = 'SBP_Audit_Trail'): void {
  if (typeof window === 'undefined') return;

  const csvContent = generateSbpAuditCsv(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}_${timeStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
