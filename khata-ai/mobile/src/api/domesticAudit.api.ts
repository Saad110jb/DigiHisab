import { apiClient } from './client';

export type DomesticAuditActionType =
  | 'RECORD_CREATED'
  | 'AMOUNT_CORRECTED'
  | 'VAULT_SWITCHED'
  | 'DATE_CORRECTED'
  | 'RECORD_DELETED'
  | 'VAULT_RECONCILED'
  | 'CHANGE_REVERTED';

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

export interface IDomesticUnifiedRecord {
  id: string;
  module: DomesticModuleType;
  titleUrdu: string;
  titleEn: string;
  amount: number;
  status: string;
  statusUrdu: string;
  date: string | Date;
  vaultTitle: string;
  vaultId?: string;
  notes?: string;
  rawDoc?: any;
}

export interface IFieldChangeDiff {
  fieldName: string;
  fieldLabelUrdu: string;
  oldValue: any;
  newValue: any;
}

export interface IDomesticAuditLogItem {
  _id: string;
  actorName: string;
  actorRole: string;
  module: DomesticModuleType;
  targetEntityId: string;
  targetRecordTitle: string;
  actionType: DomesticAuditActionType;
  changeDiffs: IFieldChangeDiff[];
  vaultImpact?: {
    vaultId?: string;
    vaultTitle: string;
    oldVaultTitle?: string;
    balanceBefore: number;
    balanceAfter: number;
    amountDelta: number;
    voucherNumber: string;
  };
  reasonUrdu: string;
  canRevert: boolean;
  isReverted: boolean;
  revertedAt?: string;
  createdAt: string;
}

export const domesticAuditApi = {
  /**
   * 1. Query all domestic records across modules
   */
  getAllRecords: async (options?: {
    module?: string;
    searchQuery?: string;
    limit?: number;
  }): Promise<IDomesticUnifiedRecord[]> => {
    const res = await apiClient.get<{ success: boolean; data: IDomesticUnifiedRecord[] }>(
      '/domestic/audit/records',
      { params: options }
    );
    return res.data.data;
  },

  /**
   * 2. Query Domestic Audit Trail
   */
  getAuditTrail: async (options?: {
    module?: string;
    limit?: number;
  }): Promise<IDomesticAuditLogItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: IDomesticAuditLogItem[] }>(
      '/domestic/audit/trail',
      { params: options }
    );
    return res.data.data;
  },

  /**
   * 3. Update any domestic record with automated JEV Vault re-balancing & audit logging
   */
  updateRecord: async (payload: {
    module: DomesticModuleType;
    recordId: string;
    subRecordId?: string;
    newAmount?: number;
    newVaultAccountId?: string;
    newDate?: Date | string;
    newNotes?: string;
    reasonUrdu: string;
    actorName?: string;
  }): Promise<{
    success: boolean;
    updatedRecord: any;
    auditLog: IDomesticAuditLogItem;
    rebalanceMessageUrdu: string;
  }> => {
    const res = await apiClient.put<{
      success: boolean;
      data: {
        success: boolean;
        updatedRecord: any;
        auditLog: IDomesticAuditLogItem;
        rebalanceMessageUrdu: string;
      };
    }>('/domestic/audit/records', payload);
    return res.data.data;
  },

  /**
   * 4. Void / Delete a domestic entry with automatic vault refund
   */
  deleteRecord: async (payload: {
    module: DomesticModuleType;
    recordId: string;
    subRecordId?: string;
    reasonUrdu: string;
    actorName?: string;
  }): Promise<{
    success: boolean;
    refundedAmount: number;
    vaultTitle: string;
    auditLog: IDomesticAuditLogItem;
    messageUrdu: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        success: boolean;
        refundedAmount: number;
        vaultTitle: string;
        auditLog: IDomesticAuditLogItem;
        messageUrdu: string;
      };
    }>('/domestic/audit/delete', payload);
    return res.data.data;
  },

  /**
   * 5. 1-Tap Revert of a previous domestic audit change
   */
  revertAuditLog: async (
    auditLogId: string,
    reasonUrdu?: string
  ): Promise<{
    success: boolean;
    revertedLog: IDomesticAuditLogItem;
    messageUrdu: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        success: boolean;
        revertedLog: IDomesticAuditLogItem;
        messageUrdu: string;
      };
    }>('/domestic/audit/revert', { auditLogId, reasonUrdu });
    return res.data.data;
  },

  /**
   * 6. Reconcile physical vault cash count & record discrepancy
   */
  reconcileVault: async (payload: {
    vaultAccountId: string;
    physicalCountAmount: number;
    notesUrdu?: string;
    actorName?: string;
  }): Promise<{
    success: boolean;
    discrepancy: number;
    vaultTitle: string;
    messageUrdu: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        success: boolean;
        discrepancy: number;
        vaultTitle: string;
        messageUrdu: string;
      };
    }>('/domestic/audit/reconcile-vault', payload);
    return res.data.data;
  },
};
