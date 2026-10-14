const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,query=async()=>[]){const source=fs.readFileSync(path,'utf8').replace("import {query} from './turso';",'');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const target={exports:{}};new Function('exports','require','module','query',output)(target.exports,require,target,query);return target.exports}
const g=load('lib/grounded.ts'),r=load('lib/retrieval.ts');
const source={id:1,content:'Whole grains contain dietary fiber\nand other nutrients.'};
const good={topic:0,section:'Answer',text:'Whole grains contain dietary fiber.',evidence:[{source_id:1,quote:'Whole grains contain dietary fiber'}]};
const bad={...good,text:'Whole grains cure diabetes.',evidence:[{source_id:1,quote:'Whole grains cure diabetes'}]};
const draft={status:'answered',sentences:[good,bad]};
assert.equal(g.validSentences(draft,[source]).length,1);
assert.equal(g.validSentences({status:'answered',sentences:[{...good,evidence:[{source_id:999,quote:good.evidence[0].quote}]}]},[source]).length,0);
assert.equal(g.exactQuote(source.content,'Whole grains contain dietary fiber and other nutrients.'),source.content);
assert.equal(g.exactQuote(source.content,'Whole grains cure diabetes'),null);
const two={sentences:[good,{...good,text:'Other claim.'}]};
assert.equal(g.supportedSentences(two,{relevant:true,checks:[{index:0,supported:true},{index:1,supported:false}]}).length,1);
assert.equal(g.supportedSentences(two,{relevant:true,checks:[{index:0,supported:true},{index:0,supported:true}]}).length,0);
assert.equal(g.supportedSentences(two,{relevant:false,checks:[{index:0,supported:true},{index:1,supported:true}]}).length,0);
assert.equal(g.supportedSentences(two,{relevant:true,checks:[]}).length,0);
assert.equal(r.ftsQuery('sleep OR "ignore"; --'), '"sleep"* AND "or"* AND "ignore"*');
assert.throws(()=>r.cleanPlan({question:'x',topics:[]},'x'));
const planned=r.cleanPlan({question:'weight fluctuation',topics:[{question:'vegan weight management',queries:['weight cycling','weight management','weight cycling']}]},'weightloss flactuation');assert.equal(planned.topics[0].queries.length,2);
(async()=>{let calls=0;const retrieval=load('lib/retrieval.ts',async(sql,args)=>{calls++;if(sql.includes('bm25'))return[{...source,document_id:'doc',document_version:1,title:'Fiber',content:source.content.repeat(4)}];return []});assert.equal((await retrieval.retrieveTopics([{question:'gut',queries:['fiber','microbiome']}])).length,1);assert.equal(calls,3);console.log('Passed evidence filtering, unknown/altered citations, whitespace, partial support, malformed verification, safe query syntax, plan bounds and retrieval deduplication');})().catch(e=>{console.error(e);process.exitCode=1});
if(process.env.LP_TEST_CORPUS){const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.env.LP_TEST_CORPUS,{readOnly:true});const corpus=load('lib/retrieval.ts',async(sql,args)=>db.prepare(sql.replaceAll('lp_search','search_index').replaceAll('lp_chunks','chunks').replaceAll('lp_documents','documents')).all(...args));(async()=>{for(const [name,queries] of [['sleep',['sleep quality','circadian','caffeine sleep']],['gut',['gut microbiome','dietary fiber','intestinal bacteria']],['protein',['protein muscle','sarcopenia','aging protein']],['vegan weight',['weight cycling','vegan weight','plant based weight']]]){const sources=await corpus.retrieveTopics([{question:name,queries}]);assert.ok(sources.length>0,name);assert.ok(sources.some(c=>queries.some(q=>q.split(' ').every(t=>c.content.toLowerCase().includes(t)))),name);console.log(name+': '+sources.length+' stored passages retrieved')};db.close()})().catch(e=>{console.error(e);process.exitCode=1})}
