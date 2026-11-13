import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  DomesticKameti,
  IDomesticKameti,
  KametiRole,
  IInstallmentPayment,
  IOrganizerMember,
} from '../models/DomesticKameti';
import { VaultAccount } from '../models/HouseholdVault';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';
import { dispatchPushNotification } from '../services/notificationDispatcher.service';
import { kametiDrawService } from '../services/kametiDraw.service';
import { socketService } from '../services/socket.service';

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

export const normalizePakistaniPhone = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('923')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '+92' + cleaned;
  }
  return cleaned;
};

/**
 * Seed realistic Pakistani family Kametis if none exist
 */
const seedSampleDomesticKametis = async (profileId: Types.ObjectId) => {
  const now = new Date();
  const monthKey = getCurrentMonthKey();

  const date1 = new Date(now);
  date1.setMonth(date1.getMonth() - 3);
  const date2 = new Date(now);
  date2.setMonth(date2.getMonth() - 2);
  const date3 = new Date(now);
  date3.setMonth(date3.getMonth() - 1);

  await DomesticKameti.insertMany([
    {
      profileId,
      title: 'باجی شازیہ محلہ کمیٹی (Mohallah BC)',
      role: 'PARTICIPANT' as KametiRole,
      organizerName: 'باجی شازیہ (محلہ کمیٹی ہولڈر)',
      organizerPhone: '+923001234567',
      monthlyContribution: 10000,
      totalMonths: 10,
      poolAmount: 100000,
      startDate: date1,
      currentCycle: 4,
      status: 'ACTIVE',
      userPayoutMonth: 4, // Due this month!
      payoutReceived: false,
      installments: [
        {
          cycleNumber: 1,
          monthKey: '2026-07',
          paidAmount: 10000,
          paymentDate: date1,
          paymentMode: 'CASH',
          notes: 'پہلی قسط نقد ادا کی',
        },
        {
          cycleNumber: 2,
          monthKey: '2026-08',
          paidAmount: 10000,
          paymentDate: date2,
          paymentMode: 'JAZZCASH',
          notes: 'جاز کیش سے ادا کی',
        },
        {
          cycleNumber: 3,
          monthKey: '2026-09',
          paidAmount: 10000,
          paymentDate: date3,
          paymentMode: 'BANK_TRANSFER',
          notes: 'میزان بینک سے ادا کی',
        },
      ],
      notes: '10 ماہ کی محلہ کمیٹی۔ ماہ 4 میں میری وصولی کی باری ہے۔',
    },
    {
      profileId,
      title: 'آفس کولیگز بی سی فنڈ (Office BC)',
      role: 'PARTICIPANT' as KametiRole,
      organizerName: 'طارق مسعود (اکاؤنٹس ہیڈ)',
      organizerPhone: '+923219876543',
      monthlyContribution: 15000,
      totalMonths: 6,
      poolAmount: 90000,
      startDate: date2,
      currentCycle: 2,
      status: 'ACTIVE',
      userPayoutMonth: 6, // Upcoming in 4 months
      payoutReceived: false,
      installments: [
        {
          cycleNumber: 1,
          monthKey: '2026-09',
          paidAmount: 15000,
          paymentDate: date2,
          paymentMode: 'BANK_TRANSFER',
          notes: 'تنخواہ سے ٹرانسفر',
        },
        {
          cycleNumber: 2,
          monthKey: '2026-10',
          paidAmount: 15000,
          paymentDate: date3,
          paymentMode: 'BANK_TRANSFER',
          notes: 'آن لائن ادائیگی',
        },
      ],
      notes: 'آفس کے ساتھیوں کی 6 ماہ کی مختصر کمیٹی۔',
    },
    {
      profileId,
      title: 'عید الاضحیٰ قربانی بچت فنڈ',
      role: 'ORGANIZER' as KametiRole,
      organizerName: 'خودی (Self / Organizer)',
      monthlyContribution: 12000,
      totalMonths: 10,
      poolAmount: 120000,
      startDate: date1,
      currentCycle: 3,
      status: 'ACTIVE',
      userPayoutMonth: 10,
      payoutReceived: false,
      members: [
        { memberName: 'محمد سعد (خودی)', memberPhone: '+923008492011', payoutMonth: 10, payoutReceived: false, paidCycles: [1, 2, 3] },
        { memberName: 'عمران بھائی', memberPhone: '+923011112233', payoutMonth: 1, payoutReceived: true, paidCycles: [1, 2, 3] },
        { memberName: 'عثمان چوہدری', memberPhone: '+923023334455', payoutMonth: 2, payoutReceived: true, paidCycles: [1, 2, 3] },
        { memberName: 'کاشف رضا', memberPhone: '+923035556677', payoutMonth: 3, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'بلال احمد', memberPhone: '+923047778899', payoutMonth: 4, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'حمزہ طارق', memberPhone: '+923059990011', payoutMonth: 5, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'سلمان خان', memberPhone: '+923061234567', payoutMonth: 6, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'ڈاکٹر وقاص', memberPhone: '+923072345678', payoutMonth: 7, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'حسن جاوید', memberPhone: '+923083456789', payoutMonth: 8, payoutReceived: false, paidCycles: [1, 2] },
        { memberName: 'زین العابدین', memberPhone: '+923094567890', payoutMonth: 9, payoutReceived: false, paidCycles: [1, 2] },
      ],
      notes: '10 ممبران کی قربانی بچت کمیٹی۔ میں خود منتظم ہوں۔',
    },
  ]);
};

/**
 * Calculate enriched metrics for an individual Kameti
 */
