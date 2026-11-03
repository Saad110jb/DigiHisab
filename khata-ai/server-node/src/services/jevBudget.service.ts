import { Types } from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';

export type BudgetState = 'WITHIN_LIMIT' | 'THRESHOLD_WARNING' | 'OVERBUDGET';

export interface JevBudgetGuidance {
  daily_safe_opex_limit: number; // Maximum safe daily operating expense ceiling in PKR
  today_spent_amount: number;    // Cumulative Dukan Kharcha logged today
  current_day_burn_rate: number; // Burn rate percentage (e.g. 0.86 or 86%)
  remaining_safe_budget: number; // Remaining allowance today before threshold breach
  budget_state: BudgetState;
  trailing_30d_net_margin: number;
  discretionary_expense_factor: number; // Default: 0.20 (20%)
  advisory_message_ur: string;
  advisory_message_en: string;
}

export class JevBudgetEngine {
  /**
   * Computes the dynamic daily safe operational budget ceiling from trailing net profit margin.
   * Daily Safe OPEX = (Trailing 30-Day Net Margin / 30) * 0.20
   */
  static async evaluateDailyBudget(
    profileId: string | Types.ObjectId
  ): Promise<JevBudgetGuidance> {
    const pId = new Types.ObjectId(profileId);

    // 1. Calculate trailing 30-day net margin
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const marginAgg = await LedgerEntry.aggregate([
      {
        $match: {
          profileId: pId,
          createdAt: { $gte: thirtyDaysAgo },
          isSettled: true,
        },
      },
      {
        $group: {
          _id: null,
          totalCashIn: {
            $sum: { $cond: [{ $eq: ['$entryType', 'CASH_IN'] }, '$amount', 0] },
          },
          totalWholesalePurchases: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$entryType', 'CASH_OUT'] },
                    { $regexMatch: { input: '$category', regex: /supplier|wholesale|purchase/i } },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const cashIn = marginAgg[0]?.totalCashIn || 0;
    const cogs = marginAgg[0]?.totalWholesalePurchases || 0;
    // Estimated gross profit margin (fallback to 12% retail margin if COGS not explicitly flagged)
    const trailingMargin = cashIn > 0 ? Math.max(cashIn - cogs, cashIn * 0.12) : 225000;

    // Daily safe OPEX calculation: 20% of daily gross margin, minimum Rs. 1,500/day
    const dailyMargin = trailingMargin / 30;
    const expenseFactor = 0.20;
    const rawSafeLimit = Math.round(dailyMargin * expenseFactor);
    const dailySafeLimit = Math.max(1500, rawSafeLimit);

    // 2. Calculate today's operational expenditures (from 00:00:00 today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOpexAgg = await LedgerEntry.aggregate([
      {
        $match: {
          profileId: pId,
          entryType: 'CASH_OUT',
          createdAt: { $gte: startOfToday },
          category: {
            $not: /supplier|wholesale|purchase|loan|kameti|payroll|tankha settlement/i,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSpentToday: { $sum: '$amount' },
        },
      },
    ]);

    const todaySpent = todayOpexAgg[0]?.totalSpentToday || 0;
    const burnRate = dailySafeLimit > 0 ? todaySpent / dailySafeLimit : 1.0;
    const remaining = Math.max(0, dailySafeLimit - todaySpent);

    let budgetState: BudgetState = 'WITHIN_LIMIT';
    let advisoryUr = '';
    let advisoryEn = '';

    if (burnRate > 1.0) {
      budgetState = 'OVERBUDGET';
      const overAmount = todaySpent - dailySafeLimit;
      advisoryUr = `⚠️ بجٹ حد ختم: روزانہ حد سے Rs. ${overAmount.toLocaleString()} اوپر خرچ ہو چکا ہے۔ صرف اشد ضروری ادائیگی ہی گلہ سے کی جائے۔`;
      advisoryEn = `Overbudget Alert: Daily OPEX exceeded safe margin limit by Rs. ${overAmount.toLocaleString()}. Discretionary spend frozen.`;
    } else if (burnRate >= 0.75) {
      budgetState = 'THRESHOLD_WARNING';
      const pct = Math.round(burnRate * 100);
      advisoryUr = `انتباہ: Rs. ${todaySpent.toLocaleString()} خرچ — بجٹ کا ${pct}% استعمال ہو چکا ہے۔ مزید متفرق اخراجات روکیں۔`;
      advisoryEn = `Threshold Warning: ${pct}% of daily safe budget spent. Monitor outgoing drawer cash closely.`;
    } else {
      budgetState = 'WITHIN_LIMIT';
      advisoryUr = `محفوظ حد: Rs. ${todaySpent.toLocaleString()} خرچ / حد: Rs. ${dailySafeLimit.toLocaleString()} (باقی: Rs. ${remaining.toLocaleString()})`;
      advisoryEn = `Within Safe Limit: Rs. ${todaySpent.toLocaleString()} spent out of Rs. ${dailySafeLimit.toLocaleString()} daily ceiling.`;
    }

    return {
      daily_safe_opex_limit: dailySafeLimit,
      today_spent_amount: todaySpent,
      current_day_burn_rate: parseFloat(burnRate.toFixed(2)),
      remaining_safe_budget: remaining,
      budget_state: budgetState,
      trailing_30d_net_margin: Math.round(trailingMargin),
      discretionary_expense_factor: expenseFactor,
      advisory_message_ur: advisoryUr,
      advisory_message_en: advisoryEn,
    };
  }
}
