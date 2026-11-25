// Explicit migration only: no schema writes occur during ordinary page requests.
import fs from 'node:fs';import {createClient} from '@libsql/client';
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
import {statements} from '../lib/account-schema.ts';
async function bytes(tx){return Number((await tx.execute('PRAGMA page_count')).rows[0][0])*Number((await tx.execute('PRAGMA page_size')).rows[0][0])}
try{const before=await bytes(db);if(before+64_000_000+128_000_000>=4_000_000_000)throw Error('STOP: insufficient room for bounded chat storage and safety margin');if(process.argv.includes('--apply')){const tx=await db.transaction('write');try{for(const sql of statements)await tx.execute(sql);if(await bytes(tx)+192_000_000>=4_000_000_000)throw Error('STOP: storage ceiling');await tx.commit()}catch(e){await tx.rollback();throw e}finally{tx.close()}}console.log(JSON.stringify({applied:process.argv.includes('--apply'),beforeBytes:before,afterBytes:await bytes(db),chatBudgetBytes:128_000_000,safetyCeiling:4_000_000_000,freeAllowance:5_000_000_000},null,2))}finally{db.close()}
