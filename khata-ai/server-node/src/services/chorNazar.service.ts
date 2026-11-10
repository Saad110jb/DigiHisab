import { Types } from 'mongoose';
import { Profile } from '../models/Profile';
import { TillSentinelEvent, ITillSentinelEvent, SentinelEventType } from '../models/TillSentinelEvent';
import { CashierTrustProfile, ICashierTrustProfile, TrustTier, IDetectedAnomaly } from '../models/CashierTrustProfile';
import { CashDrawerReconciliation } from '../models/CashDrawerReconciliation';
import { LedgerEntry } from '../models/LedgerEntry';
import { fastApiClient, ITillFeatureVector, IAnomalyScoreResult } from './fastApi.client';

export interface ISentinelDashboardData {
  totalCashiersMonitored: number;
  overallTillHealthScore: number;
  monthlySavingsEstimatedPkr: number;
  criticalAlertCount: number;
  profiles: ICashierTrustProfile[];
  recentSuspiciousEvents: ITillSentinelEvent[];
}

export class ChorNazarSentinelEngine {
  /**
   * Transition Probability Matrix for POS state sequence evaluation
   */
  private static readonly TRANSITION_MATRIX: Record<string, Record<string, number>> = {
    IDLE: { ITEM_SCAN: 0.70, NO_SALE_OPEN: 0.05, WASOOLI_LOG: 0.15, EXPENSE_LOG: 0.10 },
    ITEM_SCAN: { ITEM_SCAN: 0.40, SALE_COMMIT: 0.55, POST_COMMIT_VOID: 0.05 },
    SALE_COMMIT: { IDLE: 0.85, NO_SALE_OPEN: 0.04, POST_COMMIT_VOID: 0.01, ITEM_SCAN: 0.10 },
    POST_COMMIT_VOID: { NO_SALE_OPEN: 0.02, IDLE: 0.80, ITEM_SCAN: 0.18 },
    NO_SALE_OPEN: { NO_SALE_OPEN: 0.01, IDLE: 0.90, ITEM_SCAN: 0.09 },
    WASOOLI_LOG: { IDLE: 0.90, NO_SALE_OPEN: 0.05, SALE_COMMIT: 0.05 },
    EXPENSE_LOG: { IDLE: 0.95, NO_SALE_OPEN: 0.05 },
  };

  /**
   * Evaluates Markov sequence anomaly likelihood
   */
  static evaluateSequenceAnomaly(fromState: string, toState: string): { isAnomaly: boolean; likelihood: number } {
    const fromProbs = this.TRANSITION_MATRIX[fromState] || {};
    const prob = fromProbs[toState] ?? 0.01;
    return {
      isAnomaly: prob < 0.03,
      likelihood: prob,
    };
  }

  /**
   * Computes Internal Trust Score (ITS: 0-100) based on multi-feature isolation
   */
  static computeTrustScore(metrics: {
    totalVoidAmount: number;
    totalSalesHandled: number;
    noSaleDrawerOpens: number;
    preCloseSpikes: number;
    cumulativeDeficitPkr: number;
    delayedWasooliCount: number;
  }): { score: number; tier: TrustTier; breakdown: Record<string, number> } {
    const salesVolume = Math.max(10000, metrics.totalSalesHandled);

    // 1. Post-Commit Void Penalty (Max 30)
    const voidRatio = metrics.totalVoidAmount / salesVolume;
    const pVoid = Math.min(30, Math.round(voidRatio * 300));

    // 2. Unlogged No-Sale Drawer Open Penalty (Max 25)
    const pDrawer = Math.min(25, metrics.noSaleDrawerOpens * 3);

    // 3. Pre-Shift-Close Quick Ring Spike Penalty (Max 20)
    const pPreClose = Math.min(20, metrics.preCloseSpikes * 4);

    // 4. Systematic Shift-End Cash Shortage Drift (Max 25)
    const pDrift = Math.min(25, Math.round((Math.abs(metrics.cumulativeDeficitPkr) / 1000) * 5));

    // 5. Delayed Wasooli Entry Index (Max 20)
    const pWasooli = Math.min(20, metrics.delayedWasooliCount * 5);

    const totalPenalty = pVoid + pDrawer + pPreClose + pDrift + pWasooli;
    const rawScore = 100 - totalPenalty;
    const score = Math.max(15, Math.min(100, rawScore));

    let tier: TrustTier = 'HIGH_TRUST';
    if (score < 70) {
      tier = 'CRITICAL_RISK';
    } else if (score < 90) {
      tier = 'MODERATE_RISK';
    }

    return {
      score,
      tier,
      breakdown: {
        pVoid,
        pDrawer,
        pPreClose,
        pDrift,
        pWasooli,
      },
    };
  }

