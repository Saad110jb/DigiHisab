import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getTrustDashboard,
  getCashierAudit,
  recordTillEvent,
  triggerSurpriseAudit,
  revokeVoidPermission,
} from '../controllers/chorNazar.controller';

const router = Router();

// Base Auth on all Sentinel Routes
router.use(requireAuth);

/**
 * Owner-Only Endpoints (Strict RBAC - Cashiers and Managers are blocked with 403 Forbidden)
 */
router.get('/trust-dashboard', requireRole('OWNER'), getTrustDashboard);
router.get('/cashier-audit/:subAccountId', requireRole('OWNER'), getCashierAudit);
router.post('/trigger-surprise-audit', requireRole('OWNER'), triggerSurpriseAudit);
router.post('/revoke-void-permission', requireRole('OWNER'), revokeVoidPermission);

/**
 * POS Telemetry Event Logger (Accessible by authorized tills during floor transactions)
 */
router.post('/record-till-event', requireRole('CASHIER', 'MANAGER', 'OWNER'), recordTillEvent);

export default router;
