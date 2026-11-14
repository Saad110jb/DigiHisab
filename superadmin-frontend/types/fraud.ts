export type FraudAnomalyType =
  | 'MIDNIGHT_GHOST_SPIKE'
  | 'BOT_VELOCITY_BURST'
  | 'CIRCULAR_UDHAAR_RING'
  | 'NEGATIVE_STOCK_CHECKOUT'
  | 'ABNORMAL_TILL_SHORTAGE';

export type FraudSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'FROZEN' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface IFraudIncident {
  id: string; // e.g. "FRD-2026-881"
  type: FraudAnomalyType;
  severity: FraudSeverity;
  status: IncidentStatus;
  entityId: string;
  entityName: string;
  entityCity: string;
  userPhone: string;
  persona: 'DUKANDAR' | 'HOUSEHOLD' | 'HYBRID';
  title: string;
  summaryUrdu: string;
  riskScore: number; // 0 - 100
  detectedAt: string;
  metrics: {
    amountPKR?: number;
    transactionCount?: number;
    timeSpanSeconds?: number;
    discrepancyPercentage?: number;
    physicalCashPKR?: number;
    expectedCashPKR?: number;
    skuName?: string;
    stockLevel?: number;
    collusionParticipants?: string[];
    cashierName?: string;
    cashierId?: string;
    phantomSaleValuePKR?: number;
    shortagePKR?: number;
  };
  evidenceLogs: {
    timestamp: string;
    description: string;
    refId: string;
  }[];
}

export interface ICircularLoopNode {
  id: string;
  name: string;
  phone: string;
  city: string;
  owesPKR: number;
  owesToId: string;
  owesToName: string;
  isFrozen: boolean;
}

export interface ICircularCollusionRing {
  id: string; // e.g. "RING-01"
  name: string;
  detectedAt: string;
  totalGrossCircularPKR: number;
  netWashDifferencePKR: number;
  collusionRatio: number; // e.g. 0.98 (98% wash trade)
  status: 'ACTIVE' | 'FROZEN' | 'RESOLVED';
  nodes: ICircularLoopNode[];
  edges: {
    from: string;
    to: string;
    amountPKR: number;
  }[];
}

export interface ITillVarianceRecord {
  id: string;
  storeId: string;
  storeName: string;
  city: string;
  cashierId: string;
  cashierName: string;
  shiftClosedAt: string;
  expectedTillCashPKR: number;
  physicalDrawerCashPKR: number;
  shortagePKR: number;
  discrepancyPercentage: number;
  repeatOffenseCount: number;
  supervisorOverrideBy?: string;
  status: 'ALERT_ACTIVE' | 'SURPRISE_AUDIT_ORDERED' | 'RECONCILED' | 'INVESTIGATING';
}

export interface INegativeStockRecord {
  id: string;
  storeId: string;
  storeName: string;
  city: string;
  cashierName: string;
  skuName: string;
  barcode: string;
  category: string;
  unitPricePKR: number;
  quantitySold: number;
  stockLevelBeforeSale: number;
  stockLevelAfterSale: number;
  phantomSaleValuePKR: number;
  timestamp: string;
  status: 'FLAGGED' | 'INSPECTED' | 'DISMISSED';
}

export interface IVelocitySpikeRecord {
  id: string;
  entityId: string;
  entityName: string;
  city: string;
  userPhone: string;
  burstType: 'MIDNIGHT_SPIKE' | 'BOT_BURST';
  transactionsCount: number;
  timeWindowSeconds: number;
  totalVolumePKR: number;
  timestamp: string;
  peakHour: string;
  ipAddress: string;
  deviceFingerprint: string;
  status: 'ACTIVE' | 'RATE_LIMITED' | 'FROZEN';
}
