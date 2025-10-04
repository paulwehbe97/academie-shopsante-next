// config/mailer.ts
import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const from = process.env.MAIL_FROM!;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: false, // 587 + STARTTLS
  auth: { user, pass },
});

export async function sendMail(opts: {
  to: string; subject: string; html?: string; text?: string; attachments?: any[];
}) {
  return transporter.sendMail({
    from,
    ...opts,
  });
}