const enrichKameti = (k: IDomesticKameti) => {
  const totalPaidSoFar = k.installments.reduce((sum, inst) => sum + inst.paidAmount, 0);
  const totalPaidCycles = k.installments.length;
  const totalCommittedOutflow = k.monthlyContribution * k.totalMonths;
  const remainingOutflow = Math.max(0, totalCommittedOutflow - totalPaidSoFar);

  const monthsRemainingUntilPayout = k.userPayoutMonth - k.currentCycle;
  const isPayoutDueNow = monthsRemainingUntilPayout === 0 && !k.payoutReceived;
  const isPayoutUpcoming = monthsRemainingUntilPayout > 0 && !k.payoutReceived;
  const isPostPayoutDebtor = k.payoutReceived && remainingOutflow > 0;

  // Post-payout debtor liability
  const postPayoutLiability = k.payoutReceived ? remainingOutflow : 0;

  return {
    ...k.toObject(),
    totalPaidSoFar,
    totalPaidCycles,
    remainingOutflow,
    monthsRemainingUntilPayout,
    isPayoutDueNow,
    isPayoutUpcoming,
    isPostPayoutDebtor,
    postPayoutLiability,
    progressPercentage: Math.min(100, Math.round((k.currentCycle / k.totalMonths) * 100)),
  };
};

/**
 * 1. GET /api/v1/domestic/kameti
 * Retrieve all active and completed Kametis with summary portfolio metrics
 */
export const getDomesticKametis = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);

    let kametis = await DomesticKameti.find({ profileId }).sort({ createdAt: -1 });
    if (kametis.length === 0) {
      await seedSampleDomesticKametis(profileId);
      kametis = await DomesticKameti.find({ profileId }).sort({ createdAt: -1 });
    }

    const enriched = kametis.map(enrichKameti);

    // Calculate aggregated portfolio summary
    const activeKametis = enriched.filter((k) => k.status === 'ACTIVE');
    const totalActiveCount = activeKametis.length;
    const totalMonthlyOutflow = activeKametis.reduce((sum, k) => sum + k.monthlyContribution, 0);
    const totalCapitalSaved = enriched.reduce((sum, k) => sum + k.totalPaidSoFar, 0);

    // Find the nearest upcoming payout
    const upcomingList = activeKametis
      .filter((k) => !k.payoutReceived)
      .sort((a, b) => a.monthsRemainingUntilPayout - b.monthsRemainingUntilPayout);

    const nextUpcoming = upcomingList.length > 0 ? upcomingList[0] : null;

    // Fetch user's active household vaults for 1-tap payment/deposit
    const vaults = await VaultAccount.find({ profileId, isArchived: false }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalActiveCount,
          totalMonthlyOutflow,
          totalCapitalSaved,
          nextUpcomingPayout: nextUpcoming
            ? {
                title: nextUpcoming.title,
                poolAmount: nextUpcoming.poolAmount,
                userPayoutMonth: nextUpcoming.userPayoutMonth,
                monthsRemaining: nextUpcoming.monthsRemainingUntilPayout,
                isDueNow: nextUpcoming.isPayoutDueNow,
              }
            : null,
        },
        kametis: enriched,
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
 * 2. POST /api/v1/domestic/kameti
 * Dynamically create / add ANY number of Kametis directly from mobile
 */
