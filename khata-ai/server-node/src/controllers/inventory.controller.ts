import { Request, Response } from 'express';
import { InventoryItem } from '../models/InventoryItem';
import { dispatchPushNotification } from '../services/notificationDispatcher.service';
import { JevRestockEngine } from '../services/jevRestock.service';

/**
 * 1. Create a New Inventory Item
 * POST /api/v1/inventory
 */
export const createInventoryItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      sku,
      barcode,
      itemName,
      category = 'General',
      stockOnHand = 0,
      lowStockThreshold = 5,
      wholesaleCost,
      retailPrice,
      unitOfMeasure = 'PCS',
      supplierCounterpartyId,
      isActive = true,
    } = req.body;

    if (!itemName) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    if (wholesaleCost === undefined || wholesaleCost === null) {
      return res.status(400).json({ success: false, message: 'Wholesale cost is required.' });
    }

    if (retailPrice === undefined || retailPrice === null) {
      return res.status(400).json({ success: false, message: 'Retail price is required.' });
    }

    const validUnits = ['PCS', 'KG', 'LITER', 'PACK', 'BOX'];
    if (!validUnits.includes(unitOfMeasure)) {
      return res.status(400).json({
        success: false,
        message: `Invalid unit of measure. Allowed values: ${validUnits.join(', ')}`,
      });
    }

    // Generate SKU if omitted
    const itemSku = sku && sku.trim() ? sku.trim() : `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check duplicate SKU for this profile
    const existingItem = await InventoryItem.findOne({ profileId, sku: itemSku });
    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: `An inventory item with SKU '${itemSku}' already exists.`,
      });
    }

    const item = await InventoryItem.create({
      profileId,
      sku: itemSku,
      barcode: barcode ? barcode.trim() : undefined,
      itemName: itemName.trim(),
      category: category.trim(),
      stockOnHand: Number(stockOnHand) || 0,
      lowStockThreshold: Number(lowStockThreshold) >= 0 ? Number(lowStockThreshold) : 5,
      wholesaleCost: Number(wholesaleCost),
      retailPrice: Number(retailPrice),
      unitOfMeasure,
      supplierCounterpartyId: supplierCounterpartyId || undefined,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Inventory item created successfully.',
      data: item,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Inventory Items with Filters & Search
 * GET /api/v1/inventory
 */
export const getInventoryItems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { category, search, isLowStock, isActive, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (category && typeof category === 'string') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { itemName: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
        { category: searchRegex },
      ];
    }

    if (isLowStock === 'true') {
      filter.$expr = { $lte: ['$stockOnHand', '$lowStockThreshold'] };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, totalCount] = await Promise.all([
      InventoryItem.find(filter)
        .populate('supplierCounterpartyId', 'name phone counterpartyType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      InventoryItem.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
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
 * 3. Get Single Inventory Item Details by ID
 * GET /api/v1/inventory/:id
 */
export const getInventoryItemById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const item = await InventoryItem.findOne({ _id: id, profileId })
      .populate('supplierCounterpartyId', 'name phone email counterpartyType');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const isLowStock = item.stockOnHand <= item.lowStockThreshold;

    return res.status(200).json({
      success: true,
      data: {
        ...item.toObject(),
        isLowStock,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Inventory Item Details
 * PUT /api/v1/inventory/:id
 */
export const updateInventoryItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      sku,
      barcode,
      itemName,
      category,
      lowStockThreshold,
      wholesaleCost,
      retailPrice,
      unitOfMeasure,
      supplierCounterpartyId,
      isActive,
    } = req.body;

    const item = await InventoryItem.findOne({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    if (sku && sku.trim() !== item.sku) {
      const existingSku = await InventoryItem.findOne({ profileId, sku: sku.trim() });
      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: `SKU '${sku.trim()}' is already assigned to another item.`,
        });
      }
      item.sku = sku.trim();
    }

    if (barcode !== undefined) item.barcode = barcode ? barcode.trim() : undefined;
    if (itemName !== undefined) item.itemName = itemName.trim();
    if (category !== undefined) item.category = category.trim();
    if (lowStockThreshold !== undefined) item.lowStockThreshold = Number(lowStockThreshold);
    if (wholesaleCost !== undefined) item.wholesaleCost = Number(wholesaleCost);
    if (retailPrice !== undefined) item.retailPrice = Number(retailPrice);
    if (unitOfMeasure !== undefined) {
      const validUnits = ['PCS', 'KG', 'LITER', 'PACK', 'BOX'];
      if (validUnits.includes(unitOfMeasure)) {
        item.unitOfMeasure = unitOfMeasure;
      }
    }
    if (supplierCounterpartyId !== undefined) item.supplierCounterpartyId = supplierCounterpartyId || undefined;
    if (isActive !== undefined) item.isActive = Boolean(isActive);

    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully.',
      data: item,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Adjust Stock Level (Restock, Deduction, or Direct Set)
 * PATCH /api/v1/inventory/:id/adjust-stock
 */
export const adjustStockLevel = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { adjustmentType, quantity, notes } = req.body;

    if (!adjustmentType || !['RESTOCK', 'DEDUCTION', 'SET_EXACT'].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment type. Must be RESTOCK, DEDUCTION, or SET_EXACT.',
      });
    }

    if (quantity === undefined || isNaN(Number(quantity))) {
      return res.status(400).json({ success: false, message: 'Valid adjustment quantity is required.' });
    }

    const item = await InventoryItem.findOne({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const qty = Number(quantity);
    let previousStock = item.stockOnHand;

    if (adjustmentType === 'RESTOCK') {
      item.stockOnHand += qty;
    } else if (adjustmentType === 'DEDUCTION') {
      item.stockOnHand = Math.max(0, item.stockOnHand - qty);
    } else if (adjustmentType === 'SET_EXACT') {
      item.stockOnHand = Math.max(0, qty);
    }

    await item.save();

    const isLowStock = item.stockOnHand <= item.lowStockThreshold;

    if (isLowStock && profileId) {
      dispatchPushNotification(profileId.toString(), {
        id: `stock-${item._id}-${Date.now()}`,
        category: 'STOCK_ALERT',
        priority: 'WARNING',
        titleUrdu: 'کم اسٹاک کی اطلاع',
        titleEnglish: 'Low Stock Alert',
        messageUrdu: `آئٹم "${item.itemName}" کا اسٹاک کم ہے (${item.stockOnHand} ${item.unitOfMeasure} باقی)۔`,
        messageEnglish: `Item "${item.itemName}" has low stock (${item.stockOnHand} ${item.unitOfMeasure} remaining).`,
        timestamp: new Date().toISOString(),
        actionLabel: 'خریداری آرڈر',
        actionRoute: 'WholesalePoModal',
        durationMs: 5500,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Stock level updated (${adjustmentType}).`,
      data: {
        item,
        previousStock,
        newStock: item.stockOnHand,
        isLowStock,
        notes,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Low-Stock Alerts for Active Inventory Items
 * GET /api/v1/inventory/low-stock-alerts
 */
export const getLowStockAlerts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;

    const lowStockItems = await InventoryItem.find({
      profileId,
      isActive: true,
      $expr: { $lte: ['$stockOnHand', '$lowStockThreshold'] },
    })
      .populate('supplierCounterpartyId', 'name phone counterpartyType')
      .sort({ stockOnHand: 1 });

    return res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Delete / Soft-Delete Inventory Item
 * DELETE /api/v1/inventory/:id
 */
export const deleteInventoryItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { hardDelete = 'false' } = req.query;

    const item = await InventoryItem.findOne({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    if (hardDelete === 'true') {
      await item.deleteOne();
      return res.status(200).json({
        success: true,
        message: 'Inventory item permanently deleted.',
      });
    } else {
      item.isActive = false;
      await item.save();
      return res.status(200).json({
        success: true,
        message: 'Inventory item marked inactive (soft deleted).',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Get Smart Reorder & Depletion Predictions (Jev Engine)
 * GET /api/v1/inventory/restock-predictions
 */
export const getRestockPredictions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    const predictions = await JevRestockEngine.evaluateStoreInventory(profileId);
    return res.status(200).json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Dispatch Stockout Warning Alert Banners
 * POST /api/v1/inventory/dispatch-stockout-alerts
 */
export const dispatchStockoutAlerts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }
    await JevRestockEngine.checkAndDispatchStockoutAlerts(profileId);
    return res.status(200).json({
      success: true,
      message: 'Stockout alert evaluated and dispatched if critical.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

