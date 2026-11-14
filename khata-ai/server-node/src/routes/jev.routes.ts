import { Router, Request, Response } from 'express';

const router = Router();

/**
 * 1. Double-Entry Voucher Validator & Creator
 * POST /api/v1/jev/vouchers
 */
router.post('/vouchers', (req: Request, res: Response) => {
  try {
    const { description, entries } = req.body;

    if (!Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'A journal voucher must contain at least 2 double-entry line items.',
      });
    }

    const totalDebits = entries.reduce((acc: number, e: any) => acc + (Number(e.debit) || 0), 0);
    const totalCredits = entries.reduce((acc: number, e: any) => acc + (Number(e.credit) || 0), 0);
    const discrepancy = Math.abs(totalDebits - totalCredits);

    if (discrepancy > 0.001) {
      return res.status(422).json({
        success: false,
        error: 'UNBALANCED_JOURNAL_VOUCHER',
        message: `Debit (${totalDebits}) and Credit (${totalCredits}) must strictly balance to zero discrepancy. Discrepancy: ${discrepancy}.`,
        discrepancy,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Balanced double-entry journal voucher recorded successfully.',
      data: {
        voucherNumber: `JV-${Date.now().toString().slice(-6)}`,
        description: description || 'Journal Voucher',
        totalDebit: totalDebits,
        totalCredit: totalCredits,
        isBalanced: true,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 2. Daily Safe OPEX Budget Guardian Simulation
 * GET /api/v1/jev/opex-guardian/simulate
 */
router.get('/opex-guardian/simulate', (req: Request, res: Response) => {
  try {
    const amount = Number(req.query.amount) || 0;
    const dailyCap = 2500;

    let state = 'SAFE';
    if (amount > dailyCap) {
      state = 'OVERBUDGET';
    } else if (amount > dailyCap * 0.8) {
      state = 'THRESHOLD_WARNING';
    }

    return res.status(200).json({
      success: true,
      state,
      requestedAmount: amount,
      dailyCap,
      headroomRemaining: Math.max(0, dailyCap - amount),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
