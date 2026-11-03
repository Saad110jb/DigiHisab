import { Router } from 'express';
import {
  createStockMovement,
  getStockMovements,
  getStockMovementById,
} from '../controllers/stockMovement.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.route('/')
  .post(createStockMovement)
  .get(getStockMovements);

router.route('/:id')
  .get(getStockMovementById);

export default router;
