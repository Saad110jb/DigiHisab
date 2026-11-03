import { Schema, model, Document, Types } from 'mongoose';

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

export interface IHouseholdAsset extends Document {
  profileId: Types.ObjectId;
  assetName: string; // E.g., "Inverter AC 1.5 Ton (Lounge)", "Osaka Tubular UPS Battery"
  category: ApplianceCategory;
  roomLocation?: string; // E.g., "Master Bedroom", "Drawing Room", "Roof / Tank", "Kitchen"
  brandModel?: string; // E.g., "Gree Fairy 18FITH", "Super Asia 35L"
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiryDate?: Date;
  vendorName?: string;
  serialNumber?: string;
  receiptImageUrl?: string;
  preSeasonReminderMonth?: number; // 1-12 (e.g. 4 for April, 10 for October)
  serviceIntervalDays?: number; // E.g., 45 for UPS distilled water, 180 for AC
  lastServicedDate?: Date;
  nextServiceDueDate?: Date;
  cumulativeRepairCost: number;
  isDecommissioned?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdAssetSchema = new Schema<IHouseholdAsset>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    assetName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'AC_INVERTER',
        'GEYSER_GAS_ELECTRIC',
        'UPS_BATTERY',
        'WATER_MOTOR_PUMP',
        'SOLAR_SYSTEM',
        'REFRIGERATOR_FREEZER',
        'WASHING_MACHINE',
        'GENERATOR',
        'ELECTRONICS',
        'APPLIANCE',
        'FURNITURE',
        'VEHICLE',
        'OTHER',
      ],
      default: 'APPLIANCE',
    },
    roomLocation: { type: String, trim: true },
    brandModel: { type: String, trim: true },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0, default: 0 },
    warrantyExpiryDate: { type: Date },
    vendorName: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    receiptImageUrl: { type: String },
    preSeasonReminderMonth: { type: Number, min: 1, max: 12 },
    serviceIntervalDays: { type: Number, default: 180 },
    lastServicedDate: { type: Date },
    nextServiceDueDate: { type: Date },
    cumulativeRepairCost: { type: Number, default: 0 },
    isDecommissioned: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

HouseholdAssetSchema.index({ profileId: 1, category: 1 });
HouseholdAssetSchema.index({ profileId: 1, nextServiceDueDate: 1 });

export const HouseholdAsset = model<IHouseholdAsset>('HouseholdAsset', HouseholdAssetSchema);
