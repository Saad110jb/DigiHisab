import { Schema, model, Document, Types } from 'mongoose';

export type NisabStandard = 'SILVER' | 'GOLD';
export type WeightUnit = 'TOLA' | 'GRAM';
export type GoldPurity = '24K' | '22K' | '21K' | '18K';
export type CharityType = 'ZAKAT' | 'SADQAH' | 'FITRANA';
export type MustahiqCategory =
  | 'RELATIVES'
  | 'DOMESTIC_STAFF'
  | 'WIDOW_ORPHAN'
  | 'MEDICAL_PATIENT'
  | 'MADRASSA_STUDENT'
  | 'DEBTOR_RELIEF'
  | 'GENERAL_NEED';

export type CharityPaymentMode = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'OTHER';

export interface IGoldHolding {
  weight: number;
  unit: WeightUnit;
  purity: GoldPurity;
  ratePerTola: number;
  calculatedValue: number;
}

export interface ISilverHolding {
  weight: number;
  unit: WeightUnit;
  ratePerTola: number;
  calculatedValue: number;
}

export interface ICharityDisbursement {
  _id?: Types.ObjectId;
  recipientName: string; // e.g. "بیوہ خالہ", "نسیم بی بی (ملازمہ)", "جامعہ اشرفیہ"
  recipientCategory: MustahiqCategory;
  purpose: string; // e.g. "بچوں کی اسکول فیس", "راشن پیکج", "علاج معالجہ"
  amount: number;
  disbursementDate: Date;
  charityType: CharityType;
  debitedFromVaultAccountId?: Types.ObjectId; // References VaultAccount
  paymentMode: CharityPaymentMode;
  isAnonymous: boolean; // Confidentiality flag to protect recipient dignity
  voucherNumber: string; // e.g. "ZKT-202610-001"
  notes?: string;
  ledgerEntryId?: Types.ObjectId;
}

export interface IZakatAssessment extends Document {
  profileId: Types.ObjectId;
  hijriYear: string; // e.g. "1448 AH (2026-2027)"
  assessmentDate: Date;
  nisabStandard: NisabStandard; // Default: 'SILVER'

  // Market Calibration Rates (PKR)
  goldRatePerTola: number; // e.g. Rs. 275,000
  silverRatePerTola: number; // e.g. Rs. 3,100
  nisabThresholdValue: number; // 52.5 * silverRatePerTola

  // Liquid & Cash Assets (Auto-synced from VaultAccount or overridden)
  cashInHand: number;
  bankBalances: number;
  digitalWallets: number; // JazzCash, EasyPaisa, SadaPay

  // Precious Metals
  goldHoldings: IGoldHolding;
  silverHoldings: ISilverHolding;

  // Savings & Receivables
  kametiReceivables: number; // Committee savings due (from SavingsBucket or KametiPool)
  recoverableLoans: number; // Qarz-e-Hasana given to others
  businessInventoryValue: number; // Goods for trade

  // Deductibles (Auto-synced from UtilityBill, SchoolFeeTracker, DomesticHelpStaff)
  unpaidUtilityBills: number;
  unpaidSchoolFees: number;
  unpaidStaffSalaries: number;
  otherShortTermDebts: number;

  // Computed Financials
  totalGrossEligibleAssets: number;
  totalDeductions: number;
  netTaxableWealth: number;
  isEligibleForZakat: boolean;
  totalZakatDue: number; // 2.5% of netTaxableWealth

  // Recipient Distribution Log
  disbursements: Types.DocumentArray<ICharityDisbursement & Document>;
  totalZakatDistributed: number;
  remainingZakatBalance: number;

  createdAt: Date;
  updatedAt: Date;
}

const CharityDisbursementSchema = new Schema<ICharityDisbursement>(
  {
    recipientName: { type: String, required: true, trim: true },
    recipientCategory: {
      type: String,
      enum: [
        'RELATIVES',
        'DOMESTIC_STAFF',
        'WIDOW_ORPHAN',
        'MEDICAL_PATIENT',
        'MADRASSA_STUDENT',
        'DEBTOR_RELIEF',
        'GENERAL_NEED',
      ],
      default: 'GENERAL_NEED',
    },
    purpose: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    disbursementDate: { type: Date, required: true, default: Date.now },
    charityType: {
      type: String,
      enum: ['ZAKAT', 'SADQAH', 'FITRANA'],
      default: 'ZAKAT',
    },
    debitedFromVaultAccountId: { type: Schema.Types.ObjectId, ref: 'VaultAccount' },
    paymentMode: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'OTHER'],
      default: 'CASH',
    },
    isAnonymous: { type: Boolean, default: false },
    voucherNumber: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
  },
  { timestamps: true }
);

const ZakatAssessmentSchema = new Schema<IZakatAssessment>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    hijriYear: { type: String, required: true, default: '1448 AH (2026-2027)' },
    assessmentDate: { type: Date, required: true, default: Date.now },
    nisabStandard: {
      type: String,
      enum: ['SILVER', 'GOLD'],
      default: 'SILVER',
    },

    goldRatePerTola: { type: Number, required: true, default: 275000 },
    silverRatePerTola: { type: Number, required: true, default: 3100 },
    nisabThresholdValue: { type: Number, required: true, default: 162750 }, // 52.5 * 3100

    cashInHand: { type: Number, default: 0, min: 0 },
    bankBalances: { type: Number, default: 0, min: 0 },
    digitalWallets: { type: Number, default: 0, min: 0 },

    goldHoldings: {
      weight: { type: Number, default: 0, min: 0 },
      unit: { type: String, enum: ['TOLA', 'GRAM'], default: 'TOLA' },
      purity: { type: String, enum: ['24K', '22K', '21K', '18K'], default: '22K' },
      ratePerTola: { type: Number, default: 275000 },
      calculatedValue: { type: Number, default: 0 },
    },

    silverHoldings: {
      weight: { type: Number, default: 0, min: 0 },
      unit: { type: String, enum: ['TOLA', 'GRAM'], default: 'TOLA' },
      ratePerTola: { type: Number, default: 3100 },
      calculatedValue: { type: Number, default: 0 },
    },

    kametiReceivables: { type: Number, default: 0, min: 0 },
    recoverableLoans: { type: Number, default: 0, min: 0 },
    businessInventoryValue: { type: Number, default: 0, min: 0 },

    unpaidUtilityBills: { type: Number, default: 0, min: 0 },
    unpaidSchoolFees: { type: Number, default: 0, min: 0 },
    unpaidStaffSalaries: { type: Number, default: 0, min: 0 },
    otherShortTermDebts: { type: Number, default: 0, min: 0 },

    totalGrossEligibleAssets: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netTaxableWealth: { type: Number, default: 0 },
    isEligibleForZakat: { type: Boolean, default: false },
    totalZakatDue: { type: Number, default: 0 },

    disbursements: [CharityDisbursementSchema],
    totalZakatDistributed: { type: Number, default: 0 },
    remainingZakatBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ZakatAssessmentSchema.index({ profileId: 1, assessmentDate: -1 });

export const ZakatAssessment = model<IZakatAssessment>('ZakatAssessment', ZakatAssessmentSchema);
