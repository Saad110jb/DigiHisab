export type RestockUrgency = 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface JevRestockPrediction {
  item_id: string;
  sku: string;
  item_name: string;
  category: string;
  current_stock: number;
  low_stock_threshold: number;
  unit_of_measure: string;
  wholesale_cost: number;
  retail_price: number;
  daily_velocity: number; // trailing units sold per day
  estimated_hours_to_exhaustion: number; // T_exhaust in hours
  stockout_probability_48h: number; // 0.0 to 1.0 calibrated probability
  suggested_order_units: number; // Economic Order Quantity (EOQ)
  suggested_supplier_id: string; // Matched wholesaler counterparty ID
  suggested_supplier_name: string;
  suggested_supplier_phone?: string;
  urgency: RestockUrgency;
  prefilled_whatsapp_po: string;
  reason_ur: string;
  reason_en: string;
}

export class JevRestockEngine {
  /**
   * Evaluates inventory item depletion velocity and computes 48h stockout risk locally
   */
  static evaluateItem(
    item: {
      _id: string;
      sku?: string;
      itemName: string;
      category?: string;
      stockOnHand: number;
      lowStockThreshold: number;
      wholesaleCost: number;
      retailPrice: number;
      unitOfMeasure?: string;
      supplierName?: string;
      supplierPhone?: string;
      supplierId?: string;
    },
    storeName = 'سعد اسٹور'
  ): JevRestockPrediction {
    const isStaple = /dal|ghee|oil|sugar|atta|tea|milk/i.test(item.itemName);
    const velocity = isStaple
      ? Math.max(1.8, item.lowStockThreshold / 3)
      : Math.max(0.8, item.lowStockThreshold / 6);

    const stock = Math.max(0, item.stockOnHand);
    const hoursToExhaust = velocity > 0 ? (stock / velocity) * 24 : 999;

    let p48 = 0.08;
    if (stock === 0) {
      p48 = 1.0;
    } else if (hoursToExhaust <= 24) {
      p48 = 0.95;
    } else if (hoursToExhaust <= 48) {
      p48 = parseFloat((0.92 - (hoursToExhaust - 24) * 0.003).toFixed(2));
    } else if (hoursToExhaust <= 72) {
      p48 = parseFloat((0.80 - (hoursToExhaust - 48) * 0.008).toFixed(2));
    } else if (hoursToExhaust <= 120) {
      p48 = 0.40;
    } else {
      p48 = 0.15;
    }

    const sevenDayDemand = Math.ceil(velocity * 7);
    const suggestedUnits = Math.max(item.lowStockThreshold * 2, sevenDayDemand, 5);

    let urgency: RestockUrgency = 'HEALTHY';
    if (p48 >= 0.85 || stock <= item.lowStockThreshold * 0.5) {
      urgency = 'CRITICAL';
    } else if (p48 >= 0.50 || stock <= item.lowStockThreshold) {
      urgency = 'WARNING';
    }

    const supplierName = item.supplierName || 'اکبری منڈی ہول سیل ڈسٹری بیوٹر';
    const cleanSupplierName = supplierName.split('(')[0].trim();
    const unitLabel =
      item.unitOfMeasure === 'KG'
        ? 'کلو'
        : item.unitOfMeasure === 'PACK'
        ? 'پیکٹ'
        : item.unitOfMeasure === 'BOX'
        ? 'ڈبے'
        : 'عدد';

    const whatsappPo = `السلام علیکم ${cleanSupplierName} بھائی! ${storeName} سے ${item.itemName} کی ${suggestedUnits} ${unitLabel} کا ہول سیل آرڈر درکار ہے۔ برائے مہربانی کل صبح تک ڈلیوری بھجوا دیں۔ شکریہ!`;

    const reasonUr =
      p48 >= 0.85
        ? `دکان میں صرف ${stock} ${unitLabel} باقی ہیں۔ موجودہ رفتار کے مطابق اسٹاک اگلے ${Math.round(hoursToExhaust)} گھنٹوں میں ختم ہونے کا امکان ${Math.round(p48 * 100)}% ہے۔`
        : `اسٹاک کی سطح کم ہے (${stock} ${unitLabel})۔`;

    const reasonEn =
      p48 >= 0.85
        ? `High depletion velocity detected. Stockout within ${Math.round(hoursToExhaust)}h has a ${Math.round(p48 * 100)}% probability.`
        : `Inventory nearing threshold. Suggested reorder: ${suggestedUnits} units.`;

    return {
      item_id: item._id,
      sku: item.sku || 'SKU-GEN',
      item_name: item.itemName,
      category: item.category || 'General',
      current_stock: stock,
      low_stock_threshold: item.lowStockThreshold,
      unit_of_measure: item.unitOfMeasure || 'PCS',
      wholesale_cost: item.wholesaleCost,
      retail_price: item.retailPrice,
      daily_velocity: parseFloat(velocity.toFixed(2)),
      estimated_hours_to_exhaustion: Math.round(hoursToExhaust),
      stockout_probability_48h: p48,
      suggested_order_units: suggestedUnits,
      suggested_supplier_id: item.supplierId || 'sup-1',
      suggested_supplier_name: supplierName,
      suggested_supplier_phone: item.supplierPhone || '03001234567',
      urgency,
      prefilled_whatsapp_po: whatsappPo,
      reason_ur: reasonUr,
      reason_en: reasonEn,
    };
  }
}
