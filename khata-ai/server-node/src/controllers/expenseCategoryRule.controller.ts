import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ExpenseCategoryRule } from '../models/ExpenseCategoryRule';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Create a New Category Rule
 * POST /api/v1/category-rules
 */
export const createCategoryRule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      categoryName,
      keywords = [],
      personaTarget = 'BOTH',
      autoTagAnomaly = false,
      budgetCapMonthly,
    } = req.body;

    if (!categoryName) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const validPersonaTargets = ['HOUSEHOLD', 'VENDOR', 'BOTH'];
    if (!validPersonaTargets.includes(personaTarget)) {
      return res.status(400).json({
        success: false,
        message: `Invalid personaTarget. Allowed values: ${validPersonaTargets.join(', ')}`,
      });
    }

    const existing = await ExpenseCategoryRule.findOne({ profileId, categoryName: categoryName.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category rule with this name already exists in your account.',
      });
    }

    const sanitizedKeywords = Array.isArray(keywords)
      ? Array.from(new Set(keywords.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean)))
      : [];

    const rule = await ExpenseCategoryRule.create({
      profileId,
      categoryName: categoryName.trim(),
      keywords: sanitizedKeywords,
      personaTarget,
      autoTagAnomaly: Boolean(autoTagAnomaly),
      budgetCapMonthly: budgetCapMonthly !== undefined ? Number(budgetCapMonthly) : undefined,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Category rule created successfully.',
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Category Rules with Filters
 * GET /api/v1/category-rules
 */
export const getCategoryRules = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { personaTarget, isActive, search, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (personaTarget && typeof personaTarget === 'string') {
      filter.personaTarget = personaTarget.toUpperCase();
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ categoryName: searchRegex }, { keywords: searchRegex }];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [rules, totalCount] = await Promise.all([
      ExpenseCategoryRule.find(filter).sort({ categoryName: 1 }).skip(skip).limit(limitNum),
      ExpenseCategoryRule.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: rules,
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
 * 3. Get Single Category Rule Details by ID
 * GET /api/v1/category-rules/:id
 */
export const getCategoryRuleById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    return res.status(200).json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Category Rule Specifications
 * PUT /api/v1/category-rules/:id
 */
export const updateCategoryRule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { categoryName, personaTarget, autoTagAnomaly, budgetCapMonthly, isActive } = req.body;

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    if (categoryName) rule.categoryName = categoryName.trim();
    if (personaTarget) {
      const validTargets = ['HOUSEHOLD', 'VENDOR', 'BOTH'];
      if (validTargets.includes(personaTarget)) rule.personaTarget = personaTarget;
    }
    if (autoTagAnomaly !== undefined) rule.autoTagAnomaly = Boolean(autoTagAnomaly);
    if (budgetCapMonthly !== undefined) rule.budgetCapMonthly = budgetCapMonthly ? Number(budgetCapMonthly) : undefined;
    if (isActive !== undefined) rule.isActive = Boolean(isActive);

    await rule.save();

    return res.status(200).json({
      success: true,
      message: 'Category rule updated successfully.',
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Append New Keywords to Existing Rule
 * POST /api/v1/category-rules/:id/keywords
 */
export const addKeywordsToRule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { keywords } = req.body;

    if (!keywords || (!Array.isArray(keywords) && typeof keywords !== 'string')) {
      return res.status(400).json({ success: false, message: 'Keywords array or string is required.' });
    }

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    const newKeywordsList = Array.isArray(keywords) ? keywords : [keywords];
    const sanitized = newKeywordsList.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean);

    const existingSet = new Set(rule.keywords);
    sanitized.forEach((k) => existingSet.add(k));

    rule.keywords = Array.from(existingSet);
    await rule.save();

    return res.status(200).json({
      success: true,
      message: 'Keywords added successfully.',
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Remove Keyword from Category Rule
 * DELETE /api/v1/category-rules/:id/keywords
 */
export const removeKeywordFromRule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ success: false, message: 'Keyword to remove is required.' });
    }

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    const targetKeyword = String(keyword).trim().toLowerCase();
    rule.keywords = rule.keywords.filter((k) => k !== targetKeyword);

    await rule.save();

    return res.status(200).json({
      success: true,
      message: `Keyword '${targetKeyword}' removed successfully.`,
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Toggle Rule Active / Paused Status
 * PATCH /api/v1/category-rules/:id/toggle-active
 */
export const toggleRuleActiveStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { isActive } = req.body;

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    if (typeof isActive === 'boolean') {
      rule.isActive = isActive;
    } else {
      rule.isActive = !rule.isActive;
    }

    await rule.save();

    return res.status(200).json({
      success: true,
      message: `Category rule ${rule.isActive ? 'activated' : 'paused'}.`,
      data: rule,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Delete Category Rule Record
 * DELETE /api/v1/category-rules/:id
 */
export const deleteCategoryRule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const rule = await ExpenseCategoryRule.findOne({ _id: id, profileId });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Category rule not found.' });
    }

    await rule.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category rule deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Utility: Tokenize & Match Category from Raw Voice/Text Transcript
 * POST /api/v1/category-rules/match-text
 */
export const matchCategoryFromText = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { rawText } = req.body;

    if (!rawText) {
      return res.status(400).json({ success: false, message: 'rawText input string is required.' });
    }

    const rules = await ExpenseCategoryRule.find({ profileId, isActive: true });
    const normalizedText = String(rawText).toLowerCase();
    const tokens = normalizedText.split(/[\s,._\-]+/);

    let bestMatchRule: any = null;
    let highestMatchScore = 0;

    rules.forEach((rule) => {
      let score = 0;
      rule.keywords.forEach((kw) => {
        if (tokens.includes(kw) || normalizedText.includes(kw)) {
          score += 1;
        }
      });

      if (score > highestMatchScore) {
        highestMatchScore = score;
        bestMatchRule = rule;
      }
    });

    if (bestMatchRule && highestMatchScore > 0) {
      return res.status(200).json({
        success: true,
        matched: true,
        categoryName: bestMatchRule.categoryName,
        confidenceScore: Math.min(1.0, highestMatchScore / 2),
        autoTagAnomaly: bestMatchRule.autoTagAnomaly,
        matchedRuleId: bestMatchRule._id,
      });
    }

    return res.status(200).json({
      success: true,
      matched: false,
      categoryName: 'General',
      confidenceScore: 0.0,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. Get Monthly Budget Cap & Overspend Consumption Status
 * GET /api/v1/category-rules/budget-status
 */
export const getCategoryBudgetStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;

    // Start & end of current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    const [rules, monthExpenses] = await Promise.all([
      ExpenseCategoryRule.find({ profileId, budgetCapMonthly: { $gt: 0 } }),
      LedgerEntry.aggregate([
        {
          $match: {
            profileId: new Types.ObjectId(profileId),
            entryType: 'CASH_OUT',
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            totalSpent: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const expenseMap = new Map<string, number>();
    monthExpenses.forEach((item) => expenseMap.set(item._id?.toLowerCase(), item.totalSpent));

    const statusReport = rules.map((r) => {
      const spent = expenseMap.get(r.categoryName.toLowerCase()) || 0;
      const budgetCap = r.budgetCapMonthly || 0;
      const percentUsed = budgetCap > 0 ? Math.round((spent / budgetCap) * 100) : 0;
      const isOverspent = budgetCap > 0 && spent > budgetCap;

      return {
        ruleId: r._id,
        categoryName: r.categoryName,
        budgetCapMonthly: budgetCap,
        currentMonthSpent: spent,
        percentUsed,
        isOverspent,
      };
    });

    return res.status(200).json({
      success: true,
      data: statusReport,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
