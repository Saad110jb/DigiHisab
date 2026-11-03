import { Request, Response } from 'express';
import {
  MandiWeeklyEnvelope,
  MandiPurchaseLog,
  MandiCategory,
  MandiUnit,
  ICategoryEnvelope,
} from '../models/MandiWeeklyBudget';

// Helper to determine week bounds and ISO week key
export const getWeekInfo = (d: Date = new Date()) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  const weekKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  
  // Calculate Monday of current week
  const curr = new Date(d);
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
  const startDate = new Date(curr.setDate(first));
  startDate.setHours(0, 0, 0, 0);
  
  // Sunday of current week
  const last = first + 6;
  const endDate = new Date(curr.setDate(last));
  endDate.setHours(23, 59, 59, 999);

  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const weekOfMonth = Math.min(5, Math.max(1, Math.ceil(d.getDate() / 7)));

  return { weekKey, monthKey, weekNumber: weekOfMonth, startDate, endDate };
};

export const DEFAULT_CATEGORY_ENVELOPES: ICategoryEnvelope[] = [
  {
    category: 'CHICKEN',
    categoryUrdu: 'مرغی کا گوشت',
    allocatedAmount: 2500,
    spentAmount: 0,
    remainingAmount: 2500,
  },
  {
    category: 'MUTTON_BEEF',
    categoryUrdu: 'بڑا و چھوٹا گوشت',
    allocatedAmount: 3500,
    spentAmount: 0,
    remainingAmount: 3500,
  },
  {
    category: 'FRESH_VEGETABLES',
    categoryUrdu: 'تازہ سبزیاں',
    allocatedAmount: 1500,
    spentAmount: 0,
    remainingAmount: 1500,
  },
  {
    category: 'SEASONAL_FRUITS',
    categoryUrdu: 'موسمی پھل',
    allocatedAmount: 1000,
    spentAmount: 0,
    remainingAmount: 1000,
  },
];

export const MANDI_RATE_BENCHMARKS = [
  {
    category: 'CHICKEN' as MandiCategory,
    categoryUrdu: 'مرغی کا گوشت',
    items: [
      { name: 'صاف برائلر مرغی (Clean Broiler)', unit: 'KG' as MandiUnit, typicalRate: 620, chips: [0.5, 1, 1.5, 2, 2.5] },
      { name: 'زندہ مرغی (Live Poultry)', unit: 'KG' as MandiUnit, typicalRate: 420, chips: [1, 1.5, 2, 2.5, 3] },
      { name: 'بون لیس بریسٹ (Boneless Breast)', unit: 'KG' as MandiUnit, typicalRate: 850, chips: [0.5, 1, 1.5, 2] },
      { name: 'دیسی مرغی (Desi Chicken)', unit: 'KG' as MandiUnit, typicalRate: 1100, chips: [1, 1.5, 2] },
    ],
  },
  {
    category: 'MUTTON_BEEF' as MandiCategory,
    categoryUrdu: 'بڑا و چھوٹا گوشت',
    items: [
      { name: 'بچھیا بغیر ہڈی (Beef Boneless)', unit: 'KG' as MandiUnit, typicalRate: 950, chips: [1, 1.5, 2, 3] },
      { name: 'بچھیا ہڈی والا (Beef with Bone)', unit: 'KG' as MandiUnit, typicalRate: 850, chips: [1, 2, 3] },
      { name: 'بکرے کا گوشت (Mutton Mix)', unit: 'KG' as MandiUnit, typicalRate: 2150, chips: [0.5, 1, 1.5, 2] },
      { name: 'قیمہ بچھیا (Beef Mince)', unit: 'KG' as MandiUnit, typicalRate: 1000, chips: [0.5, 1, 1.5, 2] },
    ],
  },
  {
    category: 'FRESH_VEGETABLES' as MandiCategory,
    categoryUrdu: 'تازہ سبزیاں',
    items: [
      { name: 'پیاز (Onion)', unit: 'KG' as MandiUnit, typicalRate: 130, chips: [1, 2, 3, 5] },
      { name: 'ٹماٹر (Tomato)', unit: 'KG' as MandiUnit, typicalRate: 120, chips: [0.5, 1, 1.5, 2] },
      { name: 'آلو نیا (Fresh Potato)', unit: 'KG' as MandiUnit, typicalRate: 80, chips: [1, 2, 3, 5] },
      { name: 'ادرک و لہسن (Ginger Garlic Mix)', unit: 'PAO' as MandiUnit, typicalRate: 140, chips: [1, 2, 4] },
      { name: 'ہری مرچ و دھنیا (Chili & Coriander)', unit: 'PAO' as MandiUnit, typicalRate: 50, chips: [1, 2] },
    ],
  },
  {
    category: 'SEASONAL_FRUITS' as MandiCategory,
    categoryUrdu: 'موسمی پھل',
    items: [
      { name: 'سیب کالا کلو (Apples Kala Kulu)', unit: 'KG' as MandiUnit, typicalRate: 220, chips: [1, 1.5, 2] },
      { name: 'کیلے درجن (Bananas)', unit: 'DARJAN' as MandiUnit, typicalRate: 140, chips: [1, 2, 3] },
      { name: 'امرود سفید (Fresh Guava)', unit: 'KG' as MandiUnit, typicalRate: 150, chips: [1, 2] },
      { name: 'انار قندھاری (Pomegranate)', unit: 'KG' as MandiUnit, typicalRate: 350, chips: [1, 1.5, 2] },
    ],
  },
];

