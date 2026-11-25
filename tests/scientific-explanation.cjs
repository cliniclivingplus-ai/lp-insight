// Synthetic evidence fixtures test route plumbing, not clinical truth or model quality.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
globalThis.fetch=async()=>{throw Error('Network disabled: no AI quota allowed')};
function load(file,bindings={}){const m={exports:{}};new Function('exports','require','module',...Object.keys(bindings),ts.transpileModule(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,require,m,...Object.values(bindings));return m.exports}
const r=load('lib/retrieval.ts',{...load('lib/clinical-guidance.ts'),medlineForTopics:async()=>({sources:[],status:'disabled'})}),g=load('lib/grounded.ts'),guard=load('lib/guard.ts'),d=load('lib/discussion.ts',guard);
const topics=[{question:'Sleep regularity',queries:['sleep regularity','sleep timing','sleep habits','regular sleep']}];
const original=JSON.stringify(topics),enriched=r.scientificSearchTopics(topics);assert.equal(JSON.stringify(topics),original);assert.equal(r.scientificSearchTopics(topics,false),topics);assert.equal(enriched[0].queries.length,6);assert.deepEqual(enriched[0].queries.slice(0,4),topics[0].queries);assert.ok(enriched[0].queries.includes('sleep regularity mechanism'));assert.ok(enriched[0].queries.includes('sleep regularity study'));
const fixture=[
 ['Answer','A study in adults reported longer sleep.'],
 ['Explanation','The study measured sleep duration.'],
 ['Explanation','The passage describes a proposed mechanism.'],
 ['Limitations','The study did not establish the proposed mechanism.'],
 ['Practical next steps','Keep regular sleep times.'],
];
async function run(thin=false){let calls=[],retrieved=[],checked=[],prompts=[];
const rows=fixture.map(([section,text],i)=>({id:i+1,document_id:'fixture-'+i,title:'Synthetic fixture',collection:'books',content:text}));
const route=load('app/api/answer/route.ts',{...r,...g,...guard,...d,allowed:async()=>true,sessionKey:async()=>'offline',json:(v,status=200)=>Response.json(v,{status}),query:async sql=>sql.includes('RETURNING id')?[{id:1}]:[],parseSemantic:()=>undefined,aiConfigured:()=>true,aiProvider:()=> 'offline-fixture',retrieveTopics:async topics=>{retrieved.push(topics);return thin?[rows[0],rows[3]]:rows},structured:async(prompt,input,schema,stage)=>{
 calls.push(stage);prompts.push(prompt);
 if(stage==='search_plan'){assert.match(prompt,/physiological process/);return{question:input.question,answer_style:'summary',personal_medical:false,clarification_kind:'none',topics};}
 if(stage==='evidence_check'){assert.match(prompt,/outcome-only quote cannot support/i);assert.match(prompt,/plant-based recommendation restriction/);checked=input.sentences;return{answers_request:true,relevant:true,covered_topics:[0],checks:input.sentences.map((s,index)=>({index,supported:!s.text.includes('caused longer sleep')}))};}
 assert.match(prompt,/SCIENTIFIC EXPLANATION/);assert.match(prompt,/Connection to your question/);assert.match(prompt,/not a slogan/);assert.match(prompt,/Do not inject nutrition/);assert.match(prompt,/mandatory plant-based policy/);
 const selected=thin?[fixture[0],fixture[3]]:fixture;
 const sentences=selected.map(([section,text])=>({topic:0,section,text,evidence:[{source_id:rows.find(r=>r.content===text).id,quote:text}]}));
 if(!thin){sentences.push({topic:0,section:'Explanation',text:'The proposed mechanism caused longer sleep.',evidence:[{source_id:1,quote:rows[0].content}]});sentences.push({topic:0,section:'Practical next steps',text:'Eat fish daily.',evidence:[{source_id:1,quote:rows[0].content}]});}
 return{status:'answered',sentences};
 }});
 const response=await route.POST(new Request('https://test.local/api/answer',{method:'POST',headers:{origin:'https://test.local',host:'test.local'},body:JSON.stringify({question:'Why does sleep regularity help? Explain the scientific evidence.'})}));
 const body=await response.json();assert.equal(body.status,'answered');assert.deepEqual(calls,['search_plan','library_answer','evidence_check']);assert.ok(retrieved[0][0].queries.includes('sleep regularity mechanism'));assert.ok(!body.sentences.some(s=>/caused|fish|plant-based/i.test(s.text)));assert.ok(body.sentences.every(s=>s.evidence.length&&body.citations.some(c=>c.id===s.evidence[0].source_id)));
 if(!thin){assert.ok(checked.some(s=>s.text.includes('caused longer sleep')),'independent checker must see the unproven causal claim');assert.ok(!checked.some(s=>s.text.includes('fish')),'plant policy runs even without the label');assert.equal(body.sentences.length,5);}else{assert.equal(body.explanation_limited,true);assert.match(body.message,/limited explanation could be verified/);assert.equal(body.sentences.length,2);assert.ok(!body.sentences.some(s=>s.section==='Explanation'));}
 return{thinEvidence:thin,kept:body.sentences.length,mockedStages:calls,networkCalls:0};
}
(async()=>{const results=[await run(),await run(true)];fs.writeFileSync('.sites-runtime/scientific-explanation-offline-proof.json',JSON.stringify({checkedAt:new Date().toISOString(),networkDisabled:true,realModelCalls:0,results,limits:'Synthetic fixtures verify instructions, retrieval expansion, filtering and citations; they do not verify live model reasoning or library retrieval quality.'},null,2));console.log('PASS scientific retrieval, evidence/limitations wiring, rejected causal leap, silent plant policy, sparse evidence and citations: zero network or real AI calls.');})().catch(e=>{console.error(e);process.exitCode=1});
