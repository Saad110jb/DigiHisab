import { Router } from 'express';
import {
  getAllDomesticRecords,
  getDomesticAuditTrail,
  updateDomesticRecord,
  deleteDomesticRecord,
  revertDomesticAuditLog,
  reconcileVaultPhysicalCount,
} from '../controllers/domesticAuditUpdate.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// 1. Unified Domestic Records Query (Search & Filter)
router.get('/records', getAllDomesticRecords);

// 2. Domestic Audit Trail Timeline
router.get('/trail', getDomesticAuditTrail);

// 3. Update Domestic Record with Auto-Rebalance
router.put('/records', updateDomesticRecord);

// 4. Delete / Void Domestic Record with Auto-Refund
router.post('/delete', deleteDomesticRecord);

// 5. 1-Tap Revert of Previous Audit Change
router.post('/revert', revertDomesticAuditLog);

// 6. Reconcile Physical Vault Cash Count
router.post('/reconcile-vault', reconcileVaultPhysicalCount);

export default router;
