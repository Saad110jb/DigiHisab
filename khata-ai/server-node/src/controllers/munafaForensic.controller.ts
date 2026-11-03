import { Request, Response } from 'express';
import {
  performMunafaForensicAudit,
  ForensicPeriod,
} from '../services/munafaForensic.service';

/**
 * Get AI Munafa Forensic Audit Report
 * GET /api/v1/munafa-forensic/audit?period=ROZANA|MAHANA|SIX_MONTH|SALANA
 */
export const getMunafaForensicAudit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized profile' });
    }

    const periodParam = (req.query.period as string) || 'MAHANA';
    const validPeriods: ForensicPeriod[] = ['ROZANA', 'MAHANA', 'SIX_MONTH', 'SALANA'];
    const period: ForensicPeriod = validPeriods.includes(periodParam as ForensicPeriod)
      ? (periodParam as ForensicPeriod)
      : 'MAHANA';

    const report = await performMunafaForensicAudit(profileId.toString(), period);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[getMunafaForensicAudit Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating Munafa forensic audit report',
    });
  }
};
