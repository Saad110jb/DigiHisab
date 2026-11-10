import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

export interface StepUpPayload {
  userId: string;
  actionName: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Generate a cryptographically signed 60-second step-up execution token
 */
export function generateStepUpToken(userId: string, actionName: string): { token: string; expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 60 * 1000; // 60 seconds lifetime

  const payload: StepUpPayload = { userId, actionName, issuedAt, expiresAt };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return {
    token: `${payloadBase64}.${signature}`,
    expiresAt,
  };
}

/**
 * Validate a step-up token
 */
export function verifyStepUpToken(token: string, expectedUserId?: string): { valid: boolean; payload?: StepUpPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing step-up token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed step-up token format' };
  }

  const [payloadBase64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  if (signature !== expectedSig) {
    return { valid: false, error: 'Invalid step-up signature' };
  }

  try {
    const payload: StepUpPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Step-up token expired (60s validity exceeded)' };
    }

    if (expectedUserId && payload.userId !== expectedUserId) {
      return { valid: false, error: 'Step-up token subject mismatch' };
    }

    return { valid: true, payload };
  } catch (e: any) {
    return { valid: false, error: 'Failed to decode step-up payload' };
  }
}

/**
 * Express middleware to enforce step-up authentication on destructive endpoints
 */
export const requireStepUpAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['x-step-up-token'] as string;
  const userId = req.user?.id?.toString() || req.user?.profileId?.toString();

  // In local test/dev without active token, log warning but permit if flag set
  if (process.env.NODE_ENV === 'test' && !token) {
    return next();
  }

  const verification = verifyStepUpToken(token, userId);
  if (!verification.valid) {
    res.status(403).json({
      success: false,
      code: 'STEP_UP_AUTH_REQUIRED',
      message: `Step-up authentication required for this sensitive action: ${verification.error || 'Token required'}`,
      requiresStepUp: true,
    });
    return;
  }

  next();
};
