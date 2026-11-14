import { Request, Response } from 'express';
import { BankReconciliationService } from '../services/bankReconciliation.service';
import { BankReconciliation } from '../models/BankReconciliation';

/**
 * 1. POST /api/v1/bank-reconciliation/import
 */
export const importBankStatement = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { bankName, accountNumber, statementStartDate, statementEndDate, openingBalance, closingBalance, transactions } = req.body;

    if (!accountNumber || !statementStartDate || !statementEndDate || !transactions) {
      return res.status(400).json({
        success: false,
        message: 'accountNumber, statementStartDate, statementEndDate, and transactions are required.',
      });
    }

    const rec = await BankReconciliationService.importStatement({
      profileId,
      bankName: bankName || 'Meezan Bank / Raast',
      accountNumber,
      statementStartDate,
      statementEndDate,
      openingBalance: openingBalance || 0,
      closingBalance: closingBalance || 0,
      transactions,
    });

    return res.status(201).json({ success: true, data: rec });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. POST /api/v1/bank-reconciliation/:id/auto-match
 */
export const autoMatchReconciliation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    const summary = await BankReconciliationService.runAutoMatching(id, profileId);
    return res.status(200).json({ success: true, data: summary });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/bank-reconciliation/:id/resolve-discrepancy
 */
export const resolveDiscrepancy = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const { transactionId, accountCategory, description } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required.' });
    }

    const result = await BankReconciliationService.resolveDiscrepancyWithJev(id, transactionId, profileId, {
      accountCategory,
      description,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. GET /api/v1/bank-reconciliation
 */
export const getReconciliations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const list = await BankReconciliation.find({ profileId }).sort({ statementEndDate: -1 }).lean();
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. GET /api/v1/bank-reconciliation/:id
 */
export const getReconciliationById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const rec = await BankReconciliation.findOne({ _id: id, profileId }).lean();
    if (!rec) {
      return res.status(404).json({ success: false, message: 'Bank reconciliation not found.' });
    }
    return res.status(200).json({ success: true, data: rec });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
