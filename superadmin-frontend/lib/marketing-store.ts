import fs from 'fs';
import path from 'path';
import {
  ICityMarketingMetric,
  ICampaignAttribution,
  IPromoCodeRecord,
  IWhatsAppReferralMetric,
  ICohortDataPoint,
  IPaywallFunnelStage,
  IChurnRiskStore,
  ISubscriptionTierLtv,
  IUdhaarPaylinkFlywheel,
  IBtlAgentDistributor,
  IFeatureUpgradeTrigger,
  IMarketingChannelMetric,
  IViralFlywheelStat,
  IFieldAgentCommission,
  ITopAdvocateMerchant
} from '@/types/marketing';

const STATE_FILE_PATH = path.join(process.cwd(), '.admin-marketing-state.json');

// 1. Foundational Regional Baseline Breakdown
export let REGIONAL_METRICS_STORE: ICityMarketingMetric[] = [
  {
    city: 'Faisalabad',
    province: 'Punjab',
    merchantsCount: 420,
    householdsCount: 210,
    totalAccounts: 630,
    mrrPKR: 115500,
    cacPKR: 210,
    ltvPKR: 2400,
    ltvCacRatio: 11.43,
    conversionRatePct: 14.2,
    grossRecordedTillPKR: 48200000,
    digitalWalletSharePct: 24.2,
    topCommercialClusters: [
      { clusterName: 'Katchery Bazaar & Rail Bazaar', bazaarType: 'RETAIL_BAZAAR', storeCount: 182, densityPct: 64.0, keyCommodities: 'Yarn, Cloth, Karyana & FMCG' },
      { clusterName: 'Ghalla Mandi Faisalabad', bazaarType: 'WHOLESALE_MANDI', storeCount: 124, densityPct: 58.5, keyCommodities: 'Wheat, Grains, Sugar & Pulses' },
      { clusterName: 'Clock Tower Eight-Bazaars Core', bazaarType: 'COMMERCIAL_CENTER', storeCount: 114, densityPct: 61.2, keyCommodities: 'General Trading, Hosiery & Spices' },
    ]
  },
  {
    city: 'Lahore',
    province: 'Punjab',
    merchantsCount: 380,
    householdsCount: 340,
    totalAccounts: 720,
    mrrPKR: 146000,
    cacPKR: 320,
    ltvPKR: 2550,
    ltvCacRatio: 7.97,
    conversionRatePct: 11.8,
    grossRecordedTillPKR: 62400000,
    digitalWalletSharePct: 32.5,
    topCommercialClusters: [
      { clusterName: 'Anarkali Bazaar & Urdu Bazaar', bazaarType: 'RETAIL_BAZAAR', storeCount: 145, densityPct: 52.0, keyCommodities: 'Apparel, Stationery & Retail Goods' },
      { clusterName: 'Shah Alam Market (Shah Alami)', bazaarType: 'WHOLESALE_MANDI', storeCount: 135, densityPct: 55.4, keyCommodities: 'Cosmetics, Electronics & FMCG Wholesale' },
      { clusterName: 'Ichhra & Ferozepur Road Hub', bazaarType: 'COMMERCIAL_CENTER', storeCount: 100, densityPct: 47.8, keyCommodities: 'Karyana, Garments & Hardware' },
    ]
  },
  {
    city: 'Karachi',
    province: 'Sindh',
    merchantsCount: 290,
    householdsCount: 180,
    totalAccounts: 470,
    mrrPKR: 99500,
    cacPKR: 380,
    ltvPKR: 2200,
    ltvCacRatio: 5.79,
    conversionRatePct: 9.5,
    grossRecordedTillPKR: 54100000,
    digitalWalletSharePct: 38.0,
    topCommercialClusters: [
      { clusterName: 'Bolton Market & Jodia Bazaar', bazaarType: 'WHOLESALE_MANDI', storeCount: 120, densityPct: 41.5, keyCommodities: 'Commodity Spices, Pulses & Oil' },
      { clusterName: 'Saddar Electronics & Mobile Market', bazaarType: 'COMMERCIAL_CENTER', storeCount: 95, densityPct: 46.2, keyCommodities: 'Tech Hardware, Repairs & Accessories' },
      { clusterName: 'Tariq Road & Bahadurabad Hub', bazaarType: 'RETAIL_BAZAAR', storeCount: 75, densityPct: 35.0, keyCommodities: 'Fashion, Bakeries & Departmental' },
    ]
  },
  {
    city: 'Multan',
    province: 'Punjab',
    merchantsCount: 180,
    householdsCount: 95,
    totalAccounts: 275,
    mrrPKR: 50250,
    cacPKR: 190,
    ltvPKR: 2100,
    ltvCacRatio: 11.05,
    conversionRatePct: 15.4,
    grossRecordedTillPKR: 26500000,
    digitalWalletSharePct: 19.4,
    topCommercialClusters: [
      { clusterName: 'Ghalla Mandi Multan', bazaarType: 'WHOLESALE_MANDI', storeCount: 92, densityPct: 71.0, keyCommodities: 'Cotton, Fertilizer, Grain & Agro Trade' },
      { clusterName: 'Hussain Agahi & Chowk Bazaar', bazaarType: 'RETAIL_BAZAAR', storeCount: 88, densityPct: 62.3, keyCommodities: 'General Merchandise, Shoes & Karyana' },
    ]
  },
  {
    city: 'Rawalpindi / Islamabad',
    province: 'Federal / Punjab',
    merchantsCount: 160,
    householdsCount: 220,
    totalAccounts: 380,
    mrrPKR: 73000,
    cacPKR: 290,
    ltvPKR: 2600,
    ltvCacRatio: 8.97,
    conversionRatePct: 12.1,
    grossRecordedTillPKR: 35800000,
    digitalWalletSharePct: 35.2,
    topCommercialClusters: [
      { clusterName: 'Raja Bazaar & Bara Market (RWP)', bazaarType: 'RETAIL_BAZAAR', storeCount: 88, densityPct: 48.0, keyCommodities: 'Textiles, Crockeries, Dry Fruits' },
      { clusterName: 'G-9 Karachi Company & Blue Area (ISB)', bazaarType: 'COMMERCIAL_CENTER', storeCount: 72, densityPct: 42.1, keyCommodities: 'Corporate Services, Cafes & Marts' },
    ]
  },
  {
    city: 'Peshawar',
    province: 'KPK',
    merchantsCount: 110,
    householdsCount: 60,
    totalAccounts: 170,
    mrrPKR: 31000,
    cacPKR: 240,
    ltvPKR: 1950,
    ltvCacRatio: 8.13,
    conversionRatePct: 13.0,
    grossRecordedTillPKR: 18200000,
    digitalWalletSharePct: 21.0,
    topCommercialClusters: [
      { clusterName: 'Qissa Khwani & Khyber Bazaar', bazaarType: 'RETAIL_BAZAAR', storeCount: 54, densityPct: 39.0, keyCommodities: 'Green Tea, Crockery, Books & Spices' },
      { clusterName: 'Karkhano Markets (Hayatabad)', bazaarType: 'COMMERCIAL_CENTER', storeCount: 56, densityPct: 44.5, keyCommodities: 'Imported Goods, Electronics & Fabrics' },
    ]
  }
];

