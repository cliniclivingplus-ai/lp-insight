import { AccountError, accountFailure, bodyJson, sameOrigin } from '../../../lib/accounts';
import {
    addRosterMember,
    getGodViewData,
    removeRosterMember,
    sendWeeklyPasswordEmails,
    setActiveWeeklyPassword,
    verifyAdminPassword
} from '../../../lib/admin-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requireAdmin(request: Request) {
    const pass = request.headers.get('x-admin-password') || '';
    if (!verifyAdminPassword(pass)) {
        throw new AccountError('Invalid admin password.', 401);
    }
}

export async function GET(request: Request) {
    try {
        requireAdmin(request);
        const data = await getGodViewData();
        return Response.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
        return accountFailure(e);
    }
}

export async function POST(request: Request) {
    try {
        if (!sameOrigin(request)) throw new AccountError('Forbidden', 403);
        requireAdmin(request);
        const body = await bodyJson(request, 24000);
        const action = String(body.action || '');

        if (action === 'update_password') {
            const updated = await setActiveWeeklyPassword(String(body.password || ''), String(body.weekLabel || 'Current Week'));
            return Response.json({ ok: true, weeklyConfig: updated }, { headers: { 'Cache-Control': 'no-store' } });
        }

        if (action === 'add_member') {
            const member = await addRosterMember(body.email, body.name, body.role);
            return Response.json({ ok: true, member }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
        }

        if (action === 'remove_member') {
            await removeRosterMember(body.email);
            return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
        }

        if (action === 'send_mail') {
            const emails: string[] = Array.isArray(body.emails) ? body.emails.map(String) : [];
            if (!emails.length) throw new AccountError('Select at least one recipient.', 400);
            const results = await sendWeeklyPasswordEmails(emails, 'Admin');
            return Response.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } });
        }

        throw new AccountError('Unknown action', 400);
    } catch (e) {
        return accountFailure(e);
    }
}
