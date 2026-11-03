import { apiClient } from './client';

export type NisabStandard = 'SILVER' | 'GOLD';
export type WeightUnit = 'TOLA' | 'GRAM';
export type GoldPurity = '24K' | '22K' | '21K' | '18K';
export type CharityType = 'ZAKAT' | 'SADQAH' | 'FITRANA';
export type MustahiqCategory =
  | 'RELATIVES'
  | 'DOMESTIC_STAFF'
  | 'WIDOW_ORPHAN'
  | 'MEDICAL_PATIENT'
  | 'MADRASSA_STUDENT'
  | 'DEBTOR_RELIEF'
  | 'GENERAL_NEED';

export type CharityPaymentMode = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'OTHER';

export interface IGoldHolding {
  weight: number;
  unit: WeightUnit;
  purity: GoldPurity;
  ratePerTola: number;
  calculatedValue: number;
}

export interface ISilverHolding {
  weight: number;
  unit: WeightUnit;
  ratePerTola: number;
  calculatedValue: number;
}

export interface ICharityDisbursement {
  _id: string;
  recipientName: string;
  recipientCategory: MustahiqCategory;
  purpose: string;
  amount: number;
  disbursementDate: string;
  charityType: CharityType;
  debitedFromVaultAccountId?: string;
  paymentMode: CharityPaymentMode;
  isAnonymous: boolean;
  voucherNumber: string;
  notes?: string;
}

export interface IZakatAssessment {
  _id: string;
  hijriYear: string;
  assessmentDate: string;
  nisabStandard: NisabStandard;

  goldRatePerTola: number;
  silverRatePerTola: number;
  nisabThresholdValue: number;

  cashInHand: number;
  bankBalances: number;
  digitalWallets: number;

  goldHoldings: IGoldHolding;
  silverHoldings: ISilverHolding;

  kametiReceivables: number;
  recoverableLoans: number;
  businessInventoryValue: number;

  unpaidUtilityBills: number;
  unpaidSchoolFees: number;
  unpaidStaffSalaries: number;
  otherShortTermDebts: number;

  totalGrossEligibleAssets: number;
  totalDeductions: number;
  netTaxableWealth: number;
  isEligibleForZakat: boolean;
  totalZakatDue: number;

  disbursements: ICharityDisbursement[];
  totalZakatDistributed: number;
  remainingZakatBalance: number;

  createdAt: string;
  updatedAt: string;
}

export interface IVaultOption {
  id: string;
  accountTitle: string;
  accountType: string;
  institutionName: string;
  currentBalance: number;
}

export interface IFitranaEstimate {
  id: string;
  nameUrdu: string;
  ratePerHead: number;
  description: string;
  totalFitrana: number;
}

export interface IZakatOverviewResponse {
  assessment: IZakatAssessment;
  availableVaults: IVaultOption[];
}

export const zakatApi = {
  getAssessment: async (): Promise<IZakatOverviewResponse> => {
    const res = await apiClient.get('/domestic/zakat');
    return res.data.data;
  },

  syncWithVaults: async (): Promise<IZakatAssessment> => {
    const res = await apiClient.post('/domestic/zakat/sync-vault');
    return res.data.data;
  },

  calculate: async (payload: Partial<IZakatAssessment>): Promise<IZakatAssessment> => {
    const res = await apiClient.post('/domestic/zakat/calculate', payload);
    return res.data.data;
  },

  disburse: async (payload: {
    recipientName: string;
    recipientCategory?: MustahiqCategory;
    purpose: string;
    amount: number;
    charityType?: CharityType;
    debitedFromVaultAccountId?: string;
    paymentMode?: CharityPaymentMode;
    isAnonymous?: boolean;
    notes?: string;
  }): Promise<{ assessment: IZakatAssessment; voucherNumber: string }> => {
    const res = await apiClient.post('/domestic/zakat/disburse', payload);
    return res.data.data;
  },

  deleteDisbursement: async (id: string): Promise<IZakatAssessment> => {
    const res = await apiClient.delete(`/domestic/zakat/disburse/${id}`);
    return res.data.data;
  },

  getFitranaEstimate: async (heads: number): Promise<{ householdHeads: number; estimates: IFitranaEstimate[] }> => {
    const res = await apiClient.get(`/domestic/zakat/fitrana?heads=${heads}`);
    return res.data.data;
  },

  getShareText: async (id: string): Promise<{ shareText: string; voucherNumber: string }> => {
    const res = await apiClient.get(`/domestic/zakat/share-text/${id}`);
    return res.data.data;
  },
};
