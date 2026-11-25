import { randomUUID } from 'node:crypto';
import { AccountError, accountDb, accountWrite, CHAT_BUDGET } from './accounts';
const RESERVED = 96000;
export function chatId(value: unknown) { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value))
    throw new AccountError('Conversation not found', 404); return value; }
export async function ownedChat(user: string, id: string) { const r = await accountDb().execute({ sql: 'SELECT id,title,revision,active_turn,lease_until FROM lp_chats WHERE id=? AND user_id=?', args: [id, user] }); if (!r.rows[0])
    throw new AccountError('Conversation not found', 404); return r.rows[0]; }
export function compactResult(result: any) { const copy = structuredClone(result); delete copy.debug; if (Array.isArray(copy.citations))
    copy.citations = copy.citations.map((c: any) => { const { content, ...metadata } = c; return metadata; }); const encoded = JSON.stringify(copy); if (Buffer.byteLength(encoded) > 64000)
    throw new AccountError('This answer is too large to save safely', 507); return encoded; }
export async function beginTurn(user: string, id: string, body: any) {
    chatId(id);
    if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 2000)
        throw new AccountError('Enter a question of up to 2,000 characters');
    const state = JSON.stringify(body.chatState || {});
    if (Buffer.byteLength(state) > 8000)
        throw new AccountError('Conversation context too large');
    if (!Number.isInteger(body.chatRevision) || body.chatRevision < 0)
        throw new AccountError('Reload this conversation before continuing', 409);
    return accountWrite(async (tx) => {
        const row = (await tx.execute({ sql: 'SELECT revision,active_turn,lease_until FROM lp_chats WHERE id=? AND user_id=?', args: [id, user] })).rows[0];
        if (!row)
            throw new AccountError('Conversation not found', 404);
        const now = Date.now();
        if (row.active_turn && Number(row.lease_until) > now)
            throw new AccountError('An answer is already running in this conversation', 409);
        if (Number(row.revision) !== body.chatRevision)
            throw new AccountError('This conversation changed in another tab. Reopen it before continuing.', 409);
        const budget = Number((await tx.execute('SELECT used_bytes FROM lp_chat_budget WHERE id=1')).rows[0].used_bytes);
        if (budget + RESERVED > CHAT_BUDGET)
            throw new AccountError('Saved-chat budget is full. Delete unneeded conversations to free space. Existing chats remain available.', 507);
        if (Number((await tx.execute({ sql: 'SELECT count(*) n FROM lp_chat_turns WHERE chat_id=? AND user_id=?', args: [id, user] })).rows[0].n) >= 500)
            throw new AccountError('This conversation has reached 500 messages. Start a new conversation.', 507);
        if (row.active_turn)
            await tx.execute({ sql: "UPDATE lp_chat_turns SET status='interrupted' WHERE id=? AND user_id=? AND status='pending'", args: [row.active_turn, user] });
        const turn = randomUUID(), sequence = Number(row.revision) + 1;
        await tx.execute({ sql: "INSERT INTO lp_chat_turns(id,chat_id,user_id,sequence,question,state,status,bytes,created_at) VALUES(?,?,?,?,?,?,'pending',?,?)", args: [turn, id, user, sequence, body.question.trim(), state, RESERVED, now] });
        await tx.execute({ sql: 'UPDATE lp_chat_budget SET used_bytes=used_bytes+? WHERE id=1', args: [RESERVED] });
        await tx.execute({ sql: 'UPDATE lp_chats SET revision=?,active_turn=?,lease_until=?,updated_at=?,title=CASE WHEN revision=0 THEN ? ELSE title END WHERE id=? AND user_id=?', args: [sequence, turn, now + 360000, now, body.question.trim().slice(0, 120), id, user] });
        return { id: turn, chatId: id, user, revision: sequence };
    });
}
export async function finishTurn(turn: {
    id: string;
    chatId: string;
    user: string;
    revision: number;
}, result: any) { const encoded = compactResult(result); return accountWrite(async (tx) => { const row = (await tx.execute({ sql: 'SELECT bytes,question,state,status FROM lp_chat_turns WHERE id=? AND user_id=? AND chat_id=?', args: [turn.id, turn.user, turn.chatId] })).rows[0]; if (!row)
    throw new AccountError('Conversation was deleted while answering', 409); if (row.status !== 'pending')
    throw new AccountError('This answer was interrupted. Reopen the conversation.', 409); const actual = Buffer.byteLength(encoded) + Buffer.byteLength(String(row.question)) + Buffer.byteLength(String(row.state)) + 1024; await tx.execute({ sql: 'UPDATE lp_chat_turns SET result=?,status=?,bytes=? WHERE id=? AND user_id=?', args: [encoded, result.error ? 'error' : 'complete', actual, turn.id, turn.user] }); await tx.execute({ sql: 'UPDATE lp_chat_budget SET used_bytes=used_bytes+? WHERE id=1', args: [actual - Number(row.bytes)] }); await tx.execute({ sql: 'UPDATE lp_chats SET active_turn=NULL,lease_until=0,updated_at=? WHERE id=? AND user_id=? AND active_turn=?', args: [Date.now(), turn.chatId, turn.user, turn.id] }); return turn.revision; }); }