export const createDomesticKameti = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const {
      title,
      role = 'PARTICIPANT',
      organizerName,
      organizerPhone,
      monthlyContribution,
      totalMonths,
      startDate,
      userPayoutMonth,
      notes,
      members = [],
    } = req.body;

    if (!title || !monthlyContribution || !totalMonths) {
      return res.status(400).json({
        success: false,
        message: 'کمیٹی کا نام، ماہانہ قسط اور کل مہینے درج کرنا لازمی ہے۔',
      });
    }

    const contribution = Number(monthlyContribution);
    const months = Number(totalMonths);
    const poolAmount = contribution * months;

    // Process members if provided during creation
    const processedMembers: any[] = [];
    if (Array.isArray(members) && members.length > 0) {
      for (const m of members) {
        if (!m.memberName || !m.memberName.trim()) continue;
        const normalizedPhone = m.memberPhone ? normalizePakistaniPhone(m.memberPhone) : '';
        const bare10 = normalizedPhone ? normalizedPhone.replace('+92', '0') : '';

        let matchedProfile: any = null;
        if (normalizedPhone) {
          matchedProfile = await Profile.findOne({
            $or: [
              { phone: normalizedPhone },
              { phone: bare10 },
              { 'subAccounts.phone': normalizedPhone },
              { 'subAccounts.phone': bare10 },
            ],
          });
        }

        const isGharUser =
          matchedProfile &&
          (matchedProfile.activePersona === 'HOUSEHOLD' ||
            matchedProfile.registeredAccountType === 'HOUSEHOLD' ||
            matchedProfile.activePersona === 'HYBRID');

        processedMembers.push({
          memberName: m.memberName.trim(),
          memberPhone: m.memberPhone ? m.memberPhone.trim() : '',
          normalizedPhone,
          memberProfileId: matchedProfile ? matchedProfile._id : undefined,
          inviteStatus: isGharUser ? 'LINKED' : 'UNREGISTERED',
          payoutMonth: Number(m.payoutMonth) || 1,
          payoutReceived: false,
          paidCycles: [],
          joinedAt: new Date(),
        });

        // If Ghar user, dispatch real-time in-app notification!
        if (isGharUser && matchedProfile) {
          const orgName = (organizerName || 'منتظم کمیٹی').trim();
          dispatchPushNotification(matchedProfile._id.toString(), {
            id: `kameti-invite-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            category: 'FINANCIAL_METRICS_SYNC',
            priority: 'SUCCESS',
            titleUrdu: 'نئی کمیٹی دعوت! 🎉',
            titleEnglish: 'New Kameti Invitation',
            messageUrdu: `${orgName} نے آپ کو "${title.trim()}" میں شامل کیا ہے (ماہانہ قسط: Rs. ${contribution.toLocaleString()}، آپ کی وصولی: ماہ ${m.payoutMonth || 1})`,
            messageEnglish: `You have been added to ${title.trim()} by ${orgName}.`,
            timestamp: new Date().toISOString(),
            actionRoute: 'KametiCommitteeModal',
            metadata: {
              title: title.trim(),
              monthlyContribution: contribution,
              payoutMonth: Number(m.payoutMonth) || 1,
            },
          });
        }
      }
    }

    const newKameti = await DomesticKameti.create({
      profileId,
      title: title.trim(),
      role: role === 'ORGANIZER' ? 'ORGANIZER' : 'PARTICIPANT',
      organizerName: (organizerName || (role === 'ORGANIZER' ? 'خودی (Self)' : 'کمیٹی ہولڈر')).trim(),
      organizerPhone: organizerPhone?.trim() || '',
      monthlyContribution: contribution,
      totalMonths: months,
      poolAmount,
      startDate: startDate ? new Date(startDate) : new Date(),
      currentCycle: 1,
      status: 'ACTIVE',
      userPayoutMonth: Number(userPayoutMonth) || 1,
      payoutReceived: false,
      installments: [],
      members: processedMembers,
      notes: notes?.trim() || '',
    });

    return res.status(201).json({
      success: true,
      message: `نئی کمیٹی "${newKameti.title}" کامیابی سے شامل کر دی گئی ہے۔`,
      data: enrichKameti(newKameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/domestic/kameti/:id/pay-installment
 * 1-Tap Pay Installment: Debits Vault, logs LedgerEntry (CASH_OUT), and marks cycle paid
 */
export const payKametiInstallment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const {
      cycleNumber,
      amount,
      debitedFromVaultAccountId,
      paymentMode = 'CASH',
      transactionId,
      notes,
    } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی کا ریکارڈ نہیں ملا۔' });
    }

    const cycleToPay = cycleNumber !== undefined ? Number(cycleNumber) : kameti.currentCycle;
    const installmentAmount = amount !== undefined ? Number(amount) : kameti.monthlyContribution;

    // Check if already paid for this cycle
    const alreadyPaid = kameti.installments.some((inst) => inst.cycleNumber === cycleToPay);
    if (alreadyPaid) {
      return res.status(400).json({
        success: false,
        message: `ماہ / سائیکل #${cycleToPay} کی قسط پہلے ہی ادا ہو چکی ہے۔`,
      });
    }

    // Handle Vault Debit if specified
    let ledgerEntryId: Types.ObjectId | undefined;
    if (debitedFromVaultAccountId) {
      const vault = await VaultAccount.findOne({ _id: debitedFromVaultAccountId, profileId });
      if (vault) {
        if (vault.currentBalance < installmentAmount) {
          return res.status(400).json({
            success: false,
            message: `${vault.accountTitle} میں ناکافی بیلنس ہے (دستیاب: Rs. ${vault.currentBalance.toLocaleString()})`,
          });
        }
        vault.currentBalance -= installmentAmount;
        vault.lastReconciledAt = new Date();
        await vault.save();

        // Safely log double-entry LedgerEntry (CASH_OUT)
        try {
          const entry = await LedgerEntry.create({
            profileId,
            entryType: 'CASH_OUT',
            amount: installmentAmount,
            paymentMode:
              vault.accountType === 'COMMERCIAL_BANK'
                ? 'BANK_TRANSFER'
                : vault.accountType === 'MOBILE_WALLET'
                ? 'JAZZCASH'
                : 'CASH',
            category: 'Kameti Installment',
            description: `Kameti: ${kameti.title} (Cycle #${cycleToPay})`,
            inputMode: 'MANUAL',
            isSettled: true,
            settledAt: new Date(),
            wasOverridden: false,
            isAnomaly: false,
          });
          ledgerEntryId = entry._id;
        } catch (lErr) {
          console.warn('[LedgerEntry] Installment sync warning:', lErr);
        }
      }
    }

    const monthKey = getCurrentMonthKey();
    const newPayment: IInstallmentPayment = {
      cycleNumber: cycleToPay,
      monthKey,
      paidAmount: installmentAmount,
      paymentDate: new Date(),
      debitedFromVaultAccountId: debitedFromVaultAccountId ? new Types.ObjectId(debitedFromVaultAccountId) : undefined,
      paymentMode,
      transactionId: transactionId?.trim(),
      notes: notes?.trim(),
      ledgerEntryId,
    };

    kameti.installments.push(newPayment);
    await kameti.save();

    return res.status(200).json({
      success: true,
      message: `ماہ #${cycleToPay} کی قسط (Rs. ${installmentAmount.toLocaleString()}) کامیابی سے ادا ہو گئی۔`,
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. POST /api/v1/domestic/kameti/:id/collect-payout
 * 1-Tap Collect Payout: Credits Vault, logs LedgerEntry (CASH_IN), and records payout
 */
export const collectKametiPayout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { creditedToVaultAccountId, amount, paymentMode = 'BANK_TRANSFER', notes } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی کا ریکارڈ نہیں ملا۔' });
    }

    if (kameti.payoutReceived) {
      return res.status(400).json({
        success: false,
        message: 'اس کمیٹی کی وصولی پہلے ہی درج کی جا چکی ہے۔',
      });
    }

    const payoutAmount = amount !== undefined ? Number(amount) : kameti.poolAmount;

    // Handle Vault Credit if specified
    if (creditedToVaultAccountId) {
      const vault = await VaultAccount.findOne({ _id: creditedToVaultAccountId, profileId });
      if (vault) {
        vault.currentBalance += payoutAmount;
        vault.lastReconciledAt = new Date();
        await vault.save();

        // Safely log double-entry LedgerEntry (CASH_IN)
        try {
          await LedgerEntry.create({
            profileId,
            entryType: 'CASH_IN',
            amount: payoutAmount,
            paymentMode:
              vault.accountType === 'COMMERCIAL_BANK'
                ? 'BANK_TRANSFER'
                : vault.accountType === 'MOBILE_WALLET'
                ? 'JAZZCASH'
                : 'CASH',
            category: 'Kameti Payout Pot',
            description: `Kameti Payout Pot: ${kameti.title}`,
            inputMode: 'MANUAL',
            isSettled: true,
            settledAt: new Date(),
            wasOverridden: false,
            isAnomaly: false,
          });
        } catch (lErr) {
          console.warn('[LedgerEntry] Payout sync warning:', lErr);
        }
      }
    }

    kameti.payoutReceived = true;
    kameti.payoutDate = new Date();
    kameti.payoutAmountReceived = payoutAmount;
    kameti.creditedToVaultAccountId = creditedToVaultAccountId ? new Types.ObjectId(creditedToVaultAccountId) : undefined;
    if (notes) {
      kameti.notes = `${kameti.notes || ''} | Payout: ${notes}`.trim();
    }
    await kameti.save();

    return res.status(200).json({
      success: true,
      message: `مبارک ہو! کمیٹی کی وصولی (Rs. ${payoutAmount.toLocaleString()}) کامیابی سے والٹ میں محفوظ ہو گئی ہے۔`,
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. PATCH /api/v1/domestic/kameti/:id/advance-cycle
 * Advance Kameti pool to next month cycle
 */
export const advanceKametiCycle = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    if (kameti.currentCycle >= kameti.totalMonths) {
      kameti.status = 'COMPLETED';
    } else {
      kameti.currentCycle += 1;
    }

    await kameti.save();

    return res.status(200).json({
      success: true,
      message: kameti.status === 'COMPLETED'
        ? `کمیٹی "${kameti.title}" کا دورانیہ مکمل ہو گیا۔`
        : `کمیٹی اگلے ماہ #${kameti.currentCycle} پر منتقل ہو گئی۔`,
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. DELETE /api/v1/domestic/kameti/:id
 * Delete a Kameti from the user's portfolio
 */
export const deleteDomesticKameti = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;

    const kameti = await DomesticKameti.findOneAndDelete({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    return res.status(200).json({
      success: true,
      message: `کمیٹی "${kameti.title}" کامیابی سے ختم کر دی گئی ہے۔`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. GET /api/v1/domestic/kameti/:id/share-text
 * Generate formatted WhatsApp payment slip
 */
export const getKametiShareSlip = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { cycleNumber } = req.query;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const enriched = enrichKameti(kameti);
    const cycle = cycleNumber ? Number(cycleNumber) : kameti.currentCycle;

    const slip = `🧾 *ڈیجی حساب — کمیٹی قسط ادائیگی کی رسید*
---------------------------------
🤝 *کمیٹی کا نام*: ${kameti.title}
👤 *ہولڈر*: ${kameti.organizerName} ${kameti.organizerPhone ? `(${kameti.organizerPhone})` : ''}
🔢 *قسط نمبر*: ماہ ${cycle} / ${kameti.totalMonths}
💰 *ماہانہ رقم*: Rs. ${kameti.monthlyContribution.toLocaleString()}
📅 *تاریخ*: ${new Date().toLocaleDateString('ur-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
---------------------------------
📊 *اب تک کی کل ادائیگی*: Rs. ${enriched.totalPaidSoFar.toLocaleString()} / Rs. ${enriched.poolAmount.toLocaleString()}
🎯 *آپ کی وصولی کی باری*: ماہ ${kameti.userPayoutMonth} (${kameti.payoutReceived ? 'وصول شدہ ✅' : enriched.isPayoutDueNow ? 'رواں ماہ متوقع 🎉' : `${enriched.monthsRemainingUntilPayout} ماہ باقی ⏳`})
🛡️ *ڈیجیٹل والٹ آرکائیو*: رسید محفوظ ہے۔
✅ DigiHisab Domestic Ledger • خاندانی مالی تحفظ`;

    return res.status(200).json({
      success: true,
      data: {
        shareText: slip,
        kametiTitle: kameti.title,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. POST /api/v1/domestic/kameti/lookup-member
 * Check if a phone number exists in DigiHisab with Ghar (Household) Persona
 */
export const lookupMemberByPhone = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'فون نمبر درکار ہے۔' });
    }

    const normalized = normalizePakistaniPhone(phone);
    const bare10 = normalized.replace('+92', '0');

    // Search for profile matching normalized or local format
    const profile = await Profile.findOne({
      $or: [
        { phone: normalized },
        { phone: bare10 },
        { 'subAccounts.phone': normalized },
        { 'subAccounts.phone': bare10 },
      ],
    });

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          isRegistered: false,
          isGharPersona: false,
          normalizedPhone: normalized,
        },
      });
    }

    const isGhar =
      profile.activePersona === 'HOUSEHOLD' ||
      profile.registeredAccountType === 'HOUSEHOLD' ||
      profile.activePersona === 'HYBRID';

    return res.status(200).json({
      success: true,
      data: {
        isRegistered: true,
        isGharPersona: isGhar,
        profileId: profile._id.toString(),
        memberName: profile.fullName || 'DigiHisab User',
        normalizedPhone: normalized,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. POST /api/v1/domestic/kameti/:id/members
 * Add a member to a Kameti pool, linking Ghar persona user and dispatching push notification
 */
export const addMemberToKameti = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { memberName, memberPhone, payoutMonth } = req.body;

    if (!memberName || !memberName.trim()) {
      return res.status(400).json({ success: false, message: 'ممبر کا نام درکار ہے۔' });
    }
    const pMonth = parseInt(payoutMonth, 10);
    if (isNaN(pMonth) || pMonth < 1) {
      return res.status(400).json({ success: false, message: 'وصولی کا مہینہ درست منتخب کریں۔' });
    }

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const normalizedPhone = memberPhone ? normalizePakistaniPhone(memberPhone) : '';
    const bare10 = normalizedPhone ? normalizedPhone.replace('+92', '0') : '';

    // Lookup if member is in DigiHisab
    let matchedProfile: any = null;
    if (normalizedPhone) {
      matchedProfile = await Profile.findOne({
        $or: [
          { phone: normalizedPhone },
          { phone: bare10 },
          { 'subAccounts.phone': normalizedPhone },
          { 'subAccounts.phone': bare10 },
        ],
      });
    }

    const isGharUser =
      matchedProfile &&
      (matchedProfile.activePersona === 'HOUSEHOLD' ||
        matchedProfile.registeredAccountType === 'HOUSEHOLD' ||
        matchedProfile.activePersona === 'HYBRID');

    const newMember: any = {
      memberName: memberName.trim(),
      memberPhone: memberPhone ? memberPhone.trim() : '',
      normalizedPhone,
      memberProfileId: matchedProfile ? matchedProfile._id : undefined,
      inviteStatus: isGharUser ? 'LINKED' : 'UNREGISTERED',
      payoutMonth: pMonth,
      payoutReceived: false,
      paidCycles: [],
      joinedAt: new Date(),
    };

    kameti.members.push(newMember);
    await kameti.save();

    // If Ghar user, dispatch real-time in-app notification!
    if (isGharUser && matchedProfile) {
      const organizerName = kameti.organizerName || 'منتظم کمیٹی';
      dispatchPushNotification(matchedProfile._id.toString(), {
        id: `kameti-invite-${Date.now()}`,
        category: 'FINANCIAL_METRICS_SYNC',
        priority: 'SUCCESS',
        titleUrdu: 'نئی کمیٹی دعوت! 🎉',
        titleEnglish: 'New Kameti Invitation',
        messageUrdu: `${organizerName} نے آپ کو "${kameti.title}" میں شامل کیا ہے (ماہانہ قسط: Rs. ${kameti.monthlyContribution.toLocaleString()}، وصولی: ماہ ${pMonth})`,
        messageEnglish: `You have been added to ${kameti.title} by ${organizerName}.`,
        timestamp: new Date().toISOString(),
        actionRoute: 'KametiCommitteeModal',
        metadata: {
          kametiId: kameti._id.toString(),
          organizerName,
          title: kameti.title,
          monthlyContribution: kameti.monthlyContribution,
          payoutMonth: pMonth,
        },
      });
    }

    // Prepare WhatsApp invite text
    const whatsappInvite = `🤝 *السلام علیکم ${memberName}!*
آپ کو *"${kameti.title}"* میں بطور معزز ممبر شامل کیا گیا ہے۔

📋 *کمیٹی کی تفصیلات:*
• کل کمیٹی پول: Rs. ${kameti.poolAmount.toLocaleString()}
• ماہانہ قسط: Rs. ${kameti.monthlyContribution.toLocaleString()}
• کل مدت: ${kameti.totalMonths} ماہ
• آپ کی وصولی کا مہینہ: ماہ ${pMonth} (Rs. ${kameti.poolAmount.toLocaleString()})
• منتظم / ہولڈر: ${kameti.organizerName} ${kameti.organizerPhone ? `(${kameti.organizerPhone})` : ''}

📲 کمیٹی کے تمام اقساط اور وصولی کی تاریخ ٹریک کرنے کے لیے DigiHisab ایپ حاصل کریں:
https://digihisab.pk/app
---------------------------------
ڈیجی حساب • خاندانی کمیٹی و بچت کھاتہ`;

    return res.status(200).json({
      success: true,
      message: isGharUser
        ? `ممبر "${memberName}" کو شامل کر کے ایپ میں نوٹیفکیشن بھیج دیا گیا ہے!`
        : `ممبر "${memberName}" شامل ہو گیا ہے۔ آپ واٹس ایپ پر تفصیلات بھیج سکتے ہیں۔`,
      data: {
        kameti: enrichKameti(kameti),
        addedMember: newMember,
        isGharUser: !!isGharUser,
        whatsappInvite,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. POST /api/v1/domestic/kameti/:id/members/:memberId/toggle-paid
 * Organizer toggles a specific cycle paid for a member
 */
export const toggleMemberPayment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id, memberId } = req.params;
    const { cycleNumber } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const member = (kameti.members as any).id(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'ممبر نہیں ملا۔' });
    }

    const cycle = Number(cycleNumber) || kameti.currentCycle;
    const paidIdx = member.paidCycles.indexOf(cycle);
    let isNowPaid = false;

    if (paidIdx >= 0) {
      member.paidCycles.splice(paidIdx, 1);
      isNowPaid = false;
    } else {
      member.paidCycles.push(cycle);
      member.paidCycles.sort((a: number, b: number) => a - b);
      isNowPaid = true;
    }

    await kameti.save();

    // If member is linked, dispatch push notification
    if (member.memberProfileId && isNowPaid) {
      dispatchPushNotification(member.memberProfileId.toString(), {
        id: `kameti-paid-${Date.now()}`,
        category: 'FINANCIAL_METRICS_SYNC',
        priority: 'INFO',
        titleUrdu: 'کمیٹی قسط وصولی تصدیق ✅',
        titleEnglish: 'Kameti Installment Verified',
        messageUrdu: `منتظم نے "${kameti.title}" میں آپ کی ماہ ${cycle} کی قسط (Rs. ${kameti.monthlyContribution.toLocaleString()}) وصول شدہ مارک کر دی ہے۔`,
        messageEnglish: `Payment for cycle ${cycle} confirmed in ${kameti.title}.`,
        timestamp: new Date().toISOString(),
        actionRoute: 'KametiCommitteeModal',
        metadata: { kametiId: kameti._id.toString(), cycle },
      });
    }

    return res.status(200).json({
      success: true,
      message: isNowPaid
        ? `${member.memberName} کی ماہ ${cycle} کی قسط وصول شدہ درج ہو گئی۔`
        : `${member.memberName} کی ماہ ${cycle} کی قسط غیر ادا شدہ ہو گئی۔`,
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. GET /api/v1/domestic/kameti/:id/members/:memberId/invite-text
 * Generate WhatsApp invitation message for a specific member
 */
export const getMemberInviteText = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id, memberId } = req.params;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const member = (kameti.members as any).id(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'ممبر نہیں ملا۔' });
    }

    const whatsappInvite = `🤝 *السلام علیکم ${member.memberName}!*
آپ کو *"${kameti.title}"* میں بطور معزز ممبر شامل کیا گیا ہے۔

📋 *کمیٹی کی تفصیلات:*
• کل کمیٹی پول: Rs. ${kameti.poolAmount.toLocaleString()}
• ماہانہ قسط: Rs. ${kameti.monthlyContribution.toLocaleString()}
• کل مدت: ${kameti.totalMonths} ماہ
• آپ کی وصولی کا مہینہ: ماہ ${member.payoutMonth} (Rs. ${kameti.poolAmount.toLocaleString()})
• منتظم / ہولڈر: ${kameti.organizerName} ${kameti.organizerPhone ? `(${kameti.organizerPhone})` : ''}

📲 اقساط کی رسید اور اپنی وصولی کا وقت ٹریک کرنے کے لیے DigiHisab ایپ ڈاؤن لوڈ کریں:
https://digihisab.pk/app
---------------------------------
ڈیجی حساب • خاندانی کمیٹی و بچت کھاتہ`;

    return res.status(200).json({
      success: true,
      data: {
        shareText: whatsappInvite,
        memberName: member.memberName,
        memberPhone: member.memberPhone,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. PATCH /api/v1/domestic/kameti/:id/swap-payout-months
 * Swaps payout receiving months between two members or changes a member's payout month
 */
export const swapPayoutMonths = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { memberId1, memberId2, newPayoutMonth } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const m1 = (kameti.members as any).id(memberId1);
    if (!m1) {
      return res.status(404).json({ success: false, message: 'پہلا ممبر نہیں ملا۔' });
    }

    if (memberId2) {
      const m2 = (kameti.members as any).id(memberId2);
      if (!m2) {
        return res.status(404).json({ success: false, message: 'دوسرا ممبر نہیں ملا۔' });
      }
      // Swap payout months
      const temp = m1.payoutMonth;
      m1.payoutMonth = m2.payoutMonth;
      m2.payoutMonth = temp;
    } else if (newPayoutMonth !== undefined) {
      const targetMonth = Number(newPayoutMonth);
      if (targetMonth < 1 || targetMonth > kameti.totalMonths) {
        return res.status(400).json({ success: false, message: 'وصولی کا مہینہ درست نہیں ہے۔' });
      }
      // If another member has this month, swap with them
      const other = kameti.members.find(
        (m: any) => m._id.toString() !== memberId1 && m.payoutMonth === targetMonth
      );
      if (other) {
        other.payoutMonth = m1.payoutMonth;
      }
      m1.payoutMonth = targetMonth;
    }

    await kameti.save();

    return res.status(200).json({
      success: true,
      message: 'وصولی کے مہینوں کی ترتیب کامیابی سے تبدیل ہو گئی ہے۔',
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. DELETE /api/v1/domestic/kameti/:id/members/:memberId
 * Delete a member slot from an existing Kameti
 */
export const deleteMemberFromKameti = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id, memberId } = req.params;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const memberIdx = kameti.members.findIndex((m: any) => m._id.toString() === memberId);
    if (memberIdx === -1) {
      return res.status(404).json({ success: false, message: 'ممبر نہیں ملا۔' });
    }

    const deletedMember = kameti.members[memberIdx];
    kameti.members.splice(memberIdx, 1);
    await kameti.save();

    return res.status(200).json({
      success: true,
      message: `ممبر "${deletedMember.memberName}" کا سلاٹ کامیابی سے حذف کر دیا گیا ہے۔`,
      data: enrichKameti(kameti),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 14. POST /api/v1/domestic/kameti/:id/run-draw
 * Executes cryptographically fair Lucky Draw or Bidding Auction
 */
export const runKametiDraw = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const {
      kametiType = 'LUCKY_DRAW',
      pinnedSlots = [],
      bidWinnerMemberId,
      bidDiscountAmount = 0,
    } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    if (!Array.isArray(kameti.members) || kameti.members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'قرعہ اندازی کے لیے پہلے کمیٹی میں ممبرز شامل کریں۔',
      });
    }

    // Convert members into draw candidates
    const candidates = kameti.members.map((m: any) => {
      const pin = (pinnedSlots as any[]).find(
        (p) => p.memberId === m._id.toString() || p.memberName === m.memberName
      );
      return {
        id: m._id.toString(),
        name: m.memberName,
        phone: m.memberPhone,
        pinnedMonth: pin ? Number(pin.month) : undefined,
      };
    });

    // Execute Fair Fisher-Yates Draw
    const drawResult = kametiDrawService.executeFairDraw(
      candidates,
      kameti.totalMonths,
      kameti.poolAmount
    );

    // If Neelaam / Bidding Auction was chosen and a winner/discount provided
    let schedule = drawResult.schedule;
    let dividend = 0;
    if (kametiType === 'NEELAAM_BID' && bidWinnerMemberId && Number(bidDiscountAmount) > 0) {
      const auctionRes = kametiDrawService.applyBiddingAuction(
        schedule,
        kameti.currentCycle,
        bidWinnerMemberId,
        Number(bidDiscountAmount),
        kameti.totalMonths,
        kameti.poolAmount
      );
      schedule = auctionRes.updatedSchedule;
      dividend = auctionRes.dividendPerMember;
    }

    // Update each member's designated payout month in the members array
    kameti.members.forEach((m: any) => {
      const match = schedule.find((s) => s.memberId.toString() === m._id.toString());
      if (match) {
        m.payoutMonth = match.cycleNumber;
      }
    });

    kameti.kametiType = kametiType;
    kameti.isDrawCompleted = true;
    kameti.drawDate = drawResult.drawDate;
    kameti.drawSeedHash = drawResult.drawSeedHash;
    kameti.drawSchedule = schedule;

    await kameti.save();

    // Broadcast draw completion in real-time
    try {
      const io = socketService.getIO();
      if (io) {
        io.emit('kameti:draw_completed', {
          kametiId: kameti._id.toString(),
          title: kameti.title,
          schedule,
          drawSeedHash: drawResult.drawSeedHash,
        });
      }
    } catch (sockErr: any) {
      console.warn('[KametiDraw] Socket emit warning:', sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: drawResult.summaryUrdu,
      data: {
        kameti: enrichKameti(kameti),
        schedule,
        drawSeedHash: drawResult.drawSeedHash,
        dividendPerMember: dividend,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 15. POST /api/v1/domestic/kameti/:id/disburse-payout
 * Handover committee payout to the designated recipient for the cycle
 */
export const disburseKametiPayout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const {
      cycleNumber,
      debitedFromVaultAccountId,
      paymentMode = 'CASH',
      notes,
    } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const cNum = Number(cycleNumber) || kameti.currentCycle;

    // Find recipient in drawSchedule or fallback to members
    let scheduleItem = (kameti.drawSchedule as any[])?.find((s) => s.cycleNumber === cNum);
    let recipientMember = (kameti.members as any[])?.find((m) => m.payoutMonth === cNum);

    if (!scheduleItem && !recipientMember) {
      return res.status(400).json({
        success: false,
        message: `ماہ #${cNum} کا کوئی نامزد وصول کنندہ نہیں ملا۔ پہلے قرعہ اندازی مکمل کریں۔`,
      });
    }

    if (scheduleItem && scheduleItem.payoutStatus === 'DISBURSED') {
      return res.status(400).json({
        success: false,
        message: `ماہ #${cNum} کی رقم پہلے ہی ادا کی جا چکی ہے (واؤچر #${scheduleItem.voucherNumber})۔`,
      });
    }

    const recipientName = scheduleItem?.memberName || recipientMember?.memberName || 'معزز ممبر';
    const recipientPhone = scheduleItem?.memberPhone || recipientMember?.memberPhone || '';
    const grossPool = kameti.poolAmount;
    const discount = scheduleItem?.bidDiscountAmount || 0;
    const netAmount = scheduleItem?.netPayoutAmount || grossPool - discount;

    // Debit Vault if specified
    let vaultTitle: string | undefined;
    if (debitedFromVaultAccountId) {
      const vault = await VaultAccount.findOne({ _id: debitedFromVaultAccountId, profileId });
      if (vault) {
        if (vault.currentBalance < netAmount) {
          return res.status(400).json({
            success: false,
            message: `${vault.accountTitle} میں رقم ناکافی ہے (موجود: Rs. ${vault.currentBalance.toLocaleString()})`,
          });
        }
        vault.currentBalance -= netAmount;
        vault.lastReconciledAt = new Date();
        await vault.save();
        vaultTitle = vault.accountTitle;

        // Log double-entry LedgerEntry (CASH_OUT)
        try {
          await LedgerEntry.create({
            profileId,
            entryType: 'CASH_OUT',
            amount: netAmount,
            paymentMode:
              vault.accountType === 'COMMERCIAL_BANK'
                ? 'BANK_TRANSFER'
                : vault.accountType === 'MOBILE_WALLET'
                ? 'JAZZCASH'
                : 'CASH',
            category: 'Kameti Payout',
            description: `Kameti Payout: ${kameti.title} (Cycle #${cNum}) - ${recipientName}`,
            inputMode: 'MANUAL',
            isSettled: true,
            settledAt: new Date(),
            wasOverridden: false,
            isAnomaly: false,
          });
        } catch (lErr: any) {
          console.warn('[LedgerEntry] Kameti payout sync warning:', lErr.message);
        }
      }
    }

    // Generate unique Voucher Number & Receipt Chits
    const voucherNumber = kametiDrawService.generateVoucherNumber(cNum);
    const { thermalChit, whatsappSlip } = kametiDrawService.formatPayoutChit({
      kametiTitle: kameti.title,
      organizerName: kameti.organizerName,
      organizerPhone: kameti.organizerPhone,
      voucherNumber,
      cycleNumber: cNum,
      totalMonths: kameti.totalMonths,
      recipientName,
      recipientPhone,
      grossPoolAmount: grossPool,
      bidDiscountAmount: discount,
      netAmount,
      paymentMode,
      vaultAccountTitle: vaultTitle,
      disbursementDate: new Date(),
      notes,
    });

    // Update draw schedule item
    if (scheduleItem) {
      scheduleItem.payoutStatus = 'DISBURSED';
      scheduleItem.payoutDate = new Date();
      scheduleItem.voucherNumber = voucherNumber;
      scheduleItem.disbursedByVaultId = debitedFromVaultAccountId
        ? new Types.ObjectId(debitedFromVaultAccountId)
        : undefined;
      scheduleItem.paymentMode = paymentMode;
      scheduleItem.notes = notes?.trim();
    }

    // Mark recipient member as paid
    if (recipientMember) {
      recipientMember.payoutReceived = true;
    }

    // Record in kameti.payoutVouchers
    if (!kameti.payoutVouchers) {
      kameti.payoutVouchers = [];
    }
    kameti.payoutVouchers.push({
      voucherNumber,
      cycleNumber: cNum,
      recipientName,
      recipientPhone,
      grossPoolAmount: grossPool,
      bidDiscountAmount: discount,
      netAmount,
      paymentMode,
      disbursementDate: new Date(),
      shareSlipText: whatsappSlip,
    });

    await kameti.save();

    // Broadcast payout disbursement in real time
    try {
      const io = socketService.getIO();
      if (io) {
        io.emit('kameti:payout_disbursed', {
          kametiId: kameti._id.toString(),
          cycleNumber: cNum,
          voucherNumber,
          recipientName,
          netAmount,
        });
      }
    } catch (sockErr: any) {
      console.warn('[KametiPayout] Socket emit warning:', sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `ماہ #${cNum} کی کمیٹی (Rs. ${netAmount.toLocaleString()}) کامیابی سے ادا کر دی گئی ہے۔`,
      data: {
        voucherNumber,
        thermalChit,
        whatsappSlip,
        kameti: enrichKameti(kameti),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 16. GET /api/v1/domestic/kameti/:id/payout-voucher/:cycleNumber
 * Retrieve thermal receipt chit and share text for printing/sharing
 */
export const getKametiPayoutVoucher = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id, cycleNumber } = req.params;
    const cNum = Number(cycleNumber);

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const voucher = (kameti.payoutVouchers as any[])?.find((v) => v.cycleNumber === cNum);
    const scheduleItem = (kameti.drawSchedule as any[])?.find((s) => s.cycleNumber === cNum);

    const recipientName = voucher?.recipientName || scheduleItem?.memberName || 'معزز ممبر';
    const recipientPhone = voucher?.recipientPhone || scheduleItem?.memberPhone || '';
    const voucherNumber = voucher?.voucherNumber || scheduleItem?.voucherNumber || `KMT-C${cNum}`;
    const grossPool = voucher?.grossPoolAmount || kameti.poolAmount;
    const discount = voucher?.bidDiscountAmount || scheduleItem?.bidDiscountAmount || 0;
    const netAmount = voucher?.netAmount || scheduleItem?.netPayoutAmount || grossPool - discount;
    const paymentMode = voucher?.paymentMode || scheduleItem?.paymentMode || 'CASH';

    const { thermalChit, whatsappSlip } = kametiDrawService.formatPayoutChit({
      kametiTitle: kameti.title,
      organizerName: kameti.organizerName,
      organizerPhone: kameti.organizerPhone,
      voucherNumber,
      cycleNumber: cNum,
      totalMonths: kameti.totalMonths,
      recipientName,
      recipientPhone,
      grossPoolAmount: grossPool,
      bidDiscountAmount: discount,
      netAmount,
      paymentMode,
      disbursementDate: voucher?.disbursementDate || scheduleItem?.payoutDate,
    });

    return res.status(200).json({
      success: true,
      data: {
        voucherNumber,
        thermalChit,
        shareText: whatsappSlip,
        recipientName,
        recipientPhone,
        netAmount,
        cycleNumber: cNum,
        isDisbursed: scheduleItem?.payoutStatus === 'DISBURSED',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 17. POST /api/v1/domestic/kameti/:id/send-reminders
 * Generates direct WhatsApp click-to-chat links and push alerts for unpaid members
 */
export const sendKametiReminders = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;
    const { cycleNumber } = req.body;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const cNum = Number(cycleNumber) || kameti.currentCycle;
    const unpaidMembers: any[] = [];

    if (Array.isArray(kameti.members)) {
      for (const m of kameti.members) {
        const hasPaid = m.paidCycles && m.paidCycles.includes(cNum);
        if (!hasPaid) {
          const reminderText = `🤝 *السلام علیکم ${m.memberName}!*
"${kameti.title}" کی *ماہ #${cNum}* کی قسط کا وقت ہو گیا ہے۔

💰 *واجب الادا رقم*: Rs. ${kameti.monthlyContribution.toLocaleString()}
🗓️ *سائیکل*: ماہ ${cNum} از ${kameti.totalMonths}
👤 *منتظم*: ${kameti.organizerName} ${kameti.organizerPhone ? `(${kameti.organizerPhone})` : ''}

برائے مہربانی قسط جلد از جلد جمع کروا دیں تاکہ وقت پر قرعہ اندازی و ادائیگی مکمل کی جا سکے۔ شکریہ!
---------------------------------
ڈیجی حساب • خاندانی شفاف کمیٹی کھاتہ`;

          let waPhone = m.memberPhone ? m.memberPhone.replace(/[\s\-\(\)\+]/g, '') : '';
          if (waPhone.startsWith('03')) waPhone = '92' + waPhone.substring(1);

          unpaidMembers.push({
            memberId: (m._id || '').toString(),
            memberName: m.memberName,
            memberPhone: m.memberPhone,
            amountDue: kameti.monthlyContribution,
            cycleNumber: cNum,
            whatsappUrl: waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(reminderText)}` : undefined,
            reminderText,
          });

          // Also dispatch in-app push notification if linked
          if (m.memberProfileId) {
            dispatchPushNotification(m.memberProfileId.toString(), {
              id: `kameti-remind-${kameti._id}-${cNum}-${m._id || 'slot'}`,
              category: 'FINANCIAL_METRICS_SYNC',
              priority: 'INFO',
              titleUrdu: 'کمیٹی قسط یاد دہانی 🔔',
              titleEnglish: 'Kameti Installment Reminder',
              messageUrdu: `السلام علیکم ${m.memberName}! "${kameti.title}" کی ماہ #${cNum} کی قسط (Rs. ${kameti.monthlyContribution.toLocaleString()}) واجب الادا ہے۔`,
              messageEnglish: `Installment for cycle ${cNum} in ${kameti.title} is due.`,
              timestamp: new Date().toISOString(),
              actionRoute: 'KametiCommitteeModal',
              metadata: { kametiId: kameti._id.toString(), cycle: cNum },
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `${unpaidMembers.length} ممبرز کے لیے یاد دہانی کا شیڈول تیار ہے۔`,
      data: {
        cycleNumber: cNum,
        totalUnpaid: unpaidMembers.length,
        reminders: unpaidMembers,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 18. GET /api/v1/domestic/kameti/:id/matrix
 * Returns multi-month matrix of all members across all N cycles
 */
export const getKametiMatrix = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = getProfileId(req);
    const { id } = req.params;

    const kameti = await DomesticKameti.findOne({ _id: id, profileId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'کمیٹی نہیں ملی۔' });
    }

    const currentCycle = kameti.currentCycle;
    const totalMonths = kameti.totalMonths;

    const matrixRows = (kameti.members || []).map((m: any) => {
      const cycleStatuses: Array<{
        cycleNumber: number;
        status: 'PAID' | 'DUE' | 'OVERDUE' | 'FUTURE';
      }> = [];

      for (let c = 1; c <= totalMonths; c++) {
        const isPaid = m.paidCycles && m.paidCycles.includes(c);
        let status: 'PAID' | 'DUE' | 'OVERDUE' | 'FUTURE';
        if (isPaid) {
          status = 'PAID';
        } else if (c < currentCycle) {
          status = 'OVERDUE';
        } else if (c === currentCycle) {
          status = 'DUE';
        } else {
          status = 'FUTURE';
        }
        cycleStatuses.push({ cycleNumber: c, status });
      }

      // Find schedule item for this member
      const memberIdStr = (m._id || '').toString();
      const scheduleItem = (kameti.drawSchedule as any[])?.find(
        (s) => s.memberId.toString() === memberIdStr
      );

      return {
        memberId: memberIdStr,
        memberName: m.memberName,
        memberPhone: m.memberPhone,
        payoutMonth: m.payoutMonth,
        payoutReceived: m.payoutReceived,
        payoutStatus: scheduleItem?.payoutStatus || (m.payoutReceived ? 'DISBURSED' : 'SCHEDULED'),
        netPayoutAmount: scheduleItem?.netPayoutAmount || kameti.poolAmount,
        voucherNumber: scheduleItem?.voucherNumber,
        cycles: cycleStatuses,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        kametiId: kameti._id.toString(),
        title: kameti.title,
        totalMonths,
        currentCycle,
        monthlyContribution: kameti.monthlyContribution,
        poolAmount: kameti.poolAmount,
        matrix: matrixRows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
