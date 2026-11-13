import { apiClient } from './client';

export type KametiRole = 'PARTICIPANT' | 'ORGANIZER';
export type DomesticKametiStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
export type MemberInviteStatus = 'LINKED' | 'INVITE_PENDING' | 'UNREGISTERED';
export type KametiType = 'STANDARD_ROTATING' | 'LUCKY_DRAW' | 'NEELAAM_BID';
export type PayoutStatus = 'SCHEDULED' | 'DISBURSED' | 'SKIPPED';

export interface IKametiDrawScheduleItem {
  _id?: string;
  cycleNumber: number;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  isPinned: boolean;
  expectedPayoutAmount: number;
  bidDiscountAmount?: number;
  dividendPerMember?: number;
  netPayoutAmount: number;
  payoutStatus: PayoutStatus;
  payoutDate?: string;
  voucherNumber?: string;
  disbursedByVaultId?: string;
  paymentMode?: string;
  notes?: string;
}

export interface IPayoutVoucher {
  _id?: string;
  voucherNumber: string;
  cycleNumber: number;
  recipientName: string;
  recipientPhone?: string;
  grossPoolAmount: number;
  bidDiscountAmount: number;
  netAmount: number;
  paymentMode: string;
  disbursementDate: string;
  shareSlipText: string;
}

export interface IKametiMatrixMember {
  memberId: string;
  memberName: string;
  memberPhone?: string;
  payoutMonth: number;
  payoutReceived: boolean;
  payoutStatus: PayoutStatus;
  netPayoutAmount: number;
  voucherNumber?: string;
  cycles: Array<{
    cycleNumber: number;
    status: 'PAID' | 'DUE' | 'OVERDUE' | 'FUTURE';
  }>;
}

export interface IKametiMatrixResponse {
  kametiId: string;
  title: string;
  totalMonths: number;
  currentCycle: number;
  monthlyContribution: number;
  poolAmount: number;
  matrix: IKametiMatrixMember[];
}

export interface IKametiReminderItem {
  memberId: string;
  memberName: string;
  memberPhone?: string;
  amountDue: number;
  cycleNumber: number;
  whatsappUrl?: string;
  reminderText: string;
}

export interface IInstallmentPayment {
  _id?: string;
  cycleNumber: number;
  monthKey: string;
  paidAmount: number;
  paymentDate: string;
  debitedFromVaultAccountId?: string;
  paymentMode: string;
  transactionId?: string;
  notes?: string;
}

export interface IOrganizerMember {
  _id?: string;
  memberName: string;
  memberPhone?: string;
  normalizedPhone?: string;
  memberProfileId?: string;
  inviteStatus?: MemberInviteStatus;
  payoutMonth: number;
  payoutReceived: boolean;
  paidCycles: number[];
  lastNotifiedAt?: string;
  joinedAt?: string;
}

export interface IMemberLookupResult {
  isRegistered: boolean;
  isGharPersona: boolean;
  profileId?: string;
  memberName?: string;
  normalizedPhone?: string;
}

export interface IDomesticKameti {
  _id: string;
  title: string;
  role: KametiRole;
  organizerName: string;
  organizerPhone?: string;

  monthlyContribution: number;
  totalMonths: number;
  poolAmount: number;
  startDate: string;

  currentCycle: number;
  status: DomesticKametiStatus;

  userPayoutMonth: number;
  payoutReceived: boolean;
  payoutDate?: string;
  payoutAmountReceived?: number;
  creditedToVaultAccountId?: string;

  installments: IInstallmentPayment[];
  members: IOrganizerMember[];

  // Kameti Draw & Bidding Auction Extensions
  kametiType?: KametiType;
  isDrawCompleted?: boolean;
  drawDate?: string;
  drawSeedHash?: string;
  drawSchedule?: IKametiDrawScheduleItem[];
  payoutVouchers?: IPayoutVoucher[];

  notes?: string;

  // Enriched metrics
  totalPaidSoFar: number;
  totalPaidCycles: number;
  remainingOutflow: number;
  monthsRemainingUntilPayout: number;
  isPayoutDueNow: boolean;
  isPayoutUpcoming: boolean;
  isPostPayoutDebtor: boolean;
  postPayoutLiability: number;
  progressPercentage: number;

  createdAt: string;
  updatedAt: string;
}

export interface IKametiSummary {
  totalActiveCount: number;
  totalMonthlyOutflow: number;
  totalCapitalSaved: number;
  nextUpcomingPayout?: {
    title: string;
    poolAmount: number;
    userPayoutMonth: number;
    monthsRemaining: number;
    isDueNow: boolean;
  } | null;
}

export interface IVaultOption {
  id: string;
  accountTitle: string;
  accountType: string;
  institutionName: string;
  currentBalance: number;
}

export interface IKametiOverviewResponse {
  summary: IKametiSummary;
  kametis: IDomesticKameti[];
  availableVaults: IVaultOption[];
}

export interface CreateKametiPayload {
  title: string;
  role?: KametiRole;
  organizerName?: string;
  organizerPhone?: string;
  monthlyContribution: number;
  totalMonths: number;
  startDate?: string;
  userPayoutMonth?: number;
  notes?: string;
  members?: Array<{
    memberName: string;
    memberPhone?: string;
    payoutMonth: number;
    payoutReceived?: boolean;
    paidCycles?: number[];
  }>;
}

