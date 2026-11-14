import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ISubscriptionTier,
  IGlobalSystemFlags,
  IFeatureGate,
  IPricingAuditLog,
  ISubscriptionSummary
} from '@/types/subscription';

const STATE_FILE_PATH = path.join(process.cwd(), '.admin-subscriptions-state.json');

// Helper to compute SHA-256 hash
function computeAuditHash(prevHash: string, data: Record<string, any>): string {
  const payload = prevHash + JSON.stringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const GENESIS_HASH = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';

// 1. Master System Flags
export let GLOBAL_SYSTEM_FLAGS: IGlobalSystemFlags = {
  subscriptionEnforcementActive: true,
  maintenanceMode: false,
  allowGrandfatheredPricing: true
};

// 2. Global Feature Gates
export let GLOBAL_FEATURE_GATES: IFeatureGate[] = [
  {
    id: 'FG-01',
    key: 'FEATURE_VOICE_AI_ENTRY',
    labelUrdu: 'رومن اردو وائس کھاتہ اندراج',
    labelEnglish: 'Roman Urdu Voice AI Khata',
    description: 'Roman Urdu Whisper speech-to-text ledger transcription for counter sales',
    category: 'AI_AUTOMATION',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-02',
    key: 'FEATURE_AI_TAGAZA_TONES',
    labelUrdu: 'خودکار واٹس ایپ تقاضا ٹونز',
    labelEnglish: 'AI Udhaar Recovery Tagaza Generator',
    description: 'Generates polite, firm, or urgent recovery messages with direct PayFast links',
    category: 'AI_AUTOMATION',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-03',
    key: 'FEATURE_AI_STOCK_PREDICTOR',
    labelUrdu: 'اے آئی منشی اسٹاک و منڈی ڈیمانڈ پیشگوئی',
    labelEnglish: 'AI Munshi Stock & Mandi Demand Predictor',
    description: 'Predicts wholesale procurement need for FMCG and grains based on sales velocity',
    category: 'AI_AUTOMATION',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-04',
    key: 'FEATURE_AI_TILL_ANOMALY',
    labelUrdu: 'چور نظر اے آئی کیش دراز فرق الرٹ',
    labelEnglish: 'Chor Nazar AI Till Anomaly Detection',
    description: 'Real-time alert when physical till drawer does not match digital vouchers',
    category: 'SECURITY',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-05',
    key: 'FEATURE_WHATSAPP_PAYLINK',
    labelUrdu: 'ڈائریکٹ جاز کیش و پے فاسٹ لنک',
    labelEnglish: 'WhatsApp Direct Paylink Generation',
    description: 'Dispatches 1-tap payment links for instant debtor online settlement',
    category: 'PAYMENTS',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-06',
    key: 'FEATURE_THERMAL_PRINTING',
    labelUrdu: 'بلوٹوتھ تھرمل رسید پرنٹنگ',
    labelEnglish: 'Bluetooth Thermal Receipt Print',
    description: 'ESC/POS counter receipt and barcode printing for POS tablets',
    category: 'LEDGER',
    scope: 'DUKANDAR_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-07',
    key: 'FEATURE_RASHAN_FORECASTER',
    labelUrdu: 'سمارٹ راشن بجٹ فورکاسٹر',
    labelEnglish: 'Smart Rashan Budget Forecaster',
    description: 'Household grocery consumption predictor with utility inflation buffer',
    category: 'AI_AUTOMATION',
    scope: 'HOUSEHOLD_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-08',
    key: 'FEATURE_LESCO_SUBMETER',
    labelUrdu: 'کرایہ دار سب میٹر نیپرا سلیب بل کیلکولیٹر',
    labelEnglish: 'Sub-Meter Tenant NEPRA Splitter',
    description: 'Progressive electricity slab division across multi-portion domestic tenants',
    category: 'UTILITIES',
    scope: 'HOUSEHOLD_ONLY',
    isGloballyEnabled: true
  },
  {
    id: 'FG-09',
    key: 'FEATURE_KAMETI_TRACKER',
    labelUrdu: 'کمیٹی و گھریلو ملازمین تنخواہ ٹریکر',
    labelEnglish: 'Kameti & Domestic Staff Payroll',
    description: 'Digital monthly balloting, installment ledger, and maid advances',
    category: 'LEDGER',
    scope: 'HOUSEHOLD_ONLY',
    isGloballyEnabled: true
  }
];

// 3. Restructured 4-Tier Model + Free Starter (Financial Baseline: PKR 444,250 MRR / 1,385 Paid Subs / ARPU Rs. 320.76)
export let SUBSCRIPTION_TIERS_STORE: ISubscriptionTier[] = [
  {
    id: 'TIER-FREE',
    planKey: 'FREE_STARTER',
    name: 'Free Starter',
    nameUrdu: 'مفت بنیادی کھاتہ',
    personaScope: 'DUKANDAR_ONLY',
    pricePKR: 0,
    billingCycle: 'MONTHLY',
    trialDays: 30,
    isActive: true,
    isRecommended: false,
    quotas: {
      maxCustomers: 20,
      maxSubAccounts: 0,
      monthlyWhatsAppReminders: 30,
      maxVaultAccounts: 1
    },
    allowedFeatures: [],
    featuresList: [
      { key: 'MANUAL_KHATA', label: 'Manual Ledger Entries', labelUrdu: 'دستی اندراج', enabled: true, isAi: false },
      { key: 'MAX_20_KHATA', label: 'Up to 20 Customers Cap', labelUrdu: 'بیس کسٹمرز کی حد', enabled: true, isAi: false },
      { key: 'FEATURE_VOICE_AI_ENTRY', label: 'Roman Urdu Voice AI Khata', labelUrdu: 'وائس کھاتہ', enabled: false, isAi: true },
      { key: 'FEATURE_CHOR_NAZAR_AUDIT', label: 'Chor Nazar Cashier Audit', labelUrdu: 'چور نظر آڈٹ', enabled: false, isAi: true }
    ],
    activeSubscribers: 1260,
    mrrContributionPKR: 0,
    updatedAt: '2026-11-05'
  },
  {
    id: 'TIER-GHAR-200',
    planKey: 'GHAR_AI_PRO_200',
    name: 'Ghar Ka Hisab AI Pro',
    nameUrdu: 'گھر کا حساب پرو وائس پیک',
    personaScope: 'HOUSEHOLD_ONLY',
    pricePKR: 200,
    billingCycle: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    isRecommended: false,
    quotas: {
      maxCustomers: -1,
      maxSubAccounts: 2,
      monthlyWhatsAppReminders: 100,
      maxVaultAccounts: 3
    },
    allowedFeatures: [
      'FEATURE_RASHAN_FORECASTER',
      'FEATURE_LESCO_SUBMETER',
      'FEATURE_KAMETI_TRACKER'
    ],
    featuresList: [
      { key: 'VOICE_AI_NLU', label: 'Roman Urdu Voice AI Assistant', labelUrdu: 'وائس اے آئی معاون', enabled: true, isAi: true },
      { key: 'FEATURE_RASHAN_FORECASTER', label: 'Smart Rashan Budget Forecaster', labelUrdu: 'راشن بجٹ فورکاسٹر', enabled: true, isAi: true },
      { key: 'FEATURE_LESCO_SUBMETER', label: 'Sub-Meter Tenant Billing Splitter', labelUrdu: 'نیپرا سب میٹر کیلکولیٹر', enabled: true, isAi: false },
      { key: 'FEATURE_KAMETI_TRACKER', label: 'Kameti & Domestic Staff Tracker', labelUrdu: 'کمیٹی و ملازمین کھاتہ', enabled: true, isAi: false }
    ],
    activeSubscribers: 420,
    mrrContributionPKR: 84000,
    updatedAt: '2026-11-05'
  },
  {
    id: 'TIER-DUKAN-250',
    planKey: 'DUKAN_BASIC_250',
    name: 'Dukandar Retail Standard',
    nameUrdu: 'دکاندار بنیادی ریٹیل کھاتہ',
    personaScope: 'DUKANDAR_ONLY',
    pricePKR: 250,
    billingCycle: 'MONTHLY',
    trialDays: 14,
    isActive: true,
    isRecommended: true,
    quotas: {
      maxCustomers: -1,
      maxSubAccounts: 1,
      monthlyWhatsAppReminders: 500,
      maxVaultAccounts: 2
    },
    allowedFeatures: [
      'FEATURE_VOICE_AI_ENTRY',
      'FEATURE_AI_TAGAZA_TONES',
      'FEATURE_WHATSAPP_PAYLINK',
      'FEATURE_THERMAL_PRINTING'
    ],
    featuresList: [
      { key: 'FEATURE_VOICE_AI_ENTRY', label: 'AI Roman Urdu Voice Khata Entry', labelUrdu: 'وائس کھاتہ اندراج', enabled: true, isAi: true },
      { key: 'FEATURE_AI_TAGAZA_TONES', label: 'AI Udhaar Recovery Tagaza Generator', labelUrdu: 'اے آئی واٹس ایپ تقاضا', enabled: true, isAi: true },
      { key: 'UNLIMITED_KHATA', label: 'Unlimited Customer Khatas', labelUrdu: 'لامحدود کھاتے', enabled: true, isAi: false },
      { key: 'FEATURE_WHATSAPP_PAYLINK', label: 'WhatsApp PayFast Debt Links', labelUrdu: 'ادائیگی لنک جنریٹر', enabled: true, isAi: false },
      { key: 'FEATURE_THERMAL_PRINTING', label: 'Bluetooth Thermal Receipt Print', labelUrdu: 'تھرمل رسید پرنٹنگ', enabled: true, isAi: false }
    ],
    activeSubscribers: 510,
    mrrContributionPKR: 127500,
    updatedAt: '2026-11-05'
  },
  {
    id: 'TIER-DUKAN-400',
    planKey: 'DUKAN_PRO_MALIK_400',
    name: 'Dukandar Pro Malik Sentinel',
    nameUrdu: 'پرو مالک و چور نظر پیک',
    personaScope: 'DUKANDAR_ONLY',
    pricePKR: 400,
    billingCycle: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    isRecommended: false,
    quotas: {
      maxCustomers: -1,
      maxSubAccounts: 3,
      monthlyWhatsAppReminders: 2000,
      maxVaultAccounts: 5
    },
    allowedFeatures: [
      'FEATURE_VOICE_AI_ENTRY',
      'FEATURE_AI_TAGAZA_TONES',
      'FEATURE_AI_STOCK_PREDICTOR',
      'FEATURE_AI_TILL_ANOMALY',
      'FEATURE_CHOR_NAZAR_AUDIT',
      'FEATURE_WHATSAPP_PAYLINK',
      'FEATURE_THERMAL_PRINTING'
    ],
    featuresList: [
      { key: 'FEATURE_VOICE_AI_ENTRY', label: 'AI Roman Urdu Voice Khata Entry', labelUrdu: 'وائس کھاتہ اندراج', enabled: true, isAi: true },
      { key: 'FEATURE_AI_STOCK_PREDICTOR', label: 'AI Munshi Stock & Mandi Demand Predictor', labelUrdu: 'اے آئی اسٹاک فورکاسٹر', enabled: true, isAi: true },
      { key: 'FEATURE_AI_TILL_ANOMALY', label: 'Chor Nazar AI Till Anomaly Detection', labelUrdu: 'چور نظر کیش دراز فرق', enabled: true, isAi: true },
      { key: 'PIN_OVERRIDE', label: 'Manager Master PIN Overrides', labelUrdu: 'مینجر پن اوور رائیڈ', enabled: true, isAi: false },
      { key: 'CASHIER_ACCOUNTS_3', label: '3 Cashier / Sub-Account Terminals', labelUrdu: 'تین کیشئر ٹرمینلز', enabled: true, isAi: false }
    ],
    activeSubscribers: 310,
    mrrContributionPKR: 124000,
    updatedAt: '2026-11-05'
  },
  {
    id: 'TIER-DUAL-750',
    planKey: 'DUAL_VIP_750',
    name: 'Dual-Persona VIP Master',
    nameUrdu: 'ڈوئل وی آئی پی مکمل پیک (دکان + گھر)',
    personaScope: 'DUAL_ACCESS',
    pricePKR: 750,
    billingCycle: 'MONTHLY',
    trialDays: 7,
    isActive: true,
    isRecommended: false,
    quotas: {
      maxCustomers: -1,
      maxSubAccounts: 10,
      monthlyWhatsAppReminders: 5000,
      maxVaultAccounts: 10
    },
    allowedFeatures: [
      'FEATURE_VOICE_AI_ENTRY',
      'FEATURE_AI_TAGAZA_TONES',
      'FEATURE_AI_STOCK_PREDICTOR',
      'FEATURE_AI_TILL_ANOMALY',
      'FEATURE_CHOR_NAZAR_AUDIT',
      'FEATURE_WHATSAPP_PAYLINK',
      'FEATURE_THERMAL_PRINTING',
      'FEATURE_RASHAN_FORECASTER',
      'FEATURE_LESCO_SUBMETER',
      'FEATURE_KAMETI_TRACKER'
    ],
    featuresList: [
      { key: 'DUAL_PERSONA_SWITCH', label: '1-Tap Dukan + Gharana Fast Switch', labelUrdu: 'تیز تر پروفائل سوئچ', enabled: true, isAi: false },
      { key: 'ALL_PRO_MALIK', label: 'Complete Pro Malik Retail Sentinel', labelUrdu: 'مکمل پرو ملک پی او ایس', enabled: true, isAi: true },
      { key: 'ALL_GHAR_AI', label: 'Complete Household Voice AI Hub', labelUrdu: 'مکمل گھرانہ اے آئی ہب', enabled: true, isAi: true },
      { key: 'SUB_ACCOUNTS_10', label: '10 Cashier & Family Sub-Accounts', labelUrdu: 'دس سب اکاؤنٹس', enabled: true, isAi: false }
    ],
    activeSubscribers: 145,
    mrrContributionPKR: 108750,
    updatedAt: '2026-11-05'
  }
];

// 4. Price Change History Audit Logs
export let PRICING_AUDIT_LOGS_STORE: IPricingAuditLog[] = [
  {
    id: 'PAUDIT-001',
    tierId: 'TIER-DUKAN-250',
    tierPlanKey: 'DUKAN_BASIC_250',
    tierName: 'Dukandar Retail Standard',
    oldPricePKR: 200,
    newPricePKR: 250,
    changedBy: 'Hamza Malik (Root SuperAdmin)',
    role: 'ROOT_SUPERADMIN',
    timestamp: '2026-11-01 14:30 PKT',
    grandfatheredSubscribers: 510,
    sha256Hash: 'a7b3c9d1e2f458690123456789abcdef0123456789abcdef0123456789abcdef',
    reason: 'Bundled AI Voice Khata transcription and unlimited customer accounts'
  },
  {
    id: 'PAUDIT-002',
    tierId: 'TIER-DUKAN-400',
    tierPlanKey: 'DUKAN_PRO_MALIK_400',
    tierName: 'Dukandar Pro Malik Sentinel',
    oldPricePKR: 350,
    newPricePKR: 400,
    changedBy: 'Hamza Malik (Root SuperAdmin)',
    role: 'ROOT_SUPERADMIN',
    timestamp: '2026-10-20 18:15 PKT',
    grandfatheredSubscribers: 310,
    sha256Hash: 'f4e3d2c1b0a987654321fedcba0987654321fedcba0987654321fedcba098765',
    reason: 'Upgraded with Chor Nazar AI Anomaly Detection and Mandi Demand Forecaster'
  }
];

function saveStateToDisk() {
  try {
    const data = {
      GLOBAL_SYSTEM_FLAGS,
      GLOBAL_FEATURE_GATES,
      SUBSCRIPTION_TIERS_STORE,
      PRICING_AUDIT_LOGS_STORE
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.GLOBAL_SYSTEM_FLAGS) GLOBAL_SYSTEM_FLAGS = parsed.GLOBAL_SYSTEM_FLAGS;
      if (parsed.GLOBAL_FEATURE_GATES) GLOBAL_FEATURE_GATES = parsed.GLOBAL_FEATURE_GATES;
      if (parsed.SUBSCRIPTION_TIERS_STORE) SUBSCRIPTION_TIERS_STORE = parsed.SUBSCRIPTION_TIERS_STORE;
      if (parsed.PRICING_AUDIT_LOGS_STORE) PRICING_AUDIT_LOGS_STORE = parsed.PRICING_AUDIT_LOGS_STORE;
    }
  } catch (err) {}
}

