import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { DynamicPaymentLink, PaymentGateway } from '../models/DynamicPaymentLink';
import { Profile } from '../models/Profile';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Generate Active Payment Link & Deep-Link / QR Code URLs
 * POST /api/v1/payment-links
 */
export const generatePaymentLink = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      amount,
      gateway = 'JAZZCASH',
      counterpartyId,
      ledgerEntryId,
      validMinutes = 60,
    } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    const validGateways: PaymentGateway[] = ['JAZZCASH', 'EASYPAISA', 'RAAST', 'STRIPE'];
    if (!validGateways.includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gateway. Allowed values: ${validGateways.join(', ')}`,
      });
    }

    const numericAmount = Number(amount);
    const linkToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + Math.max(5, Number(validMinutes)) * 60 * 1000);

    const baseUrl = process.env.CLIENT_BASE_URL || 'https://khata.ai/pay';
    const deepLinkUrl = `${baseUrl}/${linkToken}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLinkUrl)}`;

    const paymentLink = await DynamicPaymentLink.create({
      profileId,
      counterpartyId: counterpartyId ? new Types.ObjectId(counterpartyId) : undefined,
      ledgerEntryId: ledgerEntryId ? new Types.ObjectId(ledgerEntryId) : undefined,
      linkToken,
      gateway,
      amount: numericAmount,
      qrCodeUrl,
      deepLinkUrl,
      status: 'PENDING',
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Dynamic payment link generated successfully.',
      data: paymentLink,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Public Endpoint: Get Invoice Details by Token (Debtor Web Checkout View)
 * GET /api/v1/payment-links/public/:token
 */
export const getPaymentLinkByToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token } = req.params;

    const paymentLink = await DynamicPaymentLink.findOne({ linkToken: token })
      .populate('profileId', 'businessName fullName phone baseCurrency')
      .populate('counterpartyId', 'name phone');

    if (!paymentLink) {
      return res.status(404).json({ success: false, message: 'Payment link not found or expired.' });
    }

    // Auto-expire link if current time exceeds expiresAt and status is PENDING
    if (paymentLink.status === 'PENDING' && new Date() > paymentLink.expiresAt) {
      paymentLink.status = 'EXPIRED';
      await paymentLink.save();
    }

    return res.status(200).json({
      success: true,
      data: paymentLink,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Idempotent IPN Webhook Listener for JazzCash / Easypaisa / Raast / Stripe
 * POST /api/v1/payment-links/webhook
 */
export const handleGatewayWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const payload = req.body;
    const linkToken = payload.linkToken || payload.pp_TxnRefNo || payload.referenceId;
    const gatewayTxnId = payload.gatewayTransactionId || payload.pp_TxnRefNo || payload.stripePaymentIntentId || `TXN_${Date.now()}`;

    if (!linkToken) {
      return res.status(400).json({ success: false, message: 'Link token or transaction reference missing.' });
    }

    const paymentLink = await DynamicPaymentLink.findOne({ linkToken });
    if (!paymentLink) {
      return res.status(404).json({ success: false, message: 'Payment link reference not found.' });
    }

    // Idempotency check: Ignore if already marked PAID
    if (paymentLink.status === 'PAID') {
      return res.status(200).json({ success: true, message: 'Webhook already processed (Idempotent).' });
    }

    paymentLink.status = 'PAID';
    paymentLink.paidAt = new Date();
    paymentLink.gatewayTransactionId = gatewayTxnId;
    paymentLink.rawWebhookPayload = payload;
    await paymentLink.save();

    // Trigger automatic ledger balance settlement & counterparty balance reduction
    if (paymentLink.counterpartyId) {
      const counterparty = await Counterparty.findOne({
        _id: paymentLink.counterpartyId,
        profileId: paymentLink.profileId,
      });

      if (counterparty) {
        counterparty.currentBalance = Math.max(0, counterparty.currentBalance - paymentLink.amount);
        await counterparty.save();
      }
    }

    // Mark linked ledger entry as settled if provided
    if (paymentLink.ledgerEntryId) {
      await LedgerEntry.updateOne(
        { _id: paymentLink.ledgerEntryId, profileId: paymentLink.profileId },
        { isSettled: true, settledAt: new Date() }
      );
    }

    // Emit SETTLEMENT ledger entry
    await LedgerEntry.create({
      profileId: paymentLink.profileId,
      counterpartyId: paymentLink.counterpartyId,
      entryType: 'SETTLEMENT',
      amount: paymentLink.amount,
      paymentMode: paymentLink.gateway === 'STRIPE' ? 'BANK_TRANSFER' : (paymentLink.gateway as any),
      category: 'Digital Payment',
      description: `Payment received via ${paymentLink.gateway} (Txn: ${gatewayTxnId})`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Payment of PKR ${paymentLink.amount} verified and settled successfully.`,
      data: paymentLink,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Polling Endpoint: Verify Payment Link Status
 * GET /api/v1/payment-links/:token/verify
 */
export const verifyPaymentStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token } = req.params;

    const paymentLink = await DynamicPaymentLink.findOne({ linkToken: token });
    if (!paymentLink) {
      return res.status(404).json({ success: false, message: 'Payment link not found.' });
    }

    if (paymentLink.status === 'PENDING' && new Date() > paymentLink.expiresAt) {
      paymentLink.status = 'EXPIRED';
      await paymentLink.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        linkToken: paymentLink.linkToken,
        status: paymentLink.status,
        amount: paymentLink.amount,
        paidAt: paymentLink.paidAt,
        gatewayTransactionId: paymentLink.gatewayTransactionId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Void / Cancel Active Payment Link (Merchant Action)
 * PATCH /api/v1/payment-links/:token/cancel
 */
export const cancelPaymentLink = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { token } = req.params;

    const paymentLink = await DynamicPaymentLink.findOne({ linkToken: token, profileId });
    if (!paymentLink) {
      return res.status(404).json({ success: false, message: 'Payment link not found.' });
    }

    if (paymentLink.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already paid payment link.' });
    }

    paymentLink.status = 'CANCELLED';
    await paymentLink.save();

    return res.status(200).json({
      success: true,
      message: 'Payment link cancelled successfully.',
      data: paymentLink,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Paginated Payment Links (with Filters)
 * GET /api/v1/payment-links
 */
export const getPaymentLinks = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { status, gateway, counterpartyId, startDate, endDate, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    if (gateway && typeof gateway === 'string') {
      filter.gateway = gateway.toUpperCase();
    }

    if (counterpartyId && typeof counterpartyId === 'string') {
      filter.counterpartyId = new Types.ObjectId(counterpartyId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [links, totalCount] = await Promise.all([
      DynamicPaymentLink.find(filter)
        .populate('counterpartyId', 'name phone relationType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      DynamicPaymentLink.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: links,
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
 * 7. Scheduled Cron Worker Trigger: Expire Stale Links
 * POST /api/v1/payment-links/expire-stale
 */
export const expireStaleLinks = async (req: Request, res: Response): Promise<Response> => {
  try {
    const now = new Date();
    const result = await DynamicPaymentLink.updateMany(
      { status: 'PENDING', expiresAt: { $lt: now } },
      { $set: { status: 'EXPIRED' } }
    );

    return res.status(200).json({
      success: true,
      message: `Expired ${result.modifiedCount} stale payment link(s).`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
