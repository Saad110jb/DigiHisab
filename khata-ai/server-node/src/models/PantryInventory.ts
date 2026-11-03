import { Schema, model, Document, Types } from 'mongoose';

export type PantryCategory = 'GRAIN' | 'OIL_GHEE' | 'PULSE' | 'SWEETENER' | 'TEA_BEVERAGE' | 'SPICE' | 'CLEANING';
export type PantryUnit = 'KG' | 'LITRE' | 'PACK' | 'GRAM';

export interface IPantryItem extends Document {
  profileId: Types.ObjectId;
  nameUrdu: string;
  nameEnglish: string;
  category: PantryCategory;
  initialStockQty: number;
  currentStockQty: number;
  unit: PantryUnit;
  purchaseDate: Date;
  dailyBurnRate: number; // e.g. 1.0 KG/day
  expectedDays: number;
  daysRemaining: number;
  depletionDate: Date;
  reservePercentage: number;
  isUrgentRestock: boolean; // <= 3 days
  recommendedRestockQty: number;
  lastRestockedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHouseholdPantryProfile extends Document {
  profileId: Types.ObjectId;
  householdSize: number;
  dietaryProfile: 'LIGHT' | 'MODERATE' | 'HEAVY';
  autoSyncWithRashanPlan: boolean;
  whatsappTargetPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PantryItemSchema = new Schema<IPantryItem>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    nameUrdu: { type: String, required: true, trim: true },
    nameEnglish: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['GRAIN', 'OIL_GHEE', 'PULSE', 'SWEETENER', 'TEA_BEVERAGE', 'SPICE', 'CLEANING'],
      required: true,
      default: 'GRAIN',
    },
    initialStockQty: { type: Number, required: true, min: 0.1 },
    currentStockQty: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['KG', 'LITRE', 'PACK', 'GRAM'],
      required: true,
      default: 'KG',
    },
    purchaseDate: { type: Date, default: Date.now },
    dailyBurnRate: { type: Number, required: true, min: 0.001 },
    expectedDays: { type: Number, default: 30 },
    daysRemaining: { type: Number, default: 30 },
    depletionDate: { type: Date },
    reservePercentage: { type: Number, default: 100 },
    isUrgentRestock: { type: Boolean, default: false },
    recommendedRestockQty: { type: Number, default: 1 },
    lastRestockedDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PantryItemSchema.index({ profileId: 1, isUrgentRestock: 1, daysRemaining: 1 });

const HouseholdPantryProfileSchema = new Schema<IHouseholdPantryProfile>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    householdSize: { type: Number, default: 5, min: 1, max: 30 },
    dietaryProfile: {
      type: String,
      enum: ['LIGHT', 'MODERATE', 'HEAVY'],
      default: 'MODERATE',
    },
    autoSyncWithRashanPlan: { type: Boolean, default: true },
    whatsappTargetPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

export const PantryItem = model<IPantryItem>('PantryItem', PantryItemSchema);
export const HouseholdPantryProfile = model<IHouseholdPantryProfile>(
  'HouseholdPantryProfile',
  HouseholdPantryProfileSchema
);
