import { Schema, model, Document } from 'mongoose';

export interface IRegistrationOtp extends Document {
  email: string;
  phone: string;
  otpCode: string;
  persona: 'VENDOR' | 'HOUSEHOLD';
  expiresAt: Date;
  createdAt: Date;
}

const RegistrationOtpSchema = new Schema<IRegistrationOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    otpCode: { type: String, required: true },
    persona: { type: String, enum: ['VENDOR', 'HOUSEHOLD'], default: 'VENDOR' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index: auto-deletes when expiresAt is reached
  },
  { timestamps: true }
);

export const RegistrationOtp = model<IRegistrationOtp>('RegistrationOtp', RegistrationOtpSchema);
