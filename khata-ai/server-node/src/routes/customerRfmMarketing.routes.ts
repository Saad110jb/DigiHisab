import { Router } from 'express';
import {
  getRfmSummary,
  getCampaignTemplates,
  getCampaignPreviews,
  recordCampaignDispatch,
} from '../controllers/customerRfmMarketing.controller';
import { requireAuth, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getRfmSummary
);

router.get(
  '/templates',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getCampaignTemplates
);

router.get(
  '/previews',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  getCampaignPreviews
);

router.post(
  '/dispatch',
  authorizeRole('CASHIER', 'MANAGER', 'OWNER'),
  recordCampaignDispatch
);

export default router;
