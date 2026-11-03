import { Router } from 'express';
import {
  recordOutflow,
  validateTransaction,
  getLiquidityRadar,
  getDailyOpexGuidance,
} from '../controllers/finance.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/liquidity-radar', authorizeRole('CASHIER', 'MANAGER', 'OWNER'), getLiquidityRadar);
router.get('/daily-opex-guidance', authorizeRole('CASHIER', 'MANAGER', 'OWNER'), getDailyOpexGuidance);
router.post('/validate-transaction', authorizeRole('CASHIER', 'MANAGER', 'OWNER'), validateTransaction);
router.post('/record-outflow', authorizeRole('CASHIER', 'MANAGER', 'OWNER'), recordOutflow);

export default router;
