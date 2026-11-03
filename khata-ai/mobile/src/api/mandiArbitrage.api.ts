import { apiClient } from './client';

export interface IPriceCreepAlert {
  commodityKey: string;
  itemName: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  currentUnitPrice: number;
  previousUnitPrice: number;
  priceDelta: number;
  percentHike: number;
  lastPurchaseDate: string;
  previousPurchaseDate: string;
  messageUr: string;
  messageEn: string;
  severity: 'WARNING' | 'CRITICAL';
}

export interface IOptimalVendorQuote {
  commodityKey: string;
  itemName: string;
  lowestPrice: number;
  highestPrice: number;
  arbitrageSpread: number;
  bestSupplier: {
    id: string;
    name: string;
    phone: string;
    lastQuotedDate: string;
  };
  otherSuppliers: Array<{
    id: string;
    name: string;
    phone: string;
    unitPrice: number;
    differenceFromBest: number;
    lastQuotedDate: string;
  }>;
  potentialSavingsPercent: number;
  recommendedActionUr: string;
  recommendedActionEn: string;
}

export interface IMandiRadarSummary {
  priceCreeps: IPriceCreepAlert[];
  optimalQuotes: IOptimalVendorQuote[];
  totalTrackedCommodities: number;
  totalSuppliersAudited: number;
  potentialTotalSavingsEstimated: number;
}

export interface IBillItemEvaluation {
  itemName: string;
  enteredUnitPrice: number;
  lastSupplierUnitPrice?: number;
  lowestMarketUnitPrice?: number;
  priceCreepDetected: boolean;
  creepAmount?: number;
  creepPercent?: number;
  betterSupplierAvailable: boolean;
  betterSupplierName?: string;
  betterSupplierPhone?: string;
  savingsPerUnit?: number;
  alertSeverity?: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  alertMessageUr?: string;
  alertMessageEn?: string;
}

export const mandiArbitrageApi = {
  getSummary: async (): Promise<{ success: boolean; data: IMandiRadarSummary; message?: string }> => {
    try {
      const response = await apiClient.get('/mandi-radar/summary');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },

  evaluateBillItems: async (
    items: Array<{ name: string; unitPrice: number; quantity?: number }>,
    supplierId?: string
  ): Promise<{ success: boolean; data: IBillItemEvaluation[]; message?: string }> => {
    try {
      const response = await apiClient.post('/mandi-radar/evaluate-bill-items', {
        items,
        supplierId,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      throw error;
    }
  },
};