loadStateFromDisk();

// Recalculates live financial telemetry
export function getSubscriptionSummary(): ISubscriptionSummary {
  loadStateFromDisk();
  const totalSubscribers = SUBSCRIPTION_TIERS_STORE.reduce((acc, t) => acc + t.activeSubscribers, 0);
  const paidTiers = SUBSCRIPTION_TIERS_STORE.filter((t) => t.pricePKR > 0);
  const totalPaidSubscribers = paidTiers.reduce((acc, t) => acc + t.activeSubscribers, 0);
  const totalMRR = SUBSCRIPTION_TIERS_STORE.reduce((acc, t) => acc + (t.isActive ? t.mrrContributionPKR : 0), 0);
  const blendedPaidArpu = totalPaidSubscribers > 0 ? Number((totalMRR / totalPaidSubscribers).toFixed(2)) : 0;

  return {
    totalMRR,
    totalSubscribers,
    totalPaidSubscribers,
    blendedPaidArpu,
    configuredPlansCount: SUBSCRIPTION_TIERS_STORE.length,
    systemEnforcementActive: GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive
  };
}

export function getTiers(): ISubscriptionTier[] {
  loadStateFromDisk();
  return SUBSCRIPTION_TIERS_STORE;
}

export function updateTierPrice(id: string, newPrice: number, adminName = 'Chaudhry SuperAdmin') {
  loadStateFromDisk();
  const tier = SUBSCRIPTION_TIERS_STORE.find((t) => t.id === id);
  if (tier) {
    const oldPrice = tier.pricePKR;
    tier.pricePKR = newPrice;
    tier.mrrContributionPKR = tier.activeSubscribers * newPrice;
    tier.updatedAt = new Date().toISOString().split('T')[0];

    // Record audit log
    const prevHash = PRICING_AUDIT_LOGS_STORE.length > 0
      ? PRICING_AUDIT_LOGS_STORE[PRICING_AUDIT_LOGS_STORE.length - 1].sha256Hash
      : GENESIS_HASH;

    const auditEntry: IPricingAuditLog = {
      id: `PAUDIT-${String(PRICING_AUDIT_LOGS_STORE.length + 1).padStart(3, '0')}`,
      tierId: tier.id,
      tierPlanKey: tier.planKey,
      tierName: tier.name,
      oldPricePKR: oldPrice,
      newPricePKR: newPrice,
      changedBy: adminName,
      role: 'ROOT_SUPERADMIN',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' PKT',
      grandfatheredSubscribers: tier.activeSubscribers,
      sha256Hash: computeAuditHash(prevHash, { tierId: tier.id, oldPrice, newPrice }),
      reason: `Direct SuperAdmin price override from PKR ${oldPrice} to PKR ${newPrice}`
    };

    PRICING_AUDIT_LOGS_STORE.unshift(auditEntry);
    saveStateToDisk();
    return tier;
  }
  return null;
}

