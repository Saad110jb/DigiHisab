import { apiClient } from './client';

export type MandiCategory = 'CHICKEN' | 'MUTTON_BEEF' | 'FRESH_VEGETABLES' | 'SEASONAL_FRUITS';
export type MandiUnit = 'KG' | 'GRAM' | 'DARJAN' | 'PAO';

export interface ICategoryEnvelope {
  category: MandiCategory;
  categoryUrdu: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
}

export interface IMandiWeeklyEnvelope {
  _id: string;
  weekKey: string;
  monthKey: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalWeeklyBudget: number;
  totalWeeklySpent: number;
  remainingWeeklyBalance: number;
  envelopes: ICategoryEnvelope[];
}

export interface IMandiPurchaseLog {
  _id: string;
  weekKey: string;
  category: MandiCategory;
  itemName: string;
  quantity: number;
  unit: MandiUnit;
  ratePerUnit: number;
  totalAmount: number;
  marketSource: string;
  paymentMethod: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'RAAST';
  purchaseDate: string;
  notes?: string;
}

export interface IMandiBenchmarkItem {
  name: string;
  unit: MandiUnit;
  typicalRate: number;
  chips: number[];
}

export interface IMandiBenchmarkCategory {
  category: MandiCategory;
  categoryUrdu: string;
  items: IMandiBenchmarkItem[];
}

export interface ICurrentWeekResponse {
  envelope: IMandiWeeklyEnvelope;
  purchases: IMandiPurchaseLog[];
  benchmarks: IMandiBenchmarkCategory[];
}

export const mandiBudgetApi = {
  getCurrentWeekBudget: async (): Promise<ICurrentWeekResponse> => {
    const res = await apiClient.get('/domestic/mandi-budget/current-week');
    return res.data.data;
  },

  allocateWeeklyBudget: async (
    envelopes: { category: MandiCategory; categoryUrdu: string; allocatedAmount: number }[]
  ): Promise<IMandiWeeklyEnvelope> => {
    const res = await apiClient.post('/domestic/mandi-budget/envelope', { envelopes });
    return res.data.data;
  },

  logMandiPurchase: async (payload: {
    category: MandiCategory;
    itemName: string;
    quantity: number;
    unit: MandiUnit;
    ratePerUnit: number;
    totalAmount?: number;
    marketSource?: string;
    paymentMethod?: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'RAAST';
    purchaseDate?: string;
    notes?: string;
  }): Promise<{ purchase: IMandiPurchaseLog; envelope: IMandiWeeklyEnvelope }> => {
    const res = await apiClient.post('/domestic/mandi-budget/purchase', payload);
    return res.data.data;
  },

  deleteMandiPurchase: async (id: string): Promise<IMandiWeeklyEnvelope> => {
    const res = await apiClient.delete(`/domestic/mandi-budget/purchase/${id}`);
    return res.data.data;
  },

  getRateBenchmarks: async (): Promise<IMandiBenchmarkCategory[]> => {
    const res = await apiClient.get('/domestic/mandi-budget/rate-benchmarks');
    return res.data.data;
  },
};
