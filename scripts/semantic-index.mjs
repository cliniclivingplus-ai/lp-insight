// Default operation is entirely local. Cloud upload is a separate, guarded command.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {pipeline,env,AutoTokenizer} from '@huggingface/transformers';import {createClient} from '@libsql/client';
import {isConnectionError,localBusyRetry} from './semantic-retry.mjs';
const require=createRequire(import.meta.url),{DatabaseSync}=require('node:sqlite'),{MODEL,MODEL_FILES,REVISION,POLICY,projected,fits,windows,guardedWrite,readCheckpoint,bulkInsertVectors}=require('./semantic-common.cjs'),{loadTitles,videoTitle}=require('./video-titles.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const directory=path.resolve(process.env.LP_SEMANTIC_DIR||path.join(root,'.sites-runtime/semantic'));fs.mkdirSync(directory,{recursive:true});
const command=process.argv[2]||'plan',source=path.resolve(process.env.LP_CORPUS_FILE||'../lp-data/library.sqlite'),localFile=path.join(directory,'index.db'),statusFile=path.join(directory,'status.json'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const status={revision:REVISION,processId:process.pid,started:new Date().toISOString(),phase:command};function progress(data){Object.assign(status,data,{updated:new Date().toISOString()});fs.writeFileSync(statusFile+'.tmp',JSON.stringify(status,null,2));fs.renameSync(statusFile+'.tmp',statusFile);console.log(JSON.stringify(data))}
const config={};for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)\s*=\s*(.*)$/);if(m)config[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
function cloud(){const url=new URL(config.TURSO_DATABASE_URL.replace(/^libsql:/,'https:'));if(url.hostname!=='lp-insight-living-plus.aws-ap-south-1.turso.io')throw Error('UNEXPECTED_DATABASE');return createClient({url:url.origin,authToken:config.TURSO_AUTH_TOKEN})}
async function bytes(client){const p=await client.execute('PRAGMA page_count'),s=await client.execute('PRAGMA page_size');return Number(p.rows[0][0])*Number(s.rows[0][0])}
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=fs.existsSync(path.join(root,'.sites-runtime/hf-pilot/model-cache/',MODEL))?path.join(root,'.sites-runtime/hf-pilot/model-cache/'):path.join(root,'public/semantic-assets/models/');
for(const [name,expected] of Object.entries(MODEL_FILES))if(hash(fs.readFileSync(path.join(env.localModelPath,MODEL,name)))!==expected)throw Error('LOCAL_MODEL_ASSET_MISMATCH');
let index=createClient({url:'file:'+localFile}),remote;
async function configureLocal(){await index.execute('PRAGMA busy_timeout=5000');await index.execute('PRAGMA journal_mode=WAL');await index.execute('PRAGMA synchronous=FULL')}
async function reconnectLocal(){index.close();index=createClient({url:'file:'+localFile});await configureLocal()}
try{
 await index.execute('PRAGMA busy_timeout=5000');
 await index.execute('PRAGMA journal_mode=WAL');
 await index.execute('PRAGMA synchronous=FULL');
 await index.execute('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const revision=(await index.execute("SELECT value FROM meta WHERE key='revision'")).rows[0]?.value;
 if(revision&&revision!==REVISION)throw Error('LOCAL_INDEX_REVISION_MISMATCH');
 await index.execute({sql:"INSERT OR IGNORE INTO meta VALUES('revision',?)",args:[REVISION]});
 await index.execute('CREATE TABLE IF NOT EXISTS vectors(id INTEGER PRIMARY KEY,chunk_id INTEGER NOT NULL,document_version INTEGER NOT NULL,source_hash TEXT NOT NULL,start_char INTEGER NOT NULL,end_char INTEGER NOT NULL,embedding F32_BLOB(384),UNIQUE(chunk_id,start_char))');
 if(command==='plan'||command==='build'){
  remote=cloud();const existing=await bytes(remote);remote.close();remote=null;
  const db=new DatabaseSync(source,{readOnly:true}),titles=loadTitles(),rows=db.prepare('SELECT c.*,d.title,d.path,d.collection FROM chunks c JOIN documents d ON d.id=c.document_id AND d.version=c.document_version WHERE d.active=1 ORDER BY c.id').all();db.close();
  const sourceStamp=hash(rows.map(r=>{r.title=videoTitle(r,titles);return r.id+':'+r.document_version+':'+hash(r.title+'\n'+r.content)}).join('\n'));
  const oldStamp=(await index.execute("SELECT value FROM meta WHERE key='source_stamp'")).rows[0]?.value;if(oldStamp&&oldStamp!==sourceStamp)throw Error('CORPUS_CHANGED_REBUILD_IN_NEW_DIRECTORY_REQUIRED');
  await index.execute({sql:"INSERT OR IGNORE INTO meta VALUES('source_stamp',?)",args:[sourceStamp]});
  const tokenizer=await AutoTokenizer.from_pretrained(MODEL);let count=0,maxTokens=0;const plan=[];
  for(const row of rows){const spans=windows(row,tokenizer);count+=spans.length;for(const w of spans)maxTokens=Math.max(maxTokens,w.tokens);plan.push({row,spans:spans.map(({text,...span})=>span)});if(plan.length%2000===0)progress({phase:'planning',parents:plan.length,windows:count})}
  const expected=projected(existing,count),available=Number(fs.statfsSync(directory).bavail)*Number(fs.statfsSync(directory).bsize),needed=count*11000+2_000_000_000;
  progress({phase:'planned',parents:rows.length,windows:count,maxTokens,existingCloudBytes:existing,projectedWithSafetyBytes:expected,ceilingBytes:POLICY.ceiling,reservedBytes:POLICY.limit-POLICY.ceiling,freeLocalBytes:available});
  fs.writeFileSync(path.join(directory,'plan.json'),JSON.stringify({revision:REVISION,sourceStamp,count,maxTokens,existing,expected,parents:rows.length}));
  if(expected>POLICY.ceiling)throw Error('STOP_STORAGE_PROJECTION_EXCEEDS_SAFE_CEILING');
  if(available<needed)throw Error('STOP_INSUFFICIENT_LOCAL_DISK_RESERVE');
  if(command==='build'){
   const threads=Number(process.env.LP_EMBED_THREADS||4);if(!Number.isInteger(threads)||threads<1||threads>12)throw Error('INVALID_EMBED_THREAD_COUNT');
   const extractor=await pipeline('feature-extraction',MODEL,{dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:threads,interOpNumThreads:1}});let completed=Number((await index.execute('SELECT count(*) n FROM vectors WHERE embedding IS NOT NULL')).rows[0].n),next=Number((await index.execute('SELECT coalesce(max(id),0)+1 n FROM vectors')).rows[0].n);let begun=performance.now();const initial=completed;progress({phase:'embedding',completed,total:count,threads,resumedWindows:completed});
   for(const {row,spans} of plan){const existingSpans=new Set((await index.execute({sql:'SELECT start_char FROM vectors WHERE chunk_id=? AND embedding IS NOT NULL',args:[row.id]})).rows.map(r=>Number(r.start_char))),header=(row.title+' '+(row.heading||'')).split(/\s+/).slice(0,35).join(' '),pending=spans.filter(w=>!existingSpans.has(w.start));
    if(pending.length&&completed===initial)begun=performance.now();
    for(let n=0;n<pending.length;n+=8){const batch=pending.slice(n,n+8),result=(await extractor(batch.map(w=>header+'\n'+row.content.slice(w.start,w.end)),{pooling:'cls',normalize:true})).tolist();
     const statements=batch.map((w,j)=>({sql:'INSERT INTO vectors VALUES(?,?,?,?,?,?,vector32(?))',args:[next++,row.id,row.document_version,hash(row.content),w.start,w.end,JSON.stringify(result[j])]}));await localBusyRetry(()=>index.batch(statements,'write'),undefined,reconnectLocal);completed+=batch.length;
    }
    if(completed%100<spans.length){const rate=(completed-initial)/((performance.now()-begun)/1000);progress({phase:'embedding',completed,total:count,windowsPerSecond:rate,remainingHours:rate?(count-completed)/rate/3600:null});if(Number(fs.statfsSync(directory).bavail)*Number(fs.statfsSync(directory).bsize)<1_500_000_000)throw Error('STOP_LOCAL_DISK_RESERVE')}
   }
   if(completed!==count)throw Error('EMBEDDING_COUNT_MISMATCH');progress({phase:'building-local-index',completed,total:count});
   await index.execute("CREATE INDEX IF NOT EXISTS local_semantic_idx ON vectors(libsql_vector_idx(embedding,'compress_neighbors=float8','max_neighbors=16'))");
   const measured=await bytes(index);if(!fits(existing,measured))throw Error('STOP_MEASURED_INDEX_WILL_NOT_FIT');
   await index.execute({sql:"INSERT OR REPLACE INTO meta VALUES('complete',?)",args:[String(count)]});progress({phase:'local-ready',completed,total:count,measuredLocalBytes:measured,projectedWithSafetyBytes:existing+Math.ceil(measured*POLICY.growth)+POLICY.margin,next:'Upload is separate: node scripts/semantic-index.mjs upload'});
  }
 }else if(command==='upload'){
  const ready=(await index.execute("SELECT value FROM meta WHERE key='complete'")).rows[0];if(!ready)throw Error('LOCAL_INDEX_NOT_COMPLETE');
  remote=cloud();const existing=await bytes(remote),measured=await bytes(index);if(existing+POLICY.margin>POLICY.ceiling)throw Error('STOP_REMOTE_STORAGE_CEILING');const prior=(await remote.execute("SELECT name FROM sqlite_master WHERE name='lp_semantic_vectors'")).rows.length;
  if(!prior&&!fits(existing,measured))throw Error('STOP_MEASURED_INDEX_WILL_NOT_FIT');
  await remote.execute('CREATE TABLE IF NOT EXISTS lp_semantic_state(id INTEGER PRIMARY KEY CHECK(id=1),revision TEXT NOT NULL,ready INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL DEFAULT 0,source_stamp TEXT NOT NULL)');
  const stamp=String((await index.execute("SELECT value FROM meta WHERE key='source_stamp'")).rows[0].value),state=(await remote.execute('SELECT * FROM lp_semantic_state WHERE id=1')).rows[0];if(state&&(state.revision!==REVISION||state.source_stamp!==stamp))throw Error('REMOTE_REVISION_OR_CORPUS_MISMATCH');
  await remote.execute({sql:'INSERT INTO lp_semantic_state VALUES(1,?,0,?,?) ON CONFLICT(id) DO UPDATE SET ready=0',args:[REVISION,Number(ready.value),stamp]});
  for(const sql of require('./semantic-schema.cjs'))await remote.execute(sql);
  // Remote transactions roll back an entire batch if post-write allocated pages exceed the budget.
  const checkpoint=await readCheckpoint(remote);
  let last=Number(checkpoint.last),uploaded=Number(checkpoint.n);progress({phase:'uploading',uploaded,total:Number(ready.value),cloudBytes:await bytes(remote)});while(true){const batch=(await index.execute({sql:'SELECT *,vector_extract(embedding) v FROM vectors WHERE id>? ORDER BY id LIMIT 64',args:[last]})).rows;if(!batch.length)break;
   const actual=await guardedWrite(remote,async tx=>{
    const ids=[...new Set(batch.map(r=>Number(r.chunk_id)))],sources=await tx.execute({sql:'SELECT id,content,document_version FROM lp_chunks WHERE id IN ('+ids.map(()=>'?').join(',')+')',args:ids}),byId=new Map(sources.rows.map(r=>[Number(r.id),r]));
    for(const row of batch){const parent=byId.get(Number(row.chunk_id));if(!parent||hash(String(parent.content))!==row.source_hash||Number(parent.document_version)!==Number(row.document_version))throw Error('REMOTE_CORPUS_MISMATCH')}
    await bulkInsertVectors(tx,batch);
   },Number(ready.value)-Number(batch.at(-1).id));last=Number(batch.at(-1).id);uploaded+=batch.length;if(uploaded%1024===0)progress({phase:'uploading',uploaded,total:Number(ready.value),cloudBytes:actual});
  }
  const final=await bytes(remote),actual=Number((await remote.execute('SELECT count(*) n FROM lp_semantic_vectors')).rows[0].n);if(actual!==Number(ready.value)||final+POLICY.margin>POLICY.ceiling)throw Error('FINAL_VERIFICATION_FAILED');
  await remote.execute('UPDATE lp_semantic_state SET ready=1 WHERE id=1');progress({phase:'cloud-ready',uploaded:actual,cloudBytes:final,reservedBytes:POLICY.limit-final});
 }else throw Error('Usage: semantic-index.mjs plan|build|upload');
}catch(error){const retryable=command==='upload'&&isConnectionError(error);progress({phase:retryable?'waiting-for-network':'stopped',operation:command,retryable,error:error.message});process.exitCode=1}finally{remote?.close();index.close()}
