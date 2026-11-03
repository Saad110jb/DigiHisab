import { apiClient } from './client';

export type UtilityProviderType = 'ELECTRICITY' | 'GAS' | 'WATER' | 'INTERNET' | 'OTHER';

export type BillPaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export type PaymentSourceTag =
  | 'JAZZCASH'
  | 'EASYPAISA'
  | 'BANK_TRANSFER'
  | 'SADAPAY'
  | 'NAYAPAY'
  | 'CASH'
  | 'RAAST';

export interface IUtilityBill {
  _id: string;
  providerType: UtilityProviderType;
  providerName: string;
  consumerNumber: string;
  meterNumber?: string;
  billingMonth: string;
  billingAmount: number;
  surchargeAmount: number;
  amountAfterDueDate: number;
  billDueDate: string;
  status: BillPaymentStatus;
  effectiveStatus: 'UNPAID' | 'PAID' | 'OVERDUE';
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
  paymentSource?: PaymentSourceTag;
  paymentDate?: string;
  transactionId?: string;
  receiptProofUrl?: string;
  paidByUserName?: string;
  notes?: string;
  alert3DaysSent?: boolean;
  alert1DaySent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUtilityBillSummary {
  currentMonthKey: string;
  totalBills: number;
  unpaidCount: number;
  paidCount: number;
  dueSoonCount: number;
  overdueCount: number;
  totalUnpaidAmount: number;
  totalSurchargeAtRisk: number;
  totalPaidThisMonth: number;
  totalUpcomingSurcharges: number;
}

export interface IUtilityBillsResponse {
  summary: IUtilityBillSummary;
  bills: IUtilityBill[];
}

export interface CreateBillPayload {
  providerType: UtilityProviderType;
  providerName: string;
  consumerNumber: string;
  meterNumber?: string;
  billingMonth?: string;
  billingAmount: number;
  surchargeAmount?: number;
  billDueDate: string;
  notes?: string;
}

export interface PayBillPayload {
  paymentSource: PaymentSourceTag;
  transactionId?: string;
  paidByUserName?: string;
  receiptProofUrl?: string;
  notes?: string;
}

export const utilityBillApi = {
  getBills: async (): Promise<IUtilityBillsResponse> => {
    const res = await apiClient.get('/domestic/utility-bills');
    return res.data.data;
  },

  createBill: async (payload: CreateBillPayload): Promise<IUtilityBill> => {
    const res = await apiClient.post('/domestic/utility-bills', payload);
    return res.data.data;
  },

  payBill: async (id: string, payload: PayBillPayload): Promise<IUtilityBill> => {
    const res = await apiClient.patch(`/domestic/utility-bills/${id}/pay`, payload);
    return res.data.data;
  },

  getShareText: async (id: string): Promise<{ shareText: string; bill: IUtilityBill }> => {
    const res = await apiClient.get(`/domestic/utility-bills/${id}/share-text`);
    return res.data.data;
  },

  deleteBill: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/domestic/utility-bills/${id}`);
    return res.data;
  },
};
