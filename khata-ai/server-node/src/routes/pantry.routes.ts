import { Router } from 'express';
import {
  getPantryStatus,
  addPantryItem,
  restockPantryItem,
  adjustPantryStock,
  deletePantryItem,
  updatePantryProfile,
} from '../controllers/pantry.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/status', getPantryStatus);
router.post('/item', addPantryItem);
router.patch('/item/:id/restock', restockPantryItem);
router.patch('/item/:id/adjust', adjustPantryStock);
router.delete('/item/:id', deletePantryItem);
router.post('/profile', updatePantryProfile);

export default router;
