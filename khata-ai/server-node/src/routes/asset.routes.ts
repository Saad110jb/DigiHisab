import { Router } from 'express';
import {
  createHouseholdAsset,
  getHouseholdAssets,
  getHouseholdAssetById,
  updateHouseholdAsset,
  deleteHouseholdAsset,
  getExpiringWarranties,
  getAssetSummaryStats,
} from '../controllers/asset.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all asset endpoints with JWT authentication
router.use(requireAuth);

router.get('/expiring-warranties', getExpiringWarranties);
router.get('/stats', getAssetSummaryStats);

router.route('/')
  .post(createHouseholdAsset)
  .get(getHouseholdAssets);

router.route('/:id')
  .get(getHouseholdAssetById)
  .put(updateHouseholdAsset)
  .delete(deleteHouseholdAsset);

export default router;
