import crypto from 'crypto';
import { redisSessionStore } from '../redis-session-store';

export const SUPERADMIN_COOKIE_NAME = 'superadmin_session_token';

const JWT_SECRET = process.env.JWT_SECRET || 'khata_ai_super_secret_jwt_key_change_in_production_sentinel_2026';

export interface ISuperAdminTokenPayload {
  adminId: string;
  nodeLabel: string;
  sessionId: string;
  sessionVersion: number;
  role: string;
  iat: number;
  exp: number;
}

export function signSuperAdminJwt(
  payload: Omit<ISuperAdminTokenPayload, 'iat' | 'exp'>,
  timeoutMins: number = 30
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + timeoutMins * 60;

  const fullPayload: ISuperAdminTokenPayload = {
    ...payload,
    iat,
    exp,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifySuperAdminJwt(token: string): {
  isValid: boolean;
  payload: ISuperAdminTokenPayload | null;
  reason?: string;
} {
  if (!token) {
    return { isValid: false, payload: null, reason: 'MISSING_TOKEN' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { isValid: false, payload: null, reason: 'MALFORMED_JWT' };
  }

  const [headerB64, payloadB64, signature] = parts;

  // Validate HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { isValid: false, payload: null, reason: 'INVALID_SIGNATURE' };
  }

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: ISuperAdminTokenPayload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { isValid: false, payload: null, reason: 'EXPIRED' };
    }

    return { isValid: true, payload };
  } catch (err) {
    return { isValid: false, payload: null, reason: 'JSON_PARSE_ERROR' };
  }
}

/**
 * Validates token signature + verifies against Redis active session tracking.
 * If SuperAdmin clicked "Invalidate All Sessions", the session version or key
 * in Redis will cause this check to fail instantly.
 */
export function validateSuperAdminSession(token: string): {
  isValid: boolean;
  payload: ISuperAdminTokenPayload | null;
  error?: string;
} {
  const jwtCheck = verifySuperAdminJwt(token);
  if (!jwtCheck.isValid || !jwtCheck.payload) {
    return { isValid: false, payload: null, error: jwtCheck.reason || 'TOKEN_INVALID' };
  }

  const { adminId, sessionId, sessionVersion } = jwtCheck.payload;

  // Check Redis session store
  const activeSession = redisSessionStore.getSession(adminId, sessionId);
  if (!activeSession) {
    return { isValid: false, payload: null, error: 'SESSION_REVOKED_OR_EXPIRED' };
  }

  if (activeSession.sessionVersion > sessionVersion) {
    return { isValid: false, payload: null, error: 'SESSION_VERSION_SUPERSEDED' };
  }

  return { isValid: true, payload: jwtCheck.payload };
}