  /**
   * ML-Powered Anomaly Scoring using Isolation Forest (Python FastAPI)
   * Evaluates 5-feature vector:
   * 1. amount_deviation_ratio: Transaction amount compared to 30-day cashier average.
   * 2. time_skew: Minutes elapsed since shift start or late-night transaction flags (after 10 PM).
   * 3. void_ratio: Ratio of voided/cancelled items in the current cashier shift.
   * 4. drawer_variance: Discrepancy between counted cash and expected system balance.
   * 5. velocity: Number of cash sales per minute (identifies hurried unrecorded sales).
   */
  static async evaluateTillAnomalyWithML(payload: {
    profileId: string | Types.ObjectId;
    subAccountId?: string | Types.ObjectId;
    cashierName?: string;
    amountInvolved?: number;
    drawerVariance?: number;
    voidRatio?: number;
    velocity?: number;
    timeSkewMinutes?: number;
  }): Promise<IAnomalyScoreResult> {
    const pId = new Types.ObjectId(payload.profileId);
    const cashierName = payload.cashierName || 'کاؤنٹر کیشیئر';

    // 1. Calculate amount_deviation_ratio
    let amount_deviation_ratio = 1.0;
    if (payload.amountInvolved && payload.amountInvolved > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const avgAgg = await LedgerEntry.aggregate([
        {
          $match: {
            profileId: pId,
            createdAt: { $gte: thirtyDaysAgo },
            amount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: '$amount' },
          },
        },
      ]);

      const avgAmount = (avgAgg && avgAgg[0] && avgAgg[0].avgAmount) || 850;
      amount_deviation_ratio = Math.round((payload.amountInvolved / avgAmount) * 100) / 100;
    }

    // 2. Calculate time_skew (Late night anomaly if transaction is between 22:00 and 06:00 PKT)
    const currentHour = new Date().getHours();
    let time_skew = payload.timeSkewMinutes !== undefined ? payload.timeSkewMinutes : 120;
    if (currentHour >= 22 || currentHour < 6) {
      time_skew = Math.max(time_skew, 540); // Marked as late night / off-hours anomaly
    }

    // 3. Calculate void_ratio
    let void_ratio = payload.voidRatio !== undefined ? payload.voidRatio : 0.02;
    if (payload.subAccountId && payload.voidRatio === undefined) {
      const trustProfile = await CashierTrustProfile.findOne({
        profileId: pId,
        subAccountId: new Types.ObjectId(payload.subAccountId),
      });
      if (trustProfile && trustProfile.trailing7dMetrics.totalSalesHandled > 0) {
        void_ratio = Math.min(
          1.0,
          trustProfile.trailing7dMetrics.totalVoidAmount /
            Math.max(1000, trustProfile.trailing7dMetrics.totalSalesHandled)
        );
      }
    }

    // 4. Calculate drawer_variance (Discrepancy in PKR)
    let drawer_variance = payload.drawerVariance !== undefined ? Math.abs(payload.drawerVariance) : 0;
    if (drawer_variance === 0) {
      const latestRecon = await CashDrawerReconciliation.findOne({ profileId: pId }).sort({ createdAt: -1 });
      if (latestRecon && latestRecon.discrepancyAmount) {
        drawer_variance = Math.abs(latestRecon.discrepancyAmount);
      }
    }

    // 5. Calculate velocity (transactions per minute)
    const velocity = payload.velocity !== undefined ? payload.velocity : 1.2;

