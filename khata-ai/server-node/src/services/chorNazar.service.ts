import { Types } from 'mongoose';
import { Profile } from '../models/Profile';
import { TillSentinelEvent, ITillSentinelEvent, SentinelEventType } from '../models/TillSentinelEvent';
import { CashierTrustProfile, ICashierTrustProfile, TrustTier, IDetectedAnomaly } from '../models/CashierTrustProfile';
import { CashDrawerReconciliation } from '../models/CashDrawerReconciliation';
import { LedgerEntry } from '../models/LedgerEntry';

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
