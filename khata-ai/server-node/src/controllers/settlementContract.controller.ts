import { Request, Response } from 'express';
import { SettlementContract, SettlementStatus } from '../models/SettlementContract';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * 1. Create a Debt Settlement Contract
 * POST /api/v1/settlement
 */
export const createSettlementContract = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      counterpartyId,
      originalDebtAmount,
      offeredDiscountAmount = 0,
      agreedPayoffAmount,
      daysOverdueAtOffer = 0,
      expiresAt,
    } = req.body;

    if (!counterpartyId || !originalDebtAmount || !agreedPayoffAmount || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'counterpartyId, originalDebtAmount, agreedPayoffAmount, and expiresAt are required.',
      });
    }

    const origDebt = Number(originalDebtAmount);
    const discount = Number(offeredDiscountAmount) || 0;
    const agreedPayoff = Number(agreedPayoffAmount);

    if (origDebt <= 0 || agreedPayoff <= 0) {
      return res.status(400).json({ success: false, message: 'Debt and payoff amounts must be greater than zero.' });
    }

    const contract = await SettlementContract.create({
      profileId,
      counterpartyId,
      originalDebtAmount: origDebt,
      offeredDiscountAmount: discount,
      agreedPayoffAmount: agreedPayoff,
      daysOverdueAtOffer: Number(daysOverdueAtOffer) || 0,
      expiresAt: new Date(expiresAt),
      status: 'OFFERED',
    });

    return res.status(201).json({
      success: true,
      message: 'Settlement contract created successfully.',
      data: contract,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Settlement Contracts
 * GET /api/v1/settlement
 */
export const getSettlementContracts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { counterpartyId, status, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (counterpartyId && typeof counterpartyId === 'string') {
      filter.counterpartyId = counterpartyId;
    }

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [contracts, totalCount] = await Promise.all([
      SettlementContract.find(filter)
        .populate('counterpartyId', 'name phone counterpartyType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SettlementContract.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: contracts,
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
 * 3. Get Single Settlement Contract by ID
 * GET /api/v1/settlement/:id
 */
export const getSettlementContractById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const contract = await SettlementContract.findOne({ _id: id, profileId })
      .populate('counterpartyId', 'name phone email counterpartyType creditLimit');

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Settlement contract not found.' });
    }

    return res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Settlement Contract Status
 * PATCH /api/v1/settlement/:id/status
 */
export const updateSettlementStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { status, paymentReference } = req.body;

    const validStatuses: SettlementStatus[] = ['OFFERED', 'ACCEPTED', 'FULFILLED', 'EXPIRED', 'REJECTED'];
    if (!status || !validStatuses.includes(status as SettlementStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const contract = await SettlementContract.findOne({ _id: id, profileId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Settlement contract not found.' });
    }

    const previousStatus = contract.status;
    contract.status = status as SettlementStatus;
    if (paymentReference) contract.paymentReference = paymentReference;

    if (status === 'ACCEPTED' && !contract.acceptedAt) {
      contract.acceptedAt = new Date();
    } else if (status === 'FULFILLED' && !contract.fulfilledAt) {
      contract.fulfilledAt = new Date();

      if (previousStatus !== 'FULFILLED') {
        // Zero out customer balance and record settlement entry
        const counterparty = await Counterparty.findOne({ _id: contract.counterpartyId, profileId });
        if (counterparty) {
          counterparty.currentBalance = 0;
          await counterparty.save();

          await LedgerEntry.create({
            profileId,
            counterpartyId: contract.counterpartyId,
            entryType: 'SETTLEMENT',
            amount: contract.agreedPayoffAmount,
            discountAmount: contract.offeredDiscountAmount,
            settlementContractId: contract._id,
            paymentMode: 'CASH',
            category: 'Debt Settlement',
            description: `Full debt settlement contract fulfilled. (Original: Rs. ${contract.originalDebtAmount.toLocaleString()}, Discount: Rs. ${contract.offeredDiscountAmount.toLocaleString()})`,
            inputMode: 'MANUAL',
            isSettled: true,
            settledAt: new Date(),
          });
        }
      }
    }

    await contract.save();

    return res.status(200).json({
      success: true,
      message: `Settlement contract status updated to ${status}.`,
      data: contract,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * 5. Delete Settlement Contract
 * DELETE /api/v1/settlement/:id
 */
export const deleteSettlementContract = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const contract = await SettlementContract.findOneAndDelete({ _id: id, profileId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Settlement contract not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Settlement contract deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
