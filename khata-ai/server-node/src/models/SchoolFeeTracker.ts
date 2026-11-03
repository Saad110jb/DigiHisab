import { Schema, model, Document, Types } from 'mongoose';

export type EducationLevel = 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'ACADEMY';
export type FeeFrequency = 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';
export type FeePaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE';
export type FeePaymentMode = 'JAZZCASH' | 'EASYPAISA' | 'BANK_1BILL' | 'CASH' | 'RAAST';

export interface ISchoolFeeTracker extends Document {
  profileId: Types.ObjectId;

  // Child Profile
  childName: string;
  childAvatarColor?: string;
  institutionName: string;
  gradeClass: string;
  educationLevel: EducationLevel;

  // Billing Cycle
  termOrMonth: string; // e.g. "2026-10" or "Term 1"
  feeFrequency: FeeFrequency;

  // Itemized Fee Components
  tuitionFeeAmount: number;
  vanTransportFeeAmount: number;
  vanDriverName?: string;
  vanDriverPhone?: string;
  academyFeeAmount: number;
  academyName?: string;
  stationeryUniformAmount: number;
  examFeeAmount: number;
  siblingDiscountAmount: number;
  otherChargesAmount: number;

  // Computed Financials
  totalDue: number;
  surchargeAmount: number;
  amountAfterDueDate: number;
  dueDate: Date;
  status: FeePaymentStatus;

  // Payment Verification & Proof
  isPaid: boolean;
  paidAt?: Date;
  paymentMode?: FeePaymentMode;
  challanVoucherNo?: string;
  bankTransactionId?: string;
  voucherPdfUrl?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SchoolFeeTrackerSchema = new Schema<ISchoolFeeTracker>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    childName: { type: String, required: true, trim: true, index: true },
    childAvatarColor: { type: String, default: '#818CF8' },
    institutionName: { type: String, required: true, trim: true },
    gradeClass: { type: String, required: true, trim: true },
    educationLevel: {
      type: String,
      enum: ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'ACADEMY'],
      default: 'SCHOOL',
    },
    termOrMonth: { type: String, required: true, trim: true, index: true },
    feeFrequency: {
      type: String,
      enum: ['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL'],
      default: 'MONTHLY',
    },
    tuitionFeeAmount: { type: Number, required: true, min: 0 },
    vanTransportFeeAmount: { type: Number, default: 0, min: 0 },
    vanDriverName: { type: String, trim: true },
    vanDriverPhone: { type: String, trim: true },
    academyFeeAmount: { type: Number, default: 0, min: 0 },
    academyName: { type: String, trim: true },
    stationeryUniformAmount: { type: Number, default: 0, min: 0 },
    examFeeAmount: { type: Number, default: 0, min: 0 },
    siblingDiscountAmount: { type: Number, default: 0, min: 0 },
    otherChargesAmount: { type: Number, default: 0, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    surchargeAmount: { type: Number, default: 500, min: 0 },
    amountAfterDueDate: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'OVERDUE'],
      default: 'UNPAID',
      index: true,
    },
    isPaid: { type: Boolean, default: false, index: true },
    paidAt: { type: Date },
    paymentMode: {
      type: String,
      enum: ['JAZZCASH', 'EASYPAISA', 'BANK_1BILL', 'CASH', 'RAAST'],
    },
    challanVoucherNo: { type: String, trim: true },
    bankTransactionId: { type: String, trim: true },
    voucherPdfUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

SchoolFeeTrackerSchema.index({ profileId: 1, dueDate: 1, isPaid: 1 });
SchoolFeeTrackerSchema.index({ profileId: 1, childName: 1, termOrMonth: 1 });

export const SchoolFeeTracker = model<ISchoolFeeTracker>(
  'SchoolFeeTracker',
  SchoolFeeTrackerSchema
);
