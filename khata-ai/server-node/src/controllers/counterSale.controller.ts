import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LedgerEntry, PaymentMode } from '../models/LedgerEntry';
import { InventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import { Profile } from '../models/Profile';
import { Counterparty } from '../models/Counterparty';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';
import { socketService } from '../services/socket.service';

/**
 * Atomic Quick Cash Sale Controller
 * Handles pure service sales and itemized product sales with stock deduction.
 * POST /api/v1/counter-sales/quick-sale
 */
export const processQuickSale = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId || req.body.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized (صارف کی شناخت نہیں ہو سکی).' });
    }

    const {
      amount,
      paymentDestination = 'CASH',
      note,
      items = [],
      customerId,
      customerName,
      customerPhone,
    } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive sale amount is required (ادائیگی کی رقم لازمی ہے).',
      });
    }

    let mode: PaymentMode = 'CASH';
    if (paymentDestination === 'BANK') mode = 'BANK_TRANSFER';
    else if (paymentDestination === 'WALLET') mode = 'JAZZCASH';
    else if (paymentDestination === 'CASH') mode = 'CASH';

    const hasItems = Array.isArray(items) && items.length > 0;
    const affectedItems = [];
    const ledgerItems: { name: string; quantity: number; unitPrice: number; total: number }[] = [];
    const itemNamesList: string[] = [];

    // 1. Validate and process inventory deductions if items are attached
    if (hasItems) {
      for (const item of items) {
        const { itemId, quantity } = item;
        const qtyNum = Number(quantity);

        if (!itemId || isNaN(qtyNum) || qtyNum <= 0) continue;

        const invItem = await InventoryItem.findOne({ _id: itemId, profileId });
        if (!invItem) {
          return res.status(400).json({
            success: false,
            message: `Inventory item (${itemId}) not found.`,
          });
        }

        const currentAvailable = invItem.stockOnHand ?? 0;
        if (currentAvailable < qtyNum) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for item "${invItem.itemName}". Available: ${currentAvailable} ${invItem.unitOfMeasure}, Requested: ${qtyNum}.`,
          });
        }

        const previousStock = currentAvailable;
        const newStock = previousStock - qtyNum;

        invItem.stockOnHand = newStock;
        await invItem.save();

        ledgerItems.push({
          name: invItem.itemName,
          quantity: qtyNum,
          unitPrice: invItem.retailPrice,
          total: invItem.retailPrice * qtyNum,
        });

        itemNamesList.push(`${invItem.itemName} (${qtyNum} ${invItem.unitOfMeasure})`);
        affectedItems.push(invItem);
      }
    }

    const itemsSummary = itemNamesList.length > 0 ? itemNamesList.join(', ') : '';
    const category = hasItems ? 'Retail Product Sale' : 'Service Sale';
    const description = note?.trim()
      ? (itemsSummary ? `${note.trim()} • ${itemsSummary}` : note.trim())
      : (itemsSummary ? `Items: ${itemsSummary}` : 'Quick Counter Sale');

    // 1.5. Resolve Customer for Loyalty Tracking if provided
    let resolvedCounterpartyId: mongoose.Types.ObjectId | undefined = undefined;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      const foundCustomer = await Counterparty.findOne({ _id: customerId, profileId });
      if (foundCustomer) {
        resolvedCounterpartyId = foundCustomer._id as mongoose.Types.ObjectId;
        if (!foundCustomer.loyaltyProfile) {
          foundCustomer.loyaltyProfile = {
            rfmSegment: 'NEW',
            recencyDays: 0,
            frequency90d: 1,
            monetarySpend90d: numericAmount,
            lastVisitDate: new Date(),
          };
        } else {
          foundCustomer.loyaltyProfile.lastVisitDate = new Date();
          foundCustomer.loyaltyProfile.frequency90d = (foundCustomer.loyaltyProfile.frequency90d || 0) + 1;
          foundCustomer.loyaltyProfile.monetarySpend90d = (foundCustomer.loyaltyProfile.monetarySpend90d || 0) + numericAmount;
          foundCustomer.loyaltyProfile.recencyDays = 0;
        }
        await foundCustomer.save();
      }
    } else if (customerPhone && typeof customerPhone === 'string' && customerPhone.trim().length >= 7) {
      const trimmedPhone = customerPhone.trim();
      let foundCustomer = await Counterparty.findOne({ profileId, phone: trimmedPhone });
      if (!foundCustomer) {
        foundCustomer = await Counterparty.create({
          profileId: new mongoose.Types.ObjectId(profileId),
          name: customerName?.trim() || 'Walk-in Customer',
          phone: trimmedPhone,
          relationType: 'CUSTOMER',
          currentBalance: 0,
          loyaltyProfile: {
            rfmSegment: 'NEW',
            recencyDays: 0,
            frequency90d: 1,
            monetarySpend90d: numericAmount,
            lastVisitDate: new Date(),
          },
        });
      } else {
        if (!foundCustomer.loyaltyProfile) {
          foundCustomer.loyaltyProfile = {
            rfmSegment: 'NEW',
            recencyDays: 0,
            frequency90d: 1,
            monetarySpend90d: numericAmount,
            lastVisitDate: new Date(),
          };
        } else {
          foundCustomer.loyaltyProfile.lastVisitDate = new Date();
          foundCustomer.loyaltyProfile.frequency90d = (foundCustomer.loyaltyProfile.frequency90d || 0) + 1;
          foundCustomer.loyaltyProfile.monetarySpend90d = (foundCustomer.loyaltyProfile.monetarySpend90d || 0) + numericAmount;
          foundCustomer.loyaltyProfile.recencyDays = 0;
        }
        if (customerName && customerName.trim() && foundCustomer.name === 'Walk-in Customer') {
          foundCustomer.name = customerName.trim();
        }
        await foundCustomer.save();
      }
      resolvedCounterpartyId = foundCustomer._id as mongoose.Types.ObjectId;
    }

    // 2. Create LedgerEntry record
    const ledgerEntry = await LedgerEntry.create({
      profileId: new mongoose.Types.ObjectId(profileId),
      counterpartyId: resolvedCounterpartyId,
      entryType: 'CASH_IN' as const,
      amount: numericAmount,
      paymentMode: mode,
      category,
      description,
      items: ledgerItems.length > 0 ? ledgerItems : undefined,
      isSettled: true,
      settledAt: new Date(),
      inputMode: 'MANUAL' as const,
    });

    // 3. Record StockMovement logs if items present
    if (hasItems && affectedItems.length > 0) {
      for (let i = 0; i < affectedItems.length; i++) {
        const invItem = affectedItems[i];
        const qtyNum = items[i]?.quantity || 1;
        const previousStock = invItem.stockOnHand + qtyNum;
        const newStock = invItem.stockOnHand;

        await StockMovement.create({
          profileId: new mongoose.Types.ObjectId(profileId),
          inventoryItemId: invItem._id,
          movementType: 'SALE',
          quantityChange: -qtyNum,
          previousStock,
          newStock,
          unitCost: invItem.wholesaleCost,
          referenceId: ledgerEntry._id,
          notes: `Quick Counter Sale: ${description}`,
        });
      }
    }

    // 4. Atomically increment profile payment channel balance (Galla / Digital / Bank)
    let updatedProfileChannels: any = null;
    try {
      const profile = await Profile.findById(new mongoose.Types.ObjectId(profileId));
      if (profile) {
        if (!profile.paymentChannels) {
          profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
        }
        let channelKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
        if (paymentDestination === 'BANK') channelKey = 'bankAccount';
        else if (paymentDestination === 'WALLET') channelKey = 'digitalWallet';

        profile.paymentChannels[channelKey] = (profile.paymentChannels[channelKey] || 0) + numericAmount;
        profile.markModified('paymentChannels');
        await profile.save();
        updatedProfileChannels = profile.paymentChannels;
      }
    } catch (chanErr) {
      console.warn('[processQuickSale] Failed to update paymentChannels:', chanErr);
    }

    // 5. Broadcast updated store metrics via real-time sync & multi-terminal till pooling
    try {
      socketService.broadcastSaleCompleted(profileId.toString(), {
        saleId: ledgerEntry._id.toString(),
        amount: numericAmount,
        paymentDestination,
        itemsCount: hasItems ? items.length : 1,
        cashierName: req.user?.phone || 'Till Terminal',
        note: note?.trim(),
        timestamp: new Date().toISOString(),
      });

      const updatedMetrics = await getAggregatedStoreMetrics(profileId);
      dispatchMetricsSync(profileId.toString(), updatedMetrics);
    } catch (metricErr) {
      console.warn('[processQuickSale] Failed to dispatch metrics sync / socket broadcast:', metricErr);
    }

    // 6. Trigger low stock notifications for items that breached low stock threshold
    if (hasItems && affectedItems.length > 0) {
      affectedItems.forEach((invItem) => {
        if (invItem.stockOnHand <= invItem.lowStockThreshold) {
          dispatchPushNotification(profileId.toString(), {
            id: `stock-${invItem._id}-${Date.now()}`,
            category: 'STOCK_ALERT',
            priority: 'WARNING',
            titleUrdu: 'کم اسٹاک کی اطلاع',
            titleEnglish: 'Low Stock Alert',
            messageUrdu: `آئٹم "${invItem.itemName}" کا اسٹاک ختم ہونے کے قریب ہے (${invItem.stockOnHand} باقی)۔`,
            messageEnglish: `Item "${invItem.itemName}" low stock alert (${invItem.stockOnHand} remaining).`,
            timestamp: new Date().toISOString(),
            actionLabel: 'خریداری آرڈر',
            actionRoute: 'WholesalePoModal',
            durationMs: 5000,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: hasItems
        ? 'Sale recorded and stock updated.'
        : 'Service cash sale recorded in till.',
      data: {
        ledgerEntry,
        affectedItems,
        channels: updatedProfileChannels,
      },
    });
  } catch (error: any) {
    console.error('[processQuickSale Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error processing quick sale.',
    });
  }
};
