import { Types } from 'mongoose';
import { VaultAccount, IVaultAccountDoc } from '../models/HouseholdVault';
import { UtilityBill } from '../models/UtilityBill';
import { DomesticHelpStaff } from '../models/DomesticHelpStaff';
import { SchoolFeeTracker } from '../models/SchoolFeeTracker';
import { DomesticKameti } from '../models/DomesticKameti';
import { LedgerEntry } from '../models/LedgerEntry';

export type RunwayHealthState = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface IDomesticObligationItem {
  id: string;
  sourceModule: 'STAFF' | 'SCHOOL_FEE' | 'UTILITY' | 'KAMETI' | 'MANDI_PERISHABLES' | 'CUSTOM';
  titleUrdu: string;
  titleEn: string;
  dueDayOfMonth: number;
  estimatedAmount: number;
  isPaidThisCycle: boolean;
  actualPaidAmount?: number;
  dueDate: Date;
}

export interface IRunwaySimulationScenario {
  scenarioKey: 'REALISTIC' | 'FRUGAL' | 'STRESSED';
  nameUrdu: string;
  nameEn: string;
  descriptionUrdu: string;
  adjustedDailySpend: number;
  estimatedRunwayDays: number;
  monthEndSurplusOrDeficit: number;
  surplusDeficitLabelUrdu: string;
}

export interface IJevRunwayTrajectory {
  runwayState: RunwayHealthState;
  healthState: 'SAFE' | 'CAUTION' | 'DEFICIT_CLIFF';
  safeRunwayDays: number;
  runwayDaysCalculated: number;
  daysToNextSalary: number;
  nextSalaryDate: Date;
  asOfDate: string;

  // Financial Core
  totalLiquidCapital: number;
  totalLockedSinkingFunds: number;
  totalCommittedPending: number;
  proRatedPerishablesNeeded: number;
  netFreeDiscretionaryCapital: number;
  safeDailySpendingLimit: number;
  safeDailyLimit: number;
  isDeficitProjected: boolean;
  projectedDeficitAmount: number;
  projectedMonthEndSurplus: number;

  runwayBadgeUrdu: string;
  runwayBadgeEn: string;
  safeDailyLimitGuidanceUrdu: string;
  safeDailyLimitGuidanceEn: string;

  // Vault Balances Breakdown
  vaultsBreakdown: Array<{
    vaultId: string;
    accountTitle: string;
    accountType: string;
    currentBalance: number;
  }>;

  // Multi-Path Scenarios
  simulationPaths: {
    realisticRunwayDays: number;
    frugalRunwayDays: number; // 25% discretionary reduction
    shockStressTestDays: number; // -Rs. 10,000 unexpected shock
  };
  simulations: IRunwaySimulationScenario[];

  // Calendar Breakdown
  upcomingObligations: IDomesticObligationItem[];

  // Intelligence Advice
  adviceUrdu: string;
  adviceEn: string;
  aiAdviceBulletsUrdu: string[];
}

export class JevDomesticRunwayService {
  /**
   * Calculate 30-Day Domestic Kitchen Runway, Deficit Forecast & Safe Daily Limit
   */
  public static async calculateRunwayTrajectory(profileId: string): Promise<IJevRunwayTrajectory> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();
    const currentMonthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

    // 1. Calculate Next Salary Arrival Date (Assumed 1st of Next Month for Pakistani households)
    let nextSalaryDate = new Date(currentYear, currentMonth + 1, 1);
    const diffTime = nextSalaryDate.getTime() - now.getTime();
    const daysToNextSalary = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Aggregate Unlocked Liquid Vault Capital (Cash Drawer, Commercial Banks, Mobile Wallets)
    const vaults = await VaultAccount.find({
      profileId: new Types.ObjectId(profileId),
      isArchived: { $ne: true },
    }).sort({ currentBalance: -1 });

    const vaultsBreakdown = vaults.map((v) => ({
      vaultId: v._id.toString(),
      accountTitle: v.accountTitle,
      accountType: v.accountType,
      currentBalance: v.currentBalance,
    }));

