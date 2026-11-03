import { Request, Response } from 'express';
import { StockMovement, MovementType } from '../models/StockMovement';
import { InventoryItem } from '../models/InventoryItem';

/**
 * 1. Log a New Stock Movement & Synchronize Inventory Stock
 * POST /api/v1/stock-movements
 */
export const createStockMovement = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      inventoryItemId,
      movementType,
      quantityChange,
      unitCost,
      referenceId,
      notes,
    } = req.body;

    if (!inventoryItemId || !movementType || quantityChange === undefined) {
      return res.status(400).json({
        success: false,
        message: 'inventoryItemId, movementType, and quantityChange are required.',
      });
    }

    const validTypes: MovementType[] = ['RESTOCK', 'SALE', 'DAMAGE_SPOILAGE', 'SUPPLIER_RETURN', 'ADJUSTMENT'];
    if (!validTypes.includes(movementType as MovementType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid movementType. Allowed values: ${validTypes.join(', ')}`,
      });
    }

    const item = await InventoryItem.findOne({ _id: inventoryItemId, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const change = Number(quantityChange);
    const previousStock = item.stockOnHand;
    let newStock = previousStock;

    if (movementType === 'RESTOCK' || movementType === 'ADJUSTMENT') {
      newStock += change;
    } else {
      // SALE, DAMAGE_SPOILAGE, SUPPLIER_RETURN reduce stock unless change is already negative
      const qtyToDeduct = change > 0 ? change : Math.abs(change);
      newStock = Math.max(0, previousStock - qtyToDeduct);
    }

    item.stockOnHand = newStock;
    await item.save();

    const movement = await StockMovement.create({
      profileId,
      inventoryItemId,
      movementType: movementType as MovementType,
      quantityChange: change,
      previousStock,
      newStock,
      unitCost: unitCost !== undefined ? Number(unitCost) : item.wholesaleCost,
      referenceId: referenceId || undefined,
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: `Stock movement recorded (${movementType}).`,
      data: movement,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Stock Movement Audit Trail
 * GET /api/v1/stock-movements
 */
export const getStockMovements = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { inventoryItemId, movementType, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (inventoryItemId && typeof inventoryItemId === 'string') {
      filter.inventoryItemId = inventoryItemId;
    }

    if (movementType && typeof movementType === 'string') {
      filter.movementType = movementType.toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [movements, totalCount] = await Promise.all([
      StockMovement.find(filter)
        .populate('inventoryItemId', 'itemName sku unitOfMeasure')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      StockMovement.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: movements,
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
 * 3. Get Single Stock Movement by ID
 * GET /api/v1/stock-movements/:id
 */
export const getStockMovementById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const movement = await StockMovement.findOne({ _id: id, profileId })
      .populate('inventoryItemId', 'itemName sku category wholesaleCost retailPrice');

    if (!movement) {
      return res.status(404).json({ success: false, message: 'Stock movement record not found.' });
    }

    return res.status(200).json({
      success: true,
      data: movement,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
