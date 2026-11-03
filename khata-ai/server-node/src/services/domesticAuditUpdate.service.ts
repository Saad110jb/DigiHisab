import { Types } from 'mongoose';
import { DomesticAuditLog, IDomesticAuditLog, IFieldChangeDiff, DomesticModuleType } from '../models/DomesticAuditLog';
import { VaultAccount, IVaultAccountDoc } from '../models/HouseholdVault';
import { UtilityBill } from '../models/UtilityBill';
import { DomesticHelpStaff } from '../models/DomesticHelpStaff';
import { SchoolFeeTracker } from '../models/SchoolFeeTracker';
import { DomesticKameti } from '../models/DomesticKameti';

export interface IDomesticUnifiedRecord {
  id: string;
  module: DomesticModuleType;
  titleUrdu: string;
  titleEn: string;
  amount: number;
  status: string;
  statusUrdu: string;
  date: Date;
  vaultTitle: string;
  vaultId?: string;
  notes?: string;
  rawDoc?: any;
}

export interface IUpdateDomesticRecordPayload {
  module: DomesticModuleType;
  recordId: string;
  subRecordId?: string; // e.g. for staff advance or kameti installment
  newAmount?: number;
  newVaultAccountId?: string;
  newDate?: Date | string;
  newNotes?: string;
  reasonUrdu: string;
  actorName?: string;
  actorRole?: 'HEAD_OF_HOUSEHOLD' | 'SPOUSE' | 'FAMILY_MEMBER' | 'VOICE_ASSISTANT';
}

export class DomesticAuditUpdateService {
  /**
   * 1. Query all domestic records across modules with search & category filters
   */
  public static async getAllDomesticRecords(
    profileId: string,
    options?: {
      module?: string;
      searchQuery?: string;
      limit?: number;
    }
  ): Promise<IDomesticUnifiedRecord[]> {
    const pId = new Types.ObjectId(profileId);
    const records: IDomesticUnifiedRecord[] = [];
    const limit = options?.limit || 60;
    const search = (options?.searchQuery || '').trim().toLowerCase();
    const filterModule = options?.module?.toUpperCase();

    // A. Utility Bills
    if (!filterModule || filterModule === 'ALL' || filterModule === 'UTILITY') {
      const bills = await UtilityBill.find({ profileId: pId }).sort({ createdAt: -1 }).limit(limit);
      for (const b of bills) {
        records.push({
          id: b._id.toString(),
          module: 'UTILITY',
          titleUrdu: `${b.providerName} (${b.providerType === 'ELECTRICITY' ? 'بجلی' : b.providerType === 'GAS' ? 'سوئی گیس' : 'بل'})`,
          titleEn: `${b.providerName} Bill`,
          amount: b.billingAmount || 0,
          status: b.status,
          statusUrdu: b.status === 'PAID' ? 'ادا شدہ' : 'غیر ادا شدہ',
          date: b.paymentDate || b.billDueDate || b.createdAt,
          vaultTitle: b.paymentSource ? `${b.paymentSource} کھاتہ` : 'نامعلوم والٹ',
          notes: b.notes,
        });
      }
    }

    // B. Domestic Staff Advances & Salaries
    if (!filterModule || filterModule === 'ALL' || filterModule === 'STAFF') {
      const staffList = await DomesticHelpStaff.find({ profileId: pId });
      for (const staff of staffList) {
        for (const adv of staff.advances || []) {
          records.push({
            id: staff._id.toString(),
            module: 'STAFF',
            titleUrdu: `${staff.staffName} (پیشگی پیشکش / Peshgi)`,
            titleEn: `${staff.staffName} (Salary Advance)`,
            amount: adv.amount || 0,
            status: adv.isDeducted ? 'DEDUCTED' : 'PENDING_DEDUCTION',
            statusUrdu: adv.isDeducted ? 'تنخواہ سے منہا شدہ' : 'غیر منہا شدہ پیشگی',
            date: adv.disbursementDate || (adv as any).createdAt || new Date(),
            vaultTitle: adv.paymentMode ? `${adv.paymentMode} چینل` : 'کیش دراز',
            notes: adv.reason || adv.notes,
            rawDoc: { subRecordId: (adv as any)._id?.toString() },
          });
        }
      }
    }

    // C. Kameti / BC Pool Installments
    if (!filterModule || filterModule === 'ALL' || filterModule === 'KAMETI') {
      const kametis = await DomesticKameti.find({ profileId: pId });
      for (const k of kametis) {
        for (const inst of k.installments || []) {
          records.push({
            id: k._id.toString(),
            module: 'KAMETI',
            titleUrdu: `${k.title} (قسط سائیکل #${inst.cycleNumber})`,
            titleEn: `${k.title} (Installment #${inst.cycleNumber})`,
            amount: inst.paidAmount || 0,
            status: 'PAID',
            statusUrdu: 'قسط ادا شدہ',
            date: inst.paymentDate || new Date(),
            vaultTitle: inst.paymentMode ? `${inst.paymentMode} کھاتہ` : 'کیش',
            notes: inst.notes,
            rawDoc: { subRecordId: (inst as any)._id?.toString() },
          });
        }
      }
    }

    // D. School Fee Challans
    if (!filterModule || filterModule === 'ALL' || filterModule === 'SCHOOL_FEE') {
      const fees = await SchoolFeeTracker.find({ profileId: pId }).sort({ createdAt: -1 }).limit(limit);
      for (const f of fees) {
        records.push({
          id: f._id.toString(),
          module: 'SCHOOL_FEE',
          titleUrdu: `${f.childName} (${f.institutionName}) فیس چالان`,
          titleEn: `${f.childName} (${f.institutionName}) Fee`,
          amount: f.totalDue || 0,
          status: f.status,
          statusUrdu: f.status === 'PAID' ? 'فیس ادا شدہ' : 'غیر ادا شدہ',
          date: f.paidAt || f.dueDate || f.createdAt,
          vaultTitle: f.paymentMode ? `${f.paymentMode}` : 'بینک / کیش',
          notes: f.notes,
        });
      }
    }

    // E. Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // F. Filter by search query if provided
    if (search) {
      return records.filter(
        (r) =>
          r.titleUrdu.toLowerCase().includes(search) ||
          r.titleEn.toLowerCase().includes(search) ||
          r.amount.toString().includes(search) ||
          (r.notes && r.notes.toLowerCase().includes(search)) ||
          r.vaultTitle.toLowerCase().includes(search)
      );
    }

    return records;
  }

