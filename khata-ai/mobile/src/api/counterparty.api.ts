import { apiClient } from './client';

export type RelationType = 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'FAMILY';
export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupplierCategory = 'MANDI_SUPPLIER' | 'FMCG_DISTRIBUTOR' | 'DAIRY_VENDOR' | 'LOCAL_VENDOR' | 'GENERAL_WHOLESALER';
export type TradeCreditTermType = 'NET_7' | 'NET_15' | 'NET_30' | 'WEEKLY_MANDI' | 'CUSTOM';

export interface ICounterparty {
  _id: string;
  profileId: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  cnic?: string;
  relationType: RelationType;
  currentBalance: number;
  creditLimit: number;
  defaultReturnDays?: number;
  isCreditBlocked: boolean;
  advanceDeposit?: number;
  supplierCategory?: SupplierCategory;
  deliveryRep?: {
    name?: string;
    phone?: string;
  };
  companyBankDetails?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
  };
  tradeCreditTerms?: {
    termType: TradeCreditTermType;
    creditPeriodDays: number;
    settlementScheduleNote?: string;
  };
  riskProfile: {
    defaultProbability: number;
    riskTier: RiskTier;
    lastEvaluatedAt?: string;
    overdueDays: number;
    currentToneTier: number;
    lastReminderSentAt?: string;
  };
  settlementOffer?: {
    eligible: boolean;
    originalDebt: number;
    discountedAmount: number;
    expiresAt: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCounterpartyPayload {
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  cnic?: string;
  relationType: RelationType;
  creditLimit?: number;
  defaultReturnDays?: number;
  isCreditBlocked?: boolean;
  supplierCategory?: SupplierCategory;
  deliveryRep?: {
    name?: string;
    phone?: string;
  };
  companyBankDetails?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
  };
  tradeCreditTerms?: {
    termType: TradeCreditTermType;
    creditPeriodDays: number;
    settlementScheduleNote?: string;
  };
  notes?: string;
}

export interface PaySupplierPayload {
  amount: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'CHEQUE';
  isAdvance?: boolean;
  referenceNo?: string;
  notes?: string;
}

export const counterpartyApi = {
  create: async (payload: CreateCounterpartyPayload): Promise<{ success: boolean; data: ICounterparty; message: string }> => {
    const res = await apiClient.post('/counterparties', payload);
    return res.data;
  },

  getAll: async (params?: {
    relationType?: RelationType;
    search?: string;
    sortBy?: 'createdAt' | 'balance' | 'overdueDays' | 'name';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ICounterparty[]; pagination: any }> => {
    const res = await apiClient.get('/counterparties', { params });
    return res.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: ICounterparty }> => {
    const res = await apiClient.get(`/counterparties/${id}`);
    return res.data;
  },

  update: async (id: string, payload: Partial<CreateCounterpartyPayload>): Promise<{ success: boolean; data: ICounterparty }> => {
    const res = await apiClient.put(`/counterparties/${id}`, payload);
    return res.data;
  },

  updateCreditLimit: async (id: string, creditLimit: number): Promise<{ success: boolean; data: ICounterparty }> => {
    const res = await apiClient.patch(`/counterparties/${id}/credit-limit`, { creditLimit });
    return res.data;
  },

  toggleCreditBlock: async (id: string, isCreditBlocked?: boolean): Promise<{ success: boolean; data: { id: string; isCreditBlocked: boolean } }> => {
    const res = await apiClient.patch(`/counterparties/${id}/toggle-block`, { isCreditBlocked });
    return res.data;
  },

  paySupplier: async (id: string, payload: PaySupplierPayload): Promise<{ success: boolean; data: { supplier: ICounterparty; ledgerEntry: any }; message: string }> => {
    const res = await apiClient.post(`/counterparties/${id}/pay`, payload);
    return res.data;
  },

  getSupplierDueReminders: async (): Promise<{ success: boolean; data: any[] }> => {
    const res = await apiClient.get('/counterparties/supplier-due-reminders');
    return res.data;
  },

  getDebtAgingRadar: async (): Promise<{
    success: boolean;
    data: {
      buckets: {
        days0To7: { count: number; totalAmount: number };
        days8To15: { count: number; totalAmount: number };
        days16To30: { count: number; totalAmount: number };
        days30Plus: { count: number; totalAmount: number };
      };
      debtors: Array<{
        id: string;
        name: string;
        phone: string;
        currentBalance: number;
        creditLimit: number;
        overdueDays: number;
        agingCategory: '0-7d' | '8-15d' | '16-30d' | '30+d';
        riskTier: RiskTier;
        riskScore: number;
        tagazaTemplate: string;
      }>;
    };
  }> => {
    const res = await apiClient.get('/counterparties/debt-aging-radar');
    return res.data;
  },

  recalculateRisk: async (id: string): Promise<{ success: boolean; data: any; message: string }> => {
    const res = await apiClient.post(`/counterparties/${id}/recalculate-risk`);
    return res.data;
  },

  bulkDeleteCustomers: async (): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
    try {
      const res = await apiClient.delete('/khata/customers/bulk-delete');
      return res.data;
    } catch {
      const res = await apiClient.delete('/counterparties/bulk-delete');
      return res.data;
    }
  },

  deleteCustomer: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.delete('/khata/customers/' + id);
      return res.data;
    } catch {
      const res = await apiClient.delete('/counterparties/' + id + '?force=true');
      return res.data;
    }
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/counterparties/${id}`);
    return res.data;
  },

  recordWasooli: async (
    counterpartyId: string,
    payload: {
      amount: number;
      paymentDestination: 'CASH' | 'WALLET' | 'BANK';
      notes?: string;
    }
  ): Promise<{ success: boolean; data: any; message: string }> => {
    const res = await apiClient.post(`/counterparties/${counterpartyId}/wasooli`, payload);
    return res.data;
  },

  getTaqazaPolicy: async (id: string): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.get(`/counterparties/${id}/taqaza-policy`);
    return res.data;
  },
};
