import { Router } from 'express';
import {
  calculateExpectedCash,
  submitReconciliation,
  approveDiscrepancy,
  getReconciliations,
  getReconciliationById,
  getCashDrawerStats,
  getTillBalances,
  topUpTill,
} from '../controllers/cashDrawer.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect all cash drawer endpoints with JWT authentication
router.use(requireAuth);

router.get('/expected-cash', requireRole('CASHIER', 'MANAGER', 'OWNER'), calculateExpectedCash);
router.get('/till-balances', requireRole('CASHIER', 'MANAGER', 'OWNER'), getTillBalances);
router.post('/top-up-till', requireRole('CASHIER', 'MANAGER', 'OWNER'), topUpTill);
router.get('/stats', requireRole('CASHIER', 'MANAGER', 'OWNER'), getCashDrawerStats);
router.post('/reconcile', requireRole('MANAGER', 'OWNER'), submitReconciliation);

router.get('/', requireRole('MANAGER', 'OWNER'), getReconciliations);
router.get('/:id', requireRole('MANAGER', 'OWNER'), getReconciliationById);

// Require Owner/Manager role to approve cash discrepancy
router.patch('/:id/approve', requireRole('OWNER', 'MANAGER'), approveDiscrepancy);

export default router;
