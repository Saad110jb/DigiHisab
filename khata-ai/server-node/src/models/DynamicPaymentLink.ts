import { Schema, model, Document, Types } from 'mongoose';

export type PaymentGateway = 'JAZZCASH' | 'EASYPAISA' | 'RAAST' | 'STRIPE';
export type PaymentLinkStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface IDynamicPaymentLink extends Document {
  profileId: Types.ObjectId;
  counterpartyId?: Types.ObjectId;
  ledgerEntryId?: Types.ObjectId;
  linkToken: string;
  gateway: PaymentGateway;
  amount: number;
  qrCodeUrl?: string;
  deepLinkUrl?: string;
  status: PaymentLinkStatus;
  expiresAt: Date;
  paidAt?: Date;
  gatewayTransactionId?: string;
  rawWebhookPayload?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DynamicPaymentLinkSchema = new Schema<IDynamicPaymentLink>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    linkToken: { type: String, required: true, unique: true, index: true },
    gateway: {
      type: String,
      enum: ['JAZZCASH', 'EASYPAISA', 'RAAST', 'STRIPE'],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    qrCodeUrl: { type: String },
    deepLinkUrl: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
    gatewayTransactionId: { type: String },
    rawWebhookPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

DynamicPaymentLinkSchema.index({ linkToken: 1, status: 1 });

export const DynamicPaymentLink = model<IDynamicPaymentLink>(
  'DynamicPaymentLink',
  DynamicPaymentLinkSchema
);
