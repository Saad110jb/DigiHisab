import { Request, Response } from 'express';
import { RationBudget } from '../models/RationBudget';

/**
 * 1. Create a New Ration Budget
 * POST /api/v1/ration-budget
 */
export const createRationBudget = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      monthKey,
      totalMonthlyAllocatedBudget,
      categoryLimits = [],
    } = req.body;

    if (!monthKey) {
      return res.status(400).json({ success: false, message: 'monthKey (e.g. "YYYY-MM") is required.' });
    }

    if (totalMonthlyAllocatedBudget === undefined || Number(totalMonthlyAllocatedBudget) < 0) {
      return res.status(400).json({ success: false, message: 'Valid totalMonthlyAllocatedBudget is required.' });
    }

    const existingBudget = await RationBudget.findOne({ profileId, monthKey: monthKey.trim() });
    if (existingBudget) {
      return res.status(409).json({
        success: false,
        message: `Ration budget for month '${monthKey.trim()}' already exists.`,
      });
    }

    let totalSpent = 0;
    const formattedCategories = categoryLimits.map((item: any) => {
      const spent = Number(item.spentAmount) || 0;
      totalSpent += spent;
      return {
        category: item.category ? item.category.trim() : 'General',
        allocatedAmount: Number(item.allocatedAmount) || 0,
        spentAmount: spent,
        unitTargetQuantity: item.unitTargetQuantity ? Number(item.unitTargetQuantity) : undefined,
        unitOfMeasure: item.unitOfMeasure ? item.unitOfMeasure.trim() : undefined,
      };
    });

    const allocated = Number(totalMonthlyAllocatedBudget);
    const isOverspent = totalSpent > allocated;

    const budget = await RationBudget.create({
      profileId,
      monthKey: monthKey.trim(),
      totalMonthlyAllocatedBudget: allocated,
      totalSpent,
      isOverspent,
      categoryLimits: formattedCategories,
    });

    return res.status(201).json({
      success: true,
      message: 'Ration budget created successfully.',
      data: budget,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Ration Budgets
 * GET /api/v1/ration-budget
 */
export const getRationBudgets = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { isOverspent, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (isOverspent !== undefined) {
      filter.isOverspent = isOverspent === 'true';
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [budgets, totalCount] = await Promise.all([
      RationBudget.find(filter).sort({ monthKey: -1 }).skip(skip).limit(limitNum),
      RationBudget.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: budgets,
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
 * 3. Get Ration Budget by Month Key
 * GET /api/v1/ration-budget/month/:monthKey
 */
export const getRationBudgetByMonth = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { monthKey } = req.params;

    const budget = await RationBudget.findOne({ profileId, monthKey });
    if (!budget) {
      return res.status(404).json({ success: false, message: `No ration budget found for month '${monthKey}'.` });
    }

    return res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Ration Budget & Category Allocations
 * PUT /api/v1/ration-budget/:id
 */
export const updateRationBudget = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { totalMonthlyAllocatedBudget, categoryLimits } = req.body;

    const budget = await RationBudget.findOne({ _id: id, profileId });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Ration budget not found.' });
    }

    if (totalMonthlyAllocatedBudget !== undefined) {
      budget.totalMonthlyAllocatedBudget = Number(totalMonthlyAllocatedBudget);
    }

    if (categoryLimits && Array.isArray(categoryLimits)) {
      let totalSpent = 0;
      budget.categoryLimits = categoryLimits.map((item: any) => {
        const spent = Number(item.spentAmount) || 0;
        totalSpent += spent;
        return {
          category: item.category ? item.category.trim() : 'General',
          allocatedAmount: Number(item.allocatedAmount) || 0,
          spentAmount: spent,
          unitTargetQuantity: item.unitTargetQuantity ? Number(item.unitTargetQuantity) : undefined,
          unitOfMeasure: item.unitOfMeasure ? item.unitOfMeasure.trim() : undefined,
        };
      });
      budget.totalSpent = totalSpent;
    }

    budget.isOverspent = budget.totalSpent > budget.totalMonthlyAllocatedBudget;
    await budget.save();

    return res.status(200).json({
      success: true,
      message: 'Ration budget updated successfully.',
      data: budget,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Log Ration Expense Against a Specific Category
 * POST /api/v1/ration-budget/:id/log-expense
 */
export const logRationExpense = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { category, amount } = req.body;

    if (!category || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: 'Valid category and amount are required.' });
    }

    const budget = await RationBudget.findOne({ _id: id, profileId });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Ration budget not found.' });
    }

    const expenseAmt = Number(amount);
    const categoryItem = budget.categoryLimits.find(
      (cat) => cat.category.toLowerCase() === category.trim().toLowerCase()
    );

    if (categoryItem) {
      categoryItem.spentAmount += expenseAmt;
    } else {
      budget.categoryLimits.push({
        category: category.trim(),
        allocatedAmount: 0,
        spentAmount: expenseAmt,
      });
    }

    budget.totalSpent += expenseAmt;
    budget.isOverspent = budget.totalSpent > budget.totalMonthlyAllocatedBudget;
    if (budget.isOverspent && !budget.alertSentAt) {
      budget.alertSentAt = new Date();
    }

    await budget.save();

    return res.status(200).json({
      success: true,
      message: `Expense of PKR ${expenseAmt} logged for ${category}.`,
      data: budget,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Delete Ration Budget
 * DELETE /api/v1/ration-budget/:id
 */
export const deleteRationBudget = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const budget = await RationBudget.findOneAndDelete({ _id: id, profileId });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Ration budget not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Ration budget deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
