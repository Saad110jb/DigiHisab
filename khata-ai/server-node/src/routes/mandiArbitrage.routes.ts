import { Router } from 'express';
import {
  getRadarSummary,
  evaluateBillItems,
} from '../controllers/mandiArbitrage.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getRadarSummary
);

router.post(
  '/evaluate-bill-items',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  evaluateBillItems
);

export default router;
