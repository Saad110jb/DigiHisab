import { Request, Response } from 'express';
import { HouseholdAsset } from '../models/HouseholdAsset';
import { DomesticMaintenanceLog } from '../models/DomesticMaintenanceLog';

/**
 * 1. Register a New Household Asset
 * POST /api/v1/assets
 */
export const createHouseholdAsset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      assetName,
      category = 'APPLIANCE',
      purchaseDate,
      purchasePrice,
      warrantyExpiryDate,
      vendorName,
      serialNumber,
      receiptImageUrl,
      nextServiceDueDate,
      notes,
    } = req.body;

    if (!assetName) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }

    const validCategories = ['ELECTRONICS', 'APPLIANCE', 'FURNITURE', 'VEHICLE', 'SOLAR_SYSTEM', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed values: ${validCategories.join(', ')}`,
      });
    }

    const asset = await HouseholdAsset.create({
      profileId,
      assetName: assetName.trim(),
      category,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : undefined,
      warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined,
      vendorName: vendorName ? vendorName.trim() : undefined,
      serialNumber: serialNumber ? serialNumber.trim() : undefined,
      receiptImageUrl,
      nextServiceDueDate: nextServiceDueDate ? new Date(nextServiceDueDate) : undefined,
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Household asset registered successfully.',
      data: asset,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Household Assets with Filters & Search
 * GET /api/v1/assets
 */
export const getHouseholdAssets = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { category, search, hasActiveWarranty, serviceDueSoon, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (category && typeof category === 'string') {
      filter.category = category.toUpperCase();
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { assetName: searchRegex },
        { vendorName: searchRegex },
        { serialNumber: searchRegex },
      ];
    }

    const now = new Date();

    if (hasActiveWarranty !== undefined) {
      if (hasActiveWarranty === 'true') {
        filter.warrantyExpiryDate = { $gte: now };
      } else {
        filter.$or = [
          { warrantyExpiryDate: { $lt: now } },
          { warrantyExpiryDate: { $exists: false } },
        ];
      }
    }

    if (serviceDueSoon === 'true') {
      const thirtyDays = new Date();
      thirtyDays.setDate(now.getDate() + 30);
      filter.nextServiceDueDate = { $gte: now, $lte: thirtyDays };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [assets, totalCount] = await Promise.all([
      HouseholdAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      HouseholdAsset.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: assets,
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
 * 3. Get Single Household Asset Details by ID with Linked Repairs
 * GET /api/v1/assets/:id
 */
export const getHouseholdAssetById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const asset = await HouseholdAsset.findOne({ _id: id, profileId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Household asset not found.' });
    }

    // Fetch linked maintenance logs
    const maintenanceLogs = await DomesticMaintenanceLog.find({ assetId: asset._id, profileId })
      .populate('technicianCounterpartyId', 'name phone')
      .sort({ serviceDate: -1 });

    const totalRepairCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);

    return res.status(200).json({
      success: true,
      data: {
        asset,
        totalRepairCost,
        maintenanceLogs,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Household Asset Details
 * PUT /api/v1/assets/:id
 */
export const updateHouseholdAsset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      assetName,
      category,
      purchaseDate,
      purchasePrice,
      warrantyExpiryDate,
      vendorName,
      serialNumber,
      receiptImageUrl,
      nextServiceDueDate,
      notes,
    } = req.body;

    const asset = await HouseholdAsset.findOne({ _id: id, profileId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Household asset not found.' });
    }

    if (assetName) asset.assetName = assetName.trim();
    if (category) {
      const validCategories = ['ELECTRONICS', 'APPLIANCE', 'FURNITURE', 'VEHICLE', 'SOLAR_SYSTEM', 'OTHER'];
      if (validCategories.includes(category)) asset.category = category;
    }
    if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;
    if (purchasePrice !== undefined) asset.purchasePrice = purchasePrice ? Number(purchasePrice) : undefined;
    if (warrantyExpiryDate !== undefined) asset.warrantyExpiryDate = warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined;
    if (vendorName !== undefined) asset.vendorName = vendorName ? vendorName.trim() : undefined;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber ? serialNumber.trim() : undefined;
    if (receiptImageUrl !== undefined) asset.receiptImageUrl = receiptImageUrl;
    if (nextServiceDueDate !== undefined) asset.nextServiceDueDate = nextServiceDueDate ? new Date(nextServiceDueDate) : undefined;
    if (notes !== undefined) asset.notes = notes ? notes.trim() : undefined;

    await asset.save();

    return res.status(200).json({
      success: true,
      message: 'Household asset updated successfully.',
      data: asset,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Delete Household Asset Record
 * DELETE /api/v1/assets/:id
 */
export const deleteHouseholdAsset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const asset = await HouseholdAsset.findOne({ _id: id, profileId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Household asset not found.' });
    }

    await asset.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Household asset deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Assets with Expiring Warranties (Next 30 to 90 Days)
 * GET /api/v1/assets/expiring-warranties
 */
export const getExpiringWarranties = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { daysAhead = '60' } = req.query;

    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + Math.max(1, parseInt(daysAhead as string, 10) || 60));

    const assets = await HouseholdAsset.find({
      profileId,
      warrantyExpiryDate: {
        $gte: now,
        $lte: targetDate,
      },
    }).sort({ warrantyExpiryDate: 1 });

    return res.status(200).json({
      success: true,
      data: assets,
      count: assets.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Get Asset Portfolio Summary Statistics & Valuation
 * GET /api/v1/assets/stats
 */
export const getAssetSummaryStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const now = new Date();

    const assets = await HouseholdAsset.find({ profileId });

    let totalValuation = 0;
    let activeWarrantiesCount = 0;
    let upcomingServiceCount = 0;

    assets.forEach((asset) => {
      if (asset.purchasePrice) {
        totalValuation += asset.purchasePrice;
      }

      if (asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) >= now) {
        activeWarrantiesCount += 1;
      }

      if (asset.nextServiceDueDate && new Date(asset.nextServiceDueDate) >= now) {
        upcomingServiceCount += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalAssetsCount: assets.length,
        totalValuation,
        activeWarrantiesCount,
        upcomingServiceCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
