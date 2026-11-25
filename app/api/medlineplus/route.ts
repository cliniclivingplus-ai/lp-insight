import {allowed,json} from '../../../lib/turso';
import {sessionKey} from '../../../lib/session';
import {medlineEnabled,searchMedline,MedlineError} from '../../../lib/medlineplus';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
const hits=new Map<string,{time:number;count:number}>();
async function access(){if(!await allowed())return json({error:'Sign in required'},401);if(!medlineEnabled())return json({error:'MedlinePlus is disabled'},503);const key=await sessionKey();if(!key)return json({error:'Sign in required'},401);const now=Date.now();for(const [k,v]of hits)if(now-v.time>60000)hits.delete(k);const hit=hits.get(key)||{time:now,count:0};if(hit.count>=8||hits.size>=1000)return json({error:'Please wait before requesting more MedlinePlus records'},429);hit.count++;hits.set(key,hit);return null;}
export async function GET(){return await access()||json({enabled:true,access:'health_topic_summary',ai_calls:0});}
export async function POST(request:Request){const blocked=await access();if(blocked)return blocked;const url=new URL(request.url),expected=(request.headers.get('x-forwarded-proto')||url.protocol.replace(':',''))+'://'+request.headers.get('host');if(request.headers.get('origin')!==expected)return json({error:'Request origin rejected'},403);
 try{const raw=await request.text();if(raw.length>1200)return json({error:'Search topic too long'},413);const body=JSON.parse(raw);return json({sources:await searchMedline(body.query),access_notice:'MedlinePlus.gov health-topic summaries. Linked pages and full journal articles were not retrieved. Information is not an endorsement of LP Insight.',ai_calls:0});}
 catch(e){if(e instanceof SyntaxError||e instanceof MedlineError&&e.code.startsWith('MEDLINE_INVALID'))return json({error:'Enter a general topic of 3–240 characters without identifying details'},400);if(e instanceof MedlineError&&e.code==='MEDLINE_RATE_LIMIT')return json({error:'MedlinePlus request limit reached. Please wait.'},429);return json({error:'MedlinePlus is unavailable. No AI request was made.'},503);}
}
