import { Request, Response } from 'express';
import {
  PantryItem,
  HouseholdPantryProfile,
  IPantryItem,
  PantryCategory,
  PantryUnit,
} from '../models/PantryInventory';
import { Profile } from '../models/Profile';

// Standard Pakistani per-person daily consumption baselines
export const PER_PERSON_DAILY_NORMS: {
  [key: string]: {
    nameUrdu: string;
    nameEnglish: string;
    category: PantryCategory;
    unit: PantryUnit;
    standardPackQty: number;
    perPersonDaily: number; // in units (KG/Litre)
    sampleElapsedDays: number;
  };
} = {
  atta: {
    nameUrdu: 'چکی آٹا (Wheat Flour)',
    nameEnglish: 'Chakki Atta',
    category: 'GRAIN',
    unit: 'KG',
    standardPackQty: 20,
    perPersonDaily: 0.2, // 5 persons = 1.0 KG/day -> 20 days
    sampleElapsedDays: 18, // 2 days remaining (Urgent!)
  },
  oil: {
    nameUrdu: 'کوکنگ آئل / گھی (Cooking Oil)',
    nameEnglish: 'Cooking Oil / Ghee',
    category: 'OIL_GHEE',
    unit: 'LITRE',
    standardPackQty: 5,
    perPersonDaily: 0.035, // 5 persons = 0.175 L/day -> 28 days
    sampleElapsedDays: 25, // 3 days remaining (Urgent!)
  },
  tea: {
    nameUrdu: 'دانے دار چائے (Tapal Danedar)',
    nameEnglish: 'Black Tea',
    category: 'TEA_BEVERAGE',
    unit: 'GRAM',
    standardPackQty: 900,
    perPersonDaily: 7, // 5 persons = 35g/day -> 25 days
    sampleElapsedDays: 24, // 1 day remaining (Urgent!)
  },
  sugar: {
    nameUrdu: 'سفید چینی (White Sugar)',
    nameEnglish: 'White Sugar',
    category: 'SWEETENER',
    unit: 'KG',
    standardPackQty: 5,
    perPersonDaily: 0.045, // 5 persons = 0.225 KG/day -> 22 days
    sampleElapsedDays: 16, // 6 days remaining (Upcoming)
  },
  rice: {
    nameUrdu: 'باسمتی چاول (Basmati Rice)',
    nameEnglish: 'Super Basmati Rice',
    category: 'GRAIN',
    unit: 'KG',
    standardPackQty: 5,
    perPersonDaily: 0.06, // 5 persons = 0.300 KG/day -> 16 days
    sampleElapsedDays: 11, // 5 days remaining (Upcoming)
  },
  daal_chana: {
    nameUrdu: 'دال چنا (Daal Chana)',
    nameEnglish: 'Split Gram Pulse',
    category: 'PULSE',
    unit: 'KG',
    standardPackQty: 2,
    perPersonDaily: 0.035, // 5 persons = 0.175 KG/day -> 11 days
    sampleElapsedDays: 7, // 4 days remaining (Upcoming)
  },
  red_chili: {
    nameUrdu: 'لال مرچ پاؤڈر (Red Chili)',
    nameEnglish: 'Red Chili Powder',
    category: 'SPICE',
    unit: 'GRAM',
    standardPackQty: 500,
    perPersonDaily: 5, // 5 persons = 25g/day -> 20 days
    sampleElapsedDays: 8, // 12 days remaining (Safe)
  },
  salt: {
    nameUrdu: 'آیوڈائزڈ نمک (National Salt)',
    nameEnglish: 'Iodized Salt',
    category: 'SPICE',
    unit: 'GRAM',
    standardPackQty: 800,
    perPersonDaily: 10, // 5 persons = 50g/day -> 16 days
    sampleElapsedDays: 6, // 10 days remaining (Safe)
  },
};

