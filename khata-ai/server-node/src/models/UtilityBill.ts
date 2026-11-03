import { Schema, model, Document, Types } from 'mongoose';

export type UtilityProviderType = 'ELECTRICITY' | 'GAS' | 'WATER' | 'INTERNET' | 'OTHER';

export type BillPaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export type PaymentSourceTag =
  | 'JAZZCASH'
  | 'EASYPAISA'
  | 'BANK_TRANSFER'
  | 'SADAPAY'
  | 'NAYAPAY'
  | 'CASH'
  | 'RAAST';

export interface IUtilityBill extends Document {
  profileId: Types.ObjectId;
  providerType: UtilityProviderType;
  providerName: string; // e.g. "LESCO", "K-Electric", "SNGPL", "WASA Lahore", "Nayatel"
  consumerNumber: string; // 14-digit reference / account ID
  meterNumber?: string;
  billingMonth: string; // "YYYY-MM" (e.g. "2026-10")
  billingAmount: number; // Within due date (e.g. 18,450)
  surchargeAmount: number; // Late fee (e.g. 1,650)
  amountAfterDueDate: number; // Computed (billingAmount + surchargeAmount)
  billDueDate: Date;
  status: BillPaymentStatus;

  // Anti-Double-Billing Vault & Payment Proof
  paymentSource?: PaymentSourceTag;
  paymentDate?: Date;
  transactionId?: string; // e.g. "TID-9082318239" or 1Link Auth code
  receiptProofUrl?: string; // Digital archive image / slip
  paidByUserName?: string; // "Muhammad Saad" or "Abu Jaan"
  notes?: string;

  // Alerts History
  alert3DaysSent: boolean;
  alert1DaySent: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const UtilityBillSchema = new Schema<IUtilityBill>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    providerType: {
      type: String,
      enum: ['ELECTRICITY', 'GAS', 'WATER', 'INTERNET', 'OTHER'],
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
      default: 'LESCO',
    },
    consumerNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    meterNumber: {
      type: String,
      trim: true,
    },
    billingMonth: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    billingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    surchargeAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    amountAfterDueDate: {
      type: Number,
      required: true,
      min: 0,
    },
    billDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'OVERDUE'],
      default: 'UNPAID',
      index: true,
    },
    paymentSource: {
      type: String,
      enum: ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'SADAPAY', 'NAYAPAY', 'CASH', 'RAAST'],
    },
    paymentDate: {
      type: Date,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    receiptProofUrl: {
      type: String,
      trim: true,
    },
    paidByUserName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    alert3DaysSent: {
      type: Boolean,
      default: false,
    },
    alert1DaySent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate bill entry for the same consumer in the same billing month
UtilityBillSchema.index({ profileId: 1, consumerNumber: 1, billingMonth: 1 }, { unique: true });

export const UtilityBill = model<IUtilityBill>('UtilityBill', UtilityBillSchema);
