import mongoose from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry';
import { InventoryItem, IInventoryItem } from '../models/InventoryItem';
import { Counterparty } from '../models/Counterparty';
import { StockMovement } from '../models/StockMovement';
import { Profile } from '../models/Profile';

export type ForensicPeriod = 'ROZANA' | 'MAHANA' | 'SIX_MONTH' | 'SALANA';

export interface IWaterfallStage {
  id: string;
  stageNameUrdu: string;
  stageNameEnglish: string;
  amount: number;
  percentageOfSales: number;
  type: 'INCOME' | 'DEDUCTION' | 'SUBTOTAL' | 'FINAL';
  descriptionUrdu: string;
  descriptionEnglish: string;
}

export interface ICategoryMarginBreakdown {
  category: string;
  categoryUrdu: string;
  grossSales: number;
  wholesaleCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  allocatedOpex: number;
  netProfit: number;
  netMarginPercent: number;
  status: 'POWERHOUSE' | 'HEALTHY' | 'THIN' | 'BLEEDER';
}

export interface ILossLeaderItem {
  id: string;
  itemName: string;
  sku?: string;
  category: string;
  retailPrice: number;
  wholesaleCost: number;
  packagingAndStorageCost: number;
  badDebtDragPercent: number;
  realUnitNetProfit: number;
  realNetMarginPercent: number;
  salesVolumeEst: number;
  totalMonthlyBleedPkr: number;
  severity: 'CRITICAL_LOSS' | 'CREDIT_TRAP' | 'ZERO_MARGIN';
  diagnosisUrdu: string;
  diagnosisEnglish: string;
  actionRecommendationUrdu: string;
  actionRecommendationEnglish: string;
}

export interface ITaxForensicSummary {
  electricityWhtSec235: number;
  distributorWhtSec236: number;
  totalAdvanceTaxDeducted: number;
  fbrAdjustmentCreditAvailable: number;
  taxComplianceRating: 'SHIELDED' | 'MODERATE_EXPOSURE' | 'HIGH_EXPOSURE';
  advisoryUrdu: string;
}

export interface IForensicAuditReport {
  period: ForensicPeriod;
  dateRangeLabel: string;
  businessName: string;
  metrics: {
    grossSales: number;
    naiveProfit: number; // Cash In - Invoices Paid (Shopkeeper's false assumption)
    trueGrossProfit: number;
    trueGrossMarginPercent: number;
    trueNetMunafa: number; // Real bottom-line cash profit
    trueNetMarginPercent: number;
    hiddenBleedVariance: number; // Naive - True Net (The Unseen Leakage)
    totalCustomerTransactions: number;
  };
  waterfall: IWaterfallStage[];
  categoryBreakdown: ICategoryMarginBreakdown[];
  lossLeaders: ILossLeaderItem[];
  taxSummary: ITaxForensicSummary;
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Dairy: 'ڈیری و دودھ دہی',
  'Ghee & Oil': 'گھی و کوکنگ آئل',
  Grocery: 'جنرل گروسری و دالیں',
  'Beverages & Snacks': 'کولڈ ڈرنکس و سنیکس',
  Spices: 'مصالحہ جات',
  Toiletries: 'صابن و سرف',
  Bakery: 'بیکری و بسکٹ',
  General: 'متفرق اشیاء',
  Service: 'خدمات / سروس',
};

const CATEGORY_DEFAULT_COGS_RATIOS: Record<string, number> = {
  Dairy: 0.94, // 6% gross margin
  'Ghee & Oil': 0.96, // 4% gross margin
  Grocery: 0.88, // 12% gross margin
  'Beverages & Snacks': 0.86, // 14% gross margin
  Spices: 0.75, // 25% gross margin
  Toiletries: 0.82, // 18% gross margin
  Bakery: 0.84, // 16% gross margin
  General: 0.85, // 15% gross margin
  Service: 0.15, // 85% gross margin
};

