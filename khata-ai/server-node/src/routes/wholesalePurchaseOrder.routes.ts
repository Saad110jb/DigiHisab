import { Router } from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} from '../controllers/wholesalePurchaseOrder.controller';
import { createSupplierBillFromPo } from '../controllers/supplierContract.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('MANAGER', 'OWNER'));

router.post('/bills/create-from-po', createSupplierBillFromPo);
router.patch('/:id/receive', receivePurchaseOrder);

router.route('/')
  .post(createPurchaseOrder)
  .get(getPurchaseOrders);

router.route('/:id')
  .get(getPurchaseOrderById)
  .put(updatePurchaseOrder)
  .delete(deletePurchaseOrder);

export default router;
