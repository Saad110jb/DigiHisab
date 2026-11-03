import { Schema, model, Document, Types } from 'mongoose';

export type IncomeSourceType =
  | 'SALARY'
  | 'SHOP_PROFIT_DRAWING'
  | 'RENTAL_YIELD'
  | 'FOREIGN_REMITTANCE'
  | 'AGRICULTURE'
  | 'FREELANCE_TUITION'
  | 'OTHER';

export type VaultAccountType =
  | 'PHYSICAL_CASH_SAFE'
  | 'COMMERCIAL_BANK'
  | 'MOBILE_WALLET'
  | 'DIGITAL_GOLD';

export type SavingsBucketCategory =
  | 'EMERGENCY_MEDICAL'
  | 'QURBANI_EID'
  | 'KAMETI_POOL'
  | 'HOME_REPAIR'
  | 'CHILD_EDUCATION';

// 1. Vault Account Document
export interface IVaultAccountDoc extends Document {
  profileId: Types.ObjectId;
  accountTitle: string;
  accountType: VaultAccountType;
  institutionName: string;
  accountIdentifier?: string;
  currentBalance: number;
  lastReconciledAt: Date;
  isArchived: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VaultAccountSchema = new Schema<IVaultAccountDoc>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    accountTitle: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ['PHYSICAL_CASH_SAFE', 'COMMERCIAL_BANK', 'MOBILE_WALLET', 'DIGITAL_GOLD'],
      required: true,
      index: true,
    },
    institutionName: { type: String, required: true, trim: true },
    accountIdentifier: { type: String, trim: true },
    currentBalance: { type: Number, required: true, default: 0 },
    lastReconciledAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

VaultAccountSchema.index({ profileId: 1, accountType: 1 });

// 2. Savings Bucket Document
export interface ISavingsBucketDoc extends Document {
  profileId: Types.ObjectId;
  title: string;
  category: SavingsBucketCategory;
  targetAmount: number;
  currentSavedAmount: number;
  monthlyDepositTarget: number;
  linkedVaultAccountId?: Types.ObjectId;
  targetDate?: Date;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsBucketSchema = new Schema<ISavingsBucketDoc>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['EMERGENCY_MEDICAL', 'QURBANI_EID', 'KAMETI_POOL', 'HOME_REPAIR', 'CHILD_EDUCATION'],
      required: true,
      index: true,
    },
    targetAmount: { type: Number, required: true, min: 0 },
    currentSavedAmount: { type: Number, required: true, default: 0, min: 0 },
    monthlyDepositTarget: { type: Number, required: true, default: 0, min: 0 },
    linkedVaultAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'VaultAccount',
    },
    targetDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

SavingsBucketSchema.index({ profileId: 1, category: 1 });

// 3. Household Income Record Document
export interface IHouseholdIncomeRecordDoc extends Document {
  profileId: Types.ObjectId;
  sourceType: IncomeSourceType;
  title: string;
  amount: number;
  dateReceived: Date;
  depositedToAccountId: Types.ObjectId;
  isRecurringMonthly: boolean;
  notes?: string;
  crvNumber: string; // Cash Receipt Voucher Number (e.g. "CRV-202610-001")
  ledgerEntryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdIncomeRecordSchema = new Schema<IHouseholdIncomeRecordDoc>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: [
        'SALARY',
        'SHOP_PROFIT_DRAWING',
        'RENTAL_YIELD',
        'FOREIGN_REMITTANCE',
        'AGRICULTURE',
        'FREELANCE_TUITION',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    dateReceived: { type: Date, required: true, default: Date.now },
    depositedToAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'VaultAccount',
      required: true,
    },
    isRecurringMonthly: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    crvNumber: { type: String, required: true, trim: true },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
  },
  { timestamps: true }
);

HouseholdIncomeRecordSchema.index({ profileId: 1, dateReceived: -1 });

export const VaultAccount = model<IVaultAccountDoc>('VaultAccount', VaultAccountSchema);
export const SavingsBucket = model<ISavingsBucketDoc>('SavingsBucket', SavingsBucketSchema);
export const HouseholdIncomeRecord = model<IHouseholdIncomeRecordDoc>(
  'HouseholdIncomeRecord',
  HouseholdIncomeRecordSchema
);
