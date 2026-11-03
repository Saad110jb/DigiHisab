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
   * Evaluates today's operating expenses against the daily safe OPEX limit
   */
  static evaluateLocal(
    todaySpent: number,
    trailing30dMargin = 225000,
    expenseFactor = 0.20
  ): JevBudgetGuidance {
    const dailyMargin = trailing30dMargin / 30;
    const rawSafeLimit = Math.round(dailyMargin * expenseFactor);
    const dailySafeLimit = Math.max(1500, rawSafeLimit);

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
      trailing_30d_net_margin: Math.round(trailing30dMargin),
      discretionary_expense_factor: expenseFactor,
      advisory_message_ur: advisoryUr,
      advisory_message_en: advisoryEn,
    };
  }
}
