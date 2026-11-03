import { Schema, model, Document, Types } from 'mongoose';

export type POStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface IPOItem {
  inventoryItemId?: Types.ObjectId;
  itemName: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
}

export interface IWholesalePurchaseOrder extends Document {
  profileId: Types.ObjectId;
  supplierCounterpartyId: Types.ObjectId;
  poNumber: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  status: POStatus;
  items: IPOItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const POItemSchema = new Schema<IPOItem>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: { type: String, required: true, trim: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const WholesalePurchaseOrderSchema = new Schema<IWholesalePurchaseOrder>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    supplierCounterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      required: true,
      index: true,
    },
    poNumber: { type: String, required: true, trim: true },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT',
    },
    items: [POItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIAL', 'PAID'],
      default: 'UNPAID',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

WholesalePurchaseOrderSchema.index({ profileId: 1, poNumber: 1 }, { unique: true });

export const WholesalePurchaseOrder = model<IWholesalePurchaseOrder>(
  'WholesalePurchaseOrder',
  WholesalePurchaseOrderSchema
);
