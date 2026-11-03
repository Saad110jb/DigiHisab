import { Types } from 'mongoose';
import { DailyProvisionLog, IDailyProvisionLog } from '../models/DailyProvisionLog';
import { DailyProvisionSettings, IDailyProvisionSettings, IDailyProvisionAdvance } from '../models/DailyProvisionSettings';
import { LedgerEntry } from '../models/LedgerEntry';

export interface ILogProvisionDTO {
  date: string; // "YYYY-MM-DD"
  milkLiters?: number;
  isMilkSkipped?: boolean;
  milkRate?: number;
  rotiCount?: number;
  isRotiSkipped?: boolean;
  rotiRate?: number;
  notes?: string;
}

export interface IReconciliationDayItem {
  dayNumber: number;
  date: string; // "YYYY-MM-DD"
  dayName: string; // "Mon", "Tue", etc.
  milkLiters: number;
  isMilkSkipped: boolean;
  milkRate: number;
  milkCost: number;
  rotiCount: number;
  isRotiSkipped: boolean;
  rotiRate: number;
  rotiCost: number;
  dailyTotal: number;
  notes?: string;
  isLogged: boolean;
  isFuture: boolean;
}

export interface IReconciliationReport {
  monthKey: string;
  monthNameUrdu: string;
  monthNameEnglish: string;
  calendarDays: IReconciliationDayItem[];
  metrics: {
    totalMilkLiters: number;
    totalMilkCost: number;
    totalRotiCount: number;
    totalRotiCost: number;
    totalGrossBill: number;
    milkSkippedDays: number;
    rotiSkippedDays: number;
    activeDeliveredDays: number;
    totalAdvancesDeducted: number;
    netPayable: number;
    isMonthSettled: boolean;
  };
  settings: {
    defaultMilkLiters: number;
    defaultRotiCount: number;
    baseMilkRate: number;
    baseRotiRate: number;
    milkmanName: string;
    milkmanPhone?: string;
    tandoorName: string;
    tandoorPhone?: string;
  };
  advances: IDailyProvisionAdvance[];
}

export class DailyProvisionService {
  /**
   * 1. Get or Create Household Provision Settings
   */
  static async getOrCreateSettings(profileId: string): Promise<IDailyProvisionSettings> {
    let settings = await DailyProvisionSettings.findOne({ profileId });
    if (!settings) {
      settings = await DailyProvisionSettings.create({
        profileId: new Types.ObjectId(profileId),
        defaultMilkLiters: 1.5,
        defaultRotiCount: 0,
        baseMilkRate: 210,
        baseRotiRate: 0,
        milkmanName: 'گوالہ (Gwalah)',
        advances: [],
      });
    }
    return settings;
  }

  /**
   * 2. Log Daily Counter (Milk & Roti)
   */
  static async logDailyProvision(
    profileId: string,
    dto: ILogProvisionDTO
  ): Promise<IDailyProvisionLog> {
    const settings = await this.getOrCreateSettings(profileId);
    
    // Normalize date format
    const dateStr = dto.date.trim();
    const monthKey = dateStr.substring(0, 7);

    const isMilkSkipped = Boolean(dto.isMilkSkipped || (dto.milkLiters !== undefined && dto.milkLiters === 0));
    const isRotiSkipped = Boolean(dto.isRotiSkipped || (dto.rotiCount !== undefined && dto.rotiCount === 0));

    const milkRate = dto.milkRate ?? settings.baseMilkRate;
    const rotiRate = dto.rotiRate ?? settings.baseRotiRate;

    const milkLiters = isMilkSkipped ? 0 : (dto.milkLiters ?? settings.defaultMilkLiters);
    const rotiCount = isRotiSkipped ? 0 : (dto.rotiCount ?? settings.defaultRotiCount);

    const milkCost = isMilkSkipped ? 0 : Math.round(milkLiters * milkRate);
    const rotiCost = isRotiSkipped ? 0 : Math.round(rotiCount * rotiRate);
    const dailyTotal = milkCost + rotiCost;

    const log = await DailyProvisionLog.findOneAndUpdate(
      { profileId: new Types.ObjectId(profileId), date: dateStr },
      {
        $set: {
          monthKey,
          milkLiters,
          isMilkSkipped,
          milkRate,
          milkCost,
          rotiCount,
          isRotiSkipped,
          rotiRate,
          rotiCost,
          dailyTotal,
          notes: dto.notes?.trim() || undefined,
          loggedBy: 'HOUSEHOLD_USER',
        },
      },
      { upsert: true, new: true }
    );

    return log;
  }

