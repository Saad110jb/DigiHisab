import { apiClient } from './client';

export type RunwayHealthState = 'SAFE' | 'CAUTION' | 'DEFICIT_CLIFF';

export interface IDomesticObligationItem {
  id: string;
  sourceModule: 'STAFF' | 'SCHOOL_FEE' | 'UTILITY' | 'KAMETI' | 'PERISHABLES';
  titleUrdu: string;
  titleEn: string;
  dueDayOfMonth: number;
  estimatedAmount: number;
  isPaidThisCycle: boolean;
  actualPaidAmount: number;
  dueDate: string | Date;
}

export interface IRunwaySimulationScenario {
  scenarioKey: 'REALISTIC' | 'FRUGAL' | 'STRESSED';
  nameUrdu: string;
  nameEn: string;
  descriptionUrdu: string;
  adjustedDailySpend: number;
  estimatedRunwayDays: number;
  monthEndSurplusOrDeficit: number;
  surplusDeficitLabelUrdu: string;
}

export interface IJevRunwayTrajectory {
  asOfDate: string;
  nextSalaryDate: string;
  daysToNextSalary: number;
  totalLiquidCapital: number;
  totalLockedSinkingFunds: number;
  totalCommittedPending: number;
  proRatedPerishablesNeeded: number;
  netFreeDiscretionaryCapital: number;
  safeDailyLimit: number;
  projectedMonthEndSurplus: number;
  healthState: RunwayHealthState;
  runwayDaysCalculated: number;
  runwayBadgeUrdu: string;
  runwayBadgeEn: string;
  safeDailyLimitGuidanceUrdu: string;
  safeDailyLimitGuidanceEn: string;
  upcomingObligations: IDomesticObligationItem[];
  simulations: IRunwaySimulationScenario[];
  aiAdviceBulletsUrdu: string[];
}

export interface IWhatIfExpenseSimulationResult {
  proposedExpenseAmount: number;
  netFreeCapitalBefore: number;
  netFreeCapitalAfter: number;
  safeDailyLimitBefore: number;
  safeDailyLimitAfter: number;
  runwayDaysBefore: number;
  runwayDaysAfter: number;
  deltaDays: number;
  causesDeficit: boolean;
  deficitShortfall: number;
  verdictUrdu: string;
  verdictEn: string;
  recommendationUrdu: string;
}

export const domesticRunwayApi = {
  /**
   * Fetch comprehensive 30-day runway trajectory, obligations & simulations
   */
  getRunwayStatus: async (): Promise<IJevRunwayTrajectory> => {
    const res = await apiClient.get<{ success: boolean; data: IJevRunwayTrajectory }>(
      '/domestic/runway/status'
    );
    return res.data.data;
  },

  /**
   * Fetch impending obligations calendar
   */
  getUpcomingObligations: async (): Promise<{
    upcomingObligations: IDomesticObligationItem[];
    totalCommittedPending: number;
    daysToNextSalary: number;
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        upcomingObligations: IDomesticObligationItem[];
        totalCommittedPending: number;
        daysToNextSalary: number;
      };
    }>('/domestic/runway/obligations');
    return res.data.data;
  },

  /**
   * Simulate the impact of a proposed unbudgeted domestic expense
   */
  simulateExpenseImpact: async (proposedExpenseAmount: number): Promise<IWhatIfExpenseSimulationResult> => {
    const res = await apiClient.post<{
      success: boolean;
      data: IWhatIfExpenseSimulationResult;
    }>('/domestic/runway/simulate', { proposedExpenseAmount });
    return res.data.data;
  },
};
