import { apiClient } from './client';

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
  channel_solvency_confidence: number;
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

export interface IJevValidatePayload {
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
  paymentMode?: string;
  customLines?: IDoubleEntryLine[];
}

export interface IJevValidateResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: JevLedgerValidation;
  availableBalance?: number;
  shortageAmount?: number;
  validation?: JevLedgerValidation;
}

export const jevDoubleEntryApi = {
  /**
   * Pre-flight double-entry and channel solvency check
   */
  validateTransaction: async (payload: IJevValidatePayload): Promise<IJevValidateResponse> => {
    try {
      const response = await apiClient.post('/finance/validate-transaction', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};
