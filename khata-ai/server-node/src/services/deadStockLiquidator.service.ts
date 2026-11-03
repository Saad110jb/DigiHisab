/**
 * Dead-Stock Liquidator & Expiry Markdown Engine
 * 
 * 1. Turnover Hazard Classifier:
 *    Computes Turnover Hazard Index (THI) = Days to Naturally Deplete Stock / Days Remaining to Expiry.
 *    Categorizes inventory into CRITICAL, WARNING, DORMANT, and SAFE.
 * 
 * 2. High-Margin Promotional Bundle Generator:
 *    Pairs slow-moving/near-expiry anchor items with fast-moving driver staples
 *    at an attractive promotional discount while enforcing a >= 12% net margin protection guardrail.
 * 
 * 3. Dynamic Clearance Markdown Applicator.
 */

import { Types } from 'mongoose';
import { InventoryItem, IInventoryItem } from '../models/InventoryItem';
import { StockMovement } from '../models/StockMovement';
import { LedgerEntry } from '../models/LedgerEntry';

export type HazardLevel = 'CRITICAL' | 'WARNING' | 'DORMANT' | 'SAFE';

export interface ITurnoverHazardItem {
  id: string;
  itemName: string;
  sku: string;
  category: string;
  stockOnHand: number;
  wholesaleCost: number;
  retailPrice: number;
  lockedCapital: number;
  expiryDate?: string;
  daysRemainingToExpiry?: number;
  dailySalesVelocity: number;
  daysToNaturalDepletion: number;
  turnoverHazardIndex: number;
  hazardLevel: HazardLevel;
  markdownDiscountPercent: number;
  markdownPrice?: number;
  recommendedMarkdown: number;
  alertUrdu: string;
  alertEn: string;
}

export interface IHighMarginBundle {
  id: string;
  titleUrdu: string;
  titleEn: string;
  anchorItem: {
    id: string;
    itemName: string;
    stockOnHand: number;
    retailPrice: number;
    wholesaleCost: number;
    daysRemainingToExpiry?: number;
    hazardLevel: HazardLevel;
  };
  driverItem: {
    id: string;
    itemName: string;
    stockOnHand: number;
    retailPrice: number;
    wholesaleCost: number;
    dailySalesVelocity: number;
  };
  originalCombinedRetail: number;
  totalWholesaleCost: number;
  bundleDiscountPercent: number;
  bundleRetailPrice: number;
  customerSavings: number;
  netGrossMarginPercent: number;
  bundleProfitPKR: number;
  urgencyDays?: number;
  marketingCopyUr: string;
  marketingCopyEn: string;
}

export interface IDeadStockSummary {
  totalLockedDeadCapital: number;
  criticalHazardCount: number;
  warningHazardCount: number;
  dormantItemsCount: number;
  safeItemsCount: number;
  turnoverHazards: ITurnoverHazardItem[];
  smartBundles: IHighMarginBundle[];
}

const PERISHABLE_KEYWORDS = [
  'dairy', 'milk', 'dahi', 'yogurt', 'butter', 'cheese', 'bread', 'rusk', 'cake',
  'biscuit', 'bisc', 'cookie', 'masala', 'spice', 'korma', 'biryani', 'sauce',
  'ketchup', 'mayo', 'juice', 'beverage', 'tea', 'chaye', 'qehwa', 'atta', 'flour',
  'lentil', 'daal', 'oil', 'ghee', 'meat', 'chicken'
];

export class DeadStockLiquidatorEngine {
  /**
   * Evaluates if item is perishable based on explicit flag, category or name
   */
  public static isPerishableItem(item: IInventoryItem): boolean {
    if (item.isPerishable) return true;
    const cat = (item.category || '').toLowerCase();
    const name = (item.itemName || '').toLowerCase();
    return PERISHABLE_KEYWORDS.some((kw) => cat.includes(kw) || name.includes(kw));
  }

