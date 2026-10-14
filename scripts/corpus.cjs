const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function list(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(root,e.name)):e.isFile()&&/\.(md|markdown)$/i.test(e.name)?[path.join(root,e.name)]:[]).sort()}
function parse(text,relative){
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const title=lines.find(l=>/^#\s+/.test(l))?.replace(/^#\s+/,'').trim()||path.basename(relative,path.extname(relative));
 const source=lines.find(l=>/^Source:\s*https?:\/\//i.test(l))?.match(/https?:\/\/\S+/)?.[0]||null;
 const collection=relative.split('/')[0];
 const category=lines.find(l=>/^Category:/i.test(l))?.replace(/^Category:\s*/i,'').trim()||null;
 let bodyStart=0;const separator=lines.findIndex((l,i)=>i>0&&i<30&&l.trim()==='---');if(separator>=0)bodyStart=separator+1;else if(/^#\s/.test(lines[0]))bodyStart=1;
 let heading=title,page=null,start=null,end=null,buffer=[],startLine=bodyStart+1,chunks=[];
 function flush(){const content=buffer.join('\n').trim();if(content)chunks.push({content,heading,page,start_seconds:start,end_seconds:end,start_line:startLine,end_line:startLine+buffer.length-1});buffer=[]}
 for(let i=bodyStart;i<lines.length;i++){
  let line=lines[i];const pageMatch=line.match(/^\s*<!--\s*page\s+(\d+)\s*-->\s*$/i);const h=line.match(/^(#{1,6})\s+(.+)/);const stamp=line.match(/^\s*\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.\d+)?\]\s/);
  if(pageMatch){flush();page=Number(pageMatch[1]);startLine=i+2;continue}
  if(h){flush();heading=h[2];startLine=i+1}
  if(stamp){const sec=Number(stamp[1]||0)*3600+Number(stamp[2])*60+Number(stamp[3]);if(buffer.length&&buffer.join('\n').length>2200){flush();start=null;end=null}if(start===null)start=sec;end=sec}
  if(!buffer.length)startLine=i+1;buffer.push(line);
  if(buffer.join('\n').length>=2800&&line.trim()===''){flush();start=null;end=null}
  // Bound unusually long paragraphs; preserve exact text and line locations.
  if(buffer.join('\n').length>=5000){flush();start=null;end=null}
 }
 flush();return {title,source,collection,category,chunks,body:lines.slice(bodyStart).join('\n'),has_pages:chunks.some(c=>c.page!==null),has_timestamps:chunks.some(c=>c.start_seconds!==null),generic_title:/^Video transcript:\s*[-\w]{11}$/i.test(title)};
}
function database(filename){fs.mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec(`
 PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS documents(id TEXT NOT NULL,version INTEGER NOT NULL,path TEXT NOT NULL,content_hash TEXT NOT NULL,title TEXT NOT NULL,source_url TEXT,collection TEXT,category TEXT,status TEXT NOT NULL DEFAULT 'unreviewed',active INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(id,version));
 CREATE TABLE IF NOT EXISTS chunks(id INTEGER PRIMARY KEY,document_id TEXT NOT NULL,document_version INTEGER NOT NULL,ordinal INTEGER NOT NULL,content TEXT NOT NULL,heading TEXT,page INTEGER,start_seconds INTEGER,end_seconds INTEGER,start_line INTEGER,end_line INTEGER,FOREIGN KEY(document_id,document_version) REFERENCES documents(id,version),UNIQUE(document_id,document_version,ordinal));
 CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(content,heading,tokenize='porter unicode61');
 CREATE INDEX IF NOT EXISTS chunks_document ON chunks(document_id,document_version);
 CREATE INDEX IF NOT EXISTS documents_active ON documents(active,collection);
 `);return db}
const stop=new Set('what how does do is are the a an of for in to and with from about say says can my library knowledge tell me'.split(' '));
function search(db,question,limit=8,collection=null){const terms=[...new Set((question.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>1&&!stop.has(t)))];if(!terms.length)return[];const match=terms.map(t=>'"'+t.replaceAll('"','""')+'"').join(' OR ');const candidates=db.prepare(`SELECT c.*,d.title,d.path,d.source_url,d.collection,d.status,bm25(search_index,1,1.5) AS rank FROM search_index JOIN chunks c ON c.id=search_index.rowid JOIN documents d ON d.id=c.document_id AND d.version=c.document_version WHERE search_index MATCH ? AND d.active=1 AND (? IS NULL OR d.collection=?) ORDER BY rank LIMIT 100`).all(match,collection,collection);return candidates.map(c=>{const tokens=new Set((c.content+' '+c.heading).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);let coverage=terms.filter(t=>tokens.has(t)||[...tokens].some(w=>w.startsWith(t)&&t.length>=5)).length/terms.length;return {...c,coverage}}).filter(c=>c.coverage>=0.6).slice(0,limit)}
module.exports={list,parse,database,search,hash};
