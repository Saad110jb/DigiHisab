import { IPushNotification } from '../types/notification';
import { dispatchPushNotification, broadcastToAllActiveSseClients } from './notificationDispatcher.service';

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  role: string;
  deviceFingerprint: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'ACTIVE' | 'TERMINATED';
  terminationReason?: string;
}

// In-memory Sentinel Registry (mapped by userId -> ActiveSessionRecord)
const activeUserSessions = new Map<string, ActiveSessionRecord>();

// All-time session history for audit inspection
const sessionAuditTrail: ActiveSessionRecord[] = [];

/**
 * Register a newly authenticated session and enforce concurrent limits
 */
export function registerUserSession(
  userId: string,
  sessionId: string,
  role: string,
  deviceFingerprint: string,
  ip: string,
  userAgent: string
): { displacedPriorSession: boolean; priorSessionId?: string } {
  let displacedPriorSession = false;
  let priorSessionId: string | undefined;

  const existingSession = activeUserSessions.get(userId);

  // SuperAdmin strict single active session limit
  if (existingSession && existingSession.status === 'ACTIVE' && existingSession.sessionId !== sessionId) {
    displacedPriorSession = true;
    priorSessionId = existingSession.sessionId;
    existingSession.status = 'TERMINATED';
    existingSession.terminationReason = 'CONCURRENT_SESSION_DISPLACED';

    // Broadcast real-time SSE force-logout event to old session
    const terminationNotice: IPushNotification = {
      id: `term-session-${Date.now()}`,
      category: 'ANNOUNCEMENT',
      priority: 'CRITICAL',
      titleUrdu: 'سیشن ختم ہو گیا',
      titleEnglish: 'Session Displaced',
      messageUrdu: 'آپ کا اکاؤنٹ کسی اور ڈیوائس سے لاگ ان ہوا ہے۔ سیشن ختم کر دیا گیا ہے۔',
      messageEnglish: 'Your account was accessed from another device. Prior session has been revoked.',
      timestamp: new Date().toISOString(),
      actionRoute: 'Login',
      durationMs: 10000,
    };

    dispatchPushNotification(userId, terminationNotice);
  }

  const newSession: ActiveSessionRecord = {
    sessionId,
    userId,
    role,
    deviceFingerprint,
    ip,
    userAgent,
    createdAt: new Date(),
    lastActivity: new Date(),
    status: 'ACTIVE',
  };

  activeUserSessions.set(userId, newSession);
  sessionAuditTrail.unshift(newSession);

  // Cap audit trail at 500 records
  if (sessionAuditTrail.length > 500) {
    sessionAuditTrail.pop();
  }

  return { displacedPriorSession, priorSessionId };
}

/**
 * Validate if a session is still valid (not displaced or terminated)
 */
export function validateSession(userId: string, sessionId: string): boolean {
  const session = activeUserSessions.get(userId);
  if (!session) return true; // Session not tracked, allow fallback
  if (session.sessionId === sessionId && session.status === 'ACTIVE') {
    session.lastActivity = new Date();
    return true;
  }
  return false;
}

/**
 * Terminate a specific user's session
 */
export function terminateUserSession(userId: string, reason = 'ADMIN_MANUAL_REVOCATION'): boolean {
  const session = activeUserSessions.get(userId);
  if (session) {
    session.status = 'TERMINATED';
    session.terminationReason = reason;

    const terminationNotice: IPushNotification = {
      id: `revoked-${Date.now()}`,
      category: 'ANNOUNCEMENT',
      priority: 'CRITICAL',
      titleUrdu: 'سیشن منسوخ',
      titleEnglish: 'Session Revoked',
      messageUrdu: 'ایڈمن نے آپ کا لاگ ان سیشن بند کر دیا ہے۔',
      messageEnglish: 'Your active session has been manually revoked by security administrators.',
      timestamp: new Date().toISOString(),
      actionRoute: 'Login',
      durationMs: 8000,
    };

    dispatchPushNotification(userId, terminationNotice);
    return true;
  }
  return false;
}

/**
 * Return active session details for audit dashboard
 */
export function getActiveSession(userId: string): ActiveSessionRecord | undefined {
  return activeUserSessions.get(userId);
}

/**
 * Return all recorded active sessions
 */
export function listActiveSessions(): ActiveSessionRecord[] {
  return Array.from(activeUserSessions.values()).filter((s) => s.status === 'ACTIVE');
}
