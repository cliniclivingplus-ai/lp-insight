import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { AccountError, accountDb, emailAddress } from './accounts';

function safeEqual(a: string, b: string) {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
}

export function verifyAdminPassword(input: unknown): boolean {
    if (typeof input !== 'string' || !input.trim()) return false;
    const expected = (process.env.ADMIN_PASSWORD || process.env.LP_ACCESS_PASSWORD || '').trim();
    if (!expected) return false;
    return safeEqual(input.trim(), expected);
}

export async function ensureAdminTables() {
    const db = accountDb();
    await db.execute(
        'CREATE TABLE IF NOT EXISTS lp_clinic_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)'
    );
    await db.execute(
        "CREATE TABLE IF NOT EXISTS lp_roster (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Clinician', added_at INTEGER NOT NULL)"
    );
    await db.execute(
        'CREATE TABLE IF NOT EXISTS lp_mail_logs (id TEXT PRIMARY KEY, recipient_email TEXT NOT NULL, recipient_name TEXT NOT NULL, subject TEXT NOT NULL, week_label TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT, sent_at INTEGER NOT NULL, sent_by TEXT NOT NULL)'
    );
}

export async function getActiveWeeklyPassword(): Promise<{ password: string; weekLabel: string; updatedAt: number | null }> {
    await ensureAdminTables();
    const rows = (await accountDb().execute(
        "SELECT key, value, updated_at FROM lp_clinic_config WHERE key IN ('weekly_password', 'week_label')"
    )).rows;

    const map = new Map<string, { value: string; updated_at: number }>();
    for (const r of rows) {
        map.set(String(r.key), { value: String(r.value), updated_at: Number(r.updated_at) });
    }

    const dbPass = map.get('weekly_password')?.value || '';
    const envPass = (process.env.CLINIC_PASSWORD || process.env.LP_ACCESS_PASSWORD || '').trim();
    const password = dbPass || envPass;
    const weekLabel = map.get('week_label')?.value || 'Current Week';
    const updatedAt = map.get('weekly_password')?.updated_at || null;
    return { password, weekLabel, updatedAt };
}

export async function setActiveWeeklyPassword(password: string, weekLabel: string) {
    const cleanPass = password.trim();
    if (cleanPass.length < 6 || cleanPass.length > 120) {
        throw new AccountError('Weekly password must be 6–120 characters.', 400);
    }
    const cleanLabel = (weekLabel || 'Current Week').trim().slice(0, 80);
    await ensureAdminTables();
    const now = Date.now();
    await accountDb().execute({
        sql: 'INSERT INTO lp_clinic_config(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
        args: ['weekly_password', cleanPass, now]
    });
    await accountDb().execute({
        sql: 'INSERT INTO lp_clinic_config(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
        args: ['week_label', cleanLabel, now]
    });
    return { password: cleanPass, weekLabel: cleanLabel, updatedAt: now };
}

export async function matchesWeeklyPassword(input: string): Promise<boolean> {
    if (!input || input.length > 200) return false;
    const { password } = await getActiveWeeklyPassword();
    if (!password) return false;
    return safeEqual(input, password);
}

export async function addRosterMember(rawEmail: unknown, rawName: unknown, rawRole?: unknown) {
    const email = emailAddress(rawEmail);
    const name = typeof rawName === 'string' && rawName.trim()
        ? rawName.trim().slice(0, 80)
        : email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const role = typeof rawRole === 'string' && rawRole.trim() ? rawRole.trim().slice(0, 40) : 'Clinician';
    await ensureAdminTables();
    await accountDb().execute({
        sql: 'INSERT INTO lp_roster(email, name, role, added_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, role=excluded.role',
        args: [email, name, role, Date.now()]
    });
    return { email, name, role };
}

export async function removeRosterMember(rawEmail: unknown) {
    const email = emailAddress(rawEmail);
    await ensureAdminTables();
    await accountDb().execute({ sql: 'DELETE FROM lp_roster WHERE email=?', args: [email] });
}

