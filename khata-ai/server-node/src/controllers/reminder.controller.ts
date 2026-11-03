import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ReminderJob, JobStatus } from '../models/ReminderJob';
import { Counterparty } from '../models/Counterparty';
import { Profile } from '../models/Profile';
import { env } from '../config/env';

/**
 * Renders culturally contextual Roman Urdu debt recovery message templates based on tone tier
 */
const renderToneTemplate = (toneTier: number, counterpartyName: string, balance: number, overdueDays: number): string => {
  const formattedBalance = balance.toLocaleString('en-PK');

  switch (toneTier) {
    case 1:
      // Gentle Reminder
      return `Salam ${counterpartyName}, aap ki taraf PKR ${formattedBalance} ka baki hisab maujood hai. Meherbani farma kar jab waqt miley ada kar dein. Shukriya!`;
    case 2:
      // Operational Reminder
      return `Assalam-o-Alaikum ${counterpartyName}, Khata-AI record ke mutabiq aap ka PKR ${formattedBalance} ka udhaar ${overdueDays > 0 ? overdueDays + ' dino se ' : ''}wajib-ul-ada hai. Baraye meherbani jald az jald adadaigi karein.`;
    case 3:
      // Formal Hold Notice
      return `NOTICE: ${counterpartyName}, aap ka PKR ${formattedBalance} ka wajib-ul-ada qarz taakheer shuda hai. Naye udhaar / credit sahulat filhal roki ja rahi hai. Aaj hi raabta karein.`;
    default:
      return `Salam ${counterpartyName}, aap ki taraf PKR ${formattedBalance} ka baki hisab maujood hai.`;
  }
};

/**
 * 1. Schedule a New Debt Recovery Reminder Job
 * POST /api/v1/reminders
 */
