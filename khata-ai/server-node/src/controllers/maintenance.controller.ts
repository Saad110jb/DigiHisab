import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DomesticMaintenanceLog, MaintenanceType } from '../models/DomesticMaintenanceLog';
import { LedgerEntry } from '../models/LedgerEntry';
import { HouseholdAsset } from '../models/HouseholdAsset';

/**
 * 1. Log a Domestic Repair / Maintenance Job
 * POST /api/v1/maintenance
 */
export const createMaintenanceLog = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const {
      maintenanceType,
      description,
      cost,
      assetId,
      technicianCounterpartyId,
      serviceDate,
      receiptImageUrl,
      nextServiceReminderDate,
      warrantyPeriodDays = 0,
      notes,
      syncToLedger = true,
      paymentMode = 'CASH',
    } = req.body;

    if (!maintenanceType || !description || cost === undefined || isNaN(Number(cost)) || Number(cost) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Maintenance type, description, and valid repair cost (PKR) are required.',
      });
    }

    const validTypes: MaintenanceType[] = ['PLUMBING', 'ELECTRICAL', 'SOLAR_PANEL', 'HVAC_AC', 'CARPENTRY', 'GENERAL_REPAIR'];
    if (!validTypes.includes(maintenanceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid maintenanceType. Allowed values: ${validTypes.join(', ')}`,
      });
    }

    const numericCost = Number(cost);

    const log = await DomesticMaintenanceLog.create({
      profileId,
      assetId: assetId ? new Types.ObjectId(assetId) : undefined,
      technicianCounterpartyId: technicianCounterpartyId ? new Types.ObjectId(technicianCounterpartyId) : undefined,
      maintenanceType,
      description: description.trim(),
      cost: numericCost,
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      receiptImageUrl,
      nextServiceReminderDate: nextServiceReminderDate ? new Date(nextServiceReminderDate) : undefined,
      warrantyPeriodDays: Number(warrantyPeriodDays),
      notes: notes ? notes.trim() : undefined,
    });

    // Auto-emit CASH_OUT entry in Ledger if requested
    if (syncToLedger && numericCost > 0) {
      await LedgerEntry.create({
        profileId,
        counterpartyId: technicianCounterpartyId ? new Types.ObjectId(technicianCounterpartyId) : undefined,
        subAccountId,
        entryType: 'CASH_OUT',
        amount: numericCost,
        paymentMode,
        category: 'Domestic Maintenance',
        description: `Domestic Repair (${maintenanceType}): ${description.trim()}`,
        inputMode: 'MANUAL',
        isSettled: true,
        settledAt: new Date(),
      });
    }

    // Sync nextServiceDueDate to HouseholdAsset if linked
    if (assetId && nextServiceReminderDate) {
      await HouseholdAsset.updateOne(
        { _id: assetId, profileId },
        { nextServiceDueDate: new Date(nextServiceReminderDate) }
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Maintenance repair log recorded successfully.',
      data: log,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Repair / Maintenance Logs with Filters
 * GET /api/v1/maintenance
 */
export const getMaintenanceLogs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      maintenanceType,
      assetId,
      technicianCounterpartyId,
      startDate,
      endDate,
      minCost,
      maxCost,
      page = '1',
      limit = '20',
    } = req.query;

    const filter: any = { profileId };

    if (maintenanceType && typeof maintenanceType === 'string') {
      filter.maintenanceType = maintenanceType.toUpperCase();
    }

    if (assetId && typeof assetId === 'string') {
      filter.assetId = new Types.ObjectId(assetId);
    }

    if (technicianCounterpartyId && typeof technicianCounterpartyId === 'string') {
      filter.technicianCounterpartyId = new Types.ObjectId(technicianCounterpartyId);
    }

    if (startDate || endDate) {
      filter.serviceDate = {};
      if (startDate) filter.serviceDate.$gte = new Date(startDate as string);
      if (endDate) filter.serviceDate.$lte = new Date(endDate as string);
    }

    if (minCost !== undefined || maxCost !== undefined) {
      filter.cost = {};
      if (minCost) filter.cost.$gte = Number(minCost);
      if (maxCost) filter.cost.$lte = Number(maxCost);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalCount] = await Promise.all([
      DomesticMaintenanceLog.find(filter)
        .populate('assetId', 'assetName category serialNumber')
        .populate('technicianCounterpartyId', 'name phone relationType')
        .sort({ serviceDate: -1 })
        .skip(skip)
        .limit(limitNum),
      DomesticMaintenanceLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
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
 * 3. Get Single Maintenance Log Details by ID
 * GET /api/v1/maintenance/:id
 */
export const getMaintenanceLogById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const log = await DomesticMaintenanceLog.findOne({ _id: id, profileId })
      .populate('assetId', 'assetName category purchasePrice warrantyExpiryDate')
      .populate('technicianCounterpartyId', 'name phone alternatePhone email notes');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    }

    return res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Maintenance Log Record
 * PUT /api/v1/maintenance/:id
 */
export const updateMaintenanceLog = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      maintenanceType,
      description,
      cost,
      serviceDate,
      nextServiceReminderDate,
      warrantyPeriodDays,
      notes,
      receiptImageUrl,
      technicianCounterpartyId,
    } = req.body;

    const log = await DomesticMaintenanceLog.findOne({ _id: id, profileId });
    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    }

    if (maintenanceType) {
      const validTypes: MaintenanceType[] = ['PLUMBING', 'ELECTRICAL', 'SOLAR_PANEL', 'HVAC_AC', 'CARPENTRY', 'GENERAL_REPAIR'];
      if (validTypes.includes(maintenanceType)) log.maintenanceType = maintenanceType;
    }
    if (description) log.description = description.trim();
    if (cost !== undefined) log.cost = Number(cost);
    if (serviceDate) log.serviceDate = new Date(serviceDate);
    if (nextServiceReminderDate !== undefined) log.nextServiceReminderDate = nextServiceReminderDate ? new Date(nextServiceReminderDate) : undefined;
    if (warrantyPeriodDays !== undefined) log.warrantyPeriodDays = Number(warrantyPeriodDays);
    if (notes !== undefined) log.notes = notes ? notes.trim() : undefined;
    if (receiptImageUrl !== undefined) log.receiptImageUrl = receiptImageUrl;
    if (technicianCounterpartyId !== undefined) log.technicianCounterpartyId = technicianCounterpartyId ? new Types.ObjectId(technicianCounterpartyId) : undefined;

    await log.save();

    return res.status(200).json({
      success: true,
      message: 'Maintenance log updated successfully.',
      data: log,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Delete Maintenance Record
 * DELETE /api/v1/maintenance/:id
 */
export const deleteMaintenanceLog = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const log = await DomesticMaintenanceLog.findOne({ _id: id, profileId });
    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    }

    await log.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Maintenance log deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Scheduled Service Reminders Due Soon (Next 7 to 30 Days)
 * GET /api/v1/maintenance/upcoming-reminders
 */
export const getUpcomingServiceReminders = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { daysAhead = '30' } = req.query;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + Math.max(1, parseInt(daysAhead as string, 10) || 30));

    const reminders = await DomesticMaintenanceLog.find({
      profileId,
      nextServiceReminderDate: {
        $gte: now,
        $lte: futureDate,
      },
    })
      .populate('assetId', 'assetName category serialNumber')
      .populate('technicianCounterpartyId', 'name phone')
      .sort({ nextServiceReminderDate: 1 });

    return res.status(200).json({
      success: true,
      data: reminders,
      count: reminders.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Get Maintenance Cost Analytics & Money-Pit Detector
 * GET /api/v1/maintenance/analytics
 */
export const getMaintenanceCostAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { startDate, endDate, groupBy = 'maintenanceType' } = req.query;

    const matchStage: any = { profileId: new Types.ObjectId(profileId) };
    if (startDate || endDate) {
      matchStage.serviceDate = {};
      if (startDate) matchStage.serviceDate.$gte = new Date(startDate as string);
      if (endDate) matchStage.serviceDate.$lte = new Date(endDate as string);
    }

    const groupField = groupBy === 'assetId' ? '$assetId' : '$maintenanceType';

    const analytics = await DomesticMaintenanceLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupField,
          totalExpenditure: { $sum: '$cost' },
          avgRepairCost: { $avg: '$cost' },
          jobCount: { $sum: 1 },
        },
      },
      { $sort: { totalExpenditure: -1 } },
    ]);

    const totalOverallCost = analytics.reduce((sum, item) => sum + item.totalExpenditure, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalOverallCost,
        breakdown: analytics,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
