import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  exportStatementCsv,
  printStatementHtml,
} from '../controllers/financialReports.controller';

const router = Router();

router.use(requireAuth);

router.get('/trial-balance', getTrialBalance);
router.get('/profit-and-loss', getProfitAndLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/export/:type', exportStatementCsv);
router.get('/print/:type', printStatementHtml);

export default router;
