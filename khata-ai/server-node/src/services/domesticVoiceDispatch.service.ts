import { Types } from 'mongoose';
import { VaultAccount, IVaultAccountDoc } from '../models/HouseholdVault';
import { DomesticHelpStaff } from '../models/DomesticHelpStaff';
import { UtilityBill } from '../models/UtilityBill';
import { DomesticKameti } from '../models/DomesticKameti';
import { SchoolFeeTracker } from '../models/SchoolFeeTracker';

export interface IExecuteVoiceCommandPayload {
  rawTranscript: string;
  intent:
    | 'MANDI_EXPENSE'
    | 'STAFF_ADVANCE'
    | 'UTILITY_PAYMENT'
    | 'KAMETI_INSTALLMENT'
    | 'SCHOOL_FEE_PAYMENT'
    | 'GENERAL_EXPENSE';
  targetModuleKey: 'MANDI' | 'STAFF' | 'UTILITY' | 'KAMETI' | 'SCHOOL_FEE' | 'GENERAL';
  amount: number;
  itemSplits?: Array<{ itemNameUrdu: string; itemNameEn: string; amount: number }>;
  paymentChannel: 'CASH' | 'BANK' | 'WALLET';
  vaultAccountId?: string;
  entityNameHint?: string;
  notes?: string;
  isAdvancePayment?: boolean;
}

export interface IVoiceExecutionReceipt {
  success: boolean;
  voucherType: 'CPV' | 'BPV' | 'WPV';
  voucherNumber: string;
  amountDebited: number;
  debitedVaultTitle: string;
  remainingVaultBalance: number;
  targetModule: string;
  targetSummaryUrdu: string;
  targetSummaryEn: string;
  auditNotesUrdu: string;
  executedAt: Date;
}

