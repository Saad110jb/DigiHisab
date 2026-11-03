import { apiClient } from './client';

export interface QuickSaleItemPayload {
  itemId: string;
  quantity: number;
}

export interface QuickSalePayload {
  amount: number;
  paymentDestination: 'CASH' | 'WALLET' | 'BANK';
  note?: string;
  items?: QuickSaleItemPayload[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}

export const counterSaleApi = {
  quickSale: async (payload: QuickSalePayload): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await apiClient.post('/counter-sales/quick-sale', payload);
    return res.data;
  },
};