// 2. Campaign Attributions
export let CAMPAIGNS_STORE: ICampaignAttribution[] = [
  {
    id: 'CMP-01',
    campaignName: 'Mandi Field Sales Activation (Q3/Q4)',
    channel: 'FIELD_SALES_AGENTS',
    utmSource: 'field_agent',
    utmMedium: 'direct_onboarding',
    utmCampaign: 'punjab_mandi_push',
    totalSignups: 840,
    paidConversions: 136,
    conversionRatePct: 16.2,
    cacPKR: 190,
    totalSpendPKR: 159600,
    generatedMrrPKR: 136000,
    roasMultiplier: 3.82,
    status: 'ACTIVE',
    startDate: '2026-06-01'
  },
  {
    id: 'CMP-02',
    campaignName: 'Meta Urdu Direct Response (Video Ads)',
    channel: 'META_ADS',
    utmSource: 'facebook_instagram',
    utmMedium: 'cpc_video',
    utmCampaign: 'dukandar_hisab_urdu',
    totalSignups: 720,
    paidConversions: 89,
    conversionRatePct: 12.4,
    cacPKR: 280,
    totalSpendPKR: 201600,
    generatedMrrPKR: 106800,
    roasMultiplier: 2.74,
    status: 'ACTIVE',
    startDate: '2026-07-15'
  },
  {
    id: 'CMP-03',
    campaignName: 'TikTok Shopkeeper Educational Shorts',
    channel: 'TIKTOK',
    utmSource: 'tiktok_for_business',
    utmMedium: 'in_feed_shorts',
    utmCampaign: 'udhaar_recovery_tips',
    totalSignups: 480,
    paidConversions: 52,
    conversionRatePct: 10.8,
    cacPKR: 210,
    totalSpendPKR: 100800,
    generatedMrrPKR: 62400,
    roasMultiplier: 3.12,
    status: 'ACTIVE',
    startDate: '2026-08-01'
  },
  {
    id: 'CMP-04',
    campaignName: 'Google Search ("Khata App Pakistan")',
    channel: 'GOOGLE_SEARCH',
    utmSource: 'google_ads',
    utmMedium: 'search_intent',
    utmCampaign: 'brand_and_competitor_pk',
    totalSignups: 360,
    paidConversions: 50,
    conversionRatePct: 14.0,
    cacPKR: 390,
    totalSpendPKR: 140400,
    generatedMrrPKR: 60000,
    roasMultiplier: 2.14,
    status: 'ACTIVE',
    startDate: '2026-05-10'
  },
  {
    id: 'CMP-05',
    campaignName: 'WhatsApp Organic Dukandar Referral Loops',
    channel: 'WHATSAPP_REFERRAL',
    utmSource: 'whatsapp_peer',
    utmMedium: 'in_app_invite',
    utmCampaign: 'bhai_bhai_referral',
    totalSignups: 245,
    paidConversions: 48,
    conversionRatePct: 19.6,
    cacPKR: 0,
    totalSpendPKR: 0,
    generatedMrrPKR: 57600,
    roasMultiplier: 9.9,
    status: 'ACTIVE',
    startDate: '2026-06-20'
  }
];

