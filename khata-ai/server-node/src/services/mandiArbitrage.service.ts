/**
 * Mandi Arbitrage & Wholesale Rate Variance Tracker Engine
 * 
 * Aggregates historical wholesale purchases across LedgerEntries and Purchase Orders.
 * 1. Detects Price Creep: Supplier quietly increasing rate vs last invoice
 * 2. Evaluates Multi-Supplier Quote Matrix: Highlights lowest-price vendor per item
 * 3. Evaluates Draft Bill Items: Instant interception before invoice recording
 */

import { Types } from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry';
import { WholesalePurchaseOrder } from '../models/WholesalePurchaseOrder';
import { Counterparty } from '../models/Counterparty';

export interface IPurchaseRecord {
  commodityKey: string;
  rawItemName: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  unitPrice: number;
  quantity: number;
  date: Date;
  source: 'LEDGER_INVOICE' | 'OCR_PARSED' | 'PURCHASE_ORDER';
  refNumber?: string;
}

export interface IPriceCreepAlert {
  commodityKey: string;
  itemName: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  currentUnitPrice: number;
  previousUnitPrice: number;
  priceDelta: number;
  percentHike: number;
  lastPurchaseDate: Date;
  previousPurchaseDate: Date;
  messageUr: string;
  messageEn: string;
  severity: 'WARNING' | 'CRITICAL';
}

export interface IOptimalVendorQuote {
  commodityKey: string;
  itemName: string;
  lowestPrice: number;
  highestPrice: number;
  arbitrageSpread: number; // lowest vs highest
  bestSupplier: {
    id: string;
    name: string;
    phone: string;
    lastQuotedDate: Date;
  };
  otherSuppliers: Array<{
    id: string;
    name: string;
    phone: string;
    unitPrice: number;
    differenceFromBest: number;
    lastQuotedDate: Date;
  }>;
  potentialSavingsPercent: number;
  recommendedActionUr: string;
  recommendedActionEn: string;
}

export interface IMandiRadarSummary {
  priceCreeps: IPriceCreepAlert[];
  optimalQuotes: IOptimalVendorQuote[];
  totalTrackedCommodities: number;
  totalSuppliersAudited: number;
  potentialTotalSavingsEstimated: number;
}

export interface IBillItemEvaluation {
  itemName: string;
  enteredUnitPrice: number;
  lastSupplierUnitPrice?: number;
  lowestMarketUnitPrice?: number;
  priceCreepDetected: boolean;
  creepAmount?: number;
  creepPercent?: number;
  betterSupplierAvailable: boolean;
  betterSupplierName?: string;
  betterSupplierPhone?: string;
  savingsPerUnit?: number;
  alertSeverity?: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  alertMessageUr?: string;
  alertMessageEn?: string;
}

export class MandiArbitrageEngine {
  /**
   * Normalize commodity names to match variations:
   * e.g. "Dalda Banaspati 1kg", "Dalda 1 KG Ghee", "dalda ghee 1kg" -> "dalda ghee 1kg"
   */
  public static normalizeCommodityName(name: string): string {
    if (!name) return 'general_item';
    let clean = name.toLowerCase().trim();
    // Normalize punctuation & common Urdu/English variants
    clean = clean.replace(/[,.-]/g, ' ');
    clean = clean.replace(/\bbanaspati\b/g, 'ghee');
    clean = clean.replace(/\bcooking oil\b/g, 'oil');
    clean = clean.replace(/\bkilo\b|\bkilogram\b|\bkgs?\b/g, 'kg');
    clean = clean.replace(/\bltr\b|\blitre\b|\bliters?\b/g, 'l');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }

