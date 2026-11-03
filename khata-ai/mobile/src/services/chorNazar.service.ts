export type TrustTier = 'HIGH_TRUST' | 'MODERATE_RISK' | 'CRITICAL_RISK';

export type SentinelEventType =
  | 'NO_SALE_DRAWER_OPEN'
  | 'ITEM_VOID_POST_COMMIT'
  | 'PRE_CLOSE_SALE_SPIKE'
  | 'WASOOLI_DELAYED_LOG'
  | 'GALLA_DEFICIT_SPIKE'
  | 'SUSPICIOUS_DISCOUNT'
  | 'UNAUTHORIZED_UDHAAR';

export interface IDetectedAnomaly {
  type: string;
  descriptionUr: string;
  descriptionEn: string;
  detectedAt: string;
  timestampFormatted: string;
  amountInvolved?: number;
  riskWeight: number;
}

export interface ICashierTrustProfile {
  _id: string;
  profileId: string;
  subAccountId: string;
  cashierName: string;
  cashierPhone: string;
  trustScore: number; // 0 to 100
  trustTier: TrustTier;
  trailing7dMetrics: {
    totalSalesHandled: number;
    totalVoidCount: number;
    totalVoidAmount: number;
    noSaleDrawerOpens: number;
    consecutiveDeficitDays: number;
    cumulativeDeficitPkr: number;
    suspiciousEventCount: number;
  };
  detectedAnomalies: IDetectedAnomaly[];
  lastAuditedAt: string;
  weeklySavingsEstimatedPkr: number;
  isVoidRestricted: boolean;
}

export interface ITillSentinelEvent {
  _id: string;
  cashierName: string;
  eventType: SentinelEventType;
  timestamp: string;
  amountInvolved?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: {
    systemTimestampStr: string;
    detailsUr?: string;
    detailsEn?: string;
    receiptNumber?: string;
    discrepancyPkr?: number;
  };
}

export interface ISentinelDashboardData {
  totalCashiersMonitored: number;
  overallTillHealthScore: number;
  monthlySavingsEstimatedPkr: number;
  criticalAlertCount: number;
  profiles: ICashierTrustProfile[];
  recentSuspiciousEvents: ITillSentinelEvent[];
}

export class ChorNazarClientEngine {
  /**
   * Returns offline fallback baseline data for Chor Nazar Sentinel
   */
  static getFallbackDashboardData(): ISentinelDashboardData {
    return {
      totalCashiersMonitored: 0,
      overallTillHealthScore: 100,
      monthlySavingsEstimatedPkr: 0,
      criticalAlertCount: 0,
      profiles: [],
      recentSuspiciousEvents: [],
    };
  }
}
