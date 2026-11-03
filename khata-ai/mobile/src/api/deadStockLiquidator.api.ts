import { apiClient } from './client';

export type HazardLevel = 'CRITICAL' | 'WARNING' | 'DORMANT' | 'SAFE';

export interface ITurnoverHazardItem {
  id: string;
  itemName: string;
  sku: string;
  category: string;
  stockOnHand: number;
  wholesaleCost: number;
  retailPrice: number;
  lockedCapital: number;
  expiryDate?: string;
  daysRemainingToExpiry?: number;
  dailySalesVelocity: number;
  daysToNaturalDepletion: number;
  turnoverHazardIndex: number;
  hazardLevel: HazardLevel;
  markdownDiscountPercent: number;
  markdownPrice?: number;
  recommendedMarkdown: number;
  alertUrdu: string;
  alertEn: string;
}

export interface IHighMarginBundle {
  id: string;
  titleUrdu: string;
  titleEn: string;
  anchorItem: {
    id: string;
    itemName: string;
    stockOnHand: number;
    retailPrice: number;
    wholesaleCost: number;
    daysRemainingToExpiry?: number;
    hazardLevel: HazardLevel;
  };
  driverItem: {
    id: string;
    itemName: string;
    stockOnHand: number;
    retailPrice: number;
    wholesaleCost: number;
    dailySalesVelocity: number;
  };
  originalCombinedRetail: number;
  totalWholesaleCost: number;
  bundleDiscountPercent: number;
  bundleRetailPrice: number;
  customerSavings: number;
  netGrossMarginPercent: number;
  bundleProfitPKR: number;
  urgencyDays?: number;
  marketingCopyUr: string;
  marketingCopyEn: string;
}

export interface IDeadStockSummary {
  totalLockedDeadCapital: number;
  criticalHazardCount: number;
  warningHazardCount: number;
  dormantItemsCount: number;
  safeItemsCount: number;
  turnoverHazards: ITurnoverHazardItem[];
  smartBundles: IHighMarginBundle[];
}

export const deadStockLiquidatorApi = {
  getSummary: async (): Promise<{ success: boolean; data: IDeadStockSummary; message?: string }> => {
    try {
      const response = await apiClient.get('/dead-stock/summary');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  getBundles: async (): Promise<{ success: boolean; data: IHighMarginBundle[]; message?: string }> => {
    try {
      const response = await apiClient.get('/dead-stock/bundles');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  applyMarkdown: async (
    itemId: string,
    discountPercent: number
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const response = await apiClient.post('/dead-stock/apply-markdown', {
        itemId,
        discountPercent,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },
};
