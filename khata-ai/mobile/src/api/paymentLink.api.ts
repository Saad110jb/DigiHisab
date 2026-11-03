import { apiClient } from './client';

export type PaymentGateway = 'JAZZCASH' | 'EASYPAISA' | 'RAAST' | 'STRIPE';

export interface IDynamicPaymentLink {
  _id: string;
  profileId: string;
  counterpartyId?: string;
  ledgerEntryId?: string;
  linkToken: string;
  gateway: PaymentGateway;
  amount: number;
  qrCodeUrl: string;
  deepLinkUrl: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
}

export const paymentLinkApi = {
  create: async (payload: {
    amount: number;
    gateway?: PaymentGateway;
    counterpartyId?: string;
    ledgerEntryId?: string;
    validMinutes?: number;
  }): Promise<{ success: boolean; message: string; data: IDynamicPaymentLink }> => {
    const res = await apiClient.post('/payment-links', payload);
    return res.data;
  },

  verifyStatus: async (token: string): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.get(`/payment-links/${token}/verify`);
    return res.data;
  },
};
