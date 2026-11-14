export interface ICommercialCluster {
  clusterName: string;
  bazaarType: 'WHOLESALE_MANDI' | 'RETAIL_BAZAAR' | 'COMMERCIAL_CENTER';
  storeCount: number;
  densityPct: number;
  keyCommodities: string;
}

export interface ICityMarketingMetric {
  city: string;
  province: string;
  merchantsCount: number;
  householdsCount: number;
  totalAccounts: number;
  mrrPKR: number;
  cacPKR: number;
  ltvPKR: number;
  ltvCacRatio: number;
  conversionRatePct: number;
  grossRecordedTillPKR: number;
  digitalWalletSharePct: number;
  topCommercialClusters: ICommercialCluster[];
}

export type MarketingChannel =
  | 'META_ADS'
  | 'TIKTOK'
  | 'GOOGLE_SEARCH'
  | 'FIELD_SALES_AGENTS'
  | 'WHATSAPP_REFERRAL';

export interface ICampaignAttribution {
  id: string;
  campaignName: string;
  channel: MarketingChannel;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  totalSignups: number;
  paidConversions: number;
  conversionRatePct: number;
  cacPKR: number;
  totalSpendPKR: number;
  generatedMrrPKR: number;
  roasMultiplier: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string;
}

export interface IPromoCodeRecord {
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FLAT_PKR' | 'FREE_SMS_CREDITS';
  discountValue: number;
  cityRestricted?: string;
  totalRedemptions: number;
  maxRedemptions: number;
  totalSubsidizedBurnPKR: number;
  generatedMrrPKR: number;
  roiMultiplier: number;
  status: 'ACTIVE' | 'EXPIRED';
  expiryDate: string;
}

export interface IWhatsAppReferralMetric {
  merchantId: string;
  merchantName: string;
  businessName: string;
  city: string;
  invitedCount: number;
  convertedCount: number;
  earnedFreeMonths: number;
  kFactorContribution: number;
}

export interface ICohortRetentionRates {
  day1: number;
  day7: number;
  day14: number;
  day30: number;
  day60: number;
  day90: number;
}

export interface ICohortDataPoint {
  cohortMonth: string; // e.g. "2026-06", "2026-07"
  cohortSize: number;
  persona: 'DUKANDAR' | 'HOUSEHOLD' | 'ALL';
  retentionRates: ICohortRetentionRates;
}

export interface IPaywallFunnelStage {
  stepNumber: number;
  stageName: string;
  stageNameUrdu: string;
  description: string;
  accountsReached: number;
  conversionFromPreviousPct: number;
  overallDropoffPct: number;
}

export interface IChurnRiskStore {
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  city: string;
  persona: 'DUKANDAR' | 'HOUSEHOLD';
  daysInactive: number;
  previousMonthlyVolumePKR: number;
  churnRiskLevel: 'HIGH' | 'CRITICAL';
  recommendedReengagementUrdu: string;
}

export interface ISubscriptionTierLtv {
  tierId: string;
  tierName: string;
  targetPersona: string;
  priceMonthlyPKR: number;
  activeSubscribers: number;
  monthlyChurnRatePct: number;
  avgLifespanMonths: number;
  calculatedLtvPKR: number;
  marketSharePct: number;
}

export interface IUdhaarPaylinkFlywheel {
  linksDispatched: number;
  linksOpened: number;
  paymentsCompleted: number;
  postPaymentAppInstalls: number;
  subsequentLedgersCreated: number;
  flywheelConversionRatePct: number;
  organicMrrGeneratedPKR: number;
  kFactorContribution: number;
}

export interface IBtlAgentDistributor {
  code: string;
  agentName: string;
  assignedBazaar: string;
  city: string;
  phone: string;
  merchantsOnboarded: number;
  paidUpgrades: number;
  commissionRatePKR: number;
  totalEarnedPKR: number;
  settlementStatus: 'PAID' | 'PENDING';
  lastPayoutDate?: string;
}

export interface IFeatureUpgradeTrigger {
  featureKey: string;
  featureName: string;
  featureNameUrdu: string;
  description: string;
  totalTriggers: number;
  upgradesDriven: number;
  conversionEfficiencyPct: number;
  shareOfTotalUpgradesPct: number;
}

export interface IMarketingChannelMetric {
  id: string;
  channelName: string;
  category: 'VIRAL' | 'FIELD_AGENT' | 'PAID_ADS' | 'ORGANIC';
  totalAcquired: number;
  totalSpendPKR: number;
  cacPKR: number;
  day30RetentionPct: number;
  day90RetentionPct: number;
  estimatedLtvPKR: number;
  ltvCacRatio: number;
}

export interface IViralFlywheelStat {
  paylinksGenerated: number;
  invoiceViews: number;
  conversionsToAppSignup: number;
  conversionRatePct: number;
  topAdvocateStoreId: string;
  topAdvocateStoreName: string;
}

export interface IFieldAgentCommission {
  agentId: string;
  agentName: string;
  promoCode: string;
  assignedCity: string;
  totalSignups: number;
  verifiedActiveSignups: number;
  earnedCommissionPKR: number;
  payoutStatus: 'PENDING' | 'DISBURSED';
}

export interface ITopAdvocateMerchant {
  merchantId: string;
  merchantName: string;
  storeName: string;
  city: string;
  linksDispatched: number;
  billsPaidCount: number;
  newAccountsReferred: number;
  freeMonthsGranted: number;
  kFactor: number;
}
