import { Router } from 'express';
import {
  generatePaymentLink,
  getPaymentLinkByToken,
  handleGatewayWebhook,
  verifyPaymentStatus,
  cancelPaymentLink,
  getPaymentLinks,
  expireStaleLinks,
} from '../controllers/paymentLink.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public Endpoints (No Auth Required)
router.get('/public/:token', getPaymentLinkByToken);
router.post('/webhook', handleGatewayWebhook);
router.get('/:token/verify', verifyPaymentStatus);
router.post('/expire-stale', expireStaleLinks);

// Protected Merchant Endpoints (Requires valid JWT)
router.use(requireAuth);

router.post('/', generatePaymentLink);
router.get('/', getPaymentLinks);
router.patch('/:token/cancel', cancelPaymentLink);

export default router;
