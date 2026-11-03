import { Router } from 'express';
import {
  createReminderJob,
  getReminderJobs,
  getReminderJobById,
  cancelReminderJob,
  rescheduleReminderJob,
  markJobDispatched,
  markJobFailed,
  retryReminderJob,
  handleWhatsAppWebhook,
} from '../controllers/reminder.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public / Meta WhatsApp Cloud API Webhook Endpoints
router.get('/webhook/whatsapp', handleWhatsAppWebhook);
router.post('/webhook/whatsapp', handleWhatsAppWebhook);

// Protected reminder management endpoints (Requires valid JWT)
router.use(requireAuth);

router.post('/', createReminderJob);
router.get('/', getReminderJobs);
router.get('/:id', getReminderJobById);
router.patch('/:id/cancel', cancelReminderJob);
router.patch('/:id/reschedule', rescheduleReminderJob);
router.patch('/:id/mark-dispatched', markJobDispatched);
router.patch('/:id/mark-failed', markJobFailed);
router.post('/:id/retry', retryReminderJob);

export default router;
