import { Router } from 'express';
import {
  createSettlementContract,
  getSettlementContracts,
  getSettlementContractById,
  updateSettlementStatus,
  deleteSettlementContract,
} from '../controllers/settlementContract.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.patch('/:id/status', updateSettlementStatus);

router.route('/')
  .post(createSettlementContract)
  .get(getSettlementContracts);

router.route('/:id')
  .get(getSettlementContractById)
  .delete(deleteSettlementContract);

export default router;
