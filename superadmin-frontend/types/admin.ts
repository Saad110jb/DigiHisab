export type UserPersona = 'DUKANDAR' | 'HOUSEHOLD';

export type UserTier = 
  | 'FREE' 
  | 'GHAR_HUB_150' 
  | 'DUKANDAR_POS_200' 
  | 'PRO_MALIK_250' 
  | 'ANNUAL_PRO_2500';

export type UserAccountStatus = 'ACTIVE' | 'KYC_PENDING' | 'FROZEN' | 'BLOCKED';

export interface AdminUserRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cnic: string;
  isCnicVerified: boolean;
  persona: UserPersona;
  entityName: string;
  city: string;
  tier: UserTier;
  tierExpiry: string;
  status: UserAccountStatus;
  failedPinAttempts: number;
  volumePKR: number;
  balancePKR: number;
  lastActive: string;
  locationStatus?: 'GPS_VERIFIED' | 'SAFE_MODE' | 'UNPROMPTED' | 'DIASPORA_EXEMPT';
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  geofenceRadiusMeters?: number;
  lastKnownIp?: string;
}

export interface AdminUsersApiMeta {
  totalRecords: number;
  pendingKycCount: number;
  frozenCount: number;
  currentPage: number;
  totalPages: number;
}

export interface AdminUsersApiResponse {
  success: boolean;
  data: {
    users: AdminUserRecord[];
    meta: AdminUsersApiMeta;
  };
}