export const performMunafaForensicAudit = async (
  profileId: string,
  period: ForensicPeriod = 'MAHANA'
): Promise<IForensicAuditReport> => {
  const profileObjId = new mongoose.Types.ObjectId(profileId);
  const now = new Date();
  const profile = await Profile.findById(profileObjId).lean();
  const businessName = profile?.businessName || profile?.fullName || 'ہماری دکان';

  // 1. Determine Date Range
  let startDate: Date;
  let endDate = new Date();
  let dateRangeLabel = '';

  if (period === 'ROZANA') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    dateRangeLabel = now.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (period === 'MAHANA') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    dateRangeLabel = `${now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`;
  } else if (period === 'SIX_MONTH') {
    startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    dateRangeLabel = 'گزشتہ 6 ماہ (Last 6 Months)';
  } else {
    // SALANA (Fiscal Year starting July 1 or Jan 1)
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    dateRangeLabel = `مالی سال ${now.getFullYear()} (Fiscal Year)`;
  }

  // 2. Fetch Ledger Entries in range
  const ledgerEntries = await LedgerEntry.find({
    profileId: profileObjId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  // 3. Fetch Inventory Items for item-level COGS matching
  const inventoryItems = await InventoryItem.find({ profileId: profileObjId }).lean();
  const invMap = new Map<string, any>();
  inventoryItems.forEach((inv: any) => {
    invMap.set(inv._id.toString(), inv);
    invMap.set(inv.itemName.toLowerCase().trim(), inv);
  });

  // 4. Compute Sales and Real Itemized COGS
  let grossSales = 0;
  let totalWholesaleCogs = 0;
  let totalCustomerTransactions = 0;
  let directKharchaExpenses = 0;
  let staffPayrollExpenses = 0;
  let utilityBillExpenses = 0;
  let supplierInvoicesPaid = 0;

  const categoryAggregates: Record<
    string,
    { grossSales: number; wholesaleCogs: number; count: number }
  > = {};

  ledgerEntries.forEach((entry) => {
    if (entry.entryType === 'CASH_IN' || entry.entryType === 'RECEIVABLE') {
      const cat = entry.category || 'General';
      if (!categoryAggregates[cat]) {
        categoryAggregates[cat] = { grossSales: 0, wholesaleCogs: 0, count: 0 };
      }

      grossSales += entry.amount;
      totalCustomerTransactions += 1;
      categoryAggregates[cat].grossSales += entry.amount;
      categoryAggregates[cat].count += 1;

      // Itemized COGS extraction
      if (entry.items && Array.isArray(entry.items) && entry.items.length > 0) {
        let entryCogs = 0;
        entry.items.forEach((it) => {
          const inv = invMap.get(it.name.toLowerCase().trim());
          const unitCost = inv?.wholesaleCost || it.unitPrice * 0.85;
          const lineCost = unitCost * (it.quantity || 1);
          entryCogs += lineCost;
        });
        totalWholesaleCogs += entryCogs;
        categoryAggregates[cat].wholesaleCogs += entryCogs;
      } else {
        // Category heuristic fallback
        const cogsRatio = CATEGORY_DEFAULT_COGS_RATIOS[cat] ?? 0.85;
        const entryCogs = Math.round(entry.amount * cogsRatio);
        totalWholesaleCogs += entryCogs;
        categoryAggregates[cat].wholesaleCogs += entryCogs;
      }
    } else if (entry.entryType === 'CASH_OUT') {
      const descLower = (entry.description || '').toLowerCase();
      const catLower = (entry.category || '').toLowerCase();

      const isSupplierPayment =
        catLower.includes('supplier') ||
        descLower.includes('supplier') ||
        catLower.includes('wholesal') ||
        descLower.includes('wholesal') ||
        catLower.includes('vendor') ||
        descLower.includes('vendor') ||
        catLower.includes('po ') ||
        descLower.includes('po #');

      if (isSupplierPayment) {
        supplierInvoicesPaid += entry.amount;
      } else if (
        catLower.includes('staff') ||
        catLower.includes('salary') ||
        catLower.includes('tankha') ||
        descLower.includes('tankha') ||
        descLower.includes('staff') ||
        catLower.includes('payroll') ||
        descLower.includes('wage')
      ) {
        staffPayrollExpenses += entry.amount;
      } else if (
        catLower.includes('utility') ||
        catLower.includes('bijli') ||
        catLower.includes('electricity') ||
        descLower.includes('wapda') ||
        descLower.includes('k-electric') ||
        descLower.includes('bill')
      ) {
        utilityBillExpenses += entry.amount;
      } else {
        directKharchaExpenses += entry.amount;
      }
    } else if (entry.entryType === 'PAYABLE') {
      supplierInvoicesPaid += entry.amount;
    }
  });

  // 5. Stage 2: True Gross Profit
  const trueGrossProfit = Math.max(0, grossSales - totalWholesaleCogs);
  const trueGrossMarginPercent = grossSales > 0 ? (trueGrossProfit / grossSales) * 100 : 0;

  // 6. Stage 3: Wastage, Spoilage & Packaging Overhead
  // Estimate packaging polythene shopper bags: Rs. 2.50 per customer transaction
  const packagingOverhead = Math.round(totalCustomerTransactions * 2.5);

  // Spoilage / Wastage / Expiry leakage: scan StockMovements or calculate ~1.4% of COGS
  let damageMovementCost = 0;
  try {
    const movements = await StockMovement.find({
      profileId: profileObjId,
      movementType: { $in: ['DAMAGE', 'ADJUSTMENT'] },
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();
    damageMovementCost = movements.reduce(
      (acc: number, m: any) => acc + ((m.unitCost || 0) * Math.abs(m.quantityChange || 0)),
      0
    );
  } catch (e) {}

  const wastageAndSpoilage = damageMovementCost > 0 ? damageMovementCost : Math.round(totalWholesaleCogs * 0.014);

  // 7. Stage 4: Operating Overheads (Utilities + Staff + Rent + Daily Kharcha)
  const totalOperatingOverheads = directKharchaExpenses + staffPayrollExpenses + utilityBillExpenses;

  // 8. Stage 5: Bad Debt Provision (Aging Receivables Default Risk)
  const counterparties = await Counterparty.find({
    profileId: profileObjId,
    relationType: 'CUSTOMER',
    currentBalance: { $gt: 0 },
    isArchived: { $ne: true },
  }).lean();

  let badDebtExpectedLoss = 0;
  counterparties.forEach((c) => {
    const overdueDays = c.riskProfile?.overdueDays || 0;
    const balance = c.currentBalance || 0;
    let defaultRate = 0.01; // 0-7 days default 1%

    if (overdueDays > 30) defaultRate = 0.25; // 25% expected write-off
    else if (overdueDays > 15) defaultRate = 0.10; // 10% expected write-off
    else if (overdueDays > 7) defaultRate = 0.04; // 4% expected write-off

    badDebtExpectedLoss += balance * defaultRate;
  });

  badDebtExpectedLoss = Math.round(badDebtExpectedLoss);

  // 9. Stage 6: Taxes & FBR Withholding Deductions
  // Commercial electricity WHT Sec 235: ~10% on bills
  const electricityWht = Math.round(utilityBillExpenses * 0.10);
  // Distributor wholesale advance tax Sec 236G/H: ~0.5% on wholesale supply
  const distributorWht = Math.round(totalWholesaleCogs * 0.005);
  const totalTaxes = electricityWht + distributorWht;

  // 10. Stage 7: True Net Forensic Munafa
  const trueNetMunafa = Math.round(
    trueGrossProfit -
      wastageAndSpoilage -
      packagingOverhead -
      totalOperatingOverheads -
      badDebtExpectedLoss -
      totalTaxes
  );
  const trueNetMarginPercent = grossSales > 0 ? Math.round(((trueNetMunafa / grossSales) * 100) * 10) / 10 : 0;

  // Naive profit (What shopkeepers erroneously think they made)
  const naiveProfit = Math.round(grossSales - supplierInvoicesPaid);
  const hiddenBleedVariance = Math.max(0, naiveProfit - trueNetMunafa);

  // Safe percentage helper preventing division by zero / NaN
  const safePct = (part: number): number => {
    if (!grossSales || grossSales <= 0) return 0;
    const val = (part / grossSales) * 100;
    return isNaN(val) || !isFinite(val) ? 0 : Math.round(val * 10) / 10;
  };

  // 11. Build Forensic Waterfall
  const waterfall: IWaterfallStage[] = [
    {
      id: 'gross_sales',
      stageNameUrdu: 'مجموعی سیلز و نقد آمدن',
      stageNameEnglish: 'Gross Revenue (Total Sales)',
      amount: grossSales,
      percentageOfSales: grossSales > 0 ? 100 : 0,
      type: 'INCOME',
      descriptionUrdu: 'دکان کی تمام کاؤنٹر نقد سیلز اور وصول شدہ ادھار کی مجموعی رقم۔',
      descriptionEnglish: 'Gross inflows from retail walk-ins, counter sales, and credit settlements.',
    },
    {
      id: 'cogs',
      stageNameUrdu: 'حقیقی قیمت خرید (COGS)',
      stageNameEnglish: 'Wholesale Cost of Goods Sold',
      amount: totalWholesaleCogs,
      percentageOfSales: safePct(totalWholesaleCogs),
      type: 'DEDUCTION',
      descriptionUrdu: 'فروخت شدہ مال کی ہول سیل لاگت، جس میں سپلائر کو ادا کردہ اصل قیمت شامل ہے۔',
      descriptionEnglish: 'True landed wholesale purchase cost of inventory items sold.',
    },
    {
      id: 'gross_profit_subtotal',
      stageNameUrdu: 'حقیقی گراس منافع',
      stageNameEnglish: 'True Gross Profit',
      amount: trueGrossProfit,
      percentageOfSales: safePct(trueGrossProfit),
      type: 'SUBTOTAL',
      descriptionUrdu: 'سیلز میں سے مال کی اصل قیمت نکالنے کے بعد بچنے والا خام منافع۔',
      descriptionEnglish: 'Gross trading surplus before overheads, wastage, and packaging.',
    },
    {
      id: 'wastage_spoilage',
      stageNameUrdu: 'ضیاع، خرابی و ایکسپائری',
      stageNameEnglish: 'Wastage, Spoilage & Expiry',
      amount: wastageAndSpoilage,
      percentageOfSales: safePct(wastageAndSpoilage),
      type: 'DEDUCTION',
      descriptionUrdu: 'دودھ پھٹنے، ٹوٹی پیکنگ، خراب سبزی اور ایکسپائرڈ مال کا غیر محسوس نقصان۔',
      descriptionEnglish: 'Losses from shelf-life expiration, leaks, and transit breakage.',
    },
    {
      id: 'packaging_overhead',
      stageNameUrdu: 'شاپنگ بیگز و پیکنگ خرچ',
      stageNameEnglish: 'Packaging & Polythene Shoppers',
      amount: packagingOverhead,
      percentageOfSales: safePct(packagingOverhead),
      type: 'DEDUCTION',
      descriptionUrdu: 'ہر گاہک کو دیے جانے والے شاپر بیگز، لفافوں اور پیکنگ ٹیپ کی خاموش لاگت (2.5 روپے فی گاہک)۔',
      descriptionEnglish: 'Polythene carry bags and packaging material overhead.',
    },
    {
      id: 'operating_expenses',
      stageNameUrdu: 'دکان کے اوورہیڈ اخراجات',
      stageNameEnglish: 'Operating Overheads (Opex)',
      amount: totalOperatingOverheads,
      percentageOfSales: safePct(totalOperatingOverheads),
      type: 'DEDUCTION',
      descriptionUrdu: 'بجلی بل، جنریٹر ڈیزل، دکان کا کرایہ، ملازمین کی تنخواہیں اور چائے پانی کا خرچہ۔',
      descriptionEnglish: 'Commercial electricity, generator fuel, rent, staff payroll, and daily store opex.',
    },
    {
      id: 'bad_debt_provision',
      stageNameUrdu: 'ادھار ڈوبنے کا خدشہ (Bad Debt)',
      stageNameEnglish: 'Credit Default & Bad Debt Drag',
      amount: badDebtExpectedLoss,
      percentageOfSales: safePct(badDebtExpectedLoss),
      type: 'DEDUCTION',
      descriptionUrdu: 'وہ ادھار جو 15 تا 30+ دن سے زائد پرانا ہو کر ڈوبنے کا خطرہ پیدا کر چکا ہے۔',
      descriptionEnglish: 'Expected loss provision based on aging receivables risk matrix.',
    },
    {
      id: 'tax_withholding',
      stageNameUrdu: 'ایف بی آر ودہولڈنگ ٹیکس (WHT)',
      stageNameEnglish: 'Advance Withholding Taxes (Sec 235/236)',
      amount: totalTaxes,
      percentageOfSales: safePct(totalTaxes),
      type: 'DEDUCTION',
      descriptionUrdu: 'بجلی بلوں (سیکشن 235) اور ہول سیل سپلائی بلوں (236G/H) پر کٹا ہوا ایڈوانس ٹیکس۔',
      descriptionEnglish: 'Statutory advance tax deducted on commercial utility bills and wholesale invoices.',
    },
    {
      id: 'true_net_munafa',
      stageNameUrdu: 'حقیقی خالص منافع (True Net Munafa)',
      stageNameEnglish: 'Certified True Net Cash Profit',
      amount: trueNetMunafa,
      percentageOfSales: safePct(trueNetMunafa),
      type: 'FINAL',
      descriptionUrdu: 'تمام پوشیدہ اخراجات اور خدشات وضع کرنے کے بعد دکاندار کی جیب میں بچنے والا اصل منافع۔',
      descriptionEnglish: 'Bottom-line free cash profit available for business owner equity drawings.',
    },
  ];

  // 12. Category Forensic Matrix (Only valid merchandising categories with recorded sales)
  const categoryBreakdown: ICategoryMarginBreakdown[] = Object.keys(categoryAggregates)
    .filter((catKey) => categoryAggregates[catKey].grossSales > 0)
    .map((catKey) => {
      const data = categoryAggregates[catKey];
      const catSales = data.grossSales;
      const catCogs = data.wholesaleCogs > 0 ? data.wholesaleCogs : Math.round(catSales * (CATEGORY_DEFAULT_COGS_RATIOS[catKey] || 0.85));
      const grossProfit = Math.max(0, catSales - catCogs);
      const grossMarginPercent = catSales > 0 ? (grossProfit / catSales) * 100 : 0;

      // Allocate opex proportionally to sales share
      const salesShare = grossSales > 0 ? catSales / grossSales : 0;
      const allocatedOpex = Math.round(
        (totalOperatingOverheads + packagingOverhead + wastageAndSpoilage + badDebtExpectedLoss) * salesShare
      );
      const netProfit = grossProfit - allocatedOpex;
      const netMarginPercent = catSales > 0 ? (netProfit / catSales) * 100 : 0;

      let status: 'POWERHOUSE' | 'HEALTHY' | 'THIN' | 'BLEEDER' = 'HEALTHY';
      if (netMarginPercent < 0) status = 'BLEEDER';
      else if (netMarginPercent < 3) status = 'THIN';
      else if (netMarginPercent >= 14) status = 'POWERHOUSE';

      return {
        category: catKey,
        categoryUrdu: CATEGORY_TRANSLATIONS[catKey] || catKey,
        grossSales: catSales,
        wholesaleCogs: catCogs,
        grossProfit,
        grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
        allocatedOpex,
        netProfit,
        netMarginPercent: Math.round(netMarginPercent * 10) / 10,
        status,
      };
    });

  // Sort categories by lowest net margin first to highlight bleeders
  categoryBreakdown.sort((a, b) => a.netMarginPercent - b.netMarginPercent);

  // 13. Loss Leader & Margin Bleed Engine (Dynamically analyzed from merchant's real inventory)
  const lossLeaders: ILossLeaderItem[] = [];
  for (const item of inventoryItems) {
    const wholesale = item.wholesaleCost || 0;
    const retail = item.retailPrice || 0;
    if (retail <= 0 || wholesale <= 0) continue;

    const grossMargin = (retail - wholesale) / retail;

    // Allocate unit overhead based on category realities
    let unitOverhead = 2.5; // Baseline shopper bag / packaging
    if (item.category === 'Dairy') {
      unitOverhead += retail * 0.035; // Chiller cooling power + spoilage risk
    } else if (item.category === 'Ghee & Oil') {
      unitOverhead += 12; // Heavy container handling
    } else if (item.category === 'Beverages & Snacks') {
      unitOverhead += retail * 0.025; // Chiller cooling power
    }

    const badDebtDrag = 0.015; // 1.5% carrying cost for credit exposure
    const netUnitProfit = retail - wholesale - unitOverhead - retail * badDebtDrag;
    const netMarginPercent = (netUnitProfit / retail) * 100;

    // Detect items that operate at a loss or critical margin drag
    if (netMarginPercent <= 1.5) {
      const isCritical = netMarginPercent < 0;
      const severity: 'CRITICAL_LOSS' | 'CREDIT_TRAP' | 'ZERO_MARGIN' = isCritical
        ? 'CRITICAL_LOSS'
        : grossMargin <= 0.035
        ? 'CREDIT_TRAP'
        : 'ZERO_MARGIN';

      const estVolume = item.stockOnHand || 15;
      const monthlyBleed = isCritical ? Math.round(Math.abs(netUnitProfit) * estVolume) : 0;

      lossLeaders.push({
        id: item._id.toString(),
        itemName: item.itemName,
        sku: item.sku,
        category: item.category || 'General',
        retailPrice: retail,
        wholesaleCost: wholesale,
        packagingAndStorageCost: Math.round(unitOverhead * 10) / 10,
        badDebtDragPercent: 1.5,
        realUnitNetProfit: Math.round(netUnitProfit * 10) / 10,
        realNetMarginPercent: Math.round(netMarginPercent * 10) / 10,
        salesVolumeEst: estVolume,
        totalMonthlyBleedPkr: monthlyBleed,
        severity,
        diagnosisUrdu: isCritical
          ? `اس آئٹم کا ہول سیل ریٹ (Rs. ${wholesale}) اور دکان اوورہیڈ ملا کر ریٹیل قیمت (Rs. ${retail}) سے بڑھ جاتا ہے، جس سے فی یونٹ نقصان ہو رہا ہے۔`
          : `گراس مارجن صرف ${(grossMargin * 100).toFixed(1)}% ہے۔ ادھار یا شاپنگ بیگ کی لاگت کے بعد منافع نہ ہونے کے برابر ہے۔`,
        diagnosisEnglish: isCritical
          ? `Wholesale cost (Rs. ${wholesale}) + store overhead exceeds retail price (Rs. ${retail}), yielding negative unit margin.`
          : `Thin ${(grossMargin * 100).toFixed(1)}% gross margin leaves negligible net surplus after opex and carrying costs.`,
        actionRecommendationUrdu: isCritical
          ? 'قیمت فوری طور پر ریوائز کریں یا اسے منافع بخش آئٹمز کے ساتھ بنڈل بنا کر فروخت کریں۔'
          : 'اس پر ادھار بند کریں (صرف نقد) اور محدود اسٹاک رکھیں تاکہ ورکنگ کیپیٹل جام نہ ہو۔',
        actionRecommendationEnglish: isCritical
          ? 'Revise retail price upwards or bundle with high-margin staple commodities.'
          : 'Restrict strictly to cash sales; maintain lean order quantities.',
      });
    }
  }

  // 14. Tax Forensic Summary
  const taxSummary: ITaxForensicSummary = {
    electricityWhtSec235: electricityWht,
    distributorWhtSec236: distributorWht,
    totalAdvanceTaxDeducted: totalTaxes,
    fbrAdjustmentCreditAvailable: totalTaxes,
    taxComplianceRating: totalTaxes > 5000 ? 'SHIELDED' : 'MODERATE_EXPOSURE',
    advisoryUrdu: `آپ کے بجلی کے بلوں اور ہول سیل خریداری پر سالانہ قریباً Rs. ${(totalTaxes * 12).toLocaleString()} کا ودہولڈنگ ٹیکس کٹ رہا ہے۔ انکم ٹیکس ریٹرن فائل کر کے یہ رقم مکمل ایڈجسٹ یا واپس لی جا سکتی ہے۔`,
  };

  return {
    period,
    dateRangeLabel,
    businessName,
    metrics: {
      grossSales,
      naiveProfit,
      trueGrossProfit,
      trueGrossMarginPercent: Math.round(trueGrossMarginPercent * 10) / 10,
      trueNetMunafa,
      trueNetMarginPercent: Math.round(trueNetMarginPercent * 10) / 10,
      hiddenBleedVariance,
      totalCustomerTransactions,
    },
    waterfall,
    categoryBreakdown,
    lossLeaders,
    taxSummary,
  };
};
