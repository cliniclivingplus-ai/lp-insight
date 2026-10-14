import {query} from './turso';
export function aiProvider(){const provider=process.env.AI_PROVIDER|| (process.env.GEMINI_API_KEY?'gemini':'openai');if(!['gemini','openai'].includes(provider))throw Error('AI_PROVIDER');return provider}
export function aiConfigured(){return Boolean(aiProvider()==='gemini'?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY)}
export async function structured(instructions:string,input:unknown,schema:unknown,name:string){
 if(aiProvider()==='gemini'){
  const key=process.env.GEMINI_API_KEY;if(!key)throw Error('AI_NOT_CONFIGURED');
  const model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';if(!/^[a-zA-Z0-9._-]+$/.test(model))throw Error('AI_MODEL');
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:6000,temperature:0.2}}),signal:AbortSignal.timeout(45000),redirect:'error'});
  if(!r.ok)throw Error(r.status===429?'AI_QUOTA':r.status===401||r.status===403?'AI_KEY':r.status===404?'AI_MODEL':'AI_UNAVAILABLE');
  const data=await r.json();const candidate=data.candidates?.[0];if(candidate?.finishReason!=='STOP')throw Error('AI_UNAVAILABLE');
  const text=candidate.content?.parts?.filter((p:any)=>!p.thought&&typeof p.text==='string').map((p:any)=>p.text).join('');if(!text)throw Error('AI_UNAVAILABLE');return JSON.parse(text);
 }
 const key=process.env.OPENAI_API_KEY;if(!key)throw Error('AI_NOT_CONFIGURED');
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',store:false,tools:[],instructions,input:JSON.stringify(input),max_output_tokens:3500,text:{format:{type:'json_schema',name,strict:true,schema}}}),signal:AbortSignal.timeout(45000),redirect:'error'});
 if(!r.ok)throw Error(r.status===429?'AI_QUOTA':r.status===401?'AI_KEY':'AI_UNAVAILABLE');
 const data=await r.json();if(data.status!=='completed')throw Error('AI_UNAVAILABLE');
 const text=data.output?.flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
 if(!text)throw Error('AI_UNAVAILABLE');return JSON.parse(text);
}
export async function retrieve(question:string){
 const stop=new Set('what how why does do is are the a an of for in to and with from about say says can my library knowledge tell me find passages explain please according benefits benefit sources source stored files file'.split(' '));
 const terms=[...new Set((question.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>2&&!stop.has(t)))].slice(0,16);
 if(!terms.length)return [];
 const sql='SELECT c.*,d.title,d.path,d.source_url,d.collection,d.status,bm25(lp_search) AS rank FROM lp_search JOIN lp_chunks c ON c.id=lp_search.rowid JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE lp_search MATCH ? ORDER BY rank LIMIT 60';
 const exact=await query(sql,[terms.map(t=>'"'+t+'"').join(' AND ')]);
 const broader=exact.length>=12?[]:await query(sql,[terms.map(t=>'"'+t+'"').join(' OR ')]);
 const seen=new Set<string>(),perDoc=new Map<string,number>();let size=0;
 return [...exact,...broader].filter((c:any)=>{const text=c.content.trim();const count=perDoc.get(c.document_id)||0;if(seen.has(text)||count>=2||size+text.length>36000)return false;seen.add(text);perDoc.set(c.document_id,count+1);size+=text.length;return true}).slice(0,12);
}export const answerSchema={type:'object',additionalProperties:false,required:['status','sentences'],properties:{status:{type:'string',enum:['answered','insufficient']},sentences:{type:'array',items:{type:'object',additionalProperties:false,required:['topic','section','text','evidence'],properties:{topic:{type:'integer'},section:{type:'string',enum:['Answer','Explanation','Connection to your question','Limitations']},text:{type:'string'},evidence:{type:'array',items:{type:'object',additionalProperties:false,required:['source_id','quote'],properties:{source_id:{type:'integer'},quote:{type:'string'}}}}}}}}};
export function exactQuote(content:string,quote:string){
 if(content.includes(quote))return quote;
 const escaped=quote.trim().split(/\s+/u).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
 return content.match(new RegExp(escaped,'u'))?.[0]||null;
}
export function validateEvidence(draft:any,sources:any[]){
 if(draft.status!=='answered'||!Array.isArray(draft.sentences)||draft.sentences.length<1||draft.sentences.length>16)return false;
 return draft.sentences.every((s:any)=>typeof s.text==='string'&&s.text.length>0&&s.text.length<=1500&&Array.isArray(s.evidence)&&s.evidence.length>0&&s.evidence.length<=4&&s.evidence.every((e:any)=>{if(typeof e.quote!=='string'||e.quote.trim().length<12)return false;const source=sources.find(c=>c.id===e.source_id);if(!source)return false;const quote=exactQuote(source.content,e.quote);if(!quote)return false;e.quote=quote;return true}));
}export const verifySchema={type:'object',additionalProperties:false,required:['relevant','covered_topics','checks'],properties:{relevant:{type:'boolean'},covered_topics:{type:'array',items:{type:'integer'}},checks:{type:'array',items:{type:'object',additionalProperties:false,required:['index','supported'],properties:{index:{type:'integer'},supported:{type:'boolean'}}}}}};
export function verified(draft:any,result:any){return result.relevant===true&&Array.isArray(result.checks)&&result.checks.length===draft.sentences.length&&draft.sentences.every((_:any,i:number)=>result.checks.filter((c:any)=>c.index===i&&c.supported===true).length===1)}


export function supportedSentences(draft:any,check:any){
 if(check.relevant!==true||!Array.isArray(check.checks)||check.checks.length!==draft.sentences.length)return [];
 if(!draft.sentences.every((_:any,i:number)=>check.checks.filter((c:any)=>c.index===i).length===1))return [];
 return draft.sentences.filter((_:any,i:number)=>check.checks.some((c:any)=>c.index===i&&c.supported===true));
}
export function validSentences(draft:any,sources:any[]){
 if(draft.status!=='answered'||!Array.isArray(draft.sentences)||draft.sentences.length>16)return [];
 return draft.sentences.filter((sentence:any)=>validateEvidence({status:'answered',sentences:[sentence]},sources)).map((sentence:any)=>({...sentence,evidence:sentence.evidence.filter((e:any,i:number,all:any[])=>all.findIndex(x=>x.source_id===e.source_id&&x.quote===e.quote)===i)}));
}

