import { apiClient } from './client';
import { ISentinelDashboardData, ICashierTrustProfile, ITillSentinelEvent } from '../services/chorNazar.service';

export const chorNazarApi = {
  /**
   * Get store-wide Chor Nazar Trust Dashboard (Strictly Owner-Only)
   */
  getTrustDashboard: async (): Promise<{ success: boolean; data: ISentinelDashboardData }> => {
    try {
      const response = await apiClient.get('/sentinel/trust-dashboard');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Get Cashier specific audit dossier
   */
  getCashierAudit: async (
    subAccountId: string
  ): Promise<{ success: boolean; data: { profile: ICashierTrustProfile; events: ITillSentinelEvent[] } }> => {
    try {
      const response = await apiClient.get(`/sentinel/cashier-audit/${subAccountId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Trigger surprise till audit (Chhapa)
   */
  triggerSurpriseAudit: async (payload: {
    subAccountId: string;
    cashierName: string;
  }): Promise<{ success: boolean; messageUr: string; messageEn: string; auditId?: string }> => {
    try {
      const response = await apiClient.post('/sentinel/trigger-surprise-audit', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Revoke Cashier Void Permissions
   */
  revokeVoidPermission: async (payload: {
    subAccountId: string;
  }): Promise<{ success: boolean; messageUr: string; messageEn: string }> => {
    try {
      const response = await apiClient.post('/sentinel/revoke-void-permission', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Log POS till event
   */
  recordTillEvent: async (payload: {
    subAccountId?: string;
    cashierName: string;
    eventType: string;
    amountInvolved?: number;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; data?: any }> => {
    try {
      const response = await apiClient.post('/sentinel/record-till-event', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },
};