export const createReminderJob = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { counterpartyId, toneTier = 1, scheduledFor, customTemplateText } = req.body;

    if (!counterpartyId) {
      return res.status(400).json({ success: false, message: 'Counterparty ID is required.' });
    }

    const counterparty = await Counterparty.findOne({ _id: counterpartyId, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    const selectedToneTier = Math.min(3, Math.max(1, parseInt(toneTier, 10) || 1));
    const renderedText = customTemplateText
      ? customTemplateText.trim()
      : renderToneTemplate(
          selectedToneTier,
          counterparty.name,
          counterparty.currentBalance,
          counterparty.riskProfile.overdueDays
        );

    const scheduleDate = scheduledFor ? new Date(scheduledFor) : new Date();

    const job = await ReminderJob.create({
      profileId,
      counterpartyId: counterparty._id,
      recipientPhone: counterparty.phone,
      toneTier: selectedToneTier,
      renderedTemplateText: renderedText,
      scheduledFor: scheduleDate,
      status: 'SCHEDULED',
    });

    // Update tone tier & last reminder sent timestamp on counterparty
    counterparty.riskProfile.currentToneTier = selectedToneTier;
    counterparty.riskProfile.lastReminderSentAt = new Date();
    await counterparty.save();

    return res.status(201).json({
      success: true,
      message: 'Reminder job scheduled successfully.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Reminder Jobs with Filters
 * GET /api/v1/reminders
 */
export const getReminderJobs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { status, counterpartyId, toneTier, startDate, endDate, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    if (counterpartyId && typeof counterpartyId === 'string') {
      filter.counterpartyId = new Types.ObjectId(counterpartyId);
    }

    if (toneTier) {
      filter.toneTier = parseInt(toneTier as string, 10);
    }

    if (startDate || endDate) {
      filter.scheduledFor = {};
      if (startDate) filter.scheduledFor.$gte = new Date(startDate as string);
      if (endDate) filter.scheduledFor.$lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [jobs, totalCount] = await Promise.all([
      ReminderJob.find(filter)
        .populate('counterpartyId', 'name phone relationType currentBalance riskProfile')
        .sort({ scheduledFor: 1 })
        .skip(skip)
        .limit(limitNum),
      ReminderJob.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: jobs,
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
 * 3. Get Reminder Job Details by ID
 * GET /api/v1/reminders/:id
 */
export const getReminderJobById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const job = await ReminderJob.findOne({ _id: id, profileId }).populate(
      'counterpartyId',
      'name phone relationType currentBalance creditLimit riskProfile'
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Cancel Pending Scheduled Reminder Job
 * PATCH /api/v1/reminders/:id/cancel
 */
export const cancelReminderJob = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const job = await ReminderJob.findOne({ _id: id, profileId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    if (job.status === 'DISPATCHED') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already dispatched reminder.' });
    }

    job.status = 'CANCELLED';
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Reminder job cancelled successfully.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Reschedule Pending Reminder Job Timestamp
 * PATCH /api/v1/reminders/:id/reschedule
 */
export const rescheduleReminderJob = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { scheduledFor } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({ success: false, message: 'New scheduledFor timestamp is required.' });
    }

    const job = await ReminderJob.findOne({ _id: id, profileId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    job.scheduledFor = new Date(scheduledFor);
    job.status = 'SCHEDULED';
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Reminder job rescheduled successfully.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Internal Worker Hook: Mark Job Dispatched
 * PATCH /api/v1/reminders/:id/mark-dispatched
 */
export const markJobDispatched = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { waMessageId } = req.body;

    const job = await ReminderJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    job.status = 'DISPATCHED';
    job.dispatchedAt = new Date();
    if (waMessageId) job.waMessageId = waMessageId;

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Reminder job marked as DISPATCHED.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Internal Worker Hook: Mark Job Failed
 * PATCH /api/v1/reminders/:id/mark-failed
 */
export const markJobFailed = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { failureReason } = req.body;

    const job = await ReminderJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    job.status = 'FAILED';
    job.failureReason = failureReason || 'Worker dispatch error';

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Reminder job marked as FAILED.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Retry Failed Reminder Job
 * POST /api/v1/reminders/:id/retry
 */
export const retryReminderJob = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { scheduledFor } = req.body;

    const job = await ReminderJob.findOne({ _id: id, profileId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Reminder job not found.' });
    }

    job.status = 'SCHEDULED';
    job.failureReason = undefined;
    job.scheduledFor = scheduledFor ? new Date(scheduledFor) : new Date();

    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Reminder job requeued for retry successfully.',
      data: job,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Consumer Endpoint for WhatsApp Cloud API Webhook Receipts
 * GET & POST /api/v1/reminders/webhook/whatsapp
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // 1. Webhook Verification Mode (GET request from Meta Cloud API setup)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'khata_ai_wa_verify_token';

      if (mode === 'subscribe' && token === verifyToken) {
        return res.status(200).send(challenge);
      }
      return res.status(403).json({ success: false, message: 'Webhook verification token mismatch.' });
    }

    // 2. Incoming Webhook Receipt Ingestion (POST request)
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const statuses = value.statuses || [];

          for (const statusObj of statuses) {
            const waMessageId = statusObj.id;
            const deliveryStatus = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'

            if (waMessageId) {
              const job = await ReminderJob.findOne({ waMessageId });
              if (job) {
                if (deliveryStatus === 'failed') {
                  job.status = 'FAILED';
                  job.failureReason = statusObj.errors?.[0]?.title || 'WhatsApp Cloud delivery failed';
                } else if (deliveryStatus === 'sent' || deliveryStatus === 'delivered' || deliveryStatus === 'read') {
                  job.status = 'DISPATCHED';
                  if (!job.dispatchedAt) job.dispatchedAt = new Date();
                }
                await job.save();
              }
            }
          }
        }
      }
      return res.status(200).json({ success: true, message: 'Webhook processed.' });
    }

    return res.status(200).json({ success: true, message: 'Event ignored.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
