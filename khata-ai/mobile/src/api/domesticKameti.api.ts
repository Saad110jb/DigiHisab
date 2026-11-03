import { apiClient } from './client';

export type KametiRole = 'PARTICIPANT' | 'ORGANIZER';
export type DomesticKametiStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
export type MemberInviteStatus = 'LINKED' | 'INVITE_PENDING' | 'UNREGISTERED';

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
};
