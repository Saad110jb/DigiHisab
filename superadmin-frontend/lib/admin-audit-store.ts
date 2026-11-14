import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IAdminAuditLog, AdminActionType, AuditSeverity, IAuditFilterParams } from '@/types/audit';
import { getActiveAdmin, incrementAdminActionCount } from './admin-rbac-store';

const AUDIT_STATE_PATH = path.join(process.cwd(), '.admin-audit-state.json');

// Helper to compute SHA-256 chained hash
function computeLogHash(prevHash: string, data: Record<string, any>): string {
  const payload = prevHash + JSON.stringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const GENESIS_HASH = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';

// Pre-seeded Forensic Audit Trail
export let ADMIN_AUDIT_LOGS_STORE: IAdminAuditLog[] = [
  {
    id: 'AUDIT-2026-98101',
    timestamp: '2026-11-04T18:45:51.000Z',
    adminId: 'ADM-101',
    adminName: 'Hamza Malik',
    adminEmail: 'hamza.malik@digihisab.pk',
    adminRole: 'ROOT_SUPERADMIN',
    actionType: 'FEATURE_FLAG_RESTORED',
    deskModule: 'APP_VERSIONING',
    targetEntityId: 'FLAG-jazzcash_qr_scanner',
    targetEntityName: 'JazzCash QR Payment Gateway',
    previousState: { isEnabled: false, status: 'KILLED' },
    newState: { isEnabled: true, status: 'ENABLED', lastModifiedAt: '11:45:51 pm PKT' },
    ipAddress: '39.40.112.5',
    geoLocation: 'Lahore, Punjab, Pakistan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperAdmin-Console/2.4',
    severity: 'INFO',
    sha256Hash: 'a4b1c8f3099bce8920194bc0281ef84218a93902bb147829ac20190184b2c891',
    previousHash: GENESIS_HASH,
  },
  {
    id: 'AUDIT-2026-98094',
    timestamp: '2026-11-04T18:45:22.000Z',
    adminId: 'ADM-101',
    adminName: 'Hamza Malik',
    adminEmail: 'hamza.malik@digihisab.pk',
    adminRole: 'ROOT_SUPERADMIN',
    actionType: 'FEATURE_FLAG_KILLED',
    deskModule: 'APP_VERSIONING',
    targetEntityId: 'FLAG-jazzcash_qr_scanner',
    targetEntityName: 'JazzCash QR Payment Gateway',
    previousState: { isEnabled: true, status: 'ENABLED' },
    newState: { isEnabled: false, status: 'KILLED', outageReason: 'Simulated Gateway Outage' },
    ipAddress: '39.40.112.5',
    geoLocation: 'Lahore, Punjab, Pakistan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperAdmin-Console/2.4',
    severity: 'WARNING',
    sha256Hash: 'b5c2d9e4100cde9031205cd1392fa95329b04013cc258930bd31201295c3d902',
    previousHash: 'a4b1c8f3099bce8920194bc0281ef84218a93902bb147829ac20190184b2c891',
  },
  {
    id: 'AUDIT-2026-98080',
    timestamp: '2026-11-04T18:25:55.000Z',
    adminId: 'ADM-101',
    adminName: 'Hamza Malik',
    adminEmail: 'hamza.malik@digihisab.pk',
    adminRole: 'ROOT_SUPERADMIN',
    actionType: 'EMERGENCY_MAINTENANCE_TRIGGER',
    deskModule: 'APP_VERSIONING',
    targetEntityId: 'MAINTENANCE_SENTINEL',
    targetEntityName: 'All Pakistan POS Terminals',
    previousState: { isActive: false },
    newState: { isActive: true, durationMinutes: 45, estEndTime: '2026-11-04T19:10:55.815Z' },
    ipAddress: '39.40.112.5',
    geoLocation: 'Lahore, Punjab, Pakistan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperAdmin-Console/2.4',
    severity: 'CRITICAL',
    sha256Hash: 'c6d3e0f5211def0142316de2403fb06430c15124dd369041ce42312306d4e013',
    previousHash: 'b5c2d9e4100cde9031205cd1392fa95329b04013cc258930bd31201295c3d902',
  },
  {
    id: 'AUDIT-2026-98045',
    timestamp: '2026-11-04T17:15:30.000Z',
    adminId: 'ADM-102',
    adminName: 'Ayesha Khan',
    adminEmail: 'ayesha.khan@digihisab.pk',
    adminRole: 'COMPLIANCE_OFFICER',
    actionType: 'CNIC_MANUAL_VERIFY',
    deskModule: 'KYC_DOCUMENTS',
    targetEntityId: 'CNIC-35201-1928374-1',
    targetEntityName: 'Muhammad Saad (Al-Madina Karyana)',
    previousState: { kycStatus: 'PENDING_AUDIT', nadraVerified: false },
    newState: { kycStatus: 'VERIFIED', nadraVerified: true, verisysAuditRef: 'NADRA-PK-2026-904' },
    ipAddress: '182.185.130.4',
    geoLocation: 'Islamabad, ICT, Pakistan',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SBP-Compliance/2.4',
    severity: 'INFO',
    sha256Hash: 'd7e4f1a6322ef01253427ef3514ac17541d26235ee470152df53423417e5f124',
    previousHash: 'c6d3e0f5211def0142316de2403fb06430c15124dd369041ce42312306d4e013',
  },
  {
    id: 'AUDIT-2026-98010',
    timestamp: '2026-11-04T16:30:12.000Z',
    adminId: 'ADM-103',
    adminName: 'Bilal Tariq',
    adminEmail: 'bilal.tariq@digihisab.pk',
    adminRole: 'DISPUTE_RESOLVER',
    actionType: 'DISPUTE_RESOLVED_REFUND',
    deskModule: 'DISPUTES_COMPLAINTS',
    targetEntityId: 'TICKET-9081',
    targetEntityName: 'Sub-meter Water Pump Dispute #9081',
    previousState: { status: 'OPEN', disputedAmountPKR: 4500 },
    newState: { status: 'RESOLVED', adjustedAmountPKR: 2250, resolutionNote: 'Tenant portion split 50/50 approved' },
    ipAddress: '175.107.240.12',
    geoLocation: 'Karachi, Sindh, Pakistan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0',
    severity: 'WARNING',
    sha256Hash: 'e8f5a2b7433fa12364538fa4625bd28652e37346ff581263ea64534528f6a235',
    previousHash: 'd7e4f1a6322ef01253427ef3514ac17541d26235ee470152df53423417e5f124',
  },
  {
    id: 'AUDIT-2026-97990',
    timestamp: '2026-11-04T14:45:00.000Z',
    adminId: 'ADM-101',
    adminName: 'Hamza Malik',
    adminEmail: 'hamza.malik@digihisab.pk',
    adminRole: 'ROOT_SUPERADMIN',
    actionType: 'DISCO_SLAB_RATE_MUTATION',
    deskModule: 'SUB_METERS_TARIFFS',
    targetEntityId: 'DISCO-LESCO-UNPROTECTED',
    targetEntityName: 'LESCO 201-300 Unit Base Slab',
    previousState: { baseUnitRatePKR: 32.10 },
    newState: { baseUnitRatePKR: 33.10, gazetteSro: 'S.R.O. 279(I)/2026' },
    ipAddress: '39.40.112.5',
    geoLocation: 'Lahore, Punjab, Pakistan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperAdmin-Console/2.4',
    severity: 'CRITICAL',
    sha256Hash: 'f9a6b3c8544ab23475649ab5736ce39763f48457aa692374fb75645639a7b346',
    previousHash: 'e8f5a2b7433fa12364538fa4625bd28652e37346ff581263ea64534528f6a235',
  },
];

function saveStateToDisk() {
  try {
    fs.writeFileSync(AUDIT_STATE_PATH, JSON.stringify(ADMIN_AUDIT_LOGS_STORE, null, 2), 'utf8');
  } catch (err) {}
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(AUDIT_STATE_PATH)) {
      const raw = fs.readFileSync(AUDIT_STATE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        ADMIN_AUDIT_LOGS_STORE = parsed;
      }
    }
  } catch (err) {}
}

