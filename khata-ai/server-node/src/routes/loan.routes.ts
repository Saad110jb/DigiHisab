import { Router } from 'express';
import {
  createInformalLoan,
  getInformalLoans,
  getInformalLoanById,
  updateInformalLoan,
  recordLoanRepayment,
  forgiveLoan,
  deleteInformalLoan,
  getLoanSummaryStats,
} from '../controllers/loan.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all informal loan endpoints with JWT authentication
router.use(requireAuth);

router.get('/summary-stats', getLoanSummaryStats);

router.route('/')
  .post(createInformalLoan)
  .get(getInformalLoans);

router.route('/:id')
  .get(getInformalLoanById)
  .put(updateInformalLoan)
  .delete(deleteInformalLoan);

router.post('/:id/repay', recordLoanRepayment);
router.patch('/:id/forgive', forgiveLoan);

export default router;