  /**
   * 2. Query Domestic Audit Trail
   */
  public static async getDomesticAuditTrail(
    profileId: string,
    options?: { module?: string; limit?: number }
  ): Promise<IDomesticAuditLog[]> {
    const pId = new Types.ObjectId(profileId);
    const query: any = { profileId: pId };
    if (options?.module && options.module !== 'ALL') {
      query.module = options.module.toUpperCase();
    }
    const limit = options?.limit || 50;

    return DomesticAuditLog.find(query).sort({ createdAt: -1 }).limit(limit);
  }

  /**
   * 3. Update any domestic record with automatic JEV Vault re-balancing & audit logging
   */
  public static async updateDomesticRecord(
    profileId: string,
    payload: IUpdateDomesticRecordPayload
  ): Promise<{
    success: boolean;
    updatedRecord: any;
    auditLog: IDomesticAuditLog;
    rebalanceMessageUrdu: string;
  }> {
    const pId = new Types.ObjectId(profileId);
    const changeDiffs: IFieldChangeDiff[] = [];

    let targetTitle = 'گھریلو ریکارڈ';
    let oldAmount = 0;
    let newAmount = payload.newAmount !== undefined ? Number(payload.newAmount) : 0;
    let oldVaultTitle = 'گھریلو دراز (Cash Safe)';
    let newVaultTitle = oldVaultTitle;
    let targetVaultDoc: IVaultAccountDoc | null = null;
    let updatedDoc: any = null;
    let snapshotBefore: Record<string, any> = {};

    // 1. Module specific record resolution
    switch (payload.module) {
      case 'UTILITY': {
        const bill = await UtilityBill.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!bill) throw new Error('یوٹیلیٹی بل ریکارڈ نہیں مل سکا۔');
        snapshotBefore = bill.toObject();
        targetTitle = `${bill.providerName} (${bill.providerType}) بل`;
        oldAmount = bill.billingAmount || 0;
        oldVaultTitle = bill.paymentSource ? `${bill.paymentSource} اکاؤنٹ` : 'کیش والٹ';

        if (payload.newAmount !== undefined && payload.newAmount !== oldAmount) {
          changeDiffs.push({
            fieldName: 'billingAmount',
            fieldLabelUrdu: 'بل کی رقم (روپے)',
            oldValue: oldAmount,
            newValue: newAmount,
          });
          bill.billingAmount = newAmount;
        }

        if (payload.newNotes !== undefined && payload.newNotes !== bill.notes) {
          changeDiffs.push({
            fieldName: 'notes',
            fieldLabelUrdu: 'تفصیل و نوٹ',
            oldValue: bill.notes || '',
            newValue: payload.newNotes,
          });
          bill.notes = payload.newNotes;
        }

        if (payload.newDate) {
          bill.paymentDate = new Date(payload.newDate);
        }

        await bill.save();
        updatedDoc = bill;
        break;
      }

      case 'STAFF': {
        const staff = await DomesticHelpStaff.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!staff) throw new Error('ملازم کا کھاتہ نہیں مل سکا۔');
        snapshotBefore = staff.toObject();
        targetTitle = `${staff.staffName} (تنخواہ پیشگی)`;

        // Find the specific advance sub-document
        const advIndex = staff.advances.findIndex(
          (a: any) => a._id?.toString() === payload.subRecordId
        );
        if (advIndex >= 0) {
          const adv = staff.advances[advIndex];
          oldAmount = adv.amount || 0;
          oldVaultTitle = adv.paymentMode ? `${adv.paymentMode}` : 'کیش والٹ';

          if (payload.newAmount !== undefined && payload.newAmount !== oldAmount) {
            changeDiffs.push({
              fieldName: 'amount',
              fieldLabelUrdu: 'پیشگی رقم (روپے)',
              oldValue: oldAmount,
              newValue: newAmount,
            });
            adv.amount = newAmount;
          }

          if (payload.newNotes !== undefined && payload.newNotes !== adv.notes) {
            changeDiffs.push({
              fieldName: 'notes',
              fieldLabelUrdu: 'نوٹ / وجہ',
              oldValue: adv.notes || '',
              newValue: payload.newNotes,
            });
            adv.notes = payload.newNotes;
          }

          if (payload.newDate) {
            adv.disbursementDate = new Date(payload.newDate);
          }
        }

        await staff.save();
        updatedDoc = staff;
        break;
      }

