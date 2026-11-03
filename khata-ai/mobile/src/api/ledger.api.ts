import { apiClient } from './client';

export type EntryType = 'RECEIVABLE' | 'PAYABLE' | 'CASH_IN' | 'CASH_OUT' | 'SETTLEMENT';
export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'CREDIT';

export interface ILedgerItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ILedgerEntry {
  _id: string;
  profileId: string;
  counterpartyId?: string;
  subAccountId?: string;
  entryType: EntryType;
  amount: number;
  discountAmount?: number;
  settlementContractId?: string;
  paymentMode: PaymentMode;
  category: string;
  description?: string;
  items?: ILedgerItem[];
  receiptImageUrl?: string;
  rawInput?: string;
  inputMode: 'MANUAL' | 'VOICE' | 'OCR' | 'WHATSAPP';
  dueDate?: string;
  isSettled: boolean;
  settledAt?: string;
  wasOverridden: boolean;
  isAnomaly: boolean;
  receiptPdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerEntryPayload {
  counterpartyId?: string;
  entryType: EntryType;
  amount: number;
  paymentMode?: PaymentMode;
  category?: string;
  description?: string;
  items?: ILedgerItem[];
  receiptImageUrl?: string;
  rawInput?: string;
  inputMode?: 'MANUAL' | 'VOICE' | 'OCR' | 'WHATSAPP';
  dueDate?: string;
  overrideLimit?: boolean;
  isSettled?: boolean;
}

export interface LedgerSummary {
  receivables: number;
  payables: number;
  netPosition: number;
  monthlyCashIn: number;
  monthlyCashOut: number;
  unsettledCount: number;
  kulLena?: number;
  kulDena?: number;
  netMarketPosition?: number;
  isOverleveraged?: boolean;
  gallaCash?: number;
  cashRunwayDays?: number;
  channels?: {
    physicalCash: number;
    bankAccount: number;
    digitalWallet: number;
  };
}

export interface SendReceiptSmsPayload {
  counterpartyId: string;
  amount: number;
  remainingBalance?: number;
  paymentMode?: PaymentMode;
  transactionId?: string;
  customMessage?: string;
}

export const ledgerApi = {
  create: async (payload: CreateLedgerEntryPayload): Promise<{ success: boolean; data: ILedgerEntry; message: string }> => {
    const res = await apiClient.post('/ledger', payload);
    return res.data;
  },

  getAll: async (params?: {
    counterpartyId?: string;
    entryType?: EntryType;
    isSettled?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ILedgerEntry[]; pagination: any }> => {
    const res = await apiClient.get('/ledger', { params });
    return res.data;
  },

  getSummary: async (): Promise<{ success: boolean; data: LedgerSummary }> => {
    const res = await apiClient.get('/ledger/summary');
    return res.data;
  },

  generateStatementPdf: async (payload: {
    counterpartyId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { counterpartyName: string; statementDate: string; htmlContent: string };
  }> => {
    const res = await apiClient.post('/ledger/statement-pdf', payload);
    return res.data;
  },

  settle: async (
    id: string,
    payload?: { amount?: number; discountAmount?: number; settlementContractId?: string; paymentMode?: PaymentMode; description?: string }
  ): Promise<{ success: boolean; data: { originalEntry: ILedgerEntry; settlementRecord: ILedgerEntry } }> => {
    const res = await apiClient.post(`/ledger/${id}/settle`, payload || {});
    return res.data;
  },

  sendReceiptSms: async (
    payload: SendReceiptSmsPayload
  ): Promise<{
    success: boolean;
    message: string;
    data: { recipientPhone: string; smsText: string; counterpartyName: string; amountPaid: number; remainingBalance: number };
  }> => {
    const res = await apiClient.post('/ledger/send-receipt-sms', payload);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/ledger/${id}`);
    return res.data;
  },

  downloadCashflowPdf: async (params: {
    period: 'DAILY' | 'MONTHLY' | 'CUSTOM';
    channel?: string;
    date?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    format?: 'base64' | 'binary';
  }): Promise<{ success: boolean; base64: string; filename: string; meta?: any }> => {
    const res = await apiClient.get('/ledger/cashflow-pdf', {
      params: { ...params, format: params.format || 'base64' },
    });
    return res.data;
  },
};

