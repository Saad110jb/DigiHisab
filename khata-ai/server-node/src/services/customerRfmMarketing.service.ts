import mongoose from 'mongoose';
import { Counterparty, ICounterparty, RfmSegment } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';

export interface IRfmCustomerItem {
  id: string;
  name: string;
  phone: string;
  segment: RfmSegment;
  segmentLabelUrdu: string;
  segmentLabelEnglish: string;
  recencyDays: number;
  frequency90d: number;
  monetarySpend90d: number;
  currentBalance: number;
  lastVisitDate?: string;
  rfmScore: { r: number; f: number; m: number };
  lastCampaignSentAt?: string;
}

export interface IRfmSummary {
  kpis: {
    totalCustomers: number;
    vipCount: number;
    loyalCount: number;
    atRiskCount: number;
    creditDebtorsCount: number;
    newCount: number;
    totalSpend90d: number;
    averageSpendPerCustomer: number;
  };
  customers: IRfmCustomerItem[];
}

export interface ICampaignTemplate {
  id: string;
  titleUrdu: string;
  titleEnglish: string;
  targetSegments: RfmSegment[];
  descriptionUrdu: string;
  descriptionEnglish: string;
  messageUrdu: string;
  badge: string;
}

export const CAMPAIGN_TEMPLATES: ICampaignTemplate[] = [
  {
    id: 'FRESH_STOCK',
    titleUrdu: 'تازہ اسٹاک کی آمد',
    titleEnglish: 'Fresh Stock Arrival',
    targetSegments: ['VIP', 'LOYAL'],
    descriptionUrdu: 'نئے کوکنگ آئل، چاول، دالوں اور روزمرہ اشیاء کی آمد پر بااعتماد گاہکوں کو اطلاع۔',
    descriptionEnglish: 'Notify high-spending customers about fresh staples, cooking oil, and premium rice.',
    messageUrdu:
      'محترم {customer_name}! {store_name} پر تازہ گھی، چاول اور دالوں کا نیا معیاری اسٹاک خصوصی رعایتی ریٹ پر دستیاب ہے۔ اپنی ہفتہ وار گروسری کے لیے آج ہی تشریف لائیں!',
    badge: '👑 شاہانہ و بااعتماد',
  },
  {
    id: 'VIP_EXCLUSIVE',
    titleUrdu: 'شاہانہ گاہک خصوصی رعایت (5% VIP)',
    titleEnglish: 'VIP Loyalty Appreciation (5% Off)',
    targetSegments: ['VIP'],
    descriptionUrdu: 'دکان کے ٹاپ 10 فیصد خریداروں کو خصوصی قدردانی اور رعایت کی پیشکش۔',
    descriptionEnglish: 'Reward top 10% spenders with an exclusive VIP appreciation reward.',
    messageUrdu:
      'محترم {customer_name} صاحب! آپ {store_name} کے معزز ترین شاہانہ گاہک ہیں۔ آپ کے مستقل اعتماد کے اعتراف میں اس ہفتے آپ کے تمام سودے پر خصوصی 5% VIP رعایت لاگو ہے۔ تشریف آوری ہمارے لیے باعث فخر ہوگی۔',
    badge: '⭐ VIP Exclusive',
  },
  {
    id: 'WIN_BACK',
    titleUrdu: 'واپسی خصوصی ڈیل (چھوٹتے گاہک)',
    titleEnglish: 'Win-Back Inactive Customers',
    targetSegments: ['AT_RISK'],
    descriptionUrdu: 'وہ پرانے اچھے گاہک جو پچھلے 30+ دنوں سے خریداری کے لیے نہیں آئے، انہیں واپس لائیں۔',
    descriptionEnglish: 'Re-engage valued buyers who have not purchased in over 30 days.',
    messageUrdu:
      'محترم {customer_name}! آپ کافی عرصے سے {store_name} پر تشریف نہیں لائے، ہمیں آپ کی کمی شدت سے محسوس ہوئی۔ آپ کی اگلی وزٹ پر خصوصی ویلکم رعایت اور تحفہ منتظر ہے۔ ضرور چکر لگائیں!',
    badge: '⚠️ واپسی آفر',
  },
  {
    id: 'WEEKEND_SAVINGS',
    titleUrdu: 'ہفتہ وار بچت دھماکہ',
    titleEnglish: 'Weekend Family Grocery Savings',
    targetSegments: ['LOYAL', 'NEW'],
    descriptionUrdu: 'ہفتہ اور اتوار کے لیے خصوصی فیملی راشن بنڈل آفرز۔',
    descriptionEnglish: 'Promote weekend ration bundles and staples to loyal families and new walk-ins.',
    messageUrdu:
      'سلام مسنون {customer_name}! {store_name} پر اس ویک اینڈ فیملی راشن اور روزمرہ اشیاء پر خصوصی بچت پیکیج متعارف کروایا گیا ہے۔ خالص مال، باکفایت دام۔ وزٹ کریں اور فائدہ اٹھائیں!',
    badge: '🛒 فیملی راشن',
  },
  {
    id: 'CREDIT_CLEARANCE',
    titleUrdu: 'ادھار کلیرنس و آسان قسط',
    titleEnglish: 'Friendly Settlement & Balance Clearance',
    targetSegments: ['CREDIT_DEBTOR'],
    descriptionUrdu: 'ادھار کھاتہ داروں کو نرم لہجے میں بقایا کلیئر کرنے اور نئی نقد خریداری کی ترغیب۔',
    descriptionEnglish: 'Encourage partial or full balance clearance with polite, dignified Urdu tone.',
    messageUrdu:
      'محترم {customer_name}! آپ کا {store_name} پر بقایا کھاتہ روپیہ {current_balance} زیر التوا ہے۔ براہ کرم اس ہفتے حساب مکمل فرمائیں تاکہ اگلی خریداری میں آسانی رہے۔ آپ کے تعاون کا شکریہ!',
    badge: '💳 حساب کلیئرنس',
  },
];

