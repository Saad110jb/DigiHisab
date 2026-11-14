export function renderOtpEmailHtml(otpCode: string, persona: 'DUKANDAR' | 'HOUSEHOLD' = 'DUKANDAR') {
  const greeting = persona === 'DUKANDAR' ? 'محترم دکاندار بھائی' : 'محترم صارف';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070d18; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #17233b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #00d49f; font-size: 24px; margin: 0; font-weight: 800;">DigiHisab</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Smart Financial Ledger & POS • پاکستان کا ڈیجیٹل کھاتہ</p>
      </div>
      
      <p style="font-size: 15px; color: #e2e8f0; text-align: right; direction: rtl;">السلام علیکم ${greeting}،</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: right; direction: rtl;">
        آپ کے DigiHisab اکاؤنٹ کے لیے ون ٹائم تصدیقی کوڈ (OTP) درج ذیل ہے۔ یہ کوڈ کاؤنٹر لاگ اِن یا پن ری سیٹ کے لیے درکار ہے:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #00d49f; background: #0d1627; border: 1px solid #17233b; padding: 12px 28px; border-radius: 12px; font-family: monospace;">
          ${otpCode}
        </span>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.4; text-align: center;">
        یہ کوڈ اگلے 10 منٹ کے لیے کارآمد ہے۔ اگر آپ نے یہ درخواست نہیں کی تو فوری طور پر سپورٹ سے رابطہ کریں۔<br>
        <em>Security Notice: Never share this OTP with anyone, including DigiHisab staff.</em>
      </p>

      <div style="border-top: 1px solid #17233b; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #475569;">
        DigiHisab Technologies • Zero-Trust Financial Sentinel<br>
        سپورٹ: support@digihisab.pk • UAN: +92 (300) 9663004
      </div>
    </div>
  `;
}
