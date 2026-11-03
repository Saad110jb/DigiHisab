import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  ZakatAssessment,
  IZakatAssessment,
  ICharityDisbursement,
  NisabStandard,
  WeightUnit,
  GoldPurity,
  CharityType,
  MustahiqCategory,
  CharityPaymentMode,
} from '../models/ZakatAssessment';
import { VaultAccount, SavingsBucket } from '../models/HouseholdVault';
import { UtilityBill } from '../models/UtilityBill';
import { SchoolFeeTracker } from '../models/SchoolFeeTracker';
import { DomesticHelpStaff } from '../models/DomesticHelpStaff';
import { LedgerEntry } from '../models/LedgerEntry';

const getProfileId = (req: Request): Types.ObjectId => {
  const rawId = (req.user as any)?.id || (req.headers['x-profile-id'] as string) || '6ad88c683ba1c0ade2302e81';
  return new Types.ObjectId(rawId);
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Recompute full Zakat mathematics according to Pakistani Shariah norms
 */
export const computeZakatTotals = (doc: any) => {
  const goldRate = doc.goldRatePerTola || 275000;
  const silverRate = doc.silverRatePerTola || 3100;

  // 1. Gold valuation with purity deduction
  const gold = doc.goldHoldings || { weight: 0, unit: 'TOLA', purity: '22K' };
  const goldWeightInTolas = gold.unit === 'GRAM' ? (gold.weight || 0) / 11.664 : gold.weight || 0;

  let purityFactor = 0.916; // 22K default in Pakistan
  if (gold.purity === '24K') purityFactor = 1.0;
  else if (gold.purity === '21K') purityFactor = 0.875;
  else if (gold.purity === '18K') purityFactor = 0.75;

  const goldCalculatedValue = Math.round(goldWeightInTolas * goldRate * purityFactor);
  doc.goldHoldings = {
    ...gold,
    ratePerTola: goldRate,
    calculatedValue: goldCalculatedValue,
  };

  // 2. Silver valuation
  const silver = doc.silverHoldings || { weight: 0, unit: 'TOLA' };
  const silverWeightInTolas = silver.unit === 'GRAM' ? (silver.weight || 0) / 11.664 : silver.weight || 0;
  const silverCalculatedValue = Math.round(silverWeightInTolas * silverRate);
  doc.silverHoldings = {
    ...silver,
    ratePerTola: silverRate,
    calculatedValue: silverCalculatedValue,
  };

  // 3. Nisab Benchmark Threshold
  // Silver Nisab: 52.5 Tolas (canonical Shariah consensus in Pakistan for mixed wealth)
  // Gold Nisab: 7.5 Tolas
  const nisabStandard: NisabStandard = doc.nisabStandard || 'SILVER';
  const nisabThresholdValue =
    nisabStandard === 'GOLD' ? Math.round(7.5 * goldRate) : Math.round(52.5 * silverRate);
  doc.nisabThresholdValue = nisabThresholdValue;

  // 4. Gross Taxable Assets Pool
  const totalGrossEligibleAssets =
    (doc.cashInHand || 0) +
    (doc.bankBalances || 0) +
    (doc.digitalWallets || 0) +
    goldCalculatedValue +
    silverCalculatedValue +
    (doc.kametiReceivables || 0) +
    (doc.recoverableLoans || 0) +
    (doc.businessInventoryValue || 0);
  doc.totalGrossEligibleAssets = totalGrossEligibleAssets;

  // 5. Total Deductible Liabilities
  const totalDeductions =
    (doc.unpaidUtilityBills || 0) +
    (doc.unpaidSchoolFees || 0) +
    (doc.unpaidStaffSalaries || 0) +
    (doc.otherShortTermDebts || 0);
  doc.totalDeductions = totalDeductions;

  // 6. Net Taxable Wealth
  const netTaxableWealth = Math.max(0, totalGrossEligibleAssets - totalDeductions);
  doc.netTaxableWealth = netTaxableWealth;

  // 7. Zakat Liability (2.5% = 1/40th)
  const isEligibleForZakat = netTaxableWealth >= nisabThresholdValue;
  doc.isEligibleForZakat = isEligibleForZakat;
  doc.totalZakatDue = isEligibleForZakat ? Math.round(netTaxableWealth * 0.025) : 0;

  // 8. Distributions & Remaining Balance
  const disbursements = doc.disbursements || [];
  const zakatDisbursements = disbursements.filter((d: any) => d.charityType === 'ZAKAT');
  const totalZakatDistributed = zakatDisbursements.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  doc.totalZakatDistributed = totalZakatDistributed;
  doc.remainingZakatBalance = Math.max(0, doc.totalZakatDue - totalZakatDistributed);

  return doc;
};

/**
 * Seed realistic Pakistani family Zakat portfolio if none exists
 */
const seedSampleZakatAssessment = async (profileId: Types.ObjectId) => {
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 14);

  const sampleAssessment = new ZakatAssessment({
    profileId,
    hijriYear: '1448 AH (2026-2027)',
    assessmentDate: now,
    nisabStandard: 'SILVER',
    goldRatePerTola: 275000,
    silverRatePerTola: 3100,

    cashInHand: 38500,
    bankBalances: 145000,
    digitalWallets: 19500,

    goldHoldings: {
      weight: 5.5, // 5.5 Tolas
      unit: 'TOLA',
      purity: '22K',
      ratePerTola: 275000,
    },

    silverHoldings: {
      weight: 25, // 25 Tolas
      unit: 'TOLA',
      ratePerTola: 3100,
    },

    kametiReceivables: 50000,
    recoverableLoans: 30000,
    businessInventoryValue: 0,

    unpaidUtilityBills: 24500,
    unpaidSchoolFees: 18000,
    unpaidStaffSalaries: 15000,
    otherShortTermDebts: 0,

    disbursements: [
      {
        recipientName: 'بیوہ خالہ محترمہ (خاندانی مستحق)',
        recipientCategory: 'RELATIVES',
        purpose: 'بچوں کے اسکول فیس و تعلیمی اخراجات',
        amount: 15000,
        disbursementDate: pastDate,
        charityType: 'ZAKAT',
        paymentMode: 'BANK_TRANSFER',
        isAnonymous: true,
        voucherNumber: 'ZKT-202610-001',
        notes: 'قریبی رشتے دار کو صلہ رحمی اور زکوٰۃ ادائیگی',
      },
    ],
  });

  computeZakatTotals(sampleAssessment);
  await sampleAssessment.save();
  return sampleAssessment;
};

