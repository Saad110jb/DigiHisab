import { Router } from 'express';
import { getMunafaForensicAudit } from '../controllers/munafaForensic.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get(
  '/audit',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getMunafaForensicAudit
);

export default router;