export async function getGodViewData() {
    await ensureAdminTables();
    const db = accountDb();

    const [config, usersRes, recentTurnsRes, rosterRes, mailLogsRes] = await Promise.all([
        getActiveWeeklyPassword(),
        db.execute(`
            SELECT
                u.id,
                u.email,
                u.name,
                u.created_at,
                (SELECT count(*) FROM lp_chats c WHERE c.user_id = u.id) AS chat_count,
                (SELECT count(*) FROM lp_chat_turns t WHERE t.user_id = u.id) AS question_count,
                (SELECT max(t.created_at) FROM lp_chat_turns t WHERE t.user_id = u.id) AS last_active_at,
                (SELECT max(m.sent_at) FROM lp_mail_logs m WHERE m.recipient_email = u.email AND m.status = 'sent') AS last_mail_sent_at
            FROM lp_users u
            ORDER BY coalesce(last_active_at, u.created_at) DESC
        `),
        db.execute(`
            SELECT
                t.id,
                u.email AS user_email,
                u.name AS user_name,
                c.title AS chat_title,
                t.question,
                t.status,
                t.created_at
            FROM lp_chat_turns t
            JOIN lp_users u ON u.id = t.user_id
            LEFT JOIN lp_chats c ON c.id = t.chat_id
            ORDER BY t.created_at DESC
            LIMIT 40
        `),
        db.execute(`
            SELECT
                r.email,
                r.name,
                r.role,
                r.added_at,
                (SELECT m.sent_at FROM lp_mail_logs m WHERE m.recipient_email = r.email ORDER BY m.sent_at DESC LIMIT 1) AS last_sent_at,
                (SELECT m.status FROM lp_mail_logs m WHERE m.recipient_email = r.email ORDER BY m.sent_at DESC LIMIT 1) AS last_status,
                (SELECT m.week_label FROM lp_mail_logs m WHERE m.recipient_email = r.email ORDER BY m.sent_at DESC LIMIT 1) AS last_week_label
            FROM lp_roster r
            ORDER BY r.added_at DESC
        `),
        db.execute(`
            SELECT id, recipient_email, recipient_name, subject, week_label, provider, status, error_message, sent_at, sent_by
            FROM lp_mail_logs
            ORDER BY sent_at DESC
            LIMIT 100
        `)
    ]);

    const users = usersRes.rows.map(r => ({
        id: String(r.id),
        email: String(r.email),
        name: String(r.name),
        createdAt: Number(r.created_at),
        chatCount: Number(r.chat_count || 0),
        questionCount: Number(r.question_count || 0),
        lastActiveAt: r.last_active_at ? Number(r.last_active_at) : null,
        lastMailSentAt: r.last_mail_sent_at ? Number(r.last_mail_sent_at) : null
    }));

    const totalChats = users.reduce((sum, u) => sum + u.chatCount, 0);
    const totalQuestions = users.reduce((sum, u) => sum + u.questionCount, 0);
    const mailLogs = mailLogsRes.rows.map(r => ({
        id: String(r.id),
        recipientEmail: String(r.recipient_email),
        recipientName: String(r.recipient_name),
        subject: String(r.subject),
        weekLabel: String(r.week_label),
        provider: String(r.provider),
        status: String(r.status),
        errorMessage: r.error_message ? String(r.error_message) : null,
        sentAt: Number(r.sent_at),
        sentBy: String(r.sent_by)
    }));

    const sentCount = mailLogs.filter(m => m.status === 'sent').length;
    const lastMailAt = mailLogs.find(m => m.status === 'sent')?.sentAt || null;

    const smtpReady = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
    const resendReady = Boolean(process.env.RESEND_API_KEY?.trim());

    return {
        summary: {
            totalUsers: users.length,
            totalChats,
            totalQuestions,
            totalEmailsSent: sentCount,
            lastMailAt,
            mailProvider: smtpReady ? 'gmail-smtp' : resendReady ? 'resend' : 'unconfigured'
        },
        weeklyConfig: config,
        users,
        recentActivity: recentTurnsRes.rows.map(r => ({
            id: String(r.id),
            userEmail: String(r.user_email),
            userName: String(r.user_name),
            chatTitle: String(r.chat_title || ''),
            question: String(r.question || ''),
            status: String(r.status || ''),
            createdAt: Number(r.created_at)
        })),
        roster: rosterRes.rows.map(r => ({
            email: String(r.email),
            name: String(r.name),
            role: String(r.role),
            addedAt: Number(r.added_at),
            lastSentAt: r.last_sent_at ? Number(r.last_sent_at) : null,
            lastStatus: r.last_status ? String(r.last_status) : null,
            lastWeekLabel: r.last_week_label ? String(r.last_week_label) : null
        })),
        mailLogs
    };
}

