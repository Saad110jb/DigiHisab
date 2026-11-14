import fs from 'fs';
import path from 'path';
import { IAdminUser, AdminRole, AdminModuleKey, IRolePermission } from '@/types/rbac';

const RBAC_STATE_PATH = path.join(process.cwd(), '.admin-rbac-state.json');

// 1. Initial Admin Users Seed
export let ADMIN_USERS_STORE: IAdminUser[] = [
  {
    id: 'SA_01',
    name: 'Root Console Sentinel',
    label: 'Root Console Gateway (Node 00)',
    email: 'admin.root@digihisab.pk',
    role: 'ROOT_SUPERADMIN',
    designation: 'Zero-Trust Sentinel',
    department: 'Platform Architecture & Security',
    node: 'Zero-Trust Master Console',
    passwordText: 'Root@Sentinel#2026',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-14 15:30 PKT',
    lastLoginIp: '39.40.112.5 (Lahore, PK)',
    twoFactorEnforced: true,
    totalActionsLogged: 320,
  },
  {
    id: 'ADM-101',
    name: 'SuperAdmin Account #01',
    label: 'SuperAdmin Master Node',
    email: 'admin.node01@digihisab.pk',
    role: 'ROOT_SUPERADMIN',
    designation: 'SuperAdmin',
    department: 'Platform Architecture & SBP Core',
    node: 'Platform Architecture & SBP Core',
    passwordText: 'dGh$92!kM99#xP04',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-05 19:30 PKT',
    lastLoginIp: '39.40.112.5 (Lahore, PK)',
    twoFactorEnforced: true,
    totalActionsLogged: 147,
  },
  {
    id: 'ADM-102',
    name: 'SuperAdmin Account #02',
    label: 'SuperAdmin Node #02',
    email: 'admin.node02@digihisab.pk',
    role: 'ROOT_SUPERADMIN',
    designation: 'SuperAdmin',
    department: 'Regulatory Compliance & Verification',
    node: 'Regulatory Compliance & Verification',
    passwordText: 'zL8&mK22@vT7#qR1',
    totpSecret: 'HXDMVJECJJWSRZ3U',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-05 18:45 PKT',
    lastLoginIp: '182.185.130.4 (Islamabad, PK)',
    twoFactorEnforced: true,
    totalActionsLogged: 87,
  },
  {
    id: 'ADM-103',
    name: 'SuperAdmin Account #03',
    label: 'SuperAdmin Node #03',
    email: 'admin.node03@digihisab.pk',
    role: 'ROOT_SUPERADMIN',
    designation: 'SuperAdmin',
    department: 'Khata Drop-off & Customer Care',
    node: 'Merchant Settlement & Reconciliation',
    passwordText: 'wQ4#vN81!kP5$xL9',
    totpSecret: 'KRSXG5CTMVRXEZLU',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-05 17:20 PKT',
    lastLoginIp: '175.107.240.12 (Karachi, PK)',
    twoFactorEnforced: true,
    totalActionsLogged: 64,
  },
  {
    id: 'ADM-104',
    name: 'SuperAdmin Account #04',
    label: 'SuperAdmin Node #04',
    email: 'admin.node04@digihisab.pk',
    role: 'ROOT_SUPERADMIN',
    designation: 'SuperAdmin',
    department: 'Treasury, Raast IPN & Utility Audit',
    node: 'Treasury, Raast IPN & Utility Audit',
    passwordText: 'jR7$bT39&mX2#vK6',
    totpSecret: 'ORSXG5BAMJXXK2LU',
    status: 'ACTIVE',
    lastLoginAt: '2026-11-05 16:15 PKT',
    lastLoginIp: '39.40.112.90 (Faisalabad, PK)',
    twoFactorEnforced: true,
    totalActionsLogged: 39,
  },
];

// Active Admin Session (Default to Root SuperAdmin)
export let ACTIVE_ADMIN_ID: string = 'ADM-101';

