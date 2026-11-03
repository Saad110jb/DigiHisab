import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DomesticPayroll } from '../models/DomesticPayroll';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Create Staff Payroll Register Profile
 * POST /api/v1/payroll
 */
export const createStaffPayroll = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      staffCounterpartyId,
      staffName,
      roleTitle,
      baseSalary,
      advancePlan,
    } = req.body;

    if (!staffCounterpartyId || !staffName || !roleTitle || baseSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Staff counterparty ID, staff name, role title (Maid|Driver|Guard|Assistant), and base salary are required.',
      });
    }

    // Verify counterparty exists and belongs to current user
    const counterparty = await Counterparty.findOne({ _id: staffCounterpartyId, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Staff counterparty contact not found.' });
    }

    // Check duplicate payroll record for same counterparty
    const existing = await DomesticPayroll.findOne({ profileId, staffCounterpartyId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A payroll profile already exists for this staff member.',
      });
    }

    const initialAdvance = advancePlan || {
      totalAdvanceGiven: 0,
      monthlyDeductionAmount: 0,
      remainingBalance: 0,
      active: false,
    };

    const payroll = await DomesticPayroll.create({
      profileId,
      staffCounterpartyId: counterparty._id,
      staffName: staffName.trim(),
      roleTitle: roleTitle.trim(),
      baseSalary: Number(baseSalary),
      advancePlan: {
        totalAdvanceGiven: Number(initialAdvance.totalAdvanceGiven || 0),
        monthlyDeductionAmount: Number(initialAdvance.monthlyDeductionAmount || 0),
        remainingBalance: Number(initialAdvance.remainingBalance || initialAdvance.totalAdvanceGiven || 0),
        active: Boolean(initialAdvance.totalAdvanceGiven > 0),
      },
      attendanceSummary: {
        daysPresent: 30,
        daysAbsent: 0,
        deductionForAbsence: 0,
      },
      payrollsHistory: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Domestic staff payroll profile registered successfully.',
      data: payroll,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get All Staff Payroll Profiles (Paginated + Filters)
 * GET /api/v1/payroll
 */
export const getStaffPayrolls = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { search, roleTitle, hasActiveAdvance, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (roleTitle && typeof roleTitle === 'string') {
      filter.roleTitle = new RegExp(roleTitle.trim(), 'i');
    }

    if (search && typeof search === 'string') {
      filter.staffName = new RegExp(search.trim(), 'i');
    }

    if (hasActiveAdvance !== undefined) {
      filter['advancePlan.active'] = hasActiveAdvance === 'true';
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [payrolls, totalCount] = await Promise.all([
      DomesticPayroll.find(filter)
        .populate('staffCounterpartyId', 'name phone relationType currentBalance')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      DomesticPayroll.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: payrolls,
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
 * 3. Get Single Staff Payroll Profile by ID
 * GET /api/v1/payroll/:id
 */
export const getStaffPayrollById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const payroll = await DomesticPayroll.findOne({ _id: id, profileId }).populate(
      'staffCounterpartyId',
      'name phone alternatePhone currentBalance notes'
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Staff payroll profile not found.' });
    }

    return res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Staff Base Salary, Role, or Advance Plan Settings
 * PUT /api/v1/payroll/:id
 */
export const updateStaffPayroll = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { staffName, roleTitle, baseSalary, advancePlan } = req.body;

    const payroll = await DomesticPayroll.findOne({ _id: id, profileId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Staff payroll profile not found.' });
    }

    if (staffName) payroll.staffName = staffName.trim();
    if (roleTitle) payroll.roleTitle = roleTitle.trim();
    if (baseSalary !== undefined) payroll.baseSalary = Number(baseSalary);

    if (advancePlan) {
      if (advancePlan.totalAdvanceGiven !== undefined) payroll.advancePlan.totalAdvanceGiven = Number(advancePlan.totalAdvanceGiven);
      if (advancePlan.monthlyDeductionAmount !== undefined) payroll.advancePlan.monthlyDeductionAmount = Number(advancePlan.monthlyDeductionAmount);
      if (advancePlan.remainingBalance !== undefined) payroll.advancePlan.remainingBalance = Number(advancePlan.remainingBalance);
      if (advancePlan.active !== undefined) payroll.advancePlan.active = Boolean(advancePlan.active);
    }

    await payroll.save();

    return res.status(200).json({
      success: true,
      message: 'Staff payroll details updated successfully.',
      data: payroll,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Grant Salary Advance (Paishgi) to Staff
 * POST /api/v1/payroll/:id/advance
 */
export const grantSalaryAdvance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;
    const { advanceAmount, monthlyDeductionAmount, paymentMode = 'CASH', notes } = req.body;

    if (!advanceAmount || isNaN(Number(advanceAmount)) || Number(advanceAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive advance amount is required.' });
    }

    const payroll = await DomesticPayroll.findOne({ _id: id, profileId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Staff payroll profile not found.' });
    }

    const amount = Number(advanceAmount);
    const monthlyDeduction = monthlyDeductionAmount !== undefined ? Number(monthlyDeductionAmount) : Math.min(amount, Math.round(payroll.baseSalary * 0.3));

    // Append to existing advance balance if active
    payroll.advancePlan.totalAdvanceGiven += amount;
    payroll.advancePlan.remainingBalance += amount;
    payroll.advancePlan.monthlyDeductionAmount = monthlyDeduction;
    payroll.advancePlan.active = true;

    await payroll.save();

    // Auto-emit CASH_OUT entry in Ledger
    await LedgerEntry.create({
      profileId,
      counterpartyId: payroll.staffCounterpartyId,
      subAccountId,
      entryType: 'CASH_OUT',
      amount,
      paymentMode,
      category: 'Staff Salary Advance',
      description: `Salary advance (Paishgi) given to ${payroll.staffName} (${payroll.roleTitle}). ${notes || ''}`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Salary advance of PKR ${amount} granted to ${payroll.staffName}.`,
      data: payroll.advancePlan,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Process Monthly Salary Payment & Auto-Amortize Paishgi
 * POST /api/v1/payroll/:id/pay-salary
 */
export const processMonthlySalaryPayment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;
    const {
      month, // "YYYY-MM"
      daysPresent = 30,
      daysAbsent = 0,
      deductionForAbsence = 0,
      paymentMode = 'CASH',
      receiptPdfUrl,
    } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Billing month in YYYY-MM format is required.' });
    }

    const payroll = await DomesticPayroll.findOne({ _id: id, profileId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Staff payroll profile not found.' });
    }

    // Check if salary for this month is already paid
    const alreadyPaid = payroll.payrollsHistory.some((h) => h.month === month);
    if (alreadyPaid) {
      return res.status(400).json({
        success: false,
        message: `Salary for month ${month} has already been processed for ${payroll.staffName}.`,
      });
    }

    // Calculate advance deduction if advance is active
    let advanceDeducted = 0;
    if (payroll.advancePlan.active && payroll.advancePlan.remainingBalance > 0) {
      advanceDeducted = Math.min(
        payroll.advancePlan.remainingBalance,
        payroll.advancePlan.monthlyDeductionAmount
      );
      payroll.advancePlan.remainingBalance -= advanceDeducted;
      if (payroll.advancePlan.remainingBalance <= 0) {
        payroll.advancePlan.active = false;
      }
    }

    const absenceDeduction = Number(deductionForAbsence || 0);
    const netPaid = Math.max(0, payroll.baseSalary - absenceDeduction - advanceDeducted);

    payroll.attendanceSummary = {
      daysPresent: Number(daysPresent),
      daysAbsent: Number(daysAbsent),
      deductionForAbsence: absenceDeduction,
    };

    const paymentRecord = {
      month,
      baseSalary: payroll.baseSalary,
      advanceDeducted,
      netPaid,
      paidAt: new Date(),
      receiptPdfUrl,
    };

    payroll.payrollsHistory.push(paymentRecord);
    await payroll.save();

    // Auto-emit CASH_OUT transaction in main ledger
    await LedgerEntry.create({
      profileId,
      counterpartyId: payroll.staffCounterpartyId,
      subAccountId,
      entryType: 'CASH_OUT',
      amount: netPaid,
      paymentMode,
      category: 'Domestic Staff Salary',
      description: `Monthly salary payment for ${payroll.staffName} (${payroll.roleTitle}) - Month ${month}`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Salary for ${month} processed successfully. Net Paid: PKR ${netPaid} (Advance Deducted: PKR ${advanceDeducted}).`,
      data: {
        paymentRecord,
        remainingAdvanceBalance: payroll.advancePlan.remainingBalance,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Delete Staff Payroll Register Profile
 * DELETE /api/v1/payroll/:id
 */
export const deleteStaffPayroll = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const payroll = await DomesticPayroll.findOne({ _id: id, profileId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Staff payroll profile not found.' });
    }

    await payroll.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Staff payroll profile deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
