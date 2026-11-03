import { Schema, model, Document, Types } from 'mongoose';

export interface IBudgetItemLimit {
  category: string; // E.g., "Atta/Flour", "Cooking Oil", "Milk/Dairy", "Meat/Poultry", "Rice/Pulses"
  allocatedAmount: number;
  spentAmount: number;
  unitTargetQuantity?: number;
  unitOfMeasure?: string;
}

export interface IRationBudget extends Document {
  profileId: Types.ObjectId;
  monthKey: string; // "YYYY-MM"
  totalMonthlyAllocatedBudget: number;
  totalSpent: number;
  isOverspent: boolean;
  alertSentAt?: Date;
  categoryLimits: IBudgetItemLimit[];
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemLimitSchema = new Schema<IBudgetItemLimit>(
  {
    category: { type: String, required: true, trim: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    spentAmount: { type: Number, default: 0, min: 0 },
    unitTargetQuantity: { type: Number },
    unitOfMeasure: { type: String },
  },
  { _id: true }
);

const RationBudgetSchema = new Schema<IRationBudget>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    monthKey: { type: String, required: true },
    totalMonthlyAllocatedBudget: { type: Number, required: true, min: 0 },
    totalSpent: { type: Number, default: 0 },
    isOverspent: { type: Boolean, default: false },
    alertSentAt: { type: Date },
    categoryLimits: [BudgetItemLimitSchema],
  },
  { timestamps: true }
);

RationBudgetSchema.index({ profileId: 1, monthKey: 1 }, { unique: true });

export const RationBudget = model<IRationBudget>('RationBudget', RationBudgetSchema);
