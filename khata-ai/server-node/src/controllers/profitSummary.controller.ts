import { Request, Response } from 'express';
import { ProfitSummary } from '../models/ProfitSummary';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Create or Update (Upsert) Profit Summary
 * POST /api/v1/profit-summary
 */
export const createOrUpdateProfitSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      periodType,
      periodKey,
      grossSales = 0,
      costOfGoodsSold = 0,
      operatingExpenses = 0,
      totalReceivablesCollected = 0,
      totalPayablesSettled = 0,
      marginLossEventsCount = 0,
    } = req.body;

    if (!periodType || !['DAILY', 'MONTHLY'].includes(periodType)) {
      return res.status(400).json({ success: false, message: 'Valid periodType (DAILY or MONTHLY) is required.' });
    }

    if (!periodKey || typeof periodKey !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid periodKey string is required.' });
    }

    const sales = Number(grossSales) || 0;
    const cogs = Number(costOfGoodsSold) || 0;
    const opex = Number(operatingExpenses) || 0;
    const grossProfit = sales - cogs;
    const netProfit = grossProfit - opex;

    const summary = await ProfitSummary.findOneAndUpdate(
      { profileId, periodType, periodKey: periodKey.trim() },
      {
        profileId,
        periodType,
        periodKey: periodKey.trim(),
        grossSales: sales,
        costOfGoodsSold: cogs,
        grossProfit,
        operatingExpenses: opex,
        netProfit,
        totalReceivablesCollected: Number(totalReceivablesCollected) || 0,
        totalPayablesSettled: Number(totalPayablesSettled) || 0,
        marginLossEventsCount: Number(marginLossEventsCount) || 0,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profit summary recorded successfully.',
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Profit Summaries
 * GET /api/v1/profit-summary
 */
export const getProfitSummaries = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { periodType, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (periodType && ['DAILY', 'MONTHLY'].includes(periodType as string)) {
      filter.periodType = periodType;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [summaries, totalCount] = await Promise.all([
      ProfitSummary.find(filter).sort({ periodKey: -1 }).skip(skip).limit(limitNum),
      ProfitSummary.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: summaries,
      pagination: {
        totalItems: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        pageSize: limitNum,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Get Single Profit Summary by Period Type and Key
 * GET /api/v1/profit-summary/period/:periodType/:periodKey
 */
export const getProfitSummaryByKey = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { periodType, periodKey } = req.params;

    const summary = await ProfitSummary.findOne({
      profileId,
      periodType: periodType.toUpperCase(),
      periodKey,
    });

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Profit summary not found for given period.' });
    }

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Recalculate Profit Summary from Ledger Entries
 * POST /api/v1/profit-summary/recalculate
 */
export const recalculateProfitSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { periodType, periodKey } = req.body;

    if (!periodType || !periodKey) {
      return res.status(400).json({ success: false, message: 'periodType and periodKey are required.' });
    }

    // Determine date range for given periodKey
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'DAILY') {
      startDate = new Date(`${periodKey}T00:00:00.000Z`);
      endDate = new Date(`${periodKey}T23:59:59.999Z`);
    } else {
      const [yearStr, monthStr] = periodKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      startDate = new Date(Date.UTC(year, month, 1));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    }

    const ledgerEntries = await LedgerEntry.find({
      profileId,
      entryDate: { $gte: startDate, $lte: endDate },
    });

    let grossSales = 0;
    let operatingExpenses = 0;
    let totalReceivablesCollected = 0;
    let totalPayablesSettled = 0;

    ledgerEntries.forEach((entry) => {
      if (entry.entryType === 'CASH_IN') {
        grossSales += entry.amount;
        totalReceivablesCollected += entry.amount;
      } else if (entry.entryType === 'CASH_OUT') {
        operatingExpenses += entry.amount;
        totalPayablesSettled += entry.amount;
      }
    });

    // Estimate COGS as ~65% of gross sales if not explicitly tracked
    const costOfGoodsSold = Math.round(grossSales * 0.65);
    const grossProfit = grossSales - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses;

    const summary = await ProfitSummary.findOneAndUpdate(
      { profileId, periodType, periodKey },
      {
        profileId,
        periodType,
        periodKey,
        grossSales,
        costOfGoodsSold,
        grossProfit,
        operatingExpenses,
        netProfit,
        totalReceivablesCollected,
        totalPayablesSettled,
        marginLossEventsCount: 0,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profit summary recalculated from ledger entries.',
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Delete Profit Summary
 * DELETE /api/v1/profit-summary/:id
 */
export const deleteProfitSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const summary = await ProfitSummary.findOneAndDelete({ _id: id, profileId });
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Profit summary not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profit summary deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
