// Entire sequence uses the real preflight and frontend with local fixtures only.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
globalThis.fetch=async()=>{throw Error('Network prohibited: no API quota may be used')};
function load(file,bindings={}){const m={exports:{}};new Function('exports','require','module',...Object.keys(bindings),ts.transpileModule(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,require,m,...Object.values(bindings));return m.exports}
const r=load('lib/retrieval.ts');
const root="My patient isn't getting results on keto. What can we do?";
let context,transcript=[];
function turn(reply){const merged=r.mergeQuestion(reply,context),result=r.clarificationFor(merged,context?.question||reply,undefined,context);transcript.push({user:reply,question:result?.clarification.question||'(ready for library retrieval; no AI invoked)',context:context});if(result)context=result.clarification.context;return result;}
assert.match(turn(root).clarification.question,/outcome/i);
assert.match(turn('Blood sugar, three months.').clarification.question,/fasting.*HbA1c/);
assert.match(turn('Fasting. On insulin.').clarification.question,/trend/i);
assert.match(turn('Unchanged').clarification.question,/known condition/i);
assert.equal(turn('Type 2'),null);
assert.equal(turn('Why would that help?'),null);
context={...context,activeGoal:'cholesterol'};
assert.match(turn('What about cholesterol?').clarification.question,/lipid measure/i);
assert.match(turn('LDL').clarification.question,/trend/i);
assert.equal(turn('Rising'),null);
assert.ok(context.patientReplies.some(x=>/insulin/i.test(x.reply)));
assert.ok(context.patientReplies.some(x=>/three months/i.test(x.reply)));
assert.equal(turn('Why would that help?'),null);
// Unknown values are retained as unknown rather than invented or asked forever.
context=undefined;turn(root);turn('Blood sugar');turn('Three months');turn('HbA1c');turn('Not sure');turn('Unknown');
assert.equal(turn('Medication details unknown'),null);
// Real route: clarification exits before AI or retrieval. Ready cases deliberately
// stop at the disabled-provider gate; they do not validate generated medical prose.
(async()=>{let modelCalls=0,retrievals=0;const guard=load('lib/guard.ts'),g=load('lib/grounded.ts'),d=load('lib/discussion.ts',guard);
const route=load('app/api/answer/route.ts',{...r,...g,...guard,...d,allowed:async()=>true,sessionKey:async()=>'offline',json:(v,status=200)=>Response.json(v,{status}),query:async sql=>sql.includes('RETURNING id')?[{id:1}]:[],parseSemantic:()=>undefined,aiConfigured:()=>false,structured:async()=>{modelCalls++;throw Error('AI prohibited')},retrieveTopics:async()=>{retrievals++;throw Error('Network prohibited')}});
for(const t of transcript){const response=await route.POST(new Request('https://test.local/api/answer',{method:'POST',headers:{host:'test.local',origin:'https://test.local'},body:JSON.stringify({question:t.user,...(t.context?{clarification:t.context}:{})})}));const body=await response.json();if(t.question.startsWith('(ready'))assert.equal(response.status,503);else assert.equal(body.clarification?.question,t.question);}
assert.equal(modelCalls,0);assert.equal(retrievals,0);
fs.writeFileSync('.sites-runtime/doctor-conversation-offline-proof.json',JSON.stringify({checkedAt:new Date().toISOString(),modelCalls,retrievals,networkDisabled:true,transcript},null,2));
console.log('PASS doctor case: keto → glucose/duration → fasting/insulin → trend → condition → why → cholesterol → LDL/trend → why; unknowns; real route: zero model/retrieval/network calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
