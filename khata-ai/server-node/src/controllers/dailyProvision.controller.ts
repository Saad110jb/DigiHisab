import { Request, Response } from 'express';
import { DailyProvisionService } from '../services/dailyProvision.service';

export class DailyProvisionController {
  /**
   * 1. Log Daily Provision (Milk & Roti Counter)
   * POST /api/v1/domestic/daily-provisions/log
   */
  static async logDailyProvision(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { date, milkLiters, isMilkSkipped, milkRate, rotiCount, isRotiSkipped, rotiRate, notes } = req.body;

      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid date in canonical YYYY-MM-DD format is required.',
        });
      }

      const log = await DailyProvisionService.logDailyProvision(profileId, {
        date: date.trim(),
        milkLiters: milkLiters !== undefined ? Number(milkLiters) : undefined,
        isMilkSkipped: Boolean(isMilkSkipped),
        milkRate: milkRate !== undefined ? Number(milkRate) : undefined,
        rotiCount: rotiCount !== undefined ? Number(rotiCount) : undefined,
        isRotiSkipped: Boolean(isRotiSkipped),
        rotiRate: rotiRate !== undefined ? Number(rotiRate) : undefined,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'روزانہ کاؤنٹر اندراج محفوظ کر لیا گیا ہے۔ (Daily provision logged)',
        data: log,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to log daily provision',
      });
    }
  }

  /**
   * 2. Get Month-End Reconciliation & Kacha Parcha Matcher
   * GET /api/v1/domestic/daily-provisions/reconciliation
   */
  static async getMonthReconciliation(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { month } = req.query;
      const monthKey = month && typeof month === 'string' ? month.trim() : undefined;

      const report = await DailyProvisionService.getMonthReconciliation(profileId, monthKey);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve month reconciliation',
      });
    }
  }

  /**
   * 3. Get Default Rates & Gwalah Settings
   * GET /api/v1/domestic/daily-provisions/settings
   */
  static async getSettings(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const settings = await DailyProvisionService.getOrCreateSettings(profileId);
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch settings',
      });
    }
  }

  /**
   * 4. Update Base Rates & Settings
   * PATCH /api/v1/domestic/daily-provisions/settings
   */
  static async updateSettings(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const updated = await DailyProvisionService.updateSettings(profileId, req.body);
      return res.status(200).json({
        success: true,
        message: 'ترتیبات کامیابی سے محفوظ کر دی گئیں (Settings updated)',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update settings',
      });
    }
  }

  /**
   * 5. Single-Tap Toggle Chutti for a Specific Day
   * PATCH /api/v1/domestic/daily-provisions/toggle-chutti
   */
  static async toggleChutti(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { date, provision = 'BOTH' } = req.body;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ success: false, message: 'Date is required.' });
      }

      const updated = await DailyProvisionService.toggleChutti(profileId, date.trim(), provision);
      return res.status(200).json({
        success: true,
        message: 'چھٹی / حاضری تبدیل کر دی گئی (Chutti status updated)',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to toggle chutti',
      });
    }
  }

  /**
   * 6. Record Advance Payment
   * POST /api/v1/domestic/daily-provisions/advance
   */
  static async recordAdvance(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { date, amount, paymentChannel = 'CASH', notes } = req.body;
      if (!date || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid date and positive amount are required for advance.',
        });
      }

      const updated = await DailyProvisionService.recordAdvance(profileId, {
        date: String(date).trim(),
        amount: Number(amount),
        paymentChannel,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'پیشگی ادائیگی محفوظ کر لی گئی (Advance recorded)',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record advance',
      });
    }
  }

  /**
   * 7. Settle Month Bill (Hisab Saaf Karein)
   * POST /api/v1/domestic/daily-provisions/settle
   */
  static async settleMonthlyBill(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { monthKey, amount, paymentChannel = 'CASH', notes } = req.body;
      if (!monthKey || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Month key (YYYY-MM) and positive settlement amount are required.',
        });
      }

      const result = await DailyProvisionService.settleMonthlyBill(profileId, {
        monthKey: String(monthKey).trim(),
        amount: Number(amount),
        paymentChannel,
        notes,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to settle monthly bill',
      });
    }
  }
}
