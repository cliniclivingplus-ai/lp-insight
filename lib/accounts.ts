import { createClient, type Transaction } from '@libsql/client/web';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const CHAT_BUDGET = 128000000, STORAGE_CEILING = 4000000000, STORAGE_MARGIN = 64000000;
export class AccountError extends Error {
    constructor(message: string, public status = 400, public field?: string) { super(message); }
}
let client: ReturnType<typeof createClient> | undefined;
export function accountDb() { if (!client) {
    const url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken)
        throw new AccountError('Accounts are not configured', 503);
    if (new URL(url.replace(/^libsql:/, 'https:')).hostname !== 'lp-insight-living-plus.aws-ap-south-1.turso.io')
        throw new AccountError('Database configuration invalid', 503);
    client = createClient({ url, authToken });
} return client; }
export async function storageSize(tx: Pick<Transaction, 'execute'>) { const p = await tx.execute('PRAGMA page_count'), s = await tx.execute('PRAGMA page_size'); return Number(p.rows[0][0]) * Number(s.rows[0][0]); }
export async function accountWrite<T>(fn: (tx: Transaction) => Promise<T>) { const tx = await accountDb().transaction('write'); try {
    if (await storageSize(tx) + STORAGE_MARGIN >= STORAGE_CEILING)
        throw new AccountError('Saved-chat storage safety limit reached. Existing chats remain available.', 507);
    const value = await fn(tx);
    if (await storageSize(tx) + STORAGE_MARGIN >= STORAGE_CEILING)
        throw new AccountError('Saved-chat storage safety limit reached. Existing chats remain available.', 507);
    await tx.commit();
    return value;
}
catch (e) {
    await tx.rollback().catch(() => { });
    throw e;
}
finally {
    tx.close();
} }
export const CLINIC_DOMAIN = 'cliniclivingplus.com';
export function isClinicEmail(value: string) {
    const email = value.trim().toLowerCase();
    const parts = email.split('@');
    return parts.length === 2 && parts[1] === CLINIC_DOMAIN;
}
export function emailAddress(value: unknown) {
    if (typeof value !== 'string')
        throw new AccountError('Enter a valid email address', 400, 'email');
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new AccountError('Enter a valid email address', 400, 'email');
    if (!isClinicEmail(email))
        throw new AccountError(`Access Denied: Only @${CLINIC_DOMAIN} email addresses are permitted.`, 400, 'email');
    return email;
}
export function validPassword(value: unknown) { return typeof value === 'string' && value.length >= 12 && value.length <= 200; }
export async function passwordHash(password: string) { if (!validPassword(password))
    throw new AccountError('Use a password of 12–200 characters'); const salt = randomBytes(16).toString('hex'); const hash = await scrypt(password, salt, 64) as Buffer; return 'scrypt:' + salt + ':' + hash.toString('hex'); }
export async function checkPassword(password: string, encoded: string) { try {
    if (typeof password !== 'string' || password.length > 200)
        return false;
    const [algorithm, salt, hex] = encoded.split(':');
    if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex))
        return false;
    const value = await scrypt(password, salt, 64) as Buffer;
    return timingSafeEqual(value, Buffer.from(hex, 'hex'));
}
catch {
    return false;
} }
export function sameOrigin(request: Request) { const u = new URL(request.url), proto = request.headers.get('x-forwarded-proto')?.split(',')[0] || u.protocol.slice(0, -1); return request.headers.get('origin') === proto + '://' + (request.headers.get('host') || u.host); }
export async function bodyJson(request: Request, max = 8000) { if (Number(request.headers.get('content-length') || 0) > max)
    throw new AccountError('Request too large', 413); const raw = await request.text(); if (Buffer.byteLength(raw) > max)
    throw new AccountError('Request too large', 413); try {
    return JSON.parse(raw);
}
catch {
    throw new AccountError('Invalid request');
} }
export function accountFailure(e: unknown) { const status = e instanceof AccountError ? e.status : 503; return Response.json({ error: e instanceof AccountError ? e.message : 'Saved accounts or chats are temporarily unavailable. Please retry.', ...(e instanceof AccountError && e.field ? {field:e.field} : {}) }, { status, headers: { 'Cache-Control': 'no-store' } }); }
