import { Router } from 'express';
import {
  validateDomesticTransaction,
  resolveVaultShortage,
  getHouseholdBudgetRadar,
  commitGuardedExpense,
} from '../controllers/jevDomesticGuardian.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// 1. Transaction Solvency & Budget Guidance Validation
router.post('/validate', validateDomesticTransaction);

// 2. 1-Tap ATM Inter-Vault Transfer Resolution
router.post('/resolve-shortage', resolveVaultShortage);

// 3. Household Budget Radar & Velocity
router.get('/budget-radar', getHouseholdBudgetRadar);

// 4. Commit Guarded Expense with Balanced Double-Entry Voucher
router.post('/commit-expense', commitGuardedExpense);

export default router;
