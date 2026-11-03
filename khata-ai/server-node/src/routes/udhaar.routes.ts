import { Router } from 'express';
import { evaluateUdhaar, processUdhaarSale } from '../controllers/udhaar.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all udhaar endpoints with JWT authentication
router.use(requireAuth);

// 1. Evaluate Credit Risk with Jev Engine (Pre-flight calculation)
router.post('/evaluate', evaluateUdhaar);

// 2. Process Udhaar Sale with Jev Enforcement & Forensic Logging
router.post('/sale', processUdhaarSale);

export default router;