export function toggleTierActive(id: string) {
  loadStateFromDisk();
  const tier = SUBSCRIPTION_TIERS_STORE.find((t) => t.id === id);
  if (tier) {
    tier.isActive = !tier.isActive;
    saveStateToDisk();
    return tier;
  }
  return null;
}

export function toggleTierFeature(tierId: string, featureKey: string) {
  loadStateFromDisk();
  const tier = SUBSCRIPTION_TIERS_STORE.find((t) => t.id === tierId);
  if (tier) {
    tier.featuresList = tier.featuresList.map((f) =>
      f.key === featureKey ? { ...f, enabled: !f.enabled } : f
    );
    if (tier.allowedFeatures.includes(featureKey)) {
      tier.allowedFeatures = tier.allowedFeatures.filter((k) => k !== featureKey);
    } else {
      tier.allowedFeatures.push(featureKey);
    }
    saveStateToDisk();
    return tier;
  }
  return null;
}

export function toggleMasterKillSwitch() {
  loadStateFromDisk();
  GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive = !GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive;
  saveStateToDisk();
  return GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive;
}

export function toggleGlobalFeatureFlag(key: string) {
  loadStateFromDisk();
  const feat = GLOBAL_FEATURE_GATES.find((f) => f.key === key);
  if (feat) {
    feat.isGloballyEnabled = !feat.isGloballyEnabled;
    saveStateToDisk();
    return feat;
  }
  return null;
}

export function createTier(tierData: Omit<ISubscriptionTier, 'id' | 'updatedAt' | 'mrrContributionPKR'>) {
  loadStateFromDisk();
  const newTier: ISubscriptionTier = {
    ...tierData,
    id: `TIER-CUSTOM-${String(SUBSCRIPTION_TIERS_STORE.length + 1).padStart(2, '0')}`,
    mrrContributionPKR: tierData.activeSubscribers * tierData.pricePKR,
    updatedAt: new Date().toISOString().split('T')[0]
  };
  SUBSCRIPTION_TIERS_STORE.push(newTier);
  saveStateToDisk();
  return newTier;
}

export function getAuditLogs(): IPricingAuditLog[] {
  loadStateFromDisk();
  return PRICING_AUDIT_LOGS_STORE;
}
