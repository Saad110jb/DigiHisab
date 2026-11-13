import { apiClient } from './client';

export type MandiCity = 'Lahore' | 'Karachi' | 'Rawalpindi' | 'Faisalabad' | 'Multan';
export type CommodityCategory =
  | 'ALL'
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS_FLOUR'
  | 'PULSES'
  | 'POULTRY'
  | 'DAIRY'
  | 'GROCERIES';

export interface ILiveMandiRateItem {
  _id: string;
  commodityKey: string;
  nameEnglish: string;
  nameUrdu: string;
  category: string;
  unit: string;
  city: MandiCity;
  minimumPrice: number;
  maximumPrice: number;
  modalPrice: number;
  yesterdayPrice: number;
  changeAmount: number;
  changePercentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  marketSource: string;
  dateStr: string;
}

export interface ILiveRatesResponse {
  success: boolean;
  city: MandiCity;
  marketSource: string;
  dateStr: string;
  totalItems: number;
  data: ILiveMandiRateItem[];
}

export const mandiRateApi = {
  /**
   * Fetches live daily Mandi auction and retail market rates
   */
  getLiveRates: async (params?: {
    city?: MandiCity;
    category?: string;
    search?: string;
  }): Promise<ILiveRatesResponse> => {
    try {
      const response = await apiClient.get<ILiveRatesResponse>('/mandi/live-rates', {
        params,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Fetches 30-day historical price trend for a commodity
   */
  getHistoricalTrend: async (
    commodityKey: string,
    city?: MandiCity,
    days: number = 30
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`/mandi/historical-trend/${commodityKey}`, {
        params: { city, days },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  /**
   * Forces refresh of today's rate table across Pakistani market committees
   */
  syncNow: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post('/mandi/sync-now');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },
};
