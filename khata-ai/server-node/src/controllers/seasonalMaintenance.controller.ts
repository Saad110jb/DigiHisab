import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { HouseholdAsset, IHouseholdAsset } from '../models/HouseholdAsset';
import { DomesticMaintenanceLog, IDomesticMaintenanceLog } from '../models/DomesticMaintenanceLog';
import { VaultAccount, SavingsBucket } from '../models/HouseholdVault';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * Auto-Seed Sample Pakistani Household Appliances & Maintenance History
 */
const seedPakistaniAppliancesIfEmpty = async (profileId: string) => {
  const count = await HouseholdAsset.countDocuments({ profileId, isDecommissioned: { $ne: true } });
  if (count > 0) return;

  const now = new Date();
  
  // 1. Gree Inverter AC (Lounge)
  const acServiceDue = new Date(now.getFullYear(), 3, 15); // April 15
  if (acServiceDue < now) acServiceDue.setFullYear(now.getFullYear() + 1);

  const acAsset = await HouseholdAsset.create({
    profileId,
    assetName: 'Gree 1.5 Ton Inverter AC (ڈرائنگ و لاؤنج)',
    category: 'AC_INVERTER',
    roomLocation: 'مین لاؤنج',
    brandModel: 'Gree Fairy 18FITH',
    purchaseDate: new Date('2023-04-10'),
    purchasePrice: 165000,
    warrantyExpiryDate: new Date('2026-04-10'),
    preSeasonReminderMonth: 4, // April
    serviceIntervalDays: 180,
    lastServicedDate: new Date('2026-04-05'),
    nextServiceDueDate: acServiceDue,
    cumulativeRepairCost: 7500,
    notes: 'R410A ریفریجرنٹ گیس، کیمیکل واش ہر سال اپریل میں ضروری ہے۔',
  });

  // 2. Canon Instant Gas Geyser (Master Bath)
  const geyserServiceDue = new Date(now.getFullYear(), 9, 20); // October 20
  if (geyserServiceDue < now && now.getMonth() > 9) geyserServiceDue.setFullYear(now.getFullYear() + 1);

  const geyserAsset = await HouseholdAsset.create({
    profileId,
    assetName: 'Canon 12L انسٹنٹ گیس گیزر (ماسٹر باتھ روم)',
    category: 'GEYSER_GAS_ELECTRIC',
    roomLocation: 'ماسٹر بیڈ روم باتھ',
    brandModel: 'Canon Automatic 12-Ltr',
    purchaseDate: new Date('2022-11-15'),
    purchasePrice: 32000,
    warrantyExpiryDate: new Date('2024-11-15'),
    preSeasonReminderMonth: 10, // October
    serviceIntervalDays: 365,
    lastServicedDate: new Date('2025-10-22'),
    nextServiceDueDate: geyserServiceDue,
    cumulativeRepairCost: 14500, // Approaching 50%
    notes: 'برنر میں کاربن جم جاتی ہے، سردیوں سے قبل پائلٹ جیٹ صفائی کروائیں۔',
  });

  // 3. Osaka Tubular UPS Battery (UPS Cabinet)
  const upsServiceDue = new Date();
  upsServiceDue.setDate(now.getDate() + 7); // Due in 7 days!

  const upsAsset = await HouseholdAsset.create({
    profileId,
    assetName: 'Osaka Tubular 200Ah یو پی ایس بیٹری',
    category: 'UPS_BATTERY',
    roomLocation: 'سیڑھیوں کے نیچے یو پی ایس الماری',
    brandModel: 'Osaka Tubular TR-2000',
    purchaseDate: new Date('2024-06-20'),
    purchasePrice: 58000,
    warrantyExpiryDate: new Date('2025-06-20'),
    preSeasonReminderMonth: 5, // May
    serviceIntervalDays: 45,
    lastServicedDate: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000), // 38 days ago
    nextServiceDueDate: upsServiceDue,
    cumulativeRepairCost: 3200,
    notes: 'ہر 45 دن بعد مقطر پانی (Distilled water) کا لیول چیک کرنا لازمی ہے۔',
  });

  // 4. Golden Pump 1HP Donkey Motor (Underground Tank)
  const motorServiceDue = new Date(now.getFullYear(), 5, 10); // June 10
  if (motorServiceDue < now) motorServiceDue.setFullYear(now.getFullYear() + 1);

  const motorAsset = await HouseholdAsset.create({
    profileId,
    assetName: 'Golden Pump 1HP ڈونکی موٹر (زیرِ زمین ٹینک)',
    category: 'WATER_MOTOR_PUMP',
    roomLocation: 'گلی گراؤنڈ فلور / واٹر ٹینک',
    brandModel: 'Golden Pump Heavy Duty 1HP',
    purchaseDate: new Date('2021-08-01'),
    purchasePrice: 22000,
    warrantyExpiryDate: new Date('2022-08-01'),
    preSeasonReminderMonth: 6, // June
    serviceIntervalDays: 180,
    lastServicedDate: new Date('2026-06-01'),
    nextServiceDueDate: motorServiceDue,
    cumulativeRepairCost: 12500, // > 50% -> Money pit!
    notes: 'کپیسیٹر اور واٹر سیل 2 مرتبہ تبدیل ہو چکی ہے۔',
  });

  // Seed Initial Maintenance Logs with Parts Warranties
  const partExp1 = new Date();
  partExp1.setDate(now.getDate() + 65); // 65 days warranty left
  
  await DomesticMaintenanceLog.create({
    profileId,
    assetId: acAsset._id,
    maintenanceType: 'HVAC_AC',
    seasonType: 'PRE_SUMMER_AC',
    description: 'اؤٹ ڈور کوائل کیمیکل واش اور آؤٹ ڈور فین کپیسیٹر تبدیلی',
    cost: 4500,
    serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    technicianName: 'استاد رشید (AC اسپیشلسٹ)',
    technicianPhone: '03009412345',
    technicianTrade: 'AC_TECHNICIAN',
    partsReplaced: [
      {
        partName: 'AC رن کپیسیٹر 50+5 uF',
        cost: 1800,
        warrantyMonths: 3,
        warrantyExpiresAt: partExp1,
        vendorShopName: 'الحرمین الیکٹرانکس مارکیٹ',
      },
    ],
    sinkingFundBucket: 'Home & Vehicle Sinking Reserve',
    syncToLedger: true,
  });

  const partExp2 = new Date();
  partExp2.setDate(now.getDate() + 18); // 18 days warranty left

  await DomesticMaintenanceLog.create({
    profileId,
    assetId: geyserAsset._id,
    maintenanceType: 'PLUMBING',
    seasonType: 'PRE_WINTER_GEYSER',
    description: 'تھرموسٹیٹ راڈ تبدیلی اور گیزر برنر ڈیسکیلنگ',
    cost: 3800,
    serviceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    technicianName: 'ماسٹر طارق (پلمبر و گیزر ماسٹر)',
    technicianPhone: '03214567890',
    technicianTrade: 'PLUMBER',
    partsReplaced: [
      {
        partName: 'اٹالین تھرموسٹیٹ راڈ',
        cost: 2200,
        warrantyMonths: 2,
        warrantyExpiresAt: partExp2,
        vendorShopName: 'بسم اللہ سینیٹری اسٹور',
      },
    ],
    sinkingFundBucket: 'Home & Vehicle Sinking Reserve',
    syncToLedger: true,
  });
};

