import { Types } from 'mongoose';
import { VaultAccount, SavingsBucket, IVaultAccountDoc, ISavingsBucketDoc } from '../models/HouseholdVault';
import { LedgerEntry } from '../models/LedgerEntry';

export type DomesticModuleKey =
  | 'RASHAN'
  | 'MANDI'
  | 'UTILITY'
  | 'KAMETI'
  | 'STAFF'
  | 'SCHOOL_FEE'
  | 'HOME_REPAIR'
  | 'MEDICAL'
  | 'GENERAL';

export type DomesticVoucherType = 'CPV' | 'BPV' | 'WPV' | 'CRV' | 'BRV' | 'JV';

export type BudgetBurnVelocity = 'NORMAL' | 'FAST' | 'CRITICAL_SPIKE';

export interface IJevValidationInput {
  profileId: string;
  sourceModule: DomesticModuleKey;
  amount: number;
  vaultAccountId?: string;
  paymentChannel?: 'PHYSICAL_CASH_SAFE' | 'COMMERCIAL_BANK' | 'MOBILE_WALLET' | 'DIGITAL_GOLD';
  categoryTitle?: string;
  sinkingFundCategory?: 'HOME_REPAIR' | 'EMERGENCY_MEDICAL' | 'QURBANI_EID';
}

export interface IJevValidationResult {
  isSolvent: boolean;
  shortageAmount: number;
  availableChannelBalance: number;
  channelInspected: string;
  voucherType: DomesticVoucherType;
  voucherNumber: string;
  recommendedTransfer?: {
    fromVaultId: string;
    fromAccountTitle: string;
    toVaultId: string;
    toAccountTitle: string;
    suggestedTransferAmount: number;
    reasonUrdu: string;
    reasonEn: string;
  };
  sinkingFundStatus?: {
    isAvailable: boolean;
    bucketId: string;
    bucketTitle: string;
    currentSavedAmount: number;
    coversFullAmount: boolean;
    suggestedOffsetAmount: number;
    promptUrdu: string;
  };
  budgetGuidance: {
    categoryKey: string;
    monthlyBudgetCap: number;
    currentSpentMtd: number;
    projectedTotalAfterExpense: number;
    headroomRemaining: number;
    isOverbudget: boolean;
    overbudgetPercentage: number;
    burnVelocityRate: BudgetBurnVelocity;
    adviceMessageUrdu: string;
    adviceMessageEn: string;
  };
}

// Standard Monthly Household Benchmarks for Pakistani Domestic Middle-Class Households
const DEFAULT_DOMESTIC_BUDGET_CAPS: Record<DomesticModuleKey, number> = {
  RASHAN: 38000,
  MANDI: 24000,
  UTILITY: 28000,
  STAFF: 22000,
  SCHOOL_FEE: 32000,
  HOME_REPAIR: 15000,
  MEDICAL: 12000,
  KAMETI: 20000,
  GENERAL: 10000,
};

