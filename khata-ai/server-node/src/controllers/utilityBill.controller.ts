import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UtilityBill, IUtilityBill, UtilityProviderType, PaymentSourceTag } from '../models/UtilityBill';

const getDaysUntilDue = (dueDate: Date): number => {
  const now = new Date();
  const due = new Date(dueDate);
  // Strip time for exact calendar day difference
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Seed realistic Pakistani utility bills if user has no bills
 */
const seedSamplePakistaniBills = async (profileId: Types.ObjectId) => {
  const monthKey = getCurrentMonthKey();
  const now = new Date();

  // Due in 2 days (T - 2: Urgent 3-day window)
  const elecDueDate = new Date(now);
  elecDueDate.setDate(elecDueDate.getDate() + 2);

  // Due in 6 days (Upcoming)
  const gasDueDate = new Date(now);
  gasDueDate.setDate(gasDueDate.getDate() + 6);

  // Due in 12 days (Safe)
  const waterDueDate = new Date(now);
  waterDueDate.setDate(waterDueDate.getDate() + 12);

  // Paid 3 days ago (Archived proof)
  const internetDueDate = new Date(now);
  internetDueDate.setDate(internetDueDate.getDate() - 5);
  const internetPaidDate = new Date(now);
  internetPaidDate.setDate(internetPaidDate.getDate() - 3);

  const samples = [
    {
      profileId,
      providerType: 'ELECTRICITY' as UtilityProviderType,
      providerName: 'LESCO (لاہور الیکٹرک)',
      consumerNumber: '04 11524 0849200 U',
      meterNumber: 'MTR-77291',
      billingMonth: monthKey,
      billingAmount: 18450,
      surchargeAmount: 1650,
      amountAfterDueDate: 20100,
      billDueDate: elecDueDate,
      status: 'UNPAID',
      alert3DaysSent: true,
      alert1DaySent: false,
    },
    {
      profileId,
      providerType: 'GAS' as UtilityProviderType,
      providerName: 'SNGPL (سوئی ناردرن)',
      consumerNumber: '2948102941',
      billingMonth: monthKey,
      billingAmount: 4200,
      surchargeAmount: 420,
      amountAfterDueDate: 4620,
      billDueDate: gasDueDate,
      status: 'UNPAID',
      alert3DaysSent: false,
      alert1DaySent: false,
    },
    {
      profileId,
      providerType: 'WATER' as UtilityProviderType,
      providerName: 'WASA Lahore (واسا)',
      consumerNumber: 'W-08492-LH',
      billingMonth: monthKey,
      billingAmount: 1650,
      surchargeAmount: 200,
      amountAfterDueDate: 1850,
      billDueDate: waterDueDate,
      status: 'UNPAID',
      alert3DaysSent: false,
      alert1DaySent: false,
    },
    {
      profileId,
      providerType: 'INTERNET' as UtilityProviderType,
      providerName: 'Nayatel Fiber (نیاٹیل)',
      consumerNumber: 'NT-LHR-98214',
      billingMonth: monthKey,
      billingAmount: 3850,
      surchargeAmount: 500,
      amountAfterDueDate: 4350,
      billDueDate: internetDueDate,
      status: 'PAID',
      paymentSource: 'JAZZCASH' as PaymentSourceTag,
      paymentDate: internetPaidDate,
      transactionId: 'TID-98219482103',
      paidByUserName: 'Muhammad Saad',
      notes: 'JazzCash ایپ کے ذریعے ادا کیا گیا۔ ڈیجیٹل سلپ محفوظ۔',
      alert3DaysSent: true,
      alert1DaySent: true,
    },
  ];

  await UtilityBill.insertMany(samples);
};

/**
 * 1. GET /api/v1/domestic/utility-bills
 * Retrieve all bills with calculated surcharge risk radar and summary metrics
 */
export const getUtilityBills = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let bills = await UtilityBill.find({ profileId }).sort({ billDueDate: 1 });

    // Seed defaults if empty
    if (bills.length === 0) {
      await seedSamplePakistaniBills(new Types.ObjectId(profileId));
      bills = await UtilityBill.find({ profileId }).sort({ billDueDate: 1 });
    }

    const currentMonthKey = getCurrentMonthKey();
    let totalUnpaidAmount = 0;
    let totalSurchargeAtRisk = 0;
    let totalPaidThisMonth = 0;
    let totalUpcomingSurcharges = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const enrichedBills = bills.map((bill) => {
      const daysUntilDue = getDaysUntilDue(bill.billDueDate);
      const isOverdue = bill.status === 'UNPAID' && daysUntilDue < 0;
      const isDueSoon = bill.status === 'UNPAID' && daysUntilDue >= 0 && daysUntilDue <= 3;
      const effectiveStatus = isOverdue ? 'OVERDUE' : bill.status;

      if (bill.status === 'PAID') {
        paidCount++;
        totalPaidThisMonth += bill.billingAmount;
      } else {
        unpaidCount++;
        totalUnpaidAmount += bill.billingAmount;
        totalUpcomingSurcharges += bill.surchargeAmount;

        if (daysUntilDue <= 3) {
          // If due within 3 days or already overdue, surcharge is at immediate risk!
          totalSurchargeAtRisk += bill.surchargeAmount;
        }

        if (isDueSoon) dueSoonCount++;
        if (isOverdue) overdueCount++;
      }

      return {
        ...bill.toObject(),
        daysUntilDue,
        isDueSoon,
        isOverdue,
        effectiveStatus,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          currentMonthKey,
          totalBills: bills.length,
          unpaidCount,
          paidCount,
          dueSoonCount,
          overdueCount,
          totalUnpaidAmount,
          totalSurchargeAtRisk,
          totalPaidThisMonth,
          totalUpcomingSurcharges,
        },
        bills: enrichedBills,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. POST /api/v1/domestic/utility-bills
 * Add a new utility bill with provider details & surcharge calculation
 */
export const createUtilityBill = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      providerType,
      providerName,
      consumerNumber,
      meterNumber,
      billingMonth,
      billingAmount,
      surchargeAmount,
      billDueDate,
      notes,
    } = req.body;

    if (!providerType || !providerName || !consumerNumber || !billingAmount || !billDueDate) {
      return res.status(400).json({
        success: false,
        message: 'ادارہ، کنزیومر نمبر، بل کی رقم اور آخری تاریخ درج کرنا لازمی ہے۔',
      });
    }

    const monthKey = billingMonth?.trim() || getCurrentMonthKey();
    const parsedAmount = Number(billingAmount);

    // Default surcharge to ~10% if not explicitly supplied
    const parsedSurcharge =
      surchargeAmount !== undefined && surchargeAmount !== null && Number(surchargeAmount) >= 0
        ? Number(surchargeAmount)
        : Math.round(parsedAmount * 0.1);

    const amountAfterDueDate = parsedAmount + parsedSurcharge;

    // Check duplicate
    const existing = await UtilityBill.findOne({
      profileId,
      consumerNumber: consumerNumber.trim(),
      billingMonth: monthKey,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `اس کنزیومر نمبر (${consumerNumber}) کا بل برائے ماہ ${monthKey} پہلے ہی درج ہے۔`,
      });
    }

    const bill = await UtilityBill.create({
      profileId,
      providerType,
      providerName: providerName.trim(),
      consumerNumber: consumerNumber.trim(),
      meterNumber: meterNumber ? meterNumber.trim() : undefined,
      billingMonth: monthKey,
      billingAmount: parsedAmount,
      surchargeAmount: parsedSurcharge,
      amountAfterDueDate,
      billDueDate: new Date(billDueDate),
      status: 'UNPAID',
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'یوٹیلیٹی بل کامیابی سے شامل کر دیا گیا۔',
      data: bill,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. PATCH /api/v1/domestic/utility-bills/:id/pay
 * Mark bill as paid with payment channel, transaction ID, and digital archive
 */
export const payUtilityBill = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const {
      paymentSource = 'JAZZCASH',
      transactionId,
      paidByUserName = 'Muhammad Saad',
      receiptProofUrl,
      notes,
    } = req.body;

    const bill = await UtilityBill.findOne({ _id: id, profileId });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'بل کا ریکارڈ نہیں ملا۔' });
    }

    bill.status = 'PAID';
    bill.paymentSource = paymentSource;
    bill.paymentDate = new Date();
    bill.transactionId = transactionId ? transactionId.trim() : undefined;
    bill.paidByUserName = paidByUserName ? paidByUserName.trim() : undefined;
    if (receiptProofUrl) bill.receiptProofUrl = receiptProofUrl.trim();
    if (notes) bill.notes = notes.trim();

    await bill.save();

    return res.status(200).json({
      success: true,
      message: `${bill.providerName} کا بل کامیابی سے ادا شدہ نشان زد کر دیا گیا۔ رسید محفوظ ہے۔`,
      data: bill,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. GET /api/v1/domestic/utility-bills/:id/share-text
 * Generate 1-Tap formatted Urdu WhatsApp verification card
 */
export const generatePaymentProofText = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;

    const bill = await UtilityBill.findOne({ _id: id, profileId });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'بل نہیں ملا۔' });
    }

    const payDate = bill.paymentDate
      ? new Date(bill.paymentDate).toLocaleDateString('ur-PK', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString('ur-PK');

    const dueDateStr = new Date(bill.billDueDate).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const shareText =
      `🧾 *ڈیجی حساب - بل ادائیگی تصدیق و رسید*\n` +
      `---------------------------------\n` +
      `🏢 *ادارہ*: ${bill.providerName}\n` +
      `🔢 *کنزیومر / ریفرنس نمبر*: ${bill.consumerNumber}\n` +
      `📅 *بلنگ کا مہینہ*: ${bill.billingMonth}\n` +
      `💰 *ادا شدہ رقم*: Rs. ${bill.billingAmount.toLocaleString()}\n` +
      `⏰ *آخری تاریخ*: ${dueDateStr}\n` +
      `💳 *ذریعہ ادائیگی*: ${bill.paymentSource || 'ڈیجیٹل بینکنگ'} (${bill.paidByUserName || 'اکاؤنٹ ہولڈر'})\n` +
      `🔢 *ٹرانزیکشن ID (TID)*: ${bill.transactionId || 'تصدیق شدہ'}\n` +
      `🕒 *وقتِ ادائیگی*: ${payDate}\n` +
      `---------------------------------\n` +
      `🛡️ *اینٹی ڈبل بلنگ والٹ*: یہ رسید ڈیجی حساب والٹ میں محفوظ ہے تاکہ اگلے ماہ کاؤنٹر چارجز سے بچا جا سکے۔\n` +
      `✅ DigiHisab Domestic Ledger`;

    return res.status(200).json({
      success: true,
      data: {
        shareText,
        bill,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. DELETE /api/v1/domestic/utility-bills/:id
 * Delete utility bill record
 */
export const deleteUtilityBill = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;

    const bill = await UtilityBill.findOne({ _id: id, profileId });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'بل نہیں ملا۔' });
    }

    await bill.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'بل کامیابی سے حذف کر دیا گیا۔',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
