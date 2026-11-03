import { apiClient } from './client';

export type IncomeSourceType =
  | 'SALARY'
  | 'SHOP_PROFIT_DRAWING'
  | 'RENTAL_YIELD'
  | 'FOREIGN_REMITTANCE'
  | 'AGRICULTURE'
  | 'FREELANCE_TUITION'
  | 'OTHER';

export type VaultAccountType =
  | 'PHYSICAL_CASH_SAFE'
  | 'COMMERCIAL_BANK'
  | 'MOBILE_WALLET'
  | 'DIGITAL_GOLD';

export interface IVaultAccount {
  id: string;
  accountTitle: string;
  accountType: VaultAccountType;
  institutionName: string; // e.g., 'Meezan Bank', 'JazzCash', 'Home Cash Box'
  accountIdentifier?: string; // Last 4 digits or mobile number
  currentBalance: number;
  lastReconciledAt: string;
  notes?: string;
}

export interface ISavingsBucket {
  id: string;
  title: string;
  category: 'EMERGENCY_MEDICAL' | 'QURBANI_EID' | 'KAMETI_POOL' | 'HOME_REPAIR' | 'CHILD_EDUCATION';
  targetAmount: number;
  currentSavedAmount: number;
  monthlyDepositTarget: number;
  linkedVaultAccountId: string;
  targetDate?: string;
  isCompleted?: boolean;
  notes?: string;
}

export interface IHouseholdIncomeRecord {
  id: string;
  sourceType: IncomeSourceType;
  title: string;
  amount: number;
  dateReceived: string;
  depositedToAccountId: string; // References IVaultAccount.id
  isRecurringMonthly: boolean;
  crvNumber?: string;
  notes?: string;
}

export interface IHouseholdSolvencyReport {
  totalLiquidCapital: number;
  totalMonthlyIncome: number;
  totalLockedSavings: number;
  totalGoldReserves?: number;
  totalCommittedEnvelopes: number;
  netFreeCashflow: number;
  isSolvent: boolean;
  deficitAmount: number;
  runwayDays: number;
  breakdown: {
    rashanCommitment: number;
    utilityBillsCommitment: number;
    schoolFeesCommitment: number;
    milkBreadCommitment: number;
    maidSalaryCommitment: number;
    savingsCommitment: number;
  };
}

export interface IHouseholdTreasuryOverview {
  vaultAccounts: IVaultAccount[];
  savingsBuckets: ISavingsBucket[];
  incomeRecords: IHouseholdIncomeRecord[];
  solvencyReport: IHouseholdSolvencyReport;
}

export const householdVaultApi = {
  getOverview: async (): Promise<IHouseholdTreasuryOverview> => {
    const res = await apiClient.get('/domestic/income-vault/overview');
    return res.data.data;
  },

  getSolvencyReport: async (): Promise<IHouseholdSolvencyReport> => {
    const res = await apiClient.get('/domestic/income-vault/solvency');
    return res.data.data;
  },

  logIncome: async (payload: {
    sourceType: IncomeSourceType;
    title: string;
    amount: number;
    dateReceived?: string;
    depositedToAccountId: string;
    isRecurringMonthly: boolean;
    notes?: string;
  }): Promise<{
    incomeRecord: IHouseholdIncomeRecord;
    updatedVault: Partial<IVaultAccount>;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.post('/domestic/income-vault/income', payload);
    return res.data.data;
  },

  createVaultAccount: async (payload: {
    accountTitle: string;
    accountType: VaultAccountType;
    institutionName: string;
    accountIdentifier?: string;
    currentBalance: number;
    notes?: string;
  }): Promise<{
    vault: IVaultAccount;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.post('/domestic/income-vault/vault-accounts', payload);
    return res.data.data;
  },

  adjustVaultBalance: async (
    vaultId: string,
    payload: { newBalance: number; reason?: string }
  ): Promise<{
    vault: IVaultAccount;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.patch(
      `/domestic/income-vault/vault-accounts/${vaultId}/adjust-balance`,
      payload
    );
    return res.data.data;
  },

  transferBetweenVaults: async (payload: {
    fromVaultId: string;
    toVaultId: string;
    amount: number;
    notes?: string;
  }): Promise<{
    fromVault: Partial<IVaultAccount>;
    toVault: Partial<IVaultAccount>;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.post('/domestic/income-vault/vault-accounts/transfer', payload);
    return res.data.data;
  },

  createSavingsBucket: async (payload: {
    title: string;
    category: ISavingsBucket['category'];
    targetAmount: number;
    currentSavedAmount?: number;
    monthlyDepositTarget: number;
    linkedVaultAccountId?: string;
    targetDate?: string;
    notes?: string;
  }): Promise<{
    bucket: ISavingsBucket;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.post('/domestic/income-vault/savings-buckets', payload);
    return res.data.data;
  },

  depositToSavingsBucket: async (
    bucketId: string,
    payload: {
      sourceVaultAccountId: string;
      amount: number;
      notes?: string;
    }
  ): Promise<{
    bucket: ISavingsBucket;
    sourceVault: Partial<IVaultAccount>;
    solvencyReport: IHouseholdSolvencyReport;
  }> => {
    const res = await apiClient.post(
      `/domestic/income-vault/savings-buckets/${bucketId}/deposit`,
      payload
    );
    return res.data.data;
  },
};
