import {query} from './turso';
import {semanticMatches,fuseResults,type SemanticInput} from './semantic';
import {researchForTopics} from './pubmed';
import {clinicalGuidanceForTopics} from './clinical-guidance';
import {medlineForTopics} from './medlineplus';
export type Topic={question:string;queries:string[]};
export function normalizeMedicalTerms(text:string){return text.replace(/\b(?:amayloase|amygalase|amalyase|amyalse|amyloase|amalase)\b/gi,'amylase');}
export function clinicalLabContext(question:string){const q=normalizeMedicalTerms(question);const lab='(?:amylase|lipase|creatinine|ferritin|tsh|hba1c|ldl|alt|ast|triglycerides?|liver enzymes?)';return new RegExp('\\b(?:high|raised|elevated|abnormal|low)\\b[^.?!\\n]{0,35}\\b'+lab+'\\b|\\b'+lab+'\\b[^.?!\\n]{0,35}\\b(?:high|raised|elevated|abnormal|low)\\b','i').test(q);}
export function clinicalEvidenceQuestions(question:string,context?:any){
 if(!clinicalLabContext(question))return [];
 const replies=Array.isArray(context?.replies)?context.replies.filter((r:any)=>typeof r?.reply==='string'):[];
 const latest=question.split('\nClarification: ').at(-1)||'';
 const latestReply=latest.includes('My response:')?latest.split('My response:').at(-1)||'':latest;
 const values=[question.split(/\n(?:User context:|Clarification:)/)[0],...replies.map((r:any)=>r.reply),latestReply].join(' ');
 const resultKnown=/\b\d+(?:\.\d+)?\s*(?:U\/L|IU\/L|mg\/dL|mmol\/L|mIU\/L|ng\/mL)\b/i.test(values);
 const rangeKnown=/\b\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d|(?:range|upper limit)[^\n]{0,25}\d/i.test(values);
 const unknown=(kind:RegExp)=>replies.some((r:any)=>kind.test(r.prompt||'')&&/not sure|unknown|unavailable|not available|do not know|don't know/i.test(r.reply));
 return [!resultKnown&&!unknown(/result|units/i)?'Which test/specimen, result, units and laboratory reference range were reported?':!rangeKnown&&!unknown(/range|upper limit/i)?'What is the laboratory reference range or upper limit, if available?':null,...(!unknown(/symptoms|assessment/i)?['What symptoms, duration, other test results and existing assessment are known?']:[])].filter((q):q is string=>!!q);
}
// A focused clinical question still needs foundational/interpretation evidence,
// not only rare reports containing both the diet and enzyme names.
export function clinicalEvidenceTopics(question:string,topics:Topic[]):Topic[]{
 const q=normalizeMedicalTerms(question);
 if(!/\bamylase\b/i.test(q)){const queries=/\bbloating\b|\bgas\b/i.test(q)?['bloating management','bloating dietary']:/\bheartburn|\breflux\b/i.test(q)?['gastroesophageal reflux guideline','reflux lifestyle']:null;return queries?[{question:topics[0]?.question||q,queries:[...new Set([...queries,...(topics[0]?.queries||[])])].slice(0,4)},...topics.slice(1)]:topics;}
 const queries=clinicalLabContext(q)?['hyperamylasemia evaluation','serum amylase interpretation']:/\bketo(?:genic)?\b/i.test(q)?['amylase ketogenic diet','amylase digestion']:['amylase digestion','serum amylase'];
 return [{question:topics[0]?.question||q,queries:[...new Set([...queries,...(topics[0]?.queries||[])])].slice(0,4)},...topics.slice(1)];
}
export async function pubmedEvidence(topics:Topic[]){
 const guidance=clinicalGuidanceForTopics(topics);
 const papers=async()=>{if(!process.env.NCBI_API_KEY||process.env.LP_PUBMED_ENABLED==='false')return {sources:[] as any[],status:'disabled'};try{return {sources:await researchForTopics(topics),status:'available'};}catch{return {sources:[] as any[],status:'unavailable'};}};
 const [pubmed,medline]=await Promise.all([papers(),medlineForTopics(topics)]);
 if(!medline.sources.length)return {sources:guidance.length?[...guidance,...pubmed.sources.slice(0,1)]:pubmed.sources,status:pubmed.status,medline_status:medline.status};
 // Keep representation from each evidence type within the existing four-source cap.
 const groups=[pubmed.sources,medline.sources,guidance],sources:any[]=[],seen=new Set<number>();
 for(let i=0;i<4;i++)for(const group of groups){const row=group[i];if(row&&!seen.has(row.id)&&sources.length<4){sources.push(row);seen.add(row.id);}}
 return {sources,status:pubmed.status,medline_status:medline.status};
}
// Reserve bounded room for external abstracts without growing the model context.
export function mergeResearch(library:any[],research:any[]){
 const external:any[]=[];let externalSize=0;
 for(const row of research.slice(0,4)){if(externalSize+row.content.length>12000)continue;external.push(row);externalSize+=row.content.length;}
 const kept:any[]=[];const seen=new Set<number>();let size=externalSize;
 for(const row of library){if(size+row.content.length>48000||seen.has(row.id))continue;kept.push(row);seen.add(row.id);size+=row.content.length;}
 return [...kept,...external.filter(row=>!seen.has(row.id))];
}
// Supplement the same topic with explanatory evidence; these are search terms,
// not factual assertions. Keep the original action/outcome queries intact.
export function scientificSearchTopics(topics:Topic[],enabled=true):Topic[]{
 if(!enabled)return topics;
 return topics.map((topic,index)=>{
  if(index>=3)return topic;
  const anchor=(topic.queries[0]||'').match(/[\p{L}\p{N}-]+/gu)?.slice(0,3).join(' ');
  if(!anchor)return topic;
  return {...topic,queries:[...new Set([...topic.queries.slice(0,12),anchor+' mechanism',anchor+' study'])].slice(0,14)};
 });
}
export const planSchema={type:'object',additionalProperties:false,required:['question','answer_style','personal_medical','clarification_kind','topics'],properties:{clarification_kind:{type:'string',enum:['none','outcome','topic']},question:{type:'string'},answer_style:{type:'string',enum:['summary','sources']},personal_medical:{type:'boolean'},topics:{type:'array',items:{type:'object',additionalProperties:false,required:['question','queries'],properties:{question:{type:'string'},queries:{type:'array',items:{type:'string'}}}}}}};
export function cleanPlan(raw:any,original:string):{question:string;answer_style:'summary'|'sources';personal_medical:boolean;clarification_kind:'none'|'outcome'|'topic';topics:Topic[]}{
 if(!raw||typeof raw.question!=='string'||!Array.isArray(raw.topics))throw Error('AI_PLAN');
 const topics=raw.topics.slice(0,3).filter((t:any)=>typeof t.question==='string'&&Array.isArray(t.queries)).map((t:any)=>({question:t.question.slice(0,1000),queries:[...new Set<string>(t.queries.filter((q:any)=>typeof q==='string'&&q.trim()).map((q:string)=>q.trim().slice(0,160)))].slice(0,4)})).filter((t:Topic)=>t.queries.length);
 const clarification_kind=raw.clarification_kind==='outcome'?'outcome':raw.clarification_kind==='topic'?'topic':'none';
 if(!topics.length&&clarification_kind==='none')throw Error('AI_PLAN');return {question:raw.question.slice(0,2000)||original,answer_style:/\b(?:which|list|find|identify|name)\b[^?!]{0,100}\b(?:books?|videos?|documents?|sources?)\b|\b(?:each|individual|source[- ]by[- ]source)\b[^?!]{0,40}\b(?:sources?|documents?|books?|videos?)\b|\bwhere\b[^?!]{0,60}\b(?:library|books?|videos?|documents?)\b/i.test(original)?'sources':'summary',personal_medical:raw.personal_medical===true,clarification_kind,topics};
}
export function ftsQuery(text:string){
 const normalized=text.toLowerCase().replace(/\blow[\s-]+carb(?:ohydrate)?s?\b/gu,'lpsearchlowcarb');
 const words=[...new Set(normalized.match(/[\p{L}\p{N}]+/gu)||[])].filter(t=>t.length>1).slice(0,7);
 return words.map(t=>t==='lpsearchlowcarb'?'("low carb"* OR "low carbohydrate"*)':'"'+t+'"*').join(' AND ');
}
const columns='c.*,d.title,d.path,d.source_url,d.collection,d.status';
export async function retrieveTopics(topics:Topic[],semantic?:SemanticInput){
 const semanticPromise=semantic?semanticMatches(semantic):Promise.resolve([]);
 const groups=await Promise.all(topics.map(async topic=>{
  const queries=[...new Set(topic.queries.map(ftsQuery).filter(Boolean))];
  const matches=await Promise.all(queries.map(match=>query('SELECT '+columns+',bm25(lp_search) AS rank FROM lp_search JOIN lp_chunks c ON c.id=lp_search.rowid JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE lp_search MATCH ? ORDER BY rank,c.id LIMIT 30',[match])));
  const byId=new Map<number,{row:any;score:number}>();
  matches.forEach(rows=>rows.forEach((row:any,i:number)=>{const entry=byId.get(row.id)||{row,score:0};entry.score+=1/(12+i);const boiler=(row.content.match(/Health and Nutrition News|Exam Room Podcast|Load More|Share on Facebook/g)||[]).length;entry.score-=Math.min(0.015,boiler*0.001);byId.set(row.id,entry)}));
  if(/\bcompar\w*|\bversus\b|\bvs\b/iu.test(topic.question)){
   for(const entry of byId.values()){
    const text=entry.row.content;
    // Bibliographies and indexes match names but rarely explain the comparison.
    const references=(text.match(/(?:^|\n)\s*\d+\s+[^\n]{0,100}(?:et al\.|[A-Z]\.\s*[A-Z]\.|“)/gu)||[]).length;
    const indexLines=(text.match(/(?:^|\n)[^\n]{2,80},\s*\d+(?:[–,\s]\d+)+/gu)||[]).length;
    if(references>=3||indexLines>=5)entry.score-=0.1;
    const windows=text.match(/.{0,180}\b(?:versus|vs\.?|compared (?:with|to)|than)\b.{0,180}/giu)||[];
    const terms=topic.queries.map(q=>(q.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>2));
    if(windows.some((window:string)=>terms.some(words=>words.length>=2&&words.every(word=>window.toLowerCase().includes(word)))))entry.score+=0.05;
   }
  }
  const counts=new Map<string,number>(),seen=new Set<string>();
  return [...byId.values()].sort((a,b)=>b.score-a.score||a.row.id-b.row.id).filter(({row})=>{const n=counts.get(row.document_id)||0;if(n>=2||seen.has(row.content)||row.content.length<100)return false;seen.add(row.content);counts.set(row.document_id,n+1);return true}).slice(0,7).map(x=>x.row);
 }));
 const selected:any[]=[];const seen=new Set<number>();let size=0;
 function add(row:any){if(seen.has(row.id)||size+row.content.length>48000)return;seen.add(row.id);size+=row.content.length;selected.push(row)}
 // Round-robin prevents the first part of a multi-question prompt consuming all context.
 for(let i=0;i<7;i++)for(const group of groups)if(group[i])add(group[i]);
 const semanticRows=await semanticPromise;
 if(semanticRows.length){const ranked=fuseResults(selected,semanticRows),counts=new Map<string,number>();selected.length=0;seen.clear();size=0;for(const group of groups){const row=group.find(row=>!seen.has(row.id)&&(counts.get(row.document_id)||0)<2);if(!row)continue;const before=selected.length;add(row);if(selected.length>before)counts.set(row.document_id,(counts.get(row.document_id)||0)+1)}for(const row of ranked){const count=counts.get(row.document_id)||0;if(count>=2||selected.length>=14)continue;const before=selected.length;add(row);if(selected.length>before)counts.set(row.document_id,count+1)}}
 const anchors=selected.slice(0,6);
 const neighbors=await Promise.all(anchors.map(row=>query('SELECT '+columns+' FROM lp_chunks c JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE c.document_id=? AND c.document_version=? AND c.id IN (?,?) ORDER BY c.id',[row.document_id,row.document_version,row.id-1,row.id+1])));
 for(const group of neighbors)for(const row of group)add(row);
 return selected;
}


// Clarification contains questions/options only, never uncited health claims.
export function mergeQuestion(reply:string,context?:unknown){
 if(context==null)return reply;
 if(typeof context!=='object'||Array.isArray(context)||typeof (context as any).question!=='string'||!(context as any).question.trim()||(context as any).question.length>4500)throw Error('INVALID_CLARIFICATION');
 return (context as any).question.trim()+'\nClarification: '+reply;
}
export function clarificationFor(question:string,original=question,force?:'outcome'|'topic',context?:unknown){
 if(!force&&/\b(?:gastric|stomach|digestive|gut)\s+(?:issues?|problems?|trouble)\b/i.test(question)&&!/\b(?:bloating|heartburn|reflux|abdominal pain|nausea|vomiting|diarrh\w*|constipation|general information)\b/i.test(question))return {status:'clarification',sentences:[],citations:[],clarification:{kind:'digestive_symptom',question:'Which symptoms do you mean by gastric issues?',options:['Gas or bloating','Heartburn or reflux','Abdominal pain','Nausea or vomiting','Diarrhea or constipation','General information'],freeTextOptions:[],context:{question:original}},next_questions:['Which symptoms are present, for how long, and how severe are they?'],message:'The symptom description determines which evidence and options are relevant. Choose a symptom or describe it; no dietary cause is assumed.'};
 const clinical=!force?patientCaseClarification(question,original,context):undefined;if(clinical!==undefined)return clinical;
 const short=!force?shortReplyClarification(question,original,context):null;if(short)return short;
 const health=/\b(?:keto(?:genic)?|diet|fasting|treatment|therapy|medication|medicine|supplement|patient|insulin|metformin)\b/i.test(question);
 const failure=/\b(?:not working|isn['’]?t working|doesn['’]?t work|not helping|not effective|does not work|no improvement|not improving|no results|plateau(?:ed)?|stalled|failing)\b/i.test(question);
 const reply=question.startsWith(original+'\nClarification: ')?question.slice((original+'\nClarification: ').length).trim():'';
 const explicitReply=reply.length>=3&&!/^(?:yes|no|maybe|idk|i don['’]?t know|not working|another goal|something else)[.!?]*$/i.test(reply);
 const blood=/\bblood sugar|\bglucose|\bhba1c\b/i;
 const patient=/\b(?:patient|my|me|i)\b/i.test(question);
 const scoped=/\b(?:type[- ]?[12]|t[12]d|prediabetes|general (?:information|education)|asking generally|no specific patient)\b/i.test(question);
 const describedCondition=blood.test(original)&&explicitReply&&!/^(?:blood sugar|weight loss|cholesterol|low energy|another goal)$/i.test(reply);
 if(!force&&patient&&requestNeedsSteps(question)&&blood.test(question)&&!scoped&&!describedCondition){
  return {status:'clarification',sentences:[],citations:[],clarification:{kind:'condition',question:'Are you asking generally, or is a known condition being managed?',options:['General information only','Describe the known condition'],freeTextOptions:['Describe the known condition'],context:{question:blood.test(original)?original:question}},message:'Choose general information or describe the known condition so the library evidence can be kept in context.'};
 }
 const outcome=explicitReply||/\b(?:weight|fat loss|blood sugar|glucose|hba1c|cholesterol|ldl|triglycerides?|energy|fatigue|symptoms?|seizures?|pain|blood pressure|sleep|digestion|constipation|diarrh[oe]+a)\b/i.test(question);
 const patientPlan=/\bpatient\b/i.test(question)&&/\b(?:best|which)\b[^?!]{0,60}\b(?:diet|plan|treatment)\b/i.test(question);
 if(!force&&!(health&&(failure||patientPlan)&&!outcome))return null;
 const topic=force==='topic';
 return {status:'clarification',sentences:[],citations:[],clarification:{kind:topic?'topic':'outcome',question:topic?'Which topic or approach would you like help with?':failure?'What does “not working” mean here—which outcome is not improving?':'Which outcome would you like to improve?',options:topic?[]:['Weight loss','Blood sugar','Cholesterol','Low energy','Another goal'],freeTextOptions:['Another goal'],context:{question:original}},message:'Choose an option or describe the goal in your own words.'};
}
export function requestNeedsSteps(question:string){
 const latest=question.split('\nClarification: ').at(-1)||question;
 if(question.includes('Prior recommendation (conversational reference only;')&&/^(?:why\b|how (?:does|would|can) (?:that|this|it)\b|explain\b|tell me more\b)/i.test(latest.trim()))return false;
 return /\b(?:what\s+(?:should|can|to)\s+(?:i\s+|we\s+|they\s+)?(?:do|suggest|give|recommend|offer)|what to do|ways to help|ways to support|what (?:type|kind) of|meal ideas|meal examples|lifestyle changes|sustainable lifestyles?|next steps?|troubleshoot\w*|not working|isn['’]?t working|doesn['’]?t work|not helping|protocol|regimen|routine|step[- ]by[- ]step|programme|program|plan|how (?:can|should|do) (?:i|we|they)|manage|address)\b/i.test(question);
}
export function answerMeetsRequest(question:string,sentences:{section:string,text?:string}[],style='summary'){
 if(!sentences.length)return false;
 if(style==='clinical_context')return sentences.some(s=>['Answer','Explanation','Connection to your question'].includes(s.section));
 if(style==='sources')return sentences.some(s=>s.section==='Answer');
 if(requestNeedsSteps(question)&&/\bketo(?:genic)?\b/i.test(question)&&!sentences.some(s=>s.section==='Answer'&&/\bketo(?:genic)?\b/i.test(s.text||'')))return false;
 if(!requestNeedsSteps(question))return sentences.some(s=>['Answer','Explanation','Connection to your question','Options and trade-offs'].includes(s.section));
 return sentences.some(s=>s.section==='Practical next steps');
}

// Outcome queries are search aids, not diagnoses or clinical recommendations.
export function nextStepTopics(question:string,topics:Topic[],fallback=false):Topic[]{
 const latest=question.split('\nClarification: ').at(-1)||question;
 if(requestNeedsSteps(question)&&/\bsleep\b/i.test(latest)&&!/blood sugar|glucose|hba1c/i.test(latest)){const sleep={question:latest,queries:['sleep regularity','caffeine sleep','morning light sleep']};return fallback?[sleep,...topics.slice(0,1)]:[...topics,sleep];}
 if(requestNeedsSteps(question)&&/\b(?:weight\s*loss|weightloss|weight management|weight fluctuations?|fat loss)\b/i.test(question)&&!/\bketo(?:genic)?\b/i.test(question)){
  const food={question:'Concrete plant-based food choices for the active weight-management goal',queries:['calorie density vegetables beans','whole grains weight loss','plant based meals weight loss']};
  const habits={question:'Sustainable daily habits for the active weight-management goal',queries:['weight maintenance physical activity','self monitoring weight','weight loss sleep']};
  return fallback?[food,habits,...topics.slice(0,1)]:[...topics.slice(0,2),food,habits];
 }
 if(!requestNeedsSteps(question)||!/\b(?:keto(?:genic)?|diet|nutrition|fasting|low[- ]carb)\b/i.test(question))return topics;
 let queries:string[]=[];
 if(/\bblood sugar|\bglucose|\bhba1c\b/i.test(question))queries=['plant based diabetes','fiber blood sugar','glycemic control diet'];
 else if(/\bweight|\bfat loss\b/i.test(question))queries=['plant based weight loss','calorie density','weight loss plateau'];
 else if(/\bcholesterol|\bldl|\btriglycerides?\b/i.test(question))queries=['plant based cholesterol','soluble fiber cholesterol','lipid diet trials'];
 if(!queries.length)return topics;
 if(/\bketo(?:genic)?\b/i.test(question)){const outcome=/blood sugar|glucose|hba1c/i.test(question)?'blood sugar':/cholesterol|ldl/i.test(question)?'cholesterol':'weight loss';queries.unshift('ketogenic diet '+outcome+' plateau');}
 const actionTopic={question,queries};return fallback?[...topics.slice(0,1),actionTopic]:[...topics,actionTopic];
}

// Covered means a supported statement actually survived; an empty topic never becomes covered.
export function coveredAnswerTopics(sentences:{topic:number}[],check:any){return new Set(sentences.map(s=>s.topic).filter(i=>check.answers_request===true||(Array.isArray(check.covered_topics)&&check.covered_topics.includes(i))))}
export function needsConcreteDetail(question:string){return requestNeedsSteps(question)&&/\b(?:weight\s*loss|weightloss|weight management|weight fluctuations?)\b/i.test(question)&&/\b(?:ways|help|lifestyles?|meals?|plan)\b/i.test(question)}

// Questions collect preferences/context only; they make no uncited health claims.
export function broadGuidanceQuestions(question:string):string[]{
 if(question.includes('\nClarification: '))return [];
 const q=question.toLowerCase().replace(/weightloss/g,'weight loss');
 const advice=requestNeedsSteps(q)||/\b(?:tips|ways? to|help (?:me |us )?with|help (?:me|us|someone|a person).{0,20}(?:weight|sleep|nutrition)|how to (?:improve|lose|manage)|best (?:diet|way|plan)|what should .*eat)\b/i.test(q);
 if(!advice||/\b(?:compare|versus|vs|which (?:book|video|source)|why does)\b/i.test(q))return [];
 // An explicitly constrained task is already specific enough to answer directly.
 if(/\b(?:currently|already|allerg\w*|budget|prefer\w*|limited to|only have|breakfast|lunch|dinner|recipe for)\b/i.test(q)||q.split(/\s+/).length>65)return [];
 if(/\b(?:weight|fat loss)\b/i.test(q))return [
  /fl[au]ctuat|plateau|regain/i.test(q)?'Does the pattern mean day-to-day changes, a plateau, or regaining lost weight?':'Is the goal to begin losing weight or maintain weight already lost?',
  'What does a typical day of meals and physical activity look like?',
  'What practical limits or preferences should the approach consider?'];
 if(/\bprotein\b/i.test(q))return [
  ...(/muscle|strength|athlet|sport/i.test(q)?[]:['Is this for general health, muscle gain, or an activity goal?']),
  'Which plant-based protein foods do you already eat, and what practical limits should we consider?'];
 if(/\bsleep|insomnia|morning energy\b/i.test(q))return [
  ...(/falling asleep|staying asleep|morning energy|wake during/i.test(q)?[]:['Is the main concern falling asleep, staying asleep, or morning energy?']),
  'What are the usual sleep and wake times, and what makes the routine difficult?'];
 if(/\b(?:diet|nutrition|healthy eating|lifestyle)\b/i.test(q))return ['Which outcome would you like the food or lifestyle guidance to focus on?','What eating pattern, preferences, or practical limits should it take into account?'];
 return [];
}

// Topic-neutral preflight. User replies are conversation data, never library evidence.
// Collect case context without diagnosing or treating user statements as evidence.
export function patientCaseClarification(question:string,original:string,rawContext?:unknown){
 const root=original.split(/\n(?:Clarification:|User context:|Patient context|Prior recommendation)/)[0];
 if(!/\bpatient\b/i.test(root)||!/\b(?:keto|ketogenic|diet)\b/i.test(root)||!/not working|no improvement|not improving|not improved|not effective|not getting|no results|isn['’]?t.*(?:working|results)/i.test(root))return undefined;
 const meta=rawContext&&typeof rawContext==='object'?rawContext as any:{};
 const raw=question.includes('\nClarification: ')?question.split('\nClarification: ').at(-1)!.trim():'';
 const marker=/my response:/i.exec(raw),reply=(marker?raw.slice(marker.index+marker[0].length):raw).trim();
 const prompt=(marker?raw.slice(0,marker.index):meta.prompt||'').slice(0,240);
 if(/general information only|no specific patient/i.test(reply))return null;
 if(/^(?:why|how|explain|what about|tell me more)\b/i.test(reply)&&!/^(?:what about|how about)\s+(?:cholesterol|blood sugar|weight loss)[?.!]*$/i.test(reply))return null;
 const records:{prompt:string;reply:string}[]=Array.isArray(meta.patientReplies)?meta.patientReplies.filter((r:any)=>r&&typeof r.reply==='string'&&typeof r.prompt==='string').slice(-10).map((r:any)=>({prompt:r.prompt.slice(0,140),reply:r.reply.slice(0,160)})):[];
 if(reply&&!records.some((r:any)=>r.prompt===prompt&&r.reply===reply))records.push({prompt,reply:reply.slice(0,160)});
 const goalOf=(s:string)=>/cholesterol|\bldl\b/i.test(s)?'cholesterol':/blood sugar|glucose|hba1c|fasting/i.test(s)?'blood sugar':/weight loss/i.test(s)?'weight loss':'';
 const goal=goalOf(reply)||goalOf(meta.activeGoal||'')||[...records].reverse().map(r=>goalOf(r.reply)).find(Boolean)||goalOf(root);
 const all=[root,...records.map(r=>r.reply)].join(' ');
 const durationUnknown=records.some(r=>/how long/i.test(r.prompt)&&/unknown|not sure|not known/i.test(r.reply));
 const duration=durationUnknown||/\b(?:\d+|one|two|three|four|six|several)\s*(?:days?|weeks?|months?|years?)\b/i.test(all);
 const condition=/type[- ]?[12]|t[12]d|prediabet/i.test(all)||records.some(r=>/known condition/i.test(r.prompt)&&/unknown|not sure|not known|none/i.test(r.reply));
 const medication=records.some(r=>/medication|medicines/i.test(r.prompt)&&/^no[.!?]*$/i.test(r.reply))||/\b(?:insulin|metformin|no medications?|no medicines?)\b/i.test(all)||records.some(r=>/medication|medicines/i.test(r.prompt)&&r.reply.length>1&&!/^(yes|no)$/i.test(r.reply));
 const goalStart=records.map(r=>goalOf(r.reply)).lastIndexOf(goal);
 const relevant=records.slice(Math.max(0,goalStart)).map(r=>r.prompt+' — '+r.reply).join(' ');
 const measureUnknown=records.some(r=>/which measure|which lipid measure|day-to-day fluctuation/i.test(r.prompt)&&/unknown|not sure|not known/i.test(r.reply));
 const measure=measureUnknown||(goal==='blood sugar'?/fasting|after meals|post[- ]?meal|hba1c/i.test(relevant):goal==='cholesterol'?/\bldl\b|\bhdl\b|triglycerides|total cholesterol/i.test(relevant):/day.to.day|plateau|regain|trend/i.test(relevant));
 const trend=records.slice(Math.max(0,goalStart)).some(r=>/trend|changed|change over/i.test(r.prompt)&&r.reply.length>1&&!/^(yes|no)$/i.test(r.reply));
 let ask=!goal?'Which outcome is not improving: weight, blood sugar, cholesterol, or something else?':!duration?'How long has the patient followed this diet?':!measure?(goal==='blood sugar'?'Which measure is not improving: fasting glucose, readings after meals, or HbA1c?':goal==='cholesterol'?'Which lipid measure is not improving: LDL, HDL, triglycerides, or total cholesterol?':'Is this day-to-day fluctuation, a plateau, or regaining weight?'):!trend?'What is the trend for that measure over this period? A description is enough; include units if sharing readings.':goal==='blood sugar'&&!condition?'What known condition is being managed, or is the diagnosis unknown?':!medication?'Which medications is the patient taking, or are there none or details unknown?':'';
 if(!ask)return null;
 const kept=records.slice(-10);
 return {status:'clarification',sentences:[],citations:[],clarification:{kind:'patient_case',question:ask,options:['General information only'],freeTextOptions:[],context:{question:root+(goal?'\nClarification: '+goal:''),activeGoal:goal,prompt:ask,patientReplies:kept,pendingQuestions:[ask]}},next_questions:[ask],message:'Please omit identifying details. These are patient-reported details, not a diagnosis or library evidence. Unknown details are acceptable; you can also choose general information.'};
}
export function shortReplyClarification(question:string,original:string,rawContext?:unknown){
 // Older/copied follow-up prompts may arrive without a clarification envelope.
 // Recover only an explicit lab prompt + answer, never infer a diagnosis.
 if(!question.includes('\nClarification: ')&&/my response:/i.test(question)&&/test.*result|numeric result|laboratory reference range|test\/specimen/i.test(question.split(/my response:/i)[0])){
  const reply=question.split(/my response:/i).at(-1)!.trim();
  const prompt=question.slice(0,question.search(/my response:/i)).trim();
  original=/\bamylase\b/i.test(reply)?'Interpret the reported amylase test result':'Interpret the reported laboratory test result';
  question=original+'\nClarification: '+prompt+' My response: '+reply;
 }
 if(!question.includes('\nClarification: '))return null;
 const raw=question.split('\nClarification: ').at(-1)!.trim();
 const marker=/my response:/i.exec(raw),reply=(marker?raw.slice(marker.index+marker[0].length):raw).trim();
 const meta=rawContext&&typeof rawContext==='object'?rawContext as any:{};
 const prompt=(marker?raw.slice(0,marker.index).trim():typeof meta.prompt==='string'?meta.prompt:'').slice(0,240);
 const pending:string[]=Array.isArray(meta.pendingQuestions)?meta.pendingQuestions.filter((q:any)=>typeof q==='string').slice(0,3).map((q:string)=>q.slice(0,240)):[];
 const asked=prompt||(pending.length===1?pending[0]:'');
 const records:{prompt:string;reply:string}[]=Array.isArray(meta.replies)?meta.replies.filter((r:any)=>r&&typeof r.prompt==='string'&&typeof r.reply==='string').slice(-4).map((r:any)=>({prompt:r.prompt.slice(0,140),reply:r.reply.slice(0,160)})):[];
 if(!reply||reply.length>180||reply.split(/\s+/).length>6)return null;
 if(/^(?:why|how|what|which|explain|tell me|continue|go on|more details)\b/i.test(reply))return null;
 if(/^(?:weight loss|blood sugar|cholesterol|low energy|general information only|another goal|describe the known condition)[.!?]*$/i.test(reply))return null;
 if(/(?:diabet|blood sugar|condition)/i.test(original+' '+asked)&&/^(?:type[- ]?[12](?: diabetes)?|t[12]d|prediabetes)[.!?]*$/i.test(reply))return null;
 if(!asked&&/not working|no improvement|best.*diet/i.test(original)&&/^(?:[a-z]+[ -]+)+(?:frequency|control|reduction|management)$/i.test(reply))return null;
 const unknown=/^(?:not sure|unsure|idk|i don['’]?t know|don['’]?t know|maybe|not certain)[.!?]*$/i.test(reply);
 if(!unknown&&!meta.collecting&&reply.split(/\s+/).length>=5&&/\b(?:i|we|they)\s+(?:eat|have|prefer|do|walk|work|sleep|wake|avoid|use|need)\b/i.test(reply))return null;
 const yesNo=/^(?:yes|no|yep|nope|okay|ok|sure)[.!?]*$/i.test(reply);
 const numberOnly=/^[\d.,]+(?:\s*(?:kg|lbs?|cm|hours?|minutes?|cups?|times?))?$/i.test(reply);
 const combined=reply; // Never use an answer to a different question to fill this question's slots.
 const timing=/\b(?:mornings?|afternoons?|evenings?|nights?|noon|midnight|daily|weekly|weekends?|bedtime|am|pm|sometimes|often|rarely|occasionally|never|always|varies|irregular)\b|\b\d{1,2}\s*(?:am|pm)\b|\b\d{1,2}:\d{2}\b|\b(?:at|around)\s+\d{1,2}\b/i.test(combined);
 const withoutTimes=combined.replace(/\b\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*(?:am|pm)\b|\b\d{1,2}:\d{2}\b/gi,'');
 const amount=/\d|\b(?:one|two|three|four|five|six|cup|glass|serving|portion|bowl|none)\b/i.test(withoutTimes);
 const activity=/\b(?:walk\w*|run\w*|cycl\w*|exercise|gym|yoga|swim\w*|strength|sedentary|inactive|none)\b/i.test(combined);
 const scheduleAsked=/when|what time|times|timing|schedule|sleep and wake|sleep.*wake/i.test(asked);
 const amountAsked=/how much|how many|amount|quantity|cups?|roughly/i.test(asked);
 const activityAsked=/physical activity|exercise routine|movement routine|activity routine|what activity/i.test(asked);
 const frequencyAsked=/how often|frequency|how regular/i.test(asked),durationAsked=/how long|how much time|duration|per session/i.test(asked);
 const mealsAsked=/typical day.*meals|day of meals|eating pattern|usual.*(?:diet|meals)|meal routine/i.test(asked);
 if(activityAsked&&!mealsAsked&&/^(?:none|no exercise|not active|sedentary|inactive)[.!?]*$/i.test(reply))return null;
 const missing:string[]=[];
 const labAsked=/test.*result|numeric result|laboratory reference range|test\/specimen/i.test(asked),rangeOnlyAsked=/reference range|upper limit/i.test(asked)&&!/result, units|test\/specimen/i.test(asked);
 const labRange=/\d\s*(?:-|–|to)\s*\d|(?:range|upper limit)[^\n]{0,30}\d/i.test(reply);
 if(rangeOnlyAsked&&labRange)return null;
 if(labAsked&&!rangeOnlyAsked&&!amount&&!unknown)missing.push('What is the numeric result and its units, or are those details unavailable?');
 const labUnits=/\b(?:U\/L|IU\/L|mg\/dL|mmol\/L|mIU\/L|ng\/mL)\b/i.test(reply);
 if(labAsked&&!rangeOnlyAsked&&amount&&!labUnits)missing.push('What units are printed next to the result?');
 if(labAsked&&!rangeOnlyAsked&&amount&&!labRange)missing.push('What is the laboratory reference range or upper limit, if available?');
 if(scheduleAsked&&!timing)missing.push(/\d/.test(reply)?'Could you include AM/PM or use a 24-hour time?':'At what times does this usually happen?');
 if(amountAsked&&!amount)missing.push('What is the approximate amount or quantity?');
 if(frequencyAsked&&!timing)missing.push('How often does this happen?');
 if(durationAsked&&!amount)missing.push('For about how long each time?');
 if(activityAsked&&!(activity&&timing&&amount))missing.push(activity?'How often and for how long do you do that activity?':'What activity do you do, and how often and for about how long?');
 if(mealsAsked&&!/breakfast|lunch|dinner|snack/i.test(combined)&&combined.split(/\s+/).length<10)missing.push('What does a usual day of meals look like?');
 const remaining=meta.collecting===true?pending.slice(1).filter(q=>!(/amount|quantity|how much|how many/i.test(q)&&amount)&&!(/what times|when|AM\/PM/i.test(q)&&timing)&&!(/how long|duration/i.test(q)&&amount)&&!(/how often/i.test(q)&&timing)):[];
 // A short but complete answer to a specific question is useful, not a failure.
 const openField=/\b(?:which|what)\b.*\b(?:foods?|meals?|prefer\w*|allerg\w*|goal|outcome|budget|constraint|limit|language|format|style|tone|country|city|location|device|platform|topic|change|understand|part|context|tests?|specimen|results?|units?|range|symptoms?|assessment|diagnosis)\b/i.test(asked);
 const binaryQuestion=/^(?:do|does|did|have|has|is|are|can|would|will|should)\b/i.test(asked)&&!/[?].*\S|\bor\b|how|what|which|when/i.test(asked.replace(/^(?:do|does|did|have|has|is|are|can|would|will|should)\s+/i,''));
 const categoryOnly=/^(?:budget|time|stress|exercise|diet|food|protein|caffeine|coffee|sleep|work|schedule|medication|pain|fatigue|money|cost)[.!?]*$/i.test(reply);
 if(!unknown&&!missing.length&&!remaining.length&&!categoryOnly){
  if(yesNo&&binaryQuestion){if(/^(?:yes|yep|sure)[.!?]*$/i.test(reply)&&/allerg|restriction|constraint|limitation/i.test(asked))missing.push('Which restrictions or constraints should I take into account?');else return null;}
  if(numberOnly&&((amountAsked&&(/how many|\b(?:cups?|servings?|meals?|recipes?|portions?)\b/i.test(asked)||/\b(?:kg|lbs?|cm|cups?|servings?|portions?)\b/i.test(reply)))||(durationAsked&&/\b(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/i.test(reply))||/\b(?:kg|lbs?|cm|minutes?|hours?|cups?)\b/i.test(asked))&&!scheduleAsked&&!activityAsked)return null;
  if(!yesNo&&!numberOnly&&(openField||scheduleAsked||amountAsked||frequencyAsked||durationAsked||activityAsked||mealsAsked))return null;
 }
 let ask=unknown?'Would you prefer general library information, or is there another detail you can share?':missing[0]||remaining[0];
 if(!unknown&&!ask&&categoryOnly)ask=/budget|money|cost/i.test(reply)?'What budget or price range and currency should the answer take into account?':/^time[.!?]*$/i.test(reply)?'How much time is available, and for which activity?':'When does this happen, and what part of the routine does it affect?';
 if(!ask)ask=yesNo?(asked?'Could you answer the specific question in a few words rather than just yes or no?':'Which part of the previous answer are you responding to, and what would you like to explore?'):numberOnly?'What does that number refer to, including its unit?':asked?'What would you like to change or understand about that detail?':'How does that detail relate to the current topic, and what would you like help with?';
 if(!unknown&&(!yesNo||!!asked)){const entry={prompt:(asked||'Additional context').slice(0,140),reply:reply.slice(0,160)};if(!records.some(r=>r.prompt===entry.prompt&&r.reply===entry.reply))records.push(entry)}
 const queue=unknown?[ask]:[ask,...missing.slice(1),...remaining.filter(q=>q!==ask)].filter((q,i,a)=>a.indexOf(q)===i).slice(0,3);
 const kept=records.slice(-4),root=original.split(/\n(?:Prior recommendation \(|User context:|Clarification:)/)[0];
 return {status:'clarification',sentences:[],citations:[],clarification:{kind:'short_reply',question:ask,options:unknown?['General information only']:[],freeTextOptions:[],context:{question:root+(kept.length?'\nUser context: '+kept.map(r=>r.prompt+' — '+r.reply).join(' | '):''),prompt:ask,pendingQuestions:queue,collecting:true,replies:kept}},next_questions:[ask],message:'Your reply is kept in this conversation. I need a little more context before choosing relevant library guidance; a short reply alone does not establish a cause or a personalized plan.'};
}