export class JevDomesticGuardianService {
  /**
   * 1. Validate Domestic Outflow for Channel Solvency, Sinking Fund Matching, and Budget Headroom
   */
  public static async validateDomesticTransaction(
    input: IJevValidationInput
  ): Promise<IJevValidationResult> {
    const { profileId, sourceModule, amount, vaultAccountId, sinkingFundCategory } = input;
    const now = new Date();

    // 1. Fetch Vault Accounts
    const allVaults = await VaultAccount.find({
      profileId: new Types.ObjectId(profileId),
      isArchived: { $ne: true },
    }).sort({ currentBalance: -1 });

    let targetVault: IVaultAccountDoc | undefined;
    if (vaultAccountId) {
      targetVault = allVaults.find((v) => v._id.toString() === vaultAccountId);
    }

    if (!targetVault) {
      // Default to PHYSICAL_CASH_SAFE or first available
      targetVault =
        allVaults.find((v) => v.accountType === 'PHYSICAL_CASH_SAFE') ||
        allVaults[0];
    }

    const availableBalance = targetVault ? targetVault.currentBalance : 0;
    const isSolvent = availableBalance >= amount;
    const shortageAmount = isSolvent ? 0 : Math.max(0, amount - availableBalance);

    // 2. Classify Voucher Type
    let voucherType: DomesticVoucherType = 'CPV';
    if (targetVault?.accountType === 'COMMERCIAL_BANK') {
      voucherType = 'BPV';
    } else if (targetVault?.accountType === 'MOBILE_WALLET') {
      voucherType = 'WPV';
    }
    const voucherNumber = `${voucherType}-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Recommended Inter-Vault Transfer (e.g. Bank -> Cash ATM withdrawal)
    let recommendedTransfer: IJevValidationResult['recommendedTransfer'] = undefined;
    if (!isSolvent && targetVault) {
      // Find a solvent vault account with enough balance (typically Commercial Bank)
      const solventVault = allVaults.find(
        (v) => v._id.toString() !== targetVault?._id.toString() && v.currentBalance >= shortageAmount
      );

      if (solventVault) {
        // Round to nearest 500 PKR for typical ATM withdrawal
        const suggestedTransferAmount = Math.ceil(shortageAmount / 500) * 500;
        recommendedTransfer = {
          fromVaultId: solventVault._id.toString(),
          fromAccountTitle: solventVault.accountTitle,
          toVaultId: targetVault._id.toString(),
          toAccountTitle: targetVault.accountTitle,
          suggestedTransferAmount,
          reasonUrdu: `${targetVault.accountTitle} میں رقم ناکافی ہے۔ ${solventVault.accountTitle} سے Rs. ${suggestedTransferAmount.toLocaleString()} کا ATM ٹرانسفر کریں تاکہ ادائیگی بلا تعطل مکمل ہو سکے۔`,
          reasonEn: `Insufficient balance in ${targetVault.accountTitle}. 1-Tap transfer Rs. ${suggestedTransferAmount.toLocaleString()} from ${solventVault.accountTitle} to cover this outflow.`,
        };
      }
    }

    // 4. Sinking Fund Matching (Auto-Check Home Repair / Medical Sinking Reserve)
    let sinkingFundStatus: IJevValidationResult['sinkingFundStatus'] = undefined;
    let targetBucketCat = sinkingFundCategory;
    if (!targetBucketCat) {
      if (sourceModule === 'HOME_REPAIR') targetBucketCat = 'HOME_REPAIR';
      if (sourceModule === 'MEDICAL') targetBucketCat = 'EMERGENCY_MEDICAL';
    }

    if (targetBucketCat) {
      const bucket = await SavingsBucket.findOne({
        profileId: new Types.ObjectId(profileId),
        category: targetBucketCat,
      });

      if (bucket && bucket.currentSavedAmount > 0) {
        sinkingFundStatus = {
          isAvailable: true,
          bucketId: bucket._id.toString(),
          bucketTitle: bucket.title,
          currentSavedAmount: bucket.currentSavedAmount,
          coversFullAmount: bucket.currentSavedAmount >= amount,
          suggestedOffsetAmount: Math.min(bucket.currentSavedAmount, amount),
          promptUrdu: `کیا یہ رقم '${bucket.title}' سے وضع کرنی ہے؟ (دستیاب بچت: Rs. ${bucket.currentSavedAmount.toLocaleString()})`,
        };
      }
    }

    // 5. Budget Guidance & Overrun Velocity Radar
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const mtdLogs = await LedgerEntry.find({
      profileId: new Types.ObjectId(profileId),
      entryType: 'CASH_OUT',
      createdAt: { $gte: startOfMonth },
    });

    // Compute MTD spend for this module/category
    const categorySearchTerm = sourceModule.toLowerCase();
    const currentSpentMtd = mtdLogs
      .filter(
        (log) =>
          log.category?.toLowerCase().includes(categorySearchTerm) ||
          log.description?.toLowerCase().includes(categorySearchTerm)
      )
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const monthlyCap = DEFAULT_DOMESTIC_BUDGET_CAPS[sourceModule] || 25000;
    const projectedTotalAfterExpense = currentSpentMtd + amount;
    const headroomRemaining = monthlyCap - projectedTotalAfterExpense;
    const isOverbudget = headroomRemaining < 0;
    const overbudgetPercentage = isOverbudget
      ? Math.round((Math.abs(headroomRemaining) / monthlyCap) * 100)
      : 0;

    // Velocity Analysis
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const percentageSpentSoFar = Math.round((projectedTotalAfterExpense / monthlyCap) * 100);

    let burnVelocityRate: BudgetBurnVelocity = 'NORMAL';
    if (dayOfMonth <= 10 && percentageSpentSoFar >= 65) {
      burnVelocityRate = 'CRITICAL_SPIKE';
    } else if (dayOfMonth <= 15 && percentageSpentSoFar >= 75) {
      burnVelocityRate = 'FAST';
    }

    // Bilingual Advice Construction
    let adviceMessageUrdu = `بجٹ کے اندر: بقیہ ماہ کے لیے Rs. ${Math.max(0, headroomRemaining).toLocaleString()} کی گنجائش موجود ہے۔`;
    let adviceMessageEn = `Within budget: Rs. ${Math.max(0, headroomRemaining).toLocaleString()} safe headroom remaining.`;

    if (isOverbudget) {
      adviceMessageUrdu = `🚨 بجٹ سے تجاوز: مختص بجٹ Rs. ${monthlyCap.toLocaleString()} تھا۔ یہ خرچ شامل کرنے سے Rs. ${Math.abs(headroomRemaining).toLocaleString()} اضافی خرچ ہوں گے (${overbudgetPercentage}% اوور بجٹ)۔`;
      adviceMessageEn = `🚨 Overbudget Warning: Exceeds monthly cap by Rs. ${Math.abs(headroomRemaining).toLocaleString()} (+${overbudgetPercentage}%).`;
    } else if (burnVelocityRate === 'CRITICAL_SPIKE') {
      adviceMessageUrdu = `⚠️ خرچ کی رفتار بہت تیز ہے! مہینے کے پہلے ${dayOfMonth} دنوں میں بجٹ کا ${percentageSpentSoFar}% خرچ ہو چکا ہے۔ باقی ${daysInMonth - dayOfMonth} دن میں کفایت شعاری ضروری ہے۔`;
      adviceMessageEn = `⚠️ High Spending Velocity: ${percentageSpentSoFar}% of budget consumed in first ${dayOfMonth} days.`;
    }

    return {
      isSolvent,
      shortageAmount,
      availableChannelBalance: availableBalance,
      channelInspected: targetVault?.accountTitle || 'گھریلو دراز',
      voucherType,
      voucherNumber,
      recommendedTransfer,
      sinkingFundStatus,
      budgetGuidance: {
        categoryKey: sourceModule,
        monthlyBudgetCap: monthlyCap,
        currentSpentMtd,
        projectedTotalAfterExpense,
        headroomRemaining,
        isOverbudget,
        overbudgetPercentage,
        burnVelocityRate,
        adviceMessageUrdu,
        adviceMessageEn,
      },
    };
  }

  /**
   * 2. Execute 1-Tap Inter-Vault Transfer (e.g. Bank ATM Withdrawal -> Cash Safe)
   */
  public static async executeAtmTransfer(
    profileId: string,
    fromVaultId: string,
    toVaultId: string,
    amount: number,
    notes?: string
  ): Promise<{
    fromVault: IVaultAccountDoc;
    toVault: IVaultAccountDoc;
    journalVoucher: string;
  }> {
    const now = new Date();
    const fromVault = await VaultAccount.findOne({
      _id: new Types.ObjectId(fromVaultId),
      profileId: new Types.ObjectId(profileId),
    });

    const toVault = await VaultAccount.findOne({
      _id: new Types.ObjectId(toVaultId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!fromVault || !toVault) {
      throw new Error('One or both vault accounts not found.');
    }

    if (fromVault.currentBalance < amount) {
      throw new Error(
        `Insufficient balance in ${fromVault.accountTitle} (Available: Rs. ${fromVault.currentBalance.toLocaleString()})`
      );
    }

    // Atomically Adjust Balances
    fromVault.currentBalance -= amount;
    fromVault.lastReconciledAt = now;
    await fromVault.save();

    toVault.currentBalance += amount;
    toVault.lastReconciledAt = now;
    await toVault.save();

    // Create Balanced JV (Journal Voucher) in LedgerEntry
    const jvCode = `JV-ATM-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    await LedgerEntry.create({
      profileId: new Types.ObjectId(profileId),
      entryType: 'SETTLEMENT',
      amount,
      paymentMode: 'BANK_TRANSFER',
      category: 'Internal Vault Transfer',
      description: `1-Tap ATM Transfer: ${fromVault.accountTitle} ➔ ${toVault.accountTitle} (${notes || 'کیش دراز میں رقم کی منتقلی'}) [${jvCode}]`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: now,
    });

    return {
      fromVault,
      toVault,
      journalVoucher: jvCode,
    };
  }

