import { Schema, model, Document, Types } from 'mongoose';

export type MaintenanceType =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'SOLAR_PANEL'
  | 'HVAC_AC'
  | 'CARPENTRY'
  | 'GENERAL_REPAIR';

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
  warrantyExpiresAt?: Date;
  vendorShopName?: string;
}

export interface IDomesticMaintenanceLog extends Document {
  profileId: Types.ObjectId;
  assetId?: Types.ObjectId;
  technicianCounterpartyId?: Types.ObjectId;
  maintenanceType: MaintenanceType;
  seasonType?: MaintenanceSeason;
  description: string;
  cost: number;
  serviceDate: Date;
  receiptImageUrl?: string;
  nextServiceReminderDate?: Date;
  warrantyPeriodDays?: number;
  
  // Technician metadata
  technicianName?: string;
  technicianPhone?: string;
  technicianTrade?: TechnicianTrade;
  
  // Replaced parts & warranties
  partsReplaced?: IReplacedPart[];
  
  // Sinking Fund & Vault Account
  vaultAccountId?: Types.ObjectId;
  sinkingFundBucket?: string;
  syncToLedger?: boolean;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReplacedPartSchema = new Schema<IReplacedPart>(
  {
    partName: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    warrantyMonths: { type: Number, default: 0 },
    warrantyExpiresAt: { type: Date },
    vendorShopName: { type: String, trim: true },
  },
  { _id: false }
);

const DomesticMaintenanceLogSchema = new Schema<IDomesticMaintenanceLog>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    assetId: { type: Schema.Types.ObjectId, ref: 'HouseholdAsset', index: true },
    technicianCounterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    maintenanceType: {
      type: String,
      enum: ['PLUMBING', 'ELECTRICAL', 'SOLAR_PANEL', 'HVAC_AC', 'CARPENTRY', 'GENERAL_REPAIR'],
      required: true,
    },
    seasonType: {
      type: String,
      enum: ['PRE_SUMMER_AC', 'PRE_WINTER_GEYSER', 'UPS_BATTERY_CYCLE', 'MONSOON_WATER', 'EMERGENCY_REPAIR', 'ROUTINE'],
      default: 'ROUTINE',
    },
    description: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    serviceDate: { type: Date, default: Date.now },
    receiptImageUrl: { type: String },
    nextServiceReminderDate: { type: Date },
    warrantyPeriodDays: { type: Number, default: 0 },
    technicianName: { type: String, trim: true },
    technicianPhone: { type: String, trim: true },
    technicianTrade: {
      type: String,
      enum: ['ELECTRICIAN', 'PLUMBER', 'AC_TECHNICIAN', 'MOTOR_WINDER', 'SOLAR_TECH', 'GENERAL'],
      default: 'GENERAL',
    },
    partsReplaced: [ReplacedPartSchema],
    vaultAccountId: { type: Schema.Types.ObjectId, ref: 'VaultAccount' },
    sinkingFundBucket: { type: String, default: 'Home & Vehicle Sinking Reserve' },
    syncToLedger: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DomesticMaintenanceLogSchema.index({ profileId: 1, serviceDate: -1 });

export const DomesticMaintenanceLog = model<IDomesticMaintenanceLog>(
  'DomesticMaintenanceLog',
  DomesticMaintenanceLogSchema
);
