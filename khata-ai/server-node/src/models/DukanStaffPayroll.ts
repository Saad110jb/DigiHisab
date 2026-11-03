import { Schema, model, Document, Types } from 'mongoose';

export interface IAttendanceRecord {
  date: string; // "YYYY-MM-DD"
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  notes?: string;
}

export interface IAdvanceKharcha {
  _id?: Types.ObjectId | string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  type: 'FOOD_KHARCHA' | 'ADVANCE_WAGE' | 'OTHER';
  note?: string;
}

export interface IPayoutHistoryRecord {
  month: string; // "YYYY-MM"
  daysWorked: number;
  grossEarned: number;
  advancesDeducted: number;
  netPaid: number;
  paidAt: Date;
  paymentMode: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';
  notes?: string;
}

export interface IDukanStaffPayroll extends Document {
  profileId: Types.ObjectId;
  staffName: string;
  phone: string;
  roleTitle: string; // Chota / Helper, Sales Boy, Cashier Assistant, Karigar, Manager
  wageType: 'DAILY' | 'MONTHLY';
  baseRate: number; // e.g. 800/day or 25000/month
  active: boolean;
  attendanceRecords: IAttendanceRecord[];
  advancesKharcha: IAdvanceKharcha[];
  payrollsHistory: IPayoutHistoryRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const DukanStaffPayrollSchema = new Schema<IDukanStaffPayroll>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    staffName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    roleTitle: { type: String, required: true, trim: true, default: 'Chota / Sales Boy' },
    wageType: { type: String, enum: ['DAILY', 'MONTHLY'], default: 'MONTHLY' },
    baseRate: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    attendanceRecords: [
      {
        date: { type: String, required: true },
        status: { type: String, enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'], required: true },
        notes: { type: String },
      },
    ],
    advancesKharcha: [
      {
        date: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ['FOOD_KHARCHA', 'ADVANCE_WAGE', 'OTHER'], default: 'FOOD_KHARCHA' },
        note: { type: String },
      },
    ],
    payrollsHistory: [
      {
        month: { type: String, required: true },
        daysWorked: { type: Number, required: true },
        grossEarned: { type: Number, required: true },
        advancesDeducted: { type: Number, required: true },
        netPaid: { type: Number, required: true },
        paidAt: { type: Date, default: Date.now },
        paymentMode: { type: String, default: 'PHYSICAL_CASH' },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

DukanStaffPayrollSchema.index({ profileId: 1, phone: 1 });

export const DukanStaffPayroll = model<IDukanStaffPayroll>(
  'DukanStaffPayroll',
  DukanStaffPayrollSchema
);
