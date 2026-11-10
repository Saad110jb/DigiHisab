import { Router } from 'express';
import {
  register,
  loginWithPin,
  changePin,
  checkPhone,
  requestPinResetOtp,
  resetPinWithOtp,
  recordDeviceLocation,
  verifyStepUpAuth,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login-pin', loginWithPin);
router.post('/check-phone', checkPhone);
router.post('/forgot-pin/request-otp', requestPinResetOtp);
router.post('/forgot-pin/reset', resetPinWithOtp);
router.patch('/change-pin', requireAuth, changePin);

// Location Permission & Step-Up Auth
router.post('/location', requireAuth, recordDeviceLocation);
router.post('/step-up', requireAuth, verifyStepUpAuth);

export default router;
