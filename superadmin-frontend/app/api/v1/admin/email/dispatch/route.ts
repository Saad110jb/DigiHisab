import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/mailer';
import { renderOtpEmailHtml } from '@/lib/email/templates/otp-email';
import { renderWelcomeEmailHtml } from '@/lib/email/templates/welcome-merchant';
import { renderCustomBroadcastHtml } from '@/lib/email/templates/custom-broadcast';
import { serverUsersDb } from '@/lib/users-store';
import { SendEmailPayload } from '@/types/admin';

export async function POST(request: NextRequest) {
  try {
    const payload: SendEmailPayload = await request.json();
    const { recipientType, userIds, audience, subject, templateType, customBody, customBodyUrdu } = payload;

    if (!subject) {
      return NextResponse.json({ success: false, message: 'Email subject is required' }, { status: 400 });
    }

    // Determine target users
    let targetUsers = [];
    if (recipientType === 'SELECTED_USERS' && userIds && userIds.length > 0) {
      targetUsers = serverUsersDb.filter((u) => userIds.includes(u.id));
    } else if (recipientType === 'AUDIENCE') {
      if (audience === 'DUKANDAR') {
        targetUsers = serverUsersDb.filter((u) => u.persona === 'DUKANDAR');
      } else if (audience === 'HOUSEHOLD') {
        targetUsers = serverUsersDb.filter((u) => u.persona === 'HOUSEHOLD');
      } else {
        targetUsers = [...serverUsersDb];
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid recipient configuration' }, { status: 400 });
    }

    // Collect valid email addresses (fallback to demo address if not set)
    const recipients = targetUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email || `${u.id.toLowerCase()}@digihisab-test.pk`,
      entityName: u.entityName,
      persona: u.persona,
    }));

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: 'No recipients matched the criteria' }, { status: 400 });
    }

    // Generate HTML based on template
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      let html = '';
      if (templateType === 'OTP') {
        const dummyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        html = renderOtpEmailHtml(dummyOtp, recipient.persona);
      } else if (templateType === 'WELCOME') {
        html = renderWelcomeEmailHtml(recipient.name, recipient.entityName, recipient.persona);
      } else {
        html = renderCustomBroadcastHtml(subject, customBodyUrdu || '', customBody || '', recipient.name);
      }

      try {
        await sendEmail({
          to: recipient.email,
          subject,
          html,
        });
        sentCount++;
      } catch (err: any) {
        errors.push(`Failed for ${recipient.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Dispatched ${sentCount} email(s) successfully!`,
      data: {
        sentCount,
        totalRecipients: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal dispatch error' },
      { status: 500 }
    );
  }
}
