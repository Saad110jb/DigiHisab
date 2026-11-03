import { Schema, model, Document, Types } from 'mongoose';

export interface ISubMeterAllocation {
  _id?: Types.ObjectId;
  counterpartyId?: Types.ObjectId;
  tenantOrFloorName: string;
  subMeterUnitsConsumed: number;
  calculatedShare: number; // Computed rupee share factoring in tiered slab tariffs
  isCleared: boolean;
  clearedAt?: Date;
}

export interface IUtilitySplit extends Document {
  profileId: Types.ObjectId;
  utilityType: 'ELECTRICITY' | 'GAS' | 'WATER' | 'INTERNET';
  providerName: string; // e.g., LESCO, K-Electric, SNGPL
  billingMonth: string; // "YYYY-MM"
  totalBillAmount: number;
  totalUnitsConsumed?: number;
  billDueDate: Date;
  ocrExtractedData?: {
    rawImageUrl?: string;
    consumerNumber?: string;
    detectedPeakUnits?: number;
    detectedOffPeakUnits?: number;
    tariffSlabApplied?: string;
    ocrConfidence?: number;
  };
  isFullySettled: boolean;
  allocations: Types.DocumentArray<ISubMeterAllocation & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const SubMeterAllocationSchema = new Schema<ISubMeterAllocation>(
  {
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    tenantOrFloorName: { type: String, required: true, trim: true },
    subMeterUnitsConsumed: { type: Number, required: true, min: 0 },
    calculatedShare: { type: Number, required: true, min: 0 },
    isCleared: { type: Boolean, default: false },
    clearedAt: { type: Date },
  },
  { _id: true }
);

const UtilitySplitSchema = new Schema<IUtilitySplit>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    utilityType: {
      type: String,
      enum: ['ELECTRICITY', 'GAS', 'WATER', 'INTERNET'],
      required: true,
    },
    providerName: { type: String, default: 'General Utility', trim: true },
    billingMonth: { type: String, required: true },
    totalBillAmount: { type: Number, required: true, min: 1 },
    totalUnitsConsumed: { type: Number, default: 0 },
    billDueDate: { type: Date, required: true },
    ocrExtractedData: {
      rawImageUrl: { type: String },
      consumerNumber: { type: String },
      detectedPeakUnits: { type: Number },
      detectedOffPeakUnits: { type: Number },
      tariffSlabApplied: { type: String },
      ocrConfidence: { type: Number },
    },
    isFullySettled: { type: Boolean, default: false },
    allocations: [SubMeterAllocationSchema],
  },
  { timestamps: true }
);

UtilitySplitSchema.index({ profileId: 1, billingMonth: 1 });

export const UtilitySplit = model<IUtilitySplit>('UtilitySplit', UtilitySplitSchema);
