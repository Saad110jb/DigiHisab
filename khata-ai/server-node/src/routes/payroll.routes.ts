import { Router } from 'express';
import {
  createStaffPayroll,
  getStaffPayrolls,
  getStaffPayrollById,
  updateStaffPayroll,
  grantSalaryAdvance,
  processMonthlySalaryPayment,
  deleteStaffPayroll,
} from '../controllers/payroll.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all domestic payroll endpoints with JWT authentication
router.use(requireAuth);

router.route('/')
  .post(createStaffPayroll)
  .get(getStaffPayrolls);

router.route('/:id')
  .get(getStaffPayrollById)
  .put(updateStaffPayroll)
  .delete(deleteStaffPayroll);

router.post('/:id/advance', grantSalaryAdvance);
router.post('/:id/pay-salary', processMonthlySalaryPayment);

export default router;
