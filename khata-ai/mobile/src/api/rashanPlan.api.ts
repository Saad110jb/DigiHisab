import { apiClient } from './client';

export type RashanCategory = 'GRAIN' | 'OIL_GHEE' | 'PULSE' | 'SWEETENER' | 'SPICE' | 'CLEANING';
export type RashanUnit = 'KG' | 'LITRE' | 'PACK' | 'GRAM';

export interface IRashanItem {
  id: string;
  nameUrdu: string;
  nameEnglish: string;
  category: RashanCategory;
  targetQty: number;
  unit: RashanUnit;
  estimatedUnitRate: number;
  actualUnitRate?: number;
  actualQtyPurchased?: number;
  isPurchased: boolean;
  notes?: string;
  estimatedTotal: number;
  actualTotal: number;
  variance: number;
  isDeficit: boolean;
  variancePercentage: number;
}

export interface IRashanMonthlyPlan {
  planId: string;
  month: number;
  year: number;
  monthKey: string;
  householdSize: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'RECONCILED';
  reconciledAt?: string;
  paymentMethod?: string;
  totalEstimatedBudget: number;
  customTargetBudget?: number;
  effectiveBudget: number;
  totalActualSpent: number;
  netVariance: number;
  envelopePercentageUsed: number;
  remainingBudget: number;
  totalItemsCount: number;
  purchasedItemsCount: number;
  deficitItemsCount: number;
  items: IRashanItem[];
  whatsAppText: string;
}

export interface ICatalogStaple {
  id: string;
  nameUrdu: string;
  nameEnglish: string;
  category: RashanCategory;
  defaultQty: number;
  unit: RashanUnit;
  defaultRate: number;
  notes?: string;
}

export const rashanPlanApi = {
  /**
   * Get or create monthly rashan plan
   */
  async getCurrentPlan(params?: {
    month?: number;
    year?: number;
    householdSize?: number;
  }): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.get<{ success: boolean; data: IRashanMonthlyPlan }>(
      '/domestic/rashan',
      { params }
    );
    return res.data.data;
  },

  /**
   * Update custom target monthly budget cap
   */
  async updateBudgetCap(
    planId: string,
    customTargetBudget: number | null
  ): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.patch<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/budget-cap`,
      { customTargetBudget }
    );
    return res.data.data;
  },

  /**
   * Get pre-configured master staple catalog
   */
  async getCatalog(): Promise<ICatalogStaple[]> {
    const res = await apiClient.get<{ success: boolean; data: ICatalogStaple[] }>(
      '/domestic/rashan/catalog'
    );
    return res.data.data;
  },

  /**
   * Update item fields (quantity, rate, notes)
   */
  async updateItem(
    planId: string,
    itemId: string,
    updates: Partial<IRashanItem>
  ): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.patch<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/items/${itemId}`,
      updates
    );
    return res.data.data;
  },

  /**
   * Toggle purchase status of an item (Fast In-Store Mode)
   */
  async togglePurchase(
    planId: string,
    itemId: string,
    data: {
      isPurchased: boolean;
      actualQtyPurchased?: number;
      actualUnitRate?: number;
    }
  ): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.post<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/items/${itemId}/purchase`,
      data
    );
    return res.data.data;
  },

  /**
   * Add custom item to the plan
   */
  async addItem(
    planId: string,
    itemData: {
      nameUrdu: string;
      nameEnglish: string;
      category: RashanCategory;
      targetQty: number;
      unit: RashanUnit;
      estimatedUnitRate: number;
      notes?: string;
    }
  ): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.post<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/items`,
      itemData
    );
    return res.data.data;
  },

  /**
   * Delete item from the plan
   */
  async deleteItem(planId: string, itemId: string): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.delete<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/items/${itemId}`
    );
    return res.data.data;
  },

  /**
   * Reset plan to default staples
   */
  async resetDefaults(planId: string, householdSize: number = 5): Promise<IRashanMonthlyPlan> {
    const res = await apiClient.post<{ success: boolean; data: IRashanMonthlyPlan }>(
      `/domestic/rashan/${planId}/reset-defaults`,
      { householdSize }
    );
    return res.data.data;
  },

  /**
   * Reconcile plan and record cash out to ledger
   */
  async reconcilePlan(
    planId: string,
    data: {
      paymentMethod?: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
      recordToLedger?: boolean;
      notes?: string;
    }
  ): Promise<{ plan: IRashanMonthlyPlan; ledgerEntryId?: string }> {
    const res = await apiClient.post<{
      success: boolean;
      data: { plan: IRashanMonthlyPlan; ledgerEntryId?: string };
    }>(`/domestic/rashan/${planId}/reconcile`, data);
    return res.data.data;
  },
};
