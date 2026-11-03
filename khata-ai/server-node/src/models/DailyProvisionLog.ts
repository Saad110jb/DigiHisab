import { Schema, model, Document, Types } from 'mongoose';

export interface IDailyProvisionLog extends Document {
  profileId: Types.ObjectId;
  date: string; // ISO canonical "YYYY-MM-DD"
  monthKey: string; // "YYYY-MM"
  
  // Milk Provision
  milkLiters: number;
  isMilkSkipped: boolean;
  milkRate: number;
  milkCost: number;
  
  // Roti / Naan Provision
  rotiCount: number;
  isRotiSkipped: boolean;
  rotiRate: number;
  rotiCost: number;
  
  // Aggregated Daily Total
  dailyTotal: number;
  notes?: string;
  loggedBy: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const DailyProvisionLogSchema = new Schema<IDailyProvisionLog>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    monthKey: {
      type: String,
      required: true,
      index: true,
    },
    milkLiters: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isMilkSkipped: {
      type: Boolean,
      default: false,
    },
    milkRate: {
      type: Number,
      required: true,
      default: 210,
      min: 0,
    },
    milkCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rotiCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isRotiSkipped: {
      type: Boolean,
      default: false,
    },
    rotiRate: {
      type: Number,
      required: true,
      default: 25,
      min: 0,
    },
    rotiCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    dailyTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    loggedBy: {
      type: String,
      default: 'HOUSEHOLD_USER',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index guaranteeing 1 log entry per day per household profile
DailyProvisionLogSchema.index({ profileId: 1, date: 1 }, { unique: true });
DailyProvisionLogSchema.index({ profileId: 1, monthKey: 1, date: 1 });

export const DailyProvisionLog = model<IDailyProvisionLog>(
  'DailyProvisionLog',
  DailyProvisionLogSchema
);
