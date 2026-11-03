import { Schema, model, Document, Types } from 'mongoose';

export type TrustTier = 'HIGH_TRUST' | 'MODERATE_RISK' | 'CRITICAL_RISK';

export interface IDetectedAnomaly {
  type: string;
  descriptionUr: string;
  descriptionEn: string;
  detectedAt: Date;
  timestampFormatted: string;
  amountInvolved?: number;
  riskWeight: number;
}

export interface ICashierTrustProfile extends Document {
  profileId: Types.ObjectId;
  subAccountId: Types.ObjectId;
  cashierName: string;
  cashierPhone: string;
  trustScore: number; // 0 to 100
  trustTier: TrustTier;
  trailing7dMetrics: {
    totalSalesHandled: number;
    totalVoidCount: number;
    totalVoidAmount: number;
    noSaleDrawerOpens: number;
    consecutiveDeficitDays: number;
    cumulativeDeficitPkr: number;
    suspiciousEventCount: number;
  };
  detectedAnomalies: IDetectedAnomaly[];
  lastAuditedAt: Date;
  weeklySavingsEstimatedPkr: number;
  isVoidRestricted: boolean; // Flag if owner revoked void privileges
  createdAt: Date;
  updatedAt: Date;
}

const CashierTrustProfileSchema = new Schema<ICashierTrustProfile>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    subAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    cashierName: {
      type: String,
      required: true,
      trim: true,
    },
    cashierPhone: {
      type: String,
      default: '',
      trim: true,
    },
    trustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 95,
    },
    trustTier: {
      type: String,
      enum: ['HIGH_TRUST', 'MODERATE_RISK', 'CRITICAL_RISK'],
      default: 'HIGH_TRUST',
    },
    trailing7dMetrics: {
      totalSalesHandled: { type: Number, default: 0 },
      totalVoidCount: { type: Number, default: 0 },
      totalVoidAmount: { type: Number, default: 0 },
      noSaleDrawerOpens: { type: Number, default: 0 },
      consecutiveDeficitDays: { type: Number, default: 0 },
      cumulativeDeficitPkr: { type: Number, default: 0 },
      suspiciousEventCount: { type: Number, default: 0 },
    },
    detectedAnomalies: [
      {
        type: { type: String, required: true },
        descriptionUr: { type: String, required: true },
        descriptionEn: { type: String, required: true },
        detectedAt: { type: Date, default: Date.now },
        timestampFormatted: { type: String, required: true },
        amountInvolved: { type: Number, default: 0 },
        riskWeight: { type: Number, default: 10 },
      },
    ],
    lastAuditedAt: {
      type: Date,
      default: Date.now,
    },
    weeklySavingsEstimatedPkr: {
      type: Number,
      default: 0,
    },
    isVoidRestricted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CashierTrustProfileSchema.index({ profileId: 1, subAccountId: 1 }, { unique: true });

export const CashierTrustProfile = model<ICashierTrustProfile>(
  'CashierTrustProfile',
  CashierTrustProfileSchema
);
