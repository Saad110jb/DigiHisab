import { NextResponse } from 'next/server';
import { verifySmtpConnection } from '@/lib/email/mailer';

export async function GET() {
  const result = await verifySmtpConnection();
  return NextResponse.json({
    success: result.connected,
    message: result.message,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    user: process.env.SMTP_USER || 'hisabdigi@gmail.com',
    port: process.env.SMTP_PORT || '465',
  });
}
