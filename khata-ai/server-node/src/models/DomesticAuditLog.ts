import { Schema, model, Document, Types } from 'mongoose';

export type DomesticAuditActionType =
  | 'RECORD_CREATED'
  | 'AMOUNT_CORRECTED'
  | 'VAULT_SWITCHED'
  | 'DATE_CORRECTED'
  | 'RECORD_DELETED'
  | 'VAULT_RECONCILED'
  | 'CHANGE_REVERTED';

export type DomesticActorRole =
  | 'HEAD_OF_HOUSEHOLD'
  | 'SPOUSE'
  | 'FAMILY_MEMBER'
  | 'VOICE_ASSISTANT';

export type DomesticModuleType =
  | 'VAULT'
  | 'STAFF'
  | 'UTILITY'
  | 'MANDI'
  | 'RASHAN'
  | 'KAMETI'
  | 'SCHOOL_FEE'
  | 'HOME_REPAIR'
  | 'GENERAL';

export interface IFieldChangeDiff {
  fieldName: string;
  fieldLabelUrdu: string;
  oldValue: any;
  newValue: any;
}

export interface IDomesticAuditLog extends Document {
  profileId: Types.ObjectId;
  actorName: string; // e.g. "Muhammad Saad (سربراہ خانہ)"
  actorRole: DomesticActorRole;
  module: DomesticModuleType;
  targetEntityId: string;
  targetRecordTitle: string; // e.g. "لیسکو بجلی کا بل (LESCO Bill)"
  actionType: DomesticAuditActionType;
  changeDiffs: IFieldChangeDiff[];
  vaultImpact?: {
    vaultId?: Types.ObjectId | string;
    vaultTitle: string;
    oldVaultTitle?: string;
    balanceBefore: number;
    balanceAfter: number;
    amountDelta: number; // positive = credited back, negative = debited
    voucherNumber: string;
  };
  reasonUrdu: string;
  reasonEn?: string;
  canRevert: boolean;
  isReverted: boolean;
  revertedAt?: Date;
  snapshotBefore?: Record<string, any>;
  snapshotAfter?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FieldChangeDiffSchema = new Schema<IFieldChangeDiff>(
  {
    fieldName: { type: String, required: true },
    fieldLabelUrdu: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const DomesticAuditLogSchema = new Schema<IDomesticAuditLog>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    actorName: { type: String, required: true, default: 'سربراہ خانہ (Family Head)' },
    actorRole: {
      type: String,
      enum: ['HEAD_OF_HOUSEHOLD', 'SPOUSE', 'FAMILY_MEMBER', 'VOICE_ASSISTANT'],
      default: 'HEAD_OF_HOUSEHOLD',
    },
    module: {
      type: String,
      enum: [
        'VAULT',
        'STAFF',
        'UTILITY',
        'MANDI',
        'RASHAN',
        'KAMETI',
        'SCHOOL_FEE',
        'HOME_REPAIR',
        'GENERAL',
      ],
      required: true,
      index: true,
    },
    targetEntityId: { type: String, required: true },
    targetRecordTitle: { type: String, required: true },
    actionType: {
      type: String,
      enum: [
        'RECORD_CREATED',
        'AMOUNT_CORRECTED',
        'VAULT_SWITCHED',
        'DATE_CORRECTED',
        'RECORD_DELETED',
        'VAULT_RECONCILED',
        'CHANGE_REVERTED',
      ],
      required: true,
      index: true,
    },
    changeDiffs: [FieldChangeDiffSchema],
    vaultImpact: {
      vaultId: { type: Schema.Types.Mixed },
      vaultTitle: { type: String },
      oldVaultTitle: { type: String },
      balanceBefore: { type: Number, default: 0 },
      balanceAfter: { type: Number, default: 0 },
      amountDelta: { type: Number, default: 0 },
      voucherNumber: { type: String },
    },
    reasonUrdu: { type: String, required: true },
    reasonEn: { type: String },
    canRevert: { type: Boolean, default: true },
    isReverted: { type: Boolean, default: false },
    revertedAt: { type: Date },
    snapshotBefore: { type: Schema.Types.Mixed },
    snapshotAfter: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// High-speed indices for domestic audit filtering
DomesticAuditLogSchema.index({ profileId: 1, createdAt: -1 });
DomesticAuditLogSchema.index({ profileId: 1, module: 1 });

export const DomesticAuditLog = model<IDomesticAuditLog>(
  'DomesticAuditLog',
  DomesticAuditLogSchema
);
export default DomesticAuditLog;
