import { randomUUID } from 'node:crypto';
import { currentUser } from '../../../lib/session';
import { AccountError, accountDb, accountWrite, accountFailure, bodyJson, emailAddress, passwordHash, sameOrigin } from '../../../lib/accounts';
import { verifyAndConsumeOtp } from '../../../lib/otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        return Response.json(
            user ? { user: { id: user.id, email: user.email, name: user.name } } : { error: 'Sign in required' },
            { status: user ? 200 : 401, headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (e) {
        return accountFailure(e);
    }
}

export async function POST(request: Request) {
    try {
        if (!sameOrigin(request))
            throw new AccountError('Forbidden', 403);

        const body = await bodyJson(request);
        const now = Math.floor(Date.now() / 1000);
        const failures = await accountDb().execute({
            sql: 'SELECT count(*) n FROM lp_login_attempts WHERE created_at>?',
            args: [now - 600]
        });
        if (Number(failures.rows[0].n) >= 20)
            throw new AccountError('Too many attempts. Try again later.', 429);

        const email = emailAddress(body.email);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 80)
            throw new AccountError('Enter a name of up to 80 characters', 400, 'name');

        const hash = await passwordHash(body.password);

        await verifyAndConsumeOtp(email, body.otp);

        await accountWrite(async (tx) => {
            if (Number((await tx.execute('SELECT count(*) n FROM lp_users')).rows[0].n) >= 500)
                throw new AccountError('Pilot account limit reached', 507);
            if ((await tx.execute({ sql: 'SELECT id FROM lp_users WHERE email=?', args: [email] })).rows.length)
                throw new AccountError('Account could not be created. Try signing in or contact the administrator.');
            await tx.execute({
                sql: 'INSERT INTO lp_users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)',
                args: [randomUUID(), email, name, hash, now]
            });
        });

        return Response.json({ ok: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
        return accountFailure(e);
    }
}
