import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CashDrawerReconciliation } from '../models/CashDrawerReconciliation';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

/**
 * Helper to compute expected system cash balance for a given shift / date range
 */
const computeExpectedCashAmount = async (
  profileId: Types.ObjectId,
  subAccountId?: Types.ObjectId,
  startDate?: Date,
  endDate?: Date,
  openingBalance: number = 0
) => {
  const matchStage: any = {
    profileId: new Types.ObjectId(profileId),
    paymentMode: 'CASH',
  };

  if (subAccountId) {
    matchStage.subAccountId = new Types.ObjectId(subAccountId);
  }

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  const aggregates = await LedgerEntry.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$entryType',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  let cashInTotal = 0;
  let cashOutTotal = 0;
  let settlementsCashTotal = 0;

  aggregates.forEach((item) => {
    if (item._id === 'CASH_IN') cashInTotal = item.totalAmount;
    else if (item._id === 'CASH_OUT') cashOutTotal = item.totalAmount;
    else if (item._id === 'SETTLEMENT') settlementsCashTotal = item.totalAmount;
  });

  const systemExpectedCash = openingBalance + cashInTotal + settlementsCashTotal - cashOutTotal;

  return {
    openingBalance,
    cashInTotal,
    cashOutTotal,
    settlementsCashTotal,
    systemExpectedCash,
  };
};

/**
 * 1. Compute Real-Time Expected Cash for Current Shift / Day
 * GET /api/v1/cash-drawer/expected-cash
 */