    const totalLiquidCapital = vaults.reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);

    // 3. Query Real Pending Calendar Obligations Across Domestic Modules
    const upcomingObligations: IDomesticObligationItem[] = [];

    // A. Domestic Staff Wages (1st-3rd of Month)
    const staffMembers = await DomesticHelpStaff.find({
      profileId: new Types.ObjectId(profileId),
      isActive: true,
    });

    for (const staff of staffMembers) {
      const isPaid = (staff.settlementHistory || []).some(
        (sh: any) => sh.month === currentMonthKey && sh.netSalaryPaid > 0
      );
      const estSalary = staff.baseMonthlySalary || 18000;
      upcomingObligations.push({
        id: `staff_${staff._id}`,
        sourceModule: 'STAFF',
        titleUrdu: `${staff.staffName} (${staff.role === 'MAID' ? 'ملازمہ' : staff.role === 'DRIVER' ? 'ڈرائیور' : 'اسٹاف'}) تنخواہ`,
        titleEn: `${staff.staffName} (${staff.role}) Salary`,
        dueDayOfMonth: 1,
        estimatedAmount: estSalary,
        isPaidThisCycle: isPaid,
        actualPaidAmount: isPaid ? estSalary : 0,
        dueDate: new Date(currentYear, currentMonth, 1),
      });
    }

    // B. School & College Fees (5th-10th of Month)
    const schoolFees = await SchoolFeeTracker.find({
      profileId: new Types.ObjectId(profileId),
    });

    for (const fee of schoolFees) {
      const isPaid = fee.status === 'PAID';
      const feeAmount = fee.totalDue || fee.tuitionFeeAmount || 15000;
      upcomingObligations.push({
        id: `fee_${fee._id}`,
        sourceModule: 'SCHOOL_FEE',
        titleUrdu: `${fee.childName} (${fee.institutionName}) فیس چالان`,
        titleEn: `${fee.childName} (${fee.institutionName}) Fee Challan`,
        dueDayOfMonth: fee.dueDate ? new Date(fee.dueDate).getDate() : 10,
        estimatedAmount: feeAmount,
        isPaidThisCycle: isPaid,
        actualPaidAmount: isPaid ? feeAmount : 0,
        dueDate: fee.dueDate ? new Date(fee.dueDate) : new Date(currentYear, currentMonth, 10),
      });
    }

    // C. Utility Bills (Electricity, Gas, Water - 12th-18th of Month)
    const utilityBills = await UtilityBill.find({
      profileId: new Types.ObjectId(profileId),
    });

    for (const bill of utilityBills) {
      const isPaid = bill.status === 'PAID';
      const billAmt = bill.billingAmount || 22000;
      upcomingObligations.push({
        id: `bill_${bill._id}`,
        sourceModule: 'UTILITY',
        titleUrdu: `${bill.providerName} (${bill.providerType === 'ELECTRICITY' ? 'بجلی' : bill.providerType === 'GAS' ? 'سوئی گیس' : 'بل'})`,
        titleEn: `${bill.providerName} (${bill.providerType}) Bill`,
        dueDayOfMonth: bill.billDueDate ? new Date(bill.billDueDate).getDate() : 15,
        estimatedAmount: billAmt,
        isPaidThisCycle: isPaid,
        actualPaidAmount: isPaid ? billAmt : 0,
        dueDate: bill.billDueDate ? new Date(bill.billDueDate) : new Date(currentYear, currentMonth, 15),
      });
    }

    // D. Kameti / BC Pool (20th of Month)
    const activeKametis = await DomesticKameti.find({
      profileId: new Types.ObjectId(profileId),
      status: 'ACTIVE',
    });

    for (const k of activeKametis) {
      const isPaid = (k.installments || []).some((inst: any) => inst.monthKey === currentMonthKey);
      const kAmt = k.monthlyContribution || 10000;
      upcomingObligations.push({
        id: `kameti_${k._id}`,
        sourceModule: 'KAMETI',
        titleUrdu: `${k.title} (ماہانہ بی سی قسط)`,
        titleEn: `${k.title} (Monthly BC Installment)`,
        dueDayOfMonth: 20,
        estimatedAmount: kAmt,
        isPaidThisCycle: isPaid,
        actualPaidAmount: isPaid ? kAmt : 0,
        dueDate: new Date(currentYear, currentMonth, 20),
      });
    }

    // If user has zero records seeded yet, supply authentic Pakistani Middle-Class Obligation Anchors
    if (upcomingObligations.length === 0) {
      upcomingObligations.push(
        {
          id: 'def_staff_1',
          sourceModule: 'STAFF',
          titleUrdu: 'فاطمہ بی بی (ملازمہ تنخواہ)',
          titleEn: 'Fatima Bibi (Maid Salary)',
          dueDayOfMonth: 1,
          estimatedAmount: 22000,
          isPaidThisCycle: currentDay > 3,
          dueDate: new Date(currentYear, currentMonth, 1),
        },
        {
          id: 'def_fee_1',
          sourceModule: 'SCHOOL_FEE',
          titleUrdu: 'محمد ارہم (دی سٹی اسکول فیس چالان)',
          titleEn: 'Muhammad Arham (City School Fee)',
          dueDayOfMonth: 10,
          estimatedAmount: 32000,
          isPaidThisCycle: currentDay > 10,
          dueDate: new Date(currentYear, currentMonth, 10),
        },
        {
          id: 'def_utility_1',
          sourceModule: 'UTILITY',
          titleUrdu: 'لیسکو (بجلی کا بل LESCO Bill)',
          titleEn: 'LESCO Electricity Bill',
          dueDayOfMonth: 15,
          estimatedAmount: 26500,
          isPaidThisCycle: currentDay > 16,
          dueDate: new Date(currentYear, currentMonth, 15),
        },
        {
          id: 'def_kameti_1',
          sourceModule: 'KAMETI',
          titleUrdu: 'باجی شازیہ محلہ کمیٹی (بی سی قسط)',
          titleEn: 'Baji Shazia Kameti Installment',
          dueDayOfMonth: 20,
          estimatedAmount: 15000,
          isPaidThisCycle: currentDay > 21,
          dueDate: new Date(currentYear, currentMonth, 20),
        }
      );
    }

    // E. Add Pro-Rated Weekly Perishables (Fresh Milk, Mandi Sabzi & Gosht) for Remaining Days
    const dailyPerishableEstimate = 950; // PKR per day for typical family fresh provisions
    const pendingPerishableAmount = daysToNextSalary * dailyPerishableEstimate;
    upcomingObligations.push({
      id: 'perishables_remaining',
      sourceModule: 'MANDI_PERISHABLES',
      titleUrdu: `بقیہ ${daysToNextSalary} دن کا تازہ دودھ، گوشت و سبزی`,
      titleEn: `Fresh Provisions & Perishables (${daysToNextSalary} Days Remaining)`,
      dueDayOfMonth: currentDay,
      estimatedAmount: pendingPerishableAmount,
      isPaidThisCycle: false,
      dueDate: nextSalaryDate,
    });

    // 4. Calculate Pending Committed Outflows
    const totalCommittedPending = upcomingObligations
      .filter((o) => !o.isPaidThisCycle)
      .reduce((acc, curr) => acc + curr.estimatedAmount, 0);

    // 5. Calculate Net Free Discretionary Capital
    const netFreeDiscretionaryCapital = totalLiquidCapital - totalCommittedPending;
    const isDeficitProjected = netFreeDiscretionaryCapital < 0;
    const projectedDeficitAmount = isDeficitProjected ? Math.abs(netFreeDiscretionaryCapital) : 0;

    // 6. Calculate Safe Daily Spending Limit
    const safeDailySpendingLimit = isDeficitProjected
      ? 0
      : Math.max(0, Math.round(netFreeDiscretionaryCapital / daysToNextSalary));

    // 7. Calculate Average Daily Burn Rate from MTD Ledger entries
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const mtdLogs = await LedgerEntry.find({
      profileId: new Types.ObjectId(profileId),
      entryType: 'CASH_OUT',
      createdAt: { $gte: startOfMonth },
    });

    const mtdTotalSpent = mtdLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const averageDailyBurnRate =
      currentDay > 1 ? Math.round(mtdTotalSpent / currentDay) : 3200;

    const safeRunwayDays =
      averageDailyBurnRate > 0
        ? Math.max(1, Math.round(totalLiquidCapital / averageDailyBurnRate))
        : daysToNextSalary;

    // 8. Determine Health State Tier
    let runwayState: RunwayHealthState = 'SAFE';
    if (isDeficitProjected || safeRunwayDays < 7) {
      runwayState = 'CRITICAL';
    } else if (safeRunwayDays < 14 || netFreeDiscretionaryCapital < 10000) {
      runwayState = 'WARNING';
    }

    const healthState: 'SAFE' | 'CAUTION' | 'DEFICIT_CLIFF' =
      runwayState === 'CRITICAL'
        ? 'DEFICIT_CLIFF'
        : runwayState === 'WARNING'
        ? 'CAUTION'
        : 'SAFE';

    const runwayBadgeUrdu =
      runwayState === 'CRITICAL'
        ? 'خسارے کا خطرہ (Deficit)'
        : runwayState === 'WARNING'
        ? 'احتیاط طلب رن وے'
        : `${safeRunwayDays} دن کا محفوظ رن وے`;

    const runwayBadgeEn =
      runwayState === 'CRITICAL'
        ? 'Deficit Cliff'
        : runwayState === 'WARNING'
        ? 'Cautionary Runway'
        : `${safeRunwayDays}-Day Safe Runway`;

    // 9. Multi-Path Simulation Trajectories
    // Scenario 1: Realistic (Normal Burn)
    const realisticRunwayDays = safeRunwayDays;
    // Scenario 2: Frugal (25% reduction in burn rate)
    const frugalBurn = Math.max(1200, Math.round(averageDailyBurnRate * 0.75));
    const frugalRunwayDays = Math.round(totalLiquidCapital / frugalBurn);
    // Scenario 3: Shock Stress Test (-Rs. 10,000 unexpected medical/car shock)
    const shockCapital = Math.max(0, totalLiquidCapital - 10000);
    const shockStressTestDays =
      averageDailyBurnRate > 0 ? Math.round(shockCapital / averageDailyBurnRate) : 0;

    const simulations: IRunwaySimulationScenario[] = [
      {
        scenarioKey: 'REALISTIC',
        nameUrdu: 'موجودہ معمول کا خرچ (Realistic)',
        nameEn: 'Realistic Pace',
        descriptionUrdu: 'موجودہ روزمرہ رفتار کے مطابق کیش کی روانی۔',
        adjustedDailySpend: averageDailyBurnRate,
        estimatedRunwayDays: realisticRunwayDays,
        monthEndSurplusOrDeficit: netFreeDiscretionaryCapital,
        surplusDeficitLabelUrdu:
          netFreeDiscretionaryCapital >= 0
            ? `Rs. ${netFreeDiscretionaryCapital.toLocaleString()} بچت متوقع`
            : `Rs. ${Math.abs(netFreeDiscretionaryCapital).toLocaleString()} خسارہ متوقع`,
      },
      {
        scenarioKey: 'FRUGAL',
        nameUrdu: 'کفایت شعار پلان (Frugal -25%)',
        nameEn: 'Frugal Saver (-25%)',
        descriptionUrdu: 'روزمرہ غیر ضروری اخراجات میں 25 فیصد کمی سے رن وے کو طویل کریں۔',
        adjustedDailySpend: frugalBurn,
        estimatedRunwayDays: frugalRunwayDays,
        monthEndSurplusOrDeficit:
          netFreeDiscretionaryCapital + Math.round(averageDailyBurnRate * 0.25 * daysToNextSalary),
        surplusDeficitLabelUrdu: 'بچت میں اضافہ متوقع',
      },
      {
        scenarioKey: 'STRESSED',
        nameUrdu: 'ہنگامی معاشی دھچکا (Stress Test -10k)',
        nameEn: 'Emergency Shock (-10k)',
        descriptionUrdu: 'کسی اچانک ہسپتال یا گاڑی کی خرابی سے 10 ہزار کے غیر متوقع اخراجات کا امتحان۔',
        adjustedDailySpend: averageDailyBurnRate,
        estimatedRunwayDays: shockStressTestDays,
        monthEndSurplusOrDeficit: netFreeDiscretionaryCapital - 10000,
        surplusDeficitLabelUrdu:
          netFreeDiscretionaryCapital - 10000 >= 0 ? 'پھر بھی بچت باقی' : 'خسارہ متوقع',
      },
    ];

    // 10. Construct Bilingual Intelligence Advice
    let adviceUrdu = `🟢 آپ کے تمام لازمی بلز (Rs. ${totalCommittedPending.toLocaleString()}) محفوظ ہیں۔ آج غیر ضروری خرچ کی یومیہ محفوظ حد Rs. ${safeDailySpendingLimit.toLocaleString()} ہے۔`;
    let adviceEn = `🟢 All pending commitments (Rs. ${totalCommittedPending.toLocaleString()}) are fully backed. Safe daily spend limit: Rs. ${safeDailySpendingLimit.toLocaleString()} / day.`;

    if (isDeficitProjected) {
      adviceUrdu = `🚨 خسارے کا انتباہ: آئندہ تنخواہ سے قبل Rs. ${projectedDeficitAmount.toLocaleString()} کا متوقع شارٹ فال ہے۔ غیر ضروری خریداری فوری مؤخر کریں اور واجبات کے لیے کیش محفوظ کریں۔`;
      adviceEn = `🚨 Deficit Warning: Projected shortfall of Rs. ${projectedDeficitAmount.toLocaleString()} before next salary. Freeze non-essential purchases immediately.`;
    } else if (runwayState === 'WARNING') {
      adviceUrdu = `🟡 کیش رن وے محدود ہے: بقیہ ${daysToNextSalary} دن کے لیے صرف Rs. ${netFreeDiscretionaryCapital.toLocaleString()} کی گنجائش ہے۔ یومیہ خرچ Rs. ${safeDailySpendingLimit.toLocaleString()} سے نیچے رکھیں۔`;
      adviceEn = `🟡 Tight Runway: Only Rs. ${netFreeDiscretionaryCapital.toLocaleString()} headroom remaining for ${daysToNextSalary} days. Keep daily spend under Rs. ${safeDailySpendingLimit.toLocaleString()}.`;
    }

    const aiAdviceBulletsUrdu = [
      adviceUrdu,
      isDeficitProjected
        ? 'بجلی اور گیس کے بلز آخری تاریخ سے قبل ادا کرنے کے لیے فوری کیش الگ کریں۔'
        : 'ہفتہ وار منڈی اور دودھ کا بجٹ محفوظ رکھیں۔',
      'ایمرجنسی سنکنگ فنڈ کو عام گھریلو خرچ کے لیے استعمال نہ کریں۔',
    ];

    return {
      runwayState,
      healthState,
      safeRunwayDays,
      runwayDaysCalculated: safeRunwayDays,
      daysToNextSalary,
      nextSalaryDate,
      asOfDate: now.toISOString().split('T')[0],
      totalLiquidCapital,
      totalLockedSinkingFunds: 0,
      totalCommittedPending,
      proRatedPerishablesNeeded: pendingPerishableAmount,
      netFreeDiscretionaryCapital,
      safeDailySpendingLimit,
      safeDailyLimit: safeDailySpendingLimit,
      isDeficitProjected,
      projectedDeficitAmount,
      projectedMonthEndSurplus: netFreeDiscretionaryCapital,
      runwayBadgeUrdu,
      runwayBadgeEn,
      safeDailyLimitGuidanceUrdu: adviceUrdu,
      safeDailyLimitGuidanceEn: adviceEn,
      vaultsBreakdown,
      simulationPaths: {
        realisticRunwayDays,
        frugalRunwayDays,
        shockStressTestDays,
      },
      simulations,
      upcomingObligations,
      adviceUrdu,
      adviceEn,
      aiAdviceBulletsUrdu,
    };
  }

  /**
   * Simulate the impact of a proposed purchase on runway days and safe daily limit
   */
  public static async simulateProposedExpense(
    profileId: string,
    proposedAmount: number
  ): Promise<{
    proposedExpenseAmount: number;
    netFreeCapitalBefore: number;
    netFreeCapitalAfter: number;
    safeDailyLimitBefore: number;
    safeDailyLimitAfter: number;
    originalDailyLimit: number;
    newDailyLimit: number;
    limitDelta: number;
    runwayDaysBefore: number;
    runwayDaysAfter: number;
    originalRunwayDays: number;
    newRunwayDays: number;
    deltaDays: number;
    runwayDaysDelta: number;
    causesDeficit: boolean;
    deficitShortfall: number;
    isSolventAfterExpense: boolean;
    verdictUrdu: string;
    verdictEn: string;
    recommendationUrdu: string;
    recommendationEn: string;
  }> {
    const trajectory = await this.calculateRunwayTrajectory(profileId);
    const newFreeCapital = trajectory.netFreeDiscretionaryCapital - proposedAmount;
    const newDailyLimit = Math.max(
      0,
      Math.round(newFreeCapital / Math.max(1, trajectory.daysToNextSalary))
    );
    const limitDelta = trajectory.safeDailySpendingLimit - newDailyLimit;

    const newLiquid = Math.max(0, trajectory.totalLiquidCapital - proposedAmount);
    const avgBurn = Math.max(1, Math.round(trajectory.totalLiquidCapital / trajectory.safeRunwayDays));
    const newRunwayDays = Math.round(newLiquid / avgBurn);
    const runwayDaysDelta = trajectory.safeRunwayDays - newRunwayDays;

    const isSolventAfterExpense = newFreeCapital >= 0;
    const causesDeficit = !isSolventAfterExpense;
    const deficitShortfall = Math.abs(Math.min(0, newFreeCapital));

    const verdictUrdu = causesDeficit
      ? 'خسارے کا خطرہ! خریداری مؤخر کریں'
      : 'محفوظ خریداری کی گنجائش موجود ہے';
    const verdictEn = causesDeficit
      ? 'Deficit Risk! Defer Purchase'
      : 'Purchase Cleared by Runway';

    let recommendationUrdu = `یہ خرچ کرنے کے بعد آپ کی یومیہ محفوظ حد Rs. ${limitDelta.toLocaleString()} کم ہو کر Rs. ${newDailyLimit.toLocaleString()} رہ جائے گی۔`;
    let recommendationEn = `Making this purchase reduces your safe daily limit by Rs. ${limitDelta.toLocaleString()} to Rs. ${newDailyLimit.toLocaleString()} / day.`;

    if (!isSolventAfterExpense) {
      recommendationUrdu = `⚠️ انتباہ: یہ خرچ کرنے سے آپ کے لازمی بلز اور اسکول فیس کے لیے رقم کم پڑ جائے گی۔ یہ خریداری اگلی تنخواہ تک مؤخر کرنے کی سختی سے سفارش کی جاتی ہے۔`;
      recommendationEn = `⚠️ Warning: This purchase will trigger a cash deficit for upcoming bills and school fees. Deferral to next salary is strongly advised.`;
    }

    return {
      proposedExpenseAmount: proposedAmount,
      netFreeCapitalBefore: trajectory.netFreeDiscretionaryCapital,
      netFreeCapitalAfter: newFreeCapital,
      safeDailyLimitBefore: trajectory.safeDailySpendingLimit,
      safeDailyLimitAfter: newDailyLimit,
      originalDailyLimit: trajectory.safeDailySpendingLimit,
      newDailyLimit,
      limitDelta,
      runwayDaysBefore: trajectory.safeRunwayDays,
      runwayDaysAfter: newRunwayDays,
      originalRunwayDays: trajectory.safeRunwayDays,
      newRunwayDays,
      deltaDays: runwayDaysDelta,
      runwayDaysDelta,
      causesDeficit,
      deficitShortfall,
      isSolventAfterExpense,
      verdictUrdu,
      verdictEn,
      recommendationUrdu,
      recommendationEn,
    };
  }
}
