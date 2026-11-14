export function renderWelcomeEmailHtml(merchantName: string, shopOrHomeName: string, persona: 'DUKANDAR' | 'HOUSEHOLD' = 'DUKANDAR') {
  const isDukandar = persona === 'DUKANDAR';
  const heading = isDukandar ? 'DigiHisab کاؤنٹر پی او ایس میں خوش آمدید! 🏪' : 'DigiHisab گھرانہ حساب میں خوش آمدید! 🏠';
  const roleDesc = isDukandar 
    ? 'آپ کا ڈیجیٹل کھاتہ اور کاؤنٹر پی او ایس اب مکمل فعال ہے۔ اب آپ کسٹمرز کا ادھار، روزانہ کی نقد سیل، اور واٹس ایپ پیمنٹ لنکس باآسانی سنبھال سکتے ہیں۔'
    : 'آپ کے گھر کا راشن، یوٹیلیٹی بلز اور ذیلی میٹر (LESCO/K-Electric) کا حساب اب ڈیجیٹل محفوظ ہے۔';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070d18; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 520px; margin: auto; border: 1px solid #17233b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #00d49f; font-size: 26px; margin: 0; font-weight: 800;">DigiHisab</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Smart Financial Ledger & POS</p>
      </div>

      <h2 style="color: #00d49f; margin-top: 0; text-align: right; direction: rtl; font-size: 18px;">${heading}</h2>
      <p style="color: #cbd5e1; font-size: 14px; text-align: right; direction: rtl;">محترم <strong>${merchantName}</strong> صاحب (${shopOrHomeName})،</p>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: right; direction: rtl;">
        ${roleDesc}
      </p>

      <div style="background: #0d1627; border-right: 4px solid #00d49f; padding: 14px; border-radius: 8px; margin: 20px 0; text-align: right; direction: rtl;">
        <p style="margin: 0; font-size: 13px; color: #e2e8f0;">
          💡 <strong>پرو ٹپ:</strong> کسٹمر کو ادھار کی پرچی واٹس ایپ پر بھیجنے کے ساتھ ہی <em>PayFast / Raast لنک</em> شامل کریں تاکہ رقوم براہ راست موصول ہو سکیں۔
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="https://app.digihisab.pk/dashboard" style="background: #00d49f; color: #070d18; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 14px; display: inline-block;">
          اپنا ڈیش بورڈ کھولیں (Open Dashboard)
        </a>
      </div>

      <div style="border-top: 1px solid #17233b; padding-top: 16px; text-align: center; font-size: 11px; color: #475569;">
        DigiHisab • SBP Regulatory Compliance • Faisalabad / Lahore / Karachi<br>
        سپورٹ ہیلپ لائن: +92 (300) 9663004
      </div>
    </div>
  `;
}
