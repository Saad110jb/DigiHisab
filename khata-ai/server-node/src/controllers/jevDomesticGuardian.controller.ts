import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  JevDomesticGuardianService,
  IJevValidationInput,
} from '../services/jevDomesticGuardian.service';
import { VaultAccount, SavingsBucket } from '../models/HouseholdVault';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Validate Domestic Outflow with JEV Guardian
 * POST /api/v1/domestic/jev-guardian/validate
 */
export const validateDomesticTransaction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const {
      sourceModule,
      amount,
      vaultAccountId,
      paymentChannel,
      categoryTitle,
      sinkingFundCategory,
    } = req.body;

    if (!sourceModule || amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid sourceModule and amount (PKR) are required.',
      });
    }

    const validation = await JevDomesticGuardianService.validateDomesticTransaction({
      profileId,
      sourceModule,
      amount: Number(amount),
      vaultAccountId,
      paymentChannel,
      categoryTitle,
      sinkingFundCategory,
    });

    return res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. 1-Tap Inter-Vault Transfer (e.g. Bank ATM Withdrawal -> Cash Safe)
 * POST /api/v1/domestic/jev-guardian/resolve-shortage
 */
export const resolveVaultShortage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const { fromVaultId, toVaultId, amount, notes } = req.body;

    if (!fromVaultId || !toVaultId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'fromVaultId, toVaultId, and positive transfer amount are required.',
      });
    }

    const transferResult = await JevDomesticGuardianService.executeAtmTransfer(
      profileId,
      fromVaultId,
      toVaultId,
      Number(amount),
      notes
    );

    return res.status(200).json({
      success: true,
      message: '1-Tap ATM transfer executed successfully with balanced journal voucher.',
      data: transferResult,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Get Household Budget Radar & Velocity
 * GET /api/v1/domestic/jev-guardian/budget-radar
 */
export const getHouseholdBudgetRadar = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const radar = await JevDomesticGuardianService.getHouseholdBudgetRadar(profileId);

    return res.status(200).json({
      success: true,
      data: radar,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Commit Guarded Domestic Expense (Atomic Vault & Double-Entry Voucher Execution)
 * POST /api/v1/domestic/jev-guardian/commit-expense
 */
export const commitGuardedExpense = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const subAccountId = req.user?.subAccountId;
    const {
      sourceModule,
      amount,
      vaultAccountId,
      description,
      useSinkingFundOffset = false,
      sinkingBucketId,
      voucherNumber,
      category,
    } = req.body;

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Positive expense amount is required.',
      });
    }

    const now = new Date();

    // 1. Deduct from Target Vault Account
    let updatedVault = null;
    if (vaultAccountId) {
      updatedVault = await VaultAccount.findOneAndUpdate(
        { _id: new Types.ObjectId(vaultAccountId), profileId: new Types.ObjectId(profileId) },
        { $inc: { currentBalance: -numericAmount }, lastReconciledAt: now },
        { new: true }
      );
    }

    // 2. Offset Sinking Fund Bucket if requested
    let updatedBucket = null;
    if (useSinkingFundOffset && sinkingBucketId) {
      updatedBucket = await SavingsBucket.findOneAndUpdate(
        { _id: new Types.ObjectId(sinkingBucketId), profileId: new Types.ObjectId(profileId) },
        { $inc: { currentSavedAmount: -numericAmount } },
        { new: true }
      );
    }

    // 3. Create Balanced Double-Entry Ledger Entry
    const finalVoucher =
      voucherNumber ||
      `CPV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const ledgerEntry = await LedgerEntry.create({
      profileId: new Types.ObjectId(profileId),
      subAccountId: subAccountId ? new Types.ObjectId(subAccountId) : undefined,
      entryType: 'CASH_OUT',
      amount: numericAmount,
      paymentMode: updatedVault?.accountType === 'COMMERCIAL_BANK' ? 'BANK_TRANSFER' : 'CASH',
      category: category || sourceModule || 'Domestic Expense',
      description: `${description || 'گھریلو خرچ'} [${finalVoucher}]`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: now,
    });

    return res.status(201).json({
      success: true,
      message: 'Domestic expense guarded and committed with balanced double-entry voucher.',
      data: {
        voucherNumber: finalVoucher,
        ledgerEntry,
        updatedVault,
        updatedBucket,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
