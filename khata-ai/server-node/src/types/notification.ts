export type NotificationPriority = 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO' | 'NORMAL' | 'LOW';

export type NotificationCategory =
  | 'STOCK_ALERT'         // Stock reached or breached minimum threshold
  | 'CREDIT_LIMIT'        // Customer credit limit exceeded / account blocked
  | 'GALLA_DISCREPANCY'   // Cash drawer shortage/surplus during end-of-day audit
  | 'PAYMENT_RECEIVED'    // Incoming settlement (Raast, JazzCash, Easypaisa, Cash)
  | 'BILL_DUE'            // Supplier purchase bill payment due date approaching
  | 'STAFF_TANKHWA_DUE'   // Staff wage/salary payout due date
  | 'FINANCIAL_METRICS_SYNC' // Real-time store metrics invalidation
  | 'ANNOUNCEMENT'
  | 'SYSTEM_BROADCAST'
  | string;

export interface IPushNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleUrdu: string;
  titleEnglish: string;
  messageUrdu: string;
  messageEnglish: string;
  timestamp: Date | string;
  actionLabel?: string;
  actionRoute?: string;     // Route or modal key to open
  metadata?: Record<string, any>;
  durationMs?: number;      // Auto-dismiss timeout (default: 4500ms, CRITICAL: 8000ms)
}
