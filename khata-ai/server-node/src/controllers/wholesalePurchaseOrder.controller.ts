import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { WholesalePurchaseOrder, POStatus } from '../models/WholesalePurchaseOrder';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';

/**
 * 1. Create a Wholesale Purchase Order (PO)
 * POST /api/v1/purchase-orders
 */
export const createPurchaseOrder = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      supplierCounterpartyId,
      poNumber,
      orderDate,
      expectedDeliveryDate,
      items = [],
      discount = 0,
      tax = 0,
      notes,
    } = req.body;

    let validSupplierId: Types.ObjectId | null = null;
    if (supplierCounterpartyId && Types.ObjectId.isValid(supplierCounterpartyId)) {
      validSupplierId = new Types.ObjectId(supplierCounterpartyId);
    } else {
      const supName = req.body.supplierName || req.body.distributorName || 'Akbari Mandi Wholesaler';
      let sup = await Counterparty.findOne({ profileId, name: supName, relationType: 'SUPPLIER' });
      if (!sup) {
        sup = await Counterparty.create({
          profileId,
          name: supName,
          phone: req.body.supplierPhone || '03001234567',
          relationType: 'SUPPLIER',
          currentBalance: 0,
        });
      }
      validSupplierId = sup._id;
    }

    // Auto-generate PO number if omitted
    const generatedPoNumber = poNumber && poNumber.trim()
      ? poNumber.trim()
      : `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const existingPo = await WholesalePurchaseOrder.findOne({ profileId, poNumber: generatedPoNumber });
    if (existingPo) {
      return res.status(409).json({
        success: false,
        message: `Purchase order '${generatedPoNumber}' already exists.`,
      });
    }

    let subtotal = 0;
    const formattedItems = items.map((item: any) => {
      const qty = Math.max(1, Number(item.quantityOrdered) || 1);
      const unitCost = Math.max(0, Number(item.unitCost) || 0);
      const totalCost = qty * unitCost;
      subtotal += totalCost;

      const validInventoryItemId = item.inventoryItemId && Types.ObjectId.isValid(item.inventoryItemId)
        ? new Types.ObjectId(item.inventoryItemId)
        : undefined;

      return {
        inventoryItemId: validInventoryItemId,
        itemName: item.itemName ? item.itemName.trim() : 'Inventory Item',
        quantityOrdered: qty,
        unitCost,
        totalCost,
      };
    });

    const disc = Math.max(0, Number(discount) || 0);
    const tx = Math.max(0, Number(tax) || 0);
    const grandTotal = Math.max(0, subtotal - disc + tx);

    const po = await WholesalePurchaseOrder.create({
      profileId,
      supplierCounterpartyId: validSupplierId,
      poNumber: generatedPoNumber,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      status: 'DRAFT',
      items: formattedItems,
      subtotal,
      discount: disc,
      tax: tx,
      grandTotal,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      notes: notes ? notes.trim() : undefined,
    });

    try {
      await AuditLog.create({
        profileId,
        authorizedById: profileId && Types.ObjectId.isValid(profileId) ? new Types.ObjectId(profileId) : new Types.ObjectId(),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType: 'WHOLESALE_PO_CREATED',
        reason: `Wholesale purchase order ${generatedPoNumber} created for Rs. ${grandTotal.toLocaleString()}`,
        details: { poNumber: generatedPoNumber, grandTotal, itemCount: formattedItems.length },
      });
    } catch (auditErr) {
      // Non-blocking audit log creation
    }

    return res.status(201).json({
      success: true,
      message: 'Wholesale purchase order created successfully.',
      data: po,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Paginated Wholesale Purchase Orders
 * GET /api/v1/purchase-orders
 */
export const getPurchaseOrders = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { supplierCounterpartyId, status, paymentStatus, page = '1', limit = '20' } = req.query;

    const filter: any = { profileId };

    if (supplierCounterpartyId && typeof supplierCounterpartyId === 'string') {
      filter.supplierCounterpartyId = supplierCounterpartyId;
    }

    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    if (paymentStatus && typeof paymentStatus === 'string') {
      filter.paymentStatus = paymentStatus.toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      WholesalePurchaseOrder.find(filter)
        .populate('supplierCounterpartyId', 'name phone counterpartyType')
        .populate('items.inventoryItemId', 'itemName sku stockOnHand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WholesalePurchaseOrder.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
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
 * 3. Get Single Purchase Order Details by ID
 * GET /api/v1/purchase-orders/:id
 */
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const po = await WholesalePurchaseOrder.findOne({ _id: id, profileId })
      .populate('supplierCounterpartyId', 'name phone email counterpartyType creditLimit')
      .populate('items.inventoryItemId', 'itemName sku wholesaleCost stockOnHand');

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    return res.status(200).json({
      success: true,
      data: po,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Purchase Order Details & Status
 * PUT /api/v1/purchase-orders/:id
 */
export const updatePurchaseOrder = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      status,
      items,
      discount,
      tax,
      amountPaid,
      paymentStatus,
      expectedDeliveryDate,
      notes,
    } = req.body;

    const po = await WholesalePurchaseOrder.findOne({ _id: id, profileId });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (status && ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].includes(status)) {
      po.status = status as POStatus;
    }

    if (expectedDeliveryDate !== undefined) {
      po.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined;
    }

    if (notes !== undefined) po.notes = notes ? notes.trim() : undefined;

    if (items && Array.isArray(items)) {
      let subtotal = 0;
      po.items = items.map((item: any) => {
        const qty = Math.max(1, Number(item.quantityOrdered) || 1);
        const unitCost = Math.max(0, Number(item.unitCost) || 0);
        const totalCost = qty * unitCost;
        subtotal += totalCost;

        return {
          inventoryItemId: item.inventoryItemId || undefined,
          itemName: item.itemName ? item.itemName.trim() : 'Inventory Item',
          quantityOrdered: qty,
          unitCost,
          totalCost,
        };
      });
      po.subtotal = subtotal;
    }

    if (discount !== undefined) po.discount = Math.max(0, Number(discount));
    if (tax !== undefined) po.tax = Math.max(0, Number(tax));
    po.grandTotal = Math.max(0, po.subtotal - po.discount + po.tax);

    if (amountPaid !== undefined) {
      po.amountPaid = Number(amountPaid);
      if (po.amountPaid >= po.grandTotal) {
        po.paymentStatus = 'PAID';
      } else if (po.amountPaid > 0) {
        po.paymentStatus = 'PARTIAL';
      } else {
        po.paymentStatus = 'UNPAID';
      }
    }

    if (paymentStatus && ['UNPAID', 'PARTIAL', 'PAID'].includes(paymentStatus)) {
      po.paymentStatus = paymentStatus;
    }

    await po.save();

    return res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully.',
      data: po,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Receive Purchase Order & Auto-Restock Inventory
 * PATCH /api/v1/purchase-orders/:id/receive
 */
export const receivePurchaseOrder = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const po = await WholesalePurchaseOrder.findOne({ _id: id, profileId });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (po.status === 'RECEIVED') {
      return res.status(400).json({ success: false, message: 'Purchase order has already been marked RECEIVED.' });
    }

    po.status = 'RECEIVED';
    po.receivedDate = new Date();
    await po.save();

    // Auto log credit invoice to supplier counterparty balance (Maine Dene Hain)
    const unpaidAmount = Math.max(0, po.grandTotal - po.amountPaid);
    if (unpaidAmount > 0 && po.supplierCounterpartyId) {
      const supplier = await Counterparty.findOne({ _id: po.supplierCounterpartyId, profileId });
      if (supplier) {
        supplier.currentBalance -= unpaidAmount; // negative balance indicates payable owed to supplier
        await supplier.save();

        await LedgerEntry.create({
          profileId,
          counterpartyId: supplier._id,
          entryType: 'PAYABLE',
          amount: unpaidAmount,
          paymentMode: 'CASH',
          category: 'Wholesale Purchase',
          description: `Credit invoice received via PO #${po.poNumber}`,
          dueDate: po.expectedDeliveryDate || undefined,
          isSettled: false,
        });
      }
    }

    // Auto restock linked items
    const restockLogs: any[] = [];
    for (const item of po.items) {
      if (item.inventoryItemId) {
        const invItem = await InventoryItem.findOne({ _id: item.inventoryItemId, profileId });
        if (invItem) {
          const previousStock = invItem.stockOnHand;
          invItem.stockOnHand += item.quantityOrdered;
          await invItem.save();

          const movement = await StockMovement.create({
            profileId,
            inventoryItemId: invItem._id,
            movementType: 'RESTOCK',
            quantityChange: item.quantityOrdered,
            previousStock,
            newStock: invItem.stockOnHand,
            unitCost: item.unitCost,
            referenceId: po._id,
            notes: `Received via PO #${po.poNumber}`,
          });
          restockLogs.push(movement);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Purchase order #${po.poNumber} received and inventory stock restocked.`,
      data: {
        po,
        restockedMovements: restockLogs,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Delete Purchase Order
 * DELETE /api/v1/purchase-orders/:id
 */
export const deletePurchaseOrder = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const po = await WholesalePurchaseOrder.findOne({ _id: id, profileId });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    // 1. Reverse stock if items were already received into inventory
    if (po.status === 'RECEIVED') {
      for (const item of po.items) {
        if (item.inventoryItemId) {
          const invItem = await InventoryItem.findOne({ _id: item.inventoryItemId, profileId });
          if (invItem) {
            invItem.stockOnHand = Math.max(0, invItem.stockOnHand - item.quantityOrdered);
            await invItem.save();

            await StockMovement.create({
              profileId,
              inventoryItemId: invItem._id,
              movementType: 'CORRECTION',
              quantityChange: -item.quantityOrdered,
              previousStock: invItem.stockOnHand + item.quantityOrdered,
              newStock: invItem.stockOnHand,
              unitCost: item.unitCost,
              referenceId: po._id,
              notes: `Stock reversed due to deletion of PO #${po.poNumber}`,
            });
          }
        }
      }
    }

    // 2. Revert supplier balance and delete associated ledger bill entry if created
    if (po.supplierCounterpartyId && po.grandTotal > 0) {
      const supplier = await Counterparty.findOne({ _id: po.supplierCounterpartyId, profileId });
      if (supplier) {
        supplier.currentBalance += po.grandTotal; // Revert negative debt balance
        await supplier.save();
      }

      await LedgerEntry.deleteMany({
        profileId,
        counterpartyId: po.supplierCounterpartyId,
        description: new RegExp(po.poNumber, 'i'),
      });
    }

    // 3. Log forensic audit trail
    try {
      await AuditLog.create({
        profileId,
        authorizedById: new Types.ObjectId(profileId),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType: 'WHOLESALE_PO_DELETED',
        reason: `Deleted Wholesale Purchase Order #${po.poNumber} (Estimated Value: Rs. ${po.grandTotal.toLocaleString()})`,
        details: { poNumber: po.poNumber, grandTotal: po.grandTotal },
      });
    } catch (auditErr) {
      // Non-blocking
    }

    await po.deleteOne();

    return res.status(200).json({
      success: true,
      message: `Purchase order #${po.poNumber} deleted successfully.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
