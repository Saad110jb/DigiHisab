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

export async function verifySmtpConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    await mailTransporter.verify();
    return { connected: true, message: 'SMTP connection established successfully with Gmail' };
  } catch (error: any) {
    return { connected: false, message: error.message || 'SMTP connection failed' };
  }
}