export const domesticKametiApi = {
  getKametis: async (): Promise<IKametiOverviewResponse> => {
    const res = await apiClient.get('/domestic/kameti');
    return res.data.data;
  },

  createKameti: async (payload: CreateKametiPayload): Promise<IDomesticKameti> => {
    const res = await apiClient.post('/domestic/kameti', payload);
    return res.data.data;
  },

  payInstallment: async (
    kametiId: string,
    payload: {
      cycleNumber?: number;
      amount?: number;
      debitedFromVaultAccountId?: string;
      paymentMode?: string;
      transactionId?: string;
      notes?: string;
    }
  ): Promise<IDomesticKameti> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/pay-installment`, payload);
    return res.data.data;
  },

  collectPayout: async (
    kametiId: string,
    payload: {
      creditedToVaultAccountId?: string;
      amount?: number;
      paymentMode?: string;
      notes?: string;
    }
  ): Promise<IDomesticKameti> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/collect-payout`, payload);
    return res.data.data;
  },

  advanceCycle: async (kametiId: string): Promise<IDomesticKameti> => {
    const res = await apiClient.patch(`/domestic/kameti/${kametiId}/advance-cycle`);
    return res.data.data;
  },

  deleteKameti: async (kametiId: string): Promise<void> => {
    await apiClient.delete(`/domestic/kameti/${kametiId}`);
  },

  getShareSlip: async (
    kametiId: string,
    cycleNumber?: number
  ): Promise<{ shareText: string; kametiTitle: string }> => {
    const res = await apiClient.get(
      `/domestic/kameti/${kametiId}/share-text${cycleNumber ? `?cycleNumber=${cycleNumber}` : ''}`
    );
    return res.data.data;
  },

  lookupMember: async (phone: string): Promise<IMemberLookupResult> => {
    const res = await apiClient.post('/domestic/kameti/lookup-member', { phone });
    return res.data.data;
  },

  addMember: async (
    kametiId: string,
    payload: {
      memberName: string;
      memberPhone?: string;
      payoutMonth: number;
    }
  ): Promise<{
    kameti: IDomesticKameti;
    addedMember: IOrganizerMember;
    isGharUser: boolean;
    whatsappInvite: string;
  }> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/members`, payload);
    return res.data.data;
  },

  toggleMemberPayment: async (
    kametiId: string,
    memberId: string,
    cycleNumber?: number
  ): Promise<IDomesticKameti> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/members/${memberId}/toggle-paid`, {
      cycleNumber,
    });
    return res.data.data;
  },

  getMemberInviteSlip: async (
    kametiId: string,
    memberId: string
  ): Promise<{ shareText: string; memberName: string; memberPhone?: string }> => {
    const res = await apiClient.get(`/domestic/kameti/${kametiId}/members/${memberId}/invite-text`);
    return res.data.data;
  },

  swapPayoutMonths: async (
    kametiId: string,
    payload: {
      memberId1: string;
      memberId2?: string;
      newPayoutMonth?: number;
    }
  ): Promise<IDomesticKameti> => {
    const res = await apiClient.patch(`/domestic/kameti/${kametiId}/swap-payout-months`, payload);
    return res.data.data;
  },

  deleteMember: async (kametiId: string, memberId: string): Promise<IDomesticKameti> => {
    const res = await apiClient.delete(`/domestic/kameti/${kametiId}/members/${memberId}`);
    return res.data.data;
  },

  runDraw: async (
    kametiId: string,
    payload: {
      kametiType?: KametiType;
      pinnedSlots?: Array<{ memberId?: string; memberName?: string; month: number }>;
      bidWinnerMemberId?: string;
      bidDiscountAmount?: number;
    }
  ): Promise<{
    kameti: IDomesticKameti;
    schedule: IKametiDrawScheduleItem[];
    drawSeedHash: string;
    dividendPerMember: number;
  }> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/run-draw`, payload);
    return res.data.data;
  },

  disbursePayout: async (
    kametiId: string,
    payload: {
      cycleNumber?: number;
      debitedFromVaultAccountId?: string;
      paymentMode?: string;
      notes?: string;
    }
  ): Promise<{
    voucherNumber: string;
    thermalChit: string;
    whatsappSlip: string;
    kameti: IDomesticKameti;
  }> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/disburse-payout`, payload);
    return res.data.data;
  },

  getPayoutVoucher: async (
    kametiId: string,
    cycleNumber: number
  ): Promise<{
    voucherNumber: string;
    thermalChit: string;
    shareText: string;
    recipientName: string;
    recipientPhone?: string;
    netAmount: number;
    cycleNumber: number;
    isDisbursed: boolean;
  }> => {
    const res = await apiClient.get(`/domestic/kameti/${kametiId}/payout-voucher/${cycleNumber}`);
    return res.data.data;
  },

  sendReminders: async (
    kametiId: string,
    cycleNumber?: number
  ): Promise<{
    cycleNumber: number;
    totalUnpaid: number;
    reminders: IKametiReminderItem[];
  }> => {
    const res = await apiClient.post(`/domestic/kameti/${kametiId}/send-reminders`, { cycleNumber });
    return res.data.data;
  },

  getMatrix: async (kametiId: string): Promise<IKametiMatrixResponse> => {
    const res = await apiClient.get(`/domestic/kameti/${kametiId}/matrix`);
    return res.data.data;
  },
};
