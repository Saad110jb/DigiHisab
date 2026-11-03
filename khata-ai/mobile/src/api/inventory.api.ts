import { apiClient } from './client';

export type UnitOfMeasure = 'PCS' | 'KG' | 'LITER' | 'PACK' | 'BOX';

export interface IInventoryItem {
  _id: string;
  profileId: string;
  sku: string;
  barcode?: string;
  itemName: string;
  category: string;
  stockOnHand: number;
  lowStockThreshold: number;
  wholesaleCost: number;
  retailPrice: number;
  unitOfMeasure: UnitOfMeasure;
  supplierCounterpartyId?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
}

export interface CreateInventoryItemPayload {
  sku?: string;
  barcode?: string;
  itemName: string;
  category?: string;
  stockOnHand?: number;
  lowStockThreshold?: number;
  wholesaleCost: number;
  retailPrice: number;
  unitOfMeasure?: UnitOfMeasure;
  supplierCounterpartyId?: string;
  isActive?: boolean;
}

export const inventoryApi = {
  getAll: async (params?: {
    category?: string;
    search?: string;
    isLowStock?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: IInventoryItem[]; pagination: any }> => {
    const res = await apiClient.get('/inventory', { params });
    return res.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: IInventoryItem }> => {
    const res = await apiClient.get(`/inventory/${id}`);
    return res.data;
  },

  create: async (payload: CreateInventoryItemPayload): Promise<{ success: boolean; message: string; data: IInventoryItem }> => {
    const res = await apiClient.post('/inventory', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<CreateInventoryItemPayload>): Promise<{ success: boolean; message: string; data: IInventoryItem }> => {
    const res = await apiClient.put(`/inventory/${id}`, payload);
    return res.data;
  },

  adjustStock: async (
    id: string,
    payload: { adjustmentType: 'RESTOCK' | 'DEDUCTION' | 'SET_EXACT'; quantity: number; notes?: string }
  ): Promise<{ success: boolean; message: string; data: { item: IInventoryItem; previousStock: number; newStock: number; isLowStock: boolean } }> => {
    const res = await apiClient.patch(`/inventory/${id}/adjust-stock`, payload);
    return res.data;
  },

  getLowStockAlerts: async (): Promise<{ success: boolean; count: number; data: IInventoryItem[] }> => {
    const res = await apiClient.get('/inventory/low-stock-alerts');
    return res.data;
  },

  delete: async (id: string, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/inventory/${id}`, { params: { hardDelete } });
    return res.data;
  },

  getRestockPredictions: async (): Promise<{ success: boolean; count: number; data: any[] }> => {
    const res = await apiClient.get('/inventory/restock-predictions');
    return res.data;
  },

  dispatchStockoutAlerts: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/inventory/dispatch-stockout-alerts');
    return res.data;
  },
};
