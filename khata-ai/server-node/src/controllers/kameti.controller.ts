import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { KametiPool } from '../models/KametiPool';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * Normalizes local Pakistani mobile formats to E.164:
 * "03001234567" -> "+923001234567"
 */
const sanitizePhoneNumber = (raw: string): string => {
  let cleaned = raw.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('92') && !cleaned.startsWith('+92')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

/**
 * 1. Create a New Kameti / Chit-Fund Pool
 * POST /api/v1/kameti
 */
export const createKametiPool = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { title, monthlyContribution, totalMonths, startDate, members = [] } = req.body;

    if (!title || !monthlyContribution || !totalMonths) {
      return res.status(400).json({
        success: false,
        message: 'Title, monthly contribution (PKR), and total duration in months are required.',
      });
    }

    const contribution = Number(monthlyContribution);
    const months = Number(totalMonths);

    if (contribution < 100 || months < 2) {
      return res.status(400).json({
        success: false,
        message: 'Monthly contribution must be at least 100 PKR and duration must be at least 2 months.',
      });
    }

    const poolAmount = contribution * months;

    // Process member items with default liabilities
    const formattedMembers = members.map((m: any, index: number) => ({
      counterpartyId: m.counterpartyId ? new Types.ObjectId(m.counterpartyId) : undefined,
      memberName: m.memberName.trim(),
      memberPhone: sanitizePhoneNumber(m.memberPhone),
      payoutMonth: m.payoutMonth || index + 1,
      payoutReceived: false,
      paidMonths: [],
      unpaidLiability: poolAmount,
    }));

    const pool = await KametiPool.create({
      organizerProfileId,
      title: title.trim(),
      monthlyContribution: contribution,
      totalMonths: months,
      poolAmount,
      currentCycle: 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      status: 'ACTIVE',
      members: formattedMembers,
    });

    return res.status(201).json({
      success: true,
      message: 'Kameti savings pool created successfully.',
      data: pool,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get All Kameti Pools (with status & search filter)
 * GET /api/v1/kameti
 */
export const getKametiPools = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { status, search, page = '1', limit = '20' } = req.query;

    const filter: any = { organizerProfileId };

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    if (search && typeof search === 'string') {
      filter.title = new RegExp(search.trim(), 'i');
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [pools, totalCount] = await Promise.all([
      KametiPool.find(filter)
        .populate('members.counterpartyId', 'name phone relationType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      KametiPool.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: pools,
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
 * 3. Get Single Kameti Pool by ID
 * GET /api/v1/kameti/:id
 */
export const getKametiPoolById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { id } = req.params;

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId }).populate(
      'members.counterpartyId',
      'name phone relationType currentBalance'
    );

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    return res.status(200).json({
      success: true,
      data: pool,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Delete Kameti Pool
 * DELETE /api/v1/kameti/:id
 */
export const deleteKametiPool = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { id } = req.params;

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId });
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    await pool.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Kameti pool deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Add Member to Existing Pool
 * POST /api/v1/kameti/:id/members
 */
export const addMemberToPool = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { id } = req.params;
    const { memberName, memberPhone, payoutMonth, counterpartyId } = req.body;

    if (!memberName || !memberPhone) {
      return res.status(400).json({ success: false, message: 'Member name and phone number are required.' });
    }

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId });
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    if (pool.members.length >= pool.totalMonths) {
      return res.status(400).json({
        success: false,
        message: `Pool has reached maximum capacity of ${pool.totalMonths} members.`,
      });
    }

    const nextPayoutMonth = payoutMonth ? Number(payoutMonth) : pool.members.length + 1;

    pool.members.push({
      counterpartyId: counterpartyId ? new Types.ObjectId(counterpartyId) : undefined,
      memberName: memberName.trim(),
      memberPhone: sanitizePhoneNumber(memberPhone),
      payoutMonth: nextPayoutMonth,
      payoutReceived: false,
      paidMonths: [],
      unpaidLiability: pool.poolAmount,
    } as any);

    await pool.save();

    return res.status(201).json({
      success: true,
      message: 'Member added to Kameti pool.',
      data: pool,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Record Member Installment Payment for Current/Specific Cycle
 * POST /api/v1/kameti/:id/members/:memberId/pay
 */
export const recordInstallmentPayment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id, memberId } = req.params;
    const { cycleNumber, amount, paymentMode = 'CASH' } = req.body;

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId });
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    const member = pool.members.find((m: any) => m._id?.toString() === memberId || m.id === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in this pool.' });
    }

    const cycleToPay = cycleNumber ? Number(cycleNumber) : pool.currentCycle;

    if (member.paidMonths.includes(cycleToPay)) {
      return res.status(400).json({
        success: false,
        message: `Member ${member.memberName} has already paid installment for Cycle #${cycleToPay}.`,
      });
    }

    member.paidMonths.push(cycleToPay);

    // Re-calculate unpaid liability exposure
    const totalPaidSoFar = pool.monthlyContribution * member.paidMonths.length;
    member.unpaidLiability = Math.max(0, pool.poolAmount - totalPaidSoFar);

    await pool.save();

    // Auto log transaction in main ledger for double-entry tracking
    const installmentAmount = amount !== undefined ? Number(amount) : pool.monthlyContribution;
    await LedgerEntry.create({
      profileId: organizerProfileId,
      counterpartyId: member.counterpartyId,
      subAccountId,
      entryType: 'CASH_IN',
      amount: installmentAmount,
      paymentMode,
      category: 'Kameti Installment',
      description: `Kameti contribution by ${member.memberName} for '${pool.title}' (Cycle #${cycleToPay})`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Installment payment of PKR ${installmentAmount} recorded for ${member.memberName}.`,
      data: member,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Disburse Payout to Winner Member for Current Cycle
 * POST /api/v1/kameti/:id/members/:memberId/disburse
 */
export const disbursePayout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id, memberId } = req.params;
    const { paymentMode = 'CASH' } = req.body;

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId });
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    const member = pool.members.find((m: any) => m._id?.toString() === memberId || m.id === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in this pool.' });
    }

    if (member.payoutReceived) {
      return res.status(400).json({
        success: false,
        message: `Payout of PKR ${pool.poolAmount} has already been disbursed to ${member.memberName}.`,
      });
    }

    member.payoutReceived = true;
    member.payoutDate = new Date();

    await pool.save();

    // Log payout cash out in main ledger
    await LedgerEntry.create({
      profileId: organizerProfileId,
      counterpartyId: member.counterpartyId,
      subAccountId,
      entryType: 'CASH_OUT',
      amount: pool.poolAmount,
      paymentMode,
      category: 'Kameti Payout',
      description: `Kameti pot payout of PKR ${pool.poolAmount} to ${member.memberName} for '${pool.title}'`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Payout of PKR ${pool.poolAmount} disbursed to ${member.memberName}.`,
      data: member,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Advance Pool to Next Cycle Month
 * PATCH /api/v1/kameti/:id/advance-cycle
 */
export const advanceCycle = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizerProfileId = req.user?.id;
    const { id } = req.params;

    const pool = await KametiPool.findOne({ _id: id, organizerProfileId });
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Kameti pool not found.' });
    }

    if (pool.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Kameti pool is already completed.' });
    }

    if (pool.currentCycle >= pool.totalMonths) {
      pool.status = 'COMPLETED';
    } else {
      pool.currentCycle += 1;
    }

    await pool.save();

    return res.status(200).json({
      success: true,
      message: pool.status === 'COMPLETED'
        ? `Kameti pool '${pool.title}' has reached final cycle and is marked COMPLETED.`
        : `Kameti pool advanced to Cycle #${pool.currentCycle}.`,
      data: pool,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
