import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models/Profile';
import {
  compileAndValidateDoubleEntry,
  JevLedgerValidation,
  JevTransactionInput,
} from '../services/jevDoubleEntry.service';

declare global {
  namespace Express {
    interface Request {
      jevValidation?: JevLedgerValidation;
    }
  }
}

export interface JevMiddlewareOptions {
  transactionTypeExtractor?: (req: Request) => JevTransactionInput['transactionType'];
  grossAmountExtractor?: (req: Request) => number;
  paymentModeExtractor?: (req: Request) => string;
  advanceOffsetExtractor?: (req: Request) => number;
  immediatePaymentExtractor?: (req: Request) => number;
}

/**
 * Express middleware to validate double-entry balance and channel solvency before writing to database.
 * Blocks unbalanced entries (HTTP 400) and insolvent channel outflows (HTTP 422).
 */
export const requireJevLedgerValidation = (options?: JevMiddlewareOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
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
        cashDrawer: 0,
        bankAccount: 0,
        digitalWallet: 0,
      };

      const transactionType = options?.transactionTypeExtractor
        ? options.transactionTypeExtractor(req)
        : req.body.transactionType || (req.body.outflowType ? 'EXPENSE_OUTFLOW' : 'SUPPLIER_BILL');

      const grossAmount = options?.grossAmountExtractor
        ? options.grossAmountExtractor(req)
        : Number(req.body.grossAmount || req.body.billAmount || req.body.amount || 0);

      const paymentMode = options?.paymentModeExtractor
        ? options.paymentModeExtractor(req)
        : req.body.paymentMode || req.body.targetAccount || 'CASH';

      const advanceOffset = options?.advanceOffsetExtractor
        ? options.advanceOffsetExtractor(req)
        : Number(req.body.advanceOffset || req.body.advanceDeducted || 0);

      const immediatePaymentAmount = options?.immediatePaymentExtractor
        ? options.immediatePaymentExtractor(req)
        : Number(req.body.immediatePaymentAmount || req.body.amountPaid || 0);

      const validation = compileAndValidateDoubleEntry({
        transactionType,
        grossAmount,
        advanceOffset,
        immediatePaymentAmount,
        paymentMode,
        availableChannels,
      });

      // 1. Double-entry Discrepancy Gate
      if (!validation.is_balanced) {
        return res.status(400).json({
          success: false,
          code: 'JEV_UNBALANCED_ENTRY',
          message: validation.messages.ur,
          messageEn: validation.messages.en,
          validation,
        });
      }

      // 2. Channel Solvency Gate
      if (validation.risk_level === 'CRITICAL_HALT' || validation.channel_solvency_confidence < 1.0) {
        return res.status(422).json({
          success: false,
          code: 'CRITICAL_HALT_INSUFFICIENT_FUNDS',
          message: validation.messages.ur,
          messageEn: validation.messages.en,
          validation,
        });
      }

      // Pass Jev metadata down pipeline
      req.jevValidation = validation;
      return next();
    } catch (err: any) {
      console.error('[JevLedgerValidation Middleware Error]:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during Jev double-entry balance verification.',
        error: err.message,
      });
    }
  };
};
