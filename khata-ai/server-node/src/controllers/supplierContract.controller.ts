import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SupplierContract } from '../models/SupplierContract';
import { Counterparty } from '../models/Counterparty';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import { LedgerEntry } from '../models/LedgerEntry';
import { WholesalePurchaseOrder } from '../models/WholesalePurchaseOrder';
import { AuditLog } from '../models/AuditLog';
import { Profile } from '../models/Profile';
import {
  compileAndValidateDoubleEntry,
  normalizePaymentChannel,
} from '../services/jevDoubleEntry.service';
import { dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

/**
 * 1. Create a Supplier Terms Contract
 * POST /api/v1/supplier-contracts
 */
export const createSupplierContract = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      supplierCounterpartyId,
      contractTitle,
      creditPeriodDays = 30,
      maxCreditCeiling = 50000,
      earlyPaymentDiscountPercent = 0,
      earlyPaymentWindowDays = 0,
      agreementStartDate,
      agreementEndDate,
      termsAndConditions,
      isActive = true,
    } = req.body;

    if (!supplierCounterpartyId || !contractTitle) {
      return res.status(400).json({
        success: false,
        message: 'supplierCounterpartyId and contractTitle are required.',
      });
    }

    const contract = await SupplierContract.create({
      profileId,
      supplierCounterpartyId,
      contractTitle: contractTitle.trim(),
      creditPeriodDays: Number(creditPeriodDays) || 30,
      maxCreditCeiling: Number(maxCreditCeiling) || 50000,
      earlyPaymentDiscountPercent: Number(earlyPaymentDiscountPercent) || 0,
      earlyPaymentWindowDays: Number(earlyPaymentWindowDays) || 0,
      agreementStartDate: agreementStartDate ? new Date(agreementStartDate) : new Date(),
      agreementEndDate: agreementEndDate ? new Date(agreementEndDate) : undefined,
      termsAndConditions: termsAndConditions ? termsAndConditions.trim() : undefined,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Supplier contract created successfully.',
      data: contract,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Supplier Contracts
 * GET /api/v1/supplier-contracts
 */
export const getSupplierContracts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { supplierCounterpartyId, isActive, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (supplierCounterpartyId && typeof supplierCounterpartyId === 'string') {
      filter.supplierCounterpartyId = supplierCounterpartyId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [contracts, totalCount] = await Promise.all([
      SupplierContract.find(filter)
        .populate('supplierCounterpartyId', 'name phone counterpartyType creditLimit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SupplierContract.countDocuments(filter),
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
 * 3. Get Single Supplier Contract by ID
 * GET /api/v1/supplier-contracts/:id
 */
export const getSupplierContractById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const contract = await SupplierContract.findOne({ _id: id, profileId })
      .populate('supplierCounterpartyId', 'name phone email counterpartyType creditLimit currentBalance');

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Supplier contract not found.' });
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
 * 4. Update Supplier Contract Terms
 * PUT /api/v1/supplier-contracts/:id
 */
export const updateSupplierContract = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      contractTitle,
      creditPeriodDays,
      maxCreditCeiling,
      earlyPaymentDiscountPercent,
      earlyPaymentWindowDays,
      agreementStartDate,
      agreementEndDate,
      termsAndConditions,
      isActive,
    } = req.body;

    const contract = await SupplierContract.findOne({ _id: id, profileId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Supplier contract not found.' });
    }

    if (contractTitle) contract.contractTitle = contractTitle.trim();
    if (creditPeriodDays !== undefined) contract.creditPeriodDays = Number(creditPeriodDays);
    if (maxCreditCeiling !== undefined) contract.maxCreditCeiling = Number(maxCreditCeiling);
    if (earlyPaymentDiscountPercent !== undefined) contract.earlyPaymentDiscountPercent = Number(earlyPaymentDiscountPercent);
    if (earlyPaymentWindowDays !== undefined) contract.earlyPaymentWindowDays = Number(earlyPaymentWindowDays);
    if (agreementStartDate) contract.agreementStartDate = new Date(agreementStartDate);
    if (agreementEndDate !== undefined) contract.agreementEndDate = agreementEndDate ? new Date(agreementEndDate) : undefined;
    if (termsAndConditions !== undefined) contract.termsAndConditions = termsAndConditions ? termsAndConditions.trim() : undefined;
    if (isActive !== undefined) contract.isActive = Boolean(isActive);

    await contract.save();

    return res.status(200).json({
      success: true,
      message: 'Supplier contract updated successfully.',
      data: contract,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Delete Supplier Contract
 * DELETE /api/v1/supplier-contracts/:id
 */
export const deleteSupplierContract = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const contract = await SupplierContract.findOneAndDelete({ _id: id, profileId });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Supplier contract not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier contract deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Create Supplier Bill from Wholesale PO (with Advance deduction, Stock sync, Due Date scheduling)
 * POST /api/v1/suppliers/bills/create-from-po
 */
export const createSupplierBillFromPo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      supplierId,
      poId,
      invoiceNo,
      billAmount,
      useAdvance = true,
      stockSync = true,
      dueDate,
      items = [],
      notes,
    } = req.body;

    if (!supplierId || billAmount === undefined || isNaN(Number(billAmount)) || Number(billAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'supplierId and positive billAmount are required.',
      });
    }

    const supplier = await Counterparty.findOne({ _id: supplierId, profileId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const grossAmount = Number(billAmount);
    const existingAdvance = supplier.advanceDeposit || 0;

    let advanceDeducted = 0;
    if (useAdvance && existingAdvance > 0) {
      advanceDeducted = Math.min(existingAdvance, grossAmount);
      supplier.advanceDeposit = existingAdvance - advanceDeducted;
    }

    const immediatePay = Math.max(0, Number(req.body.immediatePaymentAmount || req.body.cashPaidNow || 0));
    const payMode = String(req.body.paymentMode || 'CASH');

    const profile = await Profile.findById(profileId);
    const availableChannels = profile?.paymentChannels || {
      cashDrawer: 45000,
      bankAccount: 125000,
      digitalWallet: 32000,
    };

    // Jev Double-Entry & Channel Solvency Gatekeeper
    const jevValidation = compileAndValidateDoubleEntry({
      transactionType: 'SUPPLIER_BILL',
      grossAmount,
      advanceOffset: advanceDeducted,
      immediatePaymentAmount: immediatePay,
      paymentMode: payMode,
      availableChannels,
    });

    if (!jevValidation.is_balanced) {
      return res.status(400).json({
        success: false,
        code: 'JEV_UNBALANCED_ENTRY',
        message: jevValidation.messages.ur,
        messageEn: jevValidation.messages.en,
        validation: jevValidation,
      });
    }

    if (jevValidation.risk_level === 'CRITICAL_HALT' || jevValidation.channel_solvency_confidence < 1.0) {
      return res.status(422).json({
        success: false,
        code: 'CRITICAL_HALT_INSUFFICIENT_FUNDS',
        message: jevValidation.messages.ur,
        messageEn: jevValidation.messages.en,
        availableBalance: jevValidation.validation_details.available_channel_balance,
        shortageAmount: jevValidation.validation_details.shortage_amount,
        validation: jevValidation,
      });
    }

    // Deduct immediate payment from the inspected channel if requested
    if (immediatePay > 0 && profile) {
      const channelKey = normalizePaymentChannel(payMode);
      const resolvedChannel = channelKey === 'none' ? 'cashDrawer' : channelKey;
      if (profile.paymentChannels) {
        profile.paymentChannels[resolvedChannel] = (profile.paymentChannels[resolvedChannel] ?? 0) - immediatePay;
        profile.markModified('paymentChannels');
        await profile.save();
      }
    }

    const netPayable = Math.max(0, grossAmount - advanceDeducted - immediatePay);

    // Adjust supplier payable balance (- netPayable)
    supplier.currentBalance = (supplier.currentBalance || 0) - netPayable;
    await supplier.save();

    // Stock Sync
    const updatedInventoryItems: any[] = [];
    if (stockSync && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemId = item.inventoryItemId || item._id;
        if (itemId) {
          const invItem = await InventoryItem.findOne({ _id: itemId, profileId });
          if (invItem) {
            const previousStock = invItem.stockOnHand;
            const qtyToAdd = Math.max(1, Number(item.quantityOrdered || item.qty || item.quantity) || 1);
            invItem.stockOnHand += qtyToAdd;
            await invItem.save();

            await StockMovement.create({
              profileId,
              inventoryItemId: invItem._id,
              movementType: 'RESTOCK',
              quantityChange: qtyToAdd,
              previousStock,
              newStock: invItem.stockOnHand,
              unitCost: Number(item.unitCost || item.rate) || invItem.wholesaleCost || 0,
              referenceId: poId && Types.ObjectId.isValid(poId) ? new Types.ObjectId(poId) : undefined,
              notes: `Stock auto-synced from Supplier Bill ${invoiceNo || ''}`,
            });

            updatedInventoryItems.push(invItem);
          }
        }
      }
    }

    // Create LedgerEntry
    const generatedInvoiceNo = invoiceNo || `INV-${supplier.name.substring(0, 3).toUpperCase()}-${Date.now()}`;
    const paymentDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const description = `Bill ${generatedInvoiceNo} (Total: Rs. ${grossAmount.toLocaleString()}, Advance Adjusted: Rs. ${advanceDeducted.toLocaleString()})${notes ? ` - ${notes}` : ''}`;

    const ledgerEntry = await LedgerEntry.create({
      profileId,
      counterpartyId: supplier._id,
      entryType: 'PAYABLE',
      amount: netPayable,
      paymentMode: 'CREDIT',
      category: 'Supplier Stock Bill',
      description,
      dueDate: paymentDueDate,
      isSettled: netPayable === 0,
    });

    // Update PO status if poId provided
    if (poId && Types.ObjectId.isValid(poId)) {
      await WholesalePurchaseOrder.findOneAndUpdate(
        { _id: poId, profileId },
        {
          status: 'RECEIVED',
          receivedDate: new Date(),
          paymentStatus: netPayable === 0 ? 'PAID' : advanceDeducted > 0 ? 'PARTIAL' : 'UNPAID',
        }
      );
    }

    try {
      await AuditLog.create({
        profileId,
        authorizedById: new Types.ObjectId(profileId),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType: 'SUPPLIER_BILL_CREATED',
        reason: `Supplier bill created for ${supplier.name} with net payable Rs. ${netPayable.toLocaleString()}`,
        details: { supplierId: supplier._id, grossAmount, advanceDeducted, netPayable, invoiceNo: generatedInvoiceNo },
      });
    } catch (auditErr) {
      // Non-blocking
    }

    // Broadcast real-time metrics sync to all connected clients
    if (profileId) {
      try {
        const updatedMetrics = await getAggregatedStoreMetrics(profileId);
        dispatchMetricsSync(profileId.toString(), updatedMetrics);
      } catch (syncErr) {
        console.warn('[createSupplierBillFromPo] Metrics sync broadcast failed:', syncErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Supplier bill recorded successfully.',
      data: {
        ledgerEntry,
        supplier: {
          _id: supplier._id,
          name: supplier.name,
          currentBalance: supplier.currentBalance,
          advanceDeposit: supplier.advanceDeposit,
        },
        advanceDeducted,
        netPayable,
        immediatePaymentAmount: immediatePay,
        paymentDueDate,
        updatedInventoryItems,
        jevValidation,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

