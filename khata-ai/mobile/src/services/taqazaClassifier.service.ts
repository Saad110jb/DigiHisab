export type TaqazaTone = 'POLITE' | 'FIRM' | 'FINAL_NOTICE';
export type TaqazaChannel = 'WHATSAPP' | 'DIRECT_CALL' | 'IN_PERSON';

export interface ICustomerLedgerStats {
  customerName?: string;
  currentBalance: number;
  creditLimit?: number;
  daysPastDue: number; // Days beyond promised term (Wada: Mamool)
  historicalRepaymentRatio?: number; // 0.0 to 1.0 (default 0.85)
  priorRemindersSentCount?: number;
  defaultProbability?: number; // 0.0 to 1.0
  relationshipTenureMonths?: number;
  address?: string;
  phone?: string;
}

export interface IPaymentAccountSummary {
  jazzCash?: string;
  easypaisa?: string;
  raast?: string;
  accountTitle?: string;
}

export interface JevTaqazaPolicy {
  recommended_tone: TaqazaTone;
  expected_recovery_rate: number; // Calibrated probability (0.0 to 1.0) of collecting within 72 hours
  recommended_channel: TaqazaChannel;
  prefilledUrduMessage: string;
  reasonEn: string;
  reasonUr: string;
  escalationLevel: 1 | 2 | 3;
}

export class TaqazaPolicyClassifier {
  /**
   * Deterministically evaluates the 5 behavioral ledger signals:
   * 1. Days Past Due (Δt_due)
   * 2. Repayment Consistency Index (R_score)
   * 3. Relationship Tenure & LTV
   * 4. Current Exposure Ratio (Balance / Credit Limit)
   * 5. Prior Reminder Lag & Sent Count
   */
  static evaluate(
    customer: ICustomerLedgerStats,
    storeName = 'ڈیجی حساب اسٹور',
    paymentDetails?: IPaymentAccountSummary
  ): JevTaqazaPolicy {
    const {
      customerName = 'گاہک',
      currentBalance,
      creditLimit = 15000,
      daysPastDue,
      historicalRepaymentRatio = 0.85,
      priorRemindersSentCount = 0,
      defaultProbability = 0.15,
      relationshipTenureMonths = 6,
    } = customer;

    const exposureRatio = creditLimit > 0 ? currentBalance / creditLimit : 1.0;
    const formattedAmount = currentBalance.toLocaleString();

    // Build payment string
    const payLines: string[] = [];
    if (paymentDetails?.jazzCash) {
      payLines.push(`JazzCash: ${paymentDetails.jazzCash} (${paymentDetails.accountTitle || storeName})`);
    }
    if (paymentDetails?.easypaisa) {
      payLines.push(`Easypaisa: ${paymentDetails.easypaisa} (${paymentDetails.accountTitle || storeName})`);
    }
    if (paymentDetails?.raast) {
      payLines.push(`Raast ID: ${paymentDetails.raast}`);
    }
    const payDetailsBlock = payLines.length > 0 ? `\n\nکھاتہ تفصیل برائے ادائیگی:\n${payLines.join('\n')}` : '';

    // RULE 3: FINAL NOTICE
    // Over 21 days overdue OR default prob > 0.75 OR 3+ reminders unacknowledged OR 14+ days with high exposure
    if (
      daysPastDue > 21 ||
      defaultProbability > 0.75 ||
      priorRemindersSentCount >= 3 ||
      (daysPastDue > 14 && exposureRatio >= 0.90)
    ) {
      const channel: TaqazaChannel =
        priorRemindersSentCount >= 4 || defaultProbability > 0.80 ? 'IN_PERSON' : 'DIRECT_CALL';
      const recoveryRate = Math.max(0.15, Math.min(0.35, 0.45 - daysPastDue * 0.01));

      return {
        recommended_tone: 'FINAL_NOTICE',
        expected_recovery_rate: parseFloat(recoveryRate.toFixed(2)),
        recommended_channel: channel,
        escalationLevel: 3,
        reasonEn: `Overdue by ${daysPastDue} days with ${priorRemindersSentCount} previous reminders. Credit locked; direct recovery required.`,
        reasonUr: `وعدے سے ${daysPastDue} دن زائد اور ${priorRemindersSentCount} یاد دہانیاں بھیجی جا چکی ہیں۔ کھاتہ بلاک اور سخت نوٹس لاگو ہے۔`,
        prefilledUrduMessage: `حتمی نوٹس: محترم ${customerName} صاحب! بارہا یاد دہانی کے باوجود آپ کا واجب الادا بیلنس Rs. ${formattedAmount} طویل عرصے سے زیر التواء ہے۔ برائے مہربانی فوری رابطہ کر کے حساب کلیئر کریں وگرنہ کھاتہ مستقل طور پر بند کر دیا جائے گا۔ (${storeName})${payDetailsBlock}`,
      };
    }

    // RULE 2: FIRM
    // Overdue between 4 and 14 days OR 1-2 reminders sent OR exposure > 80% (unless highly loyal tenure > 12m)
    const isLoyalCustomer = relationshipTenureMonths >= 12 && historicalRepaymentRatio >= 0.85;
    const firmTrigger =
      daysPastDue > 3 ||
      priorRemindersSentCount >= 1 ||
      (exposureRatio > 0.80 && !isLoyalCustomer);

    if (firmTrigger) {
      const channel: TaqazaChannel =
        priorRemindersSentCount >= 1 ? 'DIRECT_CALL' : 'WHATSAPP';
      const recoveryRate = Math.max(0.50, Math.min(0.72, 0.75 - daysPastDue * 0.015));

      return {
        recommended_tone: 'FIRM',
        expected_recovery_rate: parseFloat(recoveryRate.toFixed(2)),
        recommended_channel: channel,
        escalationLevel: 2,
        reasonEn: `Payment past due by ${daysPastDue} days. Clear communication required to preserve store cash flow.`,
        reasonUr: `ادائیگی کی تاریخ سے ${daysPastDue} دن گزر چکے ہیں۔ کھاتہ بلاک ہونے سے بچانے کے لیے واضح تقاضا ضروری ہے۔`,
        prefilledUrduMessage: `محترم ${customerName} صاحب! آپ کے وعدے کی تاریخ گزر چکی ہے۔ دکان کا حساب برابر رکھنے اور کھاتہ فعال رکھنے کے لیے بقایا ادھار Rs. ${formattedAmount} فوری ادا فرمائیں۔ شکریہ! (${storeName})${payDetailsBlock}`,
      };
    }

    // RULE 1: POLITE (DEFAULT)
    // Within 3 days of due date or strong repayment history
    return {
      recommended_tone: 'POLITE',
      expected_recovery_rate: 0.88,
      recommended_channel: 'WHATSAPP',
      escalationLevel: 1,
      reasonEn: `Account in good standing (Overdue: ${daysPastDue}d, Repayment: ${(historicalRepaymentRatio * 100).toFixed(0)}%). Relationship-first reminder.`,
      reasonUr: `گاہک کا ریکارڈ محفوظ ہے (تاخیر صرف ${daysPastDue} دن)۔ تعلقات قائم رکھتے ہوئے شائستہ یاد دہانی۔`,
      prefilledUrduMessage: `محترم ${customerName} صاحب! آپ کے کھاتے کا بقایا Rs. ${formattedAmount} ہے۔ سہولت کے مطابق ادائیگی کر دیں تاکہ لین دین کا اعتماد برقرار رہے۔ شکریہ! (${storeName})${payDetailsBlock}`,
    };
  }
}
