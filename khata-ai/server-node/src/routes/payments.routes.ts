import { Router, Request, Response } from 'express';

const router = Router();

// In-memory TID store for pilot tracking
const submittedTids = new Set<string>();

/**
 * 1. Submit Manual Pilot Payment TID
 * POST /api/v1/payments/manual/submit
 */
router.post('/manual/submit', (req: Request, res: Response) => {
  try {
    const { tid, amount, planKey, method } = req.body;

    if (!tid) {
      return res.status(400).json({ success: false, message: 'Transaction ID (TID) is required.' });
    }

    if (submittedTids.has(tid)) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_TID',
        message: `Transaction ID ${tid} has already been submitted for verification. Duplicate submission rejected.`,
      });
    }

    submittedTids.add(tid);

    return res.status(201).json({
      success: true,
      message: 'Pilot subscription payment submitted for SuperAdmin manual verification.',
      data: {
        tid,
        amount: Number(amount) || 0,
        planKey: planKey || 'DUKAN_BASIC_250',
        method: method || 'EASYPAISA',
        status: 'PENDING_APPROVAL',
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 2. Automated Easypaisa Gateway Webhook Callback
 * POST /api/v1/payments/easypaisa/callback
 */
router.post('/easypaisa/callback', (req: Request, res: Response) => {
  try {
    const { orderRefNum, responseCode, amount } = req.body;
    return res.status(200).json({
      success: true,
      message: 'Easypaisa IPN callback acknowledged and cleared.',
      data: {
        orderRefNum,
        responseCode: responseCode || '0000',
        amount,
        status: 'CLEARED',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 3. Generic Payment Webhook
 * POST /api/v1/payments/webhook
 */
router.post('/webhook', (req: Request, res: Response) => {
  try {
    const { invoiceId, status, amount } = req.body;
    return res.status(200).json({
      success: true,
      message: 'Payment webhook reconciled successfully.',
      data: { invoiceId, status: status || 'SUCCESS', amount },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
