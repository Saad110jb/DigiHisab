import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DukanStaffPayroll } from '../models/DukanStaffPayroll';
import { LedgerEntry } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';
import { Profile } from '../models/Profile';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

/**
 * Helper to compute month-to-date stats for a staff member
 */
const computeStaffMonthStats = (staffDoc: any, monthStr?: string) => {
  const targetMonth = monthStr || new Date().toISOString().substring(0, 7); // "YYYY-MM"
  
  // Calculate calendar days in month (1st of month to last day of month)
  const [yearStr, mStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate(); // last day of month e.g. 30

  const cycleStartDate = `${targetMonth}-01`;
  const cycleEndDate = `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`;

  // Filter attendance for target month
  const monthAttendance = staffDoc.attendanceRecords.filter((r: any) => r.date.startsWith(targetMonth));
  
  let daysPresent = 0;
  let halfDays = 0;
  let absents = 0;
  let leaves = 0;

  monthAttendance.forEach((r: any) => {
    if (r.status === 'PRESENT') daysPresent += 1;
    else if (r.status === 'HALF_DAY') halfDays += 1;
    else if (r.status === 'ABSENT') absents += 1;
    else if (r.status === 'LEAVE') leaves += 1;
  });

  const totalMarkedDays = daysPresent + halfDays + absents + leaves;
  const unmarkedDays = Math.max(0, daysInMonth - totalMarkedDays);
  const totalEffectiveDays = daysPresent + leaves + halfDays * 0.5;

  // Filter advances / kharcha for target month
  const monthAdvances = staffDoc.advancesKharcha.filter((a: any) => a.date.startsWith(targetMonth));
  const totalAdvancesKharcha = monthAdvances.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);

  // Filter previous net payouts for target month
  const monthPayouts = staffDoc.payrollsHistory.filter((p: any) => p.month === targetMonth);
  const totalPreviousPayouts = monthPayouts.reduce((acc: number, p: any) => acc + (p.netPaid || 0), 0);

  // Daily Equivalent Rate (based on days in month for monthly staff)
  const dailyRate = staffDoc.wageType === 'DAILY' ? staffDoc.baseRate : Math.round(staffDoc.baseRate / daysInMonth);

  // Compute Deductions for Monthly staff
  const halfDayDeduction = staffDoc.wageType === 'MONTHLY' ? Math.round(halfDays * 0.5 * dailyRate) : 0;
  const absentDeduction = staffDoc.wageType === 'MONTHLY' ? Math.round(absents * 1.0 * dailyRate) : 0;
  const totalDeduction = halfDayDeduction + absentDeduction;

  // Compute Gross Salary
  let grossEarned = 0;
  if (staffDoc.wageType === 'DAILY') {
    grossEarned = Math.round(totalEffectiveDays * staffDoc.baseRate);
  } else {
    // MONTHLY wage calculation: base rate minus absent and half-day pay deductions
    grossEarned = Math.max(0, Math.round(staffDoc.baseRate - totalDeduction));
  }

  // Net Payable = Gross Earned minus Advances minus Previous Net Payouts
  const netPayable = Math.max(0, grossEarned - totalAdvancesKharcha - totalPreviousPayouts);
  const isPaid = netPayable === 0 && (totalPreviousPayouts > 0 || (staffDoc.wageType === 'DAILY' && totalEffectiveDays > 0));

  return {
    targetMonth,
    daysInMonth,
    cycleStartDate,
    cycleEndDate,
    daysPresent,
    halfDays,
    absents,
    leaves,
    totalMarkedDays,
    unmarkedDays,
    totalEffectiveDays,
    dailyRate,
    halfDayDeduction,
    absentDeduction,
    totalDeduction,
    totalAdvancesKharcha,
    totalPreviousPayouts,
    grossEarned,
    netPayable,
    isPaid,
    payoutRecord: monthPayouts.length > 0 ? monthPayouts[monthPayouts.length - 1] : undefined,
  };
};

/**
 * 1. Register New Shop Staff (Helper / Chota / Sales Boy)
 * POST /api/v1/dukan-staff
 */
