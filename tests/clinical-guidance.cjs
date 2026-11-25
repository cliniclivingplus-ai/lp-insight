const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
globalThis.fetch=async()=>{throw Error('Network and AI disabled')};
function load(file,bindings={}){const m={exports:{}};new Function('exports','require','module',...Object.keys(bindings),ts.transpileModule(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,require,m,...Object.values(bindings));return m.exports}
const guidance=load('lib/clinical-guidance.ts');
const r=load('lib/retrieval.ts',{...guidance,medlineForTopics:async()=>({sources:[],status:'disabled'}),researchForTopics:async()=>[{id:-12345,content:'Fixture abstract'}]});
const prompt='Which test/specimen, result, units and laboratory reference range were reported?';
const question=prompt+' My response: amylase';
const short=r.clarificationFor(question);assert.equal(short.status,'clarification');assert.match(short.clarification.question,/numeric result/);assert.match(short.clarification.context.question,/amylase/);assert.doesNotMatch(short.clarification.context.question,/high amylase/);
assert.equal(guidance.clinicalGuidanceForTopics([{question:'sleep',queries:['caffeine']}]).length,0);
const sources=guidance.clinicalGuidanceForTopics([{question:'high amylase',queries:[]}]);assert.equal(sources.length,3);
for(const row of sources){assert.equal(row.evidence_access,'selected_guidance_excerpt');assert.equal(guidance.clinicalGuidanceSource(row.id).content,row.content);assert.ok(row.source_url.startsWith('https://'));}
(async()=>{
 const oldKey=process.env.NCBI_API_KEY,oldEnabled=process.env.LP_PUBMED_ENABLED;
 try{
 process.env.NCBI_API_KEY='offline-fixture';delete process.env.LP_PUBMED_ENABLED;
 const result=await r.pubmedEvidence([{question:'high amylase',queries:[]}]);assert.equal(result.sources.length,4);assert.equal(result.sources[0].collection,'clinical_guidance');assert.equal(result.sources[3].id,-12345);
 process.env.LP_PUBMED_ENABLED='false';assert.equal((await r.pubmedEvidence([{question:'high amylase',queries:[]}])).sources.length,3);
 }finally{if(oldKey===undefined)delete process.env.NCBI_API_KEY;else process.env.NCBI_API_KEY=oldKey;if(oldEnabled===undefined)delete process.env.LP_PUBMED_ENABLED;else process.env.LP_PUBMED_ENABLED=oldEnabled;}
 const route=load('app/api/source/route.ts',{...guidance,isMedlineId:()=>false,allowed:async()=>true,json:(v,status=200)=>Response.json(v,{status}),pubmedArticles:async()=>{throw Error('NIH ID routed to PubMed')},query:async()=>{throw Error('NIH ID routed to database')}});
 for(const row of sources){const response=await route.GET(new Request('https://app.test/api/source?chunk='+row.id));assert.equal(response.status,200);assert.equal((await response.json()).content,row.content);}
 assert.equal((await route.GET(new Request('https://app.test/api/source?chunk=-1000000000099'))).status,404);
 const g=load('lib/grounded.ts'),guard=load('lib/guard.ts'),d=load('lib/discussion.ts',guard);
 let stages=[];
 const answer=load('app/api/answer/route.ts',{...r,...g,...guard,...d,allowed:async()=>true,sessionKey:async()=>'offline',json:(v,status=200)=>Response.json(v,{status}),query:async sql=>sql.includes('RETURNING id')?[{id:1}]:[],parseSemantic:()=>undefined,aiConfigured:()=>true,aiProvider:()=> 'offline',retrieveTopics:async()=>[],pubmedEvidence:async()=>({status:'disabled',sources}),structured:async(prompt,input,schema,stage)=>{
  stages.push(stage);if(stage==='search_plan')return{question:input.question,answer_style:'summary',personal_medical:true,clarification_kind:'none',topics:[{question:input.question,queries:['amylase interpretation']}]};
  if(stage==='evidence_check')return{answers_request:true,relevant:true,covered_topics:[0],checks:input.sentences.map((_,index)=>({index,supported:true}))};
  assert.match(prompt,/selected NIH clinical guidance/);assert.match(prompt,/assessment steps and their reasons/);
  const texts=[['Answer','Most of the amylase in your body is made by your pancreas and salivary (spit) glands.'],['Explanation',"But having too much amylase may be a sign of a disorder of the pancreas or salivary glands or another medical condition."],['Practical next steps','If your provider suspects you have pancreatitis, they may order a lipase blood test, along with an amylase blood test.']];
  return{status:'answered',sentences:texts.map(([section,text])=>({topic:0,section,text,evidence:[{source_id:sources[0].id,quote:text}]}))};
 }});
 const body=await(await answer.POST(new Request('https://app.test/api/answer',{method:'POST',headers:{host:'app.test',origin:'https://app.test'},body:JSON.stringify({question:'what i can give for a client with high amylase'})}))).json();
 assert.equal(body.status,'answered');assert.equal(body.sentences.length,3);assert.equal(body.citations[0].collection,'clinical_guidance');assert.deepEqual(stages,['search_plan','library_answer','evidence_check']);
 stages=[];const followup=await(await answer.POST(new Request('https://app.test/api/answer',{method:'POST',headers:{host:'app.test',origin:'https://app.test'},body:JSON.stringify({question})}))).json();assert.equal(followup.status,'clarification');assert.match(followup.clarification.question,/numeric result/);assert.deepEqual(stages,[]);
 console.log('PASS standalone lab reply, scoped NIH excerpts, bounded PubMed merge, source reopening and reserved-ID rejection; zero network/AI.');
})().catch(e=>{console.error(e);process.exitCode=1});
