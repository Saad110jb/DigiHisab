import { Router } from 'express';
import {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  adjustStockLevel,
  getLowStockAlerts,
  deleteInventoryItem,
  getRestockPredictions,
  dispatchStockoutAlerts,
} from '../controllers/inventory.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect all inventory routes with JWT authentication
router.use(requireAuth);

router.get('/restock-predictions', requireRole('CASHIER', 'MANAGER', 'OWNER'), getRestockPredictions);
router.post('/dispatch-stockout-alerts', requireRole('MANAGER', 'OWNER'), dispatchStockoutAlerts);
router.get('/low-stock-alerts', requireRole('MANAGER', 'OWNER'), getLowStockAlerts);
router.patch('/:id/adjust-stock', requireRole('MANAGER', 'OWNER'), adjustStockLevel);

router.route('/')
  .post(requireRole('MANAGER', 'OWNER'), createInventoryItem)
  .get(requireRole('CASHIER', 'MANAGER', 'OWNER'), getInventoryItems);

router.route('/:id')
  .get(requireRole('CASHIER', 'MANAGER', 'OWNER'), getInventoryItemById)
  .put(requireRole('MANAGER', 'OWNER'), updateInventoryItem)
  .delete(requireRole('MANAGER', 'OWNER'), deleteInventoryItem);

export default router;
