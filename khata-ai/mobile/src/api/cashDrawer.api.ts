import { apiClient } from './client';

export interface ExpectedCashBreakdown {
  openingBalance: number;
  cashInTotal: number;
  cashOutTotal: number;
  settlementsCashTotal: number;
  systemExpectedCash: number;
}

export interface ITillBalances {
  physicalCash: number;
  digitalWallet: number;
  bankAccount: number;
  totalLiquidCapital: number;
}

export interface ICashDrawerReconciliation {
  _id: string;
  profileId: string;
  subAccountId?: string;
  reconciliationDate: string;
  systemExpectedCash: number;
  physicalCountedCash: number;
  discrepancyAmount: number;
  isDiscrepancyApproved: boolean;
  notes?: string;
  createdAt: string;
}

export const cashDrawerApi = {
  calculateExpectedCash: async (params?: { shiftDate?: string; openingBalance?: number }): Promise<{ success: boolean; data: ExpectedCashBreakdown }> => {
    const res = await apiClient.get('/cash-drawer/expected-cash', { params });
    return res.data;
  },

  getTillBalances: async (): Promise<{ success: boolean; data: ITillBalances }> => {
    const res = await apiClient.get('/cash-drawer/till-balances');
    return res.data;
  },

  topUpTill: async (payload: { targetAccount: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT'; amount: number; note?: string }): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await apiClient.post('/cash-drawer/top-up-till', payload);
    return res.data;
  },

  submitReconciliation: async (payload: {
    physicalCountedCash: number;
    openingBalance?: number;
    notes?: string;
    shiftDate?: string;
  }): Promise<{ success: boolean; message: string; data: { reconciliation: ICashDrawerReconciliation; breakdown: ExpectedCashBreakdown; varianceType: string } }> => {
    const res = await apiClient.post('/cash-drawer/reconcile', payload);
    return res.data;
  },

  getStats: async (): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.get('/cash-drawer/stats');
    return res.data;
  },
};
