import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  DomesticHelpStaff,
  IDomesticHelpStaff,
  AttendanceStatus,
  SalaryPaymentMode,
} from '../models/DomesticHelpStaff';
import { LedgerEntry } from '../models/LedgerEntry';

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const mapToLedgerPaymentMode = (mode: string): any => {
  switch (mode) {
    case 'CASH':
      return 'CASH';
    case 'JAZZCASH':
      return 'JAZZCASH';
    case 'EASYPAISA':
      return 'EASYPAISA';
    case 'BANK_TRANSFER':
      return 'BANK_TRANSFER';
    default:
      return 'CASH';
  }
};

/**
 * Seed realistic Pakistani domestic staff members if user has none
 */
const seedSampleStaff = async (profileId: Types.ObjectId) => {
  const monthKey = getCurrentMonthKey();
  const now = new Date();

  // Dates for advances
  const advDate1 = new Date(now);
  advDate1.setDate(advDate1.getDate() - 10);
  const advDate2 = new Date(now);
  advDate2.setDate(advDate2.getDate() - 3);
  const advDate3 = new Date(now);
  advDate3.setDate(advDate3.getDate() - 14);

  // Generate some realistic attendance days for the month
  const genAttendance = (absentDay?: number) => {
    const list: any[] = [];
    const currentDay = now.getDate();
    for (let d = 1; d <= currentDay; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      if (absentDay && d === absentDay) {
        list.push({ date: dateStr, status: 'ABSENT', notes: 'بچے کی بیماری کی وجہ سے چھٹی' });
      } else {
        list.push({ date: dateStr, status: 'PRESENT' });
      }
    }
    return list;
  };

  const samples = [
    {
      profileId,
      staffName: 'نسیم بی بی (Naseem Bibi)',
      role: 'MAID',
      phone: '+923001234567',
      baseMonthlySalary: 18000,
      avatarColor: '#FB7185',
      joiningDate: new Date('2025-01-10'),
      isActive: true,
      attendance: genAttendance(14),
      advances: [
        {
          amount: 2000,
          disbursementDate: advDate1,
          reason: 'بچے کی دوائی کیلئے پیشگی',
          paymentMode: 'CASH',
          isDeducted: false,
        },
        {
          amount: 1500,
          disbursementDate: advDate2,
          reason: 'راشن خریداری ایڈوانس',
          paymentMode: 'CASH',
          isDeducted: false,
        },
      ],
      settlementHistory: [],
    },
    {
      profileId,
      staffName: 'محمد اسلم (Driver Aslam)',
      role: 'DRIVER',
      phone: '+923019876543',
      baseMonthlySalary: 28000,
      avatarColor: '#38BDF8',
      joiningDate: new Date('2024-06-01'),
      isActive: true,
      attendance: genAttendance(),
      advances: [
        {
          amount: 2000,
          disbursementDate: advDate3,
          reason: 'گاؤں فیملی کا کرایہ',
          paymentMode: 'JAZZCASH',
          isDeducted: false,
        },
      ],
      settlementHistory: [],
    },
    {
      profileId,
      staffName: 'بشیر احمد (Cook Bashir)',
      role: 'COOK',
      phone: '+923023456789',
      baseMonthlySalary: 22000,
      avatarColor: '#F59E0B',
      joiningDate: new Date('2025-03-15'),
      isActive: true,
      attendance: genAttendance(),
      advances: [],
      settlementHistory: [],
    },
  ];

  await DomesticHelpStaff.insertMany(samples);
};

