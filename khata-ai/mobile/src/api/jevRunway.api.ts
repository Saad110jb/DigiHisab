import { apiClient } from './client';

export type JevRunwayState = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface IJevLiquidityHorizon {
  safe_runway_days: number;
  stockout_hazard_within_7d: number;
  recommended_min_float: number;
  runway_state: JevRunwayState;
  breakdown: {
    current_galla_cash: number;
    bank_account: number;
    digital_wallet: number;
    total_liquid_reserves: number;
    active_scope?: 'TILL_ONLY' | 'ALL_CHANNELS';
    expected_daily_cash_inflow: number;
    expected_daily_burn_rate: number;
    scheduled_payables_next_7d: number;
    scheduled_payables_next_30d: number;
    staff_payroll_obligations_next_7d?: number;
    staff_payroll_obligations_next_30d?: number;
    critical_stock_reorder_cost: number;
    critical_items_count: number;
    simulation_paths: {
      conservative_runway_days: number;
      expected_runway_days: number;
      pessimistic_runway_days: number;
    };
  };
  messages: {
    en: string;
    ur: string;
  };
  urgent_recovery_customers: Array<{
    customerId: string;
    name: string;
    phone: string;
    owedAmount: number;
    lagDays: number;
    riskTier: string;
  }>;
}

export interface IJevLiquidityRadarResponse {
  success: boolean;
  data: IJevLiquidityHorizon;
  message?: string;
}

export const jevRunwayApi = {
  getLiquidityRadar: async (scope?: 'TILL_ONLY' | 'ALL_CHANNELS'): Promise<IJevLiquidityRadarResponse> => {
    try {
      const response = await apiClient.get('/finance/liquidity-radar', {
        params: scope ? { scope } : undefined,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};
