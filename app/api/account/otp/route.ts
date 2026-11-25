import { AccountError, accountDb, accountFailure, bodyJson, emailAddress, sameOrigin } from '../../../../lib/accounts';
import { issueAndSendOtp } from '../../../../lib/otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        if (!sameOrigin(request))
            throw new AccountError('Forbidden', 403);

        const body = await bodyJson(request);
        const email = emailAddress(body.email);

        const existing = await accountDb().execute({
            sql: 'SELECT id FROM lp_users WHERE email=?',
            args: [email]
        });
        if (existing.rows.length) {
            throw new AccountError('An account with this clinic email already exists. Please sign in above.', 409, 'email');
        }

        await issueAndSendOtp(email);
        return Response.json(
            { ok: true, message: `Verification code sent to ${email}. Check your inbox.` },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (e) {
        return accountFailure(e);
    }
}
