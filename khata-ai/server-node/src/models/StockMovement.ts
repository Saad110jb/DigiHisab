import { Schema, model, Document, Types } from 'mongoose';

export type MovementType = 'RESTOCK' | 'SALE' | 'DAMAGE_SPOILAGE' | 'SUPPLIER_RETURN' | 'ADJUSTMENT';

export interface IStockMovement extends Document {
  profileId: Types.ObjectId;
  inventoryItemId: Types.ObjectId;
  movementType: MovementType;
  quantityChange: number; // Positive for restock, negative for sale/spoilage
  previousStock: number;
  newStock: number;
  unitCost?: number;
  referenceId?: Types.ObjectId; // E.g., LedgerEntryId or WholesalePurchaseOrderId
  notes?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: ['RESTOCK', 'SALE', 'DAMAGE_SPOILAGE', 'SUPPLIER_RETURN', 'ADJUSTMENT'],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    unitCost: { type: Number },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ profileId: 1, inventoryItemId: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>('StockMovement', StockMovementSchema);
