import { Request, Response } from 'express';
import { FbrFinancialReportsService } from '../services/fbrFinancialReports.service';

/**
 * 1. GET /api/v1/financial-reports/trial-balance
 */
export const getTrialBalance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { asOfDate } = req.query;
    const targetDate = asOfDate ? new Date(asOfDate as string) : undefined;

    const report = await FbrFinancialReportsService.generateTrialBalance(profileId, targetDate);
    return res.status(200).json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. GET /api/v1/financial-reports/profit-and-loss
 */
export const getProfitAndLoss = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const report = await FbrFinancialReportsService.generateProfitAndLoss(profileId, start, end);
    return res.status(200).json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. GET /api/v1/financial-reports/balance-sheet
 */
export const getBalanceSheet = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { asOfDate } = req.query;
    const targetDate = asOfDate ? new Date(asOfDate as string) : undefined;

    const report = await FbrFinancialReportsService.generateBalanceSheet(profileId, targetDate);
    return res.status(200).json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. GET /api/v1/financial-reports/export/:type (csv)
 */
export const exportStatementCsv = async (req: Request, res: Response): Promise<any> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { type } = req.params;

    if (type === 'trial-balance') {
      const tb = await FbrFinancialReportsService.generateTrialBalance(profileId);
      const csv = FbrFinancialReportsService.exportTrialBalanceCsv(tb);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=trial_balance_${tb.asOfDate}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(400).json({ success: false, message: `Unsupported export statement type: ${type}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. GET /api/v1/financial-reports/print/:type (html)
 */
export const printStatementHtml = async (req: Request, res: Response): Promise<any> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { type } = req.params;

    if (type === 'trial-balance') {
      const tb = await FbrFinancialReportsService.generateTrialBalance(profileId);
      const tableRows = tb.accounts
        .map(
          (a) => `
        <tr>
          <td><strong>${a.code}</strong></td>
          <td>${a.titleEn} <br><small style="color:#6b7280">${a.titleUr}</small></td>
          <td>${a.category}</td>
          <td class="text-right">Rs. ${a.debit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">Rs. ${a.credit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
        </tr>`
        )
        .join('');

      const content = `
        <h3>Trial Balance / میزان المحاسبہ (As of ${tb.asOfDate})</h3>
        <table>
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Title</th>
              <th>Classification</th>
              <th class="text-right">Debit (PKR)</th>
              <th class="text-right">Credit (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="3">Grand Totals</td>
              <td class="text-right">Rs. ${tb.totalDebits.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">Rs. ${tb.totalCredits.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 15px; font-weight: bold; color: ${tb.isBalanced ? '#059669' : '#dc2626'}">
          ${tb.isBalanced ? '✓ LEDGER BALANCED: Debits and Credits are in absolute parity.' : '⚠️ DISCREPANCY DETECTED: Variance of Rs. ' + tb.discrepancy}
        </p>
      `;

      const fullHtml = FbrFinancialReportsService.generatePrintableHtml(
        `FBR Trial Balance - ${tb.businessName}`,
        content,
        tb.ntn
      );
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(fullHtml);
    }

    return res.status(400).json({ success: false, message: `Unsupported print statement type: ${type}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
