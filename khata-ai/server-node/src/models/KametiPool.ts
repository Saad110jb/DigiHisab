import { Schema, model, Document, Types } from 'mongoose';

export type KametiStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';

export interface IKametiMember {
  counterpartyId?: Types.ObjectId;
  memberName: string;
  memberPhone: string;
  payoutMonth: number; // Month index (1 to totalMonths)
  payoutReceived: boolean;
  payoutDate?: Date;
  paidMonths: number[]; // Array of completed cycle numbers, e.g., [1, 2, 3]
  unpaidLiability: number; // Exposure = Total Payout - (Monthly Contribution * Cycles Paid)
}

export interface IKametiPool extends Document {
  organizerProfileId: Types.ObjectId;
  title: string;
  monthlyContribution: number; // PKR per member per cycle
  totalMonths: number;
  poolAmount: number; // monthlyContribution * totalMonths
  currentCycle: number;
  startDate: Date;
  status: KametiStatus;
  members: IKametiMember[];
  createdAt: Date;
  updatedAt: Date;
}

const KametiMemberSchema = new Schema<IKametiMember>(
  {
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    memberName: { type: String, required: true, trim: true },
    memberPhone: { type: String, required: true, trim: true },
    payoutMonth: { type: Number, required: true, min: 1 },
    payoutReceived: { type: Boolean, default: false },
    payoutDate: { type: Date },
    paidMonths: [{ type: Number }],
    unpaidLiability: { type: Number, default: 0.0 },
  },
  { _id: true }
);

const KametiPoolSchema = new Schema<IKametiPool>(
  {
    organizerProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    monthlyContribution: { type: Number, required: true, min: 100 },
    totalMonths: { type: Number, required: true, min: 2 },
    poolAmount: { type: Number, required: true },
    currentCycle: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'DEFAULTED'],
      default: 'ACTIVE',
    },
    members: [KametiMemberSchema],
  },
  { timestamps: true }
);

KametiPoolSchema.index({ organizerProfileId: 1, status: 1 });

export const KametiPool = model<IKametiPool>('KametiPool', KametiPoolSchema);
