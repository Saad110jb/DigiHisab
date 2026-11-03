/**
 * Jev Double-Entry & Balance Validation Engine
 * 
 * Provides deterministic mathematical verification of double-entry ledger transactions:
 * 1. ∑ Debits - ∑ Credits === 0 (Enforces zero discrepancy across asset, liability, revenue, expense accounts)
 * 2. Channel Solvency Gatekeeper: Available Channel Balance >= Outflow (Eliminates ghost negative cash drawer balances)
 * 3. Voucher Classification: Generates standard accounting voucher types (CPV, CRV, BPV, BRV, PV, SV, JV)
 */

export type TargetVoucherType = 'CPV' | 'CRV' | 'BPV' | 'BRV' | 'PV' | 'SV' | 'JV';
export type JevRiskLevel = 'SAFE' | 'WARN' | 'CRITICAL_HALT';
export type ChannelKey = 'cashDrawer' | 'bankAccount' | 'digitalWallet' | 'none';

export interface IDoubleEntryLine {
  code: string;
  title: string;
  debit: number;
  credit: number;
}

export interface JevLedgerValidation {
  is_balanced: boolean;
  discrepancy_amount: number;
  channel_solvency_confidence: number; // 0.0 to 1.0
  target_voucher_type: TargetVoucherType;
  risk_level: JevRiskLevel;
  validation_details: {
    total_debits: number;
    total_credits: number;
    channel_inspected: ChannelKey;
    available_channel_balance: number;
    requested_outflow: number;
    shortage_amount: number;
    advance_offset_applied?: number;
    accounts_affected: IDoubleEntryLine[];
  };
  messages: {
    en: string;
    ur: string;
  };
  resolution_suggestions?: string[];
}

export interface JevTransactionInput {
  transactionType:
    | 'SUPPLIER_BILL'
    | 'EXPENSE_OUTFLOW'
    | 'SUPPLIER_PAYMENT'
    | 'CUSTOMER_CREDIT_SALE'
    | 'CUSTOMER_WASOOLI'
    | 'QUICK_CASH_SALE'
    | 'MANUAL_JOURNAL';
  grossAmount: number;
  advanceOffset?: number;
  immediatePaymentAmount?: number;
  paymentMode?: string; // 'CASH' | 'BANK' | 'WALLET' | 'CREDIT' | etc.
  availableChannels?: {
    cashDrawer: number;
    bankAccount: number;
    digitalWallet: number;
  };
  customLines?: IDoubleEntryLine[];
}

/**
 * Normalizes payment mode to one of the 3 liquid asset channels
 */
export const normalizePaymentChannel = (paymentMode?: string): ChannelKey => {
  if (!paymentMode) return 'none';
  const mode = paymentMode.toUpperCase();
  if (mode === 'CREDIT' || mode === 'NONE' || mode === 'UNPAID') return 'none';
  if (mode.includes('BANK') || mode.includes('RAAST') || mode.includes('CHEQUE')) return 'bankAccount';
  if (mode.includes('WALLET') || mode.includes('JAZZ') || mode.includes('EASY')) return 'digitalWallet';
  if (mode.includes('CASH')) return 'cashDrawer';
  return 'cashDrawer';
};

/**
 * Compiles double-entry ledger lines, tests the fundamental invariant (∑ Debits === ∑ Credits),
 * inspects channel solvency, and assigns voucher classification.
 */
