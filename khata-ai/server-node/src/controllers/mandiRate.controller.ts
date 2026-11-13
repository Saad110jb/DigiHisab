import { Request, Response } from 'express';
import {
  mandiScraperService,
} from '../services/mandiScraper.service';
import { MandiCity } from '../models/MandiMarketRate';

const VALID_CITIES: MandiCity[] = ['Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan'];

/**
 * 1. Get Live Mandi & Grocery Commodity Rates
 * GET /api/v1/mandi/live-rates?city=Lahore&category=ALL&search=tamatar
 */
export const getLiveRates = async (req: Request, res: Response): Promise<Response> => {
  try {
    let city = (req.query.city as MandiCity) || 'Lahore';
    if (!VALID_CITIES.includes(city)) {
      city = 'Lahore';
    }

    const category = (req.query.category as string) || 'ALL';
    const search = ((req.query.search as string) || '').trim().toLowerCase();

    const result = await mandiScraperService.getOrFetchDailyRates(city);

    let filtered = result.data;

    // Filter by Category
    if (category && category !== 'ALL') {
      filtered = filtered.filter((item) => item.category === category);
    }

    // Filter by Search (English or Urdu)
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.nameEnglish.toLowerCase().includes(search) ||
          item.nameUrdu.toLowerCase().includes(search) ||
          item.commodityKey.toLowerCase().includes(search)
      );
    }

    return res.status(200).json({
      success: true,
      city: result.city,
      marketSource: result.marketSource,
      dateStr: result.dateStr,
      totalItems: filtered.length,
      data: filtered,
    });
  } catch (error: any) {
    console.error('[getLiveRates Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch live Mandi rates.',
    });
  }
};

/**
 * 2. Get Historical Price Trend for a Single Commodity
 * GET /api/v1/mandi/historical-trend/:commodityKey?city=Lahore&days=30
 */
export const getHistoricalTrend = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { commodityKey } = req.params;
    let city = (req.query.city as MandiCity) || 'Lahore';
    if (!VALID_CITIES.includes(city)) city = 'Lahore';

    const days = parseInt(req.query.days as string, 10) || 30;

    const trend = await mandiScraperService.getHistoricalTrend(commodityKey, city, days);

    return res.status(200).json({
      success: true,
      commodityKey,
      city,
      days: trend.length,
      data: trend,
    });
  } catch (error: any) {
    console.error('[getHistoricalTrend Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch historical trend.',
    });
  }
};

/**
 * 3. Force Sync Today's Mandi Rates (Admin / Cashier trigger)
 * POST /api/v1/mandi/sync-now
 */
export const syncMandiRatesNow = async (req: Request, res: Response): Promise<Response> => {
  try {
    await mandiScraperService.scheduleDailyIngestion();
    return res.status(200).json({
      success: true,
      message: 'Mandi daily rate ingestion refreshed across all 5 major cities.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger rate sync.',
    });
  }
};