// 3. Promo Codes & Vouchers
export let PROMOS_STORE: IPromoCodeRecord[] = [
  {
    code: 'AZADI2026',
    title: 'Azadi Independence 50% Off First 3 Months',
    discountType: 'PERCENTAGE',
    discountValue: 50,
    totalRedemptions: 420,
    maxRedemptions: 500,
    totalSubsidizedBurnPKR: 63000,
    generatedMrrPKR: 126000,
    roiMultiplier: 4.8,
    status: 'ACTIVE',
    expiryDate: '2026-11-30'
  },
  {
    code: 'MANDI50',
    title: 'Wholesale Mandi Free 500 SMS Credits',
    discountType: 'FREE_SMS_CREDITS',
    discountValue: 500,
    totalRedemptions: 310,
    maxRedemptions: 400,
    totalSubsidizedBurnPKR: 31000,
    generatedMrrPKR: 86000,
    roiMultiplier: 3.9,
    status: 'ACTIVE',
    expiryDate: '2026-12-15'
  },
  {
    code: 'FAISALABAD100',
    title: 'Faisalabad Textile Hub Welcome Flat Rs. 500',
    discountType: 'FLAT_PKR',
    discountValue: 500,
    cityRestricted: 'Faisalabad',
    totalRedemptions: 185,
    maxRedemptions: 250,
    totalSubsidizedBurnPKR: 92500,
    generatedMrrPKR: 148000,
    roiMultiplier: 3.4,
    status: 'ACTIVE',
    expiryDate: '2026-11-20'
  },
  {
    code: 'GHAR2026',
    title: 'Ghar Ka Hisab 30% Off Sub-Meter Splitter',
    discountType: 'PERCENTAGE',
    discountValue: 30,
    totalRedemptions: 160,
    maxRedemptions: 300,
    totalSubsidizedBurnPKR: 24000,
    generatedMrrPKR: 48000,
    roiMultiplier: 3.0,
    status: 'ACTIVE',
    expiryDate: '2026-12-31'
  }
];

// 4. WhatsApp Referral Champions
export let REFERRAL_LEADERS_STORE: IWhatsAppReferralMetric[] = [
  { merchantId: 'MER-4821', merchantName: 'Chaudhry Akram', businessName: 'Akram Cloth House', city: 'Faisalabad', invitedCount: 28, convertedCount: 19, earnedFreeMonths: 19, kFactorContribution: 0.68 },
  { merchantId: 'MER-3912', merchantName: 'Mian Tariq', businessName: 'Tariq Ghee & Karyana Store', city: 'Multan', invitedCount: 24, convertedCount: 16, earnedFreeMonths: 16, kFactorContribution: 0.66 },
  { merchantId: 'MER-5201', merchantName: 'Haji Aslam', businessName: 'Aslam Departmental Store', city: 'Lahore', invitedCount: 21, convertedCount: 14, earnedFreeMonths: 14, kFactorContribution: 0.66 },
  { merchantId: 'MER-1940', merchantName: 'Sheikh Farooq', businessName: 'Farooq Electronics', city: 'Karachi', invitedCount: 18, convertedCount: 11, earnedFreeMonths: 11, kFactorContribution: 0.61 },
  { merchantId: 'MER-6031', merchantName: 'Malik Jahangir', businessName: 'Jahangir General Mart', city: 'Rawalpindi', invitedCount: 15, convertedCount: 9, earnedFreeMonths: 9, kFactorContribution: 0.60 },
];

// 5. 30/60/90-Day Cohort Retention Rates
export let COHORT_RETENTION_STORE: ICohortDataPoint[] = [
  { cohortMonth: '2026-06', cohortSize: 480, persona: 'ALL', retentionRates: { day1: 100, day7: 72.4, day14: 64.1, day30: 56.5, day60: 48.2, day90: 42.1 } },
  { cohortMonth: '2026-07', cohortSize: 520, persona: 'ALL', retentionRates: { day1: 100, day7: 74.0, day14: 66.2, day30: 58.1, day60: 49.5, day90: 43.8 } },
  { cohortMonth: '2026-08', cohortSize: 560, persona: 'ALL', retentionRates: { day1: 100, day7: 71.5, day14: 63.8, day30: 55.4, day60: 47.0, day90: 40.5 } },
  { cohortMonth: '2026-09', cohortSize: 590, persona: 'ALL', retentionRates: { day1: 100, day7: 76.2, day14: 68.0, day30: 60.2, day60: 51.4, day90: 45.2 } },
  { cohortMonth: '2026-10', cohortSize: 495, persona: 'ALL', retentionRates: { day1: 100, day7: 78.4, day14: 70.1, day30: 62.0, day60: 53.0, day90: 46.8 } },
];

// 6. Paywall Conversion Funnel
export let PAYWALL_FUNNEL_STORE: IPaywallFunnelStage[] = [
  { stepNumber: 1, stageName: 'Phone OTP Verification', stageNameUrdu: 'موبائل نمبر اور او ٹی پی تصدیق', description: 'User enters Pakistani +92 mobile number and verifies 4-digit SMS OTP', accountsReached: 2645, conversionFromPreviousPct: 100, overallDropoffPct: 0 },
  { stepNumber: 2, stageName: 'Store / Home Name Setup', stageNameUrdu: 'دکان یا گھرانہ پروفائل اور پتہ', description: 'Names their dukaan or domestic portion and selects trade category', accountsReached: 2410, conversionFromPreviousPct: 91.1, overallDropoffPct: 8.9 },
  { stepNumber: 3, stageName: 'First Transaction Logged', stageNameUrdu: 'پہلا نقد یا ادھار کھاتہ اندراج', description: 'Records first counter cash sale or customer credit entry', accountsReached: 2120, conversionFromPreviousPct: 88.0, overallDropoffPct: 19.8 },
  { stepNumber: 4, stageName: 'Paywall Hit (>20 Khata / 1st Month)', stageNameUrdu: 'پے وال لاک (20 کسٹمرز یا پہلا مہینہ ختم)', description: 'Exceeds 20-customer limit or completes 30-day initial trial', accountsReached: 1240, conversionFromPreviousPct: 58.5, overallDropoffPct: 53.1 },
  { stepNumber: 5, stageName: 'Paid Tier Upgrade (Rs. 150/200/250)', stageNameUrdu: 'ماہانہ سبسکرپشن ایکٹیویشن (جاز کیش / پے فاسٹ)', description: 'Upgrades to Rs. 150 (Basic), Rs. 200 (Gharana), or Rs. 250 (Pro Malik)', accountsReached: 410, conversionFromPreviousPct: 33.1, overallDropoffPct: 84.5 },
];

