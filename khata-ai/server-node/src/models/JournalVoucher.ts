import { Schema, model, Document, Types } from 'mongoose';
import { TargetVoucherType } from '../services/jevDoubleEntry.service';

export interface IJournalVoucherLine {
  code: string;
  title: string;
  debit: number;
  credit: number;
  description?: string;
}

export type VoucherReferenceType =
  | 'PURCHASE_ORDER'
  | 'SALE'
  | 'EXPENSE'
  | 'UDHAAR_SETTLEMENT'
  | 'BANK_RECONCILIATION'
  | 'MANUAL';

export interface IJournalVoucher extends Document {
  profileId: Types.ObjectId;
  voucherNumber: string;
  voucherType: TargetVoucherType;
  date: Date;
  lines: IJournalVoucherLine[];
  totalDebit: number;
  totalCredit: number;
  discrepancy: number;
  isBalanced: boolean;
  narration: string;
  referenceType: VoucherReferenceType;
  referenceId?: Types.ObjectId | string;
  status: 'POSTED' | 'DRAFT' | 'VOID';
  postedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JournalVoucherLineSchema = new Schema<IJournalVoucherLine>(
  {
    code: { type: String, required: true },
    title: { type: String, required: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
    description: { type: String },
  },
  { _id: false }
);

const JournalVoucherSchema = new Schema<IJournalVoucher>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    voucherType: {
      type: String,
      enum: ['CPV', 'CRV', 'BPV', 'BRV', 'PV', 'SV', 'JV'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lines: {
      type: [JournalVoucherLineSchema],
      required: true,
      validate: [
        (val: IJournalVoucherLine[]) => val.length >= 2,
        'Double-entry journal voucher must contain at least 2 lines (debit and credit).',
      ],
    },
    totalDebit: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCredit: {
      type: Number,
      required: true,
      min: 0,
    },
    discrepancy: {
      type: Number,
      default: 0,
    },
    isBalanced: {
      type: Boolean,
      default: true,
      index: true,
    },
    narration: {
      type: String,
      required: true,
      trim: true,
    },
    referenceType: {
      type: String,
      enum: ['PURCHASE_ORDER', 'SALE', 'EXPENSE', 'UDHAAR_SETTLEMENT', 'BANK_RECONCILIATION', 'MANUAL'],
      default: 'MANUAL',
      index: true,
    },
    referenceId: {
      type: Schema.Types.Mixed,
      index: true,
    },
    status: {
      type: String,
      enum: ['POSTED', 'DRAFT', 'VOID'],
      default: 'POSTED',
      index: true,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
    },
  },
  { timestamps: true }
);

JournalVoucherSchema.index({ profileId: 1, date: -1 });
JournalVoucherSchema.index({ profileId: 1, voucherType: 1, date: -1 });

export const JournalVoucher = model<IJournalVoucher>('JournalVoucher', JournalVoucherSchema);
