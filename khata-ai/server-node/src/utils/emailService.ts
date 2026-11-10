import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT) || 465;
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
const user = process.env.SMTP_USER || 'hisabdigi@gmail.com';
const pass = process.env.SMTP_PASS || 'jtbp vslp zmgk ysln';

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailOptions) {
  const fromName = process.env.EMAIL_FROM_NAME || 'DigiHisab Official';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'hisabdigi@gmail.com';

  return await mailTransporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  });
}

export function renderOtpEmailHtml(otpCode: string, persona: 'VENDOR' | 'HOUSEHOLD' | 'HYBRID' = 'VENDOR') {
  const isDukandar = persona === 'VENDOR';
  const greeting = isDukandar ? 'محترم دکاندار بھائی' : 'محترم صارف';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070d18; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #17233b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #00d49f; font-size: 24px; margin: 0; font-weight: 800;">DigiHisab</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Smart Financial Ledger & POS • پاکستان کا ڈیجیٹل کھاتہ</p>
      </div>
      
      <p style="font-size: 15px; color: #e2e8f0; text-align: right; direction: rtl;">السلام علیکم ${greeting}،</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: right; direction: rtl;">
        آپ کے DigiHisab اکاؤنٹ کے لیے ون ٹائم تصدیقی کوڈ (OTP) درج ذیل ہے۔ یہ کوڈ کاؤنٹر لاگ اِن یا پن ری سیٹ کے لیے خودکار جاری کیا گیا ہے:
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

export function renderWelcomeEmailHtml(merchantName: string, shopOrHomeName: string, persona: 'VENDOR' | 'HOUSEHOLD' | 'HYBRID' = 'VENDOR') {
  const isDukandar = persona === 'VENDOR';
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
