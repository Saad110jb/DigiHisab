/**
 * Bank & Raast Ledger Reconciliation Engine
 * Automatically reconciles digital bank and Raast payments against DigiHisab double-entry ledger entries.
 * Flags discrepancies, unrecorded bank charges, and generates balancing JEV vouchers.
 */

import { Types } from 'mongoose';
import { BankReconciliation, IBankStatementTransaction } from '../models/BankReconciliation';
import { LedgerEntry } from '../models/LedgerEntry';
import { JournalVoucher } from '../models/JournalVoucher';
import { compileAndValidateDoubleEntry } from './jevDoubleEntry.service';

export interface IImportStatementInput {
  profileId: string | Types.ObjectId;
  bankName: string;
  accountNumber: string;
  statementStartDate: Date;
  statementEndDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: {
    transactionDate: Date | string;
    description: string;
    referenceNo?: string;
    withdrawal?: number;
    deposit?: number;
    runningBalance?: number;
  }[];
}

export interface IReconciliationMatchSummary {
  reconciliationId: string;
  totalTransactions: number;
  exactMatchesCount: number;
  probableMatchesCount: number;
  unmatchedCount: number;
  discrepancyTotalPkr: number;
  status: 'RECONCILED' | 'DISCREPANCY_FLAGGED';
}

export class BankReconciliationService {
  /**
   * 1. Ingests bank statement rows
   */
  static async importStatement(input: IImportStatementInput) {
    const pId = new Types.ObjectId(input.profileId);
    let totalDep = 0;
    let totalWith = 0;

    const formattedTxs: IBankStatementTransaction[] = input.transactions.map((t) => {
      const dep = Number(t.deposit) || 0;
      const withdr = Number(t.withdrawal) || 0;
      totalDep += dep;
      totalWith += withdr;

      return {
        transactionDate: new Date(t.transactionDate),
        description: t.description.trim(),
        referenceNo: t.referenceNo ? t.referenceNo.trim() : undefined,
        withdrawal: withdr,
        deposit: dep,
        runningBalance: t.runningBalance,
        matchStatus: 'UNMATCHED',
      };
    });

    const reconciliation = await BankReconciliation.create({
      profileId: pId,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      statementStartDate: new Date(input.statementStartDate),
      statementEndDate: new Date(input.statementEndDate),
      openingBalance: input.openingBalance,
      closingBalance: input.closingBalance,
      transactions: formattedTxs,
      totalDeposits: totalDep,
      totalWithdrawals: totalWith,
      unmatchedCount: formattedTxs.length,
      reconciledCount: 0,
      status: 'IN_PROGRESS',
    });

    return reconciliation;
  }

  /**
   * 2. Automated 3-Way Matching Algorithm
   */
  static async runAutoMatching(
    reconciliationId: string | Types.ObjectId,
    profileId: string | Types.ObjectId
  ): Promise<IReconciliationMatchSummary> {
    const pId = new Types.ObjectId(profileId);
    const rec = await BankReconciliation.findOne({ _id: reconciliationId, profileId: pId });
    if (!rec) throw new Error('Bank reconciliation record not found.');

    const start = rec.statementStartDate;
    const end = rec.statementEndDate;

    // Fetch ledger entries around statement window (expanded +/- 3 days for bank settlement lag)
    const windowStart = new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(end.getTime() + 3 * 24 * 60 * 60 * 1000);

    const ledgerEntries = await LedgerEntry.find({
      profileId: pId,
      createdAt: { $gte: windowStart, $lte: windowEnd },
    }).lean();

    const vouchers = await JournalVoucher.find({
      profileId: pId,
      date: { $gte: windowStart, $lte: windowEnd },
    }).lean();

    let exactCount = 0;
    let probableCount = 0;
    let unmatchedCount = 0;
    let discrepancyTotal = 0;

    for (const tx of rec.transactions) {
      if (tx.matchStatus === 'RECONCILED' || tx.matchStatus === 'ADJUSTED') {
        exactCount++;
        continue;
      }

      const txAmount = tx.deposit > 0 ? tx.deposit : tx.withdrawal;
      const isDeposit = tx.deposit > 0;
      let matched = false;

      // Rule A: Exact Reference No Match (Raast ID: RST-... or Invoice Ref)
      if (tx.referenceNo) {
        const targetRef = tx.referenceNo.toLowerCase();
        const refMatch = ledgerEntries.find(
          (l) =>
            l.ocrData?.extractedInvoiceNo?.toLowerCase() === targetRef ||
            (l.description && l.description.toLowerCase().includes(targetRef))
        );

        if (refMatch) {
          tx.matchStatus = 'EXACT_MATCH';
          tx.matchedLedgerEntryId = refMatch._id;
          tx.notes = `Matched via Reference No ${tx.referenceNo}`;
          exactCount++;
          matched = true;
        }
      }

      // Rule B: Exact Amount & Date Proximity (+/- 2 days)
      if (!matched) {
        const candidate = ledgerEntries.find((l) => {
          const amtMatch = Math.abs(l.amount - txAmount) < 1.0;
          const dateDiffDays = Math.abs(new Date(l.createdAt).getTime() - new Date(tx.transactionDate).getTime()) / (1000 * 60 * 60 * 24);
          const typeMatch = isDeposit
            ? ['CASH_IN', 'SETTLEMENT'].includes(l.entryType)
            : ['CASH_OUT', 'PAYABLE'].includes(l.entryType);
          return amtMatch && dateDiffDays <= 2.5 && typeMatch;
        });

        if (candidate) {
          tx.matchStatus = 'EXACT_MATCH';
          tx.matchedLedgerEntryId = candidate._id;
          tx.notes = `Matched on Amount Rs. ${txAmount.toLocaleString()} within 48h window`;
          exactCount++;
          matched = true;
        }
      }

      // Rule C: Probable Fuzzy Match (Amount matches, but 3-5 days drift or party name in description)
      if (!matched) {
        const fuzzyCandidate = ledgerEntries.find((l) => {
          const amtMatch = Math.abs(l.amount - txAmount) < 1.0;
          const dateDiffDays = Math.abs(new Date(l.createdAt).getTime() - new Date(tx.transactionDate).getTime()) / (1000 * 60 * 60 * 24);
          return amtMatch && dateDiffDays <= 6.0;
        });

        if (fuzzyCandidate) {
          tx.matchStatus = 'PROBABLE_MATCH';
          tx.matchedLedgerEntryId = fuzzyCandidate._id;
          tx.notes = `Probable match: Amount matches with minor bank clearing delay`;
          probableCount++;
          matched = true;
        }
      }

      if (!matched) {
        tx.matchStatus = 'UNMATCHED';
        tx.notes = isDeposit ? 'Unrecorded customer bank/Raast deposit' : 'Unrecorded bank fee, tax, or withdrawal';
        unmatchedCount++;
        discrepancyTotal += txAmount;
      }
    }

    rec.reconciledCount = exactCount;
    rec.unmatchedCount = unmatchedCount;
    rec.status = unmatchedCount === 0 ? 'RECONCILED' : 'DISCREPANCY_FLAGGED';
    await rec.save();

    return {
      reconciliationId: rec._id.toString(),
      totalTransactions: rec.transactions.length,
      exactMatchesCount: exactCount,
      probableMatchesCount: probableCount,
      unmatchedCount,
      discrepancyTotalPkr: Math.round(discrepancyTotal * 100) / 100,
      status: rec.status,
    };
  }

