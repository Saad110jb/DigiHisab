import { apiClient } from './client';

export interface AuditLogItem {
  _id: string;
  profileId: string;
  authorizedById: string;
  authorizedByName: string;
  authorizedByRole: 'OWNER' | 'MANAGER' | 'CASHIER';
  actionType: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyPhone?: string;
  financialSnapshot: {
    creditLimit: number;
    balanceBefore: number;
    attemptedAmount: number;
    resultingBalance: number;
  };
  reason?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export const auditLogApi = {
  getAuditLogs: async (params?: {
    actionType?: string;
    counterpartyId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLogItem[]; meta: { total: number; page: number; pages: number; limit: number } }> => {
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },

  getAuditLogById: async (id: string): Promise<AuditLogItem> => {
    const response = await apiClient.get(`/audit-logs/${id}`);
    return response.data.data;
  },
};