export async function sendWeeklyPasswordEmails(targetEmails: string[], sentBy = 'Admin') {
    await ensureAdminTables();
    const { password, weekLabel } = await getActiveWeeklyPassword();
    if (!password) {
        throw new AccountError('Set an active weekly password first before sending emails.', 400);
    }

    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, '');
    const resendKey = process.env.RESEND_API_KEY?.trim();

    if (!(smtpUser && smtpPass) && !resendKey) {
        throw new AccountError('Mail delivery is not configured. Add SMTP_USER & SMTP_PASS (or RESEND_API_KEY) in Vercel.', 503);
    }

    const rosterRows = (await accountDb().execute('SELECT email, name FROM lp_roster')).rows;
    const nameMap = new Map<string, string>();
    for (const r of rosterRows) nameMap.set(String(r.email).toLowerCase(), String(r.name));

    const subject = `ClinicLivingPlus Weekly Access Code (${weekLabel})`;
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lp-insight-ten.vercel.app/login';
    const provider = smtpUser && smtpPass ? 'gmail-smtp' : 'resend';
    const transporter = provider === 'gmail-smtp'
        ? nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } })
        : null;

    const results: Array<{ email: string; status: 'sent' | 'failed'; error?: string }> = [];

    for (const raw of targetEmails) {
        let email = '';
        try {
            email = emailAddress(raw);
        } catch {
            results.push({ email: String(raw), status: 'failed', error: 'Invalid @cliniclivingplus.com address' });
            continue;
        }
        const name = nameMap.get(email) || email.split('@')[0];
        const html = `
          <!doctype html>
          <html>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f8f5;margin:0;padding:24px;color:#111815;">
              <div style="max-width:500px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #dce5df;overflow:hidden;">
                <div style="height:6px;background:linear-gradient(90deg,#25503F,#10B981);"></div>
                <div style="padding:32px 28px;">
                  <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">
                    ClinicLivingPlus Weekly Access
                  </div>
                  <h1 style="margin:0 0 10px;font-size:21px;font-weight:800;color:#111815;">Your Weekly Portal Password</h1>
                  <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#4b5b53;">
                    Hello <strong>${name}</strong>, here is the active clinic password for <strong>${weekLabel}</strong>. Use it with your <strong>${email}</strong> address to sign in to LP Insight.
                  </p>
                  <div style="background:#f3f9f5;border:1.5px solid #25503F;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#25503F;margin-bottom:6px;">
                      Active Weekly Password
                    </div>
                    <div style="font-family:Consolas,Monaco,monospace;font-size:26px;font-weight:900;letter-spacing:2px;color:#1A3A2D;word-break:break-all;">
                      ${password}
                    </div>
                  </div>
                  <p style="text-align:center;margin:22px 0;">
                    <a href="${portalUrl}" style="display:inline-block;padding:11px 24px;background:#25503F;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Open LP Insight Portal &rarr;</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `;

        let status: 'sent' | 'failed' = 'sent';
        let errorMessage: string | null = null;

        try {
            if (transporter) {
                await transporter.sendMail({
                    from: `ClinicLivingPlus Access <${smtpUser}>`,
                    to: email,
                    subject,
                    text: `Hello ${name},\n\nYour ClinicLivingPlus weekly password (${weekLabel}) is: ${password}\n\nSign in at: ${portalUrl}`,
                    html
                });
            } else {
                const fromEmail = process.env.EMAIL_FROM || 'ClinicLivingPlus Security <onboarding@resend.dev>';
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ from: fromEmail, to: [email], subject, html })
                });
                if (!res.ok) {
                    const errBody = await res.text().catch(() => '');
                    throw new Error(`Resend HTTP ${res.status}: ${errBody.slice(0, 180)}`);
                }
            }
        } catch (err) {
            status = 'failed';
            errorMessage = err instanceof Error ? err.message : 'Unknown mail error';
        }

        await accountDb().execute({
            sql: 'INSERT INTO lp_mail_logs(id, recipient_email, recipient_name, subject, week_label, provider, status, error_message, sent_at, sent_by) VALUES(?,?,?,?,?,?,?,?,?,?)',
            args: [randomUUID(), email, name, subject, weekLabel, provider, status, errorMessage, Date.now(), sentBy]
        });

        results.push({ email, status, ...(errorMessage ? { error: errorMessage } : {}) });
    }

    return results;
}
