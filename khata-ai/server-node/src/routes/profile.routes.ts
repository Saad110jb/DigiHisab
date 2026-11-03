import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateBusinessProfile,
  updatePaymentAccounts,
  updateManagerPin,
  upgradeSubscription,
  addSubAccount,
  updateSubAccount,
  updateSubAccountStatus,
  deleteSubAccount,
  verifyManagerPin,
  verifySubAccountPin,
} from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';

const router = Router();

// Public sub-account PIN verification endpoint
router.post('/sub-accounts/verify-pin', verifySubAccountPin);

// Protected routes (Requires valid JWT)
router.use(requireAuth);

router.get('/', getProfile);
router.put('/', authorizeRole('OWNER'), updateProfile);

// Business & Payment Details (Owner-Only)
router.put('/business', authorizeRole('OWNER'), updateBusinessProfile);
router.patch('/business', authorizeRole('OWNER'), updateBusinessProfile);
router.patch('/business-details', authorizeRole('OWNER'), updateBusinessProfile);
router.patch('/persona', authorizeRole('OWNER'), updateBusinessProfile);
router.patch('/payment-accounts', authorizeRole('OWNER'), updatePaymentAccounts);
router.put('/payment-accounts', authorizeRole('OWNER'), updatePaymentAccounts);
router.patch('/manager-pin', authorizeRole('OWNER', 'MANAGER'), updateManagerPin);
router.post('/manager-pin', authorizeRole('OWNER', 'MANAGER'), updateManagerPin);

router.post('/subscription/upgrade', authorizeRole('OWNER'), upgradeSubscription);
router.post('/verify-override-pin', verifyManagerPin);

// Sub-account management (Owner-Only)
router.post('/sub-accounts', authorizeRole('OWNER'), addSubAccount);
router.put('/sub-accounts/:subAccountId', authorizeRole('OWNER'), updateSubAccount);
router.patch('/sub-accounts/:subAccountId/status', authorizeRole('OWNER'), updateSubAccountStatus);
router.delete('/sub-accounts/:subAccountId', authorizeRole('OWNER'), deleteSubAccount);

export default router;