// Recalculates depletion state dynamically based on purchase date and burn rate
export const computeDepletion = (item: IPantryItem, now: Date = new Date()) => {
  const purchaseTime = new Date(item.purchaseDate).getTime();
  const diffDays = Math.max(0, (now.getTime() - purchaseTime) / (1000 * 60 * 60 * 24));

  const consumedQty = Math.min(item.initialStockQty, diffDays * item.dailyBurnRate);
  const currentStock = Math.max(0, item.initialStockQty - consumedQty);

  const daysRemaining =
    item.dailyBurnRate > 0 ? Math.max(0, Math.floor(currentStock / item.dailyBurnRate)) : 999;

  const reservePercentage =
    item.initialStockQty > 0
      ? Math.max(0, Math.min(100, Math.round((currentStock / item.initialStockQty) * 100)))
      : 0;

  const isUrgentRestock = daysRemaining <= 3 || reservePercentage <= 15;
  const depletionDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

  item.currentStockQty = Math.round(currentStock * 100) / 100;
  item.daysRemaining = daysRemaining;
  item.reservePercentage = reservePercentage;
  item.isUrgentRestock = isUrgentRestock;
  item.depletionDate = depletionDate;

  return item;
};

// Generates 1-Tap Formatted WhatsApp Checklist Text
export const generateWhatsAppChecklistText = (
  items: IPantryItem[],
  householdName: string = 'Saad Family',
  householdSize: number = 5
): string => {
  const urgent = items.filter((i) => i.daysRemaining <= 3);
  const upcoming = items.filter((i) => i.daysRemaining > 3 && i.daysRemaining <= 7);

  const todayStr = new Date().toLocaleDateString('ur-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let text = `🛒 *ڈیجی حساب - راشن پینٹری و سودا لسٹ (Auto-Restock Checklist)*\n`;
  text += `🏡 *گھرانہ:* ${householdName} (${householdSize} افرادِ خانہ)\n`;
  text += `📅 *تاریخ:* ${todayStr}\n\n`;

  if (urgent.length > 0) {
    text += `🚨 *فوری ختم ہونے والے اشیاء (3 دن یا کم باقی):*\n`;
    urgent.forEach((item, idx) => {
      text += `[ ] ${idx + 1}. *${item.nameUrdu}* — ${item.initialStockQty} ${item.unit} (صرف ${item.daysRemaining} دن باقی • ~${item.currentStockQty} ${item.unit} بچا)\n`;
    });
    text += `\n`;
  }

  if (upcoming.length > 0) {
    text += `⚠️ *اس ہفتے ختم ہونے والے اشیاء (4 تا 7 دن باقی):*\n`;
    upcoming.forEach((item, idx) => {
      text += `[ ] ${idx + 1}. *${item.nameUrdu}* — ${item.initialStockQty} ${item.unit} (${item.daysRemaining} دن باقی)\n`;
    });
    text += `\n`;
  }

  if (urgent.length === 0 && upcoming.length === 0) {
    text += `✅ *ماشاءاللہ! تمام بنیادی راشن کا ذخیرہ آئندہ ہفتے کے لیے محفوظ ہے۔*\n\n`;
  }

  text += `_یہ لسٹ Digi Hisab AI Pantry Guard کے ذریعے خودکار تیار کی گئی ہے۔_`;
  return text;
};

/**
 * 1. Get Live Pantry Status & Depletion Forecast
 * GET /api/v1/domestic/pantry/status
 */
export const getPantryStatus = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Find or create household profile
    let pantryProfile = await HouseholdPantryProfile.findOne({ profileId });
    if (!pantryProfile) {
      const userProfile = await Profile.findById(profileId);
      pantryProfile = await HouseholdPantryProfile.create({
        profileId,
        householdSize: 5,
        dietaryProfile: 'MODERATE',
        whatsappTargetPhone: userProfile?.phone || '',
      });
    }

    const householdSize = pantryProfile.householdSize || 5;
    const now = new Date();

    let items = await PantryItem.find({ profileId });

    // Auto-seed core Pakistani staples if empty
    if (items.length === 0) {
      const seeded: any[] = [];
      for (const [key, meta] of Object.entries(PER_PERSON_DAILY_NORMS)) {
        const dailyBurn = Math.round(meta.perPersonDaily * householdSize * 1000) / 1000;
        const purchaseDate = new Date(now.getTime() - meta.sampleElapsedDays * 24 * 60 * 60 * 1000);
        const expectedDays = Math.round(meta.standardPackQty / dailyBurn);

        seeded.push({
          profileId,
          nameUrdu: meta.nameUrdu,
          nameEnglish: meta.nameEnglish,
          category: meta.category,
          initialStockQty: meta.standardPackQty,
          currentStockQty: meta.standardPackQty,
          unit: meta.unit,
          purchaseDate,
          dailyBurnRate: dailyBurn,
          expectedDays,
          recommendedRestockQty: meta.standardPackQty,
          daysRemaining: 10,
          reservePercentage: 50,
          isUrgentRestock: false,
        });
      }

      await PantryItem.insertMany(seeded);
      items = await PantryItem.find({ profileId });
    }

    // Run depletion math on all items
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        computeDepletion(item, now);
        await item.save();
        return item;
      })
    );

    // Sort by days remaining ascending (urgent items at top)
    updatedItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const urgentCount = updatedItems.filter((i) => i.isUrgentRestock).length;
    const upcomingCount = updatedItems.filter((i) => i.daysRemaining > 3 && i.daysRemaining <= 7).length;

    const userProfile = await Profile.findById(profileId);
    const whatsAppText = generateWhatsAppChecklistText(
      updatedItems,
      userProfile?.fullName || 'Saad Household',
      householdSize
    );

    return res.status(200).json({
      success: true,
      data: {
        profile: pantryProfile,
        householdSize,
        urgentCount,
        upcomingCount,
        totalItemsCount: updatedItems.length,
        items: updatedItems,
        whatsAppText,
      },
    });
  } catch (error: any) {
    console.error('getPantryStatus error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 2. Add Custom Pantry Staple
 * POST /api/v1/domestic/pantry/item
 */
export const addPantryItem = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      nameUrdu,
      nameEnglish,
      category = 'GRAIN',
      initialStockQty,
      unit = 'KG',
      purchaseDate = new Date(),
      perPersonDailyNorm,
      customDailyBurn,
      recommendedRestockQty,
      notes,
    } = req.body;

    if (!nameUrdu || !initialStockQty) {
      return res.status(400).json({
        success: false,
        message: 'Name and initial quantity are required.',
      });
    }

    const pantryProfile = await HouseholdPantryProfile.findOne({ profileId });
    const householdSize = pantryProfile?.householdSize || 5;

    let dailyBurn = customDailyBurn ? parseFloat(customDailyBurn) : 0;
    if (!dailyBurn) {
      const norm = perPersonDailyNorm ? parseFloat(perPersonDailyNorm) : 0.05;
      dailyBurn = Math.round(norm * householdSize * 1000) / 1000;
    }

    const qty = parseFloat(initialStockQty);
    const expectedDays = dailyBurn > 0 ? Math.round(qty / dailyBurn) : 30;

    const newItem = new PantryItem({
      profileId,
      nameUrdu: String(nameUrdu).trim(),
      nameEnglish: nameEnglish ? String(nameEnglish).trim() : String(nameUrdu).trim(),
      category,
      initialStockQty: qty,
      currentStockQty: qty,
      unit,
      purchaseDate: new Date(purchaseDate),
      dailyBurnRate: dailyBurn,
      expectedDays,
      daysRemaining: expectedDays,
      reservePercentage: 100,
      isUrgentRestock: false,
      recommendedRestockQty: recommendedRestockQty ? parseFloat(recommendedRestockQty) : qty,
      notes,
    });

    computeDepletion(newItem);
    await newItem.save();

    return res.status(201).json({
      success: true,
      message: 'Pantry item added successfully.',
      data: newItem,
    });
  } catch (error: any) {
    console.error('addPantryItem error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 3. Restock Pantry Item (1-Tap Reset)
 * PATCH /api/v1/domestic/pantry/item/:id/restock
 */
export const restockPantryItem = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { id } = req.params;
    const { restockQty, newPurchaseDate } = req.body;

    const item = await PantryItem.findOne({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const qty = restockQty ? parseFloat(restockQty) : item.initialStockQty;
    item.initialStockQty = qty;
    item.currentStockQty = qty;
    item.purchaseDate = newPurchaseDate ? new Date(newPurchaseDate) : new Date();
    item.lastRestockedDate = new Date();

    computeDepletion(item);
    await item.save();

    return res.status(200).json({
      success: true,
      message: `${item.nameUrdu} دوبارہ بھر دیا گیا ہے۔ ذخیرہ مکمل بحال ہو چکا ہے۔`,
      data: item,
    });
  } catch (error: any) {
    console.error('restockPantryItem error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 4. Adjust Current Stock (e.g. Guests arrived or wastage)
 * PATCH /api/v1/domestic/pantry/item/:id/adjust
 */
export const adjustPantryStock = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { id } = req.params;
    const { currentStockQty } = req.body;

    if (currentStockQty === undefined) {
      return res.status(400).json({ success: false, message: 'currentStockQty is required.' });
    }

    const item = await PantryItem.findOne({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const newStock = Math.max(0, parseFloat(currentStockQty));
    const now = new Date();

    // Adjust purchase date back/forward to match the newStock level with dailyBurnRate
    const daysConsumedEquivalent =
      item.dailyBurnRate > 0 ? (item.initialStockQty - newStock) / item.dailyBurnRate : 0;
    item.purchaseDate = new Date(now.getTime() - Math.max(0, daysConsumedEquivalent) * 24 * 60 * 60 * 1000);
    item.currentStockQty = newStock;

    computeDepletion(item, now);
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'اسٹاک کی مقدار کامیابی سے درست کر دی گئی ہے۔',
      data: item,
    });
  } catch (error: any) {
    console.error('adjustPantryStock error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 5. Delete Item
 * DELETE /api/v1/domestic/pantry/item/:id
 */
export const deletePantryItem = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { id } = req.params;

    const item = await PantryItem.findOneAndDelete({ _id: id, profileId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'آئٹم پینٹری لسٹ سے خارج کر دیا گیا ہے۔',
    });
  } catch (error: any) {
    console.error('deletePantryItem error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * 6. Update Household Profile & Recalculate Burn Rates
 * POST /api/v1/domestic/pantry/profile
 */
export const updatePantryProfile = async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { householdSize, dietaryProfile, whatsappTargetPhone } = req.body;

    let pantryProfile = await HouseholdPantryProfile.findOne({ profileId });
    if (!pantryProfile) {
      pantryProfile = new HouseholdPantryProfile({ profileId });
    }

    const oldSize = pantryProfile.householdSize || 5;
    const newSize = householdSize ? parseInt(householdSize, 10) : oldSize;

    pantryProfile.householdSize = newSize;
    if (dietaryProfile) pantryProfile.dietaryProfile = dietaryProfile;
    if (whatsappTargetPhone !== undefined) pantryProfile.whatsappTargetPhone = String(whatsappTargetPhone).trim();

    await pantryProfile.save();

    // Scale dailyBurnRate across all items proportionally if size changed
    if (oldSize !== newSize && newSize > 0) {
      const items = await PantryItem.find({ profileId });
      const now = new Date();
      await Promise.all(
        items.map(async (item) => {
          const basePerPerson = item.dailyBurnRate / oldSize;
          item.dailyBurnRate = Math.round(basePerPerson * newSize * 1000) / 1000;
          computeDepletion(item, now);
          await item.save();
        })
      );
    }

    return res.status(200).json({
      success: true,
      message: `افرادِ خانہ کی تعداد (${newSize}) کے مطابق کھپت کی شرح اپ ڈیٹ ہو گئی ہے۔`,
      data: pantryProfile,
    });
  } catch (error: any) {
    console.error('updatePantryProfile error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
