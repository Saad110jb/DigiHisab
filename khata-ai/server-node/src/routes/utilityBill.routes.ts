import { Router } from 'express';
import {
  getUtilityBills,
  createUtilityBill,
  payUtilityBill,
  generatePaymentProofText,
  deleteUtilityBill,
} from '../controllers/utilityBill.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getUtilityBills);
router.post('/', createUtilityBill);
router.patch('/:id/pay', payUtilityBill);
router.get('/:id/share-text', generatePaymentProofText);
router.delete('/:id', deleteUtilityBill);

export default router;
