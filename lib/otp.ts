import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { AccountError, accountDb } from './accounts';

const OTP_TTL_SEC = 600; // 10 minutes
const OTP_RESEND_COOLDOWN_SEC = 45;
const OTP_MAX_ATTEMPTS = 5;

function otpSecret() {
    return process.env.AUTH_SECRET || process.env.SMTP_PASS || 'lp-insight-otp-secret';
}

export function hashOtp(email: string, code: string) {
    return createHmac('sha256', otpSecret())
        .update(`${email.trim().toLowerCase()}:${code.trim()}`)
        .digest('hex');
}

async function ensureOtpTable() {
    await accountDb().execute(
        'CREATE TABLE IF NOT EXISTS lp_email_otps (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)'
    );
}

export async function issueAndSendOtp(email: string) {
    await ensureOtpTable();
    const now = Math.floor(Date.now() / 1000);

    const existing = (await accountDb().execute({
        sql: 'SELECT created_at FROM lp_email_otps WHERE email=?',
        args: [email]
    })).rows[0];

    if (existing && now - Number(existing.created_at) < OTP_RESEND_COOLDOWN_SEC) {
        const wait = OTP_RESEND_COOLDOWN_SEC - (now - Number(existing.created_at));
        throw new AccountError(`Please wait ${wait}s before requesting another verification code.`, 429, 'otp');
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashOtp(email, code);

    await sendOtpEmail(email, code);

    await accountDb().execute({
        sql: 'INSERT INTO lp_email_otps(email, code_hash, expires_at, attempts, created_at) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, created_at=excluded.created_at',
        args: [email, codeHash, now + OTP_TTL_SEC, now]
    });

    return { expiresInMinutes: 10 };
}

export async function verifyAndConsumeOtp(email: string, code: unknown) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        throw new AccountError('Enter the 6-digit verification code sent to your email.', 400, 'otp');
    }
    await ensureOtpTable();
    const now = Math.floor(Date.now() / 1000);

    const row = (await accountDb().execute({
        sql: 'SELECT code_hash, expires_at, attempts FROM lp_email_otps WHERE email=?',
        args: [email]
    })).rows[0];

    if (!row || Number(row.expires_at) < now) {
        throw new AccountError('Verification code expired or not found. Please request a new OTP.', 400, 'otp');
    }

    if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) {
        throw new AccountError('Too many invalid OTP attempts. Please request a new code.', 429, 'otp');
    }

    const expected = Buffer.from(String(row.code_hash), 'hex');
    const actual = Buffer.from(hashOtp(email, code.trim()), 'hex');
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!ok) {
        await accountDb().execute({
            sql: 'UPDATE lp_email_otps SET attempts=attempts+1 WHERE email=?',
            args: [email]
        });
        throw new AccountError('Invalid verification code. Please check your email and try again.', 400, 'otp');
    }

    await accountDb().execute({
        sql: 'DELETE FROM lp_email_otps WHERE email=?',
        args: [email]
    });
}

async function sendOtpEmail(toEmail: string, code: string) {
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, '');
    const resendKey = process.env.RESEND_API_KEY?.trim();

    const subject = `Your LP Insight Verification Code: ${code}`;
    const html = `
      <!doctype html>
      <html>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f8f5;margin:0;padding:24px;color:#111815;">
          <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #dce5df;overflow:hidden;">
            <div style="height:6px;background:linear-gradient(90deg,#25503F,#10B981);"></div>
            <div style="padding:32px 28px;">
              <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">
                ClinicLivingPlus Security
              </div>
              <h1 style="margin:0 0 10px;font-size:21px;font-weight:800;color:#111815;">Verify your LP Insight email</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#4b5b53;">
                Use the 6-digit verification code below to finish creating your LP Insight account for <strong>${toEmail}</strong>.
              </p>
              <div style="background:#f3f9f5;border:1.5px solid #25503F;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#25503F;margin-bottom:6px;">
                  One-Time Verification Code
                </div>
                <div style="font-family:Consolas,Monaco,monospace;font-size:32px;font-weight:900;letter-spacing:6px;color:#1A3A2D;">
                  ${code}
                </div>
              </div>
              <p style="margin:16px 0 0;font-size:12px;color:#6b7c73;">
                This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass }
        });
        await transporter.sendMail({
            from: `LP Insight Security <${smtpUser}>`,
            to: toEmail,
            subject,
            text: `Your LP Insight verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            html
        });
        return;
    }

    if (resendKey) {
        const fromEmail = process.env.EMAIL_FROM || 'ClinicLivingPlus Security <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html })
        });
        if (!res.ok) {
            throw new AccountError('Could not send verification email. Please try again later.', 503);
        }
        return;
    }

    throw new AccountError(
        'Email delivery is not configured on the server. Add SMTP_USER & SMTP_PASS (or RESEND_API_KEY) in environment variables.',
        503
    );
}
