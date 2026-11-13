import { Router } from 'express';
import {
  getLiveRates,
  getHistoricalTrend,
  syncMandiRatesNow,
} from '../controllers/mandiRate.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Allow authenticated merchants and household users to query live rates
router.use(requireAuth);

router.get('/live-rates', getLiveRates);
router.get('/historical-trend/:commodityKey', getHistoricalTrend);
router.post('/sync-now', syncMandiRatesNow);

export default router;
