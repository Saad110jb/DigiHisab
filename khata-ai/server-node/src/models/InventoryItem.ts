import { Schema, model, Document, Types } from 'mongoose';

export interface IInventoryItem extends Document {
  profileId: Types.ObjectId;
  sku: string;
  barcode?: string;
  itemName: string;
  category: string;
  stockOnHand: number;
  lowStockThreshold: number;
  wholesaleCost: number; // Unit purchase price
  retailPrice: number;   // Selling price to customer
  unitOfMeasure: 'PCS' | 'KG' | 'LITER' | 'PACK' | 'BOX';
  supplierCounterpartyId?: Types.ObjectId;
  expiryDate?: Date;
  batchNumber?: string;
  isPerishable?: boolean;
  lastSoldAt?: Date;
  markdownDiscountPercent?: number;
  promotionalBundleId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    itemName: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    stockOnHand: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    wholesaleCost: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    unitOfMeasure: {
      type: String,
      enum: ['PCS', 'KG', 'LITER', 'PACK', 'BOX'],
      default: 'PCS',
    },
    supplierCounterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    expiryDate: { type: Date, index: true },
    batchNumber: { type: String, trim: true },
    isPerishable: { type: Boolean, default: false },
    lastSoldAt: { type: Date },
    markdownDiscountPercent: { type: Number, default: 0, min: 0, max: 90 },
    promotionalBundleId: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ profileId: 1, sku: 1 }, { unique: true });
InventoryItemSchema.index({ profileId: 1, itemName: 'text' });

export const InventoryItem = model<IInventoryItem>('InventoryItem', InventoryItemSchema);
