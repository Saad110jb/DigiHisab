import { Schema, model, Document, Types } from 'mongoose';

export type KametiRole = 'PARTICIPANT' | 'ORGANIZER';
export type DomesticKametiStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
export type MemberInviteStatus = 'LINKED' | 'INVITE_PENDING' | 'UNREGISTERED';

export interface IInstallmentPayment {
  cycleNumber: number;
  monthKey: string; // "2026-10"
  paidAmount: number;
  paymentDate: Date;
  debitedFromVaultAccountId?: Types.ObjectId; // References VaultAccount
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'OTHER';
  transactionId?: string;
  notes?: string;
  ledgerEntryId?: Types.ObjectId;
}

export interface IOrganizerMember {
  _id?: Types.ObjectId;
  memberName: string;
  memberPhone: string;
  normalizedPhone?: string;
  memberProfileId?: Types.ObjectId;
  inviteStatus?: MemberInviteStatus;
  payoutMonth: number;
  payoutReceived: boolean;
  paidCycles: number[];
  lastNotifiedAt?: Date;
  joinedAt?: Date;
}

export interface IDomesticKameti extends Document {
  profileId: Types.ObjectId;
  title: string; // e.g. "باجی شازیہ محلہ کمیٹی", "آفس بی سی 2026", "عمرہ بچت فنڈ"
  role: KametiRole; // 'PARTICIPANT' vs 'ORGANIZER'
  organizerName: string; // e.g. "باجی شازیہ", "طارق بھائی", "خودی (Self)"
  organizerPhone?: string;

  // Financial Sizing
  monthlyContribution: number; // e.g. Rs. 10,000
  totalMonths: number; // e.g. 10 months / 10 members
  poolAmount: number; // monthlyContribution * totalMonths (e.g. Rs. 100,000)
  startDate: Date;

  // Current State
  currentCycle: number; // 1 to totalMonths
  status: DomesticKametiStatus;

  // Participant Specific Fields (When user is a member)
  userPayoutMonth: number; // Target payout cycle (e.g. Month 4 of 10)
  payoutReceived: boolean;
  payoutDate?: Date;
  payoutAmountReceived?: number;
  creditedToVaultAccountId?: Types.ObjectId; // References VaultAccount
  
  // Installment History
  installments: IInstallmentPayment[];
  
  // Organizer Specific Members
  members: IOrganizerMember[];

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InstallmentPaymentSchema = new Schema<IInstallmentPayment>(
  {
    cycleNumber: { type: Number, required: true },
    monthKey: { type: String, required: true },
    paidAmount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, default: Date.now },
    debitedFromVaultAccountId: { type: Schema.Types.ObjectId, ref: 'VaultAccount' },
    paymentMode: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'OTHER'],
      default: 'CASH',
    },
    transactionId: { type: String, trim: true },
    notes: { type: String, trim: true },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
  },
  { _id: true }
);

const OrganizerMemberSchema = new Schema<IOrganizerMember>(
  {
    memberName: { type: String, required: true, trim: true },
    memberPhone: { type: String, trim: true },
    normalizedPhone: { type: String, trim: true },
    memberProfileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    inviteStatus: {
      type: String,
      enum: ['LINKED', 'INVITE_PENDING', 'UNREGISTERED'],
      default: 'UNREGISTERED',
    },
    payoutMonth: { type: Number, required: true },
    payoutReceived: { type: Boolean, default: false },
    paidCycles: [{ type: Number }],
    lastNotifiedAt: { type: Date },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DomesticKametiSchema = new Schema<IDomesticKameti>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['PARTICIPANT', 'ORGANIZER'],
      default: 'PARTICIPANT',
      required: true,
    },
    organizerName: { type: String, required: true, trim: true },
    organizerPhone: { type: String, trim: true },

    monthlyContribution: { type: Number, required: true, min: 100 },
    totalMonths: { type: Number, required: true, min: 2 },
    poolAmount: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },

    currentCycle: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'DEFAULTED'],
      default: 'ACTIVE',
    },

    userPayoutMonth: { type: Number, default: 1 },
    payoutReceived: { type: Boolean, default: false },
    payoutDate: { type: Date },
    payoutAmountReceived: { type: Number, default: 0 },
    creditedToVaultAccountId: { type: Schema.Types.ObjectId, ref: 'VaultAccount' },

    installments: [InstallmentPaymentSchema],
    members: [OrganizerMemberSchema],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DomesticKametiSchema.index({ profileId: 1, status: 1 });

export const DomesticKameti = model<IDomesticKameti>('DomesticKameti', DomesticKametiSchema);