// 2. Comprehensive Role Permission Matrix Definition
export const ROLE_PERMISSIONS: Record<AdminRole, IRolePermission[]> = {
  ROOT_SUPERADMIN: [
    { moduleKey: 'COCKPIT', moduleName: 'Financial Cockpit', route: '/admin', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Master MRR, GMV & Health' },
    { moduleKey: 'FORENSIC_EXPLORER', moduleName: 'Forensic Explorer', route: '/admin/explorer', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Omni-Search, Ledger & SBP Audit' },
    { moduleKey: 'MERCHANTS_REGISTRY', moduleName: 'Merchants & Registry', route: '/admin/users', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Dukandar & Gharana Registry' },
    { moduleKey: 'KYC_DOCUMENTS', moduleName: 'Document & KYC Desk', route: '/admin/documents', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Smart CNIC OCR & Verisys' },
    { moduleKey: 'SUB_METERS_TARIFFS', moduleName: 'Sub-Meters & Tariffs', route: '/admin/tariffs', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'DISCO Slabs, Water & Gas Splitter' },
    { moduleKey: 'APP_VERSIONING', moduleName: 'App Versioning & Flags', route: '/admin/app-versions', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Min Version, Kill Switches & Maintenance' },
    { moduleKey: 'DISPUTES_COMPLAINTS', moduleName: 'Disputes & Complaints', route: '/admin/complaints', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Khata, Drop-offs & Sub-meters' },
    { moduleKey: 'BROADCAST_DISPATCHER', moduleName: 'Broadcast Dispatcher', route: '/admin/notifications', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Push Tray + SMTP Marketing' },
    { moduleKey: 'FORENSIC_SECURITY', moduleName: 'Forensic Security', route: '/admin/security', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'PIN Tamper & Ledger Integrity' },
    { moduleKey: 'FRAUD_SENTINEL', moduleName: 'Fraud & Sentinel', route: '/admin/fraud', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Ghost Txns, Collusion & Shortage' },
    { moduleKey: 'FINANCIAL_RECONCILIATION', moduleName: 'SaaS & Reconciliation', route: '/admin/finance', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'JazzCash, PayFast & Raast' },
    { moduleKey: 'RBAC_MANAGEMENT', moduleName: 'RBAC & Team Desk', route: '/admin/rbac', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Admin Roles & Access Control' },
    { moduleKey: 'AUDIT_LOGS', moduleName: 'Audit Log Trail', route: '/admin/audit-logs', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Forensic Immutable Action History' },
    { moduleKey: 'MARKETING_INTELLIGENCE', moduleName: 'Marketing Intelligence', route: '/admin/marketing', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Growth, Regional Density & UTM Attribution' },
    { moduleKey: 'SUBSCRIPTION_ENGINE', moduleName: 'Subscriptions & Feature Gates', route: '/admin/subscriptions', canRead: true, canWrite: true, canOverride: true, isReadOnly: false, description: 'Dynamic Pricing, AI Bundles & Master Kill-Switch' },
  ],
  COMPLIANCE_OFFICER: [
    { moduleKey: 'KYC_DOCUMENTS', moduleName: 'Document & KYC Desk', route: '/admin/documents', canRead: true, canWrite: true, canOverride: false, isReadOnly: false, description: 'Smart CNIC OCR & Verisys Verification' },
    { moduleKey: 'MERCHANTS_REGISTRY', moduleName: 'Merchants & Registry', route: '/admin/users', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only Merchant CNIC Audit' },
    { moduleKey: 'FRAUD_SENTINEL', moduleName: 'Fraud & Sentinel', route: '/admin/fraud', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Suspicious CNIC Fraud Telemetry' },
    { moduleKey: 'AUDIT_LOGS', moduleName: 'Audit Log Trail', route: '/admin/audit-logs', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Compliance Audit Trail' },
  ],
  DISPUTE_RESOLVER: [
    { moduleKey: 'DISPUTES_COMPLAINTS', moduleName: 'Disputes & Complaints', route: '/admin/complaints', canRead: true, canWrite: true, canOverride: false, isReadOnly: false, description: 'Customer & Merchant Ticket Resolution' },
    { moduleKey: 'AUDIT_LOGS', moduleName: 'Audit Log Trail', route: '/admin/audit-logs', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Dispute Arbitration Trail' },
  ],
  FINANCIAL_AUDITOR: [
    { moduleKey: 'COCKPIT', moduleName: 'Financial Cockpit', route: '/admin', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only GMV, MRR & Volume' },
    { moduleKey: 'FINANCIAL_RECONCILIATION', moduleName: 'SaaS & Reconciliation', route: '/admin/finance', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only Gateway & Raast Settlement' },
    { moduleKey: 'FORENSIC_EXPLORER', moduleName: 'Forensic Explorer', route: '/admin/explorer', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only JEV Ledger Inspection' },
    { moduleKey: 'SUB_METERS_TARIFFS', moduleName: 'Sub-Meters & Tariffs', route: '/admin/tariffs', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only DISCO Slab Inspection' },
    { moduleKey: 'FRAUD_SENTINEL', moduleName: 'Fraud & Sentinel', route: '/admin/fraud', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only Till Discrepancies' },
    { moduleKey: 'AUDIT_LOGS', moduleName: 'Audit Log Trail', route: '/admin/audit-logs', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Full Read & Export of SBP Audit Trail' },
    { moduleKey: 'MARKETING_INTELLIGENCE', moduleName: 'Marketing Intelligence', route: '/admin/marketing', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only Growth, CAC & Regional LTV' },
    { moduleKey: 'SUBSCRIPTION_ENGINE', moduleName: 'Subscriptions & Feature Gates', route: '/admin/subscriptions', canRead: true, canWrite: false, canOverride: false, isReadOnly: true, description: 'Read-only Plans, MRR & Pricing Audit' },
  ],
};

function saveStateToDisk() {
  try {
    const data = {
      ADMIN_USERS_STORE,
      ACTIVE_ADMIN_ID,
    };
    fs.writeFileSync(RBAC_STATE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(RBAC_STATE_PATH)) {
      const raw = fs.readFileSync(RBAC_STATE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.ADMIN_USERS_STORE) ADMIN_USERS_STORE = parsed.ADMIN_USERS_STORE;
      if (parsed.ACTIVE_ADMIN_ID) ACTIVE_ADMIN_ID = parsed.ACTIVE_ADMIN_ID;
    }
  } catch (err) {}
}

loadStateFromDisk();

export function getActiveAdmin(): IAdminUser {
  loadStateFromDisk();
  const found = ADMIN_USERS_STORE.find((u) => u.id === ACTIVE_ADMIN_ID);
  return found || ADMIN_USERS_STORE[0];
}

export function setActiveAdmin(id: string): IAdminUser {
  loadStateFromDisk();
  const found = ADMIN_USERS_STORE.find((u) => u.id === id);
  if (found) {
    ACTIVE_ADMIN_ID = id;
    saveStateToDisk();
    return found;
  }
  return ADMIN_USERS_STORE[0];
}

export function getAdminUsers(): IAdminUser[] {
  loadStateFromDisk();
  return ADMIN_USERS_STORE;
}

export function updateAdminRole(id: string, newRole: AdminRole): IAdminUser | null {
  loadStateFromDisk();
  const user = ADMIN_USERS_STORE.find((u) => u.id === id);
  if (user) {
    user.role = newRole;
    saveStateToDisk();
    return user;
  }
  return null;
}

export function updateAdminPassword(id: string, newPassword: string): IAdminUser | null {
  loadStateFromDisk();
  const user = ADMIN_USERS_STORE.find((u) => u.id === id);
  if (user) {
    user.passwordText = newPassword;
    saveStateToDisk();
    return user;
  }
  return null;
}

export function regenerateAdmin2FA(id: string): { user: IAdminUser; newSecret: string } | null {
  loadStateFromDisk();
  const user = ADMIN_USERS_STORE.find((u) => u.id === id);
  if (user) {
    // Generate 16-char base32 TOTP secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    user.totpSecret = secret;
    user.twoFactorEnforced = true;
    saveStateToDisk();
    return { user, newSecret: secret };
  }
  return null;
}

export function incrementAdminActionCount(adminId: string) {
  loadStateFromDisk();
  const user = ADMIN_USERS_STORE.find((u) => u.id === adminId);
  if (user) {
    user.totalActionsLogged = (user.totalActionsLogged || 0) + 1;
    saveStateToDisk();
  }
}

/**
 * Evaluates whether a role is permitted to access a given URL pathname
 */
export function checkRouteAccess(role: AdminRole, pathname: string): {
  allowed: boolean;
  isReadOnly: boolean;
  moduleName?: string;
  reason?: string;
} {
  const permissions = ROLE_PERMISSIONS[role] || [];

  // Match root exactly or prefix
  const matched = permissions.find((p) => {
    if (p.route === '/admin') {
      return pathname === '/admin' || pathname === '/admin/';
    }
    return pathname === p.route || pathname.startsWith(p.route + '/');
  });

  if (!matched) {
    return {
      allowed: false,
      isReadOnly: false,
      reason: `آپ کا ایڈمن رول (${role.replace('_', ' ')}) اس ماڈیول تک رسائی کا مجاز نہیں ہے۔ برائے مہربانی روٹ ایڈمن سے رابطہ کریں۔`,
    };
  }

  return {
    allowed: true,
    isReadOnly: matched.isReadOnly,
    moduleName: matched.moduleName,
  };
}
