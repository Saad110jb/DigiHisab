import { Request, Response } from 'express';
import { registerSseClient, dispatchPushNotification, broadcastToAllActiveSseClients } from '../services/notificationDispatcher.service';
import { IPushNotification } from '../types/notification';
import { Profile } from '../models/Profile';

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

/**
 * Broadcast Notification to Users (SSE & In-App Engine)
 * POST /api/v1/notifications/broadcast
 */
export const broadcastNotification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      titleEnglish = 'DigiHisab Platform Announcement',
      titleUrdu,
      messageEnglish,
      messageUrdu,
      targetAudience = 'ALL', // 'ALL' | 'DUKANDAR' | 'HOUSEHOLD'
      priority = 'INFO',
      category = 'ANNOUNCEMENT',
      actionLabel = 'تفصیلات دیکھیں',
      actionRoute = 'Dashboard',
      durationMs = 6000,
    } = req.body;

    if (!messageEnglish && !messageUrdu) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const notification: IPushNotification = {
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category,
      priority: (priority as any) || 'INFO',
      titleUrdu: titleUrdu || titleEnglish,
      titleEnglish: titleEnglish || 'Notification',
      messageUrdu: messageUrdu || messageEnglish,
      messageEnglish: messageEnglish || messageUrdu,
      timestamp: new Date().toISOString(),
      actionLabel,
      actionRoute,
      durationMs: Number(durationMs) || 6000,
    };

    let sseDispatchedCount = 0;

    if (targetAudience === 'ALL') {
      // Broadcast to every active SSE client connection
      sseDispatchedCount = broadcastToAllActiveSseClients(notification);
    } else {
      // Find matching profiles according to persona
      const personaFilter = targetAudience === 'DUKANDAR' ? 'VENDOR' : 'HOUSEHOLD';
      const targetProfiles = await Profile.find({ activePersona: personaFilter }).select('_id');
      
      for (const p of targetProfiles) {
        dispatchPushNotification(p._id.toString(), notification);
      }
      
      // Also broadcast to active clients
      sseDispatchedCount = broadcastToAllActiveSseClients(notification);
    }

    return res.status(200).json({
      success: true,
      message: `Notification broadcast dispatched successfully to ${targetAudience} audience.`,
      dispatchedClients: sseDispatchedCount,
      notification,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