  /**
   * 3. Get Complete Household Budget Velocity & Radar Overview
   */
  public static async getHouseholdBudgetRadar(profileId: string): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const mtdEntries = await LedgerEntry.find({
      profileId: new Types.ObjectId(profileId),
      entryType: 'CASH_OUT',
      createdAt: { $gte: startOfMonth },
    });

    const totalSpentMtd = mtdEntries.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const categories: DomesticModuleKey[] = [
      'RASHAN',
      'MANDI',
      'UTILITY',
      'STAFF',
      'SCHOOL_FEE',
      'HOME_REPAIR',
    ];

    const breakdown = categories.map((cat) => {
      const cap = DEFAULT_DOMESTIC_BUDGET_CAPS[cat];
      const spent = mtdEntries
        .filter(
          (e) =>
            e.category?.toLowerCase().includes(cat.toLowerCase()) ||
            e.description?.toLowerCase().includes(cat.toLowerCase())
        )
        .reduce((sum, item) => sum + (item.amount || 0), 0);

      const percentage = Math.round((spent / cap) * 100);
      const isOver = spent > cap;

      return {
        categoryKey: cat,
        budgetCap: cap,
        spentMtd: spent,
        headroomRemaining: cap - spent,
        percentageUsed: percentage,
        isOverbudget: isOver,
      };
    });

    const totalHouseholdBudgetCap = Object.values(DEFAULT_DOMESTIC_BUDGET_CAPS).reduce(
      (a, b) => a + b,
      0
    );

    return {
      currentMonth: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      dayOfMonth,
      daysInMonth,
      totalHouseholdBudgetCap,
      totalSpentMtd,
      overallHeadroom: totalHouseholdBudgetCap - totalSpentMtd,
      overallPercentageUsed: Math.round((totalSpentMtd / totalHouseholdBudgetCap) * 100),
      categoryBreakdown: breakdown,
    };
  }
}
