import { Schema, model, Document, Types } from 'mongoose';

export type JobStatus = 'SCHEDULED' | 'DISPATCHED' | 'FAILED' | 'CANCELLED';

export interface IReminderJob extends Document {
  profileId: Types.ObjectId;
  counterpartyId: Types.ObjectId;
  recipientPhone: string;
  toneTier: number; // 1: Gentle, 2: Operational, 3: Formal Hold
  renderedTemplateText: string;
  scheduledFor: Date;
  status: JobStatus;
  waMessageId?: string; // Returned from Meta Cloud API
  dispatchedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderJobSchema = new Schema<IReminderJob>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    counterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Counterparty',
      required: true,
      index: true,
    },
    recipientPhone: { type: String, required: true },
    toneTier: { type: Number, required: true, min: 1, max: 3 },
    renderedTemplateText: { type: String, required: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'DISPATCHED', 'FAILED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    waMessageId: { type: String },
    dispatchedAt: { type: Date },
    failureReason: { type: String },
  },
  { timestamps: true }
);

ReminderJobSchema.index({ status: 1, scheduledFor: 1 });

export const ReminderJob = model<IReminderJob>('ReminderJob', ReminderJobSchema);
