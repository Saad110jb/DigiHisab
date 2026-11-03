import { Router } from 'express';
import {
  createEntry,
  settleEntry,
  sendReceiptSms,
  getEntries,
  getLedgerSummary,
  generateLedgerPdfStatement,
  getEntryById,
  deleteEntry,
} from '../controllers/ledger.controller';
import { generateCashflowPdf } from '../controllers/ledgerPdf.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all ledger endpoints with JWT authentication
router.use(requireAuth);

router.post('/', createEntry);
router.get('/', getEntries);
router.get('/summary', getLedgerSummary);
router.get('/cashflow-pdf', generateCashflowPdf);
router.post('/statement-pdf', generateLedgerPdfStatement);
router.post('/send-receipt-sms', sendReceiptSms);
router.get('/:id', getEntryById);
router.post('/:id/settle', settleEntry);
router.delete('/:id', deleteEntry);

export default router;

