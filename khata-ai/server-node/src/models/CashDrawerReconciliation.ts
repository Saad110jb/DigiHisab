import { Schema, model, Document, Types } from 'mongoose';

export interface ICashDrawerReconciliation extends Document {
  profileId: Types.ObjectId;
  subAccountId?: Types.ObjectId; // Cashier who closed shift
  reconciliationDate: Date;
  systemExpectedCash: number;  // System computed cash balance
  physicalCountedCash: number; // Actual physical cash in drawer
  discrepancyAmount: number;   // physical - system (Positive = Surplus, Negative = Deficit/Shortage)
  isDiscrepancyApproved: boolean;
  approvedByProfileId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashDrawerReconciliationSchema = new Schema<ICashDrawerReconciliation>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    subAccountId: { type: Schema.Types.ObjectId },
    reconciliationDate: { type: Date, default: Date.now },
    systemExpectedCash: { type: Number, required: true },
    physicalCountedCash: { type: Number, required: true },
    discrepancyAmount: { type: Number, required: true },
    isDiscrepancyApproved: { type: Boolean, default: false },
    approvedByProfileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CashDrawerReconciliationSchema.index({ profileId: 1, reconciliationDate: -1 });

export const CashDrawerReconciliation = model<ICashDrawerReconciliation>(
  'CashDrawerReconciliation',
  CashDrawerReconciliationSchema
);
