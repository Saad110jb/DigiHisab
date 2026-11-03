import { Schema, model, Document, Types } from 'mongoose';

export type SentinelEventType =
  | 'NO_SALE_DRAWER_OPEN'    // Drawer opened without an active transaction
  | 'ITEM_VOID_POST_COMMIT'  // Item deleted or bill voided after customer ring
  | 'PRE_CLOSE_SALE_SPIKE'   // Rapid un-itemized sales right before Galla Bandi
  | 'WASOOLI_DELAYED_LOG'    // Debt repayment entered with abnormal timestamp lag
  | 'GALLA_DEFICIT_SPIKE'    // Discrepancy during shift closing
  | 'SUSPICIOUS_DISCOUNT'    // Discretionary manual price reduction
  | 'UNAUTHORIZED_UDHAAR';   // Credit given without verification

export interface ITillSentinelEvent extends Document {
  profileId: Types.ObjectId;
  subAccountId?: Types.ObjectId;     // Cashier sub-account
  cashierName: string;
  eventType: SentinelEventType;
  timestamp: Date;
  amountInvolved?: number;
  metadata?: {
    systemTimestampStr: string;     // e.g. "14 Oct 2026, 08:42:10 PM"
    registerId?: string;
    itemNames?: string[];
    discrepancyPkr?: number;
    delayMinutes?: number;
    receiptNumber?: string;
    detailsUr?: string;
    detailsEn?: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isResolved: boolean;
  ownerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TillSentinelEventSchema = new Schema<ITillSentinelEvent>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    subAccountId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    cashierName: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    amountInvolved: {
      type: Number,
      default: 0,
    },
    metadata: {
      systemTimestampStr: { type: String },
      registerId: { type: String, default: 'MAIN_TILL_1' },
      itemNames: [{ type: String }],
      discrepancyPkr: { type: Number },
      delayMinutes: { type: Number },
      receiptNumber: { type: String },
      detailsUr: { type: String },
      detailsEn: { type: String },
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    ownerNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

TillSentinelEventSchema.index({ profileId: 1, timestamp: -1 });
TillSentinelEventSchema.index({ profileId: 1, subAccountId: 1, eventType: 1 });

export const TillSentinelEvent = model<ITillSentinelEvent>(
  'TillSentinelEvent',
  TillSentinelEventSchema
);
