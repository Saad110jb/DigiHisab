import { apiClient } from './client';

export type EducationLevel = 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'ACADEMY';
export type FeeFrequency = 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';
export type FeePaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE';
export type PaymentMode = 'JAZZCASH' | 'EASYPAISA' | 'BANK_1BILL' | 'CASH' | 'RAAST';

export interface ISchoolFeeRecord {
  _id: string;
  childName: string;
  childAvatarColor?: string;
  institutionName: string;
  gradeClass: string;
  educationLevel: EducationLevel;
  termOrMonth: string;
  feeFrequency: FeeFrequency;
  tuitionFeeAmount: number;
  vanTransportFeeAmount: number;
  vanDriverName?: string;
  vanDriverPhone?: string;
  academyFeeAmount: number;
  academyName?: string;
  stationeryUniformAmount: number;
  examFeeAmount: number;
  siblingDiscountAmount: number;
  otherChargesAmount: number;
  totalDue: number;
  surchargeAmount: number;
  amountAfterDueDate: number;
  dueDate: string;
  status: FeePaymentStatus;
  effectiveStatus: 'UNPAID' | 'PAID' | 'OVERDUE';
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
  isPaid: boolean;
  paidAt?: string;
  paymentMode?: PaymentMode;
  challanVoucherNo?: string;
  bankTransactionId?: string;
  voucherPdfUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChildInvestmentSummary {
  childName: string;
  institutionName: string;
  gradeClass: string;
  avatarColor: string;
  totalInvestment: number;
  tuition: number;
  van: number;
  academy: number;
  stationeryUniform: number;
  exam: number;
  other: number;
  unpaidCount: number;
  paidCount: number;
}

export interface ISchoolFeeTimelineItem {
  feeId: string;
  childName: string;
  institutionName: string;
  totalDue: number;
  amountAfterDueDate: number;
  dueDate: string;
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
}

export interface ISchoolFeeAnalytics {
  currentMonthKey: string;
  totalMonthlyOutflow: number;
  totalUnpaid: number;
  totalPaid: number;
  totalSurchargeAtRisk: number;
  unpaidCount: number;
  paidCount: number;
  dueSoonCount: number;
  overdueCount: number;
  perChildBreakdown: IChildInvestmentSummary[];
  timeline: ISchoolFeeTimelineItem[];
}

export interface CreateSchoolFeePayload {
  childName: string;
  childAvatarColor?: string;
  institutionName: string;
  gradeClass: string;
  educationLevel?: EducationLevel;
  termOrMonth?: string;
  feeFrequency?: FeeFrequency;
  tuitionFeeAmount: number;
  vanTransportFeeAmount?: number;
  vanDriverName?: string;
  vanDriverPhone?: string;
  academyFeeAmount?: number;
  academyName?: string;
  stationeryUniformAmount?: number;
  examFeeAmount?: number;
  siblingDiscountAmount?: number;
  otherChargesAmount?: number;
  surchargeAmount?: number;
  dueDate: string;
  challanVoucherNo?: string;
  notes?: string;
}

export interface MarkFeePaidPayload {
  paymentMode: PaymentMode;
  challanVoucherNo?: string;
  bankTransactionId?: string;
  voucherPdfUrl?: string;
  notes?: string;
  recordInLedger?: boolean;
}

export const schoolFeeApi = {
  getFees: async (params?: { childName?: string; isPaid?: boolean; termOrMonth?: string }): Promise<ISchoolFeeRecord[]> => {
    const res = await apiClient.get('/school-fee', { params });
    return res.data.data;
  },

  getAnalytics: async (): Promise<ISchoolFeeAnalytics> => {
    const res = await apiClient.get('/school-fee/analytics');
    return res.data.data;
  },

  createFee: async (payload: CreateSchoolFeePayload): Promise<ISchoolFeeRecord> => {
    const res = await apiClient.post('/school-fee', payload);
    return res.data.data;
  },

  markPaid: async (id: string, payload: MarkFeePaidPayload): Promise<{ feeRecord: ISchoolFeeRecord; ledgerEntry: any }> => {
    const res = await apiClient.patch(`/school-fee/${id}/mark-paid`, payload);
    return res.data.data;
  },

  getVanReceipt: async (id: string): Promise<{ receiptText: string; driverPhone?: string }> => {
    const res = await apiClient.get(`/school-fee/${id}/van-receipt`);
    return res.data.data;
  },

  deleteFee: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/school-fee/${id}`);
    return res.data;
  },
};
