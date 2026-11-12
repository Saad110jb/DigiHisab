import { Request, Response } from 'express';
import { LedgerEntry, EntryType, PaymentMode } from '../models/LedgerEntry';
import { Counterparty } from '../models/Counterparty';
import { AuditLog } from '../models/AuditLog';
import { Profile } from '../models/Profile';
import { Types } from 'mongoose';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { JevCreditService } from '../services/jevCredit.service';
import { calculateLiquidityHorizon } from '../services/jevRunway.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';
import { socketService } from '../services/socket.service';

/**
 * 1. Primary Transactional Gatekeeper (Create Entry)
 * POST /api/v1/ledger
 */
export const createEntry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const subAccountId = req.user?.subAccountId;
    const {
      counterpartyId,
      entryType,
      amount,
      paymentMode = 'CASH',
      category = 'General',
      description,
      items,
      receiptImageUrl,
      rawInput,
      inputMode = 'MANUAL',
      dueDate,
      overrideLimit = false,
      marginAudit,
      receiptPdfUrl,
    } = req.body;

    if (!entryType || amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid entryType and positive amount are required.',
      });
    }

    const validEntryTypes: EntryType[] = ['RECEIVABLE', 'PAYABLE', 'CASH_IN', 'CASH_OUT', 'SETTLEMENT'];
    if (!validEntryTypes.includes(entryType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid entryType. Allowed values: ${validEntryTypes.join(', ')}`,
      });
    }

    const numericAmount = Number(amount);
    let wasOverridden = false;
    let counterpartyDoc = null;

    if (counterpartyId) {
      if (Types.ObjectId.isValid(counterpartyId)) {
        counterpartyDoc = await Counterparty.findOne({ _id: counterpartyId, profileId });
      }

      if (!counterpartyDoc && Types.ObjectId.isValid(counterpartyId)) {
        return res.status(404).json({ success: false, message: 'Counterparty not found.' });
      }

      let jevEvaluation = null;

      // Credit limit & risk enforcement for RECEIVABLE transactions via Jev engine
      if (counterpartyDoc && entryType === 'RECEIVABLE') {
        const { evaluation } = await JevCreditService.evaluateCreditRisk({
          profileId,
          customerId: counterpartyDoc._id,
          requestedAmount: numericAmount,
        });
        jevEvaluation = evaluation;

        const potentialNewBalance = counterpartyDoc.currentBalance + numericAmount;
        const userRole = req.user?.role || 'OWNER';
        const isMasterOrManager = userRole === 'OWNER' || userRole === 'MANAGER';

        if (evaluation.action_verdict === 'HARD_BLOCK') {
          return res.status(403).json({
            success: false,
            code: 'CREDIT_HARD_BLOCKED',
            message: evaluation.reasons.urdu,
            data: {
              currentBalance: counterpartyDoc.currentBalance,
              creditLimit: counterpartyDoc.creditLimit,
              isCreditBlocked: counterpartyDoc.isCreditBlocked,
              evaluation,
            },
          });
        }

        if (evaluation.action_verdict === 'REQUIRE_MANAGER_PIN') {
          // Cashier sub-accounts require manager override toggle and PIN authorization
          if (!isMasterOrManager && !overrideLimit) {
            return res.status(403).json({
              success: false,
              code: counterpartyDoc.isCreditBlocked ? 'ACCOUNT_CREDIT_LOCKED' : 'CREDIT_LIMIT_EXCEEDED',
              message: evaluation.reasons.urdu,
              data: {
                currentBalance: counterpartyDoc.currentBalance,
                creditLimit: counterpartyDoc.creditLimit,
                isCreditBlocked: counterpartyDoc.isCreditBlocked,
                evaluation,
              },
            });
          }

          const authorizer = req.body.authorizer; // Populated from manager override PIN verification
          const authorizerId = authorizer?.id ? new Types.ObjectId(authorizer.id) : new Types.ObjectId(profileId);
          const authorizerName = authorizer?.name || (req.user as any)?.fullName || (isMasterOrManager ? userRole : 'OWNER');
          const authorizerRole = authorizer?.role || userRole;

          wasOverridden = true;
          // Log forensic audit trail for limit/lock override
          await AuditLog.create({
            profileId,
            authorizedById: authorizerId,
            authorizedByName: authorizerName,
            authorizedByRole: authorizerRole,
            actionType: counterpartyDoc.isCreditBlocked ? 'CREDIT_LOCK_OVERRIDE' : 'CREDIT_LIMIT_OVERRIDE',
            counterpartyId: counterpartyDoc._id,
            counterpartyName: counterpartyDoc.name,
            counterpartyPhone: counterpartyDoc.phone,
            financialSnapshot: {
              creditLimit: counterpartyDoc.creditLimit,
              balanceBefore: counterpartyDoc.currentBalance,
              attemptedAmount: numericAmount,
              resultingBalance: potentialNewBalance,
            },
            reason: req.body.overrideReason || `Jev Risk Override: P_def = ${evaluation.default_probability} (${evaluation.risk_tier} tier)`,
            details: {
              defaultProbability: evaluation.default_probability,
              riskTier: evaluation.risk_tier,
              repaymentVelocity: evaluation.metrics.repaymentVelocity,
            },
            ipAddress: req.ip,
          });
        }
      }


      // Calculate counterparty running balance change & Jama Khata auto-deduction
      if (counterpartyDoc) {
        let balanceAdjustment = 0;

        if (entryType === 'RECEIVABLE') {
          // Jama Khata Auto-Deduction: check if customer has advance deposit balance
          const jamaBalance = counterpartyDoc.advanceDeposit || 0;
          if (jamaBalance > 0) {
            const coveredByJama = Math.min(numericAmount, jamaBalance);
            counterpartyDoc.advanceDeposit = jamaBalance - coveredByJama;
            const remainingBill = numericAmount - coveredByJama;
            balanceAdjustment = remainingBill; // only uncovered bill adds to debt balance
          } else {
            balanceAdjustment = numericAmount; // Udhaar Diya (+Receivable)
          }
        } else if (entryType === 'PAYABLE') {
          balanceAdjustment = -numericAmount; // Udhaar Liya (-Payable)
        } else if (entryType === 'SETTLEMENT' || entryType === 'CASH_IN') {
          // Wasooli / Settlement: if payment exceeds debt balance, rollover excess to Jama Khata
          const currentDebt = counterpartyDoc.currentBalance;
          if (currentDebt > 0) {
            if (numericAmount > currentDebt) {
              const excessJama = numericAmount - currentDebt;
              counterpartyDoc.currentBalance = 0;
              counterpartyDoc.advanceDeposit = (counterpartyDoc.advanceDeposit || 0) + excessJama;
            } else {
              counterpartyDoc.currentBalance -= numericAmount;
            }
          } else {
            // Customer has 0 debt, entire payment rolls over into Jama Khata
            counterpartyDoc.advanceDeposit = (counterpartyDoc.advanceDeposit || 0) + numericAmount;
          }
        }

        if (balanceAdjustment !== 0 || entryType === 'SETTLEMENT' || entryType === 'CASH_IN') {
          if (balanceAdjustment !== 0) {
            counterpartyDoc.currentBalance += balanceAdjustment;
          }

          // Auto update credit block status if balance drops back below limit
          if (counterpartyDoc.currentBalance <= counterpartyDoc.creditLimit && counterpartyDoc.currentBalance >= 0) {
            counterpartyDoc.isCreditBlocked = false;
          }

          if (jevEvaluation) {
            await JevCreditService.persistRiskProfile(counterpartyDoc, jevEvaluation);
          } else {
            await counterpartyDoc.save();
          }

          // Real-time Multi-Terminal Till Synchronization (Socket.io)
          if (profileId) {
            socketService.broadcastUdhaarUpdated(profileId.toString(), {
              counterpartyId: counterpartyDoc._id.toString(),
              counterpartyName: counterpartyDoc.name,
              newBalance: counterpartyDoc.currentBalance,
              lastAmount: numericAmount,
              entryType: entryType === 'RECEIVABLE' ? 'CREDIT' : 'PAYMENT',
              updatedBy: req.user?.phone || 'Cashier Terminal',
              timestamp: new Date().toISOString(),
            });
          }

          // Real-time Push Notifications
          if (profileId && (entryType === 'SETTLEMENT' || entryType === 'CASH_IN')) {
            dispatchPushNotification(profileId.toString(), {
              id: `payment-${counterpartyDoc._id}-${Date.now()}`,
              category: 'PAYMENT_RECEIVED',
              priority: 'SUCCESS',
              titleUrdu: 'وصولی / ادائیگی موصول',
              titleEnglish: 'Payment Received',
              messageUrdu: `گاہک ${counterpartyDoc.name} سے Rs. ${numericAmount.toLocaleString()} کی وصولی موصول ہوئی۔`,
              messageEnglish: `Received payment of Rs. ${numericAmount.toLocaleString()} from ${counterpartyDoc.name}.`,
              timestamp: new Date().toISOString(),
              actionLabel: 'تاریخ دیکھئے',
              actionRoute: 'CashflowHistoryModal',
              durationMs: 4500,
            });
          } else if (profileId && entryType === 'RECEIVABLE' && (wasOverridden || counterpartyDoc.currentBalance > counterpartyDoc.creditLimit)) {
            dispatchPushNotification(profileId.toString(), {
              id: `credit-${counterpartyDoc._id}-${Date.now()}`,
              category: 'CREDIT_LIMIT',
              priority: 'CRITICAL',
              titleUrdu: 'ادھار کی حد ختم',
              titleEnglish: 'Credit Limit Exceeded',
              messageUrdu: `گاہک ${counterpartyDoc.name} کا ادھار حد (Rs. ${counterpartyDoc.creditLimit.toLocaleString()}) سے تجاوز کر گیا ہے (${counterpartyDoc.currentBalance.toLocaleString()} باقی)۔`,
              messageEnglish: `Customer ${counterpartyDoc.name} balance (Rs. ${counterpartyDoc.currentBalance.toLocaleString()}) exceeded credit limit.`,
              timestamp: new Date().toISOString(),
              actionLabel: 'تقاضا بھیجیں',
              actionRoute: 'UdhaarTaqazaModal',
              durationMs: 8000,
            });
          }
        }
      }
    }

    // Margin erosion detection audit
    let evaluatedMarginAudit = undefined;
    if (marginAudit && (marginAudit.unitPurchaseCost !== undefined || marginAudit.retailSellingPrice !== undefined)) {
      const purchase = Number(marginAudit.unitPurchaseCost || 0);
      const selling = Number(marginAudit.retailSellingPrice || 0);
      evaluatedMarginAudit = {
        unitPurchaseCost: purchase,
        retailSellingPrice: selling,
        unitMarginLossDetected: selling > 0 && purchase > 0 && selling < purchase,
      };
    }

    const entry = await LedgerEntry.create({
      profileId,
      counterpartyId: counterpartyId && Types.ObjectId.isValid(counterpartyId) ? new Types.ObjectId(counterpartyId) : undefined,
      subAccountId: subAccountId && Types.ObjectId.isValid(subAccountId) ? new Types.ObjectId(subAccountId) : undefined,

      entryType,
      amount: numericAmount,
      paymentMode,
      category: category.trim(),
      description: description ? description.trim() : undefined,
      items: Array.isArray(items) ? items : undefined,
      receiptImageUrl: receiptImageUrl || undefined,
      rawInput,
      inputMode,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isSettled: entryType === 'CASH_IN' || entryType === 'CASH_OUT' || entryType === 'SETTLEMENT',
      settledAt: (entryType === 'CASH_IN' || entryType === 'CASH_OUT' || entryType === 'SETTLEMENT') ? new Date() : undefined,
      wasOverridden,
      isAnomaly: false,
      marginAudit: evaluatedMarginAudit,
      receiptPdfUrl,
    });

    try {
      const actionType =
        entryType === 'RECEIVABLE'
          ? 'UDHAAR_GIVEN'
          : entryType === 'SETTLEMENT'
          ? 'WASOOLI_RECEIVED'
          : category === 'Counter Sale' || category === 'Quick Sale'
          ? 'QUICK_CASH_SALE'
          : 'LEDGER_MODIFIED';

      const reasonStr =
        entryType === 'RECEIVABLE'
          ? `Udhaar of Rs. ${numericAmount.toLocaleString()} given to ${counterpartyDoc?.name || 'Customer'}`
          : entryType === 'SETTLEMENT'
          ? `Wasooli of Rs. ${numericAmount.toLocaleString()} received from ${counterpartyDoc?.name || 'Customer'}`
          : `Counter entry of Rs. ${numericAmount.toLocaleString()} recorded under ${category}`;

      await AuditLog.create({
        profileId,
        authorizedById: new Types.ObjectId(profileId),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType,
        counterpartyId: counterpartyDoc?._id,
        counterpartyName: counterpartyDoc?.name,
        counterpartyPhone: counterpartyDoc?.phone,
        reason: reasonStr,
        details: { amount: numericAmount, paymentMode, category, description },
      });
    } catch (auditErr) {
      // Non-blocking
    }

    // Atomically increment/decrement profile payment channel balance for cash/digital transactions
    if (entryType === 'CASH_IN' || entryType === 'CASH_OUT') {
      try {
        const profile = await Profile.findById(new Types.ObjectId(profileId));
        if (profile) {
          if (!profile.paymentChannels) {
            profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
          }
          let channelKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
          const pMode = String(paymentMode || 'CASH').toUpperCase();
          if (pMode.includes('BANK') || pMode.includes('RAAST') || pMode.includes('CHEQUE')) {
            channelKey = 'bankAccount';
          } else if (pMode.includes('WALLET') || pMode.includes('JAZZ') || pMode.includes('EASY')) {
            channelKey = 'digitalWallet';
          }

          if (entryType === 'CASH_IN') {
            profile.paymentChannels[channelKey] = (profile.paymentChannels[channelKey] || 0) + numericAmount;
          } else {
            profile.paymentChannels[channelKey] = Math.max(0, (profile.paymentChannels[channelKey] || 0) - numericAmount);
          }
          profile.markModified('paymentChannels');
          await profile.save();
        }
      } catch (chanErr) {
        console.warn('[createEntry] Failed to update paymentChannels:', chanErr);
      }
    }

    // Broadcast real-time metrics sync to all connected clients
    try {
      const updatedMetrics = await getAggregatedStoreMetrics(profileId);
      dispatchMetricsSync(profileId.toString(), updatedMetrics);
    } catch (syncErr) {
      console.warn('[createEntry] Metrics sync broadcast failed:', syncErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Ledger entry recorded successfully.',
      data: entry,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Settle Outstanding Entry / Full or Partial Debt Repayment
 * POST /api/v1/ledger/:id/settle
 */
export const settleEntry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;
    const { settlementAmount, discountAmount = 0, settlementContractId, paymentMode = 'CASH', description } = req.body;

    const entry = await LedgerEntry.findOne({ _id: id, profileId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger entry not found.' });
    }

    if (entry.isSettled) {
      return res.status(400).json({ success: false, message: 'This transaction is already settled.' });
    }

    const amountToSettle = settlementAmount !== undefined ? Number(settlementAmount) : entry.amount;
    if (isNaN(amountToSettle) || amountToSettle <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive settlement amount required.' });
    }

    const numDiscount = Number(discountAmount) || 0;
    const totalDebtCleared = amountToSettle + numDiscount;

    // Adjust counterparty running balance
    if (entry.counterpartyId) {
      const counterparty = await Counterparty.findOne({ _id: entry.counterpartyId, profileId });
      if (counterparty) {
        if (entry.entryType === 'RECEIVABLE') {
          counterparty.currentBalance = Math.max(0, counterparty.currentBalance - totalDebtCleared);
        } else if (entry.entryType === 'PAYABLE') {
          counterparty.currentBalance = Math.min(0, counterparty.currentBalance + totalDebtCleared);
        }
        await counterparty.save();
      }
    }

    // Record settlement entry
    const settlementRecord = await LedgerEntry.create({
      profileId,
      counterpartyId: entry.counterpartyId,
      subAccountId,
      entryType: 'SETTLEMENT',
      amount: amountToSettle,
      discountAmount: numDiscount > 0 ? numDiscount : undefined,
      settlementContractId: settlementContractId ? new Types.ObjectId(settlementContractId) : undefined,
      paymentMode,
      category: 'Settlement',
      description: description || `Wasooli / Settlement for transaction ID #${entry._id}`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    // Mark original entry as settled
    entry.isSettled = true;
    entry.settledAt = new Date();
    await entry.save();

    // Broadcast real-time metrics sync to all connected clients
    try {
      if (profileId) {
        const updatedMetrics = await getAggregatedStoreMetrics(profileId);
        dispatchMetricsSync(profileId.toString(), updatedMetrics);
      }
    } catch (syncErr) {
      console.warn('[settleEntry] Metrics sync broadcast failed:', syncErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction settled successfully.',
      data: {
        originalEntry: entry,
        settlementRecord,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2b. Dispatch & Audit Log Digital SMS Payment Receipt
 * POST /api/v1/ledger/send-receipt-sms
 */
export const sendReceiptSms = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { counterpartyId, amount, remainingBalance, paymentMode = 'CASH', transactionId, customMessage } = req.body;

    if (!counterpartyId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'counterpartyId and amount are required.' });
    }

    let counterparty = null;
    let recipientPhone = '';
    let counterpartyName = 'Gahak';
    let currentBalance = 0;

    if (Types.ObjectId.isValid(counterpartyId)) {
      counterparty = await Counterparty.findOne({ _id: counterpartyId, profileId });
    }

    if (counterparty) {
      recipientPhone = counterparty.phone || '';
      counterpartyName = counterparty.name || 'Gahak';
      currentBalance = counterparty.currentBalance || 0;
    }

    const formattedAmount = Number(amount).toLocaleString('en-PK');
    const formattedBal = Number(remainingBalance !== undefined ? remainingBalance : currentBalance).toLocaleString('en-PK');

    const defaultSmsText = customMessage || 
      `Digi Hisab Raseed: Aap se Rs. ${formattedAmount} (${paymentMode}) wasool ho gaye hain. Naya Baqi Hisab: Rs. ${formattedBal}. Shukriya!`;

    await AuditLog.create({
      profileId,
      authorizedById: new Types.ObjectId(profileId),
      authorizedByName: (req.user as any)?.fullName || 'OWNER',

      authorizedByRole: 'OWNER',
      actionType: 'SMS_RECEIPT_SENT',
      counterpartyId: counterparty ? counterparty._id : undefined,
      counterpartyName,
      counterpartyPhone: recipientPhone,
      details: {
        amountSent: Number(amount),
        remainingBalance: Number(remainingBalance),
        smsContent: defaultSmsText,
        transactionId,
      },
    });


    return res.status(200).json({
      success: true,
      message: 'SMS receipt logged and ready for native dispatch.',
      data: {
        recipientPhone,
        smsText: defaultSmsText,
        counterpartyName,
        amountPaid: Number(amount),
        remainingBalance: Number(remainingBalance),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



/**
 * 3. Fetch Paginated Ledger Entries (with Filters)
 * GET /api/v1/ledger
 */
export const getEntries = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      entryType,
      counterpartyId,
      category,
      isSettled,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const filter: any = { profileId };

    if (entryType && typeof entryType === 'string') {
      filter.entryType = entryType.toUpperCase();
    }

    if (counterpartyId && typeof counterpartyId === 'string') {
      filter.counterpartyId = new Types.ObjectId(counterpartyId);
    }

    if (category && typeof category === 'string') {
      filter.category = new RegExp(category.trim(), 'i');
    }

    if (isSettled !== undefined) {
      filter.isSettled = isSettled === 'true';
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [entries, totalCount] = await Promise.all([
      LedgerEntry.find(filter)
        .populate('counterpartyId', 'name phone relationType currentBalance riskProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      LedgerEntry.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: entries,
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
 * 4. Get Ledger Financial Summary Aggregates (Dashboard Cards)
 * GET /api/v1/ledger/summary
 */
export const getLedgerSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { startDate, endDate } = req.query;

    const matchStage: any = { profileId: new Types.ObjectId(profileId) };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate as string);
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

    // Fetch dynamic real-time store metrics directly from MongoDB aggregation
    const storeMetrics = await getAggregatedStoreMetrics(profileId);
    const kulLena = storeMetrics.maineLeneHain.totalAmount;
    const kulDena = storeMetrics.maineDeneHain.totalAmount;
    const activeCustomerCount = storeMetrics.maineLeneHain.customerCount;
    const activeSupplierCount = storeMetrics.maineDeneHain.supplierCount;

    const summary = {
      totalReceivables: kulLena,
      totalPayables: kulDena,
      totalCashIn: 0,
      totalCashOut: 0,
      totalSettlements: 0,
    };

    aggregates.forEach((item) => {
      if (item._id === 'CASH_IN') summary.totalCashIn = item.totalAmount;
      else if (item._id === 'CASH_OUT') summary.totalCashOut = item.totalAmount;
      else if (item._id === 'SETTLEMENT') summary.totalSettlements = item.totalAmount;
    });

    const netCashFlow = summary.totalCashIn - summary.totalCashOut;
    const gallaCash = storeMetrics.channels.physicalCash;
    const netMarketPosition = storeMetrics.totalNetPosition;
    const isOverleveraged = netMarketPosition < 0;
    const expected7DayWasooli = Math.round(kulLena * 0.3);
    const supplier7DayPayables = Math.round(kulDena * 0.4);
    const avgDailyExpense = Math.max(500, Math.round(summary.totalCashOut / 30));

    let cashRunwayDays = 16;
    let runwayState = 'SAFE';
    try {
      if (profileId) {
        const horizon = await calculateLiquidityHorizon(profileId);
        cashRunwayDays = horizon.safe_runway_days;
        runwayState = horizon.runway_state;
      }
    } catch (e) {
      cashRunwayDays = Math.max(1, Math.round((gallaCash + expected7DayWasooli - supplier7DayPayables) / avgDailyExpense));
    }

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        netCashFlow,
        kulLena,
        kulDena,
        activeCustomerCount,
        activeSupplierCount,
        channels: storeMetrics.channels,
        totalAdvances: storeMetrics.totalAdvances,
        netMarketPosition,
        isOverleveraged,
        gallaCash,
        cashRunwayDays,
        runwayState,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4b. Generate Printable Khata PDF/HTML Ledger Statement with Shop Branding
 * POST /api/v1/ledger/statement-pdf
 */
export const generateLedgerPdfStatement = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { counterpartyId, startDate, endDate } = req.body;

    if (!counterpartyId || !Types.ObjectId.isValid(counterpartyId)) {
      return res.status(400).json({ success: false, message: 'Valid counterpartyId is required.' });
    }

    const [counterparty, shopProfile] = await Promise.all([
      Counterparty.findOne({ _id: counterpartyId, profileId }),
      Profile.findById(profileId),
    ]);

    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    const filter: any = { profileId, counterpartyId: new Types.ObjectId(counterpartyId) };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.find(filter).sort({ createdAt: 1 });

    const shopName = shopProfile?.businessName || shopProfile?.fullName || 'Digi Hisab Retailer';
    const shopPhone = shopProfile?.phone || '';
    const shopAddress = shopProfile?.businessAddress || 'Pakistan';
    const statementDate = new Date().toLocaleDateString('en-PK');

    let totalDebit = 0;
    let totalCredit = 0;

    const rowsHtml = entries.map((e, idx) => {
      const isDebit = e.entryType === 'RECEIVABLE' || e.entryType === 'CASH_OUT';
      if (isDebit) totalDebit += e.amount;
      else totalCredit += e.amount;

      const dateStr = new Date(e.createdAt).toLocaleDateString('en-PK');
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${dateStr}</td>
          <td>${e.category || 'General'}</td>
          <td>${e.description || '-'}</td>
          <td style="text-align:right;font-weight:600;">${isDebit ? 'PKR ' + e.amount.toLocaleString() : '-'}</td>
          <td style="text-align:right;font-weight:600;">${!isDebit ? 'PKR ' + e.amount.toLocaleString() : '-'}</td>
          <td><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${e.isSettled ? '#D1FAE5' : '#FEE2E2'};color:${e.isSettled ? '#047857' : '#B91C1C'};">${e.isSettled ? 'Settled' : 'Unpaid'}</span></td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Khata Statement - ${counterparty.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0F172A; padding: 24px; margin: 0; background: #FFF; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #006C4E; padding-bottom: 12px; margin-bottom: 18px; }
          .shop-title { font-size: 22px; font-weight: 800; color: #006C4E; margin: 0; }
          .shop-sub { font-size: 12px; color: #475569; margin-top: 4px; }
          .statement-title { font-size: 16px; font-weight: 800; text-align: right; color: #0F172A; }
          .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #E0F2FE; color: #0369A1; font-weight: 700; text-align: left; padding: 8px; border: 1px solid #CBD5E1; }
          td { padding: 8px; border: 1px solid #E2E8F0; color: #334155; }
          .summary-footer { display: flex; justify-content: flex-end; gap: 24px; margin-top: 20px; padding-top: 12px; border-top: 2px solid #E2E8F0; }
          .footer-col { text-align: right; }
          .footer-label { font-size: 11px; color: #64748B; font-weight: 600; }
          .footer-val { font-size: 18px; font-weight: 800; color: #006C4E; margin-top: 2px; }
          .sign-line { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748B; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="shop-title">🏢 ${shopName}</h1>
            <div class="shop-sub">📱 Phone: ${shopPhone} • 📍 Address: ${shopAddress}</div>
            <div class="shop-sub">Digital Khata Statement (سرکاری کھاتہ اسٹیٹمنٹ)</div>
          </div>
          <div>
            <div class="statement-title">Khata Statement</div>
            <div class="shop-sub">Date: ${statementDate}</div>
          </div>
        </div>

        <div class="meta-box">
          <div>
            <strong>Counterparty / Gahak Name:</strong> ${counterparty.name}<br/>
            <strong>Mobile Number:</strong> ${counterparty.phone}<br/>
            <strong>Address:</strong> ${counterparty.address || 'Local Customer'}
          </div>
          <div style="text-align: right;">
            <strong>Relation Type:</strong> ${counterparty.relationType}<br/>
            <strong>Current Account Balance:</strong> <span style="color: ${counterparty.currentBalance > 0 ? '#E11D48' : '#006C4E'}; font-weight: 800;">PKR ${Math.abs(counterparty.currentBalance).toLocaleString()}</span><br/>
            ${counterparty.advanceDeposit ? `<strong>Jama Khata Deposit:</strong> PKR ${counterparty.advanceDeposit.toLocaleString()}` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style="text-align:right;">Debit (دیے)</th>
              <th style="text-align:right;">Credit (لیے)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">No transactions found for this period.</td></tr>'}
          </tbody>
        </table>

        <div class="summary-footer">
          <div class="footer-col">
            <div class="footer-label">TOTAL DEBIT (دیے)</div>
            <div class="footer-val" style="color: #E11D48;">PKR ${totalDebit.toLocaleString()}</div>
          </div>
          <div class="footer-col">
            <div class="footer-label">TOTAL CREDIT (لیے)</div>
            <div class="footer-val" style="color: #006C4E;">PKR ${totalCredit.toLocaleString()}</div>
          </div>
          <div class="footer-col">
            <div class="footer-label">NET RUNNING BALANCE</div>
            <div class="footer-val">PKR ${counterparty.currentBalance.toLocaleString()}</div>
          </div>
        </div>

        <div class="sign-line">
          <div>Customer / Counterparty Signature: _______________</div>
          <div>Shop Owner Signature & Stamp: _______________</div>
        </div>
      </body>
      </html>
    `;

    return res.status(200).json({
      success: true,
      message: 'Khata statement generated successfully.',
      data: {
        counterpartyName: counterparty.name,
        statementDate,
        htmlContent,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Get Single Entry Details by ID
 * GET /api/v1/ledger/:id
 */
export const getEntryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const entry = await LedgerEntry.findOne({ _id: id, profileId }).populate(
      'counterpartyId',
      'name phone relationType currentBalance creditLimit riskProfile'
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger entry not found.' });
    }

    return res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Delete Transaction & Roll Back Counterparty Balance ($inc)
 * DELETE /api/v1/ledger/:id
 */
export const deleteEntry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;

    const entry = await LedgerEntry.findOne({ _id: id, profileId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger entry not found.' });
    }

    // Rollback counterparty running balance if applicable
    if (entry.counterpartyId) {
      let rollbackAdjustment = 0;
      if (entry.entryType === 'RECEIVABLE') rollbackAdjustment = -entry.amount; // Revert Udhaar Diya
      else if (entry.entryType === 'PAYABLE') rollbackAdjustment = entry.amount; // Revert Udhaar Liya
      else if (entry.entryType === 'SETTLEMENT') rollbackAdjustment = entry.amount; // Revert Settlement

      if (rollbackAdjustment !== 0) {
        await Counterparty.updateOne(
          { _id: entry.counterpartyId, profileId },
          { $inc: { currentBalance: rollbackAdjustment } }
        );
      }
    }

    // Determine specific audit log actionType & reason
    let auditActionType = 'LEDGER_MODIFIED';
    let auditReason = `Deleted ledger entry (${entry.entryType}) of Rs. ${entry.amount.toLocaleString()}`;

    if (entry.entryType === 'CASH_OUT') {
      auditActionType = 'EXPENSE_DELETED_AND_REFUNDED';
      auditReason = `Deleted Dukan Kharcha (${entry.category}) of Rs. ${entry.amount.toLocaleString()} and refunded to till account (${entry.paymentMode}).`;
    } else if (entry.entryType === 'PAYABLE') {
      auditActionType = 'SUPPLIER_INVOICE_DELETED';
      auditReason = `Deleted supplier bill of Rs. ${entry.amount.toLocaleString()} and reduced Maine Dene liability.`;
    }

    // Log deletion in audit trail
    await AuditLog.create({
      profileId: new Types.ObjectId(profileId),
      subAccountId: subAccountId ? new Types.ObjectId(subAccountId) : undefined,
      authorizedById: new Types.ObjectId(profileId),
      authorizedByName: (req.user as any)?.fullName || 'Dukandar',
      authorizedByRole: 'OWNER',
      actionType: auditActionType,
      reason: auditReason,
      counterpartyId: entry.counterpartyId,
      targetDocumentId: entry._id,
      targetCollection: 'LedgerEntry',
      details: {
        operation: 'DELETE',
        entryType: entry.entryType,
        amount: entry.amount,
        category: entry.category,
        paymentMode: entry.paymentMode,
      },
    }).catch(() => {});

    await entry.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Ledger entry deleted and counterparty balance rolled back successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
