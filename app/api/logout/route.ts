import { NextResponse } from 'next/server';
import { sessionCookie, currentUser } from '../../../lib/session';
import { sameOrigin, accountDb, accountFailure } from '../../../lib/accounts';
export const runtime = 'nodejs';
export async function POST(request: Request) { if (!sameOrigin(request))
    return new Response('Forbidden', { status: 403 }); try {
    const user = await currentUser();
    if (user)
        await accountDb().execute({ sql: 'UPDATE lp_users SET session_version=session_version+1 WHERE id=?', args: [user.id] });
    const response = NextResponse.redirect(new URL('/login', request.url), 303);
    response.cookies.set(sessionCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
}
catch (e) {
    return accountFailure(e);
} }
