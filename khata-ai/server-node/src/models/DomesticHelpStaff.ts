import { Schema, model, Document, Types } from 'mongoose';

export type DomesticStaffRole =
  | 'MAID'
  | 'DRIVER'
  | 'COOK'
  | 'GUARD'
  | 'GARDENER'
  | 'NANNY'
  | 'OTHER';

export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE';
export type SalaryPaymentMode = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER';

export interface IPeshgiAdvance {
  _id?: Types.ObjectId;
  amount: number;
  disbursementDate: Date;
  reason?: string;
  paymentMode: SalaryPaymentMode;
  isDeducted: boolean;
  deductedInMonth?: string; // "YYYY-MM"
  notes?: string;
}

export interface IAttendanceDay {
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  notes?: string;
}

export interface ISalarySettlement {
  month: string; // "YYYY-MM"
  baseSalary: number;
  totalAdvancesDeducted: number;
  absentDays: number;
  halfDays: number;
  leaveDeductions: number;
  bonusOrEidiAmount: number;
  netSalaryPaid: number;
  paidAt: Date;
  paymentMode: SalaryPaymentMode;
  notes?: string;
  receiptText?: string;
}

export interface IDomesticHelpStaff extends Document {
  profileId: Types.ObjectId;
  staffName: string;
  role: DomesticStaffRole;
  phone?: string;
  baseMonthlySalary: number;
  avatarColor?: string;
  joiningDate: Date;
  isActive: boolean;

  // Daily Attendance Log
  attendance: IAttendanceDay[];

  // Advance Payment Ledger (Peshgi)
  advances: Types.DocumentArray<IPeshgiAdvance & Document>;

  // Historical Salary Settlements
  settlementHistory: ISalarySettlement[];

  createdAt: Date;
  updatedAt: Date;
}

const PeshgiAdvanceSchema = new Schema<IPeshgiAdvance>(
  {
    amount: { type: Number, required: true, min: 1 },
    disbursementDate: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
    paymentMode: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    isDeducted: { type: Boolean, default: false },
    deductedInMonth: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true, _id: true }
);

const AttendanceDaySchema = new Schema<IAttendanceDay>(
  {
    date: { type: String, required: true, trim: true }, // "YYYY-MM-DD"
    status: {
      type: String,
      enum: ['PRESENT', 'HALF_DAY', 'ABSENT', 'PAID_LEAVE'],
      default: 'PRESENT',
    },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const SalarySettlementSchema = new Schema<ISalarySettlement>(
  {
    month: { type: String, required: true, trim: true },
    baseSalary: { type: Number, required: true, min: 0 },
    totalAdvancesDeducted: { type: Number, default: 0, min: 0 },
    absentDays: { type: Number, default: 0, min: 0 },
    halfDays: { type: Number, default: 0, min: 0 },
    leaveDeductions: { type: Number, default: 0, min: 0 },
    bonusOrEidiAmount: { type: Number, default: 0, min: 0 },
    netSalaryPaid: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    paymentMode: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    notes: { type: String, trim: true },
    receiptText: { type: String },
  },
  { timestamps: true, _id: true }
);

const DomesticHelpStaffSchema = new Schema<IDomesticHelpStaff>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    staffName: { type: String, required: true, trim: true, index: true },
    role: {
      type: String,
      enum: ['MAID', 'DRIVER', 'COOK', 'GUARD', 'GARDENER', 'NANNY', 'OTHER'],
      default: 'MAID',
      index: true,
    },
    phone: { type: String, trim: true },
    baseMonthlySalary: { type: Number, required: true, min: 0 },
    avatarColor: { type: String, default: '#38BDF8' },
    joiningDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    attendance: [AttendanceDaySchema],
    advances: [PeshgiAdvanceSchema],
    settlementHistory: [SalarySettlementSchema],
  },
  { timestamps: true }
);

DomesticHelpStaffSchema.index({ profileId: 1, staffName: 1, role: 1 });

export const DomesticHelpStaff = model<IDomesticHelpStaff>(
  'DomesticHelpStaff',
  DomesticHelpStaffSchema
);
