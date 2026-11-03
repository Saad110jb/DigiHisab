import { Schema, model, Document, Types } from 'mongoose';

export interface IDailyProvisionAdvance {
  _id?: Types.ObjectId;
  date: string;
  amount: number;
  paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
  notes?: string;
  createdAt?: Date;
}

export interface IDailyProvisionSettings extends Document {
  profileId: Types.ObjectId;
  
  // Default Daily Volumes
  defaultMilkLiters: number;
  defaultRotiCount: number;
  
  // Base Rates (PKR)
  baseMilkRate: number;
  baseRotiRate: number;
  
  // Vendor Names / Details
  milkmanName: string;
  milkmanPhone?: string;
  tandoorName: string;
  tandoorPhone?: string;
  
  // Registered Advances
  advances: IDailyProvisionAdvance[];
  
  // Last Settled Month
  lastSettledMonth?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const DailyProvisionAdvanceSchema = new Schema<IDailyProvisionAdvance>(
  {
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentChannel: {
      type: String,
      enum: ['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK'],
      default: 'CASH',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const DailyProvisionSettingsSchema = new Schema<IDailyProvisionSettings>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    defaultMilkLiters: {
      type: Number,
      required: true,
      default: 1.5,
      min: 0,
    },
    defaultRotiCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    baseMilkRate: {
      type: Number,
      required: true,
      default: 210,
      min: 0,
    },
    baseRotiRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    milkmanName: {
      type: String,
      default: 'گوالہ (Gwalah)',
      trim: true,
    },
    milkmanPhone: {
      type: String,
      trim: true,
    },
    tandoorName: {
      type: String,
      default: 'نان بائی (Naanbai)',
      trim: true,
    },
    tandoorPhone: {
      type: String,
      trim: true,
    },
    advances: [DailyProvisionAdvanceSchema],
    lastSettledMonth: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const DailyProvisionSettings = model<IDailyProvisionSettings>(
  'DailyProvisionSettings',
  DailyProvisionSettingsSchema
);
