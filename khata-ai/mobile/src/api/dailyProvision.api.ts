import { apiClient } from './client';

export interface ILogDailyProvisionRequest {
  date: string; // "YYYY-MM-DD"
  milkLiters?: number;
  isMilkSkipped?: boolean;
  milkRate?: number;
  rotiCount?: number;
  isRotiSkipped?: boolean;
  rotiRate?: number;
  notes?: string;
}

export interface IReconciliationDayItem {
  dayNumber: number;
  date: string;
  dayName: string;
  milkLiters: number;
  isMilkSkipped: boolean;
  milkRate: number;
  milkCost: number;
  rotiCount: number;
  isRotiSkipped: boolean;
  rotiRate: number;
  rotiCost: number;
  dailyTotal: number;
  notes?: string;
  isLogged: boolean;
  isFuture: boolean;
}

export interface IDailyProvisionAdvance {
  _id?: string;
  date: string;
  amount: number;
  paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
  notes?: string;
}

export interface IDailyProvisionSettings {
  _id?: string;
  defaultMilkLiters: number;
  defaultRotiCount: number;
  baseMilkRate: number;
  baseRotiRate: number;
  milkmanName: string;
  milkmanPhone?: string;
  tandoorName: string;
  tandoorPhone?: string;
  advances?: IDailyProvisionAdvance[];
  lastSettledMonth?: string;
}

export interface IReconciliationReport {
  monthKey: string;
  monthNameUrdu: string;
  monthNameEnglish: string;
  calendarDays: IReconciliationDayItem[];
  metrics: {
    totalMilkLiters: number;
    totalMilkCost: number;
    totalRotiCount: number;
    totalRotiCost: number;
    totalGrossBill: number;
    milkSkippedDays: number;
    rotiSkippedDays: number;
    activeDeliveredDays: number;
    totalAdvancesDeducted: number;
    netPayable: number;
    isMonthSettled: boolean;
  };
  settings: IDailyProvisionSettings;
  advances: IDailyProvisionAdvance[];
}

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const dailyProvisionApi = {
  /**
   * Log Daily Provision (Milk & Roti Counter)
   */
  logDailyProvision: async (data: ILogDailyProvisionRequest) => {
    const res = await apiClient.post<IApiResponse<any>>('/domestic/daily-provisions/log', data);
    return res.data;
  },

  /**
   * Fetch 30-Day Month Reconciliation & Kacha Parcha Matcher
   */
  getMonthReconciliation: async (month?: string) => {
    const res = await apiClient.get<IApiResponse<IReconciliationReport>>('/domestic/daily-provisions/reconciliation', {
      params: { month },
    });
    return res.data;
  },

  /**
   * Fetch Settings & Base Rates
   */
  getSettings: async () => {
    const res = await apiClient.get<IApiResponse<IDailyProvisionSettings>>('/domestic/daily-provisions/settings');
    return res.data;
  },

  /**
   * Update Base Rates & Settings
   */
  updateSettings: async (settings: Partial<IDailyProvisionSettings>) => {
    const res = await apiClient.patch('/domestic/daily-provisions/settings', settings);
    return res.data;
  },

  /**
   * Toggle Chutti on Any Day
   */
  toggleChutti: async (date: string, provision: 'MILK' | 'ROTI' | 'BOTH' = 'BOTH') => {
    const res = await apiClient.patch('/domestic/daily-provisions/toggle-chutti', { date, provision });
    return res.data;
  },

  /**
   * Record Advance Payment to Milkman or Tandoor
   */
  recordAdvance: async (data: {
    date: string;
    amount: number;
    paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
    notes?: string;
  }) => {
    const res = await apiClient.post('/domestic/daily-provisions/advance', data);
    return res.data;
  },

  /**
   * Settle Month Bill (Hisab Saaf Karein)
   */
  settleMonthlyBill: async (data: {
    monthKey: string;
    amount: number;
    paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
    notes?: string;
  }) => {
    const res = await apiClient.post('/domestic/daily-provisions/settle', data);
    return res.data;
  },
};
