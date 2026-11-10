import { Request, Response } from 'express';
import { ChorNazarSentinelEngine } from '../services/chorNazar.service';
import { CashierTrustProfile } from '../models/CashierTrustProfile';
import { TillSentinelEvent } from '../models/TillSentinelEvent';

/**
 * 1. Get Store-Wide Chor Nazar Trust Dashboard (Strictly Owner-Only)
 * GET /api/v1/sentinel/trust-dashboard
 */
export const getTrustDashboard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const data = await ChorNazarSentinelEngine.getStoreTrustDashboard(profileId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[getTrustDashboard Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching Chor Nazar Trust Dashboard.',
    });
  }
};

/**
 * 2. Get Specific Cashier Forensic Audit
 * GET /api/v1/sentinel/cashier-audit/:subAccountId
 */
export const getCashierAudit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { subAccountId } = req.params;

    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const profile = await CashierTrustProfile.findOne({ profileId, subAccountId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Cashier trust profile not found.' });
    }

    const events = await TillSentinelEvent.find({ profileId, subAccountId })
      .sort({ timestamp: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: {
        profile,
        events,
      },
    });
  } catch (error: any) {
    console.error('[getCashierAudit Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching cashier audit dossier.',
    });
  }
};

/**
 * 3. Telemetry Event Logger (Internal POS Hook)
 * POST /api/v1/sentinel/record-till-event
 */
export const recordTillEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const {
      subAccountId,
      cashierName = 'Counter Cashier',
      eventType,
      amountInvolved = 0,
      metadata = {},
      severity = 'MEDIUM',
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required.' });
    }

    const event = await ChorNazarSentinelEngine.recordTillEvent({
      profileId,
      subAccountId,
      cashierName,
      eventType,
      amountInvolved,
      metadata,
      severity,
    });

    return res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('[recordTillEvent Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error logging till sentinel event.',
    });
  }
};

/**
 * 4. Trigger Surprise Till Audit (Chhapa / فوری گلہ چیک)
 * POST /api/v1/sentinel/trigger-surprise-audit
 */
export const triggerSurpriseAudit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const { subAccountId, cashierName = 'Cashier' } = req.body;
    if (!subAccountId) {
      return res.status(400).json({ success: false, message: 'subAccountId is required.' });
    }

    const result = await ChorNazarSentinelEngine.triggerSurpriseAudit(profileId, subAccountId, cashierName);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[triggerSurpriseAudit Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error dispatching surprise audit.',
    });
  }
};

/**
 * 5. Revoke Cashier Void Privileges
 * POST /api/v1/sentinel/revoke-void-permission
 */
export const revokeVoidPermission = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const { subAccountId } = req.body;
    if (!subAccountId) {
      return res.status(400).json({ success: false, message: 'subAccountId is required.' });
    }

    const result = await ChorNazarSentinelEngine.revokeVoidPermissions(profileId, subAccountId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[revokeVoidPermission Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error revoking cashier void permissions.',
    });
  }
};

/**
 * 6. ML Anomaly Scoring for Cash Drawer & Floor Events (Isolation Forest)
 * POST /api/v1/sentinel/evaluate-anomaly
 */
export const evaluateTillAnomaly = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const {
      subAccountId,
      cashierName,
      amountInvolved,
      drawerVariance,
      voidRatio,
      velocity,
      timeSkewMinutes,
    } = req.body;

    const result = await ChorNazarSentinelEngine.evaluateTillAnomalyWithML({
      profileId,
      subAccountId,
      cashierName,
      amountInvolved,
      drawerVariance,
      voidRatio,
      velocity,
      timeSkewMinutes,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[evaluateTillAnomaly Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error scoring till anomaly.',
    });
  }
};

