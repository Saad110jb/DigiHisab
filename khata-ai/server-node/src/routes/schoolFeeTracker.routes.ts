import { Router } from 'express';
import {
  getSchoolFees,
  getSchoolFeeAnalytics,
  createSchoolFee,
  markFeePaid,
  generateVanDriverReceipt,
  deleteSchoolFee,
} from '../controllers/schoolFeeTracker.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/analytics', getSchoolFeeAnalytics);
router.get('/:id/van-receipt', generateVanDriverReceipt);
router.patch('/:id/mark-paid', markFeePaid);

router.route('/')
  .get(getSchoolFees)
  .post(createSchoolFee);

router.route('/:id')
  .delete(deleteSchoolFee);

export default router;