loadStateFromDisk();

export function recordAdminAction(params: {
  actionType: AdminActionType;
  deskModule: string;
  targetEntityId: string;
  targetEntityName: string;
  previousState: Record<string, any> | null;
  newState: Record<string, any>;
  severity?: AuditSeverity;
  ipAddress?: string;
  geoLocation?: string;
}): IAdminAuditLog {
  loadStateFromDisk();
  const activeAdmin = getActiveAdmin();

  const prevLog = ADMIN_AUDIT_LOGS_STORE[0];
  const previousHash = prevLog ? prevLog.sha256Hash : GENESIS_HASH;

  const now = new Date();
  const id = `AUDIT-2026-${Math.floor(10000 + Math.random() * 90000)}`;

  const logPayload = {
    id,
    timestamp: now.toISOString(),
    adminId: activeAdmin.id,
    adminName: activeAdmin.name,
    adminEmail: activeAdmin.email,
    adminRole: activeAdmin.role,
    actionType: params.actionType,
    deskModule: params.deskModule,
    targetEntityId: params.targetEntityId,
    targetEntityName: params.targetEntityName,
    previousState: params.previousState,
    newState: params.newState,
    ipAddress: params.ipAddress || activeAdmin.lastLoginIp.split(' ')[0] || '39.40.112.5',
    geoLocation: params.geoLocation || 'Lahore, Punjab, Pakistan',
    userAgent: 'SuperAdmin-Console/2.4 (Enterprise RBAC Audit Sentinel)',
    severity: params.severity || 'INFO',
  };

  const sha256Hash = computeLogHash(previousHash, logPayload);

  const newLog: IAdminAuditLog = {
    ...logPayload,
    sha256Hash,
    previousHash,
  };

  // Prepend to maintain reverse chronological order
  ADMIN_AUDIT_LOGS_STORE = [newLog, ...ADMIN_AUDIT_LOGS_STORE];
  saveStateToDisk();

  // Increment total action count for the admin user
  incrementAdminActionCount(activeAdmin.id);

  return newLog;
}

