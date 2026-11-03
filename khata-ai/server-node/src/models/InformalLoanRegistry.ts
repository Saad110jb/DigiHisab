import { Schema, model, Document, Types } from 'mongoose';

export type LoanDirection = 'GIVEN' | 'BORROWED'; // GIVEN = Extended Qarz-e-Hasana; BORROWED = Received Qarz-e-Hasana
export type LoanStatus = 'ACTIVE' | 'PARTIALLY_REPAID' | 'FULLY_SETTLED' | 'FORGIVEN';

export interface ILoanRepayment {
  amount: number;
  repaymentDate: Date;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
  notes?: string;
}

export interface IInformalLoanRegistry extends Document {
  profileId: Types.ObjectId;
  counterpartyId?: Types.ObjectId; // References FAMILY or CUSTOMER
  contactName: string;
  contactPhone?: string;
  loanDirection: LoanDirection;
  principalAmount: number;
  remainingAmount: number;
  agreedReturnDate?: Date;
  status: LoanStatus;
  isInterestFree: boolean; // Always true for Qarz-e-Hasana
  repaymentHistory: ILoanRepayment[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RepaymentSchema = new Schema<ILoanRepayment>(
  {
    amount: { type: Number, required: true, min: 0.01 },
    repaymentDate: { type: Date, default: Date.now },
    paymentMode: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'],
      default: 'CASH',
    },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const InformalLoanRegistrySchema = new Schema<IInformalLoanRegistry>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, trim: true },
    loanDirection: {
      type: String,
      enum: ['GIVEN', 'BORROWED'],
      required: true,
    },
    principalAmount: { type: Number, required: true, min: 1 },
    remainingAmount: { type: Number, required: true },
    agreedReturnDate: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'PARTIALLY_REPAID', 'FULLY_SETTLED', 'FORGIVEN'],
      default: 'ACTIVE',
    },
    isInterestFree: { type: Boolean, default: true },
    repaymentHistory: [RepaymentSchema],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

InformalLoanRegistrySchema.index({ profileId: 1, status: 1 });

export const InformalLoanRegistry = model<IInformalLoanRegistry>(
  'InformalLoanRegistry',
  InformalLoanRegistrySchema
);
