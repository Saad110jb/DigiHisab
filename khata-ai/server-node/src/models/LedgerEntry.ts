import { Schema, model, Document, Types } from 'mongoose';

export type EntryType =
  | 'RECEIVABLE'  // Udhaar Diya (Customer owes you)
  | 'PAYABLE'     // Udhaar Liya (You owe supplier)
  | 'CASH_IN'     // Cash sale / Domestic income
  | 'CASH_OUT'    // Store operational cost / Discretionary domestic expense
  | 'SETTLEMENT'; // Payment settling an outstanding balance

export type PaymentMode =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'JAZZCASH'
  | 'EASYPAISA'
  | 'CREDIT'
  | 'PHYSICAL_CASH'
  | 'DIGITAL_WALLET'
  | 'BANK_ACCOUNT';

export interface ILedgerItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ILedgerEntry extends Document {
  profileId: Types.ObjectId;
  counterpartyId?: Types.ObjectId;
  subAccountId?: Types.ObjectId; // Recorded by cashier/family member
  entryType: EntryType;
  amount: number;
  paymentMode: PaymentMode;
  category: string; // e.g., "Dairy", "Cooking Oil", "Electricity", "Groceries"
  description?: string;
  items?: ILedgerItem[];
  receiptImageUrl?: string; // Photo of handwritten counter slip / Kacha Parcha
  rawInput?: string; // Captured voice transcript or Roman Urdu text
  inputMode: 'MANUAL' | 'VOICE' | 'OCR' | 'WHATSAPP';
  dueDate?: Date;
  isSettled: boolean;
  settledAt?: Date;
  wasOverridden: boolean; // True if logged despite exceeding credit ceiling
  isAnomaly: boolean; // Flagged by Isolation Forest spend anomaly detector
  marginAudit?: {
    unitPurchaseCost?: number;
    retailSellingPrice?: number;
    unitMarginLossDetected?: boolean;
  };
  receiptPdfUrl?: string;
  discountAmount?: number;
  settlementContractId?: Types.ObjectId;
  ocrData?: {
    extractedAmount?: number;
    extractedVendorName?: string;
    extractedInvoiceNo?: string;
    extractedDate?: string;
    extractedCategory?: string;
    rawOcrText?: string;
    confidenceScore?: number;
    extractedItems?: ILedgerItem[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    counterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      index: true,
    },
    subAccountId: { type: Schema.Types.ObjectId },
    entryType: {
      type: String,
      enum: ['RECEIVABLE', 'PAYABLE', 'CASH_IN', 'CASH_OUT', 'SETTLEMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Transaction amount must be positive'],
    },
    paymentMode: {
      type: String,
      enum: [
        'CASH',
        'BANK_TRANSFER',
        'JAZZCASH',
        'EASYPAISA',
        'CREDIT',
        'PHYSICAL_CASH',
        'DIGITAL_WALLET',
        'BANK_ACCOUNT',
      ],
      default: 'CREDIT',
    },
    category: { type: String, default: 'General', trim: true, index: true },
    description: { type: String, trim: true },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    receiptImageUrl: { type: String },
    rawInput: { type: String },
    inputMode: {
      type: String,
      enum: ['MANUAL', 'VOICE', 'OCR', 'WHATSAPP'],
      default: 'MANUAL',
    },
    dueDate: { type: Date },
    isSettled: { type: Boolean, default: false, index: true },
    settledAt: { type: Date },
    wasOverridden: { type: Boolean, default: false },
    isAnomaly: { type: Boolean, default: false },
    marginAudit: {
      unitPurchaseCost: { type: Number },
      retailSellingPrice: { type: Number },
      unitMarginLossDetected: { type: Boolean, default: false },
    },
    receiptPdfUrl: { type: String },
    discountAmount: { type: Number, default: 0 },
    settlementContractId: { type: Schema.Types.ObjectId, ref: 'SettlementContract' },
    ocrData: {
      extractedAmount: { type: Number },
      extractedVendorName: { type: String },
      extractedInvoiceNo: { type: String },
      extractedDate: { type: String },
      extractedCategory: { type: String },
      rawOcrText: { type: String },
      confidenceScore: { type: Number },
      extractedItems: [
        {
          name: { type: String },
          quantity: { type: Number },
          unitPrice: { type: Number },
          total: { type: Number },
        },
      ],
    },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ profileId: 1, createdAt: -1 });
LedgerEntrySchema.index({ counterpartyId: 1, isSettled: 1, createdAt: -1 });
LedgerEntrySchema.index({ profileId: 1, entryType: 1, createdAt: -1 });

export const LedgerEntry = model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