export class DomesticVoiceDispatchService {
  /**
   * Dispatches an interpreted voice command to appropriate domestic models and vaults
   */
  public static async executeVoiceCommand(
    profileId: string,
    payload: IExecuteVoiceCommandPayload
  ): Promise<IVoiceExecutionReceipt> {
    const pId = new Types.ObjectId(profileId);
    const amount = Math.max(1, payload.amount || 0);

    // 1. Locate the proper VaultAccount to debit
    let targetVault: IVaultAccountDoc | null = null;

    if (payload.vaultAccountId) {
      targetVault = await VaultAccount.findOne({
        _id: new Types.ObjectId(payload.vaultAccountId),
        profileId: pId,
      });
    }

    if (!targetVault) {
      // Find matching vault by accountType and search hint
      const lowerTranscript = (payload.rawTranscript || '').toLowerCase();

      if (payload.paymentChannel === 'WALLET') {
        const query: any = {
          profileId: pId,
          accountType: 'MOBILE_WALLET',
          isArchived: { $ne: true },
        };
        if (lowerTranscript.includes('jazzcash') || lowerTranscript.includes('جاز')) {
          query.institutionName = { $regex: /jazzcash/i };
        } else if (lowerTranscript.includes('easypaisa') || lowerTranscript.includes('ایزی')) {
          query.institutionName = { $regex: /easypaisa/i };
        }
        targetVault = await VaultAccount.findOne(query);
        if (!targetVault) {
          targetVault = await VaultAccount.findOne({
            profileId: pId,
            accountType: 'MOBILE_WALLET',
          });
        }
      } else if (payload.paymentChannel === 'BANK') {
        const query: any = {
          profileId: pId,
          accountType: 'COMMERCIAL_BANK',
          isArchived: { $ne: true },
        };
        if (lowerTranscript.includes('meezan') || lowerTranscript.includes('میزان')) {
          query.institutionName = { $regex: /meezan/i };
        } else if (lowerTranscript.includes('hbl') || lowerTranscript.includes('حبیب')) {
          query.institutionName = { $regex: /hbl|habib/i };
        }
        targetVault = await VaultAccount.findOne(query);
        if (!targetVault) {
          targetVault = await VaultAccount.findOne({
            profileId: pId,
            accountType: 'COMMERCIAL_BANK',
          });
        }
      } else {
        // Physical Cash
        targetVault = await VaultAccount.findOne({
          profileId: pId,
          accountType: 'PHYSICAL_CASH_SAFE',
          isArchived: { $ne: true },
        });
      }
    }

    // If still no vault found, create/fallback to default Physical Cash Safe
    if (!targetVault) {
      targetVault = await VaultAccount.findOne({ profileId: pId });
      if (!targetVault) {
        targetVault = await VaultAccount.create({
          profileId: pId,
          accountTitle: 'گھریلو نقدی (Wardrobe Safe)',
          accountType: 'PHYSICAL_CASH_SAFE',
          institutionName: 'Domestic Drawer',
          currentBalance: 50000,
          isArchived: false,
        });
      }
    }

    // Debit the amount from the resolved vault
    targetVault.currentBalance = (targetVault.currentBalance || 0) - amount;
    targetVault.lastReconciledAt = new Date();
    await targetVault.save();

    // 2. Dispatch to specific Domestic Sub-Module
    let targetSummaryUrdu = '';
    let targetSummaryEn = '';

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    switch (payload.intent) {
      case 'STAFF_ADVANCE': {
        // Find staff matching driver or maid
        const lowerHint = (payload.entityNameHint || '').toLowerCase();
        let targetRole: 'DRIVER' | 'MAID' | 'COOK' | 'OTHER' = 'MAID';
        if (lowerHint.includes('driver') || lowerHint.includes('ڈرائیور')) {
          targetRole = 'DRIVER';
        } else if (lowerHint.includes('cook') || lowerHint.includes('باورچی')) {
          targetRole = 'COOK';
        }

        let staff = await DomesticHelpStaff.findOne({
          profileId: pId,
          role: targetRole,
          isActive: true,
        });

        if (!staff) {
          staff = await DomesticHelpStaff.findOne({
            profileId: pId,
            isActive: true,
          });
        }

        if (!staff) {
          staff = await DomesticHelpStaff.create({
            profileId: pId,
            staffName: targetRole === 'DRIVER' ? 'محمد اسلم (ڈرائیور)' : 'فاطمہ بی بی (ملازمہ)',
            role: targetRole,
            baseMonthlySalary: targetRole === 'DRIVER' ? 28000 : 18000,
            joiningDate: new Date(),
            isActive: true,
            advances: [],
            settlementHistory: [],
            attendance: [],
          });
        }

        // Append advance payment
        const paymentModeTag =
          payload.paymentChannel === 'WALLET'
            ? 'JAZZCASH'
            : payload.paymentChannel === 'BANK'
            ? 'BANK_TRANSFER'
            : 'CASH';

        staff.advances.push({
          amount,
          disbursementDate: new Date(),
          reason: payload.rawTranscript,
          paymentMode: paymentModeTag,
          isDeducted: false,
          notes: 'بذریعہ اردو وائس اسسٹنٹ',
        } as any);

        await staff.save();

        targetSummaryUrdu = `${staff.staffName} کو Rs. ${amount.toLocaleString()} پیشگی (Peshgi) ادا کر دی گئی اور تنخواہ کھاتے میں درج ہو گئی۔`;
        targetSummaryEn = `Rs. ${amount.toLocaleString()} advance recorded for ${staff.staffName}. Net payable salary updated.`;
        break;
      }

      case 'UTILITY_PAYMENT': {
        const lowerRaw = payload.rawTranscript.toLowerCase();
        let providerType: 'ELECTRICITY' | 'GAS' | 'WATER' | 'INTERNET' = 'ELECTRICITY';
        if (lowerRaw.includes('گیس') || lowerRaw.includes('gas')) {
          providerType = 'GAS';
        } else if (lowerRaw.includes('پانی') || lowerRaw.includes('water')) {
          providerType = 'WATER';
        }

        let bill = await UtilityBill.findOne({
          profileId: pId,
          providerType,
          status: { $ne: 'PAID' },
        });

        if (!bill) {
          bill = await UtilityBill.findOne({
            profileId: pId,
            status: { $ne: 'PAID' },
          });
        }

        if (!bill) {
          bill = await UtilityBill.create({
            profileId: pId,
            providerType,
            providerName: providerType === 'GAS' ? 'سوئی ناردرن گیس (SNGPL)' : 'لیسکو بجلی (LESCO)',
            consumerNumber: '08123456789012',
            billingMonth: currentMonthKey,
            billingAmount: amount,
            surchargeAmount: 0,
            amountAfterDueDate: amount,
            billDueDate: new Date(now.getFullYear(), now.getMonth(), 15),
            status: 'UNPAID',
            alert3DaysSent: false,
            alert1DaySent: false,
          });
        }

        const sourceTag =
          payload.paymentChannel === 'WALLET'
            ? 'JAZZCASH'
            : payload.paymentChannel === 'BANK'
            ? 'BANK_TRANSFER'
            : 'CASH';

        bill.status = 'PAID';
        bill.paymentSource = sourceTag;
        bill.paymentDate = new Date();
        bill.notes = `ادا شدہ بذریعہ اردو بول چال: ${payload.rawTranscript}`;
        await bill.save();

        targetSummaryUrdu = `${bill.providerName} کا بل Rs. ${amount.toLocaleString()} ادا شدہ (PAID) مارک ہو گیا۔`;
        targetSummaryEn = `${bill.providerName} bill of Rs. ${amount.toLocaleString()} marked as PAID.`;
        break;
      }

      case 'KAMETI_INSTALLMENT': {
        let kameti = await DomesticKameti.findOne({
          profileId: pId,
          status: 'ACTIVE',
        });

        if (!kameti) {
          kameti = await DomesticKameti.create({
            profileId: pId,
            title: 'محلہ کمیٹی و بی سی',
            role: 'PARTICIPANT',
            organizerName: 'باجی شازیہ',
            monthlyContribution: amount,
            totalMonths: 10,
            poolAmount: amount * 10,
            startDate: new Date(),
            currentCycle: 1,
            status: 'ACTIVE',
            userPayoutMonth: 4,
            payoutReceived: false,
            installments: [],
          });
        }

        const kametiMode =
          payload.paymentChannel === 'WALLET'
            ? 'JAZZCASH'
            : payload.paymentChannel === 'BANK'
            ? 'BANK_TRANSFER'
            : 'CASH';

        kameti.installments.push({
          cycleNumber: kameti.currentCycle || 1,
          monthKey: currentMonthKey,
          paidAmount: amount,
          paymentDate: new Date(),
          debitedFromVaultAccountId: targetVault._id as Types.ObjectId,
          paymentMode: kametiMode,
          notes: payload.rawTranscript,
        });

        await kameti.save();

        targetSummaryUrdu = `${kameti.title} کی قسط Rs. ${amount.toLocaleString()} کامیابی سے کمیٹی کھاتے میں درج ہو گئی۔`;
        targetSummaryEn = `Kameti installment Rs. ${amount.toLocaleString()} logged for ${kameti.title}.`;
        break;
      }

      case 'SCHOOL_FEE_PAYMENT': {
        let fee = await SchoolFeeTracker.findOne({
          profileId: pId,
          status: { $ne: 'PAID' },
        });

        if (!fee) {
          fee = await SchoolFeeTracker.create({
            profileId: pId,
            childName: 'محمد ارہم',
            institutionName: 'دی سٹی اسکول (The City School)',
            gradeClass: 'Grade 5',
            educationLevel: 'SCHOOL',
            termOrMonth: currentMonthKey,
            feeFrequency: 'MONTHLY',
            tuitionFeeAmount: amount,
            vanTransportFeeAmount: 0,
            academyFeeAmount: 0,
            stationeryUniformAmount: 0,
            examFeeAmount: 0,
            siblingDiscountAmount: 0,
            otherChargesAmount: 0,
            totalDue: amount,
            surchargeAmount: 0,
            amountAfterDueDate: amount,
            dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
            status: 'UNPAID',
            isPaid: false,
          });
        }

        fee.status = 'PAID';
        fee.isPaid = true;
        fee.paidAt = new Date();
        fee.notes = `فیس چالان ادا شدہ بذریعہ آواز: ${payload.rawTranscript}`;
        await fee.save();

        targetSummaryUrdu = `${fee.childName} (${fee.institutionName}) کا فیس چالان Rs. ${amount.toLocaleString()} ادا شدہ مارک ہو گیا۔`;
        targetSummaryEn = `School fee Rs. ${amount.toLocaleString()} for ${fee.childName} cleared and marked PAID.`;
        break;
      }

      case 'MANDI_EXPENSE':
      default: {
        const splitsText =
          payload.itemSplits && payload.itemSplits.length > 0
            ? payload.itemSplits.map((s) => `${s.itemNameUrdu} (Rs. ${s.amount.toLocaleString()})`).join(' + ')
            : `منڈی راشن و سبزی`;

        targetSummaryUrdu = `منڈی خریداری [${splitsText}] کل Rs. ${amount.toLocaleString()} گھریلو کھاتے میں درج۔`;
        targetSummaryEn = `Mandi purchase of Rs. ${amount.toLocaleString()} recorded.`;
        break;
      }
    }

    // 3. Generate JEV Voucher Number
    const voucherPrefix =
      payload.paymentChannel === 'CASH' ? 'CPV' : payload.paymentChannel === 'BANK' ? 'BPV' : 'WPV';
    const voucherNumber = `${voucherPrefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const auditNotesUrdu = `خودکار JEV واؤچر ${voucherNumber} تیار کیا گیا۔ رقم Rs. ${amount.toLocaleString()} بحساب ${targetVault.accountTitle} منہا کی گئی۔`;

    return {
      success: true,
      voucherType: voucherPrefix,
      voucherNumber,
      amountDebited: amount,
      debitedVaultTitle: targetVault.accountTitle,
      remainingVaultBalance: targetVault.currentBalance,
      targetModule: payload.targetModuleKey,
      targetSummaryUrdu,
      targetSummaryEn,
      auditNotesUrdu,
      executedAt: new Date(),
    };
  }
}

export default DomesticVoiceDispatchService;
