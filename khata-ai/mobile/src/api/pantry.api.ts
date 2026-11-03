import { apiClient } from './client';

export type PantryCategory = 'GRAIN' | 'OIL_GHEE' | 'PULSE' | 'SWEETENER' | 'TEA_BEVERAGE' | 'SPICE' | 'CLEANING';
export type PantryUnit = 'KG' | 'LITRE' | 'PACK' | 'GRAM';

export interface IPantryItem {
  _id: string;
  nameUrdu: string;
  nameEnglish: string;
  category: PantryCategory;
  initialStockQty: number;
  currentStockQty: number;
  unit: PantryUnit;
  purchaseDate: string;
  dailyBurnRate: number;
  expectedDays: number;
  daysRemaining: number;
  depletionDate?: string;
  reservePercentage: number;
  isUrgentRestock: boolean;
  recommendedRestockQty: number;
  lastRestockedDate?: string;
  notes?: string;
}

export interface IHouseholdPantryProfile {
  _id: string;
  householdSize: number;
  dietaryProfile: 'LIGHT' | 'MODERATE' | 'HEAVY';
  autoSyncWithRashanPlan: boolean;
  whatsappTargetPhone?: string;
}

export interface IPantryStatusResponse {
  profile: IHouseholdPantryProfile;
  householdSize: number;
  urgentCount: number;
  upcomingCount: number;
  totalItemsCount: number;
  items: IPantryItem[];
  whatsAppText: string;
}

export const pantryApi = {
  getStatus: async (): Promise<IPantryStatusResponse> => {
    const res = await apiClient.get('/domestic/pantry/status');
    return res.data.data;
  },

  addItem: async (payload: {
    nameUrdu: string;
    nameEnglish?: string;
    category: PantryCategory;
    initialStockQty: number;
    unit: PantryUnit;
    purchaseDate?: string;
    perPersonDailyNorm?: number;
    customDailyBurn?: number;
    recommendedRestockQty?: number;
    notes?: string;
  }): Promise<IPantryItem> => {
    const res = await apiClient.post('/domestic/pantry/item', payload);
    return res.data.data;
  },

  restockItem: async (
    id: string,
    payload?: { restockQty?: number; newPurchaseDate?: string }
  ): Promise<IPantryItem> => {
    const res = await apiClient.patch(`/domestic/pantry/item/${id}/restock`, payload || {});
    return res.data.data;
  },

  adjustStock: async (id: string, currentStockQty: number): Promise<IPantryItem> => {
    const res = await apiClient.patch(`/domestic/pantry/item/${id}/adjust`, { currentStockQty });
    return res.data.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/domestic/pantry/item/${id}`);
  },

  updateProfile: async (payload: {
    householdSize?: number;
    dietaryProfile?: 'LIGHT' | 'MODERATE' | 'HEAVY';
    whatsappTargetPhone?: string;
  }): Promise<IHouseholdPantryProfile> => {
    const res = await apiClient.post('/domestic/pantry/profile', payload);
    return res.data.data;
  },
};
