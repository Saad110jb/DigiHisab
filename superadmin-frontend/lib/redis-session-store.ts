import fs from 'fs';
import path from 'path';

export interface IGlobalSystemConfig {
  enforcePaywalls: boolean;
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  romanUrduVoice: boolean;
  freeCustomerCap: number;
  chorNazarThresholdPKR: number;
  managerPinLength: '4_DIGITS' | '6_DIGITS';
  bluetoothPrinting: boolean;
  paylinkExpiryHours: number;
  defaultSubMeterTariffPKR: number;
  automatedKametiDraw: boolean;
  staffAdvanceSalaryCapPercent: number;
  rashanForecastCycle: 'WEEKLY' | 'MONTHLY';
  paymentMode: 'MANUAL' | 'DIRECT_GATEWAY';
  pilotJazzCashNumber: string;
  pilotJazzCashTitle: string;
  pilotEasypaisaNumber: string;
  pilotEasypaisaTitle: string;
  freeMonthlyWhatsAppCredits: number;
  paidMonthlyWhatsAppCredits: number;
  grandfatherSubscribers: boolean;
  forceSuperAdmin2FA: boolean;
  sessionTimeoutMins: number;
  auditLogRetentionDays: number;
  maintenanceUrduMessage: string;
  maintenanceEnMessage: string;
  lastUpdated: string;
  updatedBy: string;
}

export interface IAdminSessionRecord {
  sessionId: string;
  adminId: string;
  nodeLabel: string;
  sessionVersion: number;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  createdAt: string;
  expiresAt: number; // Unix ms
}

interface IRateLimitRecord {
  attempts: number;
  lockedUntil?: number; // Unix ms
  lastAttemptAt: number; // Unix ms
}

const REDIS_STATE_PATH = path.join(process.cwd(), '.redis-cache-state.json');

const DEFAULT_CONFIG: IGlobalSystemConfig = {
  enforcePaywalls: true,
  maintenanceMode: false,
  allowNewSignups: true,
  romanUrduVoice: true,
  freeCustomerCap: 20,
  chorNazarThresholdPKR: 500,
  managerPinLength: '4_DIGITS',
  bluetoothPrinting: true,
  paylinkExpiryHours: 72,
  defaultSubMeterTariffPKR: 48.5,
  automatedKametiDraw: true,
  staffAdvanceSalaryCapPercent: 50,
  rashanForecastCycle: 'WEEKLY',
  paymentMode: 'MANUAL',
  pilotJazzCashNumber: '03001234567',
  pilotJazzCashTitle: 'DigiHisab Enterprise Pilot',
  pilotEasypaisaNumber: '03451234567',
  pilotEasypaisaTitle: 'DigiHisab Solutions',
  freeMonthlyWhatsAppCredits: 30,
  paidMonthlyWhatsAppCredits: 500,
  grandfatherSubscribers: true,
  forceSuperAdmin2FA: true,
  sessionTimeoutMins: 30,
  auditLogRetentionDays: 180,
  maintenanceUrduMessage:
    'سسٹم اپ گریڈ جاری ہے: برائے مہربانی کچھ دیر بعد دوبارہ کوشش کریں۔ آپ کا کھاتہ، بیلنس اور کسٹمر ریکارڈ محفوظ ہے۔',
  maintenanceEnMessage:
    'Scheduled System Maintenance: Digi Hisab is currently upgrading database clusters. All your ledger balances and merchant records are secure. Service will resume shortly.',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'SYSTEM_GENESIS',
};

// In-Memory Redis Store
class RedisMockStore {
  private config: IGlobalSystemConfig = { ...DEFAULT_CONFIG };
  private sessions: Map<string, IAdminSessionRecord> = new Map();
  private rateLimits: Map<string, IRateLimitRecord> = new Map();
  private globalSessionVersion: number = 1;
  private listeners: Array<(config: IGlobalSystemConfig) => void> = [];

  constructor() {
    this.loadFromDisk();
  }

