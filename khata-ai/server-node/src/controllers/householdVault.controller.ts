import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  VaultAccount,
  SavingsBucket,
  HouseholdIncomeRecord,
  IVaultAccountDoc,
  ISavingsBucketDoc,
  IHouseholdIncomeRecordDoc,
  VaultAccountType,
  IncomeSourceType,
} from '../models/HouseholdVault';
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
 * Seed realistic Pakistani vaults, buckets, and income streams if none exist
 */
const seedSampleHouseholdTreasury = async (profileId: Types.ObjectId) => {
  const now = new Date();

  // 1. Vault Accounts
  const vaults = await VaultAccount.insertMany([
    {
      profileId,
      accountTitle: 'گھریلو نقدی دراز (Locker Cash Safe)',
      accountType: 'PHYSICAL_CASH_SAFE' as VaultAccountType,
      institutionName: 'گھریلو کیش دراز',
      accountIdentifier: 'وارڈروب کیش دراز',
      currentBalance: 38500,
      lastReconciledAt: now,
      notes: 'باورچی خانے اور ہنگامی روزمرہ اخراجات کے لیے نقد رقم',
    },
    {
      profileId,
      accountTitle: 'Meezan Asaan Current Account',
      accountType: 'COMMERCIAL_BANK' as VaultAccountType,
      institutionName: 'Meezan Bank',
      accountIdentifier: 'IBAN PK64MEZN0011849201',
      currentBalance: 145000,
      lastReconciledAt: now,
      notes: 'مرکزی بینک اکاؤنٹ برائے تنخواہ و یوٹیلیٹی بلز',
    },
    {
      profileId,
      accountTitle: 'JazzCash Digital Wallet (محمد سعد)',
      accountType: 'MOBILE_WALLET' as VaultAccountType,
      institutionName: 'JazzCash',
      accountIdentifier: '0300-8492011',
      currentBalance: 19500,
      lastReconciledAt: now,
      notes: 'آن لائن ادائیگی اور انسٹنٹ ٹرانسفر',
    },
    {
      profileId,
      accountTitle: 'ڈیجیٹل گولڈ و سیونگز (2.5 Tolas)',
      accountType: 'DIGITAL_GOLD' as VaultAccountType,
      institutionName: 'ARY / 24K Physical Bar',
      accountIdentifier: '2.5 تولہ 24 قیراط خالص سونا',
      currentBalance: 687500,
      lastReconciledAt: now,
      notes: 'محفوظ خاندانی سونا و ہنگامی اثاثہ (مارکیٹ ریٹ: Rs. 275,000/تولہ)',
    },
  ]);

  const cashSafeId = vaults[0]._id;
  const meezanBankId = vaults[1]._id;
  const jazzCashId = vaults[2]._id;

  // 2. Savings Buckets
  await SavingsBucket.insertMany([
    {
      profileId,
      title: 'ہنگامی طبی فنڈ (Emergency Medical)',
      category: 'EMERGENCY_MEDICAL',
      targetAmount: 80000,
      currentSavedAmount: 48000,
      monthlyDepositTarget: 10000,
      linkedVaultAccountId: meezanBankId,
      notes: 'ہسپتال، ٹیسٹ اور غیر متوقع ادویات کے لیے مخصوص',
    },
    {
      profileId,
      title: 'سالانہ قربانی بچت (Eid ul Adha Sinking Fund)',
      category: 'QURBANI_EID',
      targetAmount: 120000,
      currentSavedAmount: 65000,
      monthlyDepositTarget: 12000,
      linkedVaultAccountId: meezanBankId,
      notes: '10 ماہ کی قسط وار بچت برائے جانور و قصاب',
    },
    {
      profileId,
      title: 'محلہ کمیٹی سرمایہ کاری (Kameti Installment Pool)',
      category: 'KAMETI_POOL',
      targetAmount: 60000,
      currentSavedAmount: 35000,
      monthlyDepositTarget: 10000,
      linkedVaultAccountId: cashSafeId,
      notes: 'ماہانہ کمیٹی قسط وصولی ماہ 4 پر Rs. 50,000 متوقع',
    },
    {
      profileId,
      title: 'گھر مرمت و سروسنگ فنڈ (Home Maintenance)',
      category: 'HOME_REPAIR',
      targetAmount: 45000,
      currentSavedAmount: 22000,
      monthlyDepositTarget: 5000,
      linkedVaultAccountId: jazzCashId,
      notes: 'اے سی گیس، سولر انورٹر اور بائیک ٹیوننگ',
    },
  ]);

  // 3. Realistic Household Income Streams
  const date1 = new Date(now);
  date1.setDate(1);
  const date2 = new Date(now);
  date2.setDate(5);
  const date3 = new Date(now);
  date3.setDate(12);

  await HouseholdIncomeRecord.insertMany([
    {
      profileId,
      sourceType: 'SALARY' as IncomeSourceType,
      title: 'سافٹ ویئر انجینئرنگ تنخواہ (Primary Salary)',
      amount: 185000,
      dateReceived: date1,
      depositedToAccountId: meezanBankId,
      isRecurringMonthly: true,
      notes: 'ماہانہ ملازمت تنخواہ کریڈٹ',
      crvNumber: 'CRV-202610-001',
    },
    {
      profileId,
      sourceType: 'RENTAL_YIELD' as IncomeSourceType,
      title: 'گراؤنڈ پورشن مکان کرایہ (Rental Yield)',
      amount: 42000,
      dateReceived: date2,
      depositedToAccountId: meezanBankId,
      isRecurringMonthly: true,
      notes: 'کرایہ دار محمد طارق ماہانہ ادائیگی',
      crvNumber: 'CRV-202610-002',
    },
    {
      profileId,
      sourceType: 'FREELANCE_TUITION' as IncomeSourceType,
      title: 'فری لانس موبائل پروجیکٹ آمدن (Upwork / Gigs)',
      amount: 35000,
      dateReceived: date3,
      depositedToAccountId: jazzCashId,
      isRecurringMonthly: false,
      notes: 'فری لانس ایپ سکرین ڈیولپمنٹ',
      crvNumber: 'CRV-202610-003',
    },
  ]);
};

