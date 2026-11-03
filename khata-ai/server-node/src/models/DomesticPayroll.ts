import { Schema, model, Document, Types } from 'mongoose';

export interface IAdvanceDeductionPlan {
  totalAdvanceGiven: number;
  monthlyDeductionAmount: number;
  remainingBalance: number;
  active: boolean;
}

export interface IDomesticPayroll extends Document {
  profileId: Types.ObjectId;
  staffCounterpartyId: Types.ObjectId; // References Counterparty (STAFF)
  staffName: string;
  roleTitle: string; // Maid, Driver, Guard, Shop Assistant
  baseSalary: number;
  advancePlan: IAdvanceDeductionPlan;
  attendanceSummary?: {
    daysPresent: number;
    daysAbsent: number;
    deductionForAbsence: number;
  };
  payrollsHistory: Array<{
    month: string; // "YYYY-MM"
    baseSalary: number;
    advanceDeducted: number;
    netPaid: number;
    paidAt: Date;
    receiptPdfUrl?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DomesticPayrollSchema = new Schema<IDomesticPayroll>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    staffCounterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      required: true,
      index: true,
    },
    staffName: { type: String, required: true, trim: true },
    roleTitle: { type: String, required: true, trim: true },
    baseSalary: { type: Number, required: true, min: 0 },
    advancePlan: {
      totalAdvanceGiven: { type: Number, default: 0 },
      monthlyDeductionAmount: { type: Number, default: 0 },
      remainingBalance: { type: Number, default: 0 },
      active: { type: Boolean, default: false },
    },
    attendanceSummary: {
      daysPresent: { type: Number, default: 30 },
      daysAbsent: { type: Number, default: 0 },
      deductionForAbsence: { type: Number, default: 0 },
    },
    payrollsHistory: [
      {
        month: { type: String, required: true },
        baseSalary: { type: Number, required: true },
        advanceDeducted: { type: Number, default: 0 },
        netPaid: { type: Number, required: true },
        paidAt: { type: Date, default: Date.now },
        receiptPdfUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

DomesticPayrollSchema.index({ profileId: 1, staffCounterpartyId: 1 }, { unique: true });

export const DomesticPayroll = model<IDomesticPayroll>(
  'DomesticPayroll',
  DomesticPayrollSchema
);