// 7. Churn Early Warning Stores
export let CHURN_RISK_STORES: IChurnRiskStore[] = [
  { storeId: 'STR-9104', storeName: 'Bismillah Autos & Karyana', ownerName: 'Rana Sohail', phone: '0301-4455667', city: 'Faisalabad', persona: 'DUKANDAR', daysInactive: 9, previousMonthlyVolumePKR: 420000, churnRiskLevel: 'HIGH', recommendedReengagementUrdu: 'رانا صاحب، آپ کی دکان کا کھاتہ 9 دن سے اپ ڈیٹ نہیں ہوا۔ کیا گاہکوں کو ادھار کے بقایا پیغامات بھیجنے میں مدد چاہیے؟' },
  { storeId: 'STR-8820', storeName: 'Gulshan Bakers & Mart', ownerName: 'Hafiz Kamran', phone: '0321-9988776', city: 'Lahore', persona: 'DUKANDAR', daysInactive: 12, previousMonthlyVolumePKR: 850000, churnRiskLevel: 'CRITICAL', recommendedReengagementUrdu: 'حافظ صاحب، آپ کے کاؤنٹر سے کیش دراز اندراج 12 دن سے بند ہے۔ واٹس ایپ ریکوری اور جاز کیش کیو آر کی تجدید کے لیے رابطہ کریں۔' },
  { storeId: 'STR-7140', storeName: 'Siddiqui Cloth House', ownerName: 'Zubair Siddiqui', phone: '0300-3322114', city: 'Karachi', persona: 'DUKANDAR', daysInactive: 8, previousMonthlyVolumePKR: 310000, churnRiskLevel: 'HIGH', recommendedReengagementUrdu: 'صدیقی صاحب، بولٹن مارکیٹ ہول سیلرز کے لیے نیا ایف بی آر ٹیکس انوائس فیچر فعال ہے۔' },
  { storeId: 'STR-6029', storeName: 'Gharana Portion Splitter #14', ownerName: 'Dr. Nadeem Akhtar', phone: '0333-5566778', city: 'Rawalpindi / Islamabad', persona: 'HOUSEHOLD', daysInactive: 11, previousMonthlyVolumePKR: 45000, churnRiskLevel: 'HIGH', recommendedReengagementUrdu: 'ڈاکٹر صاحب، آئیسکو (IESCO) بجلی بل کی آخری تاریخ قریب ہے۔ میٹر ریڈنگ کے مطابق کرایہ داروں کا حصہ خودکار تقسیم کریں۔' },
];

// 8. Multi-Tier Lifetime Value (LTV) Mechanics
export let SUBSCRIPTION_TIERS_LTV_STORE: ISubscriptionTierLtv[] = [
  {
    tierId: 'TIER-150',
    tierName: 'Basic Dukandar',
    targetPersona: 'Small Karyana, Paan Shop & Corner Retailers',
    priceMonthlyPKR: 150,
    activeSubscribers: 1320,
    monthlyChurnRatePct: 7.4,
    avgLifespanMonths: 13.5,
    calculatedLtvPKR: 2025,
    marketSharePct: 49.9
  },
  {
    tierId: 'TIER-200',
    tierName: 'Standard Gharana & Tenants',
    targetPersona: 'Multi-Meter Portions, Water/Gas Splitters',
    priceMonthlyPKR: 200,
    activeSubscribers: 840,
    monthlyChurnRatePct: 8.9,
    avgLifespanMonths: 11.2,
    calculatedLtvPKR: 2240,
    marketSharePct: 31.8
  },
  {
    tierId: 'TIER-250',
    tierName: 'Pro Malik & POS JEV',
    targetPersona: 'Supermarkets, Wholesale Mandi Arthis & Multi-Till',
    priceMonthlyPKR: 250,
    activeSubscribers: 485,
    monthlyChurnRatePct: 6.3,
    avgLifespanMonths: 15.8,
    calculatedLtvPKR: 3950,
    marketSharePct: 18.3
  }
];

// 9. Udhaar Paylink Organic Flywheel
export let UDHAAR_PAYLINK_FLYWHEEL_STORE: IUdhaarPaylinkFlywheel = {
  linksDispatched: 28400,
  linksOpened: 14850,
  paymentsCompleted: 1280,
  postPaymentAppInstalls: 512,
  subsequentLedgersCreated: 312,
  flywheelConversionRatePct: 24.4,
  organicMrrGeneratedPKR: 46800,
  kFactorContribution: 0.64
};

