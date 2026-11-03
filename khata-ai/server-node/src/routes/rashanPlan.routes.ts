import { Router } from 'express';
import { RashanPlanController } from '../controllers/rashanPlan.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Staples Catalog
router.get('/catalog', RashanPlanController.getCatalog);

// 1. Get or create current monthly rashan plan
router.get('/', RashanPlanController.getCurrentPlan);

// 1b. Update custom monthly target budget cap
router.patch('/:planId/budget-cap', RashanPlanController.updateBudgetCap);

// 2. Update item (rates, quantities, notes, etc.)
router.patch('/:planId/items/:itemId', RashanPlanController.updateItem);

// 3. Fast In-Store purchase toggle
router.post('/:planId/items/:itemId/purchase', RashanPlanController.togglePurchase);

// 4. Add custom item
router.post('/:planId/items', RashanPlanController.addItem);

// 5. Delete item
router.delete('/:planId/items/:itemId', RashanPlanController.removeItem);

// 6. Reset plan to default staples
router.post('/:planId/reset-defaults', RashanPlanController.resetDefaults);

// 7. Reconcile plan & post to ledger
router.post('/:planId/reconcile', RashanPlanController.reconcilePlan);

export default router;
