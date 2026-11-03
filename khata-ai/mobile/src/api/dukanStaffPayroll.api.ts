import { apiClient } from './client';

export interface IAttendanceRecord {
  date: string; // "YYYY-MM-DD"
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  notes?: string;
}

export interface IAdvanceKharcha {
  _id?: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  type: 'FOOD_KHARCHA' | 'ADVANCE_WAGE' | 'OTHER';
  note?: string;
}

export interface IPayoutRecord {
  month: string;
  daysWorked: number;
  grossEarned: number;
  advancesDeducted: number;
  netPaid: number;
  paidAt: string;
  paymentMode: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';
  notes?: string;
}

export interface IStaffMonthStats {
  targetMonth: string;
  daysInMonth: number;
  cycleStartDate: string;
  cycleEndDate: string;
  daysPresent: number;
  halfDays: number;
  absents: number;
  leaves: number;
  totalMarkedDays: number;
  unmarkedDays: number;
  totalEffectiveDays: number;
  dailyRate: number;
  halfDayDeduction: number;
  absentDeduction: number;
  totalDeduction: number;
  totalAdvancesKharcha: number;
  grossEarned: number;
  netPayable: number;
  isPaid: boolean;
  payoutRecord?: IPayoutRecord;
}

export interface IDukanStaff {
  _id: string;
  profileId?: string;
  staffName: string;
  phone: string;
  roleTitle: string;
  wageType: 'DAILY' | 'MONTHLY';
  baseRate: number;
  active: boolean;
  attendanceRecords: IAttendanceRecord[];
  advancesKharcha: IAdvanceKharcha[];
  payrollsHistory: IPayoutRecord[];
  monthStats?: IStaffMonthStats;
  createdAt?: string;
  updatedAt?: string;
}

// Initial Mock Staff for instant offline / Expo demo
const TODAY_STR = new Date().toISOString().substring(0, 10);
const CURRENT_MONTH = new Date().toISOString().substring(0, 7);

let localStaffStore: IDukanStaff[] = [];