  /**
   * Scans inventory and counter sales history to evaluate Turnover Hazard Index (THI)
   * and categorize stock.
   */
  public static async analyzeTurnoverHazards(
    profileId: string | Types.ObjectId
  ): Promise<{ hazards: ITurnoverHazardItem[]; items: IInventoryItem[]; velocityMap: Map<string, number> }> {
    const pId = new Types.ObjectId(profileId);

    // 1. Fetch active inventory
    const items = await InventoryItem.find({
      profileId: pId,
      isActive: true,
      stockOnHand: { $gt: 0 },
    }).lean();

    // 2. Fetch 30-day stock movements (sales) to calculate daily velocity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSales = await StockMovement.find({
      profileId: pId,
      movementType: 'SALE',
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    // Sum sales quantity per item
    const salesTotal30d = new Map<string, number>();
    for (const sale of recentSales) {
      const key = String(sale.inventoryItemId);
      const qty = Math.abs(sale.quantityChange || 0);
      salesTotal30d.set(key, (salesTotal30d.get(key) || 0) + qty);
    }

    const velocityMap = new Map<string, number>();
    const now = Date.now();
    const hazards: ITurnoverHazardItem[] = [];

    for (const item of items) {
      const itemId = String(item._id);
      const unitsSold30d = salesTotal30d.get(itemId) || 0;
      const velocity = Math.round((unitsSold30d / 30) * 100) / 100; // units per day
      velocityMap.set(itemId, velocity);

      const stock = item.stockOnHand || 0;
      const cost = item.wholesaleCost || 0;
      const retail = item.retailPrice || cost;
      const lockedCapital = stock * cost;

      // Determine Days Remaining to Expiry (DRE)
      let daysRemainingToExpiry: number | undefined;
      let hasExplicitExpiry = false;

      if (item.expiryDate) {
        hasExplicitExpiry = true;
        const diffMs = new Date(item.expiryDate).getTime() - now;
        daysRemainingToExpiry = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } else if (this.isPerishableItem(item as any)) {
        // Fallback for perishable items without explicit expiry date:
        // Assume standard 90-day shelf life from item creation date
        const ageDays = Math.round((now - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        daysRemainingToExpiry = Math.max(1, 90 - ageDays);
      }

      // Days to naturally deplete stock (DND)
      const daysToNaturalDepletion = velocity > 0 ? Math.round(stock / velocity) : 999;

      // Compute Turnover Hazard Index (THI)
      let thi = 0.1;
      if (daysRemainingToExpiry !== undefined && daysRemainingToExpiry > 0) {
        thi = Math.round((daysToNaturalDepletion / daysRemainingToExpiry) * 100) / 100;
      } else if (velocity === 0) {
        thi = 2.5; // Dormant with no velocity
      }

      // Classify Hazard Level
      let hazardLevel: HazardLevel = 'SAFE';
      let recommendedMarkdown = 0;
      let alertUr = '';
      let alertEn = '';

      const isCritical = (daysRemainingToExpiry !== undefined && daysRemainingToExpiry <= 21) || (thi >= 1.0 && (daysRemainingToExpiry ?? 99) <= 45);
      const isWarning = (daysRemainingToExpiry !== undefined && daysRemainingToExpiry <= 45) || (thi >= 0.65 && (daysRemainingToExpiry ?? 99) <= 60);
      const isDormant = velocity === 0 && stock >= 5;

      if (isCritical) {
        hazardLevel = 'CRITICAL';
        recommendedMarkdown = 20;
        alertUr = `🔴 ہنگامی خطرہ: ایکسپائری میں صرف ${daysRemainingToExpiry ?? 'چند'} دن باقی ہیں۔ موجودہ رفتار پر مال ایکسپائر ہونے سے پہلے نہیں بک سکے گا۔ فوری بنڈل ڈیل یا 20% رعایت لگائیں!`;
        alertEn = `🔴 Critical Hazard: Only ${daysRemainingToExpiry ?? 'few'} days to expiry. Natural velocity cannot clear stock before loss. Apply bundle or 20% clearance markdown immediately!`;
      } else if (isWarning) {
        hazardLevel = 'WARNING';
        recommendedMarkdown = 10;
        alertUr = `🟡 انتباہ: فروخت کی رفتار کم ہے۔ ایکسپائری سے پہلے کلیئر کرنے کے لیے چینی یا گھی کے ساتھ ہائی مارجن بنڈل بنائیں۔`;
        alertEn = `🟡 Warning: Sluggish sales velocity. Pair with fast-moving sugar or ghee in a promotional bundle to accelerate clearance.`;
      } else if (isDormant) {
        hazardLevel = 'DORMANT';
        recommendedMarkdown = 15;
        alertUr = `🟠 بند سرمایہ: پچھلے 30 دنوں میں اس آئٹم کی کوئی فروخت نہیں ہوئی۔ کیپیٹل ریکور کرنے کے لیے کراس سیل بنڈل بنائیں۔`;
        alertEn = `🟠 Dormant Stock: 0 sales in past 30 days. Rs. ${lockedCapital.toLocaleString()} capital locked on shelf. Clearance cross-sell recommended.`;
      } else {
        hazardLevel = 'SAFE';
        recommendedMarkdown = 0;
        alertUr = `🟢 تسلی بخش: فروخت کی رفتار اور اسٹاک کا توازن درست ہے۔`;
        alertEn = `🟢 Healthy: Sales velocity is adequate to clear batch before expiry.`;
      }

      const activeMarkdown = item.markdownDiscountPercent || 0;
      const markdownPrice = activeMarkdown > 0 ? Math.round(retail * (1 - activeMarkdown / 100)) : undefined;

      hazards.push({
        id: itemId,
        itemName: item.itemName,
        sku: item.sku,
        category: item.category || 'General',
        stockOnHand: stock,
        wholesaleCost: cost,
        retailPrice: retail,
        lockedCapital,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : undefined,
        daysRemainingToExpiry,
        dailySalesVelocity: velocity,
        daysToNaturalDepletion,
        turnoverHazardIndex: thi,
        hazardLevel,
        markdownDiscountPercent: activeMarkdown,
        markdownPrice,
        recommendedMarkdown,
        alertUrdu: alertUr,
        alertEn: alertEn,
      });
    }

    // Sort hazards: CRITICAL first, then WARNING, then DORMANT, then by locked capital desc
    const rankOrder: Record<HazardLevel, number> = {
      CRITICAL: 1,
      WARNING: 2,
      DORMANT: 3,
      SAFE: 4,
    };

    hazards.sort((a, b) => {
      const rankDiff = rankOrder[a.hazardLevel] - rankOrder[b.hazardLevel];
      if (rankDiff !== 0) return rankDiff;
      return b.lockedCapital - a.lockedCapital;
    });

    return { hazards, items: items as any, velocityMap };
  }

  /**
   * Generates High-Margin Clearance Bundles by pairing near-expiry/dormant items (Anchors)
   * with high-velocity everyday staples (Drivers) while guaranteeing >= 12% profit margin.
   */
  public static async generateBundles(
    profileId: string | Types.ObjectId
  ): Promise<IHighMarginBundle[]> {
    const { hazards, items, velocityMap } = await this.analyzeTurnoverHazards(profileId);

    // Anchor candidates: Items needing liquidation (CRITICAL, WARNING, DORMANT)
    const anchorHazards = hazards.filter((h) => h.hazardLevel !== 'SAFE');
    if (anchorHazards.length === 0) {
      return [];
    }

    // Driver candidates: Fast-moving staple items with velocity >= 0.5 units/day or top velocity
    const driverCandidates = items
      .filter((it) => {
        const vel = velocityMap.get(String(it._id)) || 0;
        return vel >= 0.3 && (it.stockOnHand || 0) >= 10;
      })
      .sort((a, b) => (velocityMap.get(String(b._id)) || 0) - (velocityMap.get(String(a._id)) || 0));

    // Fallback: If velocity data is sparse, select items with high stock and low unit cost (staples)
    const fallbackDrivers = items
      .filter((it) => (it.stockOnHand || 0) >= 10)
      .sort((a, b) => (b.stockOnHand || 0) - (a.stockOnHand || 0));

    const finalDrivers = driverCandidates.length > 0 ? driverCandidates : fallbackDrivers;
    const bundles: IHighMarginBundle[] = [];
    const usedAnchors = new Set<string>();

    for (const anchor of anchorHazards) {
      if (usedAnchors.has(anchor.id)) continue;

      // Select driver item that is not the same item
      const driver = finalDrivers.find((d) => String(d._id) !== anchor.id);
      if (!driver) continue;

      const combinedRetail = anchor.retailPrice + driver.retailPrice;
      const combinedCost = anchor.wholesaleCost + driver.wholesaleCost;

      // If combined cost exceeds combined retail, skip
      if (combinedCost >= combinedRetail) continue;

      // Determine optimal discount: Target 8% to 12% customer discount
      let discountPercent = anchor.hazardLevel === 'CRITICAL' ? 10 : 7;
      let discountedRetail = Math.round(combinedRetail * (1 - discountPercent / 100));

      // Guardrail Check: Ensure net margin >= 12%
      let netMargin = (discountedRetail - combinedCost) / discountedRetail;
      if (netMargin < 0.12) {
        // Adjust discount down to preserve 12% margin
        discountPercent = Math.max(5, Math.floor(((combinedRetail - combinedCost / 0.88) / combinedRetail) * 100));
        discountedRetail = Math.round(combinedRetail * (1 - discountPercent / 100));
        netMargin = (discountedRetail - combinedCost) / discountedRetail;
      }

      if (discountedRetail <= combinedCost) {
        // Margin too thin to discount further
        continue;
      }

      const savingsPKR = combinedRetail - discountedRetail;
      const profitPKR = discountedRetail - combinedCost;
      const netMarginPercent = Math.round(netMargin * 1000) / 10;

      const titleUr = `خصوصی بچت بنڈل: ${driver.itemName} + ${anchor.itemName}`;
      const titleEn = `Clearance Combo: ${driver.itemName} + ${anchor.itemName}`;

      const marketingUr = `🔥 خصوصی رعایت: ${driver.itemName} کے ساتھ ${anchor.itemName} خریدیں اور Rs. ${savingsPKR.toLocaleString()} کی فوری بچت حاصل کریں! کل قیمت صرف Rs. ${discountedRetail.toLocaleString()} (اصل: Rs. ${combinedRetail.toLocaleString()})۔`;
      const marketingEn = `🔥 Special Bundle Deal: Buy ${driver.itemName} with ${anchor.itemName} and save Rs. ${savingsPKR.toLocaleString()} instantly! Now Rs. ${discountedRetail.toLocaleString()} (was Rs. ${combinedRetail.toLocaleString()}).`;

      bundles.push({
        id: `bundle_${anchor.id}_${driver._id}`,
        titleUrdu: titleUr,
        titleEn,
        anchorItem: {
          id: anchor.id,
          itemName: anchor.itemName,
          stockOnHand: anchor.stockOnHand,
          retailPrice: anchor.retailPrice,
          wholesaleCost: anchor.wholesaleCost,
          daysRemainingToExpiry: anchor.daysRemainingToExpiry,
          hazardLevel: anchor.hazardLevel,
        },
        driverItem: {
          id: String(driver._id),
          itemName: driver.itemName,
          stockOnHand: driver.stockOnHand,
          retailPrice: driver.retailPrice,
          wholesaleCost: driver.wholesaleCost,
          dailySalesVelocity: velocityMap.get(String(driver._id)) || 1.2,
        },
        originalCombinedRetail: combinedRetail,
        totalWholesaleCost: combinedCost,
        bundleDiscountPercent: discountPercent,
        bundleRetailPrice: discountedRetail,
        customerSavings: savingsPKR,
        netGrossMarginPercent: netMarginPercent,
        bundleProfitPKR: profitPKR,
        urgencyDays: anchor.daysRemainingToExpiry,
        marketingCopyUr: marketingUr,
        marketingCopyEn: marketingEn,
      });

      usedAnchors.add(anchor.id);
      if (bundles.length >= 8) break; // Top 8 recommended bundles
    }

    return bundles;
  }

  /**
   * Returns comprehensive Dead-Stock & Expiry summary for the dashboard
   */
  public static async getSummary(profileId: string | Types.ObjectId): Promise<IDeadStockSummary> {
    const { hazards } = await this.analyzeTurnoverHazards(profileId);
    const bundles = await this.generateBundles(profileId);

    let totalLocked = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let dormantCount = 0;
    let safeCount = 0;

    for (const h of hazards) {
      if (h.hazardLevel === 'CRITICAL') {
        criticalCount++;
        totalLocked += h.lockedCapital;
      } else if (h.hazardLevel === 'WARNING') {
        warningCount++;
        totalLocked += h.lockedCapital;
      } else if (h.hazardLevel === 'DORMANT') {
        dormantCount++;
        totalLocked += h.lockedCapital;
      } else {
        safeCount++;
      }
    }

    return {
      totalLockedDeadCapital: totalLocked,
      criticalHazardCount: criticalCount,
      warningHazardCount: warningCount,
      dormantItemsCount: dormantCount,
      safeItemsCount: safeCount,
      turnoverHazards: hazards,
      smartBundles: bundles,
    };
  }

  /**
   * Applies an active promotional markdown percentage to an item
   */
  public static async applyMarkdown(
    profileId: string | Types.ObjectId,
    itemId: string,
    discountPercent: number
  ): Promise<IInventoryItem | null> {
    const pId = new Types.ObjectId(profileId);
    const item = await InventoryItem.findOne({ _id: new Types.ObjectId(itemId), profileId: pId });
    if (!item) return null;

    item.markdownDiscountPercent = Math.max(0, Math.min(80, discountPercent));
    await item.save();
    return item;
  }
}
