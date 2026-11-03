import { apiClient } from './client';

export type DomesticModuleKey =
  | 'RASHAN'
  | 'MANDI'
  | 'UTILITY'
  | 'KAMETI'
  | 'STAFF'
  | 'SCHOOL_FEE'
  | 'HOME_REPAIR'
  | 'MEDICAL'
  | 'GENERAL';

export type DomesticVoucherType = 'CPV' | 'BPV' | 'WPV' | 'CRV' | 'BRV' | 'JV';

export type BudgetBurnVelocity = 'NORMAL' | 'FAST' | 'CRITICAL_SPIKE';

export interface IJevValidationResult {
  isSolvent: boolean;
  shortageAmount: number;
  availableChannelBalance: number;
  channelInspected: string;
  voucherType: DomesticVoucherType;
  voucherNumber: string;
  recommendedTransfer?: {
    fromVaultId: string;
    fromAccountTitle: string;
    toVaultId: string;
    toAccountTitle: string;
    suggestedTransferAmount: number;
    reasonUrdu: string;
    reasonEn: string;
  };
  sinkingFundStatus?: {
    isAvailable: boolean;
    bucketId: string;
    bucketTitle: string;
    currentSavedAmount: number;
    coversFullAmount: boolean;
    suggestedOffsetAmount: number;
    promptUrdu: string;
  };
  budgetGuidance: {
    categoryKey: string;
    monthlyBudgetCap: number;
    currentSpentMtd: number;
    projectedTotalAfterExpense: number;
    headroomRemaining: number;
    isOverbudget: boolean;
    overbudgetPercentage: number;
    burnVelocityRate: BudgetBurnVelocity;
    adviceMessageUrdu: string;
    adviceMessageEn: string;
  };
}

export interface ICategoryBudgetStatus {
  categoryKey: DomesticModuleKey;
  budgetCap: number;
  spentMtd: number;
  headroomRemaining: number;
  percentageUsed: number;
  isOverbudget: boolean;
}

export interface IHouseholdBudgetRadarData {
  currentMonth: string;
  dayOfMonth: number;
  daysInMonth: number;
  totalHouseholdBudgetCap: number;
  totalSpentMtd: number;
  overallHeadroom: number;
  overallPercentageUsed: number;
  categoryBreakdown: ICategoryBudgetStatus[];
}

export const domesticJevGuardianApi = {
  /**
   * Validate solvency, sinking fund matching, and budget headroom for any domestic transaction
   */
  validateTransaction: async (payload: {
    sourceModule: DomesticModuleKey;
    amount: number;
    vaultAccountId?: string;
    paymentChannel?: string;
    categoryTitle?: string;
    sinkingFundCategory?: string;
  }): Promise<IJevValidationResult> => {
    const res = await apiClient.post<{ success: boolean; data: IJevValidationResult }>(
      '/domestic/jev-guardian/validate',
      payload
    );
    return res.data.data;
  },

  /**
   * 1-Tap ATM Inter-Vault Transfer (e.g. Bank ATM Withdrawal -> Cash Safe)
   */
  resolveVaultShortage: async (payload: {
    fromVaultId: string;
    toVaultId: string;
    amount: number;
    notes?: string;
  }): Promise<{
    fromVault: any;
    toVault: any;
    journalVoucher: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { fromVault: any; toVault: any; journalVoucher: string };
    }>('/domestic/jev-guardian/resolve-shortage', payload);
    return res.data.data;
  },

  /**
   * Get household budget radar and expenditure velocity across all categories
   */
  getBudgetRadar: async (): Promise<IHouseholdBudgetRadarData> => {
    const res = await apiClient.get<{ success: boolean; data: IHouseholdBudgetRadarData }>(
      '/domestic/jev-guardian/budget-radar'
    );
    return res.data.data;
  },

  /**
   * Commit guarded expense atomically
   */
  commitExpense: async (payload: {
    sourceModule: DomesticModuleKey;
    amount: number;
    vaultAccountId?: string;
    description?: string;
    useSinkingFundOffset?: boolean;
    sinkingBucketId?: string;
    voucherNumber?: string;
    category?: string;
  }): Promise<{
    voucherNumber: string;
    ledgerEntry: any;
    updatedVault: any;
    updatedBucket: any;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: any;
    }>('/domestic/jev-guardian/commit-expense', payload);
    return res.data.data;
  },
};
