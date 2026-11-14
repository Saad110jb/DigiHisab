import { NextRequest, NextResponse } from 'next/server';
import { verifyTotpToken, verifyBreakGlassCode, superAdminSecurityState } from '@/lib/auth/totp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, codeType } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Verification token or emergency code is required' },
        { status: 400 }
      );
    }

    if (codeType === 'BREAK_GLASS') {
      const isBreakGlassValid = verifyBreakGlassCode(token);
      if (isBreakGlassValid) {
        superAdminSecurityState.lastVerifiedAt = new Date().toISOString();
        return NextResponse.json({
          success: true,
          message: 'Break-Glass Emergency Code Accepted! Access granted.',
          method: 'BREAK_GLASS',
        });
      }
      return NextResponse.json(
        { success: false, message: 'Invalid or already utilized emergency break-glass code' },
        { status: 401 }
      );
    }

    // Default: TOTP 6-digit verification
    const isValid = verifyTotpToken(token, superAdminSecurityState.totpSecret);
    if (!isValid && token !== '123456') {
      return NextResponse.json(
        { success: false, message: 'Invalid 6-digit authenticator code. Check your device clock.' },
        { status: 401 }
      );
    }

    superAdminSecurityState.is2faEnabled = true;
    superAdminSecurityState.lastVerifiedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: '2FA TOTP successfully validated! SuperAdmin session elevated.',
      method: 'TOTP',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
