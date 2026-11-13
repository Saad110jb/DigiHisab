import { Schema, model, Document } from 'mongoose';

export type MandiCity = 'Lahore' | 'Karachi' | 'Rawalpindi' | 'Faisalabad' | 'Multan';
export type CommodityCategory =
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS_FLOUR'
  | 'PULSES'
  | 'POULTRY'
  | 'DAIRY'
  | 'GROCERIES';
export type PriceTrend = 'UP' | 'DOWN' | 'STABLE';

export interface IMandiMarketRate extends Document {
  commodityKey: string;
  nameEnglish: string;
  nameUrdu: string;
  category: CommodityCategory;
  unit: string;
  city: MandiCity;
  minimumPrice: number;
  maximumPrice: number;
  modalPrice: number;
  yesterdayPrice: number;
  changeAmount: number;
  changePercentage: number;
  trend: PriceTrend;
  marketSource: string;
  dateStr: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const MandiMarketRateSchema = new Schema<IMandiMarketRate>(
  {
    commodityKey: { type: String, required: true, index: true },
    nameEnglish: { type: String, required: true },
    nameUrdu: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'VEGETABLES',
        'FRUITS',
        'GRAINS_FLOUR',
        'PULSES',
        'POULTRY',
        'DAIRY',
        'GROCERIES',
      ],
      index: true,
    },
    unit: { type: String, required: true },
    city: {
      type: String,
      required: true,
      enum: ['Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan'],
      index: true,
    },
    minimumPrice: { type: Number, required: true },
    maximumPrice: { type: Number, required: true },
    modalPrice: { type: Number, required: true },
    yesterdayPrice: { type: Number, required: true },
    changeAmount: { type: Number, default: 0 },
    changePercentage: { type: Number, default: 0 },
    trend: {
      type: String,
      enum: ['UP', 'DOWN', 'STABLE'],
      default: 'STABLE',
    },
    marketSource: { type: String, default: 'PAMIS / Market Committee' },
    dateStr: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast city + date queries
MandiMarketRateSchema.index({ city: 1, dateStr: 1, commodityKey: 1 }, { unique: true });

export const MandiMarketRate = model<IMandiMarketRate>(
  'MandiMarketRate',
  MandiMarketRateSchema
);