  /**
   * 3. 30-Day Month-End Reconciliation & Kacha Parcha Matcher
   */
  static async getMonthReconciliation(
    profileId: string,
    targetMonthKey?: string
  ): Promise<IReconciliationReport> {
    const settings = await this.getOrCreateSettings(profileId);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthKey = targetMonthKey || currentMonthKey;

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    // Calculate days in target month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Query existing logs
    const existingLogs = await DailyProvisionLog.find({
      profileId: new Types.ObjectId(profileId),
      monthKey,
    }).sort({ date: 1 });

    const logMap = new Map<string, IDailyProvisionLog>();
    for (const l of existingLogs) {
      logMap.set(l.date, l);
    }

    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const calendarDays: IReconciliationDayItem[] = [];

    let totalMilkLiters = 0;
    let totalMilkCost = 0;
    let totalRotiCount = 0;
    let totalRotiCost = 0;
    let milkSkippedDays = 0;
    let rotiSkippedDays = 0;
    let activeDeliveredDays = 0;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, day);
      const dayName = dayNames[dObj.getDay()];
      const isFuture = dateStr > todayDateStr;

      const log = logMap.get(dateStr);

      if (log) {
        calendarDays.push({
          dayNumber: day,
          date: dateStr,
          dayName,
          milkLiters: log.milkLiters,
          isMilkSkipped: log.isMilkSkipped,
          milkRate: log.milkRate,
          milkCost: log.milkCost,
          rotiCount: log.rotiCount,
          isRotiSkipped: log.isRotiSkipped,
          rotiRate: log.rotiRate,
          rotiCost: log.rotiCost,
          dailyTotal: log.dailyTotal,
          notes: log.notes,
          isLogged: true,
          isFuture,
        });

        totalMilkLiters += log.milkLiters;
        totalMilkCost += log.milkCost;
        totalRotiCount += log.rotiCount;
        totalRotiCost += log.rotiCost;

        if (log.isMilkSkipped) milkSkippedDays++;
        if (log.isRotiSkipped) rotiSkippedDays++;
        if (!log.isMilkSkipped && log.milkLiters > 0) activeDeliveredDays++;
      } else {
        // Not yet explicitly logged
        calendarDays.push({
          dayNumber: day,
          date: dateStr,
          dayName,
          milkLiters: isFuture ? 0 : settings.defaultMilkLiters,
          isMilkSkipped: false,
          milkRate: settings.baseMilkRate,
          milkCost: isFuture ? 0 : Math.round(settings.defaultMilkLiters * settings.baseMilkRate),
          rotiCount: isFuture ? 0 : settings.defaultRotiCount,
          isRotiSkipped: false,
          rotiRate: settings.baseRotiRate,
          rotiCost: isFuture ? 0 : Math.round(settings.defaultRotiCount * settings.baseRotiRate),
          dailyTotal: isFuture
            ? 0
            : Math.round(
                settings.defaultMilkLiters * settings.baseMilkRate +
                  settings.defaultRotiCount * settings.baseRotiRate
              ),
          isLogged: false,
          isFuture,
        });

        if (!isFuture) {
          totalMilkLiters += settings.defaultMilkLiters;
          totalMilkCost += Math.round(settings.defaultMilkLiters * settings.baseMilkRate);
          totalRotiCount += settings.defaultRotiCount;
          totalRotiCost += Math.round(settings.defaultRotiCount * settings.baseRotiRate);
          activeDeliveredDays++;
        }
      }
    }

    const totalGrossBill = totalMilkCost + totalRotiCost;

    // Filter advances belonging to this month
    const monthAdvances = (settings.advances || []).filter((a) =>
      a.date.startsWith(monthKey)
    );
    const totalAdvancesDeducted = monthAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const netPayable = Math.max(0, totalGrossBill - totalAdvancesDeducted);

    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNamesUrdu = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];

    const isMonthSettled = settings.lastSettledMonth === monthKey;

    return {
      monthKey,
      monthNameEnglish: `${monthNamesEn[month - 1]} ${year}`,
      monthNameUrdu: `${monthNamesUrdu[month - 1]} ${year}`,
      calendarDays,
      metrics: {
        totalMilkLiters: Math.round(totalMilkLiters * 10) / 10,
        totalMilkCost,
        totalRotiCount,
        totalRotiCost,
        totalGrossBill,
        milkSkippedDays,
        rotiSkippedDays,
        activeDeliveredDays,
        totalAdvancesDeducted,
        netPayable,
        isMonthSettled,
      },
      settings: {
        defaultMilkLiters: settings.defaultMilkLiters,
        defaultRotiCount: settings.defaultRotiCount,
        baseMilkRate: settings.baseMilkRate,
        baseRotiRate: settings.baseRotiRate,
        milkmanName: settings.milkmanName,
        milkmanPhone: settings.milkmanPhone,
        tandoorName: settings.tandoorName,
        tandoorPhone: settings.tandoorPhone,
      },
      advances: monthAdvances,
    };
  }

  /**
   * 4. Single-Tap Toggle Chutti for past/current day
   */
  static async toggleChutti(
    profileId: string,
    date: string,
    provision: 'MILK' | 'ROTI' | 'BOTH'
  ): Promise<IDailyProvisionLog> {
    const existing = await DailyProvisionLog.findOne({
      profileId: new Types.ObjectId(profileId),
      date,
    });

    const settings = await this.getOrCreateSettings(profileId);

    if (existing) {
      if (provision === 'MILK' || provision === 'BOTH') {
        existing.isMilkSkipped = !existing.isMilkSkipped;
        existing.milkLiters = existing.isMilkSkipped ? 0 : settings.defaultMilkLiters;
        existing.milkCost = existing.isMilkSkipped ? 0 : Math.round(existing.milkLiters * existing.milkRate);
      }
      if (provision === 'ROTI' || provision === 'BOTH') {
        existing.isRotiSkipped = !existing.isRotiSkipped;
        existing.rotiCount = existing.isRotiSkipped ? 0 : settings.defaultRotiCount;
        existing.rotiCost = existing.isRotiSkipped ? 0 : Math.round(existing.rotiCount * existing.rotiRate);
      }
      existing.dailyTotal = existing.milkCost + existing.rotiCost;
      await existing.save();
      return existing;
    } else {
      // Create new with skipped state
      const isMilk = provision === 'MILK' || provision === 'BOTH';
      const isRoti = provision === 'ROTI' || provision === 'BOTH';

      return await this.logDailyProvision(profileId, {
        date,
        isMilkSkipped: isMilk,
        milkLiters: isMilk ? 0 : settings.defaultMilkLiters,
        isRotiSkipped: isRoti,
        rotiCount: isRoti ? 0 : settings.defaultRotiCount,
        notes: 'Chutti / نہیں آیا',
      });
    }
  }

  /**
   * 5. Record Advance Payment to Gwalah or Tandoor
   */
  static async recordAdvance(
    profileId: string,
    advance: {
      date: string;
      amount: number;
      paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
      notes?: string;
    }
  ): Promise<IDailyProvisionSettings> {
    const settings = await this.getOrCreateSettings(profileId);
    settings.advances.push({
      date: advance.date,
      amount: advance.amount,
      paymentChannel: advance.paymentChannel,
      notes: advance.notes,
    });
    await settings.save();
    return settings;
  }

  /**
   * 6. Settle Month Bill (Hisab Saaf Karein) & Post to Household Khata Ledger
   */
  static async settleMonthlyBill(
    profileId: string,
    params: {
      monthKey: string;
      amount: number;
      paymentChannel: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
      notes?: string;
    }
  ): Promise<{ success: boolean; ledgerEntryId: string; message: string }> {
    const settings = await this.getOrCreateSettings(profileId);

    // Record CASH_OUT in household khata ledger
    const entry = await LedgerEntry.create({
      profileId: new Types.ObjectId(profileId),
      entryType: 'CASH_OUT',
      amount: params.amount,
      category: 'Milk Delivery Tab / دودھ کا ماہانہ بل',
      paymentMethod: params.paymentChannel,
      description: `دودھ کا ماہانہ بل برائے ${params.monthKey} بذریعہ ${params.paymentChannel} ${
        params.notes ? `(${params.notes})` : ''
      }`,
      notes: `Settled via Digi Hisab Milk Delivery Tab (${params.paymentChannel})`,
      performedBy: 'HOUSEHOLD_USER',
    });

    settings.lastSettledMonth = params.monthKey;
    await settings.save();

    return {
      success: true,
      ledgerEntryId: (entry._id as any).toString(),
      message: `بل برائے ${params.monthKey} کامیابی سے ادا اور کھاتے میں درج کر دیا گیا ہے۔`,
    };
  }

  /**
   * 7. Update Default Settings (Rates, Volumes, Names)
   */
  static async updateSettings(
    profileId: string,
    updates: Partial<IDailyProvisionSettings>
  ): Promise<IDailyProvisionSettings> {
    const settings = await this.getOrCreateSettings(profileId);
    if (updates.defaultMilkLiters !== undefined) settings.defaultMilkLiters = updates.defaultMilkLiters;
    if (updates.defaultRotiCount !== undefined) settings.defaultRotiCount = updates.defaultRotiCount;
    if (updates.baseMilkRate !== undefined) settings.baseMilkRate = updates.baseMilkRate;
    if (updates.baseRotiRate !== undefined) settings.baseRotiRate = updates.baseRotiRate;
    if (updates.milkmanName !== undefined) settings.milkmanName = updates.milkmanName;
    if (updates.milkmanPhone !== undefined) settings.milkmanPhone = updates.milkmanPhone;
    if (updates.tandoorName !== undefined) settings.tandoorName = updates.tandoorName;
    if (updates.tandoorPhone !== undefined) settings.tandoorPhone = updates.tandoorPhone;
    await settings.save();
    return settings;
  }
}
