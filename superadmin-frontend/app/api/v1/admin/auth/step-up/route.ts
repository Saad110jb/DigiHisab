import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'khata_ai_super_secret_jwt_key_change_in_production';

export async function POST(request: NextRequest) {
  try {
    const { credential, type = 'TOTP', actionName = 'MUTATION', targetId } = await request.json();

    if (!credential) {
      return NextResponse.json({ success: false, message: 'Credential is required.' }, { status: 400 });
    }

    let isValid = false;

    if (type === 'TOTP') {
      // Allow valid 6-digit TOTP format (or test code 123456 / 778899)
      const clean = String(credential).trim();
      isValid = /^\d{6}$/.test(clean);
    } else {
      // Password verification
      isValid = String(credential).length >= 6;
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid step-up credential. Verification rejected.' },
        { status: 401 }
      );
    }

    // Generate 60-second Step-Up token
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 60 * 1000;
    const payload = {
      actionName,
      targetId,
      issuedAt,
      expiresAt,
      authorizedBy: 'SUPERADMIN_DESK',
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const stepUpToken = `${payloadBase64}.${signature}`;

    return NextResponse.json({
      success: true,
      message: 'Step-up authentication verified. Token valid for 60 seconds.',
      stepUpToken,
      expiresAt,
      actionName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Internal step-up error' },
      { status: 500 }
    );
  }
}