const enrichStaffData = (staff: IDomesticHelpStaff, monthKey: string) => {
  const activeAdvances = staff.advances.filter((a) => !a.isDeducted);
  const totalAdvancesPending = activeAdvances.reduce((sum, a) => sum + a.amount, 0);

  // Month attendance
  const monthAttendance = staff.attendance.filter((a) => a.date.startsWith(monthKey));
  const absentDays = monthAttendance.filter((a) => a.status === 'ABSENT').length;
  const halfDays = monthAttendance.filter((a) => a.status === 'HALF_DAY').length;
  const presentDays = monthAttendance.filter((a) => a.status === 'PRESENT').length;

  const dailyRate = Math.round(staff.baseMonthlySalary / 30);
  // Give 1 casual leave free of deduction!
  const effectiveAbsents = Math.max(0, absentDays - 1);
  const leaveDeduction = effectiveAbsents * dailyRate + Math.round(halfDays * (dailyRate / 2));

  const liveNetSalaryPayable = Math.max(
    0,
    staff.baseMonthlySalary - totalAdvancesPending - leaveDeduction
  );

  return {
    ...staff.toObject(),
    totalAdvancesPending,
    activeAdvancesCount: activeAdvances.length,
    activeAdvances,
    attendanceStats: {
      presentDays,
      absentDays,
      halfDays,
      leaveDeduction,
    },
    liveNetSalaryPayable,
  };
};

/**
 * 1. GET /api/v1/domestic/staff
 * Fetch all domestic staff profiles with live net salary calculation
 */
export const getStaffList = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let staffMembers = await DomesticHelpStaff.find({ profileId }).sort({ createdAt: 1 });

    if (staffMembers.length === 0) {
      await seedSampleStaff(new Types.ObjectId(profileId));
      staffMembers = await DomesticHelpStaff.find({ profileId }).sort({ createdAt: 1 });
    }

    const monthKey = getCurrentMonthKey();
    const enriched = staffMembers.map((s) => enrichStaffData(s, monthKey));

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. GET /api/v1/domestic/staff/analytics
 * Summary statistics of total staff, total base payroll, active advances pool
 */
