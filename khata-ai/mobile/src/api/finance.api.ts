import { apiClient } from './client';
import { IPaymentChannels } from './profile.api';

export interface IRecordOutflowPayload {
  outflowType?: string;
  amount: number;
  paymentMode: 'CASH' | 'BANK' | 'WALLET' | 'PHYSICAL_CASH' | 'BANK_ACCOUNT' | 'DIGITAL_WALLET' | string;
  counterpartyId?: string;
  category?: string;
  description?: string;
}

export interface IRecordOutflowResponse {
  success: boolean;
  message?: string;
  code?: string;
  availableBalance?: number;
  data?: {
    entry: any;
    updatedChannelBalance: number;
    updatedChannels: IPaymentChannels;
  };
}

export const financeApi = {
  recordOutflow: async (payload: IRecordOutflowPayload): Promise<IRecordOutflowResponse> => {
    try {
      const response = await apiClient.post('/finance/record-outflow', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getDailyOpexGuidance: async (): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.get('/finance/daily-opex-guidance');
    return res.data;
  },
};
