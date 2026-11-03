 import { apiClient } from './client';

export type SettlementStatus = 'OFFERED' | 'ACCEPTED' | 'FULFILLED' | 'EXPIRED' | 'REJECTED';

export interface ISettlementContract {
  _id: string;
  profileId: string;
  counterpartyId: any;
  originalDebtAmount: number;
  offeredDiscountAmount: number;
  agreedPayoffAmount: number;
  daysOverdueAtOffer: number;
  status: SettlementStatus;
  expiresAt: string;
  acceptedAt?: string;
  fulfilledAt?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettlementPayload {
  counterpartyId: string;
  originalDebtAmount: number;
  offeredDiscountAmount: number;
  agreedPayoffAmount: number;
  daysOverdueAtOffer?: number;
  expiresAt: string;
}

export const settlementApi = {
  create: async (
    payload: CreateSettlementPayload
  ): Promise<{ success: boolean; data: ISettlementContract; message: string }> => {
    const res = await apiClient.post('/settlement', payload);
    return res.data;
  },

  getAll: async (params?: {
    counterpartyId?: string;
    status?: SettlementStatus;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ISettlementContract[]; pagination: any }> => {
    const res = await apiClient.get('/settlement', { params });
    return res.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: ISettlementContract }> => {
    const res = await apiClient.get(`/settlement/${id}`);
    return res.data;
  },

  updateStatus: async (
    id: string,
    payload: { status: SettlementStatus; paymentReference?: string }
  ): Promise<{ success: boolean; data: ISettlementContract; message: string }> => {
    const res = await apiClient.patch(`/settlement/${id}/status`, payload);
    return res.data;
  },
};
