import { Request, Response } from 'express';
import {
  calculateCustomerRfmSummary,
  generateCampaignMessages,
  markCampaignSent,
  CAMPAIGN_TEMPLATES,
} from '../services/customerRfmMarketing.service';

/**
 * Get RFM segments, scores, and customer loyalty metrics
 * GET /api/v1/customer-marketing/summary
 */
export const getRfmSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized profile' });
    }

    const summary = await calculateCustomerRfmSummary(profileId.toString());
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('[getRfmSummary Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error calculating customer RFM tiers',
    });
  }
};

/**
 * Get list of available campaign templates
 * GET /api/v1/customer-marketing/templates
 */
export const getCampaignTemplates = async (req: Request, res: Response): Promise<Response> => {
  try {
    return res.status(200).json({
      success: true,
      data: CAMPAIGN_TEMPLATES,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching campaign templates',
    });
  }
};

/**
 * Generate preview messages and WhatsApp links for a campaign
 * GET /api/v1/customer-marketing/preview?campaignId=...&segment=...
 */
export const getCampaignPreviews = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized profile' });
    }

    const campaignId = (req.query.campaignId as string) || 'FRESH_STOCK';
    const segment = (req.query.segment as any) || undefined;

    const preview = await generateCampaignMessages(profileId.toString(), campaignId, segment);
    return res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error('[getCampaignPreviews Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating campaign previews',
    });
  }
};

/**
 * Mark that a campaign was dispatched to a customer
 * POST /api/v1/customer-marketing/dispatch
 */
export const recordCampaignDispatch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized profile' });
    }

    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    const updated = await markCampaignSent(profileId.toString(), customerId);
    return res.status(200).json({
      success: true,
      message: 'Campaign dispatch recorded',
      data: updated,
    });
  } catch (error: any) {
    console.error('[recordCampaignDispatch Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error recording campaign dispatch',
    });
  }
};
