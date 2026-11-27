const $=id=>document.getElementById(id);let docs=[];let db;const stop=new Set('the a an and or to of in on for is are what how does do about from find passages explain me tell my library knowledge please'.split(' '));

function words(s){return (s.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>1&&!stop.has(w))}

function chunk(text){const lines=text.replace(/\r/g,'').split('\n');let heading='Document',buffer=[],start=1,result=[];function flush(){if(buffer.join('\n').trim())result.push({text:buffer.join('\n').trim(),heading,line:start});buffer=[]}lines.forEach((line,i)=>{if(/^#{1,6}\s/.test(line)){flush();heading=line.replace(/^#+\s*/,'');start=i+1}if(!buffer.length)start=i+1;buffer.push(line);if(buffer.join('\n').length>2200){flush();start=i+2}});flush();return result}

function view(name){$('chatView').hidden=name!=='chat';$('libraryView').hidden=name!=='library';if($('researchView'))$('researchView').hidden=name!=='research';document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('viewTitle').textContent=name==='chat'?'Ask your library':'Source library'}

function openSource(doc,c){$('sourceTitle').textContent=doc.name;$('sourceLocation').textContent=c?`${c.heading} · line ${c.line}`:doc.path;$('sourceText').textContent=c?c.text:doc.text;$('sourceDialog').showModal()}

function update(){ $('count').textContent=docs.length;$('readyCount').textContent=`${docs.length} sources ready`;$('emptyHint').hidden=docs.length>0;const list=$('libraryList');list.replaceChildren();let filter=$('filter').value.toLowerCase();docs.filter(d=>d.name.toLowerCase().includes(filter)).forEach(d=>{let row=document.createElement('div');row.className='file-row';let info=document.createElement('div');let title=document.createElement('strong');title.textContent=d.name;let sub=document.createElement('small');sub.textContent=`${d.chunks.length} passages · ${Math.ceil(d.text.length/1024)} KB · ${d.path}`;info.append(title,sub);let b=document.createElement('button');b.textContent='View source';b.onclick=()=>openSource(d);row.append(info,b);list.append(row)});if(!docs.length){let p=document.createElement('p');p.className='muted';p.textContent='Your library is empty. Add your own files to begin.';list.append(p)}}

function save(){return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');const store=tx.objectStore('documents');store.clear();docs.forEach(d=>store.put(d));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

async function importFiles(files){view('library');let added=0,skipped=0,failed=0;$('importStatus').textContent='Reading Markdown files…';for(const file of files){if(!/\.(md|markdown)$/i.test(file.name)){skipped++;continue}try{let text=await file.text();if(!text.trim()){skipped++;continue}let path=file.webkitRelativePath||file.name;let existing=docs.find(d=>d.path===path);if(existing?.text===text){skipped++;continue}let d={id:path,name:file.name,path,text,chunks:chunk(text)};if(existing)docs[docs.indexOf(existing)]=d;else docs.push(d);added++}catch{failed++}}try{await save();$('importStatus').textContent=`${added} added or updated · ${skipped} unchanged, empty, or unsupported · ${failed} failed.`}catch{$('importStatus').textContent='Browser storage could not save these files. They remain available for this session; try a smaller sample.'}update()}

function search(question){let terms=[...new Set(words(question))];if(!terms.length)return[];let all=docs.flatMap(d=>d.chunks.map(c=>({d,c,tokens:words(c.text+' '+c.heading)})));let freq=new Map(terms.map(t=>[t,all.filter(x=>x.tokens.includes(t)).length]));return all.map(x=>{let set=new Set(x.tokens);let matched=terms.filter(t=>set.has(t));let score=matched.reduce((s,t)=>s+Math.log(1+all.length/(1+freq.get(t))),0);return{...x,score,coverage:matched.length/terms.length}}).filter(x=>x.score>0&&x.coverage>=0.6).sort((a,b)=>b.score-a.score).slice(0,5)}

function ask(q){view('chat');$('welcome').hidden=true;let user=document.createElement('div');user.className='message user';user.textContent=q;let answer=document.createElement('div');answer.className='message';let label=document.createElement('div');label.className='answer-label';label.textContent='LP Insight';answer.append(label);let hits=search(q);let intro=document.createElement('p');intro.textContent=!docs.length?'Your library is empty. Add Markdown files to search your sources.':!hits.length?"I couldn’t find sufficiently matching passages in the imported files. Try a more specific question or add more sources.":'These passages match your question. They are exact source excerpts, not a generated or verified clinical answer.';answer.append(intro);hits.forEach((x,i)=>{let block=document.createElement('div');block.className='evidence';let p=document.createElement('p');p.textContent=x.c.text;let cite=document.createElement('button');cite.className='citation';cite.textContent=`[${i+1}] ${x.d.name} · ${x.c.heading} · line ${x.c.line}`;cite.onclick=()=>openSource(x.d,x.c);block.append(p,cite);answer.append(block)});$('messages').append(user,answer);$('question').value='';answer.scrollIntoView({behavior:'smooth',block:'start'})}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('newChat').onclick=()=>{view('chat');$('messages').replaceChildren();$('welcome').hidden=false;$('question').focus()};$('importTop').onclick=()=>view('library');$('choose').onclick=()=>$('files').click();$('chooseFolder').onclick=()=>$('folder').click();['files','folder'].forEach(id=>$(id).onchange=async e=>{await importFiles([...e.target.files]);e.target.value=''});$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();importFiles([...e.dataTransfer.files])};$('filter').oninput=update;$('clear').onclick=async()=>{if(!docs.length||!confirm('Remove all imported documents from this browser?'))return;docs=[];await save();update()};$('closeDialog').onclick=()=>$('sourceDialog').close();$('askForm').onsubmit=e=>{e.preventDefault();let q=$('question').value.trim();if(q)ask(q)};$('question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('askForm').requestSubmit()}};document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{if(!docs.length)view('library');else{$('question').value=b.dataset.q;$('question').focus()}});

const request=indexedDB.open('lp-insight-library',1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});request.onsuccess=()=>{db=request.result;const r=db.transaction('documents').objectStore('documents').getAll();r.onsuccess=()=>{docs=r.result;update()}};request.onerror=()=>{$('importStatus').textContent='Persistent browser storage is unavailable. Imports will be session-only.'};update();

// Shared Turso library: all database access remains on the authenticated server.

let cloudStats=null;let libraryTimer;

function showCloudSource(c){$('sourceTitle').textContent=c.title;$('sourceLocation').textContent=[c.heading,c.page!==null?'Page '+c.page:null,'Lines '+c.start_line+'–'+c.end_line,c.source_url].filter(Boolean).join(' · ');$('sourceText').textContent=c.content;$('sourceDialog').showModal()}

let activeLibraryCat='all';
const CAT_LABELS={books:'Book / PDF',videos:'YouTube Video',nutritionfacts:'NutritionFacts',pcrm:'PCRM Website'};
function closeLibraryReader(){
 const reader=$('libraryReader'),browse=$('libraryBrowse');
 if(reader)reader.hidden=true;
 if(browse)browse.hidden=false;
}
async function openLibraryDoc(docId,page=1){
 const reader=$('libraryReader'),browse=$('libraryBrowse');
 if(browse)browse.hidden=true;
 if(reader){reader.hidden=false;reader.innerHTML='<div class="reader-loading">Loading document…</div>';}
 $('libraryView').scrollTop=0;
 try{
  const r=await fetch('/api/library?doc='+encodeURIComponent(docId)+'&page='+page);
  if(!r.ok)throw Error();
  const data=await r.json();
  const doc=data.document;
  reader.replaceChildren();

  const topBar=document.createElement('div');topBar.className='reader-topbar';
  const backBtn=document.createElement('button');backBtn.type='button';backBtn.className='reader-back';backBtn.textContent='← Back to Library';backBtn.onclick=closeLibraryReader;
  topBar.append(backBtn);
  if(doc.source_url){
   const ext=document.createElement('a');ext.href=doc.source_url;ext.target='_blank';ext.rel='noopener noreferrer';
   ext.className=doc.collection==='videos'?'reader-yt-btn':'reader-ext-btn';
   ext.textContent=doc.collection==='videos'?'▶ Watch on YouTube ↗':'Open original source ↗';
   topBar.append(ext);
  }
  reader.append(topBar);

  const head=document.createElement('div');head.className='reader-head';
  const catBadge=document.createElement('span');catBadge.className='reader-cat';catBadge.textContent=CAT_LABELS[doc.collection]||doc.collection;
  const h1=document.createElement('h1');h1.textContent=doc.title;
  const meta=document.createElement('p');meta.className='muted';meta.textContent=[data.total+' passages','Page '+data.page+' of '+data.totalPages].join(' · ');
  head.append(catBadge,h1,meta);
  reader.append(head);

  const body=document.createElement('div');body.className='reader-body';
  if(!data.passages.length){
   const empty=document.createElement('p');empty.className='muted';empty.textContent='No readable text passages were found in this document.';body.append(empty);
  }else{
   for(const p of data.passages){
    const sec=document.createElement('section');sec.className='reader-section';
    const hdr=[p.heading,p.page!=null?'Page '+p.page:null].filter(Boolean).join(' · ');
    if(hdr){const h=document.createElement('h3');h.textContent=hdr;sec.append(h)}
    for(const para of String(p.content||'').trim().split(/\n{2,}/)){
     const clean=para.replace(/\n+/g,' ').trim();
     if(!clean)continue;
     const el=document.createElement('p');el.textContent=clean;sec.append(el);
    }
    body.append(sec);
   }
  }
  reader.append(body);

  if(data.totalPages>1){
   const pager=document.createElement('div');pager.className='reader-pager';
   const prev=document.createElement('button');prev.type='button';prev.textContent='← Previous Page';prev.disabled=data.page<=1;prev.onclick=()=>openLibraryDoc(docId,data.page-1);
   const info=document.createElement('span');info.className='muted';info.textContent='Page '+data.page+' of '+data.totalPages;
   const next=document.createElement('button');next.type='button';next.textContent='Next Page →';next.disabled=data.page>=data.totalPages;next.onclick=()=>openLibraryDoc(docId,data.page+1);
   pager.append(prev,info,next);reader.append(pager);
  }
 }catch{
  reader.innerHTML='<div class="reader-topbar"><button type="button" class="reader-back" onclick="closeLibraryReader()">← Back to Library</button></div><p class="muted">Could not load this document. Please retry.</p>';
 }
}
async function cloudLibrary(){
 closeLibraryReader();
 const list=$('libraryList');list.textContent='Loading shared sources…';
 try{
  const response=await fetch('/api/library?collection='+encodeURIComponent(activeLibraryCat)+'&q='+encodeURIComponent($('filter').value));
  if(!response.ok)throw Error();
  const data=await response.json();
  if(data.counts&&$('libraryCats')){
   const labels={all:'All',books:'Books & PDFs',videos:'YouTube Videos',nutritionfacts:'NutritionFacts',pcrm:'PCRM Website'};
   for(const btn of $('libraryCats').querySelectorAll('.lib-cat')){
    const k=btn.dataset.cat;
    btn.classList.toggle('active',k===activeLibraryCat);
    if(typeof data.counts[k]==='number')btn.textContent=labels[k]+' ('+data.counts[k].toLocaleString()+')';
    if(!btn._wired){btn._wired=true;btn.onclick=()=>{activeLibraryCat=k;cloudLibrary();};}
   }
  }
  list.replaceChildren();
  for(const d of data.documents){
   const row=document.createElement('div');row.className='file-row';
   const info=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small');
   const badge=document.createElement('span');badge.className='lib-badge';badge.textContent=CAT_LABELS[d.collection]||d.collection;
   title.textContent=d.title;
   sub.append(badge,document.createTextNode(' '+(d.passage_count?d.passage_count+' passages':'No text')));
   info.append(title,sub);
   const actions=document.createElement('div');actions.className='file-actions';
   if(d.collection==='videos'&&d.source_url){
    const yt=document.createElement('a');yt.href=d.source_url;yt.target='_blank';yt.rel='noopener noreferrer';yt.className='yt-pill';yt.textContent='▶ YouTube ↗';
    actions.append(yt);
   }
   const button=document.createElement('button');button.textContent='Read';button.disabled=!d.passage_count;button.onclick=()=>openLibraryDoc(d.id,1);
   actions.append(button);
   row.append(info,actions);list.append(row);
  }
  if(!data.documents.length)list.textContent='No sources match this filter.';
  $('importStatus').textContent='Showing up to 60 matching sources. Use search or categories to browse.';
 }catch{list.textContent='Shared library unavailable. Refresh or sign in again.'}
}

const localUpdate=update;update=function(){if(!cloudStats){localUpdate();return}$('count').textContent=cloudStats.documents.toLocaleString();$('readyCount').textContent=cloudStats.documents.toLocaleString()+' shared sources';$('emptyHint').hidden=true};

ask=async function(q){view('chat');$('welcome').hidden=true;const user=document.createElement('div');user.className='message user';user.textContent=q;const answer=document.createElement('div');answer.className='message';answer.textContent='Searching your shared library…';$('messages').append(user,answer);$('question').value='';try{const response=await fetch('/api/search?q='+encodeURIComponent(q));if(!response.ok)throw Error();const result=await response.json();const goal=selectedGoal(q)||(context?conversationContext?.goal:undefined);

 const changedGoal=!!selectedGoal(q);const scopeReply=!!clarificationContext&&/\nClarification: Blood sugar\b/i.test(context?.question||'')&&!changedGoal&&!/^(?:why|how|what)\b/i.test(q);

 const scope=(/^General information only$/i.test(q)||scopeReply)?q.slice(0,500):(context&&!changedGoal?conversationContext?.scope:undefined);

 conversationContext={root,goal,scope,patientReplies:context?.patientReplies||[],reference:context&&!changedGoal?conversationContext?.reference:undefined,replies:context&&!changedGoal?context.replies||[]:[],pendingQuestions:[]};

 if(result.status==='answered')conversationContext.reference=(result.sentences||[]).filter(s=>s.section==='Practical next steps').map(s=>s.text).join(' ').slice(0,900)||conversationContext.reference;

 answer.replaceChildren();const label=document.createElement('div');label.className='answer-label';label.textContent='LP Insight';const intro=document.createElement('p');intro.textContent=result.citations.length?'Matching source passages are below. These are exact excerpts, not a validated clinical answer.':"I couldn’t find sufficiently matching passages. Try more specific terms; keyword search may miss differently worded evidence.";answer.append(label,intro);result.citations.forEach((c,i)=>{const block=document.createElement('div');block.className='evidence';const p=document.createElement('p');p.textContent=c.content;const cite=document.createElement('button');cite.className='citation';cite.textContent='['+(i+1)+'] '+c.title+' · '+(c.page!==null?'page '+c.page:'line '+c.start_line);cite.onclick=()=>showCloudSource(c);block.append(p,cite);answer.append(block)})}catch{answer.textContent='Search is unavailable. Please retry or refresh to sign in again.'}answer.scrollIntoView({behavior:'smooth',block:'start'})};

$('filter').oninput=()=>{clearTimeout(libraryTimer);libraryTimer=setTimeout(cloudLibrary,300)};document.querySelector('[data-view="library"]').onclick=()=>{view('library');cloudLibrary()};$('importTop').textContent='Browse sources';$('importTop').onclick=()=>{view('library');cloudLibrary()};$('clear').hidden=true;$('drop').replaceChildren();const notice=document.createElement('p');notice.textContent='Shared Turso library · Source material awaits review · Document updates are managed through the importer.';$('drop').append(notice);document.querySelector('.fine').textContent='Shared library · Keyword search · Exact excerpts · AI-written answers are not connected yet';document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('question').value=b.dataset.q;$('question').focus()});

fetch('/api/status').then(async r=>{if(!r.ok)throw Error();cloudStats=await r.json();update();cloudLibrary()}).catch(()=>{$('readyCount').textContent='Shared library unavailable';$('emptyHint').textContent='Refresh to reconnect to your shared library.'});

// Grounded answers: text nodes only; citation metadata comes from the database.

function sourceLink(c,parent){if(!c.source_url)return;try{const u=new URL(c.source_url);if(!['https:','http:'].includes(u.protocol))return;const a=document.createElement('a');a.href=c.source_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=c.collection==='videos'?'Open original video':'Open original source';parent.append(document.createTextNode(' · '),a)}catch{}}

showCloudSource=function(c,quotes){$('sourceTitle').textContent=c.title;const location=$('sourceLocation');location.textContent=c.collection==='pubmed'?[c.heading,c.journal,c.year,c.publication_types?.join(', '),c.copyright].filter(Boolean).join(' · '):[c.collection,c.heading,c.page!=null?'Page '+c.page:null,c.start_line!=null?'Lines '+c.start_line+'–'+c.end_line:null].filter(Boolean).join(' · ');sourceLink(c,location);const pre=$('sourceText');pre.replaceChildren();const ranges=(Array.isArray(quotes)?quotes:quotes?[quotes]:[]).map(q=>({at:c.content.indexOf(q),quote:q})).filter(r=>r.at>=0).sort((a,b)=>a.at-b.at);let offset=0;for(const r of ranges){if(r.at<offset)continue;pre.append(document.createTextNode(c.content.slice(offset,r.at)));const mark=document.createElement('mark');mark.textContent=r.quote;pre.append(mark);offset=r.at+r.quote.length}pre.append(document.createTextNode(c.content.slice(offset)));if(!$('sourceDialog').open)$('sourceDialog').showModal();if(ranges.length)pre.querySelector('mark').scrollIntoView({block:'center'})};

function showCloudSourceGroup(entries,index=0){

 const entry=entries[index];showCloudSource(entry.source,entry.quotes);

 if(entries.length<2)return;

 const label=document.createElement('label');label.append(document.createTextNode(' · Passage: '));

 const select=document.createElement('select');select.setAttribute('aria-label','Passage for '+entry.source.title);

 entries.forEach(({source:c},i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=(c.page!=null?'Page '+c.page+' · ':'')+'Lines '+c.start_line+'–'+c.end_line;select.append(option)});

 select.value=String(index);select.onchange=()=>showCloudSourceGroup(entries,Number(select.value));label.append(select);$('sourceLocation').append(label);

}

function citationGroups(evidence,sources){

 const groups=new Map();

 for(const e of evidence){const c=sources.get(e.source_id);if(!c)continue;const group=groups.get(c.document_id)||new Map();const entry=group.get(c.id)||{source:c,quotes:[]};if(!entry.quotes.includes(e.quote))entry.quotes.push(e.quote);group.set(c.id,entry);groups.set(c.document_id,group)}

 return [...groups.values()].map(group=>[...group.values()]);

}

function sourceKind(c){return c.collection==='medlineplus'?'MedlinePlus · Health-topic summary':c.collection==='clinical_guidance'?'NIH guidance · Selected excerpt':c.collection==='pubmed'?'PubMed · Abstract':c.collection==='videos'?'Video':c.collection==='books'?'Book':'Article'}

function renderSources(answer,citations,titleText='Sources',sentences=[]){

 if(!citations.length)return;

 const title=document.createElement('h3');title.className='sources-title';title.textContent=titleText;answer.append(title);

 const quotesFor=c=>sentences.flatMap(s=>s.evidence||[]).filter(e=>e.source_id===c.id).map(e=>e.quote);

 const entriesFor=g=>g.map(source=>({source,quotes:quotesFor(source)}));

 const groups=new Map();for(const c of citations){const g=groups.get(c.document_id)||[];g.push(c);groups.set(c.document_id,g)}

 const rows=[...groups.values()];const VISIBLE=3;const extra=[];

 rows.forEach((g,i)=>{

  const c=g[0];const p=document.createElement('p');p.className='source-row';

  const main=document.createElement('button');main.type='button';main.className='citation source-main';main.title=c.title;

  const num=document.createElement('span');num.className='source-num';num.textContent='['+(i+1)+'] ';

  const name=document.createElement('span');name.className='source-title';name.textContent=c.title;

  main.append(num,name);main.onclick=()=>showCloudSourceGroup(entriesFor(g));p.append(main);

  const meta=document.createElement('span');meta.className='source-meta';

  const tag=document.createElement('span');tag.className='source-tag';tag.textContent=sourceKind(c);meta.append(tag);

  if(g.length===1&&c.page!=null)meta.append(document.createTextNode(' p.'+c.page));

  p.append(meta);

  sourceLink(c,p);

  const a=p.querySelector('a');

  if(a){a.previousSibling?.remove();const label=c.collection==='videos'?'Open original video':'Open original source';a.className='source-open';a.textContent='↗';a.title=label;a.setAttribute('aria-label',label+': '+c.title)}

  if(g.length>1){const list=document.createElement('span');list.className='source-passages muted';list.append(document.createTextNode(g.length+' passages: '));g.forEach((x,j)=>{const pb=document.createElement('button');pb.className='citation';pb.textContent=(x.page!=null?'page '+x.page+' · ':'')+'lines '+x.start_line+'–'+x.end_line;pb.onclick=()=>showCloudSourceGroup(entriesFor(g),j);list.append(pb,document.createTextNode(' '))});p.append(list)}

  if(i>=VISIBLE){p.hidden=true;extra.push(p)}

  answer.append(p);

 });

 if(extra.length){

  const toggle=document.createElement('button');toggle.type='button';toggle.className='sources-toggle';

  const set=open=>{extra.forEach(p=>{p.hidden=!open});toggle.textContent=open?'Show fewer sources':'Show all '+rows.length+' sources';toggle.setAttribute('aria-expanded',String(open))};

  let open=false;set(false);toggle.onclick=()=>{open=!open;set(open)};answer.append(toggle);

 }

}

const answerSections=['Answer','Explanation','Connection to your question','Options and trade-offs','Practical next steps','Limitations'];

function orderAnswerSources(sentences,citations){

 const sources=new Map(citations.map(c=>[c.id,c])),order=[];

 for(const topic of [...new Set(sentences.map(s=>s.topic))])for(const section of answerSections)for(const sentence of sentences.filter(s=>s.topic===topic&&s.section===section))for(const evidence of sentence.evidence||[]){const source=sources.get(evidence.source_id);if(source&&!order.includes(source.document_id))order.push(source.document_id)}

 return [...citations].sort((a,b)=>order.indexOf(a.document_id)-order.indexOf(b.document_id));

}

// One document number is shared by inline citations and the Sources list.

function appendCitedSentence(parent,sentence,sources,docOrder){

 parent.append(document.createTextNode(sentence.text));

 for(const entries of citationGroups(sentence.evidence||[],sources)){

 const source=entries[0].source,index=docOrder.indexOf(source.document_id)+1;if(index<1)continue;

 const button=document.createElement('button');button.className='citation';button.textContent='['+index+']';button.title='View supporting passage: '+source.title;button.setAttribute('aria-label','Source '+index+': '+source.title);button.onclick=()=>showCloudSourceGroup(entries);parent.append(document.createTextNode(' '),button);

 }

}

let answering=false;let clarificationContext;let conversationContext;let chatHistory=[];let suggestedFollowup;

// Only user questions are carried forward; previous generated answers are never evidence.

function selectedGoal(q){return /^(?:and\s+|what about\s+|how about\s+)?(weight loss|blood sugar|cholesterol|low energy)[?.!]*$/i.exec(q.trim())?.[1]}

function activeContext(){

 if(!conversationContext)return undefined;

 let question=conversationContext.root;

 if(conversationContext.goal)question+='\nClarification: '+conversationContext.goal;

 if(conversationContext.scope)question+='\nClarification: '+conversationContext.scope;

 if(conversationContext.replies?.length)question+='\nUser context: '+conversationContext.replies.map(r=>r.prompt+' — '+r.reply).join(' | ');

 if(conversationContext.patientReplies?.length)question+='\nPatient context (user-reported; not evidence): '+conversationContext.patientReplies.filter(r=>!selectedGoal(r.reply)).map(r=>r.prompt+' — '+r.reply).join(' | ');

 return {question,activeGoal:conversationContext.goal,patientReplies:conversationContext.patientReplies||[],replies:conversationContext.replies||[],pendingQuestions:conversationContext.pendingQuestions||[]};

}

function followupContext(q){

 if(/^(?:a\s+)?(?:new|different|unrelated)\s+(?:question|topic|patient|case)\b/i.test(q.trim()))return undefined;

 if(suggestedFollowup&&q.trim().startsWith(suggestedFollowup.prompt))return suggestedFollowup.context;

 // A new outcome always replaces the old one, even while a clarification is pending.

 if(selectedGoal(q)&&conversationContext)return {...activeContext(),question:conversationContext.root,activeGoal:selectedGoal(q)};

 if(clarificationContext)return clarificationContext;

 if(conversationContext&&q.trim().length<=120&&q.trim().split(/\s+/).length<=6&&!/[?]/.test(q))return activeContext();

 if(!conversationContext)return undefined;

 if(/^(?:so\b|yes\b|would you like\b|are you interested\b|based on (?:that|this|the above)\b|given (?:that|this)\b|why\b|how (?:does|would|can) (?:that|this|it)\b|what (?:next|else|about)\b|and\b|explain (?:that|this|more)\b|tell me more\b|how (?:long|much|often)\b|what if\b|(?:is|are|can|should|would|does|do)\b[^?]{0,60}\b(?:this|that|it|they|these|those)\b)/i.test(q.trim())){

 const context=activeContext();

 if(conversationContext.reference)context.question+='\nPrior recommendation (conversational reference only; not evidence; verify again): '+conversationContext.reference;

 return context;

 }

 return undefined;

}

function rememberUserReply(q,context){

 if(!context)return context;

 const marker=/my response:/i.exec(q),reply=(marker?q.slice(marker.index+marker[0].length):q).trim();

 const prompt=marker?q.slice(0,marker.index).trim():context.prompt||(context.pendingQuestions?.length===1?context.pendingQuestions[0]:undefined);

 const patientReplies=Array.isArray(context.patientReplies)?context.patientReplies.slice(-9):[];

 if(/\bpatient\b/i.test(context.question)&&reply&&!/^(?:why|how|explain|tell me|what about)\b/i.test(reply)){const entry={prompt:(prompt||'Additional patient context').slice(0,140),reply:reply.slice(0,160)};if(!patientReplies.some(r=>r.prompt===entry.prompt&&r.reply===entry.reply))patientReplies.push(entry)}

 context={...context,patientReplies};

 if(!prompt||!reply)return context;

 const records=Array.isArray(context.replies)?context.replies.slice(-3):[];

 const entry={prompt:prompt.slice(0,140),reply:reply.slice(0,160)};

 if(!records.some(r=>r.prompt===entry.prompt&&r.reply===entry.reply))records.push(entry);

 return {...context,replies:records.slice(-4)};

}

ask=async function(q){

 if(answering||window.lpSavedChats?.loading())return;answering=true;view('chat');$('welcome').hidden=true;

 const user=document.createElement('div');user.className='message user';user.textContent=q;

 const answer=document.createElement('div');answer.className='message';answer.textContent='Finding relevant passages for each part of your question and checking the answer…';

 $('messages').append(user,answer);$('question').value='';const submit=$('askForm').querySelector('button[type="submit"]')||$('askForm').querySelector('button');if(submit)submit.disabled=true;

 try{

 const saved=window.lpSavedChats?await window.lpSavedChats.prepare():undefined;

 if(!window.lpQuestionVector)await import('/semantic-client.js').catch(()=>{});

 if(selectedGoal(q)&&conversationContext){conversationContext={root:conversationContext.root,goal:selectedGoal(q),patientReplies:conversationContext.patientReplies||[]};clarificationContext=undefined;}

 const context=rememberUserReply(q,followupContext(q));suggestedFollowup=undefined;const root=context?context.question.split(/\n(?:Clarification: |Prior recommendation \(|User context: |Patient context)/)[0]:q;const searchQuestion=context?context.question+'\nClarification: '+q:q;

 const semantic=window.lpQuestionVector?await window.lpQuestionVector(searchQuestion,message=>{answer.textContent=message}):undefined;

 const r=await fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,...(saved||{}),...(context?{clarification:context}:{}),...(semantic?{semantic}:{}),...(chatHistory.length?{history:chatHistory.slice(-4)}:{})})});const result=await r.json();if(result.savedTurn&&window.lpSavedChats)await window.lpSavedChats.completed(result);if(!r.ok)throw Error(result.error||'Answer unavailable');

 const goal=selectedGoal(q)||(context?conversationContext?.goal:undefined);

 const changedGoal=!!selectedGoal(q);const scopeReply=!!clarificationContext&&/\nClarification: Blood sugar\b/i.test(context?.question||'')&&!changedGoal&&!/^(?:why|how|what)\b/i.test(q);

 const scope=(/^General information only$/i.test(q)||scopeReply)?q.slice(0,500):(context&&!changedGoal?conversationContext?.scope:undefined);

 suggestedFollowup=undefined;conversationContext={root,goal,scope,patientReplies:context?.patientReplies||[],reference:context&&!changedGoal?conversationContext?.reference:undefined,replies:context&&!changedGoal?context.replies||[]:[],pendingQuestions:[]};

 if(result.status==='answered'){chatHistory.push({q:q.slice(0,300),a:(result.sentences||[]).slice(0,3).map(s=>s.text).join(' ').slice(0,500)});if(chatHistory.length>6)chatHistory.shift()}

 if(result.status==='answered')conversationContext.reference=(result.sentences||[]).filter(s=>s.section==='Practical next steps').map(s=>s.text).join(' ').slice(0,900)||conversationContext.reference;

 renderAnswer(answer,result,context,root);

 if(result.persistenceError){const warning=document.createElement('p');warning.className='save-error';warning.textContent=result.persistenceError;answer.append(warning)}



 }catch(e){answer.textContent=e.message||'Answer unavailable. Please retry.'}finally{answering=false;if(submit)submit.disabled=false}

 (answer.previousElementSibling||answer).scrollIntoView({behavior:'smooth',block:'start'});

};

