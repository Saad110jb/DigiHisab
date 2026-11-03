import { Router } from 'express';
import {
  getDeadStockSummary,
  getBundleRecommendations,
  applyItemMarkdown,
} from '../controllers/deadStockLiquidator.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getDeadStockSummary
);

router.get(
  '/bundles',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getBundleRecommendations
);

router.post(
  '/apply-markdown',
  authorizeRole('MANAGER', 'OWNER'),
  applyItemMarkdown
);

export default router;
