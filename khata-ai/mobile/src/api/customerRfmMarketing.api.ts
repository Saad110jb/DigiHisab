import { apiClient } from './client';

export type RfmSegment = 'VIP' | 'LOYAL' | 'AT_RISK' | 'CREDIT_DEBTOR' | 'NEW';

export interface IRfmCustomerItem {
  id: string;
  name: string;
  phone: string;
  segment: RfmSegment;
  segmentLabelUrdu: string;
  segmentLabelEnglish: string;
  recencyDays: number;
  frequency90d: number;
  monetarySpend90d: number;
  currentBalance: number;
  lastVisitDate?: string;
  rfmScore: { r: number; f: number; m: number };
  lastCampaignSentAt?: string;
}

export interface IRfmSummary {
  kpis: {
    totalCustomers: number;
    vipCount: number;
    loyalCount: number;
    atRiskCount: number;
    creditDebtorsCount: number;
    newCount: number;
    totalSpend90d: number;
    averageSpendPerCustomer: number;
  };
  customers: IRfmCustomerItem[];
}

export interface ICampaignTemplate {
  id: string;
  titleUrdu: string;
  titleEnglish: string;
  targetSegments: RfmSegment[];
  descriptionUrdu: string;
  descriptionEnglish: string;
  messageUrdu: string;
  badge: string;
}

export interface ICampaignPreviewItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  segment: RfmSegment;
  segmentLabelUrdu: string;
  messageText: string;
  whatsappLink: string;
  lastCampaignSentAt?: string;
}

export interface ICampaignPreviewResponse {
  template: ICampaignTemplate;
  storeName: string;
  totalTargeted: number;
  genericBroadcastMessage: string;
  customers: ICampaignPreviewItem[];
}

export const customerRfmMarketingApi = {
  getSummary: async (): Promise<{ success: boolean; data: IRfmSummary }> => {
    const res = await apiClient.get('/customer-marketing/summary');
    return res.data;
  },

  getTemplates: async (): Promise<{ success: boolean; data: ICampaignTemplate[] }> => {
    const res = await apiClient.get('/customer-marketing/templates');
    return res.data;
  },

  getPreviews: async (
    campaignId?: string,
    segment?: string
  ): Promise<{ success: boolean; data: ICampaignPreviewResponse }> => {
    const res = await apiClient.get('/customer-marketing/previews', {
      params: { campaignId, segment },
    });
    return res.data;
  },

  recordDispatch: async (
    customerId: string,
    campaignId?: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/customer-marketing/dispatch', { customerId, campaignId });
    return res.data;
  },
};
