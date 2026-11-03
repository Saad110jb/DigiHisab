import { Schema, model, Document, Types } from 'mongoose';

export type AuditActionType =
  | 'CREDIT_LIMIT_OVERRIDE'
  | 'CREDIT_LOCK_OVERRIDE'
  | 'SUB_ACCOUNT_CREATED'
  | 'SUB_ACCOUNT_DEACTIVATED'
  | 'SETTLEMENT_DISCOUNT_APPLIED'
  | 'LEDGER_MODIFIED'
  | 'SMS_RECEIPT_SENT'
  | 'DATA_PURGED_6_MONTHS'
  | 'CUSTOM_DATA_PURGED'
  | 'QUICK_CASH_SALE'
  | 'WHOLESALE_PO_CREATED'
  | 'DAILY_EXPENSE_RECORDED'
  | 'STAFF_PAYROLL_PAID'
  | 'STAFF_ADVANCE_RECORDED'
  | 'UDHAAR_GIVEN'
  | 'WASOOLI_RECEIVED'
  | 'SUPPLIER_BILL_ADDED'
  | 'SUPPLIER_PAYMENT_MADE'
  | string;

export interface IAuditLog extends Document {
  profileId: Types.ObjectId;
  authorizedById: Types.ObjectId;
  authorizedByName: string;
  authorizedByRole: 'OWNER' | 'MANAGER' | string;
  actionType: AuditActionType;
  counterpartyId?: Types.ObjectId;
  counterpartyName?: string;
  counterpartyPhone?: string;
  financialSnapshot?: {
    creditLimit: number;
    balanceBefore: number;
    attemptedAmount: number;
    resultingBalance: number;
  };
  reason?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
    authorizedById: { type: Schema.Types.ObjectId, required: true },
    authorizedByName: { type: String, required: true },
    authorizedByRole: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'Counterparty' },
    counterpartyName: { type: String },
    counterpartyPhone: { type: String },
    financialSnapshot: {
      creditLimit: { type: Number, default: 0 },
      balanceBefore: { type: Number, default: 0 },
      attemptedAmount: { type: Number, default: 0 },
      resultingBalance: { type: Number, default: 0 },
    },
    reason: { type: String, trim: true },
    ipAddress: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ profileId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);

