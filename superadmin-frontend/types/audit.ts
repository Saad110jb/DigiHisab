import { AdminRole } from './rbac';

export type AdminActionType =
  // KYC & Compliance
  | 'CNIC_MANUAL_VERIFY'
  | 'CNIC_REJECT_FRAUD'
  | 'NADRA_VERISYS_OVERRIDE'
  | 'MERCHANT_STATUS_MUTATION'
  // Versioning & Flags
  | 'FEATURE_FLAG_KILLED'
  | 'FEATURE_FLAG_RESTORED'
  | 'EMERGENCY_MAINTENANCE_TRIGGER'
  | 'EMERGENCY_MAINTENANCE_DEACTIVATE'
  | 'MIN_VERSION_CUTOFF_UPDATE'
  // Tariffs & Utilities
  | 'DISCO_SLAB_RATE_MUTATION'
  | 'SUB_METER_FORMULA_OVERRIDE'
  // Security & Fraud
  | 'MERCHANT_FORENSIC_FREEZE'
  | 'MERCHANT_PIN_RESET'
  | 'CHOR_NAZAR_TILL_OVERRIDE'
  // Disputes & Support
  | 'DISPUTE_RESOLVED_REFUND'
  | 'DISPUTE_ESCALATED'
  | 'WHATSAPP_DESK_DISPATCH'
  // RBAC & Team
  | 'ADMIN_ROLE_CHANGED'
  | 'ADMIN_INVITED'
  | 'ADMIN_DEACTIVATED'
  | 'SBP_AUDIT_REPORT_EXPORTED'
  // Marketing & Growth
  | 'BTL_COMMISSION_PAYOUT_SETTLED'
  | 'BTL_AGENT_ENROLLED'
  | 'PROMO_CODE_CREATED'
  // Subscriptions & Feature Gates
  | 'SUBSCRIPTION_PRICE_MUTATION'
  | 'SUBSCRIPTION_TIER_CREATED'
  | 'SUBSCRIPTION_TIER_TOGGLED'
  | 'SUBSCRIPTION_FEATURE_TOGGLED'
  | 'MASTER_SUBSCRIPTION_KILLSWITCH_TOGGLED'
  // Zero-Trust Auth & Platform Controls
  | 'ADMIN_LOGIN_FAILED'
  | 'SUPERADMIN_LOGIN_SUCCESS'
  | 'SUPERADMIN_LOGOUT'
  | 'GLOBAL_PLATFORM_CONFIG_UPDATED'
  | 'EMERGENCY_SECURITY_PURGE';

export type AuditSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface IAdminAuditLog {
  id: string; // e.g. "AUDIT-2026-98102"
  timestamp: string; // ISO string
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole: AdminRole;
  actionType: AdminActionType;
  deskModule: string; // e.g. "APP_VERSIONING", "KYC_DESK", "TARIFFS", "FRAUD_SENTINEL"
  targetEntityId: string; // e.g. "BUILD-210", "STORE-7789", "CNIC-35201-1234567-1"
  targetEntityName: string; // "Al-Madina General Store", "Build v2.2.0"
  previousState: Record<string, any> | null;
  newState: Record<string, any>;
  ipAddress: string; // e.g. "39.40.112.5"
  geoLocation: string; // "Lahore, Punjab, Pakistan"
  userAgent: string;
  severity: AuditSeverity;
  sha256Hash: string; // Cryptographic hash
  previousHash: string; // Chained SHA-256 hash for tamper prevention
}

export interface IAuditFilterParams {
  search?: string;
  role?: string;
  module?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