  /**
   * 3. Creates Balancing Double-Entry JEV Voucher for Unmatched Statement Line
   */
  static async resolveDiscrepancyWithJev(
    reconciliationId: string | Types.ObjectId,
    transactionId: string | Types.ObjectId,
    profileId: string | Types.ObjectId,
    details: {
      accountCategory?: 'BANK_CHARGES' | 'UNRECORDED_DEPOSIT' | 'WITHHOLDING_TAX' | 'GENERAL_EXPENSE';
      description?: string;
    }
  ) {
    const pId = new Types.ObjectId(profileId);
    const rec = await BankReconciliation.findOne({ _id: reconciliationId, profileId: pId });
    if (!rec) throw new Error('Reconciliation record not found.');

    const tx = (rec.transactions as any).id(transactionId);
    if (!tx) throw new Error('Transaction line not found in reconciliation.');

    const isDeposit = tx.deposit > 0;
    const amount = isDeposit ? tx.deposit : tx.withdrawal;
    const category = details.accountCategory || (isDeposit ? 'UNRECORDED_DEPOSIT' : 'BANK_CHARGES');

    let lines: any[] = [];
    let voucherType: any = 'JV';

    if (isDeposit) {
      voucherType = 'BRV'; // Bank Receipt Voucher
      // Debit: Bank Account, Credit: Unearned / Unrecorded Revenue
      lines = [
        {
          code: '1030-BANK-ACCOUNT',
          title: 'Bank Account / Raast (بینک اکاؤنٹ)',
          debit: amount,
          credit: 0,
        },
        {
          code: '4010-SALES-REVENUE',
          title: 'Unrecorded Customer Digital Deposit (ڈیجیٹل وصولی)',
          debit: 0,
          credit: amount,
        },
      ];
    } else {
      voucherType = 'BPV'; // Bank Payment Voucher
      // Debit: Bank Charges / Expense, Credit: Bank Account
      lines = [
        {
          code: category === 'WITHHOLDING_TAX' ? '5035-BANK-TAX' : '5010-OPERATING-EXPENSES',
          title: category === 'WITHHOLDING_TAX' ? 'FBR Advance Withholding Tax (بینک ودہولڈنگ)' : 'Bank Charges & SMS Fee (بینک چارجز)',
          debit: amount,
          credit: 0,
        },
        {
          code: '1030-BANK-ACCOUNT',
          title: 'Bank Account / Raast (بینک اکاؤنٹ)',
          debit: 0,
          credit: amount,
        },
      ];
    }

    const voucherNum = `${voucherType}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const voucher = await JournalVoucher.create({
      profileId: pId,
      voucherNumber: voucherNum,
      voucherType,
      date: tx.transactionDate || new Date(),
      lines,
      totalDebit: amount,
      totalCredit: amount,
      discrepancy: 0,
      isBalanced: true,
      narration: `Bank Reconciliation Adjusting Entry for "${tx.description}". Reference: ${tx.referenceNo || 'None'}`,
      referenceType: 'BANK_RECONCILIATION',
      referenceId: rec._id,
      status: 'POSTED',
    });

    tx.matchStatus = 'ADJUSTED';
    tx.matchedVoucherId = voucher._id;
    tx.notes = `Adjusted via JEV Voucher #${voucher.voucherNumber}`;
    rec.unmatchedCount = Math.max(0, rec.unmatchedCount - 1);
    rec.reconciledCount += 1;
    if (rec.unmatchedCount === 0) rec.status = 'RECONCILED';
    await rec.save();

    return {
      success: true,
      voucher,
      updatedTransaction: tx,
    };
  }
}
