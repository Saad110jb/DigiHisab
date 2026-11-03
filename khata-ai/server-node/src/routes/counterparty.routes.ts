import { Router } from 'express';
import {
  createCounterparty,
  getCounterparties,
  getCounterpartyById,
  updateCounterparty,
  updateCreditLimit,
  toggleCreditBlock,
  updateRiskMetrics,
  generateSettlementOffer,
  deleteCounterparty,
  paySupplier,
  recordCustomerWasooli,
  getSupplierDueReminders,
  recalculateCounterpartyRisk,
  getDebtAgingRadar,
  getCounterpartyTaqazaPolicy,
} from '../controllers/counterparty.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';

const router = Router();

// Protect all counterparty endpoints with JWT authentication
router.use(requireAuth);

router.post('/', createCounterparty);
router.get('/', getCounterparties);
router.post('/wasooli', recordCustomerWasooli);
router.post('/:id/wasooli', recordCustomerWasooli);
router.get('/supplier-due-reminders', authorizeRole('MANAGER', 'OWNER'), getSupplierDueReminders);
router.get('/debt-aging-radar', getDebtAgingRadar);
router.get('/:id/taqaza-policy', getCounterpartyTaqazaPolicy);
router.get('/:id', getCounterpartyById);
router.put('/:id', authorizeRole('MANAGER', 'OWNER'), updateCounterparty);
router.post('/:id/pay', authorizeRole('MANAGER', 'OWNER'), paySupplier);
router.post('/:id/recalculate-risk', authorizeRole('MANAGER', 'OWNER'), recalculateCounterpartyRisk);
router.patch('/:id/credit-limit', authorizeRole('MANAGER', 'OWNER'), updateCreditLimit);
router.patch('/:id/toggle-block', authorizeRole('MANAGER', 'OWNER'), toggleCreditBlock);
router.patch('/:id/risk-metrics', authorizeRole('MANAGER', 'OWNER'), updateRiskMetrics);
router.post('/:id/settlement-offer', authorizeRole('MANAGER', 'OWNER'), generateSettlementOffer);
router.delete('/:id', authorizeRole('MANAGER', 'OWNER'), deleteCounterparty);

export default router;