/**
 * 1. Get Active Week Mandi Budget & Purchases
 * GET /api/v1/domestic/mandi-budget/current-week
 */
export const getCurrentWeekBudget = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { weekKey, monthKey, weekNumber, startDate, endDate } = getWeekInfo();

    let envelope = await MandiWeeklyEnvelope.findOne({ profileId, weekKey });

    if (!envelope) {
      const totalBudget = DEFAULT_CATEGORY_ENVELOPES.reduce((acc, c) => acc + c.allocatedAmount, 0);
      envelope = await MandiWeeklyEnvelope.create({
        profileId,
        weekKey,
        monthKey,
        weekNumber,
        startDate,
        endDate,
        totalWeeklyBudget: totalBudget,
        totalWeeklySpent: 0,
        remainingWeeklyBalance: totalBudget,
        envelopes: DEFAULT_CATEGORY_ENVELOPES,
      });
    }

    const purchases = await MandiPurchaseLog.find({ profileId, weekKey }).sort({ purchaseDate: -1 });

    // Ensure category spent sync
    let totalSpent = 0;
    const catMap = new Map<string, number>();
    purchases.forEach((p) => {
      totalSpent += p.totalAmount;
      catMap.set(p.category, (catMap.get(p.category) || 0) + p.totalAmount);
    });

    let envelopeUpdated = false;
    envelope.envelopes.forEach((cat) => {
      const spent = catMap.get(cat.category) || 0;
      if (cat.spentAmount !== spent || cat.remainingAmount !== (cat.allocatedAmount - spent)) {
        cat.spentAmount = spent;
        cat.remainingAmount = cat.allocatedAmount - spent;
        envelopeUpdated = true;
      }
    });

    if (envelope.totalWeeklySpent !== totalSpent || envelopeUpdated) {
      envelope.totalWeeklySpent = totalSpent;
      envelope.remainingWeeklyBalance = envelope.totalWeeklyBudget - totalSpent;
      await envelope.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        envelope,
        purchases,
        benchmarks: MANDI_RATE_BENCHMARKS,
      },
    });
  } catch (error: any) {
    console.error('getCurrentWeekBudget error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 2. Set/Adjust Weekly Category Envelopes
 * POST /api/v1/domestic/mandi-budget/envelope
 */
export const allocateWeeklyBudget = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { envelopes } = req.body;
    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      return res.status(400).json({ success: false, message: 'Envelopes array is required.' });
    }

    const { weekKey, monthKey, weekNumber, startDate, endDate } = getWeekInfo();

    let envelope = await MandiWeeklyEnvelope.findOne({ profileId, weekKey });

    const totalWeeklyBudget = envelopes.reduce((acc: number, item: any) => acc + (Number(item.allocatedAmount) || 0), 0);

    if (!envelope) {
      envelope = new MandiWeeklyEnvelope({
        profileId,
        weekKey,
        monthKey,
        weekNumber,
        startDate,
        endDate,
        totalWeeklyBudget,
        totalWeeklySpent: 0,
        remainingWeeklyBalance: totalWeeklyBudget,
        envelopes: envelopes.map((e: any) => ({
          category: e.category,
          categoryUrdu: e.categoryUrdu || e.category,
          allocatedAmount: Number(e.allocatedAmount) || 0,
          spentAmount: 0,
          remainingAmount: Number(e.allocatedAmount) || 0,
        })),
      });
    } else {
      envelope.totalWeeklyBudget = totalWeeklyBudget;
      envelope.envelopes = envelopes.map((incoming: any) => {
        const existing = envelope!.envelopes.find((e) => e.category === incoming.category);
        const spent = existing ? existing.spentAmount : 0;
        const allocated = Number(incoming.allocatedAmount) || 0;
        return {
          category: incoming.category,
          categoryUrdu: incoming.categoryUrdu || existing?.categoryUrdu || incoming.category,
          allocatedAmount: allocated,
          spentAmount: spent,
          remainingAmount: allocated - spent,
        };
      });
      envelope.remainingWeeklyBalance = totalWeeklyBudget - envelope.totalWeeklySpent;
    }

    await envelope.save();

    return res.status(200).json({
      success: true,
      message: 'Weekly Mandi budget envelopes updated successfully.',
      data: envelope,
    });
  } catch (error: any) {
    console.error('allocateWeeklyBudget error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 3. Log a Mandi Purchase Trip
 * POST /api/v1/domestic/mandi-budget/purchase
 */
export const logMandiPurchase = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      category,
      itemName,
      quantity,
      unit = 'KG',
      ratePerUnit,
      totalAmount,
      marketSource = 'Sabzi Mandi / Itwar Bazaar',
      paymentMethod = 'CASH',
      purchaseDate = new Date(),
      notes,
    } = req.body;

    if (!category || !itemName || quantity === undefined || ratePerUnit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category, item name, quantity, and rate are required.',
      });
    }

    const qty = Number(quantity);
    const rate = Number(ratePerUnit);
    const calculatedTotal = totalAmount !== undefined ? Number(totalAmount) : Math.round(qty * rate);

    const { weekKey } = getWeekInfo(new Date(purchaseDate));

    // Create purchase log
    const purchase = await MandiPurchaseLog.create({
      profileId,
      weekKey,
      category,
      itemName: String(itemName).trim(),
      quantity: qty,
      unit,
      ratePerUnit: rate,
      totalAmount: calculatedTotal,
      marketSource: String(marketSource).trim(),
      paymentMethod,
      purchaseDate: new Date(purchaseDate),
      notes: notes ? String(notes).trim() : undefined,
    });

    // Update corresponding envelope
    const envelope = await MandiWeeklyEnvelope.findOne({ profileId, weekKey });
    if (envelope) {
      const targetCat = envelope.envelopes.find((c) => c.category === category);
      if (targetCat) {
        targetCat.spentAmount += calculatedTotal;
        targetCat.remainingAmount = targetCat.allocatedAmount - targetCat.spentAmount;
      }
      envelope.totalWeeklySpent += calculatedTotal;
      envelope.remainingWeeklyBalance = envelope.totalWeeklyBudget - envelope.totalWeeklySpent;
      await envelope.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Mandi purchase logged and envelope balance updated.',
      data: {
        purchase,
        envelope,
      },
    });
  } catch (error: any) {
    console.error('logMandiPurchase error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 4. Delete / Reverse a Purchase
 * DELETE /api/v1/domestic/mandi-budget/purchase/:id
 */
export const deleteMandiPurchase = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { id } = req.params;

    const purchase = await MandiPurchaseLog.findOneAndDelete({ _id: id, profileId });
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found.' });
    }

    // Reconcile envelope
    const envelope = await MandiWeeklyEnvelope.findOne({ profileId, weekKey: purchase.weekKey });
    if (envelope) {
      const targetCat = envelope.envelopes.find((c) => c.category === purchase.category);
      if (targetCat) {
        targetCat.spentAmount = Math.max(0, targetCat.spentAmount - purchase.totalAmount);
        targetCat.remainingAmount = targetCat.allocatedAmount - targetCat.spentAmount;
      }
      envelope.totalWeeklySpent = Math.max(0, envelope.totalWeeklySpent - purchase.totalAmount);
      envelope.remainingWeeklyBalance = envelope.totalWeeklyBudget - envelope.totalWeeklySpent;
      await envelope.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Purchase deleted and envelope balance restored.',
      data: envelope,
    });
  } catch (error: any) {
    console.error('deleteMandiPurchase error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 5. Get Rate Benchmarks
 * GET /api/v1/domestic/mandi-budget/rate-benchmarks
 */
export const getRateBenchmarks = async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: MANDI_RATE_BENCHMARKS,
  });
};
