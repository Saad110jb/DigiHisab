import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SchoolFeeTracker, ISchoolFeeTracker } from '../models/SchoolFeeTracker';
import { LedgerEntry } from '../models/LedgerEntry';

const getDaysUntilDue = (dueDate: Date): number => {
  const now = new Date();
  const due = new Date(dueDate);
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
 * Seed realistic Pakistani school & university fee records if user has no entries
 */
const seedSampleSchoolFees = async (profileId: Types.ObjectId) => {
  const monthKey = getCurrentMonthKey();
  const now = new Date();

  // Due in 2 days (T - 2 Urgent)
  const apsDueDate = new Date(now);
  apsDueDate.setDate(apsDueDate.getDate() + 2);

  // Due in 6 days (Upcoming)
  const citySchoolDueDate = new Date(now);
  citySchoolDueDate.setDate(citySchoolDueDate.getDate() + 6);

  // Due in 15 days (Semester)
  const fastDueDate = new Date(now);
  fastDueDate.setDate(fastDueDate.getDate() + 15);

  // Paid 5 days ago
  const prevMonthDue = new Date(now);
  prevMonthDue.setDate(prevMonthDue.getDate() - 10);
  const paidDate = new Date(now);
  paidDate.setDate(paidDate.getDate() - 5);

  const samples = [
    {
      profileId,
      childName: 'علی سعد (Ali Saad)',
      childAvatarColor: '#818CF8',
      institutionName: 'Army Public School (APS Cantt)',
      gradeClass: 'Class 8-B (Middle School)',
      educationLevel: 'SCHOOL',
      termOrMonth: monthKey,
      feeFrequency: 'MONTHLY',
      tuitionFeeAmount: 16500,
      vanTransportFeeAmount: 3500,
      vanDriverName: 'چاچا اسلم (اسکول وین)',
      vanDriverPhone: '+923001234567',
      academyFeeAmount: 6000,
      academyName: 'KIPS اکیڈمی (شام کوچنگ)',
      stationeryUniformAmount: 1200,
      examFeeAmount: 0,
      siblingDiscountAmount: 0,
      otherChargesAmount: 800,
      totalDue: 28000,
      surchargeAmount: 1000,
      amountAfterDueDate: 29000,
      dueDate: apsDueDate,
      status: 'UNPAID',
      isPaid: false,
      notes: 'اکتوبر کا باقاعدہ چالان بمعہ KIPS اکیڈمی و اسکول وین',
    },
    {
      profileId,
      childName: 'عائشہ سعد (Ayesha Saad)',
      childAvatarColor: '#FB7185',
      institutionName: 'The City School (گلبرگ کیمپس)',
      gradeClass: 'Class 5-Green (Primary)',
      educationLevel: 'SCHOOL',
      termOrMonth: monthKey,
      feeFrequency: 'MONTHLY',
      tuitionFeeAmount: 14000,
      vanTransportFeeAmount: 3500,
      vanDriverName: 'چاچا اسلم (اسکول وین)',
      vanDriverPhone: '+923001234567',
      academyFeeAmount: 0,
      stationeryUniformAmount: 1500,
      examFeeAmount: 0,
      siblingDiscountAmount: 1400, // 10% sibling concession
      otherChargesAmount: 500,
      totalDue: 18100,
      surchargeAmount: 800,
      amountAfterDueDate: 18900,
      dueDate: citySchoolDueDate,
      status: 'UNPAID',
      isPaid: false,
      notes: 'سٹی اسکول چالان میں 10% سب لنگ کنسیشن شامل ہے',
    },
    {
      profileId,
      childName: 'محمد سعد (Muhammad Saad)',
      childAvatarColor: '#38BDF8',
      institutionName: 'FAST-NUCES لاہور',
      gradeClass: 'BS Computer Science (Sem 5)',
      educationLevel: 'UNIVERSITY',
      termOrMonth: 'Fall 2026 Semester',
      feeFrequency: 'SEMESTER',
      tuitionFeeAmount: 45000,
      vanTransportFeeAmount: 0,
      academyFeeAmount: 0,
      stationeryUniformAmount: 3000,
      examFeeAmount: 2000,
      siblingDiscountAmount: 0,
      otherChargesAmount: 1500,
      totalDue: 51500,
      surchargeAmount: 2500,
      amountAfterDueDate: 54000,
      dueDate: fastDueDate,
      status: 'UNPAID',
      isPaid: false,
      notes: 'یونیورسٹی سمسٹر قسط نمبر 2 (1Bill واؤچر)',
    },
    {
      profileId,
      childName: 'علی سعد (Ali Saad)',
      childAvatarColor: '#818CF8',
      institutionName: 'Army Public School (APS Cantt)',
      gradeClass: 'Class 8-B',
      educationLevel: 'SCHOOL',
      termOrMonth: '2026-09',
      feeFrequency: 'MONTHLY',
      tuitionFeeAmount: 16500,
      vanTransportFeeAmount: 3500,
      vanDriverName: 'چاچا اسلم (اسکول وین)',
      academyFeeAmount: 6000,
      stationeryUniformAmount: 0,
      examFeeAmount: 0,
      siblingDiscountAmount: 0,
      otherChargesAmount: 0,
      totalDue: 26000,
      surchargeAmount: 1000,
      amountAfterDueDate: 27000,
      dueDate: prevMonthDue,
      status: 'PAID',
      isPaid: true,
      paidAt: paidDate,
      paymentMode: 'JAZZCASH',
      challanVoucherNo: 'APS-VCH-882910',
      bankTransactionId: 'TID-9821849102',
      notes: 'ستمبر کا فیس چالان ادا کر کے رسید اسٹیمپ شدہ ہے',
    },
  ];

  await SchoolFeeTracker.insertMany(samples);
};

/**
 * 1. GET /api/v1/school-fee
 * Fetch all school fee challans with enrichment & auto-seed
 */
export const getSchoolFees = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { childName, isPaid, termOrMonth } = req.query;
    const filter: any = { profileId };

    if (childName && typeof childName === 'string') {
      filter.childName = new RegExp(childName.trim(), 'i');
    }
    if (termOrMonth && typeof termOrMonth === 'string') {
      filter.termOrMonth = termOrMonth.trim();
    }
    if (isPaid !== undefined) {
      filter.isPaid = isPaid === 'true';
    }

    let fees = await SchoolFeeTracker.find(filter).sort({ dueDate: 1 });

    // Seed realistic Pakistani defaults if user has 0 records
    if (fees.length === 0 && !childName && isPaid === undefined) {
      await seedSampleSchoolFees(new Types.ObjectId(profileId));
      fees = await SchoolFeeTracker.find(filter).sort({ dueDate: 1 });
    }

    const enrichedFees = fees.map((fee) => {
      const daysUntilDue = getDaysUntilDue(fee.dueDate);
      const isOverdue = !fee.isPaid && daysUntilDue < 0;
      const isDueSoon = !fee.isPaid && daysUntilDue >= 0 && daysUntilDue <= 3;
      const effectiveStatus = fee.isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'UNPAID';

      return {
        ...fee.toObject(),
        daysUntilDue,
        isDueSoon,
        isOverdue,
        effectiveStatus,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedFees,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. GET /api/v1/school-fee/analytics
 * Comprehensive educational budget analysis, per-child investment radar, and timeline
 */
export const getSchoolFeeAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const fees = await SchoolFeeTracker.find({ profileId }).sort({ dueDate: 1 });

    let totalMonthlyOutflow = 0;
    let totalUnpaid = 0;
    let totalPaid = 0;
    let totalSurchargeAtRisk = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    // Per-child aggregation map
    const childMap: Record<
      string,
      {
        childName: string;
        institutionName: string;
        gradeClass: string;
        avatarColor: string;
        totalInvestment: number;
        tuition: number;
        van: number;
        academy: number;
        stationeryUniform: number;
        exam: number;
        other: number;
        unpaidCount: number;
        paidCount: number;
      }
    > = {};

    const timeline: any[] = [];

    fees.forEach((fee) => {
      const daysUntilDue = getDaysUntilDue(fee.dueDate);
      const isOverdue = !fee.isPaid && daysUntilDue < 0;
      const isDueSoon = !fee.isPaid && daysUntilDue >= 0 && daysUntilDue <= 3;

      totalMonthlyOutflow += fee.totalDue;

      if (fee.isPaid) {
        totalPaid += fee.totalDue;
      } else {
        totalUnpaid += fee.totalDue;
        if (daysUntilDue <= 3) {
          totalSurchargeAtRisk += fee.surchargeAmount;
        }
        if (isDueSoon) dueSoonCount++;
        if (isOverdue) overdueCount++;

        // Add to timeline if pending
        timeline.push({
          feeId: fee._id,
          childName: fee.childName,
          institutionName: fee.institutionName,
          totalDue: fee.totalDue,
          amountAfterDueDate: fee.amountAfterDueDate,
          dueDate: fee.dueDate,
          daysUntilDue,
          isDueSoon,
          isOverdue,
        });
      }

      // Per-child stats
      if (!childMap[fee.childName]) {
        childMap[fee.childName] = {
          childName: fee.childName,
          institutionName: fee.institutionName,
          gradeClass: fee.gradeClass,
          avatarColor: fee.childAvatarColor || '#818CF8',
          totalInvestment: 0,
          tuition: 0,
          van: 0,
          academy: 0,
          stationeryUniform: 0,
          exam: 0,
          other: 0,
          unpaidCount: 0,
          paidCount: 0,
        };
      }

      const c = childMap[fee.childName];
      c.totalInvestment += fee.totalDue;
      c.tuition += fee.tuitionFeeAmount;
      c.van += fee.vanTransportFeeAmount;
      c.academy += fee.academyFeeAmount;
      c.stationeryUniform += fee.stationeryUniformAmount;
      c.exam += fee.examFeeAmount;
      c.other += fee.otherChargesAmount;

      if (fee.isPaid) c.paidCount++;
      else c.unpaidCount++;
    });

    return res.status(200).json({
      success: true,
      data: {
        currentMonthKey: getCurrentMonthKey(),
        totalMonthlyOutflow,
        totalUnpaid,
        totalPaid,
        totalSurchargeAtRisk,
        unpaidCount: fees.filter((f) => !f.isPaid).length,
        paidCount: fees.filter((f) => f.isPaid).length,
        dueSoonCount,
        overdueCount,
        perChildBreakdown: Object.values(childMap),
        timeline,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/school-fee
 * Create a new child fee challan record
 */
export const createSchoolFee = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const {
      childName,
      childAvatarColor = '#818CF8',
      institutionName,
      gradeClass,
      educationLevel = 'SCHOOL',
      termOrMonth,
      feeFrequency = 'MONTHLY',
      tuitionFeeAmount,
      vanTransportFeeAmount = 0,
      vanDriverName,
      vanDriverPhone,
      academyFeeAmount = 0,
      academyName,
      stationeryUniformAmount = 0,
      examFeeAmount = 0,
      siblingDiscountAmount = 0,
      otherChargesAmount = 0,
      surchargeAmount = 500,
      dueDate,
      challanVoucherNo,
      notes,
    } = req.body;

    if (!childName || !institutionName || !gradeClass || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'بچے کا نام، ادارہ، کلاس اور آخری تاریخ درج کرنا لازمی ہے۔',
      });
    }

    const tuition = Number(tuitionFeeAmount) || 0;
    const van = Number(vanTransportFeeAmount) || 0;
    const academy = Number(academyFeeAmount) || 0;
    const stationery = Number(stationeryUniformAmount) || 0;
    const exam = Number(examFeeAmount) || 0;
    const discount = Number(siblingDiscountAmount) || 0;
    const other = Number(otherChargesAmount) || 0;
    const surcharge = Number(surchargeAmount) || 500;

    const totalDue = Math.max(0, tuition + van + academy + stationery + exam + other - discount);
    const amountAfterDueDate = totalDue + surcharge;

    const feeRecord = await SchoolFeeTracker.create({
      profileId,
      childName: childName.trim(),
      childAvatarColor,
      institutionName: institutionName.trim(),
      gradeClass: gradeClass.trim(),
      educationLevel,
      termOrMonth: termOrMonth?.trim() || getCurrentMonthKey(),
      feeFrequency,
      tuitionFeeAmount: tuition,
      vanTransportFeeAmount: van,
      vanDriverName: vanDriverName ? vanDriverName.trim() : undefined,
      vanDriverPhone: vanDriverPhone ? vanDriverPhone.trim() : undefined,
      academyFeeAmount: academy,
      academyName: academyName ? academyName.trim() : undefined,
      stationeryUniformAmount: stationery,
      examFeeAmount: exam,
      siblingDiscountAmount: discount,
      otherChargesAmount: other,
      totalDue,
      surchargeAmount: surcharge,
      amountAfterDueDate,
      dueDate: new Date(dueDate),
      status: 'UNPAID',
      isPaid: false,
      challanVoucherNo: challanVoucherNo ? challanVoucherNo.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: `${childName} کا تعلیمی چالان کامیابی سے درج کر دیا گیا۔`,
      data: feeRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const mapToLedgerPaymentMode = (mode: string): any => {
  switch (mode) {
    case 'CASH':
      return 'CASH';
    case 'JAZZCASH':
      return 'JAZZCASH';
    case 'EASYPAISA':
      return 'EASYPAISA';
    case 'BANK_1BILL':
    case 'RAAST':
    case 'BANK_TRANSFER':
      return 'BANK_TRANSFER';
    default:
      return 'BANK_TRANSFER';
  }
};

/**
 * 4. PATCH /api/v1/school-fee/:id/mark-paid
 * Mark challan as paid with payment mode, TID, and optional ledger cash-out
 */
export const markFeePaid = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const {
      paymentMode = 'JAZZCASH',
      challanVoucherNo,
      bankTransactionId,
      voucherPdfUrl,
      notes,
      recordInLedger = true,
    } = req.body;

    const feeRecord = await SchoolFeeTracker.findOne({ _id: id, profileId });
    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'چالان کا ریکارڈ نہیں ملا۔' });
    }

    feeRecord.isPaid = true;
    feeRecord.status = 'PAID';
    feeRecord.paidAt = new Date();
    feeRecord.paymentMode = paymentMode;
    if (challanVoucherNo) feeRecord.challanVoucherNo = challanVoucherNo.trim();
    if (bankTransactionId) feeRecord.bankTransactionId = bankTransactionId.trim();
    if (voucherPdfUrl) feeRecord.voucherPdfUrl = voucherPdfUrl.trim();
    if (notes) feeRecord.notes = notes.trim();

    await feeRecord.save();

    let ledgerEntry = null;
    if (recordInLedger) {
      try {
        ledgerEntry = await LedgerEntry.create({
          profileId,
          entryType: 'CASH_OUT',
          amount: feeRecord.totalDue,
          category: 'Education & Fees',
          description: `اسکول فیس ادائیگی برائے ${feeRecord.childName} (${feeRecord.institutionName})`,
          paymentMode: mapToLedgerPaymentMode(paymentMode),
          inputMode: 'MANUAL',
        });
      } catch (ledgerErr) {
        console.warn('Could not auto-create ledger entry for school fee:', ledgerErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${feeRecord.childName} کی فیس Rs. ${feeRecord.totalDue.toLocaleString()} کامیابی سے ادا شدہ نشان زد کر دی گئی۔`,
      data: {
        feeRecord,
        ledgerEntry,
      },
    });
  } catch (error: any) {
    console.error('Error in markFeePaid:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. GET /api/v1/school-fee/:id/van-receipt
 * 1-Tap formatted Urdu WhatsApp receipt for school van / rickshaw driver
 */
export const generateVanDriverReceipt = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;

    const fee = await SchoolFeeTracker.findOne({ _id: id, profileId });
    if (!fee) {
      return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
    }

    const driverName = fee.vanDriverName || 'محترم وین ڈرائیور صاحب';
    const amount = fee.vanTransportFeeAmount || fee.totalDue;
    const dateFormatted = new Date().toLocaleDateString('ur-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const receiptText =
      `🚐 *ڈیجی حساب - اسکول وین فیس ادائیگی رسید*\n` +
      `---------------------------------\n` +
      `السلام علیکم ${driverName}!\n` +
      `ماہ *${fee.termOrMonth}* کی اسکول پک اینڈ ڈراپ وین فیس ادا کر دی گئی ہے۔\n\n` +
      `👧 *طالب علم*: ${fee.childName}\n` +
      `🏫 *اسکول*: ${fee.institutionName} (${fee.gradeClass})\n` +
      `💰 *ادا شدہ وین فیس*: Rs. ${amount.toLocaleString()}\n` +
      `📅 *تاریخ ادائیگی*: ${dateFormatted}\n` +
      `💳 *ذریعہ*: ${fee.paymentMode || 'نقد / آن لائن'}\n` +
      `---------------------------------\n` +
      `✅ ڈیجی حساب فیملی رجسٹر میں درج ہے۔ شکریہ!\n` +
      `*DigiHisab Education Ledger*`;

    return res.status(200).json({
      success: true,
      data: {
        receiptText,
        driverPhone: fee.vanDriverPhone,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. DELETE /api/v1/school-fee/:id
 * Delete a school fee record
 */
export const deleteSchoolFee = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;

    const feeRecord = await SchoolFeeTracker.findOneAndDelete({ _id: id, profileId });
    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
    }

    return res.status(200).json({
      success: true,
      message: 'فیس چالان کامیابی سے حذف کر دیا گیا۔',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