  private saveToDisk() {
    try {
      const serializableSessions: Record<string, IAdminSessionRecord> = {};
      const now = Date.now();
      for (const [key, sess] of this.sessions.entries()) {
        if (sess.expiresAt > now) {
          serializableSessions[key] = sess;
        }
      }

      const state = {
        config: this.config,
        sessions: serializableSessions,
        globalSessionVersion: this.globalSessionVersion,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(REDIS_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      // Ignore write errors in read-only setups
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(REDIS_STATE_PATH)) {
        const raw = fs.readFileSync(REDIS_STATE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.config) {
          this.config = { ...DEFAULT_CONFIG, ...parsed.config };
        }
        if (parsed.globalSessionVersion) {
          this.globalSessionVersion = parsed.globalSessionVersion;
        }
        if (parsed.sessions) {
          const now = Date.now();
          for (const [key, sess] of Object.entries(parsed.sessions)) {
            const s = sess as IAdminSessionRecord;
            if (s.expiresAt > now) {
              this.sessions.set(key, s);
            }
          }
        }
      }
    } catch (e) {
      // Fall back to defaults
    }
  }

  // Configuration operations
  public getGlobalConfig(): IGlobalSystemConfig {
    return { ...this.config };
  }

  public updateGlobalConfig(
    partial: Partial<IGlobalSystemConfig>,
    updatedBy: string = 'SuperAdmin Root'
  ): IGlobalSystemConfig {
    this.config = {
      ...this.config,
      ...partial,
      lastUpdated: new Date().toISOString(),
      updatedBy,
    };
    this.saveToDisk();

    // Trigger local listeners (Pub/Sub)
    for (const cb of this.listeners) {
      try {
        cb(this.config);
      } catch (e) {}
    }

    return { ...this.config };
  }

  public onConfigUpdated(cb: (config: IGlobalSystemConfig) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== cb);
    };
  }

  // Session operations
  public getGlobalSessionVersion(): number {
    return this.globalSessionVersion;
  }

  public createSession(session: Omit<IAdminSessionRecord, 'sessionVersion'>): IAdminSessionRecord {
    const fullSession: IAdminSessionRecord = {
      ...session,
      sessionVersion: this.globalSessionVersion,
    };
    const key = `ADMIN_SESSION:${session.adminId}:${session.sessionId}`;
    this.sessions.set(key, fullSession);
    this.saveToDisk();
    return fullSession;
  }

  public getSession(adminId: string, sessionId: string): IAdminSessionRecord | null {
    const key = `ADMIN_SESSION:${adminId}:${sessionId}`;
    const sess = this.sessions.get(key);
    if (!sess) return null;

    const now = Date.now();
    if (sess.expiresAt < now) {
      this.sessions.delete(key);
      this.saveToDisk();
      return null;
    }

    if (sess.sessionVersion < this.globalSessionVersion) {
      this.sessions.delete(key);
      this.saveToDisk();
      return null;
    }

    return sess;
  }

  public revokeSession(adminId: string, sessionId: string) {
    const key = `ADMIN_SESSION:${adminId}:${sessionId}`;
    this.sessions.delete(key);
    this.saveToDisk();
  }

  public invalidateAllSessions(purgedBy: string = 'SuperAdmin Sentinel'): {
    purgedCount: number;
    newVersion: number;
  } {
    const count = this.sessions.size;
    this.sessions.clear();
    this.globalSessionVersion += 1;
    this.saveToDisk();
    return { purgedCount: count, newVersion: this.globalSessionVersion };
  }

  // Rate Limiting (IP Lockout: 3 failed attempts = 15 min lock)
  public checkRateLimit(ip: string): {
    isLocked: boolean;
    remainingAttempts: number;
    lockoutRemainingSeconds: number;
  } {
    const cleanIp = ip.split(',')[0].trim() || 'unknown';
    // Allow local development and automated E2E testing without lockouts
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
      return { isLocked: false, remainingAttempts: 3, lockoutRemainingSeconds: 0 };
    }
    const record = this.rateLimits.get(cleanIp);
    const now = Date.now();

    if (!record) {
      return { isLocked: false, remainingAttempts: 3, lockoutRemainingSeconds: 0 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSecs = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingAttempts: 0, lockoutRemainingSeconds: remainingSecs };
    }

    // Reset lock if expired
    if (record.lockedUntil && record.lockedUntil <= now) {
      this.rateLimits.delete(cleanIp);
      return { isLocked: false, remainingAttempts: 3, lockoutRemainingSeconds: 0 };
    }

    // Window reset after 15 mins of no attempts
    if (now - record.lastAttemptAt > 15 * 60 * 1000) {
      this.rateLimits.delete(cleanIp);
      return { isLocked: false, remainingAttempts: 3, lockoutRemainingSeconds: 0 };
    }

    const remaining = Math.max(0, 3 - record.attempts);
    return { isLocked: false, remainingAttempts: remaining, lockoutRemainingSeconds: 0 };
  }

  public recordFailedAttempt(ip: string): {
    isLocked: boolean;
    remainingAttempts: number;
    lockoutRemainingSeconds: number;
  } {
    const cleanIp = ip.split(',')[0].trim() || 'unknown';
    const now = Date.now();
    const record = this.rateLimits.get(cleanIp) || { attempts: 0, lastAttemptAt: now };

    record.attempts += 1;
    record.lastAttemptAt = now;

    if (record.attempts >= 3) {
      record.lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
      this.rateLimits.set(cleanIp, record);
      return { isLocked: true, remainingAttempts: 0, lockoutRemainingSeconds: 15 * 60 };
    }

    this.rateLimits.set(cleanIp, record);
    return { isLocked: false, remainingAttempts: 3 - record.attempts, lockoutRemainingSeconds: 0 };
  }

  public resetRateLimit(ip: string) {
    const cleanIp = ip.split(',')[0].trim() || 'unknown';
    this.rateLimits.delete(cleanIp);
  }
}

// Singleton global instance
export const redisSessionStore = new RedisMockStore();
