import { Schema, model, Document } from 'mongoose';

export type PersonaScope = 'DUKANDAR_ONLY' | 'HOUSEHOLD_ONLY' | 'DUAL_ACCESS';

export interface ISubscriptionTierDoc extends Document {
  planKey: string;
  name: string;
  nameUrdu: string;
  personaScope: PersonaScope;
  pricePKR: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  trialDays: number;
  isActive: boolean;
  isRecommended: boolean;
  quotas: {
    maxCustomers: number;
    maxSubAccounts: number;
    monthlyWhatsAppReminders: number;
    maxVaultAccounts: number;
  };
  allowedFeatures: string[];
  featuresList: Array<{
    key: string;
    label: string;
    labelUrdu: string;
    enabled: boolean;
    isAi: boolean;
  }>;
  activeSubscribers: number;
  mrrContributionPKR: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionTierSchema = new Schema<ISubscriptionTierDoc>(
  {
    planKey: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameUrdu: { type: String, required: true },
    personaScope: {
      type: String,
      enum: ['DUKANDAR_ONLY', 'HOUSEHOLD_ONLY', 'DUAL_ACCESS'],
      required: true,
      default: 'DUKANDAR_ONLY'
    },
    pricePKR: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    trialDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isRecommended: { type: Boolean, default: false },
    quotas: {
      maxCustomers: { type: Number, default: 20 },
      maxSubAccounts: { type: Number, default: 0 },
      monthlyWhatsAppReminders: { type: Number, default: 30 },
      maxVaultAccounts: { type: Number, default: 1 }
    },
    allowedFeatures: [{ type: String }],
    featuresList: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        labelUrdu: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        isAi: { type: Boolean, default: false }
      }
    ],
    activeSubscribers: { type: Number, default: 0 },
    mrrContributionPKR: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const SubscriptionTierModel = model<ISubscriptionTierDoc>(
  'SubscriptionTier',
  SubscriptionTierSchema
);
