import { Request, Response } from 'express';
import { Profile } from '../models/Profile';
import { LedgerEntry } from '../models/LedgerEntry';
import { Counterparty } from '../models/Counterparty';
import { Types } from 'mongoose';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import {
  compileAndValidateDoubleEntry,
  normalizePaymentChannel,
  JevTransactionInput,
} from '../services/jevDoubleEntry.service';
import { calculateLiquidityHorizon } from '../services/jevRunway.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';
import { JevBudgetEngine } from '../services/jevBudget.service';

/**
 * Pre-flight Double-Entry & Channel Solvency Validation Endpoint
 * POST /api/v1/finance/validate-transaction
 * Body: { transactionType, grossAmount, advanceOffset, immediatePaymentAmount, paymentMode, customLines }
 */
export const validateTransaction = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const availableChannels = profile.paymentChannels || {
      cashDrawer: 45000,
      bankAccount: 125000,
      digitalWallet: 32000,
    };

    const {
      transactionType = 'SUPPLIER_BILL',
      grossAmount = 0,
      advanceOffset = 0,
      immediatePaymentAmount = 0,
      paymentMode = 'CASH',
      customLines,
    } = req.body;

    const validation = compileAndValidateDoubleEntry({
      transactionType,
      grossAmount: Number(grossAmount),
      advanceOffset: Number(advanceOffset),
      immediatePaymentAmount: Number(immediatePaymentAmount),
      paymentMode: String(paymentMode),
      availableChannels,
      customLines,
    });

    return res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    console.error('[validateTransaction Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error executing double-entry validation pre-flight.',
    });
  }
};

/**
 * Record Finance Outflow with Jev Double-Entry & Channel Balance Check
 * POST /api/v1/finance/record-outflow
 * Body: { outflowType, amount, paymentMode, counterpartyId, category, description }
 */
export const recordOutflow = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const { outflowType, amount, paymentMode, counterpartyId, category, description } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }

    // Petty Cash restriction for Cashiers (Max Rs. 500)
    const userRole = req.user?.role || 'OWNER';
    if (userRole === 'CASHIER' && parsedAmount > 500) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_EXPENSE_LIMIT',
        message: '🔒 Cashier petty kharcha sirf Rs. 500 tak darj kar saktay hain. Barray kharchay ke liye Manager se ruju karein.',
      });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    if (!profile.paymentChannels) {
      profile.paymentChannels = {
        cashDrawer: 45000,
        bankAccount: 125000,
        digitalWallet: 32000,
      };
    }

    const mode = String(paymentMode || 'CASH');
    const channelKey = normalizePaymentChannel(mode);
    const resolvedChannel = channelKey === 'none' ? 'cashDrawer' : channelKey;

    // Execute Jev Double-Entry & Solvency Compiler
    const jevValidation = compileAndValidateDoubleEntry({
      transactionType: 'EXPENSE_OUTFLOW',
      grossAmount: parsedAmount,
      paymentMode: mode,
      availableChannels: profile.paymentChannels,
    });

    if (!jevValidation.is_balanced) {
      return res.status(400).json({
        success: false,
        code: 'JEV_UNBALANCED_ENTRY',
        message: jevValidation.messages.ur,
        messageEn: jevValidation.messages.en,
        validation: jevValidation,
      });
    }

    if (jevValidation.risk_level === 'CRITICAL_HALT' || jevValidation.channel_solvency_confidence < 1.0) {
      return res.status(422).json({
        success: false,
        code: 'CRITICAL_HALT_INSUFFICIENT_FUNDS',
        message: jevValidation.messages.ur,
        messageEn: jevValidation.messages.en,
        availableBalance: jevValidation.validation_details.available_channel_balance,
        shortageAmount: jevValidation.validation_details.shortage_amount,
        validation: jevValidation,
      });
    }

    const currentBalance = profile.paymentChannels[resolvedChannel] ?? 0;

    // Deduct channel balance atomically
    profile.paymentChannels[resolvedChannel] = currentBalance - parsedAmount;
    profile.markModified('paymentChannels');
    await profile.save();

    let counterpartyObj = null;
    if (counterpartyId && Types.ObjectId.isValid(counterpartyId)) {
      counterpartyObj = await Counterparty.findOne({ _id: counterpartyId, profileId });
      if (counterpartyObj) {
        // Payout to supplier reduces balance (Maine Dene)
        counterpartyObj.currentBalance = Math.max(0, counterpartyObj.currentBalance - parsedAmount);
        await counterpartyObj.save();
      }
    }

    const ledgerEntry = await LedgerEntry.create({
      profileId: new Types.ObjectId(profileId),
      counterpartyId: counterpartyObj ? counterpartyObj._id : undefined,
      entryType: 'CASH_OUT',
      amount: parsedAmount,
      category: category || outflowType || 'General Outflow',
      description: description || `${outflowType || 'Expense'} via ${mode}`,
      paymentMode: mode,
    });

    // Broadcast real-time metrics sync to all connected clients
    try {
      const updatedMetrics = await getAggregatedStoreMetrics(profileId);
      dispatchMetricsSync(profileId.toString(), updatedMetrics);
    } catch (syncErr) {
      console.warn('[recordOutflow] Metrics sync broadcast failed:', syncErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Outflow recorded successfully.',
      data: {
        entry: ledgerEntry,
        updatedChannelBalance: profile.paymentChannels[resolvedChannel],
        updatedChannels: profile.paymentChannels,
        jevValidation,
      },
    });
  } catch (error: any) {
    console.error('[recordOutflow Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error recording outflow.' });
  }
};

/**
 * Galla Runway & Liquidity Radar Horizon
 * GET /api/v1/finance/liquidity-radar
 */
export const getLiquidityRadar = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const scope = (req.query.scope as 'TILL_ONLY' | 'ALL_CHANNELS') || 'ALL_CHANNELS';
    const horizon = await calculateLiquidityHorizon(profileId, scope);

    return res.status(200).json({
      success: true,
      data: horizon,
    });
  } catch (error: any) {
    console.error('[getLiquidityRadar Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error computing Jev Liquidity Radar horizon.',
    });
  }
};

/**
 * Daily Operational Budget & Safe OPEX Guidance (Jev Budget Engine)
 * GET /api/v1/finance/daily-opex-guidance
 */
export const getDailyOpexGuidance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const guidance = await JevBudgetEngine.evaluateDailyBudget(profileId);
    return res.status(200).json({
      success: true,
      data: guidance,
    });
  } catch (error: any) {
    console.error('[getDailyOpexGuidance Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error computing daily OPEX guidance.',
    });
  }
};


