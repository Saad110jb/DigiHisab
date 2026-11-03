import { Router } from 'express';
import {
  getRunwayStatus,
  getUpcomingObligations,
  simulateExpenseImpact,
} from '../controllers/jevDomesticRunway.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// 1. Live Kitchen Runway & Deficit Status
router.get('/status', getRunwayStatus);

// 2. Calendar-Aware Committed Obligations
router.get('/obligations', getUpcomingObligations);

// 3. What-If Expense Impact Simulator
router.post('/simulate', simulateExpenseImpact);
router.post('/simulate-expense', simulateExpenseImpact);

export default router;
