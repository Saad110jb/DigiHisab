import { Request, Response } from 'express';
import { MandiArbitrageEngine } from '../services/mandiArbitrage.service';

/**
 * Mandi Rate Radar Summary & Arbitrage Quotes
 * GET /api/v1/mandi-radar/summary
 */
export const getRadarSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const summary = await MandiArbitrageEngine.getRadarSummary(profileId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('[getRadarSummary Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating Mandi Arbitrage radar summary.',
    });
  }
};

/**
 * Real-time Bill Items Evaluation (Creep & Cheaper Vendor Interceptor)
 * POST /api/v1/mandi-radar/evaluate-bill-items
 */
export const evaluateBillItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const { items, supplierId } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items must be an array.' });
    }

    const evaluations = await MandiArbitrageEngine.evaluateBillItems(profileId, items, supplierId);

    return res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error: any) {
    console.error('[evaluateBillItems Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error evaluating bill items.',
    });
  }
};