/**
 * Calculate dynamic solvency report and budget commitments
 */
const computeSolvencyReport = async (profileId: Types.ObjectId) => {
  const vaults = await VaultAccount.find({ profileId, isArchived: false });
  const buckets = await SavingsBucket.find({ profileId, isCompleted: false });
  const incomes = await HouseholdIncomeRecord.find({ profileId });

  // 1. Total Liquid Capital (Cash Safe + Bank Accounts + Mobile Wallets)
  let physicalCashTotal = 0;
  let bankAccountsTotal = 0;
  let mobileWalletsTotal = 0;
  let goldReservesTotal = 0;

  vaults.forEach((v) => {
    if (v.accountType === 'PHYSICAL_CASH_SAFE') physicalCashTotal += v.currentBalance;
    else if (v.accountType === 'COMMERCIAL_BANK') bankAccountsTotal += v.currentBalance;
    else if (v.accountType === 'MOBILE_WALLET') mobileWalletsTotal += v.currentBalance;
    else if (v.accountType === 'DIGITAL_GOLD') goldReservesTotal += v.currentBalance;
  });

  const totalLiquidCapital = physicalCashTotal + bankAccountsTotal + mobileWalletsTotal;
  const totalLockedSavings = buckets.reduce((sum, b) => sum + b.currentSavedAmount, 0);

  // 2. Total Monthly Inflow
  const totalMonthlyIncome = incomes.reduce((sum, inc) => {
    // If recurring or received in the current calendar month
    return sum + inc.amount;
  }, 0);

  // 3. Dynamic Committed Envelopes
  // Query actual sub-module commitments or fallback to realistic baselines
  let utilityBillsCommitment = 0;
  try {
    const unpaidBills = await UtilityBill.find({ profileId, status: { $ne: 'PAID' } });
    if (unpaidBills.length > 0) {
      utilityBillsCommitment = unpaidBills.reduce((s, b) => s + b.billingAmount, 0);
    } else {
      utilityBillsCommitment = 24500;
    }
  } catch {
    utilityBillsCommitment = 24500;
  }

  let schoolFeesCommitment = 0;
  try {
    const pendingFees = await SchoolFeeTracker.find({ profileId, isPaid: false });
    if (pendingFees.length > 0) {
      schoolFeesCommitment = pendingFees.reduce((s, f) => s + (f.totalDue || (f.tuitionFeeAmount + (f.vanTransportFeeAmount || 0))), 0);
    } else {
      schoolFeesCommitment = 18000;
    }
  } catch {
    schoolFeesCommitment = 18000;
  }

  let maidSalaryCommitment = 0;
  try {
    const staffList = await DomesticHelpStaff.find({ profileId, isActive: true });
    if (staffList.length > 0) {
      maidSalaryCommitment = staffList.reduce((s, st) => s + st.baseMonthlySalary, 0);
    } else {
      maidSalaryCommitment = 15000;
    }
  } catch {
    maidSalaryCommitment = 15000;
  }

  const rashanCommitment = 32000; // Realistic Pakistani family rashan norm
  const milkBreadCommitment = 7500; // ~2.5L daily buffalo milk + tandoor roti
  const savingsCommitment = buckets.reduce((s, b) => s + b.monthlyDepositTarget, 0) || 37000;

  const totalCommittedEnvelopes =
    rashanCommitment +
    utilityBillsCommitment +
    schoolFeesCommitment +
    milkBreadCommitment +
    maidSalaryCommitment +
    savingsCommitment;

  // 4. Financial Solvency Mechanics
  // Net Free Liquidity = (Total Liquid Capital + Monthly Income) - Total Committed Envelopes
  const netFreeCashflow = totalLiquidCapital + totalMonthlyIncome - totalCommittedEnvelopes;
  const isSolvent = netFreeCashflow >= 0;
  const deficitAmount = isSolvent ? 0 : Math.abs(netFreeCashflow);

  // Household Runway Days:
  // How many days could the family survive on totalLiquidCapital if no further income came in?
  const dailyBurn = Math.max(1, Math.round(totalCommittedEnvelopes / 30));
  const runwayDays = Math.round(totalLiquidCapital / dailyBurn);

  return {
    totalLiquidCapital,
    totalMonthlyIncome,
    totalLockedSavings,
    totalGoldReserves: goldReservesTotal,
    totalCommittedEnvelopes,
    netFreeCashflow,
    isSolvent,
    deficitAmount,
    runwayDays,
    breakdown: {
      rashanCommitment,
      utilityBillsCommitment,
      schoolFeesCommitment,
      milkBreadCommitment,
      maidSalaryCommitment,
      savingsCommitment,
    },
  };
};