export const createStaff = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const { staffName, phone, roleTitle, wageType, baseRate } = req.body;

    if (!staffName || !phone || baseRate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Staff name, phone number, and base rate are required.',
      });
    }

    const newStaff = await DukanStaffPayroll.create({
      profileId,
      staffName: staffName.trim(),
      phone: phone.trim(),
      roleTitle: (roleTitle || 'Chota / Sales Boy').trim(),
      wageType: wageType === 'DAILY' ? 'DAILY' : 'MONTHLY',
      baseRate: Number(baseRate),
      active: true,
      attendanceRecords: [],
      advancesKharcha: [],
      payrollsHistory: [],
    });

    const monthStats = computeStaffMonthStats(newStaff);

    try {
      await AuditLog.create({
        profileId,
        authorizedById: new Types.ObjectId(profileId),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType: 'STAFF_ADDED',
        reason: `New staff helper ${newStaff.staffName} (${newStaff.roleTitle}) registered with base rate Rs. ${newStaff.baseRate}`,
        details: { staffId: newStaff._id, baseRate: newStaff.baseRate, wageType: newStaff.wageType },
      });
    } catch (err) {}

    return res.status(201).json({
      success: true,
      message: `Staff member "${newStaff.staffName}" added successfully.`,
      data: {
        ...newStaff.toObject(),
        monthStats,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get All Shop Staff with Month Metrics
 * GET /api/v1/dukan-staff
 */
export const getStaffList = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const { month } = req.query;
    const targetMonth = (month as string) || new Date().toISOString().substring(0, 7);

    const staffMembers = await DukanStaffPayroll.find({ profileId, active: true }).sort({ createdAt: -1 });

    const formattedStaff = staffMembers.map((s) => {
      const monthStats = computeStaffMonthStats(s, targetMonth);
      return {
        ...s.toObject(),
        monthStats,
      };
    });

    // Automated End-of-Month / 1st-of-Month Tankhwa Due Push Notification Trigger
    const todayDay = new Date().getDate();
    const isMonthEndOrStart = todayDay >= 25 || todayDay <= 7;
    const unpaidStaff = formattedStaff.filter((s) => !s.monthStats.isPaid && s.monthStats.netPayable > 0);

    if (isMonthEndOrStart && unpaidStaff.length > 0 && profileId) {
      dispatchPushNotification(profileId.toString(), {
        id: `payroll-due-${targetMonth}-${Date.now()}`,
        category: 'STAFF_TANKHWA_DUE',
        priority: todayDay <= 5 || todayDay >= 28 ? 'CRITICAL' : 'WARNING',
        titleUrdu: 'ماہانہ تنخواہ کی ادائیگی کا وقت',
        titleEnglish: 'Monthly Staff Salary Payout Due',
        messageUrdu: `ماہانہ تنخواہ ادا کرنے کا وقت آ گیا ہے۔ (${unpaidStaff.length} ملازمین کی تنخواہ واجب الادا ہے)۔`,
        messageEnglish: `Monthly salary payout is due for ${unpaidStaff.length} staff helper(s).`,
        timestamp: new Date().toISOString(),
        actionLabel: 'تنخواہ ادا کریں',
        actionRoute: 'DukanStaffPayrollModal',
        durationMs: 8000,
      });
    }

    return res.status(200).json({
      success: true,
      month: targetMonth,
      data: formattedStaff,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3b. Auto-Mark Unmarked Attendance Days (Bulk fill remaining calendar days as PRESENT or ABSENT)
 * POST /api/v1/dukan-staff/:id/auto-mark-unmarked or POST /api/v1/dukan-staff/auto-mark-unmarked
 */
export const autoMarkUnmarkedAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const staffId = req.params.id || req.body.staffId;
    const { month, defaultStatus = 'PRESENT' } = req.body;

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const [yearStr, mStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const mNum = parseInt(mStr, 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, mNum, 0).getDate();

    const validStatus = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'].includes(defaultStatus)
      ? defaultStatus
      : 'PRESENT';

    const staffList = staffId && staffId !== 'ALL'
      ? await DukanStaffPayroll.find({ _id: staffId, profileId })
      : await DukanStaffPayroll.find({ profileId, active: true });

    if (!staffList || staffList.length === 0) {
      return res.status(404).json({ success: false, message: 'No staff members found.' });
    }

    let totalFilled = 0;
    const updatedStaff: any[] = [];

    for (const staff of staffList) {
      let filledCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`;
        const existing = staff.attendanceRecords.find((r) => r.date === dateStr);
        if (!existing) {
          staff.attendanceRecords.push({
            date: dateStr,
            status: validStatus as any,
            notes: `Auto-marked ${validStatus} on bulk catch-up`,
          });
          filledCount++;
        }
      }
      totalFilled += filledCount;
      await staff.save();
      updatedStaff.push({
        ...staff.toObject(),
        monthStats: computeStaffMonthStats(staff, targetMonth),
      });
    }

    return res.status(200).json({
      success: true,
      message: `${totalFilled} unmarked days automatically filled as ${validStatus} for ${updatedStaff.length} staff member(s).`,
      data: {
        staffList: updatedStaff,
        totalFilled,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3c. Bulk Mark Attendance for Date
 * POST /api/v1/dukan-staff/attendance/bulk
 */
export const bulkMarkAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const { date, records } = req.body;
    const targetDate = date || new Date().toISOString().substring(0, 10);

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid records array required.' });
    }

    const updatedStaffList: any[] = [];
    for (const rec of records) {
      if (!rec.staffId || !['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'].includes(rec.status)) continue;
      const staff = await DukanStaffPayroll.findOne({ _id: rec.staffId, profileId });
      if (staff) {
        const existingIndex = staff.attendanceRecords.findIndex((r) => r.date === targetDate);
        if (existingIndex >= 0) {
          staff.attendanceRecords[existingIndex].status = rec.status;
          if (rec.notes !== undefined) staff.attendanceRecords[existingIndex].notes = rec.notes;
        } else {
          staff.attendanceRecords.push({
            date: targetDate,
            status: rec.status,
            notes: rec.notes,
          });
        }
        await staff.save();
        updatedStaffList.push({
          ...staff.toObject(),
          monthStats: computeStaffMonthStats(staff, targetDate.substring(0, 7)),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk attendance marked for ${updatedStaffList.length} staff member(s) on ${targetDate}.`,
      data: updatedStaffList,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Mark Daily Attendance
 * POST /api/v1/dukan-staff/:id/attendance
 */
export const markAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const { id } = req.params;
    const { date, status, notes } = req.body;

    const dateStr = date || new Date().toISOString().substring(0, 10);

    if (!['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance status. Must be PRESENT, ABSENT, HALF_DAY, or LEAVE.',
      });
    }

    const staff = await DukanStaffPayroll.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Check if attendance entry already exists for date
    const existingIndex = staff.attendanceRecords.findIndex((r) => r.date === dateStr);
    if (existingIndex >= 0) {
      staff.attendanceRecords[existingIndex].status = status;
      if (notes !== undefined) staff.attendanceRecords[existingIndex].notes = notes;
    } else {
      staff.attendanceRecords.push({
        date: dateStr,
        status,
        notes: notes || undefined,
      });
    }

    await staff.save();
    const monthStats = computeStaffMonthStats(staff, dateStr.substring(0, 7));

    return res.status(200).json({
      success: true,
      message: `Attendance for ${staff.staffName} marked as ${status} on ${dateStr}.`,
      data: {
        ...staff.toObject(),
        monthStats,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Add Daily Food Expense (Rozana Kharcha) / Advance Wage (Paishgi)
 * POST /api/v1/dukan-staff/:id/advance
 */
export const addAdvanceKharcha = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const id = req.params.id || req.body.staffId;
    const { amount, type = 'FOOD_KHARCHA', note, date, paymentMode = 'PHYSICAL_CASH' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required.' });
    }

    const staff = await DukanStaffPayroll.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Enforce Strict Jev Channel Solvency Gatekeeper
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    if (!profile.paymentChannels) {
      profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
    }

    let modeKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
    const modeUpper = String(paymentMode).toUpperCase();
    if (modeUpper.includes('BANK') || modeUpper.includes('RAAST')) modeKey = 'bankAccount';
    else if (modeUpper.includes('WALLET') || modeUpper.includes('JAZZ') || modeUpper.includes('EASY')) modeKey = 'digitalWallet';

    const currentBalance = profile.paymentChannels[modeKey] || 0;
    if (currentBalance < numAmount) {
      const channelLabelUr = modeKey === 'cashDrawer' ? 'دکان گلہ (Cash Till)' : modeKey === 'bankAccount' ? 'بینک کھاتہ' : 'ڈیجیٹل والیٹ';
      return res.status(422).json({
        success: false,
        code: 'CRITICAL_HALT_INSUFFICIENT_FUNDS',
        message: `⚠️ ادائیگی ناممکن: منتخب کھاتہ (${channelLabelUr}) میں رقم ناکافی ہے۔ موجودہ بیلنس: Rs. ${currentBalance.toLocaleString()}، درکار رقم: Rs. ${numAmount.toLocaleString()}۔`,
        messageEn: `Critical Solvency Alert: Insufficient funds in ${modeKey}. Available: Rs. ${currentBalance.toLocaleString()}, Required: Rs. ${numAmount.toLocaleString()}.`,
        availableBalance: currentBalance,
        shortageAmount: numAmount - currentBalance,
      });
    }

    const dateStr = date || new Date().toISOString().substring(0, 10);

    staff.advancesKharcha.push({
      date: dateStr,
      amount: numAmount,
      type: type === 'ADVANCE_WAGE' ? 'ADVANCE_WAGE' : type === 'OTHER' ? 'OTHER' : 'FOOD_KHARCHA',
      note: note ? note.trim() : undefined,
    });

    await staff.save();

    // Auto-emit CASH_OUT entry in central ledger
    const categoryName = type === 'FOOD_KHARCHA' ? 'Staff Food Expense (Kharcha)' : 'Staff Advance Salary (Paishgi)';
    await LedgerEntry.create({
      profileId,
      subAccountId,
      entryType: 'CASH_OUT',
      amount: numAmount,
      paymentMode,
      category: categoryName,
      description: `${categoryName} given to ${staff.staffName} (${staff.roleTitle}). ${note || ''}`,
      inputMode: 'MANUAL',
      isSettled: true,
      settledAt: new Date(),
    });

    // Deduct channel balance atomically
    profile.paymentChannels[modeKey] = currentBalance - numAmount;
    profile.markModified('paymentChannels');
    await profile.save();

    const monthStats = computeStaffMonthStats(staff, dateStr.substring(0, 7));

    if (profileId) {
      dispatchPushNotification(profileId.toString(), {
        id: `advance-${staff._id}-${Date.now()}`,
        category: 'STAFF_TANKHWA_DUE',
        priority: 'INFO',
        titleUrdu: 'اسٹاف پیشگی / خرچہ',
        titleEnglish: 'Staff Advance / Kharcha',
        messageUrdu: `ملازم ${staff.staffName} کو Rs. ${numAmount.toLocaleString()} ${type === 'FOOD_KHARCHA' ? 'خرچہ' : 'پیشگی'} دیا گیا۔`,
        messageEnglish: `Rs. ${numAmount.toLocaleString()} ${type === 'FOOD_KHARCHA' ? 'Kharcha' : 'Advance'} logged for ${staff.staffName}.`,
        timestamp: new Date().toISOString(),
        actionLabel: 'تفصیل دیکھئے',
        actionRoute: 'DukanStaffPayrollModal',
        durationMs: 4500,
      });

      try {
        const metrics = await getAggregatedStoreMetrics(profileId);
        dispatchMetricsSync(profileId.toString(), metrics);
      } catch (err) {}
    }

    return res.status(200).json({
      success: true,
      message: `Rs. ${numAmount} ${type === 'FOOD_KHARCHA' ? 'Kharcha' : 'Advance'} logged for ${staff.staffName}.`,
      data: {
        ...staff.toObject(),
        monthStats,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Settle Monthly Tankha / Salary Payout
 * POST /api/v1/dukan-staff/:id/payout
 */
export const settleMonthlyPayout = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const id = req.params.id || req.body.staffId;
    const { month, paymentMode = 'PHYSICAL_CASH', notes } = req.body;

    const targetMonth = month || new Date().toISOString().substring(0, 7);

    const staff = await DukanStaffPayroll.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const monthStats = computeStaffMonthStats(staff, targetMonth);
    if (monthStats.netPayable <= 0) {
      return res.status(400).json({
        success: false,
        message: `No remaining salary balance to settle for ${staff.staffName} (${targetMonth}).`,
      });
    }

    // Enforce Strict Jev Channel Solvency Gatekeeper
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    if (!profile.paymentChannels) {
      profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
    }

    let modeKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
    const modeUpper = String(paymentMode).toUpperCase();
    if (modeUpper.includes('BANK') || modeUpper.includes('RAAST')) modeKey = 'bankAccount';
    else if (modeUpper.includes('WALLET') || modeUpper.includes('JAZZ') || modeUpper.includes('EASY')) modeKey = 'digitalWallet';

    const currentBalance = profile.paymentChannels[modeKey] || 0;
    if (monthStats.netPayable > 0 && currentBalance < monthStats.netPayable) {
      const channelLabelUr = modeKey === 'cashDrawer' ? 'دکان گلہ (Cash Till)' : modeKey === 'bankAccount' ? 'بینک کھاتہ' : 'ڈیجیٹل والیٹ';
      return res.status(422).json({
        success: false,
        code: 'CRITICAL_HALT_INSUFFICIENT_FUNDS',
        message: `⚠️ تنخواہ کی ادائیگی ناممکن: منتخب کھاتہ (${channelLabelUr}) میں رقم ناکافی ہے۔ موجودہ بیلنس: Rs. ${currentBalance.toLocaleString()}، واجب الادا تنخواہ: Rs. ${monthStats.netPayable.toLocaleString()}۔`,
        messageEn: `Critical Solvency Alert: Insufficient funds in ${modeKey}. Available: Rs. ${currentBalance.toLocaleString()}, Net Salary Due: Rs. ${monthStats.netPayable.toLocaleString()}.`,
        availableBalance: currentBalance,
        shortageAmount: monthStats.netPayable - currentBalance,
      });
    }

    const payoutRecord = {
      month: targetMonth,
      daysWorked: monthStats.totalEffectiveDays,
      grossEarned: monthStats.grossEarned,
      advancesDeducted: monthStats.totalAdvancesKharcha,
      netPaid: monthStats.netPayable,
      paidAt: new Date(),
      paymentMode,
      notes: notes ? notes.trim() : undefined,
    };

    staff.payrollsHistory.push(payoutRecord);
    await staff.save();

    // Auto-emit CASH_OUT in central ledger if netPaid > 0
    if (monthStats.netPayable > 0) {
      await LedgerEntry.create({
        profileId,
        subAccountId,
        entryType: 'CASH_OUT',
        amount: monthStats.netPayable,
        paymentMode,
        category: 'Staff Salary Payout',
        description: `Monthly Tankha payout for ${staff.staffName} (${staff.roleTitle}) - Month ${targetMonth}. Gross: Rs. ${monthStats.grossEarned}, Deducted: Rs. ${monthStats.totalAdvancesKharcha}`,
        inputMode: 'MANUAL',
        isSettled: true,
        settledAt: new Date(),
      });

      // Deduct channel balance atomically
      profile.paymentChannels[modeKey] = currentBalance - monthStats.netPayable;
      profile.markModified('paymentChannels');
      await profile.save();
    }

    if (profileId) {
      dispatchPushNotification(profileId.toString(), {
        id: `payroll-${staff._id}-${Date.now()}`,
        category: 'STAFF_TANKHWA_DUE',
        priority: 'SUCCESS',
        titleUrdu: 'اسٹاف تنخواہ ادائیگی',
        titleEnglish: 'Staff Salary Payout Settled',
        messageUrdu: `ملازم ${staff.staffName} کی ماہانہ تنخواہ (Rs. ${monthStats.netPayable.toLocaleString()}) ادا کر دی گئی ہے۔`,
        messageEnglish: `Monthly salary payout of Rs. ${monthStats.netPayable.toLocaleString()} settled for ${staff.staffName}.`,
        timestamp: new Date().toISOString(),
        actionLabel: 'اسٹاف رجسٹر',
        actionRoute: 'DukanStaffPayrollModal',
        durationMs: 4500,
      });

      try {
        const metrics = await getAggregatedStoreMetrics(profileId);
        dispatchMetricsSync(profileId.toString(), metrics);
      } catch (err) {}
    }

    return res.status(200).json({
      success: true,
      message: `Tankha payout of Rs. ${monthStats.netPayable} settled for ${staff.staffName} (${targetMonth}).`,
      data: {
        payoutRecord,
        updatedStaff: {
          ...staff.toObject(),
          monthStats: computeStaffMonthStats(staff, targetMonth),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Delete / Deactivate Shop Staff
 * DELETE /api/v1/dukan-staff/:id
 */
export const deleteStaff = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (req.user?.subAccountId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Denied: Staff payroll and attendance can only be managed by the primary Shop Owner (مالک دکان).',
      });
    }

    const profileId = req.user?.id;
    const { id } = req.params;

    const staff = await DukanStaffPayroll.findOne({ _id: id, profileId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await DukanStaffPayroll.deleteOne({ _id: id, profileId });

    try {
      await AuditLog.create({
        profileId,
        authorizedById: new Types.ObjectId(profileId),
        authorizedByName: (req.user as any)?.fullName || 'Dukandar',
        authorizedByRole: 'OWNER',
        actionType: 'STAFF_DELETED',
        reason: `Staff helper ${staff.staffName} (${staff.roleTitle}) deleted permanently`,
        details: { staffId: id, staffName: staff.staffName },
      });
    } catch (err) {}

    return res.status(200).json({
      success: true,
      message: `Staff member "${staff.staffName}" deleted successfully.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