  /**
   * Fetches and normalizes all historical purchase records for a given business profile.
   */
  public static async fetchHistoricalPurchases(
    profileId: string | Types.ObjectId
  ): Promise<{ purchases: IPurchaseRecord[]; supplierMap: Map<string, { name: string; phone: string }> }> {
    const pId = new Types.ObjectId(profileId);

    // 1. Fetch active suppliers map
    const suppliers = await Counterparty.find({
      profileId: pId,
      relationType: 'SUPPLIER',
    }).lean();

    const supplierMap = new Map<string, { name: string; phone: string }>();
    for (const sup of suppliers) {
      supplierMap.set(String(sup._id), {
        name: sup.name || 'Unnamed Supplier',
        phone: sup.phone || '',
      });
    }

    // 2. Query LedgerEntries (Invoices with line items, OCR extracted items, or PAYABLE entries)
    const ledgerEntries = await LedgerEntry.find({
      profileId: pId,
      entryType: 'PAYABLE',
      $or: [
        { 'items.0': { $exists: true } },
        { 'ocrData.extractedItems.0': { $exists: true } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Query Wholesale Purchase Orders
    const purchaseOrders = await WholesalePurchaseOrder.find({
      profileId: pId,
      status: { $in: ['ORDERED', 'RECEIVED'] },
      'items.0': { $exists: true },
    })
      .sort({ orderDate: -1 })
      .lean();

    const purchases: IPurchaseRecord[] = [];

    // Extract from LedgerEntries
    for (const entry of ledgerEntries) {
      const supplierId = entry.counterpartyId ? String(entry.counterpartyId) : '';
      const supplierInfo = supplierMap.get(supplierId) || {
        name: entry.ocrData?.extractedVendorName || 'Wholesale Vendor',
        phone: '',
      };

      const lineItems = (entry.items && entry.items.length > 0)
        ? entry.items
        : (entry.ocrData?.extractedItems || []);

      for (const item of lineItems) {
        if (!item.name || !item.unitPrice || item.unitPrice <= 0) continue;
        const commKey = this.normalizeCommodityName(item.name);
        purchases.push({
          commodityKey: commKey,
          rawItemName: item.name,
          supplierId,
          supplierName: supplierInfo.name,
          supplierPhone: supplierInfo.phone,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity || 1),
          date: entry.createdAt || new Date(),
          source: (entry.items && entry.items.length > 0) ? 'LEDGER_INVOICE' : 'OCR_PARSED',
          refNumber: entry.ocrData?.extractedInvoiceNo || undefined,
        });
      }
    }

    // Extract from WholesalePurchaseOrders
    for (const po of purchaseOrders) {
      const supplierId = String(po.supplierCounterpartyId);
      const supplierInfo = supplierMap.get(supplierId) || {
        name: 'PO Supplier',
        phone: '',
      };

      for (const item of po.items || []) {
        if (!item.itemName || !item.unitCost || item.unitCost <= 0) continue;
        const commKey = this.normalizeCommodityName(item.itemName);
        purchases.push({
          commodityKey: commKey,
          rawItemName: item.itemName,
          supplierId,
          supplierName: supplierInfo.name,
          supplierPhone: supplierInfo.phone,
          unitPrice: Number(item.unitCost),
          quantity: Number(item.quantityOrdered || 1),
          date: po.orderDate || po.createdAt || new Date(),
          source: 'PURCHASE_ORDER',
          refNumber: po.poNumber,
        });
      }
    }

    return { purchases, supplierMap };
  }

  /**
   * Scans purchases for price creep (same supplier quietly raising rates)
   * and multi-supplier quote arbitrage.
   */
  public static async getRadarSummary(profileId: string | Types.ObjectId): Promise<IMandiRadarSummary> {
    const { purchases, supplierMap } = await this.fetchHistoricalPurchases(profileId);

    // Group purchases by commodityKey
    const commodityGroups = new Map<string, IPurchaseRecord[]>();
    for (const p of purchases) {
      const existing = commodityGroups.get(p.commodityKey) || [];
      existing.push(p);
      commodityGroups.set(p.commodityKey, existing);
    }

    const priceCreeps: IPriceCreepAlert[] = [];
    const optimalQuotes: IOptimalVendorQuote[] = [];
    let potentialTotalSavings = 0;

    for (const [commKey, records] of commodityGroups.entries()) {
      // Sort chronologically (newest first)
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const representativeName = records[0].rawItemName;

      // Group by supplier to detect creep per vendor
      const bySupplier = new Map<string, IPurchaseRecord[]>();
      for (const r of records) {
        if (!r.supplierId) continue;
        const list = bySupplier.get(r.supplierId) || [];
        list.push(r);
        bySupplier.set(r.supplierId, list);
      }

      // 1. Detect Price Creep per Supplier
      for (const [supId, supRecords] of bySupplier.entries()) {
        if (supRecords.length < 2) continue;
        const latest = supRecords[0];
        const previous = supRecords[1];

        if (latest.unitPrice > previous.unitPrice) {
          const delta = latest.unitPrice - previous.unitPrice;
          const percent = Math.round((delta / previous.unitPrice) * 100);

          if (delta >= 1) { // Minimum 1 PKR hike
            const severity: 'WARNING' | 'CRITICAL' = percent >= 8 || delta >= 50 ? 'CRITICAL' : 'WARNING';
            const supName = latest.supplierName || 'سپلائر';

            const messageUr = `⚠️ سپلائر "${supName}" نے ${representativeName} کی قیمت میں Rs. ${delta.toLocaleString()} فی یونٹ (+${percent}%) اضافہ کیا ہے۔ (پہلے: Rs. ${previous.unitPrice.toLocaleString()}، اب: Rs. ${latest.unitPrice.toLocaleString()})`;
            const messageEn = `⚠️ Supplier "${supName}" raised unit rate for ${representativeName} by Rs. ${delta.toLocaleString()} (+${percent}% hike). Previous: Rs. ${previous.unitPrice.toLocaleString()}, Current: Rs. ${latest.unitPrice.toLocaleString()}`;

            priceCreeps.push({
              commodityKey: commKey,
              itemName: representativeName,
              supplierId: supId,
              supplierName: latest.supplierName,
              supplierPhone: latest.supplierPhone,
              currentUnitPrice: latest.unitPrice,
              previousUnitPrice: previous.unitPrice,
              priceDelta: delta,
              percentHike: percent,
              lastPurchaseDate: latest.date,
              previousPurchaseDate: previous.date,
              messageUr,
              messageEn,
              severity,
            });
          }
        }
      }

      // 2. Multi-Supplier Quote Arbitrage
      if (bySupplier.size >= 2) {
        // Find latest rate from each supplier for this commodity
        const vendorLatestList: Array<{
          id: string;
          name: string;
          phone: string;
          unitPrice: number;
          date: Date;
        }> = [];

        for (const [supId, supRecords] of bySupplier.entries()) {
          const latest = supRecords[0];
          vendorLatestList.push({
            id: supId,
            name: latest.supplierName,
            phone: latest.supplierPhone,
            unitPrice: latest.unitPrice,
            date: latest.date,
          });
        }

        vendorLatestList.sort((a, b) => a.unitPrice - b.unitPrice);

        const bestVendor = vendorLatestList[0];
        const worstVendor = vendorLatestList[vendorLatestList.length - 1];
        const spread = worstVendor.unitPrice - bestVendor.unitPrice;

        if (spread > 0) {
          const savingsPercent = Math.round((spread / worstVendor.unitPrice) * 100);
          const others = vendorLatestList.slice(1).map((v) => ({
            id: v.id,
            name: v.name,
            phone: v.phone,
            unitPrice: v.unitPrice,
            differenceFromBest: v.unitPrice - bestVendor.unitPrice,
            lastQuotedDate: v.date,
          }));

          const actionUr = `بہترین ریٹ: "${bestVendor.name}" سے خریدیں (Rs. ${bestVendor.unitPrice.toLocaleString()})۔ آپ کو فی یونٹ Rs. ${spread.toLocaleString()} (${savingsPercent}%) کی بچت ہوگی بمقابلہ ${worstVendor.name}۔`;
          const actionEn = `Best Quote: Procure from "${bestVendor.name}" at Rs. ${bestVendor.unitPrice.toLocaleString()}/unit. Save Rs. ${spread.toLocaleString()} (${savingsPercent}%) vs ${worstVendor.name}.`;

          optimalQuotes.push({
            commodityKey: commKey,
            itemName: representativeName,
            lowestPrice: bestVendor.unitPrice,
            highestPrice: worstVendor.unitPrice,
            arbitrageSpread: spread,
            bestSupplier: {
              id: bestVendor.id,
              name: bestVendor.name,
              phone: bestVendor.phone,
              lastQuotedDate: bestVendor.date,
            },
            otherSuppliers: others,
            potentialSavingsPercent: savingsPercent,
            recommendedActionUr: actionUr,
            recommendedActionEn: actionEn,
          });

          potentialTotalSavings += spread * 25; // baseline assumption: 25 units reorder
        }
      }
    }

    // Sort creeps by severity and delta
    priceCreeps.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return b.priceDelta - a.priceDelta;
    });

    // Sort optimal quotes by potential spread
    optimalQuotes.sort((a, b) => b.arbitrageSpread - a.arbitrageSpread);

    return {
      priceCreeps,
      optimalQuotes,
      totalTrackedCommodities: commodityGroups.size,
      totalSuppliersAudited: supplierMap.size,
      potentialTotalSavingsEstimated: potentialTotalSavings,
    };
  }

  /**
   * Pre-commit validation of draft bill items:
   * Called while user or OCR enters lines into AddSupplierBillModal.
   */
  public static async evaluateBillItems(
    profileId: string | Types.ObjectId,
    items: Array<{ name: string; unitPrice: number; quantity?: number }>,
    supplierId?: string
  ): Promise<IBillItemEvaluation[]> {
    const { purchases, supplierMap } = await this.fetchHistoricalPurchases(profileId);

    // Group purchases by commodityKey
    const byCommodity = new Map<string, IPurchaseRecord[]>();
    for (const p of purchases) {
      const list = byCommodity.get(p.commodityKey) || [];
      list.push(p);
      byCommodity.set(p.commodityKey, list);
    }

    const evaluations: IBillItemEvaluation[] = [];

    for (const item of items) {
      if (!item.name || !item.unitPrice || item.unitPrice <= 0) continue;
      const commKey = this.normalizeCommodityName(item.name);
      const history = byCommodity.get(commKey) || [];

      // Sort by date desc
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 1. Same supplier history
      const sameSupplierHistory = supplierId
        ? history.filter((h) => h.supplierId === supplierId)
        : [];

      let lastSupplierPrice: number | undefined;
      let priceCreepDetected = false;
      let creepAmount = 0;
      let creepPercent = 0;

      if (sameSupplierHistory.length > 0) {
        lastSupplierPrice = sameSupplierHistory[0].unitPrice;
        if (item.unitPrice > lastSupplierPrice) {
          priceCreepDetected = true;
          creepAmount = item.unitPrice - lastSupplierPrice;
          creepPercent = Math.round((creepAmount / lastSupplierPrice) * 100);
        }
      }

      // 2. Best market supplier across all vendors
      let lowestMarketPrice: number | undefined;
      let betterSupplierAvailable = false;
      let betterSupplierName: string | undefined;
      let betterSupplierPhone: string | undefined;
      let savingsPerUnit = 0;

      if (history.length > 0) {
        // Find min price across other suppliers
        const otherSuppliers = supplierId
          ? history.filter((h) => h.supplierId !== supplierId)
          : history;

        if (otherSuppliers.length > 0) {
          otherSuppliers.sort((a, b) => a.unitPrice - b.unitPrice);
          const bestOther = otherSuppliers[0];
          lowestMarketPrice = bestOther.unitPrice;

          if (lowestMarketPrice < item.unitPrice) {
            betterSupplierAvailable = true;
            betterSupplierName = bestOther.supplierName;
            betterSupplierPhone = bestOther.supplierPhone;
            savingsPerUnit = item.unitPrice - lowestMarketPrice;
          }
        }
      }

      // 3. Assemble Alert Message
      let severity: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL' = 'NONE';
      let msgUr = '';
      let msgEn = '';

      if (priceCreepDetected && creepAmount >= 1) {
        severity = creepPercent >= 8 || creepAmount >= 50 ? 'CRITICAL' : 'WARNING';
        msgUr = `⚠️ ریٹ میں اضافہ: پچھلے بل میں ریٹ Rs. ${lastSupplierPrice?.toLocaleString()} تھا، اب Rs. ${item.unitPrice.toLocaleString()} درج ہو رہا ہے (+Rs. ${creepAmount} / +${creepPercent}%)۔`;
        msgEn = `⚠️ Price hike detected: Previous rate was Rs. ${lastSupplierPrice?.toLocaleString()}, new rate is Rs. ${item.unitPrice.toLocaleString()} (+Rs. ${creepAmount} / +${creepPercent}%).`;
      } else if (betterSupplierAvailable && savingsPerUnit >= 5) {
        severity = 'INFO';
        msgUr = `💡 سستا متبادل: "${betterSupplierName}" یہی آئٹم Rs. ${lowestMarketPrice?.toLocaleString()} میں فراہم کرتا ہے (بچت: Rs. ${savingsPerUnit} فی یونٹ)۔`;
        msgEn = `💡 Cheaper vendor: "${betterSupplierName}" supplies this item at Rs. ${lowestMarketPrice?.toLocaleString()} (Save Rs. ${savingsPerUnit}/unit).`;
      }

      evaluations.push({
        itemName: item.name,
        enteredUnitPrice: item.unitPrice,
        lastSupplierUnitPrice: lastSupplierPrice,
        lowestMarketUnitPrice: lowestMarketPrice,
        priceCreepDetected,
        creepAmount: priceCreepDetected ? creepAmount : undefined,
        creepPercent: priceCreepDetected ? creepPercent : undefined,
        betterSupplierAvailable,
        betterSupplierName,
        betterSupplierPhone,
        savingsPerUnit: betterSupplierAvailable ? savingsPerUnit : undefined,
        alertSeverity: severity,
        alertMessageUr: msgUr || undefined,
        alertMessageEn: msgEn || undefined,
      });
    }

    return evaluations;
  }
}
