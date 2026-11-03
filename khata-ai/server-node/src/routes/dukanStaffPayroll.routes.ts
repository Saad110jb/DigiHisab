import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';
import {
  createStaff,
  getStaffList,
  markAttendance,
  bulkMarkAttendance,
  autoMarkUnmarkedAttendance,
  addAdvanceKharcha,
  settleMonthlyPayout,
  deleteStaff,
} from '../controllers/dukanStaffPayroll.controller';

const router = Router();

// Protect all routes with authentication middleware
router.use(protect);

router.get('/', authorizeRole('MANAGER', 'OWNER'), getStaffList);
router.post('/', authorizeRole('OWNER'), createStaff);
router.post('/attendance/bulk', authorizeRole('MANAGER', 'OWNER'), bulkMarkAttendance);
router.post('/auto-mark-unmarked', authorizeRole('MANAGER', 'OWNER'), autoMarkUnmarkedAttendance);
router.post('/advances', authorizeRole('MANAGER', 'OWNER'), addAdvanceKharcha);
router.post('/settlement', authorizeRole('OWNER'), settleMonthlyPayout);
router.post('/:id/attendance', authorizeRole('MANAGER', 'OWNER'), markAttendance);
router.post('/:id/auto-mark-unmarked', authorizeRole('MANAGER', 'OWNER'), autoMarkUnmarkedAttendance);
router.post('/:id/advance', authorizeRole('MANAGER', 'OWNER'), addAdvanceKharcha);
router.post('/:id/payout', authorizeRole('OWNER'), settleMonthlyPayout);
router.delete('/:id', authorizeRole('OWNER'), deleteStaff);

export default router;