export const calculateExpectedCash = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { shiftDate, openingBalance = '0' } = req.query;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (shiftDate && typeof shiftDate === 'string') {
      startDate = new Date(shiftDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(shiftDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today's shift start
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    const breakdown = await computeExpectedCashAmount(
      profileId!,
      subAccountId,
      startDate,
      endDate,
      Number(openingBalance)
    );

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Submit End-of-Day / Shift-Closing Cash Count & Reconciliation
 * POST /api/v1/cash-drawer/reconcile
 */
export const submitReconciliation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { physicalCountedCash, openingBalance = 0, notes, shiftDate } = req.body;

    if (physicalCountedCash === undefined || isNaN(Number(physicalCountedCash)) || Number(physicalCountedCash) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive physicalCountedCash amount is required.',
      });
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (shiftDate) {
      startDate = new Date(shiftDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(shiftDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    const breakdown = await computeExpectedCashAmount(
      profileId!,
      subAccountId,
      startDate,
      endDate,
      Number(openingBalance)
    );

    const physicalCash = Number(physicalCountedCash);
    const discrepancyAmount = physicalCash - breakdown.systemExpectedCash;

    // Auto-approve zero-variance counts (perfect match)
    const isDiscrepancyApproved = discrepancyAmount === 0;

    const reconciliation = await CashDrawerReconciliation.create({
      profileId,
      subAccountId,
      reconciliationDate: new Date(),
      systemExpectedCash: breakdown.systemExpectedCash,
      physicalCountedCash: physicalCash,
      discrepancyAmount,
      isDiscrepancyApproved,
      approvedByProfileId: isDiscrepancyApproved ? profileId : undefined,
      notes: notes ? notes.trim() : undefined,
    });

    let varianceType = 'EXACT_MATCH';
    if (discrepancyAmount > 0) varianceType = 'SURPLUS';
    else if (discrepancyAmount < 0) varianceType = 'DEFICIT';

    if (discrepancyAmount !== 0 && profileId) {
      const isShortage = discrepancyAmount < 0;
      dispatchPushNotification(profileId.toString(), {
        id: `galla-${reconciliation._id}-${Date.now()}`,
        category: 'GALLA_DISCREPANCY',
        priority: isShortage ? 'CRITICAL' : 'WARNING',
        titleUrdu: isShortage ? 'گلہ میں کمی (ڈسکریپینسی)' : 'گلہ میں زیادہ رقم',
        titleEnglish: isShortage ? 'Cash Drawer Shortage Alert' : 'Cash Drawer Surplus Alert',
        messageUrdu: isShortage
          ? `گلہ بندی کے وقت Rs. ${Math.abs(discrepancyAmount).toLocaleString()} کی کمی پائی گئی ہے۔`
          : `گلہ بندی کے وقت Rs. ${discrepancyAmount.toLocaleString()} کی اضافی رقم پائی گئی۔`,
        messageEnglish: isShortage
          ? `End-of-day audit detected Rs. ${Math.abs(discrepancyAmount).toLocaleString()} cash shortage.`
          : `End-of-day audit detected Rs. ${discrepancyAmount.toLocaleString()} cash surplus.`,
        timestamp: new Date().toISOString(),
        actionLabel: 'تاریخ دیکھئے',
        actionRoute: 'CashflowHistoryModal',
        durationMs: isShortage ? 8000 : 5000,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Shift closing recorded (${varianceType}). ${isDiscrepancyApproved ? 'Auto-approved.' : 'Pending manager sign-off.'}`,
      data: {
        reconciliation,
        breakdown,
        varianceType,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Manager/Owner Action: Review & Approve Cash Discrepancy
 * PATCH /api/v1/cash-drawer/:id/approve
 */
export const approveDiscrepancy = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    const reconciliation = await CashDrawerReconciliation.findOne({ _id: id, profileId });
    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'Reconciliation record not found.' });
    }

    if (reconciliation.isDiscrepancyApproved) {
      return res.status(400).json({ success: false, message: 'Discrepancy has already been approved.' });
    }

    reconciliation.isDiscrepancyApproved = true;
    reconciliation.approvedByProfileId = new Types.ObjectId(profileId);
    if (notes) {
      reconciliation.notes = reconciliation.notes
        ? `${reconciliation.notes} | Manager Approval Note: ${notes.trim()}`
        : `Manager Approval Note: ${notes.trim()}`;
    }

    await reconciliation.save();

    return res.status(200).json({
      success: true,
      message: 'Cash discrepancy approved and signed off successfully.',
      data: reconciliation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Get Paginated Cash Drawer Reconciliation Records
 * GET /api/v1/cash-drawer
 */
export const getReconciliations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { startDate, endDate, subAccountId, isDiscrepancyApproved, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (subAccountId && typeof subAccountId === 'string') {
      filter.subAccountId = new Types.ObjectId(subAccountId);
    }

    if (isDiscrepancyApproved !== undefined) {
      filter.isDiscrepancyApproved = isDiscrepancyApproved === 'true';
    }

    if (startDate || endDate) {
      filter.reconciliationDate = {};
      if (startDate) filter.reconciliationDate.$gte = new Date(startDate as string);
      if (endDate) filter.reconciliationDate.$lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reconciliations, totalCount] = await Promise.all([
      CashDrawerReconciliation.find(filter)
        .populate('approvedByProfileId', 'fullName phone')
        .sort({ reconciliationDate: -1 })
        .skip(skip)
        .limit(limitNum),
      CashDrawerReconciliation.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: reconciliations,
      pagination: {
        totalItems: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        pageSize: limitNum,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Get Detailed Reconciliation Report by ID
 * GET /api/v1/cash-drawer/:id
 */
export const getReconciliationById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const reconciliation = await CashDrawerReconciliation.findOne({ _id: id, profileId }).populate(
      'approvedByProfileId',
      'fullName phone email'
    );

    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'Reconciliation record not found.' });
    }

    return res.status(200).json({
      success: true,
      data: reconciliation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Cash Drawer Aggregated Statistics (Shortages, Surpluses, Unapproved Variances)
 * GET /api/v1/cash-drawer/stats
 */
export const getCashDrawerStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { startDate, endDate } = req.query;

    const matchStage: any = { profileId: new Types.ObjectId(profileId) };
    if (startDate || endDate) {
      matchStage.reconciliationDate = {};
      if (startDate) matchStage.reconciliationDate.$gte = new Date(startDate as string);
      if (endDate) matchStage.reconciliationDate.$lte = new Date(endDate as string);
    }

    const reconciliations = await CashDrawerReconciliation.find(matchStage);

    let totalShortageAmount = 0;
    let totalSurplusAmount = 0;
    let unapprovedCount = 0;
    let exactMatchCount = 0;

    reconciliations.forEach((r) => {
      if (r.discrepancyAmount < 0) {
        totalShortageAmount += Math.abs(r.discrepancyAmount);
      } else if (r.discrepancyAmount > 0) {
        totalSurplusAmount += r.discrepancyAmount;
      } else {
        exactMatchCount += 1;
      }

      if (!r.isDiscrepancyApproved) {
        unapprovedCount += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalShiftClosings: reconciliations.length,
        exactMatchCount,
        totalShortageAmount,
        totalSurplusAmount,
        netVarianceAmount: totalSurplusAmount - totalShortageAmount,
        unapprovedCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Get 3-Way Till Balances (Physical Cash, Digital Wallet, Bank Account)
 * GET /api/v1/cash-drawer/till-balances
 */
export const getTillBalances = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const storeMetrics = await getAggregatedStoreMetrics(profileId);
    const physicalCash = Math.max(0, storeMetrics.channels.physicalCash);
    const digitalWallet = Math.max(0, storeMetrics.channels.digitalWallet);
    const bankAccount = Math.max(0, storeMetrics.channels.bankAccount);
    const totalLiquidCapital = physicalCash + digitalWallet + bankAccount;

    return res.status(200).json({
      success: true,
      data: {
        physicalCash,
        digitalWallet,
        bankAccount,
        totalLiquidCapital,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Top Up Till Balance (Deposit into Physical Cash, Digital Wallet, or Bank Account)
 * POST /api/v1/cash-drawer/top-up-till
 */
export const topUpTill = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { targetAccount, amount, note } = req.body;

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    let paymentMode: 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' = 'CASH';
    let channelKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
    if (targetAccount === 'DIGITAL_WALLET') {
      paymentMode = 'JAZZCASH';
      channelKey = 'digitalWallet';
    } else if (targetAccount === 'BANK_ACCOUNT') {
      paymentMode = 'BANK_TRANSFER';
      channelKey = 'bankAccount';
    }

    const entry = await LedgerEntry.create({
      profileId,
      entryType: 'CASH_IN',
      amount: numAmt,
      paymentMode,
      category: 'TILL_TOPUP',
      description: note ? `Till Top-up (${targetAccount}): ${note}` : `Till Top-up into ${targetAccount}`,
      isSettled: true,
      settledAt: new Date(),
    });

    const profile = await Profile.findById(profileId);
    if (profile) {
      if (!profile.paymentChannels) {
        profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
      }
      profile.paymentChannels[channelKey] = (profile.paymentChannels[channelKey] || 0) + numAmt;
      profile.markModified('paymentChannels');
      await profile.save();
    }

    const updatedMetrics = await getAggregatedStoreMetrics(profileId);
    dispatchMetricsSync(profileId.toString(), updatedMetrics);

    return res.status(201).json({
      success: true,
      message: `Rs. ${numAmt.toLocaleString()} successfully added to ${targetAccount}.`,
      data: {
        entry,
        channels: updatedMetrics.channels,
        totalLiquidCapital: updatedMetrics.channels.physicalCash + updatedMetrics.channels.digitalWallet + updatedMetrics.channels.bankAccount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
