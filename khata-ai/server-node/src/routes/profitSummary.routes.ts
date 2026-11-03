import { Router } from 'express';
import {
  createOrUpdateProfitSummary,
  getProfitSummaries,
  getProfitSummaryByKey,
  recalculateProfitSummary,
  deleteProfitSummary,
} from '../controllers/profitSummary.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);
router.use(authorizeRole('OWNER'));

router.post('/recalculate', recalculateProfitSummary);
router.get('/period/:periodType/:periodKey', getProfitSummaryByKey);

router.route('/')
  .post(createOrUpdateProfitSummary)
  .get(getProfitSummaries);

router.route('/:id')
  .delete(deleteProfitSummary);

export default router;
