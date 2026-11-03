import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { InformalLoanRegistry, LoanDirection, LoanStatus } from '../models/InformalLoanRegistry';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * Normalizes local Pakistani mobile formats to E.164:
 * "03001234567" -> "+923001234567"
 */
const sanitizePhoneNumber = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  let cleaned = raw.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('92') && !cleaned.startsWith('+92')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

/**
 * 1. Record a New Zero-Interest Friendly Loan (Qarz-e-Hasana)
 * POST /api/v1/loans
 */
export const createInformalLoan = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const {
      contactName,
      contactPhone,
      loanDirection,
      principalAmount,
      agreedReturnDate,
      counterpartyId,
      notes,
      syncToLedger = true,
      paymentMode = 'CASH',
    } = req.body;

    if (!contactName || !loanDirection || principalAmount === undefined || isNaN(Number(principalAmount)) || Number(principalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact name, loanDirection (GIVEN | BORROWED), and valid principalAmount are required.',
      });
    }

    const validDirections: LoanDirection[] = ['GIVEN', 'BORROWED'];
    if (!validDirections.includes(loanDirection)) {
      return res.status(400).json({
        success: false,
        message: `Invalid loanDirection. Allowed values: ${validDirections.join(', ')}`,
      });
    }

    const amount = Number(principalAmount);

    const loan = await InformalLoanRegistry.create({
      profileId,
      counterpartyId: counterpartyId ? new Types.ObjectId(counterpartyId) : undefined,
      contactName: contactName.trim(),
      contactPhone: sanitizePhoneNumber(contactPhone),
      loanDirection,
      principalAmount: amount,
      remainingAmount: amount,
      agreedReturnDate: agreedReturnDate ? new Date(agreedReturnDate) : undefined,
      status: 'ACTIVE',
      isInterestFree: true,
      repaymentHistory: [],
      notes: notes ? notes.trim() : undefined,
    });

    // Auto-emit entry in main ledger for double-entry tracking
    if (syncToLedger && amount > 0) {
      const entryType = loanDirection === 'GIVEN' ? 'CASH_OUT' : 'CASH_IN';
      const desc = loanDirection === 'GIVEN'
        ? `Extended Qarz-e-Hasana (Friendly Loan) to ${contactName.trim()}`
        : `Received Qarz-e-Hasana (Friendly Loan) from ${contactName.trim()}`;

      await LedgerEntry.create({
        profileId,
        counterpartyId: counterpartyId ? new Types.ObjectId(counterpartyId) : undefined,
        subAccountId,
        entryType,
        amount,
        paymentMode,
        category: 'Qarz-e-Hasana',
        description: desc,
        inputMode: 'MANUAL',
        isSettled: true,
        settledAt: new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Qarz-e-Hasana loan record registered successfully.',
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Informal Loans with Filters
 * GET /api/v1/loans
 */
export const getInformalLoans = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { loanDirection, status, counterpartyId, search, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (loanDirection && typeof loanDirection === 'string') {
      filter.loanDirection = loanDirection.toUpperCase();
    }

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    if (counterpartyId && typeof counterpartyId === 'string') {
      filter.counterpartyId = new Types.ObjectId(counterpartyId);
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ contactName: searchRegex }, { contactPhone: searchRegex }];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [loans, totalCount] = await Promise.all([
      InformalLoanRegistry.find(filter)
        .populate('counterpartyId', 'name phone relationType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      InformalLoanRegistry.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: loans,
      pagination: {
        totalItems: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        pageSize: limitNum,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Get Single Informal Loan Details by ID
 * GET /api/v1/loans/:id
 */
export const getInformalLoanById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const loan = await InformalLoanRegistry.findOne({ _id: id, profileId }).populate(
      'counterpartyId',
      'name phone relationType currentBalance'
    );

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Informal loan record not found.' });
    }

    return res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Informal Loan Details
 * PUT /api/v1/loans/:id
 */
export const updateInformalLoan = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { contactName, contactPhone, agreedReturnDate, notes } = req.body;

    const loan = await InformalLoanRegistry.findOne({ _id: id, profileId });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Informal loan record not found.' });
    }

    if (contactName) loan.contactName = contactName.trim();
    if (contactPhone !== undefined) loan.contactPhone = sanitizePhoneNumber(contactPhone);
    if (agreedReturnDate !== undefined) loan.agreedReturnDate = agreedReturnDate ? new Date(agreedReturnDate) : undefined;
    if (notes !== undefined) loan.notes = notes ? notes.trim() : undefined;

    await loan.save();

    return res.status(200).json({
      success: true,
      message: 'Informal loan details updated successfully.',
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Record Partial or Full Loan Repayment
 * POST /api/v1/loans/:id/repay
 */
export const recordLoanRepayment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;
    const { amount, paymentMode = 'CASH', repaymentDate, notes } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive repayment amount is required.' });
    }

    const loan = await InformalLoanRegistry.findOne({ _id: id, profileId });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Informal loan record not found.' });
    }

    if (loan.status === 'FULLY_SETTLED' || loan.status === 'FORGIVEN') {
      return res.status(400).json({ success: false, message: `Loan is already ${loan.status.toLowerCase()}.` });
    }

    const repayAmount = Number(amount);
    const newRemaining = Math.max(0, loan.remainingAmount - repayAmount);

    loan.repaymentHistory.push({
      amount: repayAmount,
      repaymentDate: repaymentDate ? new Date(repaymentDate) : new Date(),
      paymentMode,
      notes: notes ? notes.trim() : undefined,
    } as any);

    loan.remainingAmount = newRemaining;
    if (newRemaining <= 0) {
      loan.status = 'FULLY_SETTLED';
    } else {
      loan.status = 'PARTIALLY_REPAID';
    }

    await loan.save();

    // Auto-emit repayment entry in main ledger
    const entryType = loan.loanDirection === 'GIVEN' ? 'CASH_IN' : 'CASH_OUT';
    const desc = loan.loanDirection === 'GIVEN'
      ? `Received Qarz-e-Hasana repayment from ${loan.contactName}`
      : `Paid Qarz-e-Hasana repayment to ${loan.contactName}`;

    await LedgerEntry.create({
      profileId,
      counterpartyId: loan.counterpartyId,
      subAccountId,
      entryType,
      amount: repayAmount,
      paymentMode,
      category: 'Qarz-e-Hasana Repayment',
      description: desc,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Repayment of PKR ${repayAmount} recorded for ${loan.contactName}. Status: ${loan.status}`,
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Forgive Loan (Mark as FORGIVEN / Maaf Kardiya)
 * PATCH /api/v1/loans/:id/forgive
 */
export const forgiveLoan = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const loan = await InformalLoanRegistry.findOne({ _id: id, profileId });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Informal loan record not found.' });
    }

    loan.remainingAmount = 0;
    loan.status = 'FORGIVEN';
    await loan.save();

    return res.status(200).json({
      success: true,
      message: `Loan for ${loan.contactName} has been marked as FORGIVEN.`,
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Delete Informal Loan Record
 * DELETE /api/v1/loans/:id
 */
export const deleteInformalLoan = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const loan = await InformalLoanRegistry.findOne({ _id: id, profileId });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Informal loan record not found.' });
    }

    await loan.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Informal loan record deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Get Aggregated Summary Statistics for Qarz-e-Hasana Loans
 * GET /api/v1/loans/summary-stats
 */
export const getLoanSummaryStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;

    const loans = await InformalLoanRegistry.find({ profileId });

    let totalGivenRemaining = 0;
    let totalBorrowedRemaining = 0;
    let settledCount = 0;
    let activeCount = 0;

    loans.forEach((l) => {
      if (l.status === 'FULLY_SETTLED' || l.status === 'FORGIVEN') {
        settledCount += 1;
      } else {
        activeCount += 1;
        if (l.loanDirection === 'GIVEN') {
          totalGivenRemaining += l.remainingAmount;
        } else if (l.loanDirection === 'BORROWED') {
          totalBorrowedRemaining += l.remainingAmount;
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalGivenRemaining,
        totalBorrowedRemaining,
        activeCount,
        settledCount,
        totalRecords: loans.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