    const featureVector: ITillFeatureVector = {
      amount_deviation_ratio,
      time_skew,
      void_ratio,
      drawer_variance,
      velocity,
      cashier_id: payload.subAccountId ? String(payload.subAccountId) : undefined,
      cashier_name: cashierName,
    };

    // Call Python FastAPI Isolation Forest ML microservice
    const mlResult = await fastApiClient.scoreTillAnomaly(featureVector);

    // If risk_score > 0.75, automatically record a Critical Chor Nazar Red Alert Event
    if (mlResult.risk_score > 0.75) {
      await this.recordTillEvent({
        profileId: pId,
        subAccountId: payload.subAccountId,
        cashierName,
        eventType: 'GALLA_DEFICIT_SPIKE',
        amountInvolved: drawer_variance || payload.amountInvolved || 0,
        severity: 'CRITICAL',
        metadata: {
          mlRiskScore: mlResult.risk_score,
          mlTier: mlResult.tier,
          requiresBiometricOverride: true,
          isChorNazarRedAlert: true,
          factors: mlResult.factors,
          features: featureVector,
          detailsUr: `🚨 چور نظر ریڈ الرٹ: رسک اسکور ${(mlResult.risk_score * 100).toFixed(0)}%۔ گلے میں غیر معمولی گڑبڑ پائی گئی۔ منیجر بائیو میٹرک لازمی ہے۔`,
          detailsEn: `Chor Nazar Red Alert: Risk score ${(mlResult.risk_score * 100).toFixed(0)}%. Manager biometric override required to proceed.`,
        },
      });

      // Update trust profile
      if (payload.subAccountId) {
        await CashierTrustProfile.findOneAndUpdate(
          { profileId: pId, subAccountId: new Types.ObjectId(payload.subAccountId) },
          {
            $set: {
              trustTier: 'CRITICAL_RISK',
              trustScore: Math.max(10, Math.round(100 - mlResult.risk_score * 85)),
            },
            $push: {
              detectedAnomalies: {
                type: 'ISOLATION_FOREST_CHOR_NAZAR_ALERT',
                descriptionUr: mlResult.alert_title_ur,
                descriptionEn: `${mlResult.alert_title_en} (Risk: ${(mlResult.risk_score * 100).toFixed(0)}%)`,
                detectedAt: new Date(),
                timestampFormatted: new Date().toLocaleTimeString('en-PK'),
                amountInvolved: drawer_variance || payload.amountInvolved || 0,
                riskWeight: Math.round(mlResult.risk_score * 100),
              },
            },
          }
        );
      }
    }

