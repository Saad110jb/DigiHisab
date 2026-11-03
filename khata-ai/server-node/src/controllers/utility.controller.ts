import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UtilitySplit } from '../models/UtilitySplit';
import { Counterparty } from '../models/Counterparty';

/**
 * 1. Create Manual Utility Record (Without Allocations)
 * POST /api/v1/utility
 */
export const createUtilitySplit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { utilityType, providerName = 'General Utility', billingMonth, totalBillAmount, totalUnitsConsumed = 0, billDueDate } = req.body;

    if (!utilityType || !billingMonth || !totalBillAmount || !billDueDate) {
      return res.status(400).json({
        success: false,
        message: 'Utility type (ELECTRICITY|GAS|WATER|INTERNET), billing month (YYYY-MM), total bill amount, and due date are required.',
      });
    }

    const validTypes = ['ELECTRICITY', 'GAS', 'WATER', 'INTERNET'];
    if (!validTypes.includes(utilityType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid utilityType. Allowed values: ${validTypes.join(', ')}`,
      });
    }

    const split = await UtilitySplit.create({
      profileId,
      utilityType,
      providerName: providerName.trim(),
      billingMonth: billingMonth.trim(),
      totalBillAmount: Number(totalBillAmount),
      totalUnitsConsumed: Number(totalUnitsConsumed),
      billDueDate: new Date(billDueDate),
      isFullySettled: false,
      allocations: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Utility bill split created successfully.',
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Process / Ingest OCR Extracted Bill Data
 * POST /api/v1/utility/:id/process-ocr
 */
export const processOcrBill = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      rawImageUrl,
      consumerNumber,
      detectedPeakUnits,
      detectedOffPeakUnits,
      tariffSlabApplied,
      ocrConfidence = 0.95,
      detectedTotalAmount,
      detectedTotalUnits,
    } = req.body;

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    if (detectedTotalAmount !== undefined) split.totalBillAmount = Number(detectedTotalAmount);
    if (detectedTotalUnits !== undefined) split.totalUnitsConsumed = Number(detectedTotalUnits);

    split.ocrExtractedData = {
      rawImageUrl,
      consumerNumber,
      detectedPeakUnits: detectedPeakUnits !== undefined ? Number(detectedPeakUnits) : undefined,
      detectedOffPeakUnits: detectedOffPeakUnits !== undefined ? Number(detectedOffPeakUnits) : undefined,
      tariffSlabApplied,
      ocrConfidence: Number(ocrConfidence),
    };

    await split.save();

    return res.status(200).json({
      success: true,
      message: 'OCR bill data extracted and applied successfully.',
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Pro-Rate & Set Allocations Among Tenants/Floors
 * POST /api/v1/utility/:id/calculate-allocations
 */
export const calculateAndSetAllocations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { tenantSubMeters = [] } = req.body; // Array of { tenantOrFloorName, subMeterUnitsConsumed, counterpartyId }

    if (!Array.isArray(tenantSubMeters) || tenantSubMeters.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one tenant sub-meter entry is required.' });
    }

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    // Sum of sub-meter units entered
    const totalSubMeterUnits = tenantSubMeters.reduce((sum: number, t: any) => sum + Number(t.subMeterUnitsConsumed || 0), 0);
    const denominatorUnits = totalSubMeterUnits > 0 ? totalSubMeterUnits : (split.totalUnitsConsumed || 1);

    const calculatedAllocations = tenantSubMeters.map((t: any) => {
      const units = Number(t.subMeterUnitsConsumed || 0);
      const ratio = totalSubMeterUnits > 0 ? units / denominatorUnits : 1 / tenantSubMeters.length;
      const share = Math.round(ratio * split.totalBillAmount);

      return {
        counterpartyId: t.counterpartyId ? new Types.ObjectId(t.counterpartyId) : undefined,
        tenantOrFloorName: t.tenantOrFloorName.trim(),
        subMeterUnitsConsumed: units,
        calculatedShare: share,
        isCleared: false,
      };
    });

    split.allocations = calculatedAllocations as any;
    split.isFullySettled = false;
    await split.save();

    return res.status(200).json({
      success: true,
      message: 'Sub-meter tenant allocations calculated successfully.',
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Add Single Manual Allocation to Split
 * POST /api/v1/utility/:id/allocations
 */
export const addManualAllocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { tenantOrFloorName, subMeterUnitsConsumed = 0, calculatedShare, counterpartyId } = req.body;

    if (!tenantOrFloorName || calculatedShare === undefined) {
      return res.status(400).json({ success: false, message: 'Tenant/floor name and calculated share amount are required.' });
    }

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    split.allocations.push({
      counterpartyId: counterpartyId ? new Types.ObjectId(counterpartyId) : undefined,
      tenantOrFloorName: tenantOrFloorName.trim(),
      subMeterUnitsConsumed: Number(subMeterUnitsConsumed),
      calculatedShare: Number(calculatedShare),
      isCleared: false,
    } as any);

    split.isFullySettled = false;
    await split.save();

    return res.status(201).json({
      success: true,
      message: 'Manual allocation added successfully.',
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Mark Tenant Allocation Cleared / Paid
 * PATCH /api/v1/utility/:id/allocations/:allocationId/clear
 */
export const markAllocationCleared = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id, allocationId } = req.params;

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    const allocation = split.allocations.find((a: any) => a._id?.toString() === allocationId || a.id === allocationId);
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation entry not found.' });
    }

    allocation.isCleared = true;
    allocation.clearedAt = new Date();

    // Check if all allocations are now cleared
    const allCleared = split.allocations.every((a: any) => a.isCleared);
    if (allCleared) {
      split.isFullySettled = true;
    }

    await split.save();

    return res.status(200).json({
      success: true,
      message: `Utility share for '${allocation.tenantOrFloorName}' marked as cleared.`,
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Paginated Utility Splits (with Filters)
 * GET /api/v1/utility
 */
export const getUtilitySplits = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { utilityType, billingMonth, providerName, isFullySettled, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (utilityType && typeof utilityType === 'string') {
      filter.utilityType = utilityType.toUpperCase();
    }

    if (billingMonth && typeof billingMonth === 'string') {
      filter.billingMonth = billingMonth.trim();
    }

    if (providerName && typeof providerName === 'string') {
      filter.providerName = new RegExp(providerName.trim(), 'i');
    }

    if (isFullySettled !== undefined) {
      filter.isFullySettled = isFullySettled === 'true';
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [splits, totalCount] = await Promise.all([
      UtilitySplit.find(filter)
        .populate('allocations.counterpartyId', 'name phone relationType')
        .sort({ billingMonth: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      UtilitySplit.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: splits,
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
 * 7. Get Detailed Utility Split Breakdown by ID
 * GET /api/v1/utility/:id
 */
export const getUtilitySplitById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const split = await UtilitySplit.findOne({ _id: id, profileId }).populate(
      'allocations.counterpartyId',
      'name phone relationType currentBalance'
    );

    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    return res.status(200).json({
      success: true,
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Update Bill Metadata & Auto-Recalculate Allocations
 * PUT /api/v1/utility/:id
 */
export const updateUtilitySplit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { totalBillAmount, totalUnitsConsumed, billDueDate, providerName, billingMonth } = req.body;

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    if (totalBillAmount !== undefined) split.totalBillAmount = Number(totalBillAmount);
    if (totalUnitsConsumed !== undefined) split.totalUnitsConsumed = Number(totalUnitsConsumed);
    if (billDueDate) split.billDueDate = new Date(billDueDate);
    if (providerName) split.providerName = providerName.trim();
    if (billingMonth) split.billingMonth = billingMonth.trim();

    // Auto recalculate allocation share ratios if total bill amount changed and allocations exist
    if (totalBillAmount !== undefined && split.allocations.length > 0) {
      const totalUnits = split.allocations.reduce((sum: number, a: any) => sum + (a.subMeterUnitsConsumed || 0), 0);

      split.allocations.forEach((a: any) => {
        const ratio = totalUnits > 0 ? a.subMeterUnitsConsumed / totalUnits : 1 / split.allocations.length;
        a.calculatedShare = Math.round(ratio * split.totalBillAmount);
      });
    }

    await split.save();

    return res.status(200).json({
      success: true,
      message: 'Utility split updated successfully.',
      data: split,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Delete Utility Split Record
 * DELETE /api/v1/utility/:id
 */
export const deleteUtilitySplit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const split = await UtilitySplit.findOne({ _id: id, profileId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    await split.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Utility split record deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. Generate Formatted WhatsApp Receipt Card / Summary Text
 * GET /api/v1/utility/:id/allocations/:allocationId/summary
 */
export const generateSplitShareSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id, allocationId } = req.params;

    const split = await UtilitySplit.findOne({ _id: id, profileId }).populate('allocations.counterpartyId', 'name phone');
    if (!split) {
      return res.status(404).json({ success: false, message: 'Utility split record not found.' });
    }

    const allocation = split.allocations.find((a: any) => a._id?.toString() === allocationId || a.id === allocationId);
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation entry not found.' });
    }

    const dueDateFormatted = new Date(split.billDueDate).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const formattedShare = allocation.calculatedShare.toLocaleString('en-PK');

    const whatsappSummaryCard =
      `UTILITY BILL SHARE RECEIPT\n` +
      `---------------------------\n` +
      `Provider: ${split.providerName} (${split.utilityType})\n` +
      `Billing Month: ${split.billingMonth}\n` +
      `Tenant/Floor: ${allocation.tenantOrFloorName}\n` +
      `Sub-Meter Units: ${allocation.subMeterUnitsConsumed} units\n` +
      `Total Payable Share: PKR ${formattedShare}\n` +
      `Due Date: ${dueDateFormatted}\n` +
      `Status: ${allocation.isCleared ? 'CLEARED' : 'PENDING'}\n` +
      `---------------------------\n` +
      `Generated via Khata-AI`;

    return res.status(200).json({
      success: true,
      data: {
        splitId: split._id,
        allocationId: allocation._id,
        tenantOrFloorName: allocation.tenantOrFloorName,
        calculatedShare: allocation.calculatedShare,
        isCleared: allocation.isCleared,
        whatsappSummaryCard,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