document.querySelector('.fine').textContent='Answers and practical steps use your library · Click [number] to inspect the supporting passage · No web search';





const previousNewChat=$('newChat').onclick;$('newChat').onclick=()=>{clarificationContext=undefined;conversationContext=undefined;chatHistory=[];suggestedFollowup=undefined;previousNewChat?.()};



function renderAnswer(answer,result,context,root){

 if(conversationContext)conversationContext.pendingQuestions=(result.next_questions||[]).slice(0,3);

 answer.replaceChildren();const label=document.createElement('div');label.className='answer-label';label.textContent='LP Insight';answer.append(label);

 if(context){const anchor=document.createElement('p');anchor.className='muted';anchor.textContent='Following up on: '+root;answer.append(anchor)}

 if(result.status==='clarification'){

 const contextForQuestion={...result.clarification.context,prompt:result.clarification.question,pendingQuestions:result.clarification.context.collecting?result.clarification.context.pendingQuestions:[result.clarification.question]};clarificationContext=contextForQuestion;

 if(conversationContext&&contextForQuestion.patientReplies){conversationContext.patientReplies=contextForQuestion.patientReplies;conversationContext.goal=contextForQuestion.activeGoal||conversationContext.goal;}

 const question=document.createElement('h3');question.textContent=result.clarification.question;answer.append(question);

 const hint=document.createElement('p');hint.textContent=result.message;answer.append(hint);

 for(const option of result.clarification.options||[]){const button=document.createElement('button');button.textContent=option;button.onclick=()=>{if(answering)return;clarificationContext=contextForQuestion;conversationContext={patientReplies:contextForQuestion.patientReplies||[],root:contextForQuestion.question.split(/\n(?:Clarification: |Prior recommendation \(|User context: |Patient context)/)[0],goal:/\nClarification: (weight loss|blood sugar|cholesterol|low energy)\b/i.exec(contextForQuestion.question)?.[1]};if((result.clarification.freeTextOptions||['Another goal']).includes(option)){$('question').value='';$('question').focus()}else return ask(option)};answer.append(button,document.createTextNode(' '))}

 const reset=document.createElement('button');reset.textContent='Ask a different question';reset.onclick=()=>{if(answering)return;clarificationContext=undefined;conversationContext=undefined;reset.disabled=true;const note=document.createElement('p');note.className='muted';note.textContent='The next question will start a new search.';answer.append(note);$('question').focus()};answer.append(reset);renderFollowupQuestions(answer,result);

 }

 else if(result.status!=='answered'){clarificationContext=undefined;const p=document.createElement('p');p.textContent=result.message;answer.append(p);renderSources(answer,result.citations||[],'Related passages to inspect');renderFollowupQuestions(answer,result)}

 else{

 clarificationContext=undefined;

 if(result.mode==='starting_point'){const heading=document.createElement('h3');heading.textContent='A starting point from your library';answer.append(heading)}

 result.citations=orderAnswerSources(result.sentences,result.citations);

 const sources=new Map(result.citations.map(c=>[c.id,c]));const docOrder=[...new Set(result.citations.map(c=>c.document_id))];let currentTopic=-1;

 const sections=answerSections;

 const topics=[...new Set(result.sentences.map(s=>s.topic))];

 for(const topic of topics){

 if(result.topics?.length>1&&topic!==currentTopic){currentTopic=topic;const h=document.createElement('h3');h.textContent=result.topics[topic];answer.append(h)}

 for(const section of sections){

 const items=result.sentences.filter(s=>s.topic===topic&&s.section===section);if(!items.length)continue;

 {const h=document.createElement('h3');h.textContent=section==='Practical next steps'&&result.mode==='protocol'?(result.protocol_partial?'Supported steps (partial protocol)':'Protocol steps'):section;answer.append(h)}

 if(section==='Practical next steps'){let list=document.createElement('ul');let phase;for(const s of items){if(s.phase&&s.phase!==phase){if(list.childElementCount)answer.append(list);phase=s.phase;const ph=document.createElement('h4');ph.className='protocol-phase';ph.textContent=phase;answer.append(ph);list=document.createElement('ul')}const item=document.createElement('li');appendCitedSentence(item,s,sources,docOrder);list.append(item)}answer.append(list)}

 else{const p=document.createElement('p');p.className='grounded-sentence';items.forEach((s,i)=>{if(i)p.append(document.createTextNode(' '));appendCitedSentence(p,s,sources,docOrder)});answer.append(p)}

 }

 }

 if(result.unanswered?.length){const p=document.createElement('p');p.className='muted';p.textContent='Not established from the retrieved evidence: '+result.unanswered.join('; ');answer.append(p)}

 if(result.goal_coverage?.energy_requested&&!result.goal_coverage.energy_evidence){const gap=document.createElement('p');gap.className='muted';gap.textContent='The retained citations do not directly establish an improvement in morning energy; the supported steps should not be taken as a promise of that benefit.';answer.append(gap)}

 if(result.analysis?.length){const box=document.createElement('div');box.className='analysis-box';const t=document.createElement('strong');t.textContent='My analysis';const sub=document.createElement('small');sub.className='muted';sub.textContent=' — reasoning that connects the cited statements above; it is not itself a source.';box.append(t,sub);for(const a of result.analysis){const p=document.createElement('p');p.textContent=a;box.append(p)}answer.append(box)}

 renderFollowupQuestions(answer,result);

 renderSources(answer,result.citations,'Sources',result.sentences);const note=document.createElement('small');note.className='muted answer-note';note.textContent=result.message;answer.append(note);

 }

}



window.lpConversation={

 busy:()=>answering,

 snapshot:()=>({clarificationContext,conversationContext,chatHistory:chatHistory.slice(-4),suggestedFollowup}),

 restore:state=>{suggestedFollowup=state?.suggestedFollowup;clarificationContext=state?.clarificationContext;conversationContext=state?.conversationContext;chatHistory=Array.isArray(state?.chatHistory)?state.chatHistory.slice(-6):[]},

 replay:(turn)=>{window.lpConversation.restore(turn.state||{});const user=document.createElement('div');user.className='message user';user.textContent=turn.question;const answer=document.createElement('div');answer.className='message';$('messages').append(user,answer);const result=turn.result;if(!result){answer.textContent=turn.status==='pending'?'This answer was interrupted or is still running. Reopen this chat shortly; your question is saved.':'Answer interrupted. Your question is saved; ask it again to retry.';return}

 if(result.error){answer.textContent=result.error;return}

 const q=turn.question,context=rememberUserReply(q,followupContext(q)),root=context?context.question.split(/\n(?:Clarification: |Prior recommendation \(|User context: |Patient context)/)[0]:q,goal=selectedGoal(q)||(context?conversationContext?.goal:undefined),changedGoal=!!selectedGoal(q);

 const scopeReply=!!clarificationContext&&/\nClarification: Blood sugar\b/i.test(context?.question||'')&&!changedGoal&&!/^(?:why|how|what)\b/i.test(q);const scope=(/^General information only$/i.test(q)||scopeReply)?q.slice(0,500):(context&&!changedGoal?conversationContext?.scope:undefined);

 suggestedFollowup=undefined;conversationContext={root,goal,scope,patientReplies:context?.patientReplies||[],reference:context&&!changedGoal?conversationContext?.reference:undefined,replies:context&&!changedGoal?context.replies||[]:[],pendingQuestions:[]};

 if(result.status==='answered'){chatHistory.push({q:q.slice(0,300),a:(result.sentences||[]).slice(0,3).map(s=>s.text).join(' ').slice(0,500)});if(chatHistory.length>6)chatHistory.shift();conversationContext.reference=(result.sentences||[]).filter(s=>s.section==='Practical next steps').map(s=>s.text).join(' ').slice(0,900)||conversationContext.reference}

 renderAnswer(answer,result,context,root);

 }

};



function renderFollowupQuestions(answer,result){

 if(result.next_questions?.length){const w=document.createElement('div');w.className='next-questions';const l=document.createElement('small');l.className='muted';l.textContent=result.mode==='starting_point'?'To make the next answer more specific:':'To tailor this further, tell me:';w.append(l);const ul=document.createElement('ul');for(const nq of result.next_questions){const suggestionState=JSON.parse(JSON.stringify(conversationContext||null));const li=document.createElement('li'),text=document.createElement('span'),button=document.createElement('button');text.textContent=nq;button.type='button';button.className='followup-arrow';button.textContent='↗';button.title='Add this follow-up to your question';button.setAttribute('aria-label','Add follow-up: '+nq);button.onclick=()=>{if(answering)return;conversationContext=suggestionState?JSON.parse(JSON.stringify(suggestionState)):undefined;clarificationContext=undefined;const context=result.status==='clarification'?{...result.clarification.context}:activeContext();if(context)context.prompt=nq;if(context&&conversationContext?.reference)context.question+='\nPrior recommendation (conversational reference only; not evidence; verify again): '+conversationContext.reference;suggestedFollowup={prompt:nq,context};$('question').value=nq+'\nMy response: ';$('question').focus();$('question').setSelectionRange?.($('question').value.length,$('question').value.length)};li.append(text,button);ul.append(li)}w.append(ul);answer.append(w)}

}

