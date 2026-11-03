import { Request, Response } from 'express';
import { registerSseClient, dispatchPushNotification } from '../services/notificationDispatcher.service';
import { IPushNotification } from '../types/notification';

/**
 * Real-Time SSE Notification Stream Endpoint
 * GET /api/v1/notifications/stream
 */
export const streamNotifications = async (req: Request, res: Response): Promise<void> => {
  const profileId = req.user?.profileId?.toString() || req.user?.id?.toString();
  if (!profileId) {
    res.status(401).json({ success: false, message: 'Authentication required for SSE stream.' });
    return;
  }

  // Set mandatory SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Cloudflare)

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Register client stream
  registerSseClient(profileId, res);
};

/**
 * Dispatch Test Push Notification (for development and manual verification)
 * POST /api/v1/notifications/test
 */
export const sendTestNotification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.profileId?.toString() || req.user?.id?.toString();
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const {
      category = 'STOCK_ALERT',
      priority = 'WARNING',
      titleUrdu = 'کم اسٹاک کی اطلاع',
      titleEnglish = 'Low Stock Alert',
      messageUrdu = 'آئٹم "چینی 1 کلو" کا اسٹاک ختم ہونے والا ہے (2 کلو باقی)۔',
      messageEnglish = 'Item "Sugar 1kg" is low on stock (2 kg remaining).',
      actionLabel = 'خریداری آرڈر',
      actionRoute = 'WholesalePoModal',
      durationMs = 5000,
    } = req.body;

    const notification: IPushNotification = {
      id: `test-notif-${Date.now()}`,
      category,
      priority,
      titleUrdu,
      titleEnglish,
      messageUrdu,
      messageEnglish,
      timestamp: new Date().toISOString(),
      actionLabel,
      actionRoute,
      durationMs,
    };

    dispatchPushNotification(profileId, notification);

    return res.status(200).json({
      success: true,
      message: 'Test notification dispatched successfully.',
      data: notification,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
