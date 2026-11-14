import { NextRequest, NextResponse } from 'next/server';
import { generateTotpSetup, superAdminSecurityState } from '@/lib/auth/totp';

export async function GET() {
  try {
    const setupData = await generateTotpSetup();
    superAdminSecurityState.totpSecret = setupData.secret;

    return NextResponse.json({
      success: true,
      data: {
        secret: setupData.secret,
        qrCodeDataUrl: setupData.qrCodeDataUrl,
        backupCodes: superAdminSecurityState.emergencyCodes.map((c) => c.code),
        is2faEnabled: superAdminSecurityState.is2faEnabled,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to initialize 2FA setup' },
      { status: 500 }
    );
  }
}
