import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { streamNotifications, sendTestNotification, broadcastNotification } from '../controllers/notification.controller';

const router = Router();

// Protected SSE stream endpoint
router.get('/stream', protect, streamNotifications);

// Protected test notification dispatch endpoint
router.post('/test', protect, sendTestNotification);

// Platform Broadcast notification endpoint (SuperAdmin dispatcher)
router.post('/broadcast', broadcastNotification);

export default router;
