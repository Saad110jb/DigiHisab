import { Request, Response } from 'express';
import { RashanPlanService } from '../services/rashanPlan.service';

export class RashanPlanController {
  /**
   * 1. Get or Create Monthly Rashan Plan
   * GET /api/v1/domestic/rashan
   */
  static async getCurrentPlan(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { month, year, householdSize } = req.query;
      const parsedMonth = month ? parseInt(month as string, 10) : undefined;
      const parsedYear = year ? parseInt(year as string, 10) : undefined;
      const parsedSize = householdSize ? parseInt(householdSize as string, 10) : 5;

      const plan = await RashanPlanService.getOrCreatePlan(
        profileId,
        parsedMonth,
        parsedYear,
        parsedSize
      );

      return res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch rashan plan',
      });
    }
  }

  /**
   * 2. Update Item in Rashan Plan
   * PATCH /api/v1/domestic/rashan/:planId/items/:itemId
   */
  static async updateItem(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId, itemId } = req.params;
      const updates = req.body;

      const plan = await RashanPlanService.updateItem(profileId, planId, itemId, updates);

      return res.status(200).json({
        success: true,
        message: 'راشن آئٹم میں تبدیلی محفوظ کر لی گئی ہے۔',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update rashan item',
      });
    }
  }

  /**
   * 3. Toggle In-Store Purchase State
   * POST /api/v1/domestic/rashan/:planId/items/:itemId/purchase
   */
  static async togglePurchase(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId, itemId } = req.params;
      const { isPurchased, actualQtyPurchased, actualUnitRate } = req.body;

      const plan = await RashanPlanService.toggleItemPurchase(
        profileId,
        planId,
        itemId,
        isPurchased !== undefined ? Boolean(isPurchased) : true,
        actualQtyPurchased !== undefined ? Number(actualQtyPurchased) : undefined,
        actualUnitRate !== undefined ? Number(actualUnitRate) : undefined
      );

      return res.status(200).json({
        success: true,
        message: isPurchased ? 'آئٹم سودا باسکٹ میں شامل ہو گیا (Purchased)' : 'آئٹم ان چیک کر دیا گیا (Unchecked)',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to toggle item purchase state',
      });
    }
  }

  /**
   * 4. Add Custom Item to Plan
   * POST /api/v1/domestic/rashan/:planId/items
   */
  static async addItem(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId } = req.params;
      const { nameUrdu, nameEnglish, category, targetQty, unit, estimatedUnitRate, notes } = req.body;

      if (!nameUrdu || !nameEnglish || !estimatedUnitRate || !targetQty) {
        return res.status(400).json({
          success: false,
          message: 'تمام ضروری تفصیلات (نام، مقدار، متوقع ریٹ) فراہم کریں۔',
        });
      }

      const plan = await RashanPlanService.addItem(profileId, planId, {
        nameUrdu: nameUrdu.trim(),
        nameEnglish: nameEnglish.trim(),
        category: category || 'GRAIN',
        targetQty: Number(targetQty),
        unit: unit || 'KG',
        estimatedUnitRate: Number(estimatedUnitRate),
        notes,
      });

      return res.status(201).json({
        success: true,
        message: 'نیا راشن آئٹم لسٹ میں شامل کر دیا گیا۔',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to add rashan item',
      });
    }
  }

  /**
   * 5. Remove Item from Plan
   * DELETE /api/v1/domestic/rashan/:planId/items/:itemId
   */
  static async removeItem(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId, itemId } = req.params;

      const plan = await RashanPlanService.removeItem(profileId, planId, itemId);

      return res.status(200).json({
        success: true,
        message: 'آئٹم راشن لسٹ سے ہٹا دیا گیا۔',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove rashan item',
      });
    }
  }

  /**
   * 6. Reset Plan to Default Staples
   * POST /api/v1/domestic/rashan/:planId/reset-defaults
   */
  static async resetDefaults(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId } = req.params;
      const { householdSize } = req.body;

      const plan = await RashanPlanService.resetToDefaults(
        profileId,
        planId,
        householdSize ? Number(householdSize) : 5
      );

      return res.status(200).json({
        success: true,
        message: 'راشن لسٹ بنیادی اشیاء پر ری سیٹ کر دی گئی ہے۔',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to reset rashan plan',
      });
    }
  }

  /**
   * 7. Reconcile Plan & Post to Ledger
   * POST /api/v1/domestic/rashan/:planId/reconcile
   */
  static async reconcilePlan(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId } = req.params;
      const { paymentMethod, recordToLedger, notes } = req.body;

      const result = await RashanPlanService.reconcilePlan(profileId, planId, {
        paymentMethod,
        recordToLedger: recordToLedger !== undefined ? Boolean(recordToLedger) : true,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'ماہانہ راشن خریداری مکمل اور کھاتے میں محفوظ کر لی گئی ہے۔',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to reconcile rashan plan',
      });
    }
  }

  /**
   * 8. Update Custom Monthly Budget Cap
   * PATCH /api/v1/domestic/rashan/:planId/budget-cap
   */
  static async updateBudgetCap(req: Request, res: Response): Promise<Response> {
    try {
      const profileId = req.user?.id?.toString();
      if (!profileId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { planId } = req.params;
      const { customTargetBudget } = req.body;

      const plan = await RashanPlanService.updateTargetBudget(
        profileId,
        planId,
        customTargetBudget !== undefined ? (customTargetBudget === null ? null : Number(customTargetBudget)) : null
      );

      return res.status(200).json({
        success: true,
        message: customTargetBudget
          ? `ماہانہ راشن بجٹ کیپ Rs. ${Number(customTargetBudget).toLocaleString()} مقرر کر دیا گیا۔`
          : 'بجٹ کیپ ہٹا دیا گیا، اشیاء کے مجموعی تخمینہ پر سیٹ کر دیا گیا۔',
        data: plan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update target budget cap',
      });
    }
  }

  /**
   * 9. Get Pre-Configured Staples Catalog
   * GET /api/v1/domestic/rashan/catalog
   */
  static async getCatalog(req: Request, res: Response): Promise<Response> {
    try {
      const { STAPLE_CATALOG } = await import('../services/rashanPlan.service');
      return res.status(200).json({
        success: true,
        data: STAPLE_CATALOG,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch staples catalog',
      });
    }
  }
}
