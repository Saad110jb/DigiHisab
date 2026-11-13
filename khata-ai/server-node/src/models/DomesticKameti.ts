import { Schema, model, Document, Types } from 'mongoose';

export type KametiRole = 'PARTICIPANT' | 'ORGANIZER';
export type DomesticKametiStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
export type MemberInviteStatus = 'LINKED' | 'INVITE_PENDING' | 'UNREGISTERED';
export type KametiType = 'STANDARD_ROTATING' | 'LUCKY_DRAW' | 'NEELAAM_BID';
export type PayoutStatus = 'SCHEDULED' | 'DISBURSED' | 'SKIPPED';

export interface IKametiDrawScheduleItem {
  cycleNumber: number; // 1 to totalMonths
  memberId: Types.ObjectId;
  memberName: string;
  memberPhone?: string;
  isPinned: boolean; // Pre-fixed slot (e.g. Organizer Month 1 or emergency claim)
  expectedPayoutAmount: number; // Pool amount
  bidDiscountAmount?: number; // Auction discount (for NEELAAM_BID)
  dividendPerMember?: number; // Discount dividend credited to other members
  netPayoutAmount: number; // expectedPayoutAmount - (bidDiscountAmount || 0)
  payoutStatus: PayoutStatus;
  payoutDate?: Date;
  voucherNumber?: string;
  disbursedByVaultId?: Types.ObjectId;
  paymentMode?: string;
  notes?: string;
}

export interface IPayoutVoucher {
  voucherNumber: string;
  cycleNumber: number;
  recipientName: string;
  recipientPhone?: string;
  grossPoolAmount: number;
  bidDiscountAmount: number;
  netAmount: number;
  paymentMode: string;
  disbursementDate: Date;
  shareSlipText: string;
}

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

  // Kameti Draw & Bidding Auction Extensions
  kametiType: KametiType;
  isDrawCompleted: boolean;
  drawDate?: Date;
  drawSeedHash?: string;
  drawSchedule: IKametiDrawScheduleItem[];
  payoutVouchers: IPayoutVoucher[];

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

const DrawScheduleItemSchema = new Schema<IKametiDrawScheduleItem>(
  {
    cycleNumber: { type: Number, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    memberName: { type: String, required: true, trim: true },
    memberPhone: { type: String, trim: true },
    isPinned: { type: Boolean, default: false },
    expectedPayoutAmount: { type: Number, required: true },
    bidDiscountAmount: { type: Number, default: 0 },
    dividendPerMember: { type: Number, default: 0 },
    netPayoutAmount: { type: Number, required: true },
    payoutStatus: {
      type: String,
      enum: ['SCHEDULED', 'DISBURSED', 'SKIPPED'],
      default: 'SCHEDULED',
    },
    payoutDate: { type: Date },
    voucherNumber: { type: String, trim: true },
    disbursedByVaultId: { type: Schema.Types.ObjectId, ref: 'VaultAccount' },
    paymentMode: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const PayoutVoucherSchema = new Schema<IPayoutVoucher>(
  {
    voucherNumber: { type: String, required: true, trim: true },
    cycleNumber: { type: Number, required: true },
    recipientName: { type: String, required: true, trim: true },
    recipientPhone: { type: String, trim: true },
    grossPoolAmount: { type: Number, required: true },
    bidDiscountAmount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    paymentMode: { type: String, default: 'CASH' },
    disbursementDate: { type: Date, default: Date.now },
    shareSlipText: { type: String, required: true },
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

    kametiType: {
      type: String,
      enum: ['STANDARD_ROTATING', 'LUCKY_DRAW', 'NEELAAM_BID'],
      default: 'STANDARD_ROTATING',
    },
    isDrawCompleted: { type: Boolean, default: false },
    drawDate: { type: Date },
    drawSeedHash: { type: String, trim: true },
    drawSchedule: [DrawScheduleItemSchema],
    payoutVouchers: [PayoutVoucherSchema],

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DomesticKametiSchema.index({ profileId: 1, status: 1 });

export const DomesticKameti = model<IDomesticKameti>('DomesticKameti', DomesticKametiSchema);
