import { Router } from 'express';
import {
  getZakatAssessment,
  syncWithLiveVaults,
  calculateZakat,
  disburseCharity,
  deleteDisbursement,
  getFitranaEstimate,
  generateCharityReceiptText,
} from '../controllers/zakat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getZakatAssessment);
router.post('/sync-vault', syncWithLiveVaults);
router.post('/calculate', calculateZakat);
router.post('/disburse', disburseCharity);
router.delete('/disburse/:id', deleteDisbursement);
router.get('/fitrana', getFitranaEstimate);
router.get('/share-text/:id', generateCharityReceiptText);

export default router;
