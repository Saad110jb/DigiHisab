import { Router } from 'express';
import {
  getHouseholdTreasuryOverview,
  logIncomeRecord,
  createVaultAccount,
  adjustVaultBalance,
  createSavingsBucket,
  depositToSavingsBucket,
  transferBetweenVaults,
  getSolvencyReportOnly,
} from '../controllers/householdVault.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/overview', getHouseholdTreasuryOverview);
router.get('/solvency', getSolvencyReportOnly);

router.post('/income', logIncomeRecord);

router.post('/vault-accounts', createVaultAccount);
router.post('/vault-accounts/transfer', transferBetweenVaults);
router.patch('/vault-accounts/:id/adjust-balance', adjustVaultBalance);

router.post('/savings-buckets', createSavingsBucket);
router.post('/savings-buckets/:id/deposit', depositToSavingsBucket);

export default router;
