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

  /**
   * Evaluate Till Transaction / Shift with Chor Nazar ML Anomaly Detection (IsolationForest)
   */
  evaluateTillAnomaly: async (payload: {
    subAccountId?: string;
    cashierName?: string;
    amountInvolved?: number;
    drawerVariance?: number;
    voidRatio?: number;
    velocity?: number;
    timeSkewMinutes?: number;
  }): Promise<{
    success: boolean;
    data?: {
      is_anomaly: boolean;
      anomaly_score: number;
      risk_score: number;
      severity: string;
      requires_biometric: boolean;
      alert_title_ur: string;
      alert_title_en: string;
      factors: Array<{ factor: string; description_ur: string; description_en: string; contribution: number }>;
    };
    error?: string;
  }> => {
    try {
      const response = await apiClient.post('/sentinel/evaluate-anomaly', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },
};