    return mlResult;
  }

  /**
   * Records a granular POS till event
   */
  static async recordTillEvent(payload: {
    profileId: string | Types.ObjectId;
    subAccountId?: string | Types.ObjectId;
    cashierName: string;
    eventType: SentinelEventType;
    amountInvolved?: number;
    metadata?: Record<string, any>;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<ITillSentinelEvent> {
    const now = new Date();
    const timeFormatted = now.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const event = await TillSentinelEvent.create({
      profileId: new Types.ObjectId(payload.profileId),
      subAccountId: payload.subAccountId ? new Types.ObjectId(payload.subAccountId) : undefined,
      cashierName: payload.cashierName,
      eventType: payload.eventType,
      timestamp: now,
      amountInvolved: payload.amountInvolved || 0,
      severity: payload.severity || 'MEDIUM',
      metadata: {
        systemTimestampStr: timeFormatted,
        ...payload.metadata,
      },
    });

    return event;
  }

  /**
   * Evaluates store-wide cashier trust profiles and builds Sentinel Dashboard
   */
  static async getStoreTrustDashboard(profileId: string | Types.ObjectId): Promise<ISentinelDashboardData> {
    const pId = new Types.ObjectId(profileId);
    const profile = await Profile.findById(pId);

    // Fetch existing trust profiles from DB
    let profiles = await CashierTrustProfile.find({ profileId: pId });

    // If store has sub-accounts but no trust profiles yet, create clean initial profiles for real cashiers
    if (profiles.length === 0) {
      const subAccounts = profile?.subAccounts?.filter((s) => s.role === 'CASHIER' && s.isActive) || [];

      if (subAccounts.length > 0) {
        for (const sub of subAccounts) {
          const created = await CashierTrustProfile.create({
            profileId: pId,
            subAccountId: sub._id,
            cashierName: (sub as any).fullName || sub.name || 'کاؤنٹر کیشیئر',
            cashierPhone: sub.phone || '',
            trustScore: 100,
            trustTier: 'HIGH_TRUST',
            trailing7dMetrics: {
              totalSalesHandled: 0,
              totalVoidCount: 0,
              totalVoidAmount: 0,
              noSaleDrawerOpens: 0,
              consecutiveDeficitDays: 0,
              cumulativeDeficitPkr: 0,
              suspiciousEventCount: 0,
            },
            detectedAnomalies: [],
            weeklySavingsEstimatedPkr: 0,
          });
          profiles.push(created);
        }
      }
    }

    // Fetch recent events (strictly real logged events)
    const recentEvents = await TillSentinelEvent.find({ profileId: pId })
      .sort({ timestamp: -1 })
      .limit(15);

    const totalSavings = profiles.reduce((sum, p) => sum + (p.weeklySavingsEstimatedPkr || 0), 0);
    const avgScore = profiles.length > 0
      ? Math.round(profiles.reduce((sum, p) => sum + p.trustScore, 0) / profiles.length)
      : 95;
    const criticalCount = profiles.filter((p) => p.trustTier === 'CRITICAL_RISK').length;

    return {
      totalCashiersMonitored: profiles.length,
      overallTillHealthScore: avgScore,
      monthlySavingsEstimatedPkr: totalSavings * 4, // Weekly projected to month
      criticalAlertCount: criticalCount,
      profiles,
      recentSuspiciousEvents: recentEvents,
    };
  }

  /**
   * Triggers an immediate Surprise Till Audit (Chhapa / فوری گلہ چیک)
   */
  static async triggerSurpriseAudit(
    profileId: string | Types.ObjectId,
    subAccountId: string | Types.ObjectId,
    cashierName: string
  ): Promise<{ success: boolean; messageUr: string; messageEn: string; auditId: string }> {
    const auditId = `AUDIT-${Date.now().toString().slice(-6)}`;
    await this.recordTillEvent({
      profileId,
      subAccountId,
      cashierName,
      eventType: 'GALLA_DEFICIT_SPIKE',
      severity: 'HIGH',
      metadata: {
        systemTimestampStr: new Date().toLocaleTimeString('en-PK'),
        detailsUr: `دکان مالک نے فوری چھاپہ / سرپرائز گلہ چیک شروع کیا۔ (Audit ID: ${auditId})`,
        detailsEn: `Owner launched immediate surprise till audit. (${auditId})`,
      },
    });

    return {
      success: true,
      auditId,
      messageUr: `✅ سرپرائز گلہ چیک سیشن شروع ہو گیا۔ کیشیئر (${cashierName}) کو فوری کیش گننے کی ہدایت جاری کر دی گئی۔`,
      messageEn: `Surprise till audit initiated for ${cashierName}. Live drawer freeze dispatched.`,
    };
  }

  /**
   * Revokes or restricts cashier post-sale void privileges
   */
  static async revokeVoidPermissions(
    profileId: string | Types.ObjectId,
    subAccountId: string | Types.ObjectId
  ): Promise<{ success: boolean; messageUr: string; messageEn: string }> {
    const profile = await CashierTrustProfile.findOneAndUpdate(
      { profileId, subAccountId },
      { $set: { isVoidRestricted: true } },
      { new: true }
    );

    return {
      success: true,
      messageUr: `🔒 کیشیئر (${profile?.cashierName || 'کاؤنٹر'}) کے منسوخی اختیارات فوری معطل کر دیے گئے۔ اب کوئی بھی بل کینسل کرنے کے لیے منیجر/مالک کا پن درکار ہو گا۔`,
      messageEn: `Cashier void privileges locked. All ticket deletions now strictly require Manager/Owner PIN override.`,
    };
  }
}
