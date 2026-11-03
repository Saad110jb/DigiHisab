import { Schema, model, Document, Types } from 'mongoose';

export type SettlementStatus = 'OFFERED' | 'ACCEPTED' | 'FULFILLED' | 'EXPIRED' | 'REJECTED';

export interface ISettlementContract extends Document {
  profileId: Types.ObjectId;
  counterpartyId: Types.ObjectId;
  originalDebtAmount: number;
  offeredDiscountAmount: number;
  agreedPayoffAmount: number;
  daysOverdueAtOffer: number;
  expiresAt: Date;
  status: SettlementStatus;
  acceptedAt?: Date;
  fulfilledAt?: Date;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementContractSchema = new Schema<ISettlementContract>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    counterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      required: true,
      index: true,
    },
    originalDebtAmount: { type: Number, required: true, min: 1 },
    offeredDiscountAmount: { type: Number, required: true, min: 0 },
    agreedPayoffAmount: { type: Number, required: true, min: 1 },
    daysOverdueAtOffer: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['OFFERED', 'ACCEPTED', 'FULFILLED', 'EXPIRED', 'REJECTED'],
      default: 'OFFERED',
    },
    acceptedAt: { type: Date },
    fulfilledAt: { type: Date },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

SettlementContractSchema.index({ profileId: 1, counterpartyId: 1, status: 1 });

export const SettlementContract = model<ISettlementContract>(
  'SettlementContract',
  SettlementContractSchema
);