// 10. BTL Ground Sales Agents & Mandi Distributors
export let BTL_AGENTS_STORE: IBtlAgentDistributor[] = [
  {
    code: 'FAISAL_MANDI_20',
    agentName: 'Chaudhry Munir',
    assignedBazaar: 'Katchery & Ghalla Mandi Hubs',
    city: 'Faisalabad',
    phone: '0300-8654321',
    merchantsOnboarded: 340,
    paidUpgrades: 62,
    commissionRatePKR: 150,
    totalEarnedPKR: 51000,
    settlementStatus: 'PAID',
    lastPayoutDate: '2026-10-31'
  },
  {
    code: 'LAHORE_PROMO',
    agentName: 'Malik Shahbaz',
    assignedBazaar: 'Shah Alam Market & Anarkali',
    city: 'Lahore',
    phone: '0321-4567890',
    merchantsOnboarded: 280,
    paidUpgrades: 48,
    commissionRatePKR: 150,
    totalEarnedPKR: 42000,
    settlementStatus: 'PAID',
    lastPayoutDate: '2026-10-25'
  },
  {
    code: 'MULTAN_AGRO_15',
    agentName: 'Mian Rafiq',
    assignedBazaar: 'Ghalla Mandi & Chowk Bazaar',
    city: 'Multan',
    phone: '0302-7788990',
    merchantsOnboarded: 190,
    paidUpgrades: 38,
    commissionRatePKR: 150,
    totalEarnedPKR: 28500,
    settlementStatus: 'PENDING'
  },
  {
    code: 'RAWAL_TECH_10',
    agentName: 'Raja Danial',
    assignedBazaar: 'Raja Bazaar & G-9 Markaz',
    city: 'Rawalpindi / Islamabad',
    phone: '0333-5123456',
    merchantsOnboarded: 150,
    paidUpgrades: 28,
    commissionRatePKR: 150,
    totalEarnedPKR: 22500,
    settlementStatus: 'PENDING'
  }
];

// 11. Feature Upgrade Triggers Heatmap
export let FEATURE_UPGRADE_TRIGGERS_STORE: IFeatureUpgradeTrigger[] = [
  {
    featureKey: 'WHATSAPP_TAGAZA',
    featureName: 'Automated WhatsApp Tagaza & Reminders',
    featureNameUrdu: 'خودکار واٹس ایپ ادھار تقاضا میسجز',
    description: '1-click customer payment reminder link via WhatsApp with PayFast checkout',
    totalTriggers: 355,
    upgradesDriven: 157,
    conversionEfficiencyPct: 44.2,
    shareOfTotalUpgradesPct: 38.2
  },
  {
    featureKey: 'CASH_DISCREPANCY_ALERT',
    featureName: 'Pro Malik Cash Discrepancy Alert',
    featureNameUrdu: 'پرو مالک کیش دراز فرق الرٹ',
    description: 'Instant notification whenever physical cash till does not match digital ledger',
    totalTriggers: 286,
    upgradesDriven: 109,
    conversionEfficiencyPct: 38.1,
    shareOfTotalUpgradesPct: 26.5
  },
  {
    featureKey: 'UNLIMITED_KHATA_CAP',
    featureName: 'Unlimited Customer Khata Cap (>20 Khata)',
    featureNameUrdu: 'بیس سے زائد کسٹمر کھاتے شامل کرنے کی سہولت',
    description: 'Removes trial ceiling allowing thousands of customer credit accounts',
    totalTriggers: 251,
    upgradesDriven: 74,
    conversionEfficiencyPct: 29.5,
    shareOfTotalUpgradesPct: 18.1
  },
  {
    featureKey: 'NEPRA_SUB_METER',
    featureName: 'Multi-Meter Tenant NEPRA Tariff Splitter',
    featureNameUrdu: 'کرایہ دار سب میٹر نیپرا سلیب بل کیلکولیٹر',
    description: 'Calculates progressive slab electricity division between landlord and tenants',
    totalTriggers: 148,
    upgradesDriven: 47,
    conversionEfficiencyPct: 31.8,
    shareOfTotalUpgradesPct: 11.4
  },
  {
    featureKey: 'SBP_FBR_JEV',
    featureName: 'SBP Double-Entry & FBR Tax Invoice Export',
    featureNameUrdu: 'ایس بی پی ڈبل انٹری و ایف بی آر ٹیکس انوائس رپورٹ',
    description: 'Audited Journal Entry Voucher and automated sales tax return export',
    totalTriggers: 105,
    upgradesDriven: 23,
    conversionEfficiencyPct: 22.0,
    shareOfTotalUpgradesPct: 5.8
  }
];