export interface KycActionPayload {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface FreezeActionPayload {
  status: 'FROZEN' | 'ACTIVE';
  reason?: string;
}

export interface GrantTierPayload {
  tier: UserTier;
  days: number;
  bypassReason?: string;
}

export interface ResetPinPayload {
  deliveryMethod: 'SMS_OTP' | 'WHATSAPP_OTP' | 'EMAIL_OTP';
}

export interface SendEmailPayload {
  recipientType: 'SELECTED_USERS' | 'AUDIENCE';
  userIds?: string[];
  audience?: 'ALL' | 'DUKANDAR' | 'HOUSEHOLD';
  subject: string;
  templateType: 'OTP' | 'WELCOME' | 'CUSTOM' | 'KYC_REMINDER';
  customBody?: string;
  customBodyUrdu?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface IAdminUserRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  cnicNumber?: string;
  isCnicVerified: boolean;
  persona: UserPersona;
  businessOrHomeName: string;
  city: string;
  currentTier: UserTier;
  tierExpiresAt?: string;
  status: UserAccountStatus;
  failedPinAttempts: number;
  totalCustomersOrMembers: number;
  totalRecordedVolumePKR: number;
  currentVaultBalancePKR: number;
  activeDevicesCount: number;
  lastActiveAt: string;
  createdAt: string;
  locationStatus?: 'GPS_VERIFIED' | 'SAFE_MODE' | 'UNPROMPTED' | 'DIASPORA_EXEMPT';
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  geofenceRadiusMeters?: number;
  lastKnownIp?: string;
}

export interface IAdminComplaint {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  personaType: UserPersona;
  category: 'PAYMENT_GATEWAY' | 'KHATA_DISPUTE' | 'LEDGER_SYNC' | 'ACCOUNT_ACCESS' | 'SUB_METER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'REJECTED';
  title: string;
  description: string;
  transactionReference?: string;
  createdAt: string;
  resolvedAt?: string;
  deviceModel?: string;
  appVersion?: string;
}

export interface INotificationBroadcastPayload {
  title: string;
  titleUrdu?: string;
  body: string;
  bodyUrdu?: string;
  channel: 'FCM_PUSH' | 'IN_APP_TOAST' | 'BOTH';
  targetAudience: 'ALL' | 'DUKANDAR' | 'HOUSEHOLD' | 'CUSTOM';
  customUserIds?: string[];
  deepLinkRoute?: string;
  importance: 'HIGH' | 'DEFAULT';
}

export interface ISecurityOverrideLog {
  id: string;
  storeId: string;
  storeName: string;
  cashierName: string;
  approverRole: 'MALIK' | 'FAMILY_HEAD';
  actionType: string;
  deltaAmount?: number;
  ipAddress: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface IGatewayTransactionAudit {
  basketId: string;
  gatewayName: 'PAYFAST' | 'JAZZCASH_DIRECT' | 'RAAST_P2M';
  gatewayTxnId: string;
  userPhone: string;
  userName: string;
  tierId: UserTier;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_IPN';
  rawResponsePayload: Record<string, any>;
  createdAt: string;
}

export interface IJournalEntryAudit {
  id: string;
  voucherNumber: string;
  userId: string;
  userName: string;
  description: string;
  totalDebitPKR: number;
  totalCreditPKR: number;
  isBalanced: boolean;
  timestamp: string;
}

// ==========================================
// FORENSIC EXPLORER & SBP AUDIT TYPES
// ==========================================

export type AccountHeadType =
  | 'CASH_IN_HAND'
  | 'BANK_ACCOUNTS'
  | 'CUSTOMER_RECEIVABLES'
  | 'SUPPLIER_PAYABLES'
  | 'SALES_REVENUE'
  | 'OPERATIONAL_EXPENSE';

export interface IRawJournalEntry {
  id: string;
  voucherRef: string;
  timestamp: string;
  branchName: string;
  branchCity: string;
  entityPersona: 'DUKANDAR' | 'HOUSEHOLD';
  accountHead: AccountHeadType;
  accountSubCategory: string;
  narration: string;
  counterpartyName?: string;
  debitPKR: number;
  creditPKR: number;
  runningBalancePKR: number;
  isBalanced: boolean;
  hashSha256: string;
}

export type OmniEntityCategory =
  | 'MERCHANT'
  | 'HOUSEHOLD'
  | 'CUSTOMER_KHATA'
  | 'VOUCHER'
  | 'TRANSACTION'
  | 'SUB_METER'
  | 'BANK_IBAN';

export interface OmniSearchResult {
  id: string;
  category: OmniEntityCategory;
  title: string;
  subtitle: string;
  matchKey: string;
  matchValue: string;
  statusBadge?: string;
  linkUrl: string;
  meta: Record<string, any>;
}

export interface ITableAuditorRow {
  tableName: string;
  description: string;
  rowCount: number;
  dataSizeMB: number;
  indexSizeMB: number;
  totalSizeMB: number;
  primaryIndex: string;
  lastVacuumAt: string;
  status: 'HEALTHY' | 'OPTIMIZATION_RECOMMENDED';
}

export interface IDatabaseHealthMetrics {
  databaseEngine: string;
  totalStorageUsedGB: number;
  totalStorageAllocatedGB: number;
  indexCacheHitRatio: number;
  avgQueryLatencyMs: number;
  activeConnections: number;
  maxConnections: number;
  tables: ITableAuditorRow[];
}

export interface ISbpAuditRecord {
  stan: string; // Systems Trace Audit Number (6 digits)
  rrn: string; // Retrieval Reference Number (12 digits)
  transactionUuid: string;
  merchantName: string;
  merchantCnic: string;
  merchantNtn: string;
  remitterIbanOrPhone: string;
  beneficiaryIbanOrWallet: string;
  amountPKR: number;
  currency: 'PKR';
  channel: 'OTC_CASH' | 'POS_DIGITAL' | 'RAAST_P2M' | 'JAZZCASH_IPN' | 'EASYPAISA';
  settlementStatus: 'SETTLED' | 'PENDING' | 'REVERSED';
  timestampPkt: string;
  timestampUtc: string;
  tamperProofFingerprint: string;
}

// ==========================================
// DOCUMENT & KYC INTELLIGENCE DESK TYPES
// ==========================================

export type KycSubmissionStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRING_SOON'
  | 'EXPIRED';

export type NadraVerisysMockStatus =
  | 'VERIFIED'
  | 'PENDING_CHECK'
  | 'MISMATCH'
  | 'FAILED';

export interface ICnicOcrDetails {
  cnicNumber: string;
  fullName: string;
  fatherOrHusbandName: string;
  dateOfBirth: string; // DD.MM.YYYY
  issueDate: string; // DD.MM.YYYY
  expiryDate: string; // DD.MM.YYYY
  gender: 'M' | 'F' | 'OTHER';
  familyTreeNumber?: string;
  addressUrdu?: string;
  confidenceScore: number; // 0 - 100%
  extractedAt: string;
}

export interface IKycDocumentRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userPersona: UserPersona;
  entityName: string;
  city: string;
  frontImageUrl: string;
  backImageUrl: string;
  status: KycSubmissionStatus;
  ocrDetails: ICnicOcrDetails;
  profileComparison: {
    cnicMatch: boolean;
    nameMatch: boolean;
    dobMatch: boolean;
    overallConfidence: number; // %
  };
  nadraVerisys: {
    status: NadraVerisysMockStatus;
    simulatedLookupId: string;
    biometricMatchScore: number; // e.g. 96.5%
    lastCheckedAt: string;
    remarks: string;
  };
  expiryStatus: {
    expiryDate: string;
    daysRemaining: number;
    isExpiringWithin30Days: boolean;
    isExpired: boolean;
  };
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
