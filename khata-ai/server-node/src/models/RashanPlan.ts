import { Schema, model, Document, Types } from 'mongoose';

export type RashanCategory = 'GRAIN' | 'OIL_GHEE' | 'PULSE' | 'SWEETENER' | 'SPICE' | 'CLEANING';
export type RashanUnit = 'KG' | 'LITRE' | 'PACK' | 'GRAM';

export interface IRashanItem {
  id?: string;
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
}

export interface IRashanMonthlyPlan extends Document {
  profileId: Types.ObjectId;
  householdHeadId: string;
  month: number; // 1 - 12
  year: number;
  monthKey: string; // "YYYY-MM"
  householdSize: number; // e.g. 4, 6, 8 persons
  totalEstimatedBudget: number;
  customTargetBudget?: number; // Custom user-defined monthly grocery budget cap
  totalActualSpent: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'RECONCILED';
  reconciledAt?: Date;
  paymentMethod?: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
  items: IRashanItem[];
  createdAt: Date;
  updatedAt: Date;
}

const RashanItemSchema = new Schema<IRashanItem>(
  {
    nameUrdu: { type: String, required: true, trim: true },
    nameEnglish: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['GRAIN', 'OIL_GHEE', 'PULSE', 'SWEETENER', 'SPICE', 'CLEANING'],
      required: true,
      default: 'GRAIN',
    },
    targetQty: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['KG', 'LITRE', 'PACK', 'GRAM'],
      required: true,
      default: 'KG',
    },
    estimatedUnitRate: { type: Number, required: true, min: 0 },
    actualUnitRate: { type: Number, min: 0 },
    actualQtyPurchased: { type: Number, min: 0 },
    isPurchased: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { _id: true, id: true }
);

const RashanMonthlyPlanSchema = new Schema<IRashanMonthlyPlan>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    householdHeadId: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
      index: true,
    },
    householdSize: {
      type: Number,
      default: 5,
      min: 1,
    },
    totalEstimatedBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    customTargetBudget: {
      type: Number,
      min: 0,
    },
    totalActualSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PLANNING', 'IN_PROGRESS', 'RECONCILED'],
      default: 'PLANNING',
    },
    reconciledAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK'],
      default: 'CASH',
    },
    items: [RashanItemSchema],
  },
  { timestamps: true }
);

RashanMonthlyPlanSchema.index({ profileId: 1, monthKey: 1 }, { unique: true });

export const RashanMonthlyPlan = model<IRashanMonthlyPlan>('RashanMonthlyPlan', RashanMonthlyPlanSchema);
