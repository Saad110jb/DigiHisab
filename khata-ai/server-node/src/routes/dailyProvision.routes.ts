import { Router } from 'express';
import { DailyProvisionController } from '../controllers/dailyProvision.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// 1. Log Daily Provision (Milk & Roti Counter)
router.post('/log', DailyProvisionController.logDailyProvision);

// 2. Month-End Reconciliation & Kacha Parcha Matcher
router.get('/reconciliation', DailyProvisionController.getMonthReconciliation);

// 3. Settings & Base Rates
router.get('/settings', DailyProvisionController.getSettings);
router.patch('/settings', DailyProvisionController.updateSettings);

// 4. Single-Tap Toggle Chutti
router.patch('/toggle-chutti', DailyProvisionController.toggleChutti);

// 5. Monthly Advances
router.post('/advance', DailyProvisionController.recordAdvance);

// 6. Settle Month Bill (Hisab Saaf Karein)
router.post('/settle', DailyProvisionController.settleMonthlyBill);

export default router;
