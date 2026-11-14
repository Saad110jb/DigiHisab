import { Schema, model, Document, Types } from 'mongoose';

export type ReconciliationMatchStatus =
  | 'UNMATCHED'
  | 'EXACT_MATCH'
  | 'PROBABLE_MATCH'
  | 'RECONCILED'
  | 'ADJUSTED';

export interface IBankStatementTransaction {
  transactionDate: Date;
  description: string;
  referenceNo?: string; // Raast ID or Bank UTR
  withdrawal: number;
  deposit: number;
  runningBalance?: number;
  matchStatus: ReconciliationMatchStatus;
  matchedLedgerEntryId?: Types.ObjectId;
  matchedVoucherId?: Types.ObjectId;
  variance?: number;
  notes?: string;
}

export interface IBankReconciliation extends Document {
  profileId: Types.ObjectId;
  bankName: string;
  accountNumber: string;
  statementStartDate: Date;
  statementEndDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: IBankStatementTransaction[];
  totalDeposits: number;
  totalWithdrawals: number;
  reconciledCount: number;
  unmatchedCount: number;
  status: 'IN_PROGRESS' | 'RECONCILED' | 'DISCREPANCY_FLAGGED';
  createdAt: Date;
  updatedAt: Date;
}

const BankStatementTransactionSchema = new Schema<IBankStatementTransaction>(
  {
    transactionDate: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    referenceNo: { type: String, trim: true, index: true },
    withdrawal: { type: Number, default: 0, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    runningBalance: { type: Number },
    matchStatus: {
      type: String,
      enum: ['UNMATCHED', 'EXACT_MATCH', 'PROBABLE_MATCH', 'RECONCILED', 'ADJUSTED'],
      default: 'UNMATCHED',
      index: true,
    },
    matchedLedgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    matchedVoucherId: { type: Schema.Types.ObjectId, ref: 'JournalVoucher' },
    variance: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: true }
);

const BankReconciliationSchema = new Schema<IBankReconciliation>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      default: 'Meezan Bank / Raast',
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    statementStartDate: {
      type: Date,
      required: true,
    },
    statementEndDate: {
      type: Date,
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    closingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    transactions: [BankStatementTransactionSchema],
    totalDeposits: {
      type: Number,
      default: 0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
    },
    reconciledCount: {
      type: Number,
      default: 0,
    },
    unmatchedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'RECONCILED', 'DISCREPANCY_FLAGGED'],
      default: 'IN_PROGRESS',
      index: true,
    },
  },
  { timestamps: true }
);

BankReconciliationSchema.index({ profileId: 1, statementEndDate: -1 });

export const BankReconciliation = model<IBankReconciliation>('BankReconciliation', BankReconciliationSchema);
