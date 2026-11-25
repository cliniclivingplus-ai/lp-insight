import { NextResponse } from 'next/server';
import { issueSession, sessionCookie } from '../../../lib/session';
import { AccountError, CLINIC_DOMAIN, accountDb, checkPassword, emailAddress, sameOrigin } from '../../../lib/accounts';
import { query } from '../../../lib/turso';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    if (!sameOrigin(request))
        return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (Number(request.headers.get('content-length') || 0) > 4096)
        return Response.json({ ok: false, error: 'Request too large' }, { status: 413 });

    const isJson = (request.headers.get('content-type') || '').includes('application/json');
    const incoming = new URL(request.url);
    const base = (request.headers.get('x-forwarded-proto') || incoming.protocol.slice(0, -1)) + '://' + (request.headers.get('host') || incoming.host);

    const fail = (message: string, status = 401) =>
        isJson
            ? Response.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
            : NextResponse.redirect(new URL('/login?error=1', base), 303);

    try {
        const raw = await request.text();
        if (raw.length > 4096)
            return fail('Request too large', 413);

        let rawEmail = '';
        let password = '';
        let rememberMe = false;

        if (isJson) {
            const body = JSON.parse(raw);
            rawEmail = typeof body.email === 'string' ? body.email : '';
            password = typeof body.password === 'string' ? body.password : '';
            rememberMe = Boolean(body.rememberMe);
        } else {
            const form = new URLSearchParams(raw);
            rawEmail = form.get('email') || '';
            password = form.get('password') || '';
            rememberMe = form.get('rememberMe') === 'on' || form.get('rememberMe') === 'true';
        }

        const now = Math.floor(Date.now() / 1000);
        const counts = await query('SELECT count(*) AS count FROM lp_login_attempts WHERE created_at>?', [now - 600]);
        if (counts[0].count >= 20)
            return fail('Too many failed sign-in attempts. Try again later.', 429);

        let email = '';
        try {
            email = emailAddress(rawEmail);
        } catch (err) {
            if (err instanceof AccountError && err.message.includes(CLINIC_DOMAIN)) {
                return fail(err.message, 403);
            }
            return fail('Please enter a valid @' + CLINIC_DOMAIN + ' email address.', 400);
        }

        const row = (await accountDb().execute({
            sql: 'SELECT id,password_hash,session_version FROM lp_users WHERE email=?',
            args: [email]
        })).rows[0];

        const ok = await checkPassword(
            password,
            String(row?.password_hash || 'scrypt:' + '0'.repeat(32) + ':' + '0'.repeat(128))
        );

        if (!row || !ok) {
            await query('INSERT INTO lp_login_attempts(created_at) VALUES(?)', [now]);
            return fail('Authentication failed. Check your clinic email and password, then try again.', 401);
        }

        const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 28800;
        const token = issueSession({ id: String(row.id), session_version: Number(row.session_version) }, rememberMe);
        const response = isJson
            ? NextResponse.json({ ok: true, user: { email, domain: CLINIC_DOMAIN } }, { headers: { 'Cache-Control': 'no-store' } })
            : NextResponse.redirect(new URL('/', base), 303);

        response.cookies.set(sessionCookie, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge
        });
        return response;
    } catch {
        return fail('Sign-in failed. Please try again.', 500);
    }
}
