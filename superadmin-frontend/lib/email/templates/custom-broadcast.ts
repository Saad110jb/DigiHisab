export function renderCustomBroadcastHtml(
  subject: string,
  bodyUrdu: string = '',
  bodyEnglish: string = '',
  merchantName: string = 'محترم صارف'
) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070d18; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 520px; margin: auto; border: 1px solid #17233b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #00d49f; font-size: 26px; margin: 0; font-weight: 800;">DigiHisab</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">SuperAdmin Official Dispatch</p>
      </div>

      <div style="background: #0d1627; border: 1px solid #17233b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; border-bottom: 1px solid #17233b; padding-bottom: 10px;">
          ${subject}
        </h2>
        
        ${bodyUrdu ? `
          <div style="text-align: right; direction: rtl; font-size: 14px; color: #6ee7b7; line-height: 1.7; margin-bottom: 14px;">
            ${bodyUrdu}
          </div>
        ` : ''}

        ${bodyEnglish ? `
          <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6; border-top: 1px dashed #17233b; padding-top: 12px;">
            ${bodyEnglish}
          </div>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://app.digihisab.pk" style="background: #00d49f; color: #070d18; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px; display: inline-block;">
          کھاتہ ایپلیکیشن چیک کریں (Access Khata)
        </a>
      </div>

      <div style="border-top: 1px solid #17233b; padding-top: 16px; text-align: center; font-size: 11px; color: #475569;">
        آپ کو یہ پیغام DigiHisab کی مرکزی ایڈمنسٹریشن کی طرف سے موصول ہوا ہے۔<br>
        سپورٹ: support@digihisab.pk • Lahore, Pakistan
      </div>
    </div>
  `;
}
