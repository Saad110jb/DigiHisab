import { Router } from 'express';
import {
  getStaffList,
  getStaffAnalytics,
  createStaff,
  logPeshgiAdvance,
  recordAttendance,
  settleMonthlySalary,
  getSalarySlipText,
  deleteStaff,
} from '../controllers/domesticStaff.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/analytics', getStaffAnalytics);
router.get('/:id/salary-slip', getSalarySlipText);
router.post('/:id/advance', logPeshgiAdvance);
router.post('/:id/attendance', recordAttendance);
router.post('/:id/settle', settleMonthlySalary);

router.route('/')
  .get(getStaffList)
  .post(createStaff);

router.route('/:id')
  .delete(deleteStaff);

export default router;
