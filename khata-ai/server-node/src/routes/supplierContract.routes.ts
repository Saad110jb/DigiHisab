import { Router } from 'express';
import {
  createSupplierContract,
  getSupplierContracts,
  getSupplierContractById,
  updateSupplierContract,
  deleteSupplierContract,
  createSupplierBillFromPo,
} from '../controllers/supplierContract.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/bills/create-from-po', createSupplierBillFromPo);

router.route('/')
  .post(createSupplierContract)
  .get(getSupplierContracts);

router.route('/:id')
  .get(getSupplierContractById)
  .put(updateSupplierContract)
  .delete(deleteSupplierContract);

export default router;
