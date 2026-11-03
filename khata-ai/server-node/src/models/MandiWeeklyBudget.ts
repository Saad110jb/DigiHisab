import { Schema, model, Document, Types } from 'mongoose';

export type MandiCategory = 'CHICKEN' | 'MUTTON_BEEF' | 'FRESH_VEGETABLES' | 'SEASONAL_FRUITS';
export type MandiUnit = 'KG' | 'GRAM' | 'DARJAN' | 'PAO';

export interface ICategoryEnvelope {
  category: MandiCategory;
  categoryUrdu: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
}

export interface IMandiWeeklyEnvelope extends Document {
  profileId: Types.ObjectId;
  weekKey: string; // e.g. "2026-W42"
  monthKey: string; // e.g. "2026-10"
  weekNumber: number; // 1 - 5
  startDate: Date;
  endDate: Date;
  totalWeeklyBudget: number;
  totalWeeklySpent: number;
  remainingWeeklyBalance: number;
  envelopes: ICategoryEnvelope[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMandiPurchaseLog extends Document {
  profileId: Types.ObjectId;
  weekKey: string;
  envelopeId?: Types.ObjectId;
  category: MandiCategory;
  itemName: string;
  quantity: number;
  unit: MandiUnit;
  ratePerUnit: number;
  totalAmount: number;
  marketSource: string;
  paymentMethod: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'RAAST';
  purchaseDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryEnvelopeSchema = new Schema<ICategoryEnvelope>(
  {
    category: {
      type: String,
      enum: ['CHICKEN', 'MUTTON_BEEF', 'FRESH_VEGETABLES', 'SEASONAL_FRUITS'],
      required: true,
    },
    categoryUrdu: { type: String, required: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    spentAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const MandiWeeklyEnvelopeSchema = new Schema<IMandiWeeklyEnvelope>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    weekKey: { type: String, required: true, index: true },
    monthKey: { type: String, required: true, index: true },
    weekNumber: { type: Number, required: true, min: 1, max: 5 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalWeeklyBudget: { type: Number, required: true, min: 0 },
    totalWeeklySpent: { type: Number, default: 0, min: 0 },
    remainingWeeklyBalance: { type: Number, default: 0 },
    envelopes: [CategoryEnvelopeSchema],
  },
  { timestamps: true }
);

MandiWeeklyEnvelopeSchema.index({ profileId: 1, weekKey: 1 }, { unique: true });

const MandiPurchaseLogSchema = new Schema<IMandiPurchaseLog>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    weekKey: { type: String, required: true, index: true },
    envelopeId: { type: Schema.Types.ObjectId, ref: 'MandiWeeklyEnvelope' },
    category: {
      type: String,
      enum: ['CHICKEN', 'MUTTON_BEEF', 'FRESH_VEGETABLES', 'SEASONAL_FRUITS'],
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: {
      type: String,
      enum: ['KG', 'GRAM', 'DARJAN', 'PAO'],
      default: 'KG',
    },
    ratePerUnit: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    marketSource: { type: String, default: 'Sabzi Mandi / Itwar Bazaar', trim: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'RAAST'],
      default: 'CASH',
    },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

MandiPurchaseLogSchema.index({ profileId: 1, purchaseDate: -1 });

export const MandiWeeklyEnvelope = model<IMandiWeeklyEnvelope>(
  'MandiWeeklyEnvelope',
  MandiWeeklyEnvelopeSchema
);

export const MandiPurchaseLog = model<IMandiPurchaseLog>(
  'MandiPurchaseLog',
  MandiPurchaseLogSchema
);