// 12. Acquisition Channels & Unit Economics
export let MARKETING_CHANNELS_STORE: IMarketingChannelMetric[] = [
  {
    id: 'CH-VIRAL',
    channelName: 'WhatsApp Udhaar Paylink Flywheel',
    category: 'VIRAL',
    totalAcquired: 1840,
    totalSpendPKR: 0,
    cacPKR: 0,
    day30RetentionPct: 78.4,
    day90RetentionPct: 54.2,
    estimatedLtvPKR: 2750,
    ltvCacRatio: 99.9
  },
  {
    id: 'CH-FIELD',
    channelName: 'Mandi Field BTL Ground Sales Agents',
    category: 'FIELD_AGENT',
    totalAcquired: 1220,
    totalSpendPKR: 219600,
    cacPKR: 180,
    day30RetentionPct: 69.8,
    day90RetentionPct: 48.5,
    estimatedLtvPKR: 2620,
    ltvCacRatio: 14.55
  },
  {
    id: 'CH-ORGANIC',
    channelName: 'Merchant Peer-to-Peer Referral Network',
    category: 'ORGANIC',
    totalAcquired: 760,
    totalSpendPKR: 38000,
    cacPKR: 50,
    day30RetentionPct: 72.1,
    day90RetentionPct: 51.0,
    estimatedLtvPKR: 2540,
    ltvCacRatio: 50.80
  },
  {
    id: 'CH-META',
    channelName: 'Meta Urdu Direct Response (FB/Instagram)',
    category: 'PAID_ADS',
    totalAcquired: 580,
    totalSpendPKR: 197200,
    cacPKR: 340,
    day30RetentionPct: 58.2,
    day90RetentionPct: 37.4,
    estimatedLtvPKR: 2380,
    ltvCacRatio: 7.00
  },
  {
    id: 'CH-TIKTOK',
    channelName: 'TikTok Shopkeeper Educational Shorts',
    category: 'PAID_ADS',
    totalAcquired: 260,
    totalSpendPKR: 75400,
    cacPKR: 290,
    day30RetentionPct: 51.5,
    day90RetentionPct: 31.0,
    estimatedLtvPKR: 2120,
    ltvCacRatio: 7.31
  },
  {
    id: 'CH-SEARCH',
    channelName: 'Google Search High-Intent ("Khata App")',
    category: 'PAID_ADS',
    totalAcquired: 140,
    totalSpendPKR: 67200,
    cacPKR: 480,
    day30RetentionPct: 54.0,
    day90RetentionPct: 33.2,
    estimatedLtvPKR: 2450,
    ltvCacRatio: 5.10
  }
];

// 13. Viral Flywheel Statistics
export let VIRAL_FLYWHEEL_STAT_STORE: IViralFlywheelStat = {
  paylinksGenerated: 28400,
  invoiceViews: 14850,
  conversionsToAppSignup: 512,
  conversionRatePct: 42.3,
  topAdvocateStoreId: 'MER-4821',
  topAdvocateStoreName: 'Akram Cloth House (Faisalabad)'
};

// 14. Top 10 Advocate Merchants
export let TOP_ADVOCATE_MERCHANTS_STORE: ITopAdvocateMerchant[] = [
  { merchantId: 'MER-4821', merchantName: 'Chaudhry Akram', storeName: 'Akram Cloth House', city: 'Faisalabad', linksDispatched: 640, billsPaidCount: 420, newAccountsReferred: 28, freeMonthsGranted: 3, kFactor: 0.68 },
  { merchantId: 'MER-3912', merchantName: 'Mian Tariq', storeName: 'Tariq Ghee & Karyana Store', city: 'Multan', linksDispatched: 510, billsPaidCount: 380, newAccountsReferred: 24, freeMonthsGranted: 2, kFactor: 0.66 },
  { merchantId: 'MER-5201', merchantName: 'Haji Aslam', storeName: 'Aslam Departmental Store', city: 'Lahore', linksDispatched: 480, billsPaidCount: 310, newAccountsReferred: 21, freeMonthsGranted: 2, kFactor: 0.66 },
  { merchantId: 'MER-1940', merchantName: 'Sheikh Farooq', storeName: 'Farooq Electronics & Mobile', city: 'Karachi', linksDispatched: 430, billsPaidCount: 290, newAccountsReferred: 18, freeMonthsGranted: 1, kFactor: 0.61 },
  { merchantId: 'MER-6031', merchantName: 'Malik Jahangir', storeName: 'Jahangir General Mart', city: 'Rawalpindi', linksDispatched: 390, billsPaidCount: 240, newAccountsReferred: 15, freeMonthsGranted: 1, kFactor: 0.60 },
  { merchantId: 'MER-7102', merchantName: 'Rana Babar', storeName: 'Babar Autos & Spare Parts', city: 'Faisalabad', linksDispatched: 360, billsPaidCount: 220, newAccountsReferred: 14, freeMonthsGranted: 1, kFactor: 0.64 },
  { merchantId: 'MER-8490', merchantName: 'Usman Ghani', storeName: 'Al-Ghani Medicos & Pharmacy', city: 'Lahore', linksDispatched: 320, billsPaidCount: 210, newAccountsReferred: 13, freeMonthsGranted: 1, kFactor: 0.61 },
  { merchantId: 'MER-2281', merchantName: 'Qazi Bilal', storeName: 'Khyber Tea & Crockery', city: 'Peshawar', linksDispatched: 290, billsPaidCount: 180, newAccountsReferred: 12, freeMonthsGranted: 1, kFactor: 0.58 },
  { merchantId: 'MER-9310', merchantName: 'Arshad Mehmood', storeName: 'Mehmood Sanitary Mart', city: 'Gujranwala', linksDispatched: 270, billsPaidCount: 160, newAccountsReferred: 11, freeMonthsGranted: 1, kFactor: 0.63 },
  { merchantId: 'MER-3145', merchantName: 'Naveed Butt', storeName: 'Butt Sweets & Bakers', city: 'Rawalpindi', linksDispatched: 250, billsPaidCount: 150, newAccountsReferred: 10, freeMonthsGranted: 1, kFactor: 0.60 }
];

