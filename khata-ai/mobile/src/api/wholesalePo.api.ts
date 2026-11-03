import { apiClient } from './client';

export interface IWholesalePOItem {
  inventoryItemId?: string;
  itemName: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
}

export interface IWholesalePO {
  _id: string;
  poNumber: string;
  supplierCounterpartyId: any;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  items: IWholesalePOItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const wholesalePoApi = {
  getAll: async (params?: {
    supplierCounterpartyId?: string;
    status?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: IWholesalePO[]; pagination: any }> => {
    const res = await apiClient.get('/purchase-orders', { params });
    return res.data;
  },

  create: async (payload: {
    supplierCounterpartyId?: string;
    supplierName?: string;
    supplierPhone?: string;
    poNumber?: string;
    orderDate?: string;
    items: { inventoryItemId?: string; itemName: string; quantityOrdered: number; unitCost: number }[];
    notes?: string;
  }): Promise<{ success: boolean; data: IWholesalePO; message: string }> => {
    const res = await apiClient.post('/purchase-orders', payload);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/purchase-orders/${id}`);
    return res.data;
  },

  createSupplierBillFromPo: async (payload: {
    supplierId: string;
    poId?: string;
    invoiceNo?: string;
    billAmount: number;
    useAdvance?: boolean;
    stockSync?: boolean;
    dueDate?: string;
    items?: { inventoryItemId?: string; itemName: string; quantityOrdered: number; unitCost: number }[];
    notes?: string;
    immediatePaymentAmount?: number;
    paymentMode?: string;
  }): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> => {
    const res = await apiClient.post('/suppliers/bills/create-from-po', payload);
    return res.data;
  },
};
