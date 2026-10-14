import {query} from './turso';
export type Topic={question:string;queries:string[]};
export const planSchema={type:'object',additionalProperties:false,required:['question','topics'],properties:{question:{type:'string'},topics:{type:'array',items:{type:'object',additionalProperties:false,required:['question','queries'],properties:{question:{type:'string'},queries:{type:'array',items:{type:'string'}}}}}}};
export function cleanPlan(raw:any,original:string):{question:string;topics:Topic[]}{
 if(!raw||typeof raw.question!=='string'||!Array.isArray(raw.topics))throw Error('AI_PLAN');
 const topics=raw.topics.slice(0,3).filter((t:any)=>typeof t.question==='string'&&Array.isArray(t.queries)).map((t:any)=>({question:t.question.slice(0,1000),queries:[...new Set<string>(t.queries.filter((q:any)=>typeof q==='string'&&q.trim()).map((q:string)=>q.trim().slice(0,160)))].slice(0,4)})).filter((t:Topic)=>t.queries.length);
 if(!topics.length)throw Error('AI_PLAN');return {question:raw.question.slice(0,2000)||original,topics};
}
export function ftsQuery(text:string){const words=[...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])].filter(t=>t.length>1).slice(0,7);return words.map(t=>'"'+t+'"*').join(' AND ')}
const columns='c.*,d.title,d.path,d.source_url,d.collection,d.status';
export async function retrieveTopics(topics:Topic[]){
 const groups=await Promise.all(topics.map(async topic=>{
  const matches=await Promise.all(topic.queries.map(async q=>{const match=ftsQuery(q);if(!match)return [];return query('SELECT '+columns+',bm25(lp_search) AS rank FROM lp_search JOIN lp_chunks c ON c.id=lp_search.rowid JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE lp_search MATCH ? ORDER BY rank,c.id LIMIT 30',[match])}));
  const byId=new Map<number,{row:any;score:number}>();
  matches.forEach(rows=>rows.forEach((row:any,i:number)=>{const entry=byId.get(row.id)||{row,score:0};entry.score+=1/(12+i);const boiler=(row.content.match(/Health and Nutrition News|Exam Room Podcast|Load More|Share on Facebook/g)||[]).length;entry.score-=Math.min(0.015,boiler*0.001);byId.set(row.id,entry)}));
  const counts=new Map<string,number>(),seen=new Set<string>();
  return [...byId.values()].sort((a,b)=>b.score-a.score||a.row.id-b.row.id).filter(({row})=>{const n=counts.get(row.document_id)||0;if(n>=2||seen.has(row.content)||row.content.length<100)return false;seen.add(row.content);counts.set(row.document_id,n+1);return true}).slice(0,7).map(x=>x.row);
 }));
 const selected:any[]=[];const seen=new Set<number>();let size=0;
 function add(row:any){if(seen.has(row.id)||size+row.content.length>48000)return;seen.add(row.id);size+=row.content.length;selected.push(row)}
 // Round-robin prevents the first part of a multi-question prompt consuming all context.
 for(let i=0;i<7;i++)for(const group of groups)if(group[i])add(group[i]);
 const anchors=selected.slice(0,6);
 const neighbors=await Promise.all(anchors.map(row=>query('SELECT '+columns+' FROM lp_chunks c JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE c.document_id=? AND c.document_version=? AND c.id IN (?,?) ORDER BY c.id',[row.document_id,row.document_version,row.id-1,row.id+1])));
 for(const group of neighbors)for(const row of group)add(row);
 return selected;
}

