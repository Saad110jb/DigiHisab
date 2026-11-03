import { apiClient } from './client';

export interface IMerchantPaymentSettings {
  jazzCashNumber?: string;
  jazzCashTitle?: string;
  easypaisaNumber?: string;
  easypaisaTitle?: string;
  raastId?: string;
  bankName?: string;
  bankTitle?: string;
  iban?: string;
  jazzCashQrUrl?: string;
  easypaisaQrUrl?: string;
  raastQrUrl?: string;
}

export interface IShopAddress {
  street?: string;
  areaOrChak?: string;
  city?: string;
  formattedAddress?: string;
}

export interface IPaymentAccountDetails {
  accountNumber?: string;
  accountTitle?: string;
}

export interface IRaastPaymentDetails {
  idOrIban?: string;
  bankName?: string;
  accountTitle?: string;
}

export interface IPaymentDetails {
  jazzcash?: IPaymentAccountDetails;
  easypaisa?: IPaymentAccountDetails;
  raast?: IRaastPaymentDetails;
}

export interface IPaymentChannels {
  cashDrawer: number;
  bankAccount: number;
  digitalWallet: number;
}

export interface ProfileData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessCategory?: string;
  address?: string;
  businessAddress?: string;
  shopAddress?: IShopAddress;
  cnic?: string;
  ownerCnic?: string;
  headerPreview?: string;
  paymentDetails?: IPaymentDetails;
  paymentSettings?: IMerchantPaymentSettings;
  paymentChannels?: IPaymentChannels;
  registeredAccountType: 'HOUSEHOLD' | 'VENDOR' | 'HYBRID';
  activePersona: 'HOUSEHOLD' | 'VENDOR' | 'HYBRID';
  tier: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  subAccountLimit: number;
  cashierPinRequired: boolean;
  managerPin?: string;
  subAccounts: Array<{
    _id: string;
    subAccountId: string;
    name?: string;
    fullName?: string;
    phone: string;
    role: 'MANAGER' | 'CASHIER';
    pin?: string;
    isActive: boolean;
    permissions: string[];
    createdAt?: string;
  }>;
}

export const profileApi = {
  getProfile: async (): Promise<ProfileData> => {
    const response = await apiClient.get('/profile');
    return response.data.data;
  },

  updateBusinessProfile: async (payload: {
    fullName?: string;
    email?: string;
    businessName?: string;
    businessCategory?: string;
    address?: string;
    businessAddress?: string;
    shopAddress?: IShopAddress;
    cnic?: string;
    ownerCnic?: string;
    activePersona?: string;
    managerPin?: string;
    cashierPinRequired?: boolean;
    paymentSettings?: IMerchantPaymentSettings;
    paymentDetails?: IPaymentDetails;
  }): Promise<{ profile: ProfileData; message: string }> => {
    const response = await apiClient.put('/profile/business', payload);
    return response.data;
  },

  updateBusinessDetails: async (payload: {
    fullName?: string;
    email?: string;
    businessName?: string;
    businessCategory?: string;
    shopAddress?: IShopAddress;
    ownerCnic?: string;
    cnic?: string;
  }) => {
    const response = await apiClient.patch('/profile/business-details', payload);
    return response.data;
  },

  updatePaymentAccounts: async (payload: {
    paymentDetails?: IPaymentDetails;
    paymentSettings?: IMerchantPaymentSettings;
    jazzCashNumber?: string;
    jazzCashTitle?: string;
    easypaisaNumber?: string;
    easypaisaTitle?: string;
    raastId?: string;
    bankName?: string;
    bankTitle?: string;
  }) => {
    const response = await apiClient.patch('/profile/payment-accounts', payload);
    return response.data;
  },

  updateManagerPin: async (managerPin: string) => {
    const response = await apiClient.patch('/profile/manager-pin', { managerPin });
    return response.data;
  },

  addSubAccount: async (payload: {
    fullName: string;
    phone: string;
    role: 'MANAGER' | 'CASHIER';
    pin: string;
    permissions?: string[];
  }) => {
    const response = await apiClient.post('/profile/sub-accounts', {
      name: payload.fullName,
      fullName: payload.fullName,
      phone: payload.phone,
      role: payload.role,
      pin: payload.pin,
      permissions: payload.permissions,
    });
    return response.data;
  },

  updateSubAccountStatus: async (subAccountId: string, isActive: boolean) => {
    const response = await apiClient.patch(`/profile/sub-accounts/${subAccountId}/status`, { isActive });
    return response.data;
  },

  updateSubAccount: async (
    subAccountId: string,
    payload: {
      name?: string;
      role?: 'MANAGER' | 'CASHIER';
      pin?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiClient.put(`/profile/sub-accounts/${subAccountId}`, payload);
    return response.data;
  },

  verifyManagerPin: async (pin: string) => {
    const response = await apiClient.post('/profile/verify-override-pin', { pin, managerPin: pin });
    return response.data;
  },
};
