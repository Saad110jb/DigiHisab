import { Router } from 'express';
import { processQuickSale } from '../controllers/counterSale.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Require JWT authentication for counter sales
router.use(requireAuth);

router.post('/quick-sale', authorizeRole('CASHIER', 'MANAGER', 'OWNER'), processQuickSale);

export default router;
