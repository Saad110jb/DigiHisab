import { apiClient } from './client';

export type DomesticStaffRole =
  | 'MAID'
  | 'DRIVER'
  | 'COOK'
  | 'GUARD'
  | 'GARDENER'
  | 'NANNY'
  | 'OTHER';

export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE';
export type SalaryPaymentMode = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER';

export interface IPeshgiAdvance {
  _id: string;
  amount: number;
  disbursementDate: string;
  reason?: string;
  paymentMode: SalaryPaymentMode;
  isDeducted: boolean;
  deductedInMonth?: string;
  notes?: string;
}

export interface IAttendanceDay {
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface ISalarySettlement {
  _id: string;
  month: string;
  baseSalary: number;
  totalAdvancesDeducted: number;
  absentDays: number;
  halfDays: number;
  leaveDeductions: number;
  bonusOrEidiAmount: number;
  netSalaryPaid: number;
  paidAt: string;
  paymentMode: SalaryPaymentMode;
  notes?: string;
  receiptText?: string;
}

export interface IDomesticStaffMember {
  _id: string;
  staffName: string;
  role: DomesticStaffRole;
  phone?: string;
  baseMonthlySalary: number;
  avatarColor?: string;
  joiningDate: string;
  isActive: boolean;
  attendance: IAttendanceDay[];
  advances: IPeshgiAdvance[];
  settlementHistory: ISalarySettlement[];
  totalAdvancesPending: number;
  activeAdvancesCount: number;
  activeAdvances: IPeshgiAdvance[];
  attendanceStats: {
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDeduction: number;
  };
  liveNetSalaryPayable: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDomesticStaffAnalytics {
  monthKey: string;
  totalStaffCount: number;
  totalBaseSalary: number;
  totalActivePeshgiPool: number;
  totalNetPayable: number;
  staffWithActiveAdvanceCount: number;
}

export interface CreateStaffPayload {
  staffName: string;
  role: DomesticStaffRole;
  phone?: string;
  baseMonthlySalary: number;
  avatarColor?: string;
}

export interface LogAdvancePayload {
  amount: number;
  reason?: string;
  paymentMode?: SalaryPaymentMode;
  disbursementDate?: string;
  notes?: string;
}

export interface RecordAttendancePayload {
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface SettleSalaryPayload {
  month?: string;
  bonusOrEidiAmount?: number;
  paymentMode?: SalaryPaymentMode;
  notes?: string;
}

export const domesticStaffApi = {
  getStaff: async (): Promise<IDomesticStaffMember[]> => {
    const res = await apiClient.get('/domestic/staff');
    return res.data.data;
  },

  getAnalytics: async (): Promise<IDomesticStaffAnalytics> => {
    const res = await apiClient.get('/domestic/staff/analytics');
    return res.data.data;
  },

  createStaff: async (payload: CreateStaffPayload): Promise<IDomesticStaffMember> => {
    const res = await apiClient.post('/domestic/staff', payload);
    return res.data.data;
  },

  logAdvance: async (id: string, payload: LogAdvancePayload): Promise<IDomesticStaffMember> => {
    const res = await apiClient.post(`/domestic/staff/${id}/advance`, payload);
    return res.data.data;
  },

  recordAttendance: async (id: string, payload: RecordAttendancePayload): Promise<IDomesticStaffMember> => {
    const res = await apiClient.post(`/domestic/staff/${id}/attendance`, payload);
    return res.data.data;
  },

  settleSalary: async (
    id: string,
    payload: SettleSalaryPayload
  ): Promise<{ staff: IDomesticStaffMember; slipText: string }> => {
    const res = await apiClient.post(`/domestic/staff/${id}/settle`, payload);
    return res.data.data;
  },

  getSalarySlip: async (id: string, month?: string): Promise<{ slipText: string; staffPhone?: string }> => {
    const res = await apiClient.get(`/domestic/staff/${id}/salary-slip`, { params: { month } });
    return res.data.data;
  },

  deleteStaff: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/domestic/staff/${id}`);
    return res.data;
  },
};