export function getAdminAuditLogs(filters: IAuditFilterParams = {}): {
  logs: IAdminAuditLog[];
  total: number;
  criticalCount: number;
  warningCount: number;
} {
  loadStateFromDisk();
  let list = [...ADMIN_AUDIT_LOGS_STORE];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.adminName.toLowerCase().includes(q) ||
        l.actionType.toLowerCase().includes(q) ||
        l.targetEntityName.toLowerCase().includes(q) ||
        l.targetEntityId.toLowerCase().includes(q) ||
        l.deskModule.toLowerCase().includes(q)
    );
  }

  if (filters.role && filters.role !== 'ALL') {
    list = list.filter((l) => l.adminRole === filters.role);
  }

  if (filters.module && filters.module !== 'ALL') {
    list = list.filter((l) => l.deskModule === filters.module);
  }

  if (filters.severity && filters.severity !== 'ALL') {
    list = list.filter((l) => l.severity === filters.severity);
  }

  const criticalCount = ADMIN_AUDIT_LOGS_STORE.filter((l) => l.severity === 'CRITICAL').length;
  const warningCount = ADMIN_AUDIT_LOGS_STORE.filter((l) => l.severity === 'WARNING').length;

  return {
    logs: list,
    total: list.length,
    criticalCount,
    warningCount,
  };
}

export function generateSbpAuditCsv(logs: IAdminAuditLog[]): string {
  const headers = [
    'Audit_ID',
    'Timestamp_UTC',
    'Admin_Name',
    'Admin_Email',
    'Admin_Role',
    'Module_Desk',
    'Action_Type',
    'Target_Entity_ID',
    'Target_Entity_Name',
    'IP_Address',
    'Geo_Location',
    'Severity',
    'SHA256_Hash',
    'Chained_Previous_Hash',
  ];

  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${l.timestamp}"`,
    `"${l.adminName}"`,
    `"${l.adminEmail}"`,
    `"${l.adminRole}"`,
    `"${l.deskModule}"`,
    `"${l.actionType}"`,
    `"${l.targetEntityId}"`,
    `"${l.targetEntityName.replace(/"/g, '""')}"`,
    `"${l.ipAddress}"`,
    `"${l.geoLocation}"`,
    `"${l.severity}"`,
    `"${l.sha256Hash}"`,
    `"${l.previousHash}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
