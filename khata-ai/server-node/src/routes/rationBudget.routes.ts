import { Router } from 'express';
import {
  createRationBudget,
  getRationBudgets,
  getRationBudgetByMonth,
  updateRationBudget,
  logRationExpense,
  deleteRationBudget,
} from '../controllers/rationBudget.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/month/:monthKey', getRationBudgetByMonth);
router.post('/:id/log-expense', logRationExpense);

router.route('/')
  .post(createRationBudget)
  .get(getRationBudgets);

router.route('/:id')
  .put(updateRationBudget)
  .delete(deleteRationBudget);

export default router;
