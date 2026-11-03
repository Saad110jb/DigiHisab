import { Schema, model, Document, Types } from 'mongoose';

export interface ISupplierContract extends Document {
  profileId: Types.ObjectId;
  supplierCounterpartyId: Types.ObjectId;
  contractTitle: string;
  creditPeriodDays: number; // E.g., 30 days credit terms
  maxCreditCeiling: number;
  earlyPaymentDiscountPercent: number; // E.g., 2% if paid within 10 days
  earlyPaymentWindowDays: number;
  agreementStartDate: Date;
  agreementEndDate?: Date;
  termsAndConditions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierContractSchema = new Schema<ISupplierContract>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    supplierCounterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      required: true,
      index: true,
    },
    contractTitle: { type: String, required: true, trim: true },
    creditPeriodDays: { type: Number, default: 30 },
    maxCreditCeiling: { type: Number, default: 50000 },
    earlyPaymentDiscountPercent: { type: Number, default: 0 },
    earlyPaymentWindowDays: { type: Number, default: 0 },
    agreementStartDate: { type: Date, default: Date.now },
    agreementEndDate: { type: Date },
    termsAndConditions: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupplierContractSchema.index({ profileId: 1, supplierCounterpartyId: 1 });

export const SupplierContract = model<ISupplierContract>(
  'SupplierContract',
  SupplierContractSchema
);