// 15. Field BTL Promo Codes & Agent Commissions
export let FIELD_AGENTS_COMMISSION_STORE: IFieldAgentCommission[] = [
  { agentId: 'AGT-01', agentName: 'Chaudhry Munir', promoCode: 'FAISAL_MANDI_20', assignedCity: 'Faisalabad (Katchery & Ghalla Mandi)', totalSignups: 340, verifiedActiveSignups: 285, earnedCommissionPKR: 42750, payoutStatus: 'DISBURSED' },
  { agentId: 'AGT-02', agentName: 'Malik Shahbaz', promoCode: 'LAHORE_PROMO', assignedCity: 'Lahore (Shah Alam & Anarkali)', totalSignups: 280, verifiedActiveSignups: 224, earnedCommissionPKR: 33600, payoutStatus: 'DISBURSED' },
  { agentId: 'AGT-03', agentName: 'Mian Rafiq', promoCode: 'MULTAN_AGRO_15', assignedCity: 'Multan (Ghalla Mandi & Chowk)', totalSignups: 190, verifiedActiveSignups: 158, earnedCommissionPKR: 23700, payoutStatus: 'PENDING' },
  { agentId: 'AGT-04', agentName: 'Raja Danial', promoCode: 'RAWAL_TECH_10', assignedCity: 'Rawalpindi / Islamabad (Raja Bazaar)', totalSignups: 150, verifiedActiveSignups: 118, earnedCommissionPKR: 17700, payoutStatus: 'PENDING' },
  { agentId: 'AGT-05', agentName: 'Gulzar Khan', promoCode: 'PESHAWAR_KHYBER_10', assignedCity: 'Peshawar (Qissa Khwani & Karkhano)', totalSignups: 120, verifiedActiveSignups: 92, earnedCommissionPKR: 13800, payoutStatus: 'PENDING' },
  { agentId: 'AGT-06', agentName: 'Zubair Siddiqui', promoCode: 'KARACHI_BOLTON_25', assignedCity: 'Karachi (Bolton Market & Jodia)', totalSignups: 210, verifiedActiveSignups: 162, earnedCommissionPKR: 24300, payoutStatus: 'PENDING' }
];

export function rewardAdvocateMerchant(merchantId: string) {
  loadStateFromDisk();
  const m = TOP_ADVOCATE_MERCHANTS_STORE.find((x) => x.merchantId === merchantId);
  if (m) {
    m.freeMonthsGranted = (m.freeMonthsGranted || 0) + 1;
    saveStateToDisk();
    return m;
  }
  return null;
}

export function approveAgentCommissionPayout(agentId: string) {
  loadStateFromDisk();
  const a = FIELD_AGENTS_COMMISSION_STORE.find((x) => x.agentId === agentId);
  if (a) {
    a.payoutStatus = 'DISBURSED';
    saveStateToDisk();
    return a;
  }
  return null;
}

export function toggleAgentCodeStatus(agentId: string) {
  loadStateFromDisk();
  const a = FIELD_AGENTS_COMMISSION_STORE.find((x) => x.agentId === agentId);
  if (a) {
    saveStateToDisk();
    return a;
  }
  return null;
}

function saveStateToDisk() {
  try {
    const data = {
      REGIONAL_METRICS_STORE,
      CAMPAIGNS_STORE,
      PROMOS_STORE,
      REFERRAL_LEADERS_STORE,
      COHORT_RETENTION_STORE,
      PAYWALL_FUNNEL_STORE,
      CHURN_RISK_STORES,
      SUBSCRIPTION_TIERS_LTV_STORE,
      UDHAAR_PAYLINK_FLYWHEEL_STORE,
      BTL_AGENTS_STORE,
      FEATURE_UPGRADE_TRIGGERS_STORE,
      MARKETING_CHANNELS_STORE,
      VIRAL_FLYWHEEL_STAT_STORE,
      TOP_ADVOCATE_MERCHANTS_STORE,
      FIELD_AGENTS_COMMISSION_STORE
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.REGIONAL_METRICS_STORE) REGIONAL_METRICS_STORE = parsed.REGIONAL_METRICS_STORE;
      if (parsed.CAMPAIGNS_STORE) CAMPAIGNS_STORE = parsed.CAMPAIGNS_STORE;
      if (parsed.PROMOS_STORE) PROMOS_STORE = parsed.PROMOS_STORE;
      if (parsed.REFERRAL_LEADERS_STORE) REFERRAL_LEADERS_STORE = parsed.REFERRAL_LEADERS_STORE;
      if (parsed.COHORT_RETENTION_STORE) COHORT_RETENTION_STORE = parsed.COHORT_RETENTION_STORE;
      if (parsed.PAYWALL_FUNNEL_STORE) PAYWALL_FUNNEL_STORE = parsed.PAYWALL_FUNNEL_STORE;
      if (parsed.CHURN_RISK_STORES) CHURN_RISK_STORES = parsed.CHURN_RISK_STORES;
      if (parsed.SUBSCRIPTION_TIERS_LTV_STORE) SUBSCRIPTION_TIERS_LTV_STORE = parsed.SUBSCRIPTION_TIERS_LTV_STORE;
      if (parsed.UDHAAR_PAYLINK_FLYWHEEL_STORE) UDHAAR_PAYLINK_FLYWHEEL_STORE = parsed.UDHAAR_PAYLINK_FLYWHEEL_STORE;
      if (parsed.BTL_AGENTS_STORE) BTL_AGENTS_STORE = parsed.BTL_AGENTS_STORE;
      if (parsed.FEATURE_UPGRADE_TRIGGERS_STORE) FEATURE_UPGRADE_TRIGGERS_STORE = parsed.FEATURE_UPGRADE_TRIGGERS_STORE;
      if (parsed.MARKETING_CHANNELS_STORE) MARKETING_CHANNELS_STORE = parsed.MARKETING_CHANNELS_STORE;
      if (parsed.VIRAL_FLYWHEEL_STAT_STORE) VIRAL_FLYWHEEL_STAT_STORE = parsed.VIRAL_FLYWHEEL_STAT_STORE;
      if (parsed.TOP_ADVOCATE_MERCHANTS_STORE) TOP_ADVOCATE_MERCHANTS_STORE = parsed.TOP_ADVOCATE_MERCHANTS_STORE;
      if (parsed.FIELD_AGENTS_COMMISSION_STORE) FIELD_AGENTS_COMMISSION_STORE = parsed.FIELD_AGENTS_COMMISSION_STORE;
    }
  } catch (err) {}
}

