import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

// In-memory persistent 2FA store for the superadmin
export let superAdminSecurityState = {
  is2faEnabled: true,
  totpSecret: 'JBSWY3DPEHPK3PXP', // Base32 default demo secret
  passkeyRegistered: true,
  lastVerifiedAt: new Date().toISOString(),
  emergencyCodes: [
    { code: 'DH-88A1-49FC', used: false },
    { code: 'DH-91B2-77CA', used: false },
    { code: 'DH-34F9-12EE', used: false },
    { code: 'DH-65D4-88BB', used: false },
    { code: 'DH-22C3-99AA', used: false },
    { code: 'DH-77E5-33DD', used: false },
    { code: 'DH-19A8-44FF', used: true },
    { code: 'DH-83B7-55CC', used: false },
    { code: 'DH-46D1-66AA', used: false },
    { code: 'DH-58C9-22EE', used: false },
  ]
};

export async function generateTotpSetup() {
  const secret = generateSecret();
  const issuer = 'DigiHisab Console';
  const label = 'superadmin@digihisab.pk';
  const otpauth = generateURI({
    issuer,
    label,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  return {
    secret,
    otpauth,
    qrCodeDataUrl,
  };
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result?.valid === true;
  } catch {
    return false;
  }
}

export function verifyBreakGlassCode(enteredCode: string): boolean {
  const formatted = enteredCode.trim().toUpperCase();
  const match = superAdminSecurityState.emergencyCodes.find(
    (c) => c.code === formatted && !c.used
  );

  if (match) {
    match.used = true;
    return true;
  }
  return false;
}
