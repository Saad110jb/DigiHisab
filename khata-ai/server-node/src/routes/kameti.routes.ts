import { Router } from 'express';
import {
  createKametiPool,
  addMemberToPool,
  recordInstallmentPayment,
  disbursePayout,
  advanceCycle,
  getKametiPools,
  getKametiPoolById,
  deleteKametiPool,
} from '../controllers/kameti.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all Kameti endpoints with JWT authentication
router.use(requireAuth);

router.route('/')
  .post(createKametiPool)
  .get(getKametiPools);

router.route('/:id')
  .get(getKametiPoolById)
  .delete(deleteKametiPool);

router.post('/:id/members', addMemberToPool);
router.post('/:id/members/:memberId/pay', recordInstallmentPayment);
router.post('/:id/members/:memberId/disburse', disbursePayout);
router.patch('/:id/advance-cycle', advanceCycle);

export default router;
