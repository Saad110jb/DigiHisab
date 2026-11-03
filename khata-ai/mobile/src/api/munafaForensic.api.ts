import { apiClient } from './client';

export type ForensicPeriod = 'ROZANA' | 'MAHANA' | 'SIX_MONTH' | 'SALANA';

export interface IWaterfallStage {
  id: string;
  stageNameUrdu: string;
  stageNameEnglish: string;
  amount: number;
  percentageOfSales: number;
  type: 'INCOME' | 'DEDUCTION' | 'SUBTOTAL' | 'FINAL';
  descriptionUrdu: string;
  descriptionEnglish: string;
}

export interface ICategoryMarginBreakdown {
  category: string;
  categoryUrdu: string;
  grossSales: number;
  wholesaleCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  allocatedOpex: number;
  netProfit: number;
  netMarginPercent: number;
  status: 'POWERHOUSE' | 'HEALTHY' | 'THIN' | 'BLEEDER';
}

export interface ILossLeaderItem {
  id: string;
  itemName: string;
  sku?: string;
  category: string;
  retailPrice: number;
  wholesaleCost: number;
  packagingAndStorageCost: number;
  badDebtDragPercent: number;
  realUnitNetProfit: number;
  realNetMarginPercent: number;
  salesVolumeEst: number;
  totalMonthlyBleedPkr: number;
  severity: 'CRITICAL_LOSS' | 'CREDIT_TRAP' | 'ZERO_MARGIN';
  diagnosisUrdu: string;
  diagnosisEnglish: string;
  actionRecommendationUrdu: string;
  actionRecommendationEnglish: string;
}

export interface ITaxForensicSummary {
  electricityWhtSec235: number;
  distributorWhtSec236: number;
  totalAdvanceTaxDeducted: number;
  fbrAdjustmentCreditAvailable: number;
  taxComplianceRating: 'SHIELDED' | 'MODERATE_EXPOSURE' | 'HIGH_EXPOSURE';
  advisoryUrdu: string;
}

export interface IForensicAuditReport {
  period: ForensicPeriod;
  dateRangeLabel: string;
  businessName: string;
  metrics: {
    grossSales: number;
    naiveProfit: number;
    trueGrossProfit: number;
    trueGrossMarginPercent: number;
    trueNetMunafa: number;
    trueNetMarginPercent: number;
    hiddenBleedVariance: number;
    totalCustomerTransactions: number;
  };
  waterfall: IWaterfallStage[];
  categoryBreakdown: ICategoryMarginBreakdown[];
  lossLeaders: ILossLeaderItem[];
  taxSummary: ITaxForensicSummary;
}

export const munafaForensicApi = {
  getAuditReport: async (
    period: ForensicPeriod = 'MAHANA'
  ): Promise<{ success: boolean; data: IForensicAuditReport }> => {
    const res = await apiClient.get('/munafa-forensic/audit', {
      params: { period },
    });
    return res.data;
  },
};
