import { Router } from 'express';
import {
  bulkDeleteCustomers,
  deleteCustomerById,
  getCounterparties,
  createCounterparty,
} from '../controllers/counterparty.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRole } from '../middleware/rbac.middleware';

const router = Router();

// Protect with authentication
router.use(requireAuth);

/**
 * Customers Khata Governance APIs
 * /api/v1/khata/customers
 */
router.delete('/bulk-delete', authorizeRole('MANAGER', 'OWNER'), bulkDeleteCustomers);
router.delete('/:id', authorizeRole('MANAGER', 'OWNER'), deleteCustomerById);
router.get('/', (req, res, next) => {
  req.query.relationType = 'CUSTOMER';
  return getCounterparties(req, res);
});
router.post('/', (req, res, next) => {
  req.body.relationType = 'CUSTOMER';
  return createCounterparty(req, res);
});

export default router;