const SEGMENT_LABELS: Record<RfmSegment, { urdu: string; english: string }> = {
  VIP: { urdu: 'شاہانہ گاہک (VIP)', english: 'VIP Champion' },
  LOYAL: { urdu: 'مستقل بااعتماد', english: 'Loyal Regular' },
  AT_RISK: { urdu: 'چھوٹتا ہوا گاہک', english: 'At-Risk / Slipping' },
  CREDIT_DEBTOR: { urdu: 'ادھار منحصر', english: 'Credit Dependent' },
  NEW: { urdu: 'نیا گاہک', english: 'New Walk-In' },
};

/**
 * Service calculating 90-day rolling RFM scores and customer segmentation
 */
export const calculateCustomerRfmSummary = async (profileId: string): Promise<IRfmSummary> => {
  const profileObjId = new mongoose.Types.ObjectId(profileId);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // 1. Fetch active customers
  const customers = await Counterparty.find({
    profileId: profileObjId,
    relationType: 'CUSTOMER',
    isArchived: { $ne: true },
  }).lean();

  if (!customers || customers.length === 0) {
    return {
      kpis: {
        totalCustomers: 0,
        vipCount: 0,
        loyalCount: 0,
        atRiskCount: 0,
        creditDebtorsCount: 0,
        newCount: 0,
        totalSpend90d: 0,
        averageSpendPerCustomer: 0,
      },
      customers: [],
    };
  }

  const customerIds = customers.map((c) => c._id);

  // 2. Aggregate 90-day spend and frequency per customer
  const ledgerStats = await LedgerEntry.aggregate([
    {
      $match: {
        profileId: profileObjId,
        counterpartyId: { $in: customerIds },
        createdAt: { $gte: ninetyDaysAgo },
        entryType: { $in: ['CASH_IN', 'RECEIVABLE'] },
      },
    },
    {
      $group: {
        _id: '$counterpartyId',
        frequency90d: { $sum: 1 },
        monetarySpend90d: { $sum: '$amount' },
        latestTransactionDate: { $max: '$createdAt' },
      },
    },
  ]);

  // 3. Aggregate all-time latest transaction date for recency fallback
  const allTimeStats = await LedgerEntry.aggregate([
    {
      $match: {
        profileId: profileObjId,
        counterpartyId: { $in: customerIds },
      },
    },
    {
      $group: {
        _id: '$counterpartyId',
        lastOverallDate: { $max: '$createdAt' },
      },
    },
  ]);

  const statsMap = new Map<string, { frequency90d: number; monetarySpend90d: number; latestDate?: Date }>();
  for (const s of ledgerStats) {
    statsMap.set(s._id.toString(), {
      frequency90d: s.frequency90d,
      monetarySpend90d: s.monetarySpend90d,
      latestDate: s.latestTransactionDate ? new Date(s.latestTransactionDate) : undefined,
    });
  }

  const allTimeMap = new Map<string, Date>();
  for (const a of allTimeStats) {
    if (a.lastOverallDate) allTimeMap.set(a._id.toString(), new Date(a.lastOverallDate));
  }

  // 4. Determine monetary spend threshold for Top 10% (VIP)
  const spends: number[] = [];
  customers.forEach((c) => {
    const s = statsMap.get(c._id.toString());
    const spend = s?.monetarySpend90d || c.loyaltyProfile?.monetarySpend90d || 0;
    spends.push(spend);
  });
  spends.sort((a, b) => b - a);

  const top10PercentIndex = Math.max(0, Math.floor(spends.length * 0.10) - 1);
  const vipSpendThreshold = spends[top10PercentIndex] > 0 ? spends[top10PercentIndex] : 5000;

  const now = Date.now();
  const calculatedCustomers: IRfmCustomerItem[] = [];

  let totalSpend90d = 0;
  let vipCount = 0;
  let loyalCount = 0;
  let atRiskCount = 0;
  let creditDebtorsCount = 0;
  let newCount = 0;

  const bulkOps: any[] = [];

  for (const cust of customers) {
    const custIdStr = cust._id.toString();
    const stat = statsMap.get(custIdStr);
    const allTimeLatest = allTimeMap.get(custIdStr);

    const frequency90d = stat?.frequency90d ?? cust.loyaltyProfile?.frequency90d ?? 0;
    const monetarySpend90d = stat?.monetarySpend90d ?? cust.loyaltyProfile?.monetarySpend90d ?? 0;

    let lastVisitDate: Date | undefined =
      stat?.latestDate || allTimeLatest || cust.loyaltyProfile?.lastVisitDate;
    if (!lastVisitDate && cust.updatedAt) {
      lastVisitDate = new Date(cust.updatedAt);
    }

    const recencyDays = lastVisitDate
      ? Math.max(0, Math.floor((now - lastVisitDate.getTime()) / (24 * 60 * 60 * 1000)))
      : 90;

    totalSpend90d += monetarySpend90d;

    // Calculate R, F, M quintiles (1-5)
    const rScore = recencyDays <= 7 ? 5 : recencyDays <= 14 ? 4 : recencyDays <= 30 ? 3 : recencyDays <= 60 ? 2 : 1;
    const fScore = frequency90d >= 10 ? 5 : frequency90d >= 6 ? 4 : frequency90d >= 3 ? 3 : frequency90d >= 1 ? 2 : 1;
    const mScore =
      monetarySpend90d >= vipSpendThreshold
        ? 5
        : monetarySpend90d >= vipSpendThreshold * 0.6
        ? 4
        : monetarySpend90d >= vipSpendThreshold * 0.3
        ? 3
        : monetarySpend90d > 0
        ? 2
        : 1;

    // Segmentation Logic
    let segment: RfmSegment = 'NEW';
    const currentBalance = cust.currentBalance || 0;

    if (currentBalance >= 3000 && currentBalance > monetarySpend90d * 0.75) {
      segment = 'CREDIT_DEBTOR';
    } else if (monetarySpend90d >= vipSpendThreshold && frequency90d >= 2 && recencyDays <= 45) {
      segment = 'VIP';
    } else if (recencyDays > 30 && (frequency90d >= 2 || monetarySpend90d >= 2500)) {
      segment = 'AT_RISK';
    } else if (frequency90d >= 3 && recencyDays <= 21) {
      segment = 'LOYAL';
    } else if (frequency90d <= 2) {
      segment = 'NEW';
    } else {
      segment = 'LOYAL';
    }

    if (segment === 'VIP') vipCount++;
    else if (segment === 'LOYAL') loyalCount++;
    else if (segment === 'AT_RISK') atRiskCount++;
    else if (segment === 'CREDIT_DEBTOR') creditDebtorsCount++;
    else if (segment === 'NEW') newCount++;

    const item: IRfmCustomerItem = {
      id: custIdStr,
      name: cust.name,
      phone: cust.phone,
      segment,
      segmentLabelUrdu: SEGMENT_LABELS[segment].urdu,
      segmentLabelEnglish: SEGMENT_LABELS[segment].english,
      recencyDays,
      frequency90d,
      monetarySpend90d,
      currentBalance,
      lastVisitDate: lastVisitDate?.toISOString(),
      rfmScore: { r: rScore, f: fScore, m: mScore },
      lastCampaignSentAt: cust.loyaltyProfile?.lastCampaignSentAt
        ? new Date(cust.loyaltyProfile.lastCampaignSentAt).toISOString()
        : undefined,
    };

    calculatedCustomers.push(item);

    bulkOps.push({
      updateOne: {
        filter: { _id: cust._id },
        update: {
          $set: {
            'loyaltyProfile.rfmSegment': segment,
            'loyaltyProfile.recencyDays': recencyDays,
            'loyaltyProfile.frequency90d': frequency90d,
            'loyaltyProfile.monetarySpend90d': monetarySpend90d,
            'loyaltyProfile.lastVisitDate': lastVisitDate,
            'loyaltyProfile.rfmScore': { r: rScore, f: fScore, m: mScore },
          },
        },
      },
    });
  }

  // Execute bulk updates in background without blocking response
  if (bulkOps.length > 0) {
    Counterparty.bulkWrite(bulkOps).catch((err) =>
      console.warn('[calculateCustomerRfmSummary] Bulk write error:', err)
    );
  }

  // Sort customers: VIP first, then LOYAL, AT_RISK, CREDIT_DEBTOR, NEW, descending by spend
  const segmentPriority: Record<RfmSegment, number> = {
    VIP: 1,
    LOYAL: 2,
    AT_RISK: 3,
    CREDIT_DEBTOR: 4,
    NEW: 5,
  };

  calculatedCustomers.sort((a, b) => {
    if (segmentPriority[a.segment] !== segmentPriority[b.segment]) {
      return segmentPriority[a.segment] - segmentPriority[b.segment];
    }
    return b.monetarySpend90d - a.monetarySpend90d;
  });

  return {
    kpis: {
      totalCustomers: calculatedCustomers.length,
      vipCount,
      loyalCount,
      atRiskCount,
      creditDebtorsCount,
      newCount,
      totalSpend90d,
      averageSpendPerCustomer:
        calculatedCustomers.length > 0 ? Math.round(totalSpend90d / calculatedCustomers.length) : 0,
    },
    customers: calculatedCustomers,
  };
};