export const dukanStaffPayrollApi = {
  getStaffList: async (month?: string): Promise<{ success: boolean; data: IDukanStaff[] }> => {
    try {
      const res = await apiClient.get('/dukan-staff', { params: { month } });
      if (res.data && res.data.success) {
        localStaffStore = res.data.data;
        return res.data;
      }
    } catch (e) {
      // Fallback offline mock response
    }

    const targetMonth = month || CURRENT_MONTH;
    const [yearStr, mStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const mNum = parseInt(mStr, 10) || (new Date().getMonth() + 1);
    const dInMonth = new Date(year, mNum, 0).getDate();

    const formatted = localStaffStore.map((s) => {
      // Refresh month stats locally if offline
      const monthAtt = s.attendanceRecords.filter((a) => a.date.startsWith(targetMonth));
      const daysP = monthAtt.filter((a) => a.status === 'PRESENT').length;
      const halfD = monthAtt.filter((a) => a.status === 'HALF_DAY').length;
      const absD = monthAtt.filter((a) => a.status === 'ABSENT').length;
      const lvsD = monthAtt.filter((a) => a.status === 'LEAVE').length;

      const totMarked = daysP + halfD + absD + lvsD;
      const unmark = Math.max(0, dInMonth - totMarked);
      const totalDays = daysP + lvsD + halfD * 0.5;

      const monthAdv = s.advancesKharcha.filter((a) => a.date.startsWith(targetMonth));
      const totalAdv = monthAdv.reduce((acc, curr) => acc + (curr.amount || 0), 0);

      const dRate = s.wageType === 'DAILY' ? s.baseRate : Math.round(s.baseRate / dInMonth);
      const halfDeduc = s.wageType === 'MONTHLY' ? Math.round(halfD * 0.5 * dRate) : 0;
      const absDeduc = s.wageType === 'MONTHLY' ? Math.round(absD * 1.0 * dRate) : 0;
      const totDeduc = halfDeduc + absDeduc;

      const gross = s.wageType === 'DAILY' ? Math.round(totalDays * s.baseRate) : Math.max(0, Math.round(s.baseRate - totDeduc));
      const net = Math.max(0, gross - totalAdv);

      return {
        ...s,
        monthStats: s.monthStats || {
          targetMonth,
          daysInMonth: dInMonth,
          cycleStartDate: `${targetMonth}-01`,
          cycleEndDate: `${targetMonth}-${String(dInMonth).padStart(2, '0')}`,
          daysPresent: daysP,
          halfDays: halfD,
          absents: absD,
          leaves: lvsD,
          totalMarkedDays: totMarked,
          unmarkedDays: unmark,
          totalEffectiveDays: totalDays,
          dailyRate: dRate,
          halfDayDeduction: halfDeduc,
          absentDeduction: absDeduc,
          totalDeduction: totDeduc,
          totalAdvancesKharcha: totalAdv,
          grossEarned: gross,
          netPayable: net,
          isPaid: s.payrollsHistory.some((p) => p.month === targetMonth),
        },
      };
    });

    return { success: true, data: formatted };
  },

  createStaff: async (payload: {
    staffName: string;
    phone: string;
    roleTitle?: string;
    wageType?: 'DAILY' | 'MONTHLY';
    baseRate: number;
  }): Promise<{ success: boolean; message?: string; data: IDukanStaff }> => {
    try {
      const res = await apiClient.post('/dukan-staff', payload);
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {
      // Fallback offline mock
    }

    const newStaff: IDukanStaff = {
      _id: `staff-${Date.now()}`,
      staffName: payload.staffName,
      phone: payload.phone,
      roleTitle: payload.roleTitle || 'Chota / Sales Boy',
      wageType: payload.wageType || 'MONTHLY',
      baseRate: payload.baseRate,
      active: true,
      attendanceRecords: [{ date: TODAY_STR, status: 'PRESENT' }],
      advancesKharcha: [],
      payrollsHistory: [],
      monthStats: {
        targetMonth: CURRENT_MONTH,
        daysInMonth: 30,
        cycleStartDate: `${CURRENT_MONTH}-01`,
        cycleEndDate: `${CURRENT_MONTH}-30`,
        daysPresent: 1,
        halfDays: 0,
        absents: 0,
        leaves: 0,
        totalMarkedDays: 1,
        unmarkedDays: 29,
        totalEffectiveDays: 1,
        dailyRate: payload.wageType === 'DAILY' ? payload.baseRate : Math.round(payload.baseRate / 30),
        halfDayDeduction: 0,
        absentDeduction: 0,
        totalDeduction: 0,
        totalAdvancesKharcha: 0,
        grossEarned: payload.baseRate,
        netPayable: payload.baseRate,
        isPaid: false,
      },
    };

    localStaffStore.unshift(newStaff);
    return { success: true, message: 'Staff member added successfully!', data: newStaff };
  },

  markAttendance: async (
    staffId: string,
    payload: { date?: string; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'; notes?: string }
  ): Promise<{ success: boolean; message?: string; data: IDukanStaff }> => {
    try {
      const res = await apiClient.post(`/dukan-staff/${staffId}/attendance`, payload);
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {
      // Fallback offline mock
    }

    const dateStr = payload.date || TODAY_STR;
    const staff = localStaffStore.find((s) => s._id === staffId);
    if (staff) {
      const existing = staff.attendanceRecords.find((a) => a.date === dateStr);
      if (existing) {
        existing.status = payload.status;
        existing.notes = payload.notes;
      } else {
        staff.attendanceRecords.push({ date: dateStr, status: payload.status, notes: payload.notes });
      }
    }

    return {
      success: true,
      message: `Attendance marked as ${payload.status}`,
      data: staff || localStaffStore[0],
    };
  },

  addAdvanceKharcha: async (
    staffId: string,
    payload: { amount: number; type?: 'FOOD_KHARCHA' | 'ADVANCE_WAGE' | 'OTHER'; note?: string; date?: string; paymentMode?: string }
  ): Promise<{ success: boolean; message?: string; data: IDukanStaff }> => {
    try {
      const res = await apiClient.post(`/dukan-staff/${staffId}/advance`, payload);
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {
      // Fallback offline mock
    }

    const dateStr = payload.date || TODAY_STR;
    const staff = localStaffStore.find((s) => s._id === staffId);
    if (staff) {
      const newAdv: IAdvanceKharcha = {
        _id: `adv-${Date.now()}`,
        date: dateStr,
        amount: payload.amount,
        type: payload.type || 'FOOD_KHARCHA',
        note: payload.note,
      };
      staff.advancesKharcha.push(newAdv);

      if (staff.monthStats) {
        staff.monthStats.totalAdvancesKharcha += payload.amount;
        staff.monthStats.netPayable = Math.max(0, staff.monthStats.grossEarned - staff.monthStats.totalAdvancesKharcha);
      }
    }

    return {
      success: true,
      message: `Rs. ${payload.amount} ${payload.type === 'FOOD_KHARCHA' ? 'Kharcha' : 'Advance'} recorded`,
      data: staff || localStaffStore[0],
    };
  },

  settleMonthlyPayout: async (
    staffId: string,
    payload: { month?: string; paymentMode?: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT'; notes?: string }
  ): Promise<{ success: boolean; message?: string; data: any }> => {
    try {
      const res = await apiClient.post(`/dukan-staff/${staffId}/payout`, payload);
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {
      // Fallback offline mock
    }

    const targetMonth = payload.month || CURRENT_MONTH;
    const staff = localStaffStore.find((s) => s._id === staffId);
    let netPaid = 0;
    if (staff && staff.monthStats) {
      netPaid = staff.monthStats.netPayable;
      staff.payrollsHistory.push({
        month: targetMonth,
        daysWorked: staff.monthStats.totalEffectiveDays,
        grossEarned: staff.monthStats.grossEarned,
        advancesDeducted: staff.monthStats.totalAdvancesKharcha,
        netPaid,
        paidAt: new Date().toISOString(),
        paymentMode: payload.paymentMode || 'PHYSICAL_CASH',
        notes: payload.notes,
      });
      staff.monthStats.isPaid = true;
      staff.monthStats.netPayable = 0;
    }

    return {
      success: true,
      message: `Tankha payout of Rs. ${netPaid} settled successfully!`,
      data: { updatedStaff: staff },
    };
  },

  deleteStaff: async (staffId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiClient.delete(`/dukan-staff/${staffId}`);
      if (res.data && res.data.success) {
        localStaffStore = localStaffStore.filter((s) => s._id !== staffId);
        return res.data;
      }
    } catch (e) {
      // Offline fallback
    }

    localStaffStore = localStaffStore.filter((s) => s._id !== staffId);
    return { success: true, message: 'Staff helper deleted successfully!' };
  },

  autoMarkUnmarked: async (
    staffId?: string,
    month?: string,
    defaultStatus: 'PRESENT' | 'ABSENT' = 'PRESENT'
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const url = staffId && staffId !== 'ALL'
        ? `/dukan-staff/${staffId}/auto-mark-unmarked`
        : `/dukan-staff/auto-mark-unmarked`;
      const res = await apiClient.post(url, {
        staffId: staffId && staffId !== 'ALL' ? staffId : undefined,
        month,
        defaultStatus,
      });
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {}

    return {
      success: true,
      message: 'Unmarked attendance days updated.',
    };
  },

  bulkMarkAttendance: async (
    date: string,
    records: Array<{ staffId: string; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'; notes?: string }>
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const res = await apiClient.post('/dukan-staff/attendance/bulk', {
        date,
        records,
      });
      if (res.data && res.data.success) {
        return res.data;
      }
    } catch (e) {}

    // Offline local update fallback
    records.forEach((rec) => {
      const staff = localStaffStore.find((s) => s._id === rec.staffId);
      if (staff) {
        const existing = staff.attendanceRecords.find((a) => a.date === date);
        if (existing) {
          existing.status = rec.status;
          existing.notes = rec.notes;
        } else {
          staff.attendanceRecords.push({ date, status: rec.status, notes: rec.notes });
        }
      }
    });

    return {
      success: true,
      message: `Bulk attendance marked for ${records.length} staff member(s).`,
      data: localStaffStore,
    };
  },
};
