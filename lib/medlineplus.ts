import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';

const ENDPOINT='https://wsearch.nlm.nih.gov/ws/query',TTL=12*60*60*1000;
const cache=new Map<string,{expires:number;rows:MedlineSource[]}>(),pending=new Map<string,Promise<MedlineSource[]>>();
let queue=Promise.resolve(),next=0;let windowStart=Date.now(),requests=0;
export type MedlineSource={id:number;document_id:string;collection:'medlineplus';title:string;source_url:string;path:string;heading:string;content:string;evidence_access:'health_topic_summary';publisher:string;attribution:string;retrieved_at:string;status:string};
export class MedlineError extends Error{constructor(public code:string){super(code);}}
export function medlineEnabled(){return process.env.LP_MEDLINEPLUS_ENABLED!=='false';}
export function medlineQuery(raw:unknown){if(typeof raw!=='string'||raw.length>240||raw.trim().length<3||/@|https?:|\b\d{5,}\b/.test(raw))throw new MedlineError('MEDLINE_INVALID_QUERY');const words=raw.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)||[];if(!words.length)throw new MedlineError('MEDLINE_INVALID_QUERY');return words.slice(0,12).join(' ');}
export function medlinePath(raw:unknown){if(typeof raw!=='string'||!/^\/[a-z][a-z0-9-]{0,100}\.html$/.test(raw))throw new MedlineError('MEDLINE_INVALID_SOURCE');return raw;}
export function medlineId(path:string){return -2000000000000-parseInt(createHash('sha256').update(medlinePath(path)).digest('hex').slice(0,10),16);}
export function isMedlineId(id:number){return Number.isSafeInteger(id)&&id<=-2000000000000&&id>=-3099511627775;}
function plain(raw:string){return raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<\/?(?:p|div|li|ul|ol|br|h[1-6]|table|tr|td|th)\b[^>]*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();}
type Node=Record<string,any>;
const nodes=(a:Node[],k:string)=>(a||[]).filter(n=>Object.hasOwn(n,k));
const child=(a:Node[],k:string)=>nodes(a,k)[0]?.[k]||[];
function text(a:Node[]):string{return(a||[]).map(n=>Object.entries(n).filter(([k])=>k!==':@').map(([k,v])=>k==='#text'?String(v):Array.isArray(v)?text(v):'').join('')).join('');}
export function parseMedline(xml:string):MedlineSource[]{
 if(xml.length>700000||/<!ENTITY|<!DOCTYPE/i.test(xml))throw new MedlineError('MEDLINE_RESPONSE');
 let tree:Node[];try{tree=new XMLParser({preserveOrder:true,ignoreAttributes:false,parseTagValue:false,trimValues:false,processEntities:true}).parse(xml,true);}catch{throw new MedlineError('MEDLINE_RESPONSE');}
 const root=child(tree,'nlmSearchResult');if(!root.length)throw new MedlineError('MEDLINE_RESPONSE');
 const seen=new Set<number>();return nodes(child(root,'list'),'document').slice(0,6).flatMap(doc=>{
  let path:string;try{const url=new URL(String(doc[':@']?.['@_url']||''));if(url.origin!=='https://medlineplus.gov'||url.search||url.hash)return[];path=medlinePath(url.pathname);}catch{return[];}
  const fields=nodes(doc.document,'content'),get=(name:string)=>fields.filter(n=>String(n[':@']?.['@_name']||'').toLowerCase()===name.toLowerCase()).map(n=>plain(text(n.content))).filter(Boolean).join('\n');
  const title=get('title'),summary=get('fullSummary');if(!title||!summary||summary.length>6000)return[]; // Snippets alone are not answer evidence.
  const id=medlineId(path);if(seen.has(id))return[];seen.add(id);
  return[{id,document_id:'medlineplus:'+path,collection:'medlineplus' as const,title,source_url:'https://medlineplus.gov'+path,path,heading:'MedlinePlus.gov · Health-topic summary · linked pages not retrieved',content:summary,evidence_access:'health_topic_summary' as const,publisher:'National Library of Medicine',attribution:get('organizationName')||'MedlinePlus.gov, National Library of Medicine',retrieved_at:new Date().toISOString(),status:'unreviewed'}];
 });
}
function cachedRows(key:string){const entry=cache.get(key);return entry&&entry.expires>Date.now()?structuredClone(entry.rows):undefined;}
function remember(key:string,rows:MedlineSource[]){for(const [k,v] of cache)if(v.expires<Date.now())cache.delete(k);if(cache.size>=64)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+TTL,rows:structuredClone(rows)});}
async function limited(response:Response){const reader=response.body?.getReader();if(!reader)throw new MedlineError('MEDLINE_RESPONSE');const chunks:Uint8Array[]=[];let bytes=0;try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>700000)throw new MedlineError('MEDLINE_RESPONSE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(chunks).toString('utf8');}
export async function searchMedline(raw:unknown){
 if(!medlineEnabled())throw new MedlineError('MEDLINE_DISABLED');const term=medlineQuery(raw),key=term.toLowerCase();const hit=cachedRows(key);if(hit)return hit;if(pending.has(key))return structuredClone(await pending.get(key)!);if(pending.size>=16)throw new MedlineError('MEDLINE_RATE_LIMIT');
 const task=queue.then(async()=>{if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}if(requests>=50)throw new MedlineError('MEDLINE_RATE_LIMIT');requests++;const delay=Math.max(0,next-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));next=Date.now()+850;
  const url=new URL(ENDPOINT);url.search=new URLSearchParams({db:'healthTopics',term,retmax:'3',rettype:'brief',tool:'LPInsight'}).toString();
  try{const response=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.status===429)throw new MedlineError('MEDLINE_RATE_LIMIT');if(!response.ok)throw new MedlineError('MEDLINE_UNAVAILABLE');const rows=parseMedline(await limited(response));remember(key,rows);return rows;}catch(e){if(e instanceof MedlineError)throw e;throw new MedlineError('MEDLINE_UNAVAILABLE');}
 });queue=task.then(()=>{},()=>{});pending.set(key,task);try{return structuredClone(await task);}finally{pending.delete(key);}
}
export async function medlineForTopics(topics:{queries:string[]}[]){
 if(!medlineEnabled())return{sources:[] as MedlineSource[],status:'disabled'};
 // Broad health-topic summaries rarely use the research-search suffixes.
 const terms=[...new Set([topics[0]?.queries[0],topics[1]?.queries[0]].filter(Boolean).map(q=>q.replace(/\b(?:evaluation|interpretation|management|mechanism|study|serum|dietary)\b/gi,' ').replace(/\s+/g,' ').trim()).filter(q=>q.length>=3))].slice(0,2),groups:MedlineSource[][]=[];let failures=0;
 for(const term of terms)try{groups.push(await searchMedline(term));}catch{failures++;}
 const sources:MedlineSource[]=[],seen=new Set<number>();for(let i=0;i<3;i++)for(const group of groups){const row=group[i];if(row&&!seen.has(row.id)&&sources.length<2){sources.push(row);seen.add(row.id);}}
 return{sources,status:failures?(groups.length?'partial':'unavailable'):'available'};
}
export async function medlineSource(id:number,path?:string,title?:string){
 if(!isMedlineId(id))throw new MedlineError('MEDLINE_INVALID_SOURCE');for(const entry of cache.values())if(entry.expires>Date.now()){const row=entry.rows.find(r=>r.id===id);if(row)return structuredClone(row);}
 if(!path||medlineId(path)!==id||!title)throw new MedlineError('MEDLINE_INVALID_SOURCE');
 return(await searchMedline(title)).find(row=>row.id===id);
}
