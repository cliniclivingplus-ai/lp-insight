import { randomUUID } from 'node:crypto';
import { currentUser } from '../../../lib/session';
import { AccountError, accountDb, accountWrite, accountFailure, bodyJson, sameOrigin } from '../../../lib/accounts';
import { chatId, ownedChat } from '../../../lib/chats';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try {
    const user = await currentUser();
    if (!user)
        throw new AccountError('Sign in required', 401);
    const url = new URL(request.url), id = url.searchParams.get('id');
    if (!id) {
        const rows = await accountDb().execute({ sql: 'SELECT id,title,updated_at,revision FROM lp_chats WHERE user_id=? ORDER BY updated_at DESC,id LIMIT 201', args: [user.id] });
        return Response.json({ chats: rows.rows }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const chat = await ownedChat(user.id, chatId(id));
    const before = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before < 1)
        throw new AccountError('Invalid page');
    const turns: any[] = (await accountDb().execute({ sql: 'SELECT id,sequence,question,result,state,status,created_at FROM lp_chat_turns WHERE chat_id=? AND user_id=? AND sequence<? ORDER BY sequence DESC LIMIT 30', args: [id, user.id, before] })).rows.reverse().map(r => ({ ...r, result: r.result ? JSON.parse(String(r.result)) : null, state: JSON.parse(String(r.state)) }));
    return Response.json({ chat, turns, before: turns.length ? turns[0].sequence : null, hasOlder: turns.length > 0 && Number(turns[0].sequence) > 1 }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return accountFailure(e);
} }
export async function POST(request: Request) { try {
    if (!sameOrigin(request))
        throw new AccountError('Forbidden', 403);
    const user = await currentUser();
    if (!user)
        throw new AccountError('Sign in required', 401);
    await bodyJson(request);
    const id = randomUUID();
    await accountWrite(async (tx) => { if (Number((await tx.execute({ sql: 'SELECT count(*) n FROM lp_chats WHERE user_id=?', args: [user.id] })).rows[0].n) >= 200 || Number((await tx.execute('SELECT count(*) n FROM lp_chats')).rows[0].n) >= 5000)
        throw new AccountError('Conversation limit reached. Delete an unneeded chat first.', 507); await tx.execute({ sql: 'INSERT INTO lp_chats(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)', args: [id, user.id, 'New conversation', Date.now(), Date.now()] }); });
    return Response.json({ id, revision: 0 }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return accountFailure(e);
} }
export async function PATCH(request: Request) { try {
    if (!sameOrigin(request))
        throw new AccountError('Forbidden', 403);
    const user = await currentUser();
    if (!user)
        throw new AccountError('Sign in required', 401);
    const body = await bodyJson(request), id = chatId(body.id);
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120)
        throw new AccountError('Use a title of up to 120 characters');
    await accountWrite(async (tx) => { const r = await tx.execute({ sql: 'UPDATE lp_chats SET title=? WHERE id=? AND user_id=?', args: [body.title.trim(), id, user.id] }); if (!r.rowsAffected)
        throw new AccountError('Conversation not found', 404); });
    return Response.json({ ok: true });
}
catch (e) {
    return accountFailure(e);
} }
export async function DELETE(request: Request) {
    try {
        if (!sameOrigin(request))
            throw new AccountError('Forbidden', 403);
        const user = await currentUser();
        if (!user)
            throw new AccountError('Sign in required', 401);
        const body = await bodyJson(request), id = chatId(body.id);
        // Deleting remains possible when the storage ceiling has stopped new writes.
        const tx = await accountDb().transaction('write');
        try {
            const row = (await tx.execute({ sql: 'SELECT id FROM lp_chats WHERE id=? AND user_id=?', args: [id, user.id] })).rows[0];
            if (!row)
                throw new AccountError('Conversation not found', 404);
            const size = Number((await tx.execute({ sql: 'SELECT coalesce(sum(bytes),0) n FROM lp_chat_turns WHERE chat_id=? AND user_id=?', args: [id, user.id] })).rows[0].n);
            await tx.execute({ sql: 'DELETE FROM lp_chat_turns WHERE chat_id=? AND user_id=?', args: [id, user.id] });
            await tx.execute({ sql: 'DELETE FROM lp_chats WHERE id=? AND user_id=?', args: [id, user.id] });
            await tx.execute({ sql: 'UPDATE lp_chat_budget SET used_bytes=max(0,used_bytes-?) WHERE id=1', args: [size] });
            await tx.commit();
        }
        catch (e) {
            await tx.rollback();
            throw e;
        }
        finally {
            tx.close();
        }
        return Response.json({ ok: true });
    }
    catch (e) {
        return accountFailure(e);
    }
}
