import { Router } from 'express';
import {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  purgeOldData,
  getBusinessHubLogs,
} from '../controllers/auditLog.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);
router.use(authorizeRole('OWNER'));

router.get('/hub', getBusinessHubLogs);
router.post('/purge-old-data', purgeOldData);

router.route('/')
  .post(createAuditLog)
  .get(getAuditLogs);

router.route('/:id')
  .get(getAuditLogById);

export default router;