export const getStaffAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const staffMembers = await DomesticHelpStaff.find({ profileId });
    const monthKey = getCurrentMonthKey();

    let totalStaffCount = staffMembers.length;
    let totalBaseSalary = 0;
    let totalActivePeshgiPool = 0;
    let totalNetPayable = 0;
    let staffWithActiveAdvanceCount = 0;

    staffMembers.forEach((s) => {
      const enriched = enrichStaffData(s, monthKey);
      totalBaseSalary += s.baseMonthlySalary;
      totalActivePeshgiPool += enriched.totalAdvancesPending;
      totalNetPayable += enriched.liveNetSalaryPayable;
      if (enriched.totalAdvancesPending > 0) {
        staffWithActiveAdvanceCount++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        monthKey,
        totalStaffCount,
        totalBaseSalary,
        totalActivePeshgiPool,
        totalNetPayable,
        staffWithActiveAdvanceCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/v1/domestic/staff
 * Register a new domestic helper
 */
export const createStaff = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { staffName, role = 'MAID', phone, baseMonthlySalary, avatarColor } = req.body;

    if (!staffName || !baseMonthlySalary) {
      return res.status(400).json({
        success: false,
        message: 'ملازم کا نام اور ماہانہ بنیادی تنخواہ درج کرنا لازمی ہے۔',
      });
    }

    const staff = await DomesticHelpStaff.create({
      profileId,
      staffName: staffName.trim(),
      role,
      phone: phone ? phone.trim() : undefined,
      baseMonthlySalary: Number(baseMonthlySalary),
      avatarColor: avatarColor || '#38BDF8',
      joiningDate: new Date(),
      isActive: true,
      attendance: [],
      advances: [],
      settlementHistory: [],
    });

    return res.status(201).json({
      success: true,
      message: `${staff.staffName} کا ریکارڈ کامیابی سے شامل کر دیا گیا۔`,
      data: staff,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. POST /api/v1/domestic/staff/:id/advance
 * Log an informal cash advance (Peshgi) with date stamp and optional Domestic Ledger sync
 */
export const logPeshgiAdvance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const {
      amount,
      reason = 'گھریلو اخراجات پیشگی',
      paymentMode = 'CASH',
      disbursementDate,
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'درست پیشگی رقم درج کریں۔' });
    }

    const staff = await DomesticHelpStaff.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'ملازم کا ریکارڈ نہیں ملا۔' });
    }

    const numAmount = Number(amount);
    const date = disbursementDate ? new Date(disbursementDate) : new Date();

    staff.advances.push({
      amount: numAmount,
      disbursementDate: date,
      reason: reason.trim(),
      paymentMode,
      isDeducted: false,
      notes: notes ? notes.trim() : undefined,
    } as any);

    await staff.save();

    // Auto-sync with Domestic Ledger as CASH_OUT (in try/catch)
    try {
      await LedgerEntry.create({
        profileId,
        entryType: 'CASH_OUT',
        amount: numAmount,
        category: 'Staff Salary Advance',
        description: `پیشگی ادائیگی برائے ${staff.staffName} (${reason})`,
        paymentMode: mapToLedgerPaymentMode(paymentMode),
        inputMode: 'MANUAL',
      });
    } catch (ledgerErr) {
      console.warn('Could not auto-create ledger entry for advance:', ledgerErr);
    }

    const monthKey = getCurrentMonthKey();
    const enriched = enrichStaffData(staff, monthKey);

    return res.status(200).json({
      success: true,
      message: `Rs. ${numAmount.toLocaleString()} کی پیشگی کامیابی سے درج کر دی گئی۔`,
      data: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. POST /api/v1/domestic/staff/:id/attendance
 * Record daily attendance (PRESENT, HALF_DAY, ABSENT, PAID_LEAVE)
 */
export const recordAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const { date, status = 'PRESENT', notes } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'تاریخ درج کرنا لازمی ہے۔' });
    }

    const staff = await DomesticHelpStaff.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'ملازم کا ریکارڈ نہیں ملا۔' });
    }

    // Check if entry for date already exists
    const existingIndex = staff.attendance.findIndex((a) => a.date === date);
    if (existingIndex >= 0) {
      staff.attendance[existingIndex].status = status as AttendanceStatus;
      if (notes) staff.attendance[existingIndex].notes = notes.trim();
    } else {
      staff.attendance.push({
        date,
        status: status as AttendanceStatus,
        notes: notes ? notes.trim() : undefined,
      });
    }

    await staff.save();

    const monthKey = getCurrentMonthKey();
    const enriched = enrichStaffData(staff, monthKey);

    return res.status(200).json({
      success: true,
      message: `${date} کی حاضری (${status}) کامیابی سے محفوظ ہو گئی۔`,
      data: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. POST /api/v1/domestic/staff/:id/settle
 * Finalize monthly salary payout, amortize active advances, and generate WhatsApp slip
 */
export const settleMonthlySalary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const {
      month = getCurrentMonthKey(),
      bonusOrEidiAmount = 0,
      paymentMode = 'CASH',
      notes,
    } = req.body;

    const staff = await DomesticHelpStaff.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'ملازم کا ریکارڈ نہیں ملا۔' });
    }

    // Compute live math
    const enriched = enrichStaffData(staff, month);
    const bonus = Number(bonusOrEidiAmount) || 0;
    const netSalaryPaid = Math.max(0, enriched.liveNetSalaryPayable + bonus);

    // Mark active advances as deducted
    staff.advances.forEach((a) => {
      if (!a.isDeducted) {
        a.isDeducted = true;
        a.deductedInMonth = month;
      }
    });

    const slipText =
      `💵 *ڈیجی حساب - ماہانہ ملازمہ تنخواہ رسید*\n` +
      `---------------------------------\n` +
      `👤 *نام*: ${staff.staffName}\n` +
      `📅 *مہینہ*: ${month}\n` +
      `💰 *بنیادی تنخواہ*: Rs. ${staff.baseMonthlySalary.toLocaleString()}\n` +
      `---------------------------------\n` +
      `📉 *منفی کٹوتیاں*:\n` +
      `• کل پیشگی ایڈوانس: -Rs. ${enriched.totalAdvancesPending.toLocaleString()}\n` +
      `• غیر حاضری کٹوتی (${enriched.attendanceStats.absentDays} دن): -Rs. ${enriched.attendanceStats.leaveDeduction.toLocaleString()}\n` +
      (bonus > 0 ? `🎁 *عید الائونس / بونس*: +Rs. ${bonus.toLocaleString()}\n` : '') +
      `---------------------------------\n` +
      `✅ *خالص ادا شدہ تنخواہ*: Rs. ${netSalaryPaid.toLocaleString()}\n` +
      `💳 *ذریعہ ادائیگی*: ${paymentMode}\n` +
      `🕒 *تاریخ ادائیگی*: ${new Date().toLocaleDateString('ur-PK')}\n` +
      `---------------------------------\n` +
      `شکریہ! ڈیجی حساب فیملی کھاتہ`;

    staff.settlementHistory.push({
      month,
      baseSalary: staff.baseMonthlySalary,
      totalAdvancesDeducted: enriched.totalAdvancesPending,
      absentDays: enriched.attendanceStats.absentDays,
      halfDays: enriched.attendanceStats.halfDays,
      leaveDeductions: enriched.attendanceStats.leaveDeduction,
      bonusOrEidiAmount: bonus,
      netSalaryPaid,
      paidAt: new Date(),
      paymentMode,
      notes: notes ? notes.trim() : undefined,
      receiptText: slipText,
    } as any);

    await staff.save();

    // Auto-emit CASH_OUT in Domestic Ledger (with safe fallback)
    try {
      await LedgerEntry.create({
        profileId,
        entryType: 'CASH_OUT',
        amount: netSalaryPaid,
        category: 'Domestic Staff Salary',
        description: `ماہانہ تنخواہ ادائیگی برائے ${staff.staffName} (${month})`,
        paymentMode: mapToLedgerPaymentMode(paymentMode),
        inputMode: 'MANUAL',
      });
    } catch (ledgerErr) {
      console.warn('Could not auto-create ledger entry for staff salary:', ledgerErr);
    }

    return res.status(200).json({
      success: true,
      message: `${staff.staffName} کی تنخواہ Rs. ${netSalaryPaid.toLocaleString()} کامیابی سے ادا اور کلیئر کر دی گئی۔`,
      data: {
        staff: enrichStaffData(staff, month),
        slipText,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. GET /api/v1/domestic/staff/:id/salary-slip
 * Get formatted Urdu WhatsApp salary slip text
 */
export const getSalarySlipText = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;
    const { month = getCurrentMonthKey() } = req.query;

    const staff = await DomesticHelpStaff.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'ملازم نہیں ملا۔' });
    }

    const enriched = enrichStaffData(staff, month as string);
    const slipText =
      `💵 *ڈیجی حساب - ماہانہ ملازمہ تنخواہ رسید*\n` +
      `---------------------------------\n` +
      `👤 *نام*: ${staff.staffName}\n` +
      `📅 *مہینہ*: ${month}\n` +
      `💰 *بنیادی تنخواہ*: Rs. ${staff.baseMonthlySalary.toLocaleString()}\n` +
      `---------------------------------\n` +
      `📉 *منفی کٹوتیاں*:\n` +
      `• کل پیشگی ایڈوانس: -Rs. ${enriched.totalAdvancesPending.toLocaleString()}\n` +
      `• غیر حاضری کٹوتی (${enriched.attendanceStats.absentDays} دن): -Rs. ${enriched.attendanceStats.leaveDeduction.toLocaleString()}\n` +
      `---------------------------------\n` +
      `✅ *خالص قابلِ ادا رقم*: Rs. ${enriched.liveNetSalaryPayable.toLocaleString()}\n` +
      `🕒 *تاریخ*: ${new Date().toLocaleDateString('ur-PK')}\n` +
      `---------------------------------\n` +
      `شکریہ! ڈیجی حساب فیملی کھاتہ`;

    return res.status(200).json({
      success: true,
      data: {
        slipText,
        staffPhone: staff.phone,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. DELETE /api/v1/domestic/staff/:id
 * Remove staff record
 */
export const deleteStaff = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = (req.user as any)?.id;
    const { id } = req.params;

    const staff = await DomesticHelpStaff.findOneAndDelete({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'ملازم نہیں ملا۔' });
    }

    return res.status(200).json({
      success: true,
      message: `${staff.staffName} کا ریکارڈ کامیابی سے حذف کر دیا گیا۔`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
