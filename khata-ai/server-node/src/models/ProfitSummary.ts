import { Schema, model, Document, Types } from 'mongoose';

export interface IProfitSummary extends Document {
  profileId: Types.ObjectId;
  periodType: 'DAILY' | 'MONTHLY';
  periodKey: string; // "YYYY-MM-DD" or "YYYY-MM"
  grossSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  totalReceivablesCollected: number;
  totalPayablesSettled: number;
  marginLossEventsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProfitSummarySchema = new Schema<IProfitSummary>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    periodType: {
      type: String,
      enum: ['DAILY', 'MONTHLY'],
      required: true,
    },
    periodKey: { type: String, required: true },
    grossSales: { type: Number, default: 0 },
    costOfGoodsSold: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    operatingExpenses: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    totalReceivablesCollected: { type: Number, default: 0 },
    totalPayablesSettled: { type: Number, default: 0 },
    marginLossEventsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProfitSummarySchema.index({ profileId: 1, periodType: 1, periodKey: 1 }, { unique: true });

export const ProfitSummary = model<IProfitSummary>('ProfitSummary', ProfitSummarySchema);
