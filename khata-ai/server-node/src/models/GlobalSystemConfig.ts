import { Schema, model, Document } from 'mongoose';

export interface IGlobalSystemConfigDoc extends Document {
  key: string;
  subscriptionEnforcementActive: boolean; // Master system-wide kill-switch
  maintenanceMode: boolean;
  allowGrandfatheredPricing: boolean;
  featureFlags: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalSystemConfigSchema = new Schema<IGlobalSystemConfigDoc>(
  {
    key: { type: String, required: true, unique: true, default: 'MASTER_CONFIG' },
    subscriptionEnforcementActive: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    allowGrandfatheredPricing: { type: Boolean, default: true },
    featureFlags: {
      type: Map,
      of: Boolean,
      default: {
        FEATURE_VOICE_AI_ENTRY: true,
        FEATURE_AI_TAGAZA_TONES: true,
        FEATURE_AI_STOCK_PREDICTOR: true,
        FEATURE_AI_TILL_ANOMALY: true,
        FEATURE_CHOR_NAZAR_AUDIT: true,
        FEATURE_WHATSAPP_PAYLINK: true,
        FEATURE_LESCO_SUBMETER: true,
        FEATURE_KAMETI_TRACKER: true,
        FEATURE_THERMAL_PRINTING: true,
      }
    }
  },
  { timestamps: true }
);

export const GlobalSystemConfigModel = model<IGlobalSystemConfigDoc>(
  'GlobalSystemConfig',
  GlobalSystemConfigSchema
);