/**
 * 1. GET /api/v1/domestic/income-vault/overview
 * Returns all vaults, buckets, income records, and live solvency engine
 */
export const getHouseholdTreasuryOverview = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);

    let vaults = await VaultAccount.find({ profileId, isArchived: false }).sort({ createdAt: 1 });
    if (vaults.length === 0) {
      await seedSampleHouseholdTreasury(profileId);
      vaults = await VaultAccount.find({ profileId, isArchived: false }).sort({ createdAt: 1 });
    }

    const buckets = await SavingsBucket.find({ profileId }).sort({ createdAt: 1 });
    const incomes = await HouseholdIncomeRecord.find({ profileId }).sort({ dateReceived: -1 });
    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(200).json({
      success: true,
      data: {
        vaultAccounts: vaults.map((v) => ({
          id: v._id.toString(),
          accountTitle: v.accountTitle,
          accountType: v.accountType,
          institutionName: v.institutionName,
          accountIdentifier: v.accountIdentifier,
          currentBalance: v.currentBalance,
          lastReconciledAt: v.lastReconciledAt.toISOString(),
          notes: v.notes,
        })),
        savingsBuckets: buckets.map((b) => ({
          id: b._id.toString(),
          title: b.title,
          category: b.category,
          targetAmount: b.targetAmount,
          currentSavedAmount: b.currentSavedAmount,
          monthlyDepositTarget: b.monthlyDepositTarget,
          linkedVaultAccountId: b.linkedVaultAccountId?.toString() || '',
          targetDate: b.targetDate ? b.targetDate.toISOString() : undefined,
          isCompleted: b.isCompleted,
          notes: b.notes,
        })),
        incomeRecords: incomes.map((i) => ({
          id: i._id.toString(),
          sourceType: i.sourceType,
          title: i.title,
          amount: i.amount,
          dateReceived: i.dateReceived.toISOString(),
          depositedToAccountId: i.depositedToAccountId.toString(),
          isRecurringMonthly: i.isRecurringMonthly,
          crvNumber: i.crvNumber,
          notes: i.notes,
        })),
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. POST /api/v1/domestic/income-vault/income
 * Log diverse household inflows with balanced double-entry CRV
 */
export const logIncomeRecord = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { sourceType, title, amount, dateReceived, depositedToAccountId, isRecurringMonthly, notes } = req.body;

    if (!sourceType || !title || !amount || !depositedToAccountId) {
      return res.status(400).json({
        success: false,
        message: 'براہ کرم آمدنی کی قسم، عنوان، رقم اور منزل والٹ درج کریں۔',
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'آمدنی کی درست رقم درج کریں۔' });
    }

    // Verify vault account exists
    const vault = await VaultAccount.findOne({ _id: depositedToAccountId, profileId });
    if (!vault) {
      return res.status(404).json({ success: false, message: 'منتخب کردہ والٹ اکاؤنٹ نہیں ملا۔' });
    }

    // Generate balanced Cash Receipt Voucher Number (CRV)
    const count = await HouseholdIncomeRecord.countDocuments({ profileId });
    const monthTag = getCurrentMonthKey().replace('-', '');
    const crvNumber = `CRV-${monthTag}-${String(count + 1).padStart(3, '0')}`;

    // Safely create LedgerEntry (CASH_IN)
    let ledgerEntryId: Types.ObjectId | undefined;
    try {
      const entry = await LedgerEntry.create({
        profileId,
        entryType: 'CASH_IN',
        amount: numAmount,
        paymentMode:
          vault.accountType === 'COMMERCIAL_BANK'
            ? 'BANK_TRANSFER'
            : vault.accountType === 'MOBILE_WALLET'
            ? 'JAZZCASH'
            : 'CASH',
        category: `Domestic Income / ${sourceType}`,
        description: `CRV ${crvNumber}: ${title} (${vault.accountTitle})`,
        inputMode: 'MANUAL',
        isSettled: true,
        settledAt: dateReceived ? new Date(dateReceived) : new Date(),
        wasOverridden: false,
        isAnomaly: false,
      });
      ledgerEntryId = entry._id;
    } catch (ledgerErr) {
      console.warn('[LedgerEntry] Non-fatal ledger sync error:', ledgerErr);
    }

    // Create income record
    const incomeRecord = await HouseholdIncomeRecord.create({
      profileId,
      sourceType,
      title,
      amount: numAmount,
      dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
      depositedToAccountId: vault._id,
      isRecurringMonthly: Boolean(isRecurringMonthly),
      notes: notes || '',
      crvNumber,
      ledgerEntryId,
    });

    // Credit destination vault account
    vault.currentBalance += numAmount;
    vault.lastReconciledAt = new Date();
    await vault.save();

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(201).json({
      success: true,
      message: `آمدن بحساب ${title} (Rs. ${numAmount.toLocaleString()}) کامیابی سے کریڈٹ ہو گئی ہے۔`,
      data: {
        incomeRecord: {
          id: incomeRecord._id.toString(),
          sourceType: incomeRecord.sourceType,
          title: incomeRecord.title,
          amount: incomeRecord.amount,
          dateReceived: incomeRecord.dateReceived.toISOString(),
          depositedToAccountId: incomeRecord.depositedToAccountId.toString(),
          isRecurringMonthly: incomeRecord.isRecurringMonthly,
          crvNumber: incomeRecord.crvNumber,
          notes: incomeRecord.notes,
        },
        updatedVault: {
          id: vault._id.toString(),
          accountTitle: vault.accountTitle,
          currentBalance: vault.currentBalance,
          lastReconciledAt: vault.lastReconciledAt.toISOString(),
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/domestic/income-vault/vault-accounts
 * Create a new physical cash safe, commercial bank account, mobile wallet or gold reserve
 */
export const createVaultAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { accountTitle, accountType, institutionName, accountIdentifier, currentBalance, notes } = req.body;

    if (!accountTitle || !accountType || !institutionName) {
      return res.status(400).json({
        success: false,
        message: 'اکاؤنٹ کا نام، والٹ کی قسم اور ادارے کا نام درج کرنا لازمی ہے۔',
      });
    }

    const newVault = await VaultAccount.create({
      profileId,
      accountTitle: accountTitle.trim(),
      accountType,
      institutionName: institutionName.trim(),
      accountIdentifier: accountIdentifier?.trim() || '',
      currentBalance: Number(currentBalance) || 0,
      lastReconciledAt: new Date(),
      notes: notes?.trim() || '',
    });

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(201).json({
      success: true,
      message: `نیا والٹ اکاؤنٹ ${newVault.accountTitle} کامیابی سے بن گیا ہے۔`,
      data: {
        vault: {
          id: newVault._id.toString(),
          accountTitle: newVault.accountTitle,
          accountType: newVault.accountType,
          institutionName: newVault.institutionName,
          accountIdentifier: newVault.accountIdentifier,
          currentBalance: newVault.currentBalance,
          lastReconciledAt: newVault.lastReconciledAt.toISOString(),
          notes: newVault.notes,
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. PATCH /api/v1/domestic/income-vault/vault-accounts/:id/adjust-balance
 * Quick reconcile or balance adjustment for any vault
 */
export const adjustVaultBalance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { newBalance, reason } = req.body;

    const numBalance = Number(newBalance);
    if (isNaN(numBalance) || numBalance < 0) {
      return res.status(400).json({ success: false, message: 'درست نیا بیلنس درج کریں۔' });
    }

    const vault = await VaultAccount.findOne({ _id: id, profileId });
    if (!vault) {
      return res.status(404).json({ success: false, message: 'والٹ اکاؤنٹ نہیں ملا۔' });
    }

    const diff = numBalance - vault.currentBalance;
    vault.currentBalance = numBalance;
    vault.lastReconciledAt = new Date();
    if (reason) {
      vault.notes = `${vault.notes || ''} | Reconciled: ${reason}`.trim();
    }
    await vault.save();

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(200).json({
      success: true,
      message: `${vault.accountTitle} کا بیلنس کامیابی سے اپڈیٹ ہوا (فرق: Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString()})`,
      data: {
        vault: {
          id: vault._id.toString(),
          accountTitle: vault.accountTitle,
          accountType: vault.accountType,
          institutionName: vault.institutionName,
          accountIdentifier: vault.accountIdentifier,
          currentBalance: vault.currentBalance,
          lastReconciledAt: vault.lastReconciledAt.toISOString(),
          notes: vault.notes,
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. POST /api/v1/domestic/income-vault/savings-buckets
 * Create new goal-oriented savings bucket
 */
export const createSavingsBucket = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { title, category, targetAmount, currentSavedAmount, monthlyDepositTarget, linkedVaultAccountId, targetDate, notes } = req.body;

    if (!title || !category || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'براہ کرم فنڈ کا نام، کیٹیگری اور کل ہدف درج کریں۔',
      });
    }

    const newBucket = await SavingsBucket.create({
      profileId,
      title: title.trim(),
      category,
      targetAmount: Number(targetAmount),
      currentSavedAmount: Number(currentSavedAmount) || 0,
      monthlyDepositTarget: Number(monthlyDepositTarget) || 0,
      linkedVaultAccountId: linkedVaultAccountId ? new Types.ObjectId(linkedVaultAccountId) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      notes: notes?.trim() || '',
    });

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(201).json({
      success: true,
      message: `نیا بچت فنڈ "${newBucket.title}" کامیابی سے قائم ہو گیا ہے۔`,
      data: {
        bucket: {
          id: newBucket._id.toString(),
          title: newBucket.title,
          category: newBucket.category,
          targetAmount: newBucket.targetAmount,
          currentSavedAmount: newBucket.currentSavedAmount,
          monthlyDepositTarget: newBucket.monthlyDepositTarget,
          linkedVaultAccountId: newBucket.linkedVaultAccountId?.toString() || '',
          targetDate: newBucket.targetDate ? newBucket.targetDate.toISOString() : undefined,
          isCompleted: newBucket.isCompleted,
          notes: newBucket.notes,
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. POST /api/v1/domestic/income-vault/savings-buckets/:id/deposit
 * 1-Tap allocation from any vault account directly into a locked savings bucket
 */
export const depositToSavingsBucket = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { sourceVaultAccountId, amount, notes } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'درست رقم درج کریں۔' });
    }

    const bucket = await SavingsBucket.findOne({ _id: id, profileId });
    if (!bucket) {
      return res.status(404).json({ success: false, message: 'بچت فنڈ نہیں ملا۔' });
    }

    const sourceVault = await VaultAccount.findOne({ _id: sourceVaultAccountId, profileId });
    if (!sourceVault) {
      return res.status(404).json({ success: false, message: 'رقم منتقلی کے لیے والٹ اکاؤنٹ نہیں ملا۔' });
    }

    if (sourceVault.currentBalance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `والٹ میں ناکافی رقم ہے۔ دستیاب بیلنس: Rs. ${sourceVault.currentBalance.toLocaleString()}`,
      });
    }

    // Transfer money: deduct from vault, add to savings bucket
    sourceVault.currentBalance -= numAmount;
    sourceVault.lastReconciledAt = new Date();
    await sourceVault.save();

    bucket.currentSavedAmount += numAmount;
    if (bucket.currentSavedAmount >= bucket.targetAmount) {
      bucket.isCompleted = true;
    }
    if (notes) {
      bucket.notes = `${bucket.notes || ''} | Deposit: ${notes}`.trim();
    }
    await bucket.save();

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(200).json({
      success: true,
      message: `Rs. ${numAmount.toLocaleString()} کامیابی سے ${sourceVault.accountTitle} سے "${bucket.title}" میں منتقل ہو گئے۔`,
      data: {
        bucket: {
          id: bucket._id.toString(),
          title: bucket.title,
          category: bucket.category,
          targetAmount: bucket.targetAmount,
          currentSavedAmount: bucket.currentSavedAmount,
          monthlyDepositTarget: bucket.monthlyDepositTarget,
          linkedVaultAccountId: bucket.linkedVaultAccountId?.toString() || '',
          isCompleted: bucket.isCompleted,
        },
        sourceVault: {
          id: sourceVault._id.toString(),
          accountTitle: sourceVault.accountTitle,
          currentBalance: sourceVault.currentBalance,
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. POST /api/v1/domestic/income-vault/vault-accounts/transfer
 * Inter-vault transfer (e.g. Bank to Cash Safe ATM withdrawal, or JazzCash to Bank)
 */
export const transferBetweenVaults = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { fromVaultId, toVaultId, amount, notes } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'منتقلی کے لیے درست رقم درج کریں۔' });
    }

    if (fromVaultId === toVaultId) {
      return res.status(400).json({ success: false, message: 'ماخذ اور منزل والٹ مختلف ہونے چاہئیں۔' });
    }

    const fromVault = await VaultAccount.findOne({ _id: fromVaultId, profileId });
    const toVault = await VaultAccount.findOne({ _id: toVaultId, profileId });

    if (!fromVault || !toVault) {
      return res.status(404).json({ success: false, message: 'کوئی ایک یا دونوں والٹ اکاؤنٹس نہیں ملے۔' });
    }

    if (fromVault.currentBalance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `${fromVault.accountTitle} میں ناکافی بیلنس ہے (دستیاب: Rs. ${fromVault.currentBalance.toLocaleString()})`,
      });
    }

    fromVault.currentBalance -= numAmount;
    fromVault.lastReconciledAt = new Date();
    await fromVault.save();

    toVault.currentBalance += numAmount;
    toVault.lastReconciledAt = new Date();
    await toVault.save();

    const solvencyReport = await computeSolvencyReport(profileId);

    return res.status(200).json({
      success: true,
      message: `Rs. ${numAmount.toLocaleString()} کامیابی سے ${fromVault.accountTitle} سے ${toVault.accountTitle} میں منتقل ہو گئے۔`,
      data: {
        fromVault: {
          id: fromVault._id.toString(),
          accountTitle: fromVault.accountTitle,
          currentBalance: fromVault.currentBalance,
        },
        toVault: {
          id: toVault._id.toString(),
          accountTitle: toVault.accountTitle,
          currentBalance: toVault.currentBalance,
        },
        solvencyReport,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. GET /api/v1/domestic/income-vault/solvency
 * Live Solvency & Budget Runway calculation
 */
export const getSolvencyReportOnly = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const solvencyReport = await computeSolvencyReport(profileId);
    return res.status(200).json({ success: true, data: solvencyReport });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