/**
 * Generate individualized WhatsApp links & broadcast text for targeted segment
 */
export const generateCampaignMessages = async (
  profileId: string,
  campaignId: string,
  targetSegment?: RfmSegment | 'ALL'
) => {
  const profile = await Profile.findById(new mongoose.Types.ObjectId(profileId)).lean();
  const storeName = profile?.businessName?.trim() || profile?.fullName?.trim() || 'ہماری دکان';

  const template = CAMPAIGN_TEMPLATES.find((t) => t.id === campaignId) || CAMPAIGN_TEMPLATES[0];

  const summary = await calculateCustomerRfmSummary(profileId);
  let eligibleCustomers = summary.customers;

  if (targetSegment && targetSegment !== 'ALL') {
    eligibleCustomers = eligibleCustomers.filter((c) => c.segment === targetSegment);
  } else if (template.targetSegments.length > 0) {
    eligibleCustomers = eligibleCustomers.filter((c) => template.targetSegments.includes(c.segment));
  }

  const generatedList = eligibleCustomers.map((cust) => {
    const rawMsg = template.messageUrdu
      .replace(/{customer_name}/g, cust.name || 'محترم گاہک')
      .replace(/{store_name}/g, storeName)
      .replace(/{current_balance}/g, (cust.currentBalance || 0).toLocaleString());

    let cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }

    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawMsg)}`;

    return {
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      segment: cust.segment,
      segmentLabelUrdu: cust.segmentLabelUrdu,
      messageText: rawMsg,
      whatsappLink,
      lastCampaignSentAt: cust.lastCampaignSentAt,
    };
  });

  const genericBroadcastMessage = template.messageUrdu
    .replace(/{customer_name}/g, 'محترم خریدار')
    .replace(/{store_name}/g, storeName)
    .replace(/{current_balance}/g, '0');

  return {
    template,
    storeName,
    totalTargeted: generatedList.length,
    genericBroadcastMessage,
    customers: generatedList,
  };
};

/**
 * Record that a marketing message was sent to a customer
 */
export const markCampaignSent = async (profileId: string, customerId: string) => {
  return await Counterparty.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(customerId), profileId: new mongoose.Types.ObjectId(profileId) },
    { $set: { 'loyaltyProfile.lastCampaignSentAt': new Date() } },
    { new: true }
  );
};
