import { Schema, model, Document, Types } from 'mongoose';

export interface IExpenseCategoryRule extends Document {
  profileId: Types.ObjectId;
  categoryName: string;
  keywords: string[]; // Roman Urdu or English keywords: ["doodh", "milk", "dairy", "bakery"]
  personaTarget: 'HOUSEHOLD' | 'VENDOR' | 'BOTH';
  autoTagAnomaly: boolean;
  budgetCapMonthly?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategoryRuleSchema = new Schema<IExpenseCategoryRule>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    categoryName: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true, lowercase: true }],
    personaTarget: {
      type: String,
      enum: ['HOUSEHOLD', 'VENDOR', 'BOTH'],
      default: 'BOTH',
    },
    autoTagAnomaly: { type: Boolean, default: false },
    budgetCapMonthly: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExpenseCategoryRuleSchema.index({ profileId: 1, categoryName: 1 }, { unique: true });

export const ExpenseCategoryRule = model<IExpenseCategoryRule>(
  'ExpenseCategoryRule',
  ExpenseCategoryRuleSchema
);
