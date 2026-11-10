/**
 * DigiHisab FastAPI Client Bridge
 * Connects Node.js Express server to the Python FastAPI AI Subsystem
 * (Chor Nazar Isolation Forest ML, Roman-Urdu NLU Engine, etc.)
 */

import { env } from '../config/env';

export interface ITillFeatureVector {
  amount_deviation_ratio: number;
  time_skew: number;
  void_ratio: number;
  drawer_variance: number;
  velocity: number;
  cashier_id?: string;
  cashier_name?: string;
  till_id?: string;
}

export interface IAnomalyFactor {
  factor: string;
  en: string;
  ur: string;
}

export interface IAnomalyScoreResult {
  success: boolean;
  is_anomaly: boolean;
  anomaly_score: number;
  raw_decision_score: number;
  risk_score: number;
  risk_percentage: number;
  tier: 'NORMAL' | 'ELEVATED' | 'CRITICAL_ALERT';
  requires_biometric: boolean;
  alert_title_en: string;
  alert_title_ur: string;
  factors: IAnomalyFactor[];
  isFallback?: boolean;
}

export class FastApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FASTAPI_URL || (env as any).FASTAPI_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Scores cashier till operations using the Isolation Forest ML Model
   */
  async scoreTillAnomaly(features: ITillFeatureVector): Promise<IAnomalyScoreResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${this.baseUrl}/api/v1/anomalies/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(features),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as IAnomalyScoreResult;
        if (data && data.success) {
          return data;
        }
      }
    } catch (error: any) {
      console.log(`[FastApiClient] FastAPI anomaly scoring offline (${error.message}). Invoking calibrated fallback.`);
    }

    // Heuristic Isolation Fallback (Zero-Downtime Guarantee)
    return this.calculateHeuristicScore(features);
  }

  /**
   * Local Calibrated Heuristic Scoring in case Python microservice is booting or offline
   */
  private calculateHeuristicScore(features: ITillFeatureVector): IAnomalyScoreResult {
    const { amount_deviation_ratio, void_ratio, drawer_variance, velocity } = features;

    let penalty = 0;
    const factors: IAnomalyFactor[] = [];

    // 1. Drawer discrepancy evaluation
    if (drawer_variance > 2000) {
      penalty += 0.50;
      factors.push({
        factor: 'drawer_variance',
        en: `High cash drawer discrepancy of PKR ${drawer_variance.toLocaleString()}.`,
        ur: `گلے میں PKR ${drawer_variance.toLocaleString()} کا خطرناک خسارہ۔`,
      });
    } else if (drawer_variance > 500) {
      penalty += 0.25;
      factors.push({
        factor: 'drawer_variance',
        en: `Elevated cash drawer variance of PKR ${drawer_variance.toLocaleString()}.`,
        ur: `گلے میں PKR ${drawer_variance.toLocaleString()} کا غیر معمولی فرق۔`,
      });
    }

    // 2. Void item ratio evaluation
    if (void_ratio > 0.35) {
      penalty += 0.35;
      factors.push({
        factor: 'void_ratio',
        en: `Excessive void ratio of ${(void_ratio * 100).toFixed(1)}% in current shift.`,
        ur: `موجودہ شفٹ میں ${(void_ratio * 100).toFixed(1)} فیصد کینسل اشیاء کی غیرمعمولی شرح۔`,
      });
    } else if (void_ratio > 0.15) {
      penalty += 0.15;
      factors.push({
        factor: 'void_ratio',
        en: `Elevated void ratio of ${(void_ratio * 100).toFixed(1)}%.`,
        ur: `کینسل اشیاء کی بلند شرح ${(void_ratio * 100).toFixed(1)} فیصد۔`,
      });
    }

    // 3. Amount deviation evaluation
    if (amount_deviation_ratio > 4.0) {
      penalty += 0.25;
      factors.push({
        factor: 'amount_deviation_ratio',
        en: `Transaction amount is ${amount_deviation_ratio.toFixed(1)}x greater than 30-day baseline average.`,
        ur: `لین دین کی رقم معمول کے اوسط سے ${amount_deviation_ratio.toFixed(1)} گنا زیادہ ہے۔`,
      });
    }

    // 4. Hurried sales velocity
    if (velocity > 4.5) {
      penalty += 0.20;
      factors.push({
        factor: 'velocity',
        en: `Abnormally high velocity of ${velocity.toFixed(1)} transactions/min.`,
        ur: `تیز رفتار مشکوک کیش انٹریز (${velocity.toFixed(1)} فی منٹ)۔`,
      });
    }

    const risk_score = Math.min(1.0, Math.max(0.04, penalty));
    const is_anomaly = risk_score >= 0.70;
    const tier = risk_score > 0.75 ? 'CRITICAL_ALERT' : risk_score > 0.40 ? 'ELEVATED' : 'NORMAL';
    const requires_biometric = risk_score > 0.75;

    return {
      success: true,
      is_anomaly,
      anomaly_score: is_anomaly ? -1 : 1,
      raw_decision_score: is_anomaly ? -0.25 : 0.25,
      risk_score,
      risk_percentage: Math.round(risk_score * 100),
      tier,
      requires_biometric,
      alert_title_en: requires_biometric
        ? '🚨 Chor Nazar Red Alert: Manager Biometric Required'
        : 'Till Sentinel Assessment',
      alert_title_ur: requires_biometric
        ? '🚨 چور نظر ریڈ الرٹ: منیجر کی تصدیق لازمی ہے'
        : 'گلے کی باقاعدہ جانچ',
      factors,
      isFallback: true,
    };
  }
}

export const fastApiClient = new FastApiClient();
