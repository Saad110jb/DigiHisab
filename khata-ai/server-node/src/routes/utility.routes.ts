import { Router } from 'express';
import {
  createUtilitySplit,
  processOcrBill,
  calculateAndSetAllocations,
  addManualAllocation,
  markAllocationCleared,
  getUtilitySplits,
  getUtilitySplitById,
  updateUtilitySplit,
  deleteUtilitySplit,
  generateSplitShareSummary,
} from '../controllers/utility.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all utility endpoints with JWT authentication
router.use(requireAuth);

router.route('/')
  .post(createUtilitySplit)
  .get(getUtilitySplits);

router.route('/:id')
  .get(getUtilitySplitById)
  .put(updateUtilitySplit)
  .delete(deleteUtilitySplit);

router.post('/:id/process-ocr', processOcrBill);
router.post('/:id/calculate-allocations', calculateAndSetAllocations);
router.post('/:id/allocations', addManualAllocation);
router.patch('/:id/allocations/:allocationId/clear', markAllocationCleared);
router.get('/:id/allocations/:allocationId/summary', generateSplitShareSummary);

export default router;
