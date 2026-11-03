import { Router } from 'express';
import {
  createMaintenanceLog,
  getMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  getUpcomingServiceReminders,
  getMaintenanceCostAnalytics,
} from '../controllers/maintenance.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all maintenance endpoints with JWT authentication
router.use(requireAuth);

router.get('/upcoming-reminders', getUpcomingServiceReminders);
router.get('/analytics', getMaintenanceCostAnalytics);

router.route('/')
  .post(createMaintenanceLog)
  .get(getMaintenanceLogs);

router.route('/:id')
  .get(getMaintenanceLogById)
  .put(updateMaintenanceLog)
  .delete(deleteMaintenanceLog);

export default router;