/**
 * 1. Get Seasonal Dashboard & Overview Radar
 * GET /api/v1/domestic/maintenance/dashboard
 */
export const getSeasonalMaintenanceDashboard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    await seedPakistaniAppliancesIfEmpty(profileId);

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1 = Jan, 10 = Oct, etc.

    // 1. Determine Current Active Seasonal Wave in Pakistan
    let seasonalWave = {
      seasonKey: 'PRE_SUMMER_AC',
      titleUrdu: 'موسمِ گرما کی تیاری (AC و کولنگ سروس)',
      titleEnglish: 'Pre-Summer AC & Cooling Blitz',
      descriptionUrdu: 'گرمیوں سے قبل انورٹر ACs کی کیمیکل واش اور گیس پریشر چیک کروائیں تاکہ پیک سلیب اور ایمرجنسی چارجز سے بچا جا سکے۔',
      recommendedCategory: 'AC_INVERTER',
      accentColor: '#38BDF8',
      urgency: 'HIGH',
    };

    if (currentMonth >= 9 && currentMonth <= 11) {
      // Sep, Oct, Nov: Pre-Winter Geyser Wave
      seasonalWave = {
        seasonKey: 'PRE_WINTER_GEYSER',
        titleUrdu: 'موسمِ سرما کی تیاری (گیزر و ہیٹر سروس)',
        titleEnglish: 'Pre-Winter Geyser & Heater Preparation',
        descriptionUrdu: 'سردیوں کی آمد سے قبل گیزر برنرز، تھرموسٹیٹ اور ایگزاسٹ والو کا معائنہ کروائیں تاکہ گیس پریشر کمی میں گرم پانی بلا تعطل ملے۔',
        recommendedCategory: 'GEYSER_GAS_ELECTRIC',
        accentColor: '#F59E0B',
        urgency: 'URGENT',
      };
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      // Jun, Jul, Aug: Monsoon & Water Motor
      seasonalWave = {
        seasonKey: 'MONSOON_WATER',
        titleUrdu: 'بارش و مون سون دیکھ بھال (واٹر موٹر و چھت)',
        titleEnglish: 'Monsoon Water Pump & Roof Drainage',
        descriptionUrdu: 'مون سون بارشوں سے قبل چھت کی ڈرین اور زیرِ زمین واٹر پمپ کی سیل کا معائنہ کروائیں تاکہ پانی کے بحران سے بچا جا سکے۔',
        recommendedCategory: 'WATER_MOTOR_PUMP',
        accentColor: '#10B981',
        urgency: 'MEDIUM',
      };
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      // Mar, Apr, May: Summer AC
      seasonalWave = {
        seasonKey: 'PRE_SUMMER_AC',
        titleUrdu: 'موسمِ گرما کی تیاری (AC و کولنگ سروس)',
        titleEnglish: 'Pre-Summer Inverter AC Servicing',
        descriptionUrdu: 'اپریل کی گرمی سے قبل تمام انورٹر ACs کی کیمیکل واش اور گیس لیول چیک کروائیں تاکہ بجلی کے یونٹس کنٹرول میں رہیں۔',
        recommendedCategory: 'AC_INVERTER',
        accentColor: '#38BDF8',
        urgency: 'URGENT',
      };
    }

    // 2. Fetch Household Appliances
    const assets = await HouseholdAsset.find({
      profileId,
      isDecommissioned: { $ne: true },
    }).sort({ nextServiceDueDate: 1 });

    // 3. Calculate Money-Pit Assets (> 50% repair cost) & Service Due Counts
    let dueSoonCount = 0;
    let moneyPitCount = 0;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const assetListWithFlags = assets.map((asset) => {
      const isMoneyPit =
        asset.purchasePrice && asset.purchasePrice > 0
          ? asset.cumulativeRepairCost >= asset.purchasePrice * 0.5
          : false;

      if (isMoneyPit) moneyPitCount++;

      let isDueSoon = false;
      let daysRemaining = null;
      if (asset.nextServiceDueDate) {
        const diffTime = new Date(asset.nextServiceDueDate).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          isDueSoon = true;
          dueSoonCount++;
        }
      }

      return {
        ...asset.toObject(),
        isMoneyPit,
        repairToPriceRatio:
          asset.purchasePrice && asset.purchasePrice > 0
            ? Math.round((asset.cumulativeRepairCost / asset.purchasePrice) * 100)
            : 0,
        daysRemaining,
        isDueSoon,
      };
    });

    // 4. Fetch Active Parts Warranties
    const recentLogs = await DomesticMaintenanceLog.find({
      profileId,
      'partsReplaced.warrantyExpiresAt': { $gte: now },
    })
      .populate('assetId', 'assetName category')
      .sort({ 'partsReplaced.warrantyExpiresAt': 1 })
      .limit(10);

    const activeWarranties: any[] = [];
    recentLogs.forEach((log) => {
      (log.partsReplaced || []).forEach((part) => {
        if (part.warrantyExpiresAt && new Date(part.warrantyExpiresAt) >= now) {
          const diffDays = Math.ceil(
            (new Date(part.warrantyExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          activeWarranties.push({
            partName: part.partName,
            cost: part.cost,
            vendorShopName: part.vendorShopName || 'لوکل مارکیٹ',
            warrantyMonths: part.warrantyMonths,
            warrantyExpiresAt: part.warrantyExpiresAt,
            daysRemaining: diffDays,
            assetName: (log.assetId as any)?.assetName || 'گھریلو سامان',
            technicianName: log.technicianName,
            serviceDate: log.serviceDate,
          });
        }
      });
    });

    // 5. Calculate Current Month Total Maintenance Spend
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLogs = await DomesticMaintenanceLog.find({
      profileId,
      serviceDate: { $gte: startOfMonth },
    });
    const currentMonthSpend = monthLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

    // 6. Check Available Home Repair Sinking Fund Reserve from HouseholdVault
    const repairBucket = await SavingsBucket.findOne({
      profileId,
      category: 'HOME_REPAIR',
    });
    const sinkingFundReserve = repairBucket ? repairBucket.currentSavedAmount : 35000;

    // 7. Extract UPS Battery Specific Status
    const upsAsset = assetListWithFlags.find((a) => a.category === 'UPS_BATTERY');

    return res.status(200).json({
      success: true,
      data: {
        seasonalWave,
        summary: {
          totalAssets: assets.length,
          dueSoonCount,
          moneyPitCount,
          activeWarrantiesCount: activeWarranties.length,
          currentMonthSpend,
          sinkingFundReserve,
        },
        upsStatus: upsAsset
          ? {
              assetName: upsAsset.assetName,
              lastServicedDate: upsAsset.lastServicedDate,
              nextServiceDueDate: upsAsset.nextServiceDueDate,
              daysRemaining: upsAsset.daysRemaining,
              isDue: upsAsset.daysRemaining !== null && upsAsset.daysRemaining <= 7,
            }
          : null,
        activeWarranties,
        assets: assetListWithFlags,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get All Household Appliances
 * GET /api/v1/domestic/maintenance/assets
 */
export const getHouseholdApplianceList = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';
    const now = new Date();

    const assets = await HouseholdAsset.find({
      profileId,
      isDecommissioned: { $ne: true },
    }).sort({ nextServiceDueDate: 1 });

    const formatted = assets.map((asset) => {
      const isMoneyPit =
        asset.purchasePrice && asset.purchasePrice > 0
          ? asset.cumulativeRepairCost >= asset.purchasePrice * 0.5
          : false;

      let daysRemaining = null;
      if (asset.nextServiceDueDate) {
        const diffTime = new Date(asset.nextServiceDueDate).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...asset.toObject(),
        isMoneyPit,
        repairRatio:
          asset.purchasePrice && asset.purchasePrice > 0
            ? Math.round((asset.cumulativeRepairCost / asset.purchasePrice) * 100)
            : 0,
        daysRemaining,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Register New Household Appliance
 * POST /api/v1/domestic/maintenance/assets
 */
export const createHouseholdAppliance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';
    const {
      assetName,
      category,
      roomLocation,
      brandModel,
      purchaseDate,
      purchasePrice = 0,
      preSeasonReminderMonth,
      serviceIntervalDays = 180,
      serialNumber,
      warrantyExpiryDate,
      notes,
    } = req.body;

    if (!assetName || !category) {
      return res.status(400).json({
        success: false,
        message: 'Asset name and category are required.',
      });
    }

    const now = new Date();
    let nextServiceDueDate = new Date();
    if (preSeasonReminderMonth && preSeasonReminderMonth >= 1 && preSeasonReminderMonth <= 12) {
      let targetYear = now.getFullYear();
      if (now.getMonth() + 1 > preSeasonReminderMonth) {
        targetYear += 1;
      }
      nextServiceDueDate = new Date(targetYear, preSeasonReminderMonth - 1, 15);
    } else {
      nextServiceDueDate.setDate(now.getDate() + Number(serviceIntervalDays || 180));
    }

    const newAsset = await HouseholdAsset.create({
      profileId,
      assetName: assetName.trim(),
      category,
      roomLocation: roomLocation ? roomLocation.trim() : undefined,
      brandModel: brandModel ? brandModel.trim() : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchasePrice: Number(purchasePrice),
      warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined,
      serialNumber: serialNumber ? serialNumber.trim() : undefined,
      preSeasonReminderMonth: preSeasonReminderMonth ? Number(preSeasonReminderMonth) : undefined,
      serviceIntervalDays: Number(serviceIntervalDays || 180),
      lastServicedDate: new Date(),
      nextServiceDueDate,
      cumulativeRepairCost: 0,
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Appliance successfully added to home portfolio.',
      data: newAsset,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Log Maintenance / Service Job & Sync to Vault
 * POST /api/v1/domestic/maintenance/jobs
 */
export const logMaintenanceJob = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';
    const subAccountId = req.user?.subAccountId;
    const {
      assetId,
      maintenanceType,
      seasonType = 'ROUTINE',
      description,
      cost,
      serviceDate,
      technicianName,
      technicianPhone,
      technicianTrade = 'GENERAL',
      partsReplaced = [],
      vaultAccountId,
      sinkingFundBucket = 'Home & Vehicle Sinking Reserve',
      syncToLedger = true,
      paymentMode = 'CASH',
      notes,
    } = req.body;

    if (!assetId || !description || cost === undefined || Number(cost) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid assetId, description, and repair cost are required.',
      });
    }

    const numericCost = Number(cost);
    const parsedServiceDate = serviceDate ? new Date(serviceDate) : new Date();

    // Map Parts Replaced with Warranty Expiry Dates
    const processedParts = (partsReplaced || []).map((p: any) => {
      const months = Number(p.warrantyMonths || 0);
      let warrantyExpiresAt = undefined;
      if (months > 0) {
        warrantyExpiresAt = new Date(parsedServiceDate);
        warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + months * 30);
      }
      return {
        partName: p.partName,
        cost: Number(p.cost || 0),
        warrantyMonths: months,
        warrantyExpiresAt,
        vendorShopName: p.vendorShopName,
      };
    });

    // Determine Next Service Reminder Date based on Asset serviceIntervalDays
    const asset = await HouseholdAsset.findOne({ _id: assetId, profileId });
    let nextServiceReminderDate = undefined;
    if (asset) {
      const intervalDays = asset.serviceIntervalDays || 180;
      nextServiceReminderDate = new Date(parsedServiceDate);
      nextServiceReminderDate.setDate(nextServiceReminderDate.getDate() + intervalDays);
    }

    // 1. Create Maintenance Log Record
    const log = await DomesticMaintenanceLog.create({
      profileId,
      assetId: new Types.ObjectId(assetId),
      maintenanceType: maintenanceType || 'GENERAL_REPAIR',
      seasonType,
      description: description.trim(),
      cost: numericCost,
      serviceDate: parsedServiceDate,
      nextServiceReminderDate,
      technicianName: technicianName ? technicianName.trim() : undefined,
      technicianPhone: technicianPhone ? technicianPhone.trim() : undefined,
      technicianTrade,
      partsReplaced: processedParts,
      vaultAccountId: vaultAccountId ? new Types.ObjectId(vaultAccountId) : undefined,
      sinkingFundBucket,
      syncToLedger,
      notes: notes ? notes.trim() : undefined,
    });

    // 2. Update Asset Last Service & Cumulative Cost
    if (asset) {
      asset.lastServicedDate = parsedServiceDate;
      if (nextServiceReminderDate) {
        asset.nextServiceDueDate = nextServiceReminderDate;
      }
      asset.cumulativeRepairCost = (asset.cumulativeRepairCost || 0) + numericCost;
      await asset.save();
    }

    // 3. 1-Tap Vault Account Deduction & Double-Entry Sync
    if (vaultAccountId && numericCost > 0) {
      await VaultAccount.updateOne(
        { _id: vaultAccountId, profileId },
        { $inc: { currentBalance: -numericCost } }
      );

      // Decrement Sinking Bucket if matched
      await SavingsBucket.updateOne(
        { profileId, category: 'HOME_REPAIR' },
        { $inc: { currentSavedAmount: -numericCost } }
      );
    }

    // 4. Record Double-Entry CASH_OUT Ledger Entry
    if (syncToLedger && numericCost > 0) {
      await LedgerEntry.create({
        profileId,
        subAccountId,
        entryType: 'CASH_OUT',
        amount: numericCost,
        paymentMode,
        category: 'Domestic Maintenance',
        description: `گھریلو مرمت و سروس (${asset?.assetName || 'سامان'}): ${description.trim()}`,
        inputMode: 'MANUAL',
        isSettled: true,
        settledAt: parsedServiceDate,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Maintenance job logged and vault balance updated successfully.',
      data: log,
      updatedAsset: asset,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Get Trusted Local Karigar / Technician Directory
 * GET /api/v1/domestic/maintenance/technicians
 */
export const getTechnicianDirectory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';

    // Aggregate from past logs
    const loggedTechs = await DomesticMaintenanceLog.aggregate([
      {
        $match: {
          profileId: new Types.ObjectId(profileId),
          technicianName: { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: {
            name: '$technicianName',
            phone: '$technicianPhone',
            trade: '$technicianTrade',
          },
          lastJobDate: { $max: '$serviceDate' },
          totalJobs: { $sum: 1 },
          totalSpent: { $sum: '$cost' },
        },
      },
      { $sort: { lastJobDate: -1 } },
    ]);

    // Format list
    const directory = loggedTechs.map((t) => ({
      name: t._id.name,
      phone: t._id.phone || '0300-0000000',
      trade: t._id.trade || 'GENERAL',
      lastJobDate: t.lastJobDate,
      totalJobs: t.totalJobs,
      totalSpent: t.totalSpent,
      isVerified: true,
    }));

    // If empty, provide Pakistani trusted starters
    if (directory.length === 0) {
      directory.push(
        {
          name: 'استاد رشید (AC ماسٹر و کولنگ)',
          phone: '03009412345',
          trade: 'AC_TECHNICIAN',
          lastJobDate: new Date(),
          totalJobs: 3,
          totalSpent: 9500,
          isVerified: true,
        },
        {
          name: 'ماسٹر طارق (پلمبر و گیزر اسپیشلسٹ)',
          phone: '03214567890',
          trade: 'PLUMBER',
          lastJobDate: new Date(),
          totalJobs: 2,
          totalSpent: 6200,
          isVerified: true,
        },
        {
          name: 'بھائی شفیق (الیکٹریشن و یو پی ایس)',
          phone: '03339876543',
          trade: 'ELECTRICIAN',
          lastJobDate: new Date(),
          totalJobs: 4,
          totalSpent: 5100,
          isVerified: true,
        },
        {
          name: 'اصغر وائنڈر (موٹر و پمپ مکینک)',
          phone: '03125554321',
          trade: 'MOTOR_WINDER',
          lastJobDate: new Date(),
          totalJobs: 1,
          totalSpent: 3500,
          isVerified: true,
        }
      );
    }

    return res.status(200).json({
      success: true,
      count: directory.length,
      data: directory,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get Active Warranties List
 * GET /api/v1/domestic/maintenance/warranties
 */
export const getActiveWarranties = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';
    const now = new Date();

    const logs = await DomesticMaintenanceLog.find({
      profileId,
      'partsReplaced.warrantyExpiresAt': { $gte: now },
    })
      .populate('assetId', 'assetName category')
      .sort({ 'partsReplaced.warrantyExpiresAt': 1 });

    const activeList: any[] = [];
    logs.forEach((log) => {
      (log.partsReplaced || []).forEach((part) => {
        if (part.warrantyExpiresAt && new Date(part.warrantyExpiresAt) >= now) {
          const diffDays = Math.ceil(
            (new Date(part.warrantyExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          activeList.push({
            partName: part.partName,
            cost: part.cost,
            vendorShopName: part.vendorShopName || 'لوکل مارکیٹ',
            warrantyMonths: part.warrantyMonths,
            warrantyExpiresAt: part.warrantyExpiresAt,
            daysRemaining: diffDays,
            assetName: (log.assetId as any)?.assetName || 'گھریلو سامان',
            technicianName: log.technicianName,
            serviceDate: log.serviceDate,
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      count: activeList.length,
      data: activeList,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Delete / Decommission Appliance
 * DELETE /api/v1/domestic/maintenance/assets/:id
 */
export const deleteHouseholdAppliance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || 'default_profile';
    const { id } = req.params;

    const asset = await HouseholdAsset.findOneAndUpdate(
      { _id: id, profileId },
      { isDecommissioned: true },
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Appliance not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Appliance decommissioned successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
