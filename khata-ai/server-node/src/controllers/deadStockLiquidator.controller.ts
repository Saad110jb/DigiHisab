import { Request, Response } from 'express';
import { DeadStockLiquidatorEngine } from '../services/deadStockLiquidator.service';

/**
 * Get Turnover Hazards & Dead-Stock Summary
 * GET /api/v1/dead-stock/summary
 */
export const getDeadStockSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const summary = await DeadStockLiquidatorEngine.getSummary(profileId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('[getDeadStockSummary Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating dead stock summary.',
    });
  }
};

/**
 * Get AI-Generated High-Margin Bundles
 * GET /api/v1/dead-stock/bundles
 */
export const getBundleRecommendations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const bundles = await DeadStockLiquidatorEngine.generateBundles(profileId);

    return res.status(200).json({
      success: true,
      data: bundles,
    });
  } catch (error: any) {
    console.error('[getBundleRecommendations Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating bundle recommendations.',
    });
  }
};

/**
 * Apply Promotional Clearance Markdown to Item
 * POST /api/v1/dead-stock/apply-markdown
 */
export const applyItemMarkdown = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const { itemId, discountPercent } = req.body;
    if (!itemId || typeof discountPercent !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'itemId and discountPercent number are required.',
      });
    }

    const updatedItem = await DeadStockLiquidatorEngine.applyMarkdown(profileId, itemId, discountPercent);
    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Promotional markdown of ${discountPercent}% applied successfully.`,
      data: updatedItem,
    });
  } catch (error: any) {
    console.error('[applyItemMarkdown Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error applying markdown.',
    });
  }
};