loadStateFromDisk();

// Getters & Calculation Utilities
export function getMarketingOverview() {
  loadStateFromDisk();
  const totalMerchants = REGIONAL_METRICS_STORE.reduce((acc, r) => acc + r.merchantsCount, 0);
  const totalHouseholds = REGIONAL_METRICS_STORE.reduce((acc, r) => acc + r.householdsCount, 0);
  const totalUsers = totalMerchants + totalHouseholds;
  const totalMrr = REGIONAL_METRICS_STORE.reduce((acc, r) => acc + r.mrrPKR, 0);
  
  const weightedCac = totalUsers > 0
    ? REGIONAL_METRICS_STORE.reduce((acc, r) => acc + (r.cacPKR * (r.merchantsCount + r.householdsCount)), 0) / totalUsers
    : 0;

  const weightedLtv = totalUsers > 0
    ? REGIONAL_METRICS_STORE.reduce((acc, r) => acc + (r.ltvPKR * (r.merchantsCount + r.householdsCount)), 0) / totalUsers
    : 0;

  const ltvCacRatio = weightedCac > 0 ? weightedLtv / weightedCac : 0;
  const grossRecordedLiquidityPKR = REGIONAL_METRICS_STORE.reduce((acc, r) => acc + r.grossRecordedTillPKR, 0);

  return {
    totalUsers,
    totalMerchants,
    totalHouseholds,
    totalMrr,
    weightedCac: Number(weightedCac.toFixed(2)),
    weightedLtv: Number(weightedLtv.toFixed(2)),
    ltvCacRatio: Number(ltvCacRatio.toFixed(2)),
    grossRecordedLiquidityPKR,
    regions: REGIONAL_METRICS_STORE,
    kpis: {
      blendedCac: 198.49,
      blendedLtv: 2568.43,
      ltvCacRatio: 12.94,
      viralAttributionSharePct: 42.3,
      targetLtvMin: 2200
    },
    marketingChannels: MARKETING_CHANNELS_STORE,
    flywheelStat: VIRAL_FLYWHEEL_STAT_STORE,
    topAdvocates: TOP_ADVOCATE_MERCHANTS_STORE,
    fieldAgentCommissions: FIELD_AGENTS_COMMISSION_STORE
  };
}

export function getCampaignsData() {
  loadStateFromDisk();
  const totalSpend = CAMPAIGNS_STORE.reduce((acc, c) => acc + c.totalSpendPKR, 0);
  const totalGeneratedMrr = CAMPAIGNS_STORE.reduce((acc, c) => acc + c.generatedMrrPKR, 0);
  const totalConversions = CAMPAIGNS_STORE.reduce((acc, c) => acc + c.paidConversions, 0);

  return {
    campaigns: CAMPAIGNS_STORE,
    promos: PROMOS_STORE,
    referralLeaders: REFERRAL_LEADERS_STORE,
    tiers: SUBSCRIPTION_TIERS_LTV_STORE,
    flywheel: UDHAAR_PAYLINK_FLYWHEEL_STORE,
    btlAgents: BTL_AGENTS_STORE,
    aggregate: {
      totalSpend,
      totalGeneratedMrr,
      totalConversions,
      blendedRoas: totalSpend > 0 ? Number(((totalGeneratedMrr * 12) / totalSpend).toFixed(2)) : 0,
      kFactorAverage: 0.42
    }
  };
}

export function createCampaign(campaign: Omit<ICampaignAttribution, 'id'>) {
  loadStateFromDisk();
  const newCamp: ICampaignAttribution = {
    ...campaign,
    id: `CMP-${String(CAMPAIGNS_STORE.length + 1).padStart(2, '0')}`
  };
  CAMPAIGNS_STORE = [newCamp, ...CAMPAIGNS_STORE];
  saveStateToDisk();
  return newCamp;
}

export function createPromoCode(promo: IPromoCodeRecord) {
  loadStateFromDisk();
  PROMOS_STORE = [promo, ...PROMOS_STORE];
  saveStateToDisk();
  return promo;
}

export function settleBtlAgentPayout(code: string) {
  loadStateFromDisk();
  const agent = BTL_AGENTS_STORE.find((a) => a.code === code);
  if (agent) {
    agent.settlementStatus = 'PAID';
    agent.lastPayoutDate = new Date().toISOString().split('T')[0];
    saveStateToDisk();
    return agent;
  }
  return null;
}

export function addBtlAgent(agent: IBtlAgentDistributor) {
  loadStateFromDisk();
  BTL_AGENTS_STORE = [agent, ...BTL_AGENTS_STORE];
  saveStateToDisk();
  return agent;
}

export function getCohortAnalytics() {
  loadStateFromDisk();
  return {
    cohorts: COHORT_RETENTION_STORE,
    paywallFunnel: PAYWALL_FUNNEL_STORE,
    churnRisks: CHURN_RISK_STORES,
    featureTriggers: FEATURE_UPGRADE_TRIGGERS_STORE
  };
}
