export type PersonaScope = 'DUKANDAR_ONLY' | 'HOUSEHOLD_ONLY' | 'DUAL_ACCESS';

export type PlanIdentifier =
  | 'FREE_STARTER'
  | 'GHAR_AI_PRO_200'
  | 'DUKAN_BASIC_250'
  | 'DUKAN_PRO_MALIK_400'
  | 'DUAL_VIP_750';

export interface IGlobalSystemFlags {
  subscriptionEnforcementActive: boolean; // Master system-wide kill-switch
  maintenanceMode: boolean;
  allowGrandfatheredPricing: boolean;
}

export interface IFeatureGate {
  id: string;
  key: string;              // e.g., 'FEATURE_VOICE_AI_ENTRY', 'FEATURE_CHOR_NAZAR_AUDIT'
  labelUrdu: string;        // 'وائس کھاتہ اندراج'
  labelEnglish: string;     // 'Roman Urdu Voice AI Khata'
  description: string;
  category: 'AI_AUTOMATION' | 'SECURITY' | 'PAYMENTS' | 'LEDGER' | 'UTILITIES';
  scope: PersonaScope;
  isGloballyEnabled: boolean; // Master system kill-switch per feature
}

export interface ISubscriptionTierQuotas {
  maxCustomers: number;      // -1 denotes unlimited, 20 = free starter
  maxSubAccounts: number;    // Cashiers or Family members (0, 1, 3, 10)
  monthlyWhatsAppReminders: number;
  maxVaultAccounts: number;
}

export interface ISubscriptionTierFeatureConfig {
  key: string;
  label: string;
  labelUrdu: string;
  enabled: boolean;
  isAi: boolean;
}

export interface ISubscriptionTier {
  id: string;
  planKey: PlanIdentifier;
  name: string;
  nameUrdu: string;
  personaScope: PersonaScope;
  pricePKR: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  trialDays: number;
  isActive: boolean;         // Visibility toggle
  isRecommended: boolean;
  quotas: ISubscriptionTierQuotas;
  allowedFeatures: string[];
  featuresList: ISubscriptionTierFeatureConfig[];
  activeSubscribers: number;
  mrrContributionPKR: number;
  updatedAt: string;
}

export interface IPricingAuditLog {
  id: string;
  tierId: string;
  tierPlanKey: PlanIdentifier;
  tierName: string;
  oldPricePKR: number;
  newPricePKR: number;
  changedBy: string;
  role: string;
  timestamp: string;
  grandfatheredSubscribers: number;
  sha256Hash: string;
  reason: string;
}

export interface ISubscriptionSummary {
  totalMRR: number;
  totalSubscribers: number;
  totalPaidSubscribers: number;
  blendedPaidArpu: number;
  configuredPlansCount: number;
  systemEnforcementActive: boolean;
}
