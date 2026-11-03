import { Router } from 'express';
import {
  getCurrentWeekBudget,
  allocateWeeklyBudget,
  logMandiPurchase,
  deleteMandiPurchase,
  getRateBenchmarks,
} from '../controllers/mandiBudget.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/current-week', getCurrentWeekBudget);
router.post('/envelope', allocateWeeklyBudget);
router.post('/purchase', logMandiPurchase);
router.delete('/purchase/:id', deleteMandiPurchase);
router.get('/rate-benchmarks', getRateBenchmarks);

export default router;
