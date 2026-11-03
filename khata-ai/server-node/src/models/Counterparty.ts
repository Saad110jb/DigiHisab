import { Schema, model, Document, Types } from 'mongoose';

export type RelationType = 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'FAMILY';
export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupplierCategory = 'MANDI_SUPPLIER' | 'FMCG_DISTRIBUTOR' | 'DAIRY_VENDOR' | 'LOCAL_VENDOR' | 'GENERAL_WHOLESALER';
export type TradeCreditTermType = 'NET_7' | 'NET_15' | 'NET_30' | 'WEEKLY_MANDI' | 'CUSTOM';

export type RfmSegment = 'VIP' | 'LOYAL' | 'AT_RISK' | 'CREDIT_DEBTOR' | 'NEW';

export interface ILoyaltyProfile {
  rfmSegment: RfmSegment;
  recencyDays: number;
  frequency90d: number;
  monetarySpend90d: number;
  lastVisitDate?: Date;
  rfmScore?: { r: number; f: number; m: number };
  lastCampaignSentAt?: Date;
}

export interface ICounterparty extends Document {
  profileId: Types.ObjectId;
  name: string;
  phone: string; // E.164 format (+923...)
  alternatePhone?: string;
  email?: string; // Optional email / Gmail address
  address?: string; // Neighborhood / Mohallah / Shop address
  cnic?: string; // Pakistani CNIC format (XXXXX-XXXXXXX-X)
  relationType: RelationType;
  currentBalance: number; // Positive = Receivable (Maine Diye); Negative = Payable (Maine Liye)
  creditLimit: number; // Dynamic limit ceiling (e.g., 15000 PKR)
  defaultReturnDays?: number; // Promised credit cycle default (e.g., 7, 15, 30 days)
  isCreditBlocked: boolean; // Flags Psychological "Credit Lock" screen
  advanceDeposit?: number; // Prepayments & Security Deposits paid to supplier
  supplierCategory?: SupplierCategory;
  deliveryRep?: {
    name?: string;
    phone?: string;
  };
  companyBankDetails?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
  };
  tradeCreditTerms?: {
    termType: TradeCreditTermType;
    creditPeriodDays: number;
    settlementScheduleNote?: string;
  };
  riskProfile: {
    defaultProbability: number; // ML prediction score (0.0 to 1.0)
    riskTier: RiskTier;
    lastEvaluatedAt?: Date;
    overdueDays: number;
    currentToneTier: number; // 1: Gentle, 2: Operational, 3: Formal Hold
    lastReminderSentAt?: Date;
  };
  settlementOffer?: {
    eligible: boolean;
    originalDebt: number;
    discountedAmount: number;
    expiresAt: Date;
  };
  loyaltyProfile?: ILoyaltyProfile;
  notes?: string;
  isArchived?: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CounterpartySchema = new Schema<ICounterparty>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    cnic: { type: String, trim: true },
    relationType: {
      type: String,
      enum: ['CUSTOMER', 'SUPPLIER', 'STAFF', 'FAMILY'],
      required: true,
    },
    currentBalance: { type: Number, default: 0.0 },
    creditLimit: { type: Number, default: 5000.0 },
    defaultReturnDays: { type: Number, default: 7 },
    isCreditBlocked: { type: Boolean, default: false },
    advanceDeposit: { type: Number, default: 0.0 },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    supplierCategory: {
      type: String,
      enum: ['MANDI_SUPPLIER', 'FMCG_DISTRIBUTOR', 'DAIRY_VENDOR', 'LOCAL_VENDOR', 'GENERAL_WHOLESALER'],
    },
    deliveryRep: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    companyBankDetails: {
      bankName: { type: String, trim: true },
      accountTitle: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      iban: { type: String, trim: true },
    },
    tradeCreditTerms: {
      termType: {
        type: String,
        enum: ['NET_7', 'NET_15', 'NET_30', 'WEEKLY_MANDI', 'CUSTOM'],
        default: 'NET_7',
      },
      creditPeriodDays: { type: Number, default: 7 },
      settlementScheduleNote: { type: String, trim: true },
    },
    riskProfile: {
      defaultProbability: { type: Number, default: 0.0, min: 0.0, max: 1.0 },
      riskTier: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW',
      },
      lastEvaluatedAt: { type: Date },
      overdueDays: { type: Number, default: 0 },
      currentToneTier: { type: Number, default: 1, min: 1, max: 3 },
      lastReminderSentAt: { type: Date },
    },
    settlementOffer: {
      eligible: { type: Boolean, default: false },
      originalDebt: { type: Number },
      discountedAmount: { type: Number },
      expiresAt: { type: Date },
    },
    loyaltyProfile: {
      rfmSegment: {
        type: String,
        enum: ['VIP', 'LOYAL', 'AT_RISK', 'CREDIT_DEBTOR', 'NEW'],
        default: 'NEW',
      },
      recencyDays: { type: Number, default: 0 },
      frequency90d: { type: Number, default: 0 },
      monetarySpend90d: { type: Number, default: 0 },
      lastVisitDate: { type: Date },
      rfmScore: {
        r: { type: Number, default: 1 },
        f: { type: Number, default: 1 },
        m: { type: Number, default: 1 },
      },
      lastCampaignSentAt: { type: Date },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CounterpartySchema.index({ profileId: 1, phone: 1 }, { unique: true });
CounterpartySchema.index({ profileId: 1, relationType: 1 });
CounterpartySchema.index({ 'riskProfile.riskTier': 1, 'riskProfile.overdueDays': -1 });

export const Counterparty = model<ICounterparty>('Counterparty', CounterpartySchema);