/**
 * 1. GET /api/v1/domestic/zakat
 * Retrieve current active Zakat Assessment, Nisab status, and linked vaults
 */
export const getZakatAssessment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);

    let assessment = await ZakatAssessment.findOne({ profileId }).sort({ createdAt: -1 });
    if (!assessment) {
      assessment = await seedSampleZakatAssessment(profileId);
    } else {
      computeZakatTotals(assessment);
      await assessment.save();
    }

    // Also fetch available Vault Accounts for 1-tap disbursement selection
    const vaults = await VaultAccount.find({ profileId, isArchived: false }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        assessment,
        availableVaults: vaults.map((v) => ({
          id: v._id.toString(),
          accountTitle: v.accountTitle,
          accountType: v.accountType,
          institutionName: v.institutionName,
          currentBalance: v.currentBalance,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. POST /api/v1/domestic/zakat/sync-vault
 * 1-Tap Auto-Sync with live Household Vaults, Kameti buckets, and overhead liabilities
 */
export const syncWithLiveVaults = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);

    let assessment = await ZakatAssessment.findOne({ profileId }).sort({ createdAt: -1 });
    if (!assessment) {
      assessment = await seedSampleZakatAssessment(profileId);
    }

    // 1. Sync Liquid Balances from VaultAccount
    const vaults = await VaultAccount.find({ profileId, isArchived: false });
    let cashSafeTotal = 0;
    let commercialBanksTotal = 0;
    let mobileWalletsTotal = 0;
    let digitalGoldTotal = 0;

    vaults.forEach((v) => {
      if (v.accountType === 'PHYSICAL_CASH_SAFE') cashSafeTotal += v.currentBalance;
      else if (v.accountType === 'COMMERCIAL_BANK') commercialBanksTotal += v.currentBalance;
      else if (v.accountType === 'MOBILE_WALLET') mobileWalletsTotal += v.currentBalance;
      else if (v.accountType === 'DIGITAL_GOLD') digitalGoldTotal += v.currentBalance;
    });

    if (vaults.length > 0) {
      assessment.cashInHand = cashSafeTotal;
      assessment.bankBalances = commercialBanksTotal;
      assessment.digitalWallets = mobileWalletsTotal;
    }

    // 2. Sync Kameti Receivables from SavingsBucket
    try {
      const kametiBuckets = await SavingsBucket.find({ profileId, category: 'KAMETI_POOL', isCompleted: false });
      if (kametiBuckets.length > 0) {
        assessment.kametiReceivables = kametiBuckets.reduce((sum, b) => sum + (b.targetAmount - b.currentSavedAmount), 0);
      }
    } catch (kErr) {
      console.warn('[ZakatSync] Kameti sync warning:', kErr);
    }

    // 3. Sync Unpaid Liabilities
    try {
      const unpaidBills = await UtilityBill.find({ profileId, status: { $ne: 'PAID' } });
      if (unpaidBills.length > 0) {
        assessment.unpaidUtilityBills = unpaidBills.reduce((s, b) => s + b.billingAmount, 0);
      }
    } catch {}

    try {
      const pendingFees = await SchoolFeeTracker.find({ profileId, isPaid: false });
      if (pendingFees.length > 0) {
        assessment.unpaidSchoolFees = pendingFees.reduce((s, f) => s + (f.totalDue || (f.tuitionFeeAmount + (f.vanTransportFeeAmount || 0))), 0);
      }
    } catch {}

    try {
      const staffList = await DomesticHelpStaff.find({ profileId, isActive: true });
      if (staffList.length > 0) {
        assessment.unpaidStaffSalaries = staffList.reduce((s, st) => s + st.baseMonthlySalary, 0);
      }
    } catch {}

    computeZakatTotals(assessment);
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: 'تمام والٹس، کمیٹی کھاتہ اور گھریلو بلز کامیابی سے ہم آہنگ ہو چکے ہیں۔',
      data: assessment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/domestic/zakat/calculate
 * Recalculate Zakat with custom rates, weights, and asset values
 */
export const calculateZakat = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const body = req.body;

    let assessment = await ZakatAssessment.findOne({ profileId }).sort({ createdAt: -1 });
    if (!assessment) {
      assessment = new ZakatAssessment({ profileId });
    }

    // Apply updates from body
    if (body.nisabStandard) assessment.nisabStandard = body.nisabStandard;
    if (body.goldRatePerTola !== undefined) assessment.goldRatePerTola = Number(body.goldRatePerTola);
    if (body.silverRatePerTola !== undefined) assessment.silverRatePerTola = Number(body.silverRatePerTola);

    if (body.cashInHand !== undefined) assessment.cashInHand = Number(body.cashInHand);
    if (body.bankBalances !== undefined) assessment.bankBalances = Number(body.bankBalances);
    if (body.digitalWallets !== undefined) assessment.digitalWallets = Number(body.digitalWallets);

    if (body.goldHoldings) {
      assessment.goldHoldings = {
        weight: Number(body.goldHoldings.weight) || 0,
        unit: body.goldHoldings.unit || 'TOLA',
        purity: body.goldHoldings.purity || '22K',
        ratePerTola: assessment.goldRatePerTola,
        calculatedValue: 0,
      };
    }

    if (body.silverHoldings) {
      assessment.silverHoldings = {
        weight: Number(body.silverHoldings.weight) || 0,
        unit: body.silverHoldings.unit || 'TOLA',
        ratePerTola: assessment.silverRatePerTola,
        calculatedValue: 0,
      };
    }

    if (body.kametiReceivables !== undefined) assessment.kametiReceivables = Number(body.kametiReceivables);
    if (body.recoverableLoans !== undefined) assessment.recoverableLoans = Number(body.recoverableLoans);
    if (body.businessInventoryValue !== undefined) assessment.businessInventoryValue = Number(body.businessInventoryValue);

    if (body.unpaidUtilityBills !== undefined) assessment.unpaidUtilityBills = Number(body.unpaidUtilityBills);
    if (body.unpaidSchoolFees !== undefined) assessment.unpaidSchoolFees = Number(body.unpaidSchoolFees);
    if (body.unpaidStaffSalaries !== undefined) assessment.unpaidStaffSalaries = Number(body.unpaidStaffSalaries);
    if (body.otherShortTermDebts !== undefined) assessment.otherShortTermDebts = Number(body.otherShortTermDebts);

    computeZakatTotals(assessment);
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: 'زکوٰۃ کا نیا حساب کامیابی سے محفوظ کر لیا گیا ہے۔',
      data: assessment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. POST /api/v1/domestic/zakat/disburse
 * Record a charity disbursement with optional 1-tap Vault debit and LedgerEntry sync
 */
export const disburseCharity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const {
      recipientName,
      recipientCategory,
      purpose,
      amount,
      charityType,
      debitedFromVaultAccountId,
      paymentMode,
      isAnonymous,
      notes,
    } = req.body;

    if (!recipientName || !purpose || !amount) {
      return res.status(400).json({
        success: false,
        message: 'مستحق کا نام، مقصد اور رقم درج کرنا ضروری ہے۔',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'درست رقم درج کریں۔' });
    }

    let assessment = await ZakatAssessment.findOne({ profileId }).sort({ createdAt: -1 });
    if (!assessment) {
      assessment = await seedSampleZakatAssessment(profileId);
    }

    // Generate Voucher Number
    const count = (assessment.disbursements || []).length;
    const typePrefix = charityType === 'FITRANA' ? 'FIT' : charityType === 'SADQAH' ? 'SAD' : 'ZKT';
    const monthTag = getCurrentMonthKey().replace('-', '');
    const voucherNumber = `${typePrefix}-${monthTag}-${String(count + 1).padStart(3, '0')}`;

    // Handle 1-Tap Vault Debit if vault account provided
    let vaultTitle = '';
    let ledgerEntryId: Types.ObjectId | undefined;

    if (debitedFromVaultAccountId) {
      const vault = await VaultAccount.findOne({ _id: debitedFromVaultAccountId, profileId });
      if (vault) {
        if (vault.currentBalance < numAmount) {
          return res.status(400).json({
            success: false,
            message: `${vault.accountTitle} میں ناکافی بیلنس ہے (دستیاب: Rs. ${vault.currentBalance.toLocaleString()})`,
          });
        }
        vault.currentBalance -= numAmount;
        vault.lastReconciledAt = new Date();
        await vault.save();
        vaultTitle = vault.accountTitle;

        // Synchronize safely with LedgerEntry (CASH_OUT)
        try {
          const entry = await LedgerEntry.create({
            profileId,
            entryType: 'CASH_OUT',
            amount: numAmount,
            paymentMode:
              vault.accountType === 'COMMERCIAL_BANK'
                ? 'BANK_TRANSFER'
                : vault.accountType === 'MOBILE_WALLET'
                ? 'JAZZCASH'
                : 'CASH',
            category: `Charity / ${charityType || 'ZAKAT'}`,
            description: `${voucherNumber}: ${purpose} - ${isAnonymous ? 'مستحق (پردہ داری)' : recipientName}`,
            inputMode: 'MANUAL',
            isSettled: true,
            settledAt: new Date(),
            wasOverridden: false,
            isAnomaly: false,
          });
          ledgerEntryId = entry._id;
        } catch (ledgerErr) {
          console.warn('[LedgerEntry] Charity sync warning:', ledgerErr);
        }
      }
    }

    const disbursementItem: any = {
      recipientName: recipientName.trim(),
      recipientCategory: recipientCategory || 'GENERAL_NEED',
      purpose: purpose.trim(),
      amount: numAmount,
      disbursementDate: new Date(),
      charityType: charityType || 'ZAKAT',
      debitedFromVaultAccountId: debitedFromVaultAccountId ? new Types.ObjectId(debitedFromVaultAccountId) : undefined,
      paymentMode: paymentMode || 'CASH',
      isAnonymous: Boolean(isAnonymous),
      voucherNumber,
      notes: notes?.trim() || '',
      ledgerEntryId,
    };

    assessment.disbursements.push(disbursementItem);
    computeZakatTotals(assessment);
    await assessment.save();

    return res.status(201).json({
      success: true,
      message: `ادائیگی بحساب Rs. ${numAmount.toLocaleString()} کامیابی سے محفوظ ہو گئی ہے${vaultTitle ? ` (${vaultTitle} سے کٹوتی کی گئی)` : ''}۔`,
      data: {
        assessment,
        voucherNumber,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. DELETE /api/v1/domestic/zakat/disburse/:id
 * Remove a disbursement record and restore the vault balance if it was debited
 */
export const deleteDisbursement = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;

    const assessment = await ZakatAssessment.findOne({ profileId }).sort({ createdAt: -1 });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'زکوٰۃ ریکارڈ نہیں ملا۔' });
    }

    const item = assessment.disbursements.id(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'ادائیگی کا ریکارڈ نہیں ملا۔' });
    }

    // Restore vault balance if debited
    if (item.debitedFromVaultAccountId) {
      try {
        const vault = await VaultAccount.findOne({ _id: item.debitedFromVaultAccountId, profileId });
        if (vault) {
          vault.currentBalance += item.amount;
          vault.lastReconciledAt = new Date();
          await vault.save();
        }
      } catch (vaultErr) {
        console.warn('[VaultRestore] Warning:', vaultErr);
      }
    }

    // Delete corresponding ledger entry if present
    if (item.ledgerEntryId) {
      try {
        await LedgerEntry.findByIdAndDelete(item.ledgerEntryId);
      } catch {}
    }

    item.deleteOne();
    computeZakatTotals(assessment);
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: 'ادائیگی کا ریکارڈ کامیابی سے حذف کر دیا گیا اور والٹ بیلنس بحال ہو گیا۔',
      data: assessment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. GET /api/v1/domestic/zakat/fitrana
 * Auto-calculator for Fitrana based on household heads and commodity rates
 */
export const getFitranaEstimate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const heads = Number(req.query.heads) || 5;

    // Standard Shariah commodity weights and rates in Pakistan
    const commodities = [
      {
        id: 'WHEAT',
        nameUrdu: 'گندم (نصف صاع / 2.04 کلو)',
        ratePerHead: 300,
        description: 'عام مستحقین کے لیے بنیادی نصاب',
      },
      {
        id: 'BARLEY',
        nameUrdu: 'جو (ایک صاع / 4 کلو)',
        ratePerHead: 800,
        description: 'سنتِ نبویؐ کا اوسط پیمانہ',
      },
      {
        id: 'DATES',
        nameUrdu: 'کھجور (ایک صاع / 4 کلو)',
        ratePerHead: 2400,
        description: 'افضل درجہ برائے صاحبِ استطاعت',
      },
      {
        id: 'RAISINS',
        nameUrdu: 'کشمش (ایک صاع / 4 کلو)',
        ratePerHead: 3200,
        description: 'اعلیٰ ترین درجہ برائے اہلِ ثروت',
      },
    ];

    const estimates = commodities.map((c) => ({
      ...c,
      totalFitrana: heads * c.ratePerHead,
    }));

    return res.status(200).json({
      success: true,
      data: {
        householdHeads: heads,
        estimates,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. GET /api/v1/domestic/zakat/share-text/:id
 * Generate formatted WhatsApp charity payment slip
 */
export const generateCharityReceiptText = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;

    const assessment = await ZakatAssessment.findOne({ profileId });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
    }

    const item = assessment.disbursements.id(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'ادائیگی نہیں ملی۔' });
    }

    const typeUrdu = item.charityType === 'FITRANA' ? 'فطرانہ' : item.charityType === 'SADQAH' ? 'صدقہ' : 'زکوٰۃ';
    const dateFormatted = new Date(item.disbursementDate).toLocaleDateString('ur-PK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const slip = `🧾 *ڈیجی حساب — تصدیق و رسیدِ ادائیگی (${typeUrdu})*
---------------------------------
🔢 *واؤچر نمبر*: ${item.voucherNumber}
📅 *تاریخ ادائیگی*: ${dateFormatted}
💰 *رقم*: Rs. ${item.amount.toLocaleString()}
🤲 *مد / قسم*: ${typeUrdu}
🎯 *مقصد*: ${item.purpose}
👤 *مستحق*: ${item.isAnonymous ? 'پردہ داری میں محفوظ (Confidentially Disbursed)' : item.recipientName}
💳 *طریقۂ ادائیگی*: ${item.paymentMode}
---------------------------------
🛡️ *شرعی تزکیہ مال*: یہ رقم 2.5% سالانہ زکوٰۃ / صدقات کے تحت براہِ راست مستحق کو دی گئی ہے۔
✅ DigiHisab Domestic Ledger • خاندانی مالی تحفظ`;

    return res.status(200).json({
      success: true,
      data: {
        shareText: slip,
        voucherNumber: item.voucherNumber,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
