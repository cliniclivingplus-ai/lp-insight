const ts=require('typescript');
const retrievalModule={exports:{}};new Function('exports','require','module',ts.transpileModule(require('fs').readFileSync('lib/retrieval.ts','utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(retrievalModule.exports,require,retrievalModule);
const policy=retrievalModule.exports;
const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{constructor(tag='div'){this.tag=tag;this.children=[];this.open=false;this.value='';this._text=''}set textContent(value){this._text=value;this.children=[]}get childElementCount(){return this.children.filter(c=>c.tag!=='text').length}get textContent(){return this._text+this.children.map(c=>c.textContent).join('')}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this._text='';this.children=nodes}setAttribute(name,value){this[name]=value}querySelector(selector){if(selector.includes('button'))return this.button||(this.button=new Element('button'));return walk(this).find(n=>n.tag===selector)||null}showModal(){this.open=true}scrollIntoView(){}focus(){}click(){return this.onclick?.()}}
function walk(root){return root.children.flatMap(c=>[c,...walk(c)])}
const ids=new Map(),$=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)},nav=new Element('button');
const document={body:{classList:{toggle:()=>true,remove:()=>{}}},getElementById:$,createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('text');n.textContent=text;return n},querySelector:selector=>selector.includes('data-view')?nav:new Element()};
let serial=0,requests=[],records=new Map();const source={id:1,document_id:5,title:'Sleep source',collection:'books',content:'Consistent sleep timing supports sleep.',start_line:1,end_line:2};
const answer={mode:'starting_point',next_questions:['Which meal options fit your routine?'],status:'answered',topics:['Sleep'],sentences:[{topic:0,section:'Answer',text:'Sleep timing matters.',evidence:[{source_id:1,quote:source.content}]},{topic:0,section:'Practical next steps',text:'Keep consistent sleep timing.',evidence:[{source_id:1,quote:source.content}]}],citations:[source],message:'Checked'};
const location={pathname:'/',hash:''},history={replaceState:(_a,_b,url)=>{location.hash=url.includes('#')?'#'+url.split('#')[1]:''}};
const fetch=async(path,options={})=>{const body=options.body?JSON.parse(options.body):null;let result,status=200;if(path==='/api/account')result={user:{name:'Alice',email:'alice@example.test'}};
else if(path.startsWith('/api/source'))result=source;
else if(path==='/api/chats'&&options.method==='POST'){const id=(++serial).toString(16).padStart(8,'0')+'-1111-1111-1111-111111111111';records.set(id,{id,title:'New conversation',revision:0,turns:[]});result={id,revision:0}}
else if(path==='/api/chats'){result={chats:[...records.values()].map(({turns,...rest})=>rest)}}
else if(path.startsWith('/api/chats?id=')){const chat=records.get(new URL(path,'http://local').searchParams.get('id'));result={chat:{id:chat.id,title:chat.title,revision:chat.revision},turns:structuredClone(chat.turns),hasOlder:false}}
else if(path==='/api/answer'){requests.push(body);const chat=records.get(body.chatId);assert.equal(body.chatRevision,chat.revision);chat.revision++;chat.title=body.question;const merged=policy.mergeQuestion(body.question,body.clarification);const next=policy.clarificationFor(merged,body.clarification?.question||body.question,undefined,body.clarification)||answer;const stored=structuredClone(next);if(stored.citations[0])delete stored.citations[0].content;chat.turns.push({question:body.question,result:stored,state:body.chatState,status:'complete',sequence:chat.revision});result={...structuredClone(next),savedTurn:{chatId:chat.id,revision:chat.revision,id:'test-turn'}}}
else throw Error('Unexpected mock request '+path);return{ok:status===200,status,json:async()=>structuredClone(result)}};
const context=vm.createContext({window:{lpQuestionVector:async()=>undefined},document,$,URL,Map,Set,view:()=>{},fetch,location,history,prompt:()=>null,confirm:()=>true});
const app=fs.readFileSync('public/app.js','utf8');vm.runInContext(app.slice(app.indexOf('function sourceLink')),context);vm.runInContext(fs.readFileSync('public/chats.js','utf8'),context);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

(async()=>{await flush();await flush();
 const root="My patient isn't getting results on keto. What can we do?";
 for(const [q,expected]of [[root,/outcome/],['Blood sugar, three months.',/fasting/],['Fasting. On insulin.',/trend/],['Unchanged',/known condition/],['Type 2',/Sleep timing/],['Why would that help?',/Sleep timing/],['What about cholesterol?',/lipid measure/],['LDL',/trend/],['Rising',/Sleep timing/],['Why would that help?',/Sleep timing/]]){
 await context.ask(q);assert.match($('messages').children.at(-1).textContent,expected,q);
 }
 const last=requests.at(-1);assert.equal(last.clarification.activeGoal,'cholesterol');assert.ok(last.clarification.question.includes('insulin'));assert.ok(last.clarification.question.includes('three months'));assert.ok(last.clarification.question.includes('Type 2'));assert.ok(last.clarification.question.includes('LDL'));
 const snap=context.window.lpConversation.snapshot();assert.ok(JSON.stringify(snap).length<8000);
 $('newChat').onclick();await flush();await $('savedChats').children[0].children[0].onclick();const restored=context.followupContext('Why would that help?');assert.equal(restored.activeGoal,'cholesterol');assert.ok(restored.question.includes('insulin'));assert.ok(restored.question.includes('Type 2'));
 assert.equal(context.followupContext('New patient: help with diet'),undefined);
 $('newChat').onclick();await flush();assert.equal(context.followupContext('Why would that help?'),undefined);
 console.log('PASS actual frontend + real clarification policy: complete doctor sequence, active goal switch, patient facts, saved reopen, bounded snapshot, new-chat reset. Answer/citation content is a local rendering fixture, not clinical validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
