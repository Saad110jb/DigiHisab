import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v1/dashboard/metrics
 * Returns real-time MongoDB aggregated store metrics directly from Counterparty and Profile documents.
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const metrics = await getAggregatedStoreMetrics(profileId);

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error computing aggregated store metrics.',
    });
  }
});

export default router;
