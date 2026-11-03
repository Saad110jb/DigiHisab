import { apiClient } from './client';

export type ApplianceCategory =
  | 'AC_INVERTER'
  | 'GEYSER_GAS_ELECTRIC'
  | 'UPS_BATTERY'
  | 'WATER_MOTOR_PUMP'
  | 'SOLAR_SYSTEM'
  | 'REFRIGERATOR_FREEZER'
  | 'WASHING_MACHINE'
  | 'GENERATOR'
  | 'ELECTRONICS'
  | 'APPLIANCE'
  | 'FURNITURE'
  | 'VEHICLE'
  | 'OTHER';

export type MaintenanceSeason =
  | 'PRE_SUMMER_AC'
  | 'PRE_WINTER_GEYSER'
  | 'UPS_BATTERY_CYCLE'
  | 'MONSOON_WATER'
  | 'EMERGENCY_REPAIR'
  | 'ROUTINE';

export type TechnicianTrade =
  | 'ELECTRICIAN'
  | 'PLUMBER'
  | 'AC_TECHNICIAN'
  | 'MOTOR_WINDER'
  | 'SOLAR_TECH'
  | 'GENERAL';

export interface IReplacedPart {
  partName: string;
  cost: number;
  warrantyMonths: number;
  warrantyExpiresAt?: string;
  vendorShopName?: string;
}

export interface IHouseholdAppliance {
  _id: string;
  assetName: string;
  category: ApplianceCategory;
  roomLocation?: string;
  brandModel?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiryDate?: string;
  serialNumber?: string;
  preSeasonReminderMonth?: number;
  serviceIntervalDays?: number;
  lastServicedDate?: string;
  nextServiceDueDate?: string;
  cumulativeRepairCost: number;
  isMoneyPit?: boolean;
  repairToPriceRatio?: number;
  daysRemaining?: number | null;
  isDueSoon?: boolean;
  notes?: string;
}

export interface ITechnicianContact {
  name: string;
  phone: string;
  trade: TechnicianTrade;
  lastJobDate?: string;
  totalJobs: number;
  totalSpent: number;
  isVerified?: boolean;
}

export interface IActiveWarrantyItem {
  partName: string;
  cost: number;
  vendorShopName: string;
  warrantyMonths: number;
  warrantyExpiresAt: string;
  daysRemaining: number;
  assetName: string;
  technicianName?: string;
  serviceDate: string;
}

export interface ISeasonalWaveInfo {
  seasonKey: MaintenanceSeason;
  titleUrdu: string;
  titleEnglish: string;
  descriptionUrdu: string;
  recommendedCategory: ApplianceCategory;
  accentColor: string;
  urgency: 'URGENT' | 'HIGH' | 'MEDIUM';
}

export interface ISeasonalDashboardData {
  seasonalWave: ISeasonalWaveInfo;
  summary: {
    totalAssets: number;
    dueSoonCount: number;
    moneyPitCount: number;
    activeWarrantiesCount: number;
    currentMonthSpend: number;
    sinkingFundReserve: number;
  };
  upsStatus: {
    assetName: string;
    lastServicedDate?: string;
    nextServiceDueDate?: string;
    daysRemaining: number | null;
    isDue: boolean;
  } | null;
  activeWarranties: IActiveWarrantyItem[];
  assets: IHouseholdAppliance[];
}

export const seasonalMaintenanceApi = {
  /**
   * Fetch complete seasonal maintenance radar and dashboard
   */
  getDashboard: async (): Promise<ISeasonalDashboardData> => {
    const res = await apiClient.get<{ success: boolean; data: ISeasonalDashboardData }>(
      '/domestic/maintenance/dashboard'
    );
    return res.data.data;
  },

  /**
   * Get all registered appliances
   */
  getAppliances: async (): Promise<IHouseholdAppliance[]> => {
    const res = await apiClient.get<{ success: boolean; data: IHouseholdAppliance[] }>(
      '/domestic/maintenance/assets'
    );
    return res.data.data;
  },

  /**
   * Register a new household appliance
   */
  createAppliance: async (payload: Partial<IHouseholdAppliance>): Promise<IHouseholdAppliance> => {
    const res = await apiClient.post<{ success: boolean; data: IHouseholdAppliance }>(
      '/domestic/maintenance/assets',
      payload
    );
    return res.data.data;
  },

  /**
   * Decommission/delete an appliance
   */
  deleteAppliance: async (id: string): Promise<boolean> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/domestic/maintenance/assets/${id}`
    );
    return res.data.success;
  },

  /**
   * Log a service / repair job with parts warranties and vault sync
   */
  logMaintenanceJob: async (payload: {
    assetId: string;
    maintenanceType: string;
    seasonType?: MaintenanceSeason;
    description: string;
    cost: number;
    serviceDate?: string;
    technicianName?: string;
    technicianPhone?: string;
    technicianTrade?: TechnicianTrade;
    partsReplaced?: IReplacedPart[];
    vaultAccountId?: string;
    sinkingFundBucket?: string;
    syncToLedger?: boolean;
    paymentMode?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>(
      '/domestic/maintenance/jobs',
      payload
    );
    return res.data;
  },

  /**
   * Get trusted local karigar / technician directory
   */
  getTechnicianDirectory: async (): Promise<ITechnicianContact[]> => {
    const res = await apiClient.get<{ success: boolean; data: ITechnicianContact[] }>(
      '/domestic/maintenance/technicians'
    );
    return res.data.data;
  },

  /**
   * Get active manufacturer and parts warranties
   */
  getActiveWarranties: async (): Promise<IActiveWarrantyItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: IActiveWarrantyItem[] }>(
      '/domestic/maintenance/warranties'
    );
    return res.data.data;
  },
};