      case 'KAMETI': {
        const kameti = await DomesticKameti.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!kameti) throw new Error('کمیٹی کھاتہ نہیں مل سکا۔');
        snapshotBefore = kameti.toObject();
        targetTitle = `${kameti.title} (بی سی قسط)`;

        const instIndex = kameti.installments.findIndex(
          (inst: any) => inst._id?.toString() === payload.subRecordId
        );
        if (instIndex >= 0) {
          const inst = kameti.installments[instIndex];
          oldAmount = inst.paidAmount || 0;
          oldVaultTitle = inst.paymentMode ? `${inst.paymentMode}` : 'والٹ';

          if (payload.newAmount !== undefined && payload.newAmount !== oldAmount) {
            changeDiffs.push({
              fieldName: 'paidAmount',
              fieldLabelUrdu: 'ادا شدہ قسط (روپے)',
              oldValue: oldAmount,
              newValue: newAmount,
            });
            inst.paidAmount = newAmount;
          }

          if (payload.newNotes !== undefined && payload.newNotes !== inst.notes) {
            inst.notes = payload.newNotes;
          }

          if (payload.newDate) {
            inst.paymentDate = new Date(payload.newDate);
          }
        }

        await kameti.save();
        updatedDoc = kameti;
        break;
      }

      case 'SCHOOL_FEE': {
        const fee = await SchoolFeeTracker.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!fee) throw new Error('اسکول فیس چالان ریکارڈ نہیں مل سکا۔');
        snapshotBefore = fee.toObject();
        targetTitle = `${fee.childName} (${fee.institutionName}) فیس`;
        oldAmount = fee.totalDue || 0;
        oldVaultTitle = fee.paymentMode ? `${fee.paymentMode}` : 'بینک کھاتہ';

        if (payload.newAmount !== undefined && payload.newAmount !== oldAmount) {
          changeDiffs.push({
            fieldName: 'totalDue',
            fieldLabelUrdu: 'کل واجب الادا فیس',
            oldValue: oldAmount,
            newValue: newAmount,
          });
          fee.totalDue = newAmount;
          fee.tuitionFeeAmount = newAmount;
        }

        if (payload.newNotes !== undefined && payload.newNotes !== fee.notes) {
          fee.notes = payload.newNotes;
        }

        if (payload.newDate) {
          fee.paidAt = new Date(payload.newDate);
        }

        await fee.save();
        updatedDoc = fee;
        break;
      }

      default:
        throw new Error(`ماڈیول ${payload.module} کی تصحیح ابھی تعاون یافتہ نہیں ہے۔`);
    }

    // 2. Automated JEV Vault Re-Balancing
    let amountDelta = 0;
    let balanceBefore = 0;
    let balanceAfter = 0;
    let rebalanceMessageUrdu = 'اندراج کامیابی سے درست ہو گیا۔';

    // Locate active household cash/bank vault
    if (payload.newVaultAccountId) {
      targetVaultDoc = await VaultAccount.findOne({
        _id: new Types.ObjectId(payload.newVaultAccountId),
        profileId: pId,
      });
    }
    if (!targetVaultDoc) {
      targetVaultDoc = await VaultAccount.findOne({ profileId: pId, accountType: 'PHYSICAL_CASH_SAFE' });
    }
    if (!targetVaultDoc) {
      targetVaultDoc = await VaultAccount.findOne({ profileId: pId });
    }

    if (targetVaultDoc && payload.newAmount !== undefined && payload.newAmount !== oldAmount) {
      balanceBefore = targetVaultDoc.currentBalance || 0;
      // If newAmount < oldAmount: User over-recorded the expense! Restore the difference to the vault.
      // If newAmount > oldAmount: User under-recorded the expense! Deduct the additional amount.
      amountDelta = oldAmount - newAmount;
      targetVaultDoc.currentBalance = balanceBefore + amountDelta;
      targetVaultDoc.lastReconciledAt = new Date();
      await targetVaultDoc.save();

      balanceAfter = targetVaultDoc.currentBalance;
      newVaultTitle = targetVaultDoc.accountTitle;

      if (amountDelta > 0) {
        rebalanceMessageUrdu = `✅ رقم کم کرنے پر Rs. ${amountDelta.toLocaleString()} واپس ${newVaultTitle} میں جمع ہو گئے۔`;
      } else if (amountDelta < 0) {
        rebalanceMessageUrdu = `✅ رقم میں اضافے پر Rs. ${Math.abs(amountDelta).toLocaleString()} مزید ${newVaultTitle} سے منہا ہو گئے۔`;
      }
    }

    // 3. Append Immutable Domestic Audit Record
    const voucherNumber = `JV-CORR-${Date.now().toString().slice(-6)}`;
    const auditLog = await DomesticAuditLog.create({
      profileId: pId,
      actorName: payload.actorName || 'سربراہ خانہ (Muhammad Saad)',
      actorRole: payload.actorRole || 'HEAD_OF_HOUSEHOLD',
      module: payload.module,
      targetEntityId: payload.recordId,
      targetRecordTitle: targetTitle,
      actionType: payload.newAmount !== undefined ? 'AMOUNT_CORRECTED' : 'DATE_CORRECTED',
      changeDiffs,
      vaultImpact: targetVaultDoc
        ? {
            vaultId: targetVaultDoc._id.toString(),
            vaultTitle: newVaultTitle,
            oldVaultTitle,
            balanceBefore,
            balanceAfter,
            amountDelta,
            voucherNumber,
          }
        : undefined,
      reasonUrdu: payload.reasonUrdu || 'گھریلو ڈیٹا میں درستگی',
      canRevert: true,
      isReverted: false,
      snapshotBefore,
      snapshotAfter: updatedDoc ? updatedDoc.toObject() : {},
    });

    return {
      success: true,
      updatedRecord: updatedDoc,
      auditLog,
      rebalanceMessageUrdu,
    };
  }

  /**
   * 4. Void / Delete a domestic entry with automatic vault refund
   */
  public static async deleteDomesticRecord(
    profileId: string,
    payload: {
      module: DomesticModuleType;
      recordId: string;
      subRecordId?: string;
      reasonUrdu: string;
      actorName?: string;
    }
  ): Promise<{
    success: boolean;
    refundedAmount: number;
    vaultTitle: string;
    auditLog: IDomesticAuditLog;
    messageUrdu: string;
  }> {
    const pId = new Types.ObjectId(profileId);
    let targetTitle = 'گھریلو ریکارڈ';
    let refundedAmount = 0;
    let snapshotBefore: Record<string, any> = {};

    switch (payload.module) {
      case 'UTILITY': {
        const bill = await UtilityBill.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!bill) throw new Error('یوٹیلیٹی بل ریکارڈ نہیں ملا۔');
        snapshotBefore = bill.toObject();
        targetTitle = `${bill.providerName} بل`;
        refundedAmount = bill.status === 'PAID' ? bill.billingAmount || 0 : 0;
        await UtilityBill.deleteOne({ _id: bill._id });
        break;
      }

      case 'STAFF': {
        const staff = await DomesticHelpStaff.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!staff) throw new Error('ملازم نہیں ملا۔');
        snapshotBefore = staff.toObject();
        targetTitle = `${staff.staffName} کی پیشگی`;

        const advIndex = staff.advances.findIndex(
          (a: any) => a._id?.toString() === payload.subRecordId
        );
        if (advIndex >= 0) {
          refundedAmount = staff.advances[advIndex].amount || 0;
          staff.advances.splice(advIndex, 1);
          await staff.save();
        }
        break;
      }

      case 'KAMETI': {
        const kameti = await DomesticKameti.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!kameti) throw new Error('کمیٹی ریکارڈ نہیں ملا۔');
        snapshotBefore = kameti.toObject();
        targetTitle = `${kameti.title} قسط`;

        const instIndex = kameti.installments.findIndex(
          (inst: any) => inst._id?.toString() === payload.subRecordId
        );
        if (instIndex >= 0) {
          refundedAmount = kameti.installments[instIndex].paidAmount || 0;
          kameti.installments.splice(instIndex, 1);
          await kameti.save();
        }
        break;
      }

      case 'SCHOOL_FEE': {
        const fee = await SchoolFeeTracker.findOne({ _id: new Types.ObjectId(payload.recordId), profileId: pId });
        if (!fee) throw new Error('فیس ریکارڈ نہیں ملا۔');
        snapshotBefore = fee.toObject();
        targetTitle = `${fee.childName} فیس`;
        refundedAmount = fee.status === 'PAID' ? fee.totalDue || 0 : 0;
        await SchoolFeeTracker.deleteOne({ _id: fee._id });
        break;
      }

      default:
        throw new Error(`ماڈیول ${payload.module} کا اندراج خارج کرنے کی سہولت موجود نہیں۔`);
    }

    // Refund money to physical cash safe
    const targetVault =
      (await VaultAccount.findOne({ profileId: pId, accountType: 'PHYSICAL_CASH_SAFE' })) ||
      (await VaultAccount.findOne({ profileId: pId }));

    let vaultTitle = 'گھریلو دراز';
    let balanceBefore = 0;
    let balanceAfter = 0;

    if (targetVault && refundedAmount > 0) {
      balanceBefore = targetVault.currentBalance || 0;
      targetVault.currentBalance = balanceBefore + refundedAmount;
      await targetVault.save();
      balanceAfter = targetVault.currentBalance;
      vaultTitle = targetVault.accountTitle;
    }

    const auditLog = await DomesticAuditLog.create({
      profileId: pId,
      actorName: payload.actorName || 'سربراہ خانہ',
      actorRole: 'HEAD_OF_HOUSEHOLD',
      module: payload.module,
      targetEntityId: payload.recordId,
      targetRecordTitle: targetTitle,
      actionType: 'RECORD_DELETED',
      changeDiffs: [
        {
          fieldName: 'status',
          fieldLabelUrdu: 'ریکارڈ کی حیثیت',
          oldValue: 'فعال اندراج (Active Record)',
          newValue: 'خارج شدہ (Deleted & Voided)',
        },
      ],
      vaultImpact: targetVault
        ? {
            vaultId: targetVault._id.toString(),
            vaultTitle,
            balanceBefore,
            balanceAfter,
            amountDelta: refundedAmount,
            voucherNumber: `JV-VOID-${Date.now().toString().slice(-6)}`,
          }
        : undefined,
      reasonUrdu: payload.reasonUrdu || 'غلط یا اضافی اندراج خارج کر دیا گیا',
      canRevert: false,
      isReverted: false,
      snapshotBefore,
    });

    const messageUrdu = `ریکارڈ خارج کر دیا گیا اور رقم Rs. ${refundedAmount.toLocaleString()} واپس ${vaultTitle} میں جمع ہو گئی۔`;

    return {
      success: true,
      refundedAmount,
      vaultTitle,
      auditLog,
      messageUrdu,
    };
  }

  /**
   * 5. 1-Tap Revert / Rollback of a domestic audit change
   */
  public static async revertDomesticAuditLog(
    profileId: string,
    auditLogId: string,
    reasonUrdu?: string
  ): Promise<{
    success: boolean;
    revertedLog: IDomesticAuditLog;
    messageUrdu: string;
  }> {
    const pId = new Types.ObjectId(profileId);
    const log = await DomesticAuditLog.findOne({
      _id: new Types.ObjectId(auditLogId),
      profileId: pId,
    });

    if (!log) throw new Error('آڈٹ لاگ ریکارڈ نہیں ملا۔');
    if (log.isReverted) throw new Error('یہ تبدیلی پہلے ہی ریورٹ ہو چکی ہے۔');
    if (!log.canRevert || !log.snapshotBefore) {
      throw new Error('اس قسم کی تبدیلی کو خودکار ریورٹ نہیں کیا جا سکتا۔');
    }

    // Reverse vault impact if any
    if (log.vaultImpact && log.vaultImpact.vaultId && log.vaultImpact.amountDelta !== 0) {
      const vault = await VaultAccount.findOne({
        _id: new Types.ObjectId(log.vaultImpact.vaultId as string),
        profileId: pId,
      });
      if (vault) {
        // Reverse the delta
        vault.currentBalance = (vault.currentBalance || 0) - log.vaultImpact.amountDelta;
        await vault.save();
      }
    }

    // Restore target document snapshot
    const snap = log.snapshotBefore;
    switch (log.module) {
      case 'UTILITY':
        await UtilityBill.updateOne({ _id: new Types.ObjectId(log.targetEntityId) }, snap);
        break;
      case 'STAFF':
        await DomesticHelpStaff.updateOne({ _id: new Types.ObjectId(log.targetEntityId) }, snap);
        break;
      case 'KAMETI':
        await DomesticKameti.updateOne({ _id: new Types.ObjectId(log.targetEntityId) }, snap);
        break;
      case 'SCHOOL_FEE':
        await SchoolFeeTracker.updateOne({ _id: new Types.ObjectId(log.targetEntityId) }, snap);
        break;
    }

    log.isReverted = true;
    log.revertedAt = new Date();
    await log.save();

    // Create a new audit entry documenting the rollback
    await DomesticAuditLog.create({
      profileId: pId,
      actorName: 'سربراہ خانہ (Muhammad Saad)',
      actorRole: 'HEAD_OF_HOUSEHOLD',
      module: log.module,
      targetEntityId: log.targetEntityId,
      targetRecordTitle: `${log.targetRecordTitle} (ریورٹ شدہ)`,
      actionType: 'CHANGE_REVERTED',
      changeDiffs: [
        {
          fieldName: 'reversion',
          fieldLabelUrdu: 'تبدیلی کی واپسی',
          oldValue: 'ترمیم شدہ حالت',
          newValue: 'اصل پرانی حالت پر بحال',
        },
      ],
      reasonUrdu: reasonUrdu || `پچھلی ترمیم (${log.actionType}) کو ریورٹ کیا گیا۔`,
      canRevert: false,
      isReverted: false,
    });

    return {
      success: true,
      revertedLog: log,
      messageUrdu: `✅ تبدیلی کامیابی سے منسوخ کر کے پہلی حالت پر بحال کر دی گئی۔`,
    };
  }

  /**
   * 6. Reconcile physical cash safe count & log discrepancy
   */
  public static async reconcileVaultPhysicalCount(
    profileId: string,
    payload: {
      vaultAccountId: string;
      physicalCountAmount: number;
      notesUrdu?: string;
      actorName?: string;
    }
  ): Promise<{
    success: boolean;
    discrepancy: number;
    vaultTitle: string;
    messageUrdu: string;
  }> {
    const pId = new Types.ObjectId(profileId);
    const vault = await VaultAccount.findOne({
      _id: new Types.ObjectId(payload.vaultAccountId),
      profileId: pId,
    });

    if (!vault) throw new Error('والٹ کھاتہ نہیں ملا۔');

    const appBalanceBefore = vault.currentBalance || 0;
    const physicalAmount = Number(payload.physicalCountAmount);
    const discrepancy = physicalAmount - appBalanceBefore;

    vault.currentBalance = physicalAmount;
    vault.lastReconciledAt = new Date();
    await vault.save();

    let reason = payload.notesUrdu || 'والٹ کی فزیکل نقد گنتی کی گئی';
    if (discrepancy > 0) {
      reason += ` (Rs. ${discrepancy.toLocaleString()} اضافی کیش پایا گیا)`;
    } else if (discrepancy < 0) {
      reason += ` (Rs. ${Math.abs(discrepancy).toLocaleString()} نقد شارٹ فال / کمی پائی گئی)`;
    }

    await DomesticAuditLog.create({
      profileId: pId,
      actorName: payload.actorName || 'سربراہ خانہ',
      actorRole: 'HEAD_OF_HOUSEHOLD',
      module: 'VAULT',
      targetEntityId: vault._id.toString(),
      targetRecordTitle: `${vault.accountTitle} (نقد گنتی و مفاہمت)`,
      actionType: 'VAULT_RECONCILED',
      changeDiffs: [
        {
          fieldName: 'currentBalance',
          fieldLabelUrdu: 'والٹ بیلنس',
          oldValue: appBalanceBefore,
          newValue: physicalAmount,
        },
      ],
      vaultImpact: {
        vaultId: vault._id.toString(),
        vaultTitle: vault.accountTitle,
        balanceBefore: appBalanceBefore,
        balanceAfter: physicalAmount,
        amountDelta: discrepancy,
        voucherNumber: `JV-REC-${Date.now().toString().slice(-6)}`,
      },
      reasonUrdu: reason,
      canRevert: true,
      isReverted: false,
    });

    const messageUrdu =
      discrepancy === 0
        ? `✅ نقد گنتی اور ایپ بیلنس سو فیصد درست اور متفق ہیں (100% Balanced)۔`
        : discrepancy > 0
        ? `✅ والٹ بیلنس اپڈیٹ ہو گیا۔ دراز میں Rs. ${discrepancy.toLocaleString()} کا اضافی کیش رجسٹر ہو گیا۔`
        : `⚠️ والٹ بیلنس اپڈیٹ ہو گیا۔ Rs. ${Math.abs(discrepancy).toLocaleString()} کا شارٹ فال آڈٹ لاگ میں ریکارڈ ہو گیا۔`;

    return {
      success: true,
      discrepancy,
      vaultTitle: vault.accountTitle,
      messageUrdu,
    };
  }
}

export default DomesticAuditUpdateService;
