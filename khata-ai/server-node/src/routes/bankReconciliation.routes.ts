import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  importBankStatement,
  autoMatchReconciliation,
  resolveDiscrepancy,
  getReconciliations,
  getReconciliationById,
} from '../controllers/bankReconciliation.controller';

const router = Router();

router.use(requireAuth);

router.post('/import', importBankStatement);
router.get('/', getReconciliations);
router.get('/:id', getReconciliationById);
router.post('/:id/auto-match', autoMatchReconciliation);
router.post('/:id/resolve-discrepancy', resolveDiscrepancy);

export default router;
