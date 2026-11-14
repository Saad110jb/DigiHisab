import { NextRequest, NextResponse } from 'next/server';
import { serverUsersDb, updateServerUser } from '@/lib/users-store';
import { sendEmail } from '@/lib/email/mailer';
import { renderOtpEmailHtml } from '@/lib/email/templates/otp-email';
import { renderWelcomeEmailHtml } from '@/lib/email/templates/welcome-merchant';
import { renderCustomBroadcastHtml } from '@/lib/email/templates/custom-broadcast';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = serverUsersDb.find((u) => u.id === id);

    if (!user) {
      return NextResponse.json({ success: false, message: `User ${id} not found` }, { status: 404 });
    }

    const body = await request.json();
    const { type = 'WELCOME', customSubject, customBody, customBodyUrdu, updateEmail } = body;

    // Optional email update
    if (updateEmail && updateEmail.trim()) {
      updateServerUser(id, { email: updateEmail.trim() });
      user.email = updateEmail.trim();
    }

    const recipientEmail = user.email || `${user.id.toLowerCase()}@digihisab-test.pk`;

    let subject = customSubject || `DigiHisab Official Communication for ${user.name}`;
    let html = '';

    if (type === 'OTP') {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      subject = `[${generatedOtp}] آپ کا DigiHisab تصدیقی کوڈ (OTP)`;
      html = renderOtpEmailHtml(generatedOtp, user.persona);
    } else if (type === 'WELCOME') {
      subject = `مبارک ہو! آپ کی دکان (${user.entityName}) کا کھاتہ DigiHisab پر فعال ہو گیا`;
      html = renderWelcomeEmailHtml(user.name, user.entityName, user.persona);
    } else {
      html = renderCustomBroadcastHtml(
        subject,
        customBodyUrdu || 'محترم صارف، آپ کے کھاتے کی تصدیق اور معلومات درج ذیل ہیں:',
        customBody || 'This is an official communication regarding your DigiHisab merchant account.',
        user.name
      );
    }

    await sendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Email dispatched successfully to ${recipientEmail}!`,
      data: {
        recipientEmail,
        subject,
        user: { ...user, email: recipientEmail },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to dispatch email' },
      { status: 500 }
    );
  }
}
