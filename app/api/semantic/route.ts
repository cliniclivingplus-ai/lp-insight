import {allowed,json} from '../../../lib/turso';
import {semanticReady,semanticRevision} from '../../../lib/semantic';
export const dynamic='force-dynamic';
export async function GET(){if(!await allowed())return json({error:'Sign in required'},401);return json({enabled:await semanticReady(),revision:semanticRevision,dimensions:384})}
