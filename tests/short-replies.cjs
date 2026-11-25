// Offline regression matrix. A stray network/API call fails the test immediately.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
globalThis.fetch=async()=>{throw Error('Network disabled: short-reply tests must not use API quota')};
function load(file,bindings={}){const m={exports:{}};new Function('exports','require','module',...Object.keys(bindings),ts.transpileModule(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,require,m,...Object.values(bindings));return m.exports}
const r=load('lib/retrieval.ts'),g=load('lib/grounded.ts'),guard=load('lib/guard.ts'),d=load('lib/discussion.ts',guard);
const ambiguous=[
 ['Make a sleep plan','What makes the routine difficult?','caffeine'],
 ['Help with weight management','What does a typical day of meals and physical activity look like?','walking'],
 ['Help with protein','What practical limits should we consider?','budget'],
 ['Improve sleep','What makes the routine difficult?','stress'],
 ['Discuss gut health','What would you like to change?','yes'],
 ['Discuss cholesterol','','yes'],
 ['Help with blood pressure','What has the pattern been?','5'],
 ['Plan meals','What practical limits should we consider?','time'],
 ['Explain inflammation','','not sure'],
 ['Explain a library topic','','no'],
 ['Plan physical activity','What physical activity do you do?','walking'],
 ['Discuss a general topic','What amount and at what times?','coffee'],
 ['Discuss a general topic','What times does this happen?','10 to 6'],
 ['Plan food options','Do you have any food allergies?','yes'],
 ['Explain a source','','something'],
];
const useful=[
 ['Discuss activity','What physical activity do you do?','none'],
 ['Discuss timing','At what times does this happen?','late nights'],
 ['Discuss frequency','How often does this happen?','rarely'],
 ['Plan meals','What budget or price range and currency should the answer take into account?','100 rupees'],
 ['Plan meals','How much time is available, and for which activity?','20 minutes'],
 ['Discuss activity','What physical activity do you do?','sedentary'],
 ['Plan protein meals','Which foods do you prefer?','lentils'],
 ['Plan meals','Do you have food allergies?','no'],
 ['Plan meals','How many meals would you like?','2'],
 ['Discuss sleep','When is your last drink?','2pm'],
 ['Discuss sleep','How much do you drink?','2 cups'],
 ['Discuss protein','Is this for muscle gain?','yes'],
 ['Discuss a document','Which language do you prefer?','English'],
 ['Discuss a document','Which format?','table'],
 ['Discuss diabetes','Which condition is being managed?','Type 2'],
 ['Discuss diet','Which outcome?','Weight loss'],
 ['Discuss diabetes','General information or a known condition?','General information only'],
 ['Discuss sleep','For about how long each time?','20 minutes'],
 ['Discuss sleep','How often does this happen?','daily'],
 ['Explain a source','','Why?'],
 ['Plan meals','What is a usual day like?','I eat beans and walk regularly.'],
];
function preflight(root,prompt,reply,meta={}){return r.shortReplyClarification(root+'\nClarification: '+(prompt?prompt+' My response: ':'')+reply,root,{question:root,prompt,...meta})}
for(const [root,prompt,reply]of ambiguous){const v=preflight(root,prompt,reply);assert.equal(v?.status,'clarification',JSON.stringify({root,prompt,reply}));assert.equal(v.sentences.length,0);assert.equal(v.citations.length,0);assert.ok(v.clarification.question);assert.ok(v.clarification.context.question.startsWith(root));}
for(const [root,prompt,reply]of useful)assert.equal(preflight(root,prompt,reply),null,JSON.stringify({root,prompt,reply}));
// Finish one missing field, then ask the next; a clock time never fills an amount.
let root='Help with my sleep',v=preflight(root,'What amount do you drink and at what times?','coffee');assert.equal(v.clarification.context.pendingQuestions.length,2);
let meta=v.clarification.context;v=preflight(meta.question,meta.prompt,'2pm',meta);assert.match(v.clarification.question,/amount|quantity/i);assert.ok(!v.clarification.question.includes('times'));assert.ok(v.clarification.context.question.includes('coffee'));assert.ok(v.clarification.context.question.includes('2pm'));
meta=v.clarification.context;assert.equal(preflight(meta.question,meta.prompt,'2 cups',meta),null);
// An answer to a different question cannot complete this field.
assert.ok(preflight(root,'What amount do you drink?','coffee',{replies:[{prompt:'How long do you walk?',reply:'20 minutes'}]}));
(async()=>{let modelCalls=0,retrievals=0;const route=load('app/api/answer/route.ts',{...r,...g,...guard,...d,allowed:async()=>true,sessionKey:async()=>'offline',json:(v,status=200)=>Response.json(v,{status}),query:async sql=>sql.includes('RETURNING id')?[{id:1}]:[],parseSemantic:()=>undefined,aiConfigured:()=>true,structured:async()=>{modelCalls++;throw Error('AI calls prohibited')},retrieveTopics:async()=>{retrievals++;throw Error('Retrieval must not run for incomplete replies')}});
for(const [root,prompt,reply]of ambiguous){const response=await route.POST(new Request('https://test.local/api/answer',{method:'POST',headers:{host:'test.local',origin:'https://test.local'},body:JSON.stringify({question:prompt?prompt+' My response: '+reply:reply,clarification:{question:root,prompt}})}));const body=await response.json();assert.equal(response.status,200);assert.equal(body.status,'clarification');}
assert.equal(modelCalls,0);assert.equal(retrievals,0);fs.mkdirSync('.sites-runtime',{recursive:true});fs.writeFileSync('.sites-runtime/short-reply-offline-proof.json',JSON.stringify({checkedAt:new Date().toISOString(),matrixCases:ambiguous.length+useful.length,realRouteClarificationCases:ambiguous.length,modelCalls,retrievals,networkDisabled:true,missingFieldChainPassed:true,crossFieldIsolationPassed:true},null,2));console.log('PASS 36 cross-topic short-reply cases, missing-field chain, cross-field isolation and 15 real-route preflights: zero network, model or retrieval calls.');})().catch(e=>{console.error(e);process.exitCode=1});
