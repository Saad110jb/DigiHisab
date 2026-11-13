import { Schema, model, Document } from 'mongoose';

export type BullionTrend = 'UP' | 'DOWN' | 'STABLE';

export interface IBullionRate extends Document {
  gold24kPerTola: number;
  gold22kPerTola: number;
  gold21kPerTola: number;
  gold18kPerTola: number;
  gold24kPer10g: number;
  gold22kPer10g: number;
  gold24kPerGram: number;
  silverPerTola: number;
  silverPer10g: number;
  silverPerGram: number;
  silverNisabThreshold: number; // 52.5 Tolas * silverPerTola
  goldNisabThreshold: number;   // 7.5 Tolas * gold24kPerTola
  silverNisabGrams: number;     // 612.36g
  goldNisabGrams: number;       // 87.48g
  canonicalNisabBasis: 'SILVER';
  canonicalNisabThreshold: number; // Defaults to silverNisabThreshold in Pakistani jurisprudence
  market: string;
  source: string;
  dateStr: string;              // YYYY-MM-DD
  isLive: boolean;
  change24kPerTola: number;
  trend: BullionTrend;
  createdAt: Date;
  updatedAt: Date;
}

const BullionRateSchema = new Schema<IBullionRate>(
  {
    gold24kPerTola: { type: Number, required: true },
    gold22kPerTola: { type: Number, required: true },
    gold21kPerTola: { type: Number, required: true },
    gold18kPerTola: { type: Number, required: true },
    gold24kPer10g: { type: Number, required: true },
    gold22kPer10g: { type: Number, required: true },
    gold24kPerGram: { type: Number, required: true },
    silverPerTola: { type: Number, required: true },
    silverPer10g: { type: Number, required: true },
    silverPerGram: { type: Number, required: true },
    silverNisabThreshold: { type: Number, required: true },
    goldNisabThreshold: { type: Number, required: true },
    silverNisabGrams: { type: Number, default: 612.36 },
    goldNisabGrams: { type: Number, default: 87.48 },
    canonicalNisabBasis: { type: String, default: 'SILVER' },
    canonicalNisabThreshold: { type: Number, required: true },
    market: { type: String, default: 'Karachi Sarafa Jewellers Association (KSJA)' },
    source: { type: String, default: 'sarafa_feed' },
    dateStr: { type: String, required: true, index: true },
    isLive: { type: Boolean, default: true },
    change24kPerTola: { type: Number, default: 0 },
    trend: { type: String, enum: ['UP', 'DOWN', 'STABLE'], default: 'STABLE' },
  },
  {
    timestamps: true,
  }
);

BullionRateSchema.index({ dateStr: 1, createdAt: -1 });

export const BullionRate = model<IBullionRate>('BullionRate', BullionRateSchema);