export const compileAndValidateDoubleEntry = (input: JevTransactionInput): JevLedgerValidation => {
  const {
    transactionType,
    grossAmount,
    advanceOffset = 0,
    immediatePaymentAmount = 0,
    paymentMode = 'CASH',
    availableChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 },
    customLines,
  } = input;

  const lines: IDoubleEntryLine[] = [];
  let voucherType: TargetVoucherType = 'JV';
  let channelInspected: ChannelKey = 'none';
  let requestedOutflow = 0;

  const cleanGross = Math.max(0, Number(grossAmount) || 0);
  const cleanAdvance = Math.max(0, Math.min(Number(advanceOffset) || 0, cleanGross));
  const cleanImmediatePay = Math.max(0, Number(immediatePaymentAmount) || 0);

  switch (transactionType) {
    case 'SUPPLIER_BILL': {
      voucherType = 'PV';
      // 1. Inventory Asset (Debit)
      lines.push({
        code: '1050-INVENTORY-ASSET',
        title: 'Inventory Stock / Mal-e-Tejarat (مال تجارت)',
        debit: cleanGross,
        credit: 0,
      });

      // 2. Advance Peshgi (Credit, if applied)
      if (cleanAdvance > 0) {
        lines.push({
          code: '2050-SUPPLIER-ADVANCE-ASSET',
          title: 'Advance to Supplier (سپلائر پیشگی)',
          debit: 0,
          credit: cleanAdvance,
        });
      }

      // 3. Immediate Outflow (Credit, if cash/bank paid upon delivery)
      const actualOutflow = Math.min(cleanImmediatePay, cleanGross - cleanAdvance);
      if (actualOutflow > 0) {
        const channel = normalizePaymentChannel(paymentMode);
        channelInspected = channel;
        requestedOutflow = actualOutflow;

        const channelTitle =
          channel === 'cashDrawer'
            ? 'Cash Drawer / Dukan Galla (دکان گلہ)'
            : channel === 'bankAccount'
            ? 'Bank Account / Raast (بینک اکاؤنٹ)'
            : 'Digital Wallet / JazzCash (ڈیجیٹل والٹ)';

        const channelCode =
          channel === 'cashDrawer' ? '1010-CASH-DRAWER' : channel === 'bankAccount' ? '1030-BANK-ACCOUNT' : '1040-DIGITAL-WALLET';

        lines.push({
          code: channelCode,
          title: channelTitle,
          debit: 0,
          credit: actualOutflow,
        });
      }

      // 4. Remaining unpaid balance -> Accounts Payable (Credit)
      const remainingPayable = cleanGross - cleanAdvance - actualOutflow;
      if (remainingPayable > 0) {
        lines.push({
          code: '2010-ACCOUNTS-PAYABLE',
          title: 'Supplier Payable / Maine Dene Hain (سپلائر واجبات)',
          debit: 0,
          credit: remainingPayable,
        });
      }
      break;
    }

    case 'EXPENSE_OUTFLOW': {
      const channel = normalizePaymentChannel(paymentMode);
      channelInspected = channel;
      requestedOutflow = cleanGross;
      voucherType = channel === 'cashDrawer' ? 'CPV' : 'BPV';

      // 1. Operating Expense (Debit)
      lines.push({
        code: '5010-OPERATING-EXPENSES',
        title: 'Daily Dukan Expense (دکان کا خرچہ)',
        debit: cleanGross,
        credit: 0,
      });

      // 2. Liquid Channel (Credit)
      const channelTitle =
        channel === 'cashDrawer'
          ? 'Cash Drawer / Dukan Galla (دکان گلہ)'
          : channel === 'bankAccount'
          ? 'Bank Account / Raast (بینک اکاؤنٹ)'
          : 'Digital Wallet / JazzCash (ڈیجیٹل والٹ)';

      const channelCode =
        channel === 'cashDrawer' ? '1010-CASH-DRAWER' : channel === 'bankAccount' ? '1030-BANK-ACCOUNT' : '1040-DIGITAL-WALLET';

      lines.push({
        code: channelCode,
        title: channelTitle,
        debit: 0,
        credit: cleanGross,
      });
      break;
    }

    case 'SUPPLIER_PAYMENT': {
      const channel = normalizePaymentChannel(paymentMode);
      channelInspected = channel;
      requestedOutflow = cleanGross;
      voucherType = channel === 'cashDrawer' ? 'CPV' : 'BPV';

      // 1. Accounts Payable Settled (Debit)
      lines.push({
        code: '2010-ACCOUNTS-PAYABLE',
        title: 'Supplier Debt Settled / Maine Dene (سپلائر ادائیگی)',
        debit: cleanGross,
        credit: 0,
      });

      // 2. Liquid Channel (Credit)
      const channelTitle =
        channel === 'cashDrawer'
          ? 'Cash Drawer / Dukan Galla (دکان گلہ)'
          : channel === 'bankAccount'
          ? 'Bank Account / Raast (بینک اکاؤنٹ)'
          : 'Digital Wallet / JazzCash (ڈیجیٹل والٹ)';

      const channelCode =
        channel === 'cashDrawer' ? '1010-CASH-DRAWER' : channel === 'bankAccount' ? '1030-BANK-ACCOUNT' : '1040-DIGITAL-WALLET';

      lines.push({
        code: channelCode,
        title: channelTitle,
        debit: 0,
        credit: cleanGross,
      });
      break;
    }

    case 'CUSTOMER_CREDIT_SALE': {
      voucherType = 'SV';
      // 1. Accounts Receivable (Debit)
      lines.push({
        code: '1020-ACCOUNTS-RECEIVABLE',
        title: 'Customer Receivable / Maine Lene Hain (گاہک ادھار)',
        debit: cleanGross,
        credit: 0,
      });

      // 2. Sales Revenue (Credit)
      lines.push({
        code: '4010-SALES-REVENUE',
        title: 'Sales Revenue (فروخت آمدن)',
        debit: 0,
        credit: cleanGross,
      });
      break;
    }

    case 'CUSTOMER_WASOOLI': {
      const channel = normalizePaymentChannel(paymentMode);
      voucherType = channel === 'cashDrawer' ? 'CRV' : 'BRV';

      // 1. Liquid Channel Received (Debit)
      const channelTitle =
        channel === 'cashDrawer'
          ? 'Cash Drawer / Dukan Galla (دکان گلہ)'
          : channel === 'bankAccount'
          ? 'Bank Account / Raast (بینک اکاؤنٹ)'
          : 'Digital Wallet / JazzCash (ڈیجیٹل والٹ)';

      const channelCode =
        channel === 'cashDrawer' ? '1010-CASH-DRAWER' : channel === 'bankAccount' ? '1030-BANK-ACCOUNT' : '1040-DIGITAL-WALLET';

      lines.push({
        code: channelCode,
        title: channelTitle,
        debit: cleanGross,
        credit: 0,
      });

      // 2. Accounts Receivable Reduced (Credit)
      lines.push({
        code: '1020-ACCOUNTS-RECEIVABLE',
        title: 'Customer Wasooli / Maine Lene Settled (گاہک وصولی)',
        debit: 0,
        credit: cleanGross,
      });
      break;
    }

    case 'QUICK_CASH_SALE': {
      const channel = normalizePaymentChannel(paymentMode);
      voucherType = channel === 'cashDrawer' ? 'CRV' : 'BRV';

      const channelTitle =
        channel === 'cashDrawer'
          ? 'Cash Drawer / Dukan Galla (دکان گلہ)'
          : channel === 'bankAccount'
          ? 'Bank Account / Raast (بینک اکاؤنٹ)'
          : 'Digital Wallet / JazzCash (ڈیجیٹل والٹ)';

      const channelCode =
        channel === 'cashDrawer' ? '1010-CASH-DRAWER' : channel === 'bankAccount' ? '1030-BANK-ACCOUNT' : '1040-DIGITAL-WALLET';

      lines.push({
        code: channelCode,
        title: channelTitle,
        debit: cleanGross,
        credit: 0,
      });

      lines.push({
        code: '4010-SALES-REVENUE',
        title: 'Sales Revenue (نقد فروخت)',
        debit: 0,
        credit: cleanGross,
      });
      break;
    }

    case 'MANUAL_JOURNAL': {
      voucherType = 'JV';
      if (customLines && customLines.length > 0) {
        lines.push(...customLines);
      }
      break;
    }
  }

  // Double-Entry Invariant Computation: ∑ Debits - ∑ Credits
  const totalDebits = Math.round(lines.reduce((sum, l) => sum + (l.debit || 0), 0) * 100) / 100;
  const totalCredits = Math.round(lines.reduce((sum, l) => sum + (l.credit || 0), 0) * 100) / 100;
  const discrepancyAmount = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;
  const isBalanced = discrepancyAmount === 0;

  // Channel Solvency Check
  let availableBalance = 0;
  if (channelInspected !== 'none') {
    availableBalance = availableChannels[channelInspected] ?? 0;
  }

  const shortageAmount = requestedOutflow > availableBalance ? Math.round((requestedOutflow - availableBalance) * 100) / 100 : 0;
  const isSolvent = requestedOutflow <= availableBalance;
  const channelSolvencyConfidence = isSolvent ? 1.0 : availableBalance <= 0 ? 0.0 : Math.max(0, Math.round((availableBalance / requestedOutflow) * 100) / 100);

  // Determine Risk Level & Messages
  let riskLevel: JevRiskLevel = 'SAFE';
  const resolutionSuggestions: string[] = [];

  let msgEn = '';
  let msgUr = '';

  const channelLabelEn =
    channelInspected === 'cashDrawer'
      ? 'Cash Drawer (Galla)'
      : channelInspected === 'bankAccount'
      ? 'Bank Account'
      : channelInspected === 'digitalWallet'
      ? 'Digital Wallet'
      : 'Account';

  const channelLabelUr =
    channelInspected === 'cashDrawer'
      ? 'دکان کا گلہ (Cash Drawer)'
      : channelInspected === 'bankAccount'
      ? 'بینک اکاؤنٹ (Bank Account)'
      : channelInspected === 'digitalWallet'
      ? 'ڈیجیٹل والٹ (Wallet)'
      : 'کھاتہ';

  if (!isBalanced) {
    riskLevel = 'CRITICAL_HALT';
    msgEn = `Double-entry invariant violated: Total Debits (Rs. ${totalDebits.toLocaleString()}) do not equal Total Credits (Rs. ${totalCredits.toLocaleString()}). Discrepancy: Rs. ${discrepancyAmount.toLocaleString()}.`;
    msgUr = `ڈبل انٹری اصول کی خلاف ورزی: کل ڈیبٹ (Rs. ${totalDebits.toLocaleString()}) اور کل کریڈٹ (Rs. ${totalCredits.toLocaleString()}) برابر نہیں ہیں۔ فرق: Rs. ${discrepancyAmount.toLocaleString()}۔`;
    resolutionSuggestions.push('Rebalance debits and credits so the discrepancy equals exactly 0.');
  } else if (!isSolvent && requestedOutflow > 0) {
    riskLevel = 'CRITICAL_HALT';
    msgEn = `Insufficient liquidity in ${channelLabelEn}: Required outflow is Rs. ${requestedOutflow.toLocaleString()}, but available balance is only Rs. ${availableBalance.toLocaleString()} (Shortage: Rs. ${shortageAmount.toLocaleString()}). Transaction blocked to prevent negative drawer balance.`;
    msgUr = `⚠️ ${channelLabelUr} میں رقم ناکافی ہے: مطلوبہ ادائیگی Rs. ${requestedOutflow.toLocaleString()} ہے جبکہ دستیاب بیلنس صرف Rs. ${availableBalance.toLocaleString()} ہے (کمی: Rs. ${shortageAmount.toLocaleString()})۔ منفی بیلنس سے بچنے کے لیے ٹرانزیکشن روک دی گئی۔`;
    
    if (channelInspected === 'cashDrawer') {
      resolutionSuggestions.push('Pay via Bank Transfer or Raast if digital funds are available.');
      resolutionSuggestions.push(`Split payment: Pay available Rs. ${availableBalance.toLocaleString()} from drawer and record remaining Rs. ${shortageAmount.toLocaleString()} on credit ("Maine Dene").`);
      resolutionSuggestions.push('Add float / deposit cash into the Cash Drawer before proceeding.');
    } else {
      resolutionSuggestions.push('Switch to Cash Drawer or an alternate payment channel with sufficient funds.');
      resolutionSuggestions.push('Record remainder on credit ("Maine Dene").');
    }
  } else if (isSolvent && requestedOutflow > 0 && availableBalance - requestedOutflow < 1000) {
    riskLevel = 'WARN';
    msgEn = `Caution: Outflow leaves ${channelLabelEn} with low remaining buffer (Rs. ${(availableBalance - requestedOutflow).toLocaleString()}).`;
    msgUr = `توجہ طلب: اس ادائیگی کے بعد ${channelLabelUr} میں قلیل رقم (Rs. ${(availableBalance - requestedOutflow).toLocaleString()}) باقی رہ جائے گی۔`;
  } else {
    riskLevel = 'SAFE';
    msgEn = `Double-entry transaction verified: Debits and Credits are perfectly balanced (Rs. ${totalDebits.toLocaleString()}) and ${channelInspected !== 'none' ? channelLabelEn + ' is fully solvent' : 'ledger reflects correct obligations'}.`;
    msgUr = `ڈبل انٹری لین دین کی توثیق مکمل: ڈیبٹ اور کریڈٹ بالکل متوازن ہیں (Rs. ${totalDebits.toLocaleString()}) اور مالیاتی توازن محفوظ ہے۔`;
  }

  return {
    is_balanced: isBalanced,
    discrepancy_amount: discrepancyAmount,
    channel_solvency_confidence: channelSolvencyConfidence,
    target_voucher_type: voucherType,
    risk_level: riskLevel,
    validation_details: {
      total_debits: totalDebits,
      total_credits: totalCredits,
      channel_inspected: channelInspected,
      available_channel_balance: availableBalance,
      requested_outflow: requestedOutflow,
      shortage_amount: shortageAmount,
      advance_offset_applied: cleanAdvance,
      accounts_affected: lines,
    },
    messages: {
      en: msgEn,
      ur: msgUr,
    },
    resolution_suggestions: resolutionSuggestions.length > 0 ? resolutionSuggestions : undefined,
  };
};
