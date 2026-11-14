export type AdminRole =
  | 'ROOT_SUPERADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'DISPUTE_RESOLVER'
  | 'FINANCIAL_AUDITOR';

export interface IAdminUser {
  id: string; // e.g. "ADM-101"
  name: string; // e.g. "SuperAdmin Account #01"
  label?: string; // e.g. "SuperAdmin Account #01"
  email: string;
  role: AdminRole;
  designation: string;
  department: string;
  node?: string;
  passwordText?: string;
  totpSecret?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ON_LEAVE';
  lastLoginAt: string;
  lastLoginIp: string;
  twoFactorEnforced: boolean;
  totalActionsLogged: number;
  avatarUrl?: string;
}

export type AdminModuleKey =
  | 'COCKPIT'
  | 'FORENSIC_EXPLORER'
  | 'MERCHANTS_REGISTRY'
  | 'KYC_DOCUMENTS'
  | 'SUB_METERS_TARIFFS'
  | 'APP_VERSIONING'
  | 'DISPUTES_COMPLAINTS'
  | 'BROADCAST_DISPATCHER'
  | 'FORENSIC_SECURITY'
  | 'FRAUD_SENTINEL'
  | 'FINANCIAL_RECONCILIATION'
  | 'RBAC_MANAGEMENT'
  | 'AUDIT_LOGS'
  | 'MARKETING_INTELLIGENCE'
  | 'SUBSCRIPTION_ENGINE';

export interface IRolePermission {
  moduleKey: AdminModuleKey;
  moduleName: string;
  route: string;
  canRead: boolean;
  canWrite: boolean;
  canOverride: boolean;
  isReadOnly: boolean;
  description: string;
}
