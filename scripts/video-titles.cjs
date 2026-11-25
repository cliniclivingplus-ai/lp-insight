const fs=require('node:fs');
const path=require('node:path');
const generic=title=>!title||/^Video transcript\s*:/i.test(title);
function loadTitles(file=path.join(__dirname,'video-titles.json')){
 try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid video title cache');return data}
 catch(error){if(error.code==='ENOENT')return {};throw error}
}
function videoTitle(doc,cache,previousTitle){
 if(doc.collection!=='videos')return doc.title;
 const cached=cache[doc.path];
 if(cached&&typeof cached.title==='string'&&cached.title.trim()&&!generic(cached.title))return (cached.title.trim()+(typeof cached.channel==='string'&&cached.channel.trim()?' — '+cached.channel.trim():'')).slice(0,300);
 return generic(doc.title)&&!generic(previousTitle)?previousTitle:doc.title;
}
// Resolve placeholders against every existing version BEFORE inserting/updating.
// This also protects titles updated only in Turso when the local cache is absent.
function documentBatch(docs){
 const columns=['id','version','path','title','source_url','collection','status'];
 return {sql:`WITH incoming(${columns.join(',')}) AS (VALUES ${docs.map(()=>'(?,?,?,?,?,?,?)').join(',')})
 INSERT INTO lp_documents (${columns.join(',')})
 SELECT id,version,path,CASE WHEN collection='videos' AND title LIKE 'Video transcript:%' THEN
 COALESCE((SELECT saved.title FROM lp_documents saved WHERE saved.id=incoming.id AND saved.collection='videos' AND saved.title NOT LIKE 'Video transcript:%' AND trim(saved.title)<>'' ORDER BY saved.version DESC LIMIT 1),title)
 ELSE title END,source_url,collection,status FROM incoming WHERE 1
 ON CONFLICT(id,version) DO UPDATE SET path=excluded.path,title=excluded.title,source_url=excluded.source_url,collection=excluded.collection,status=excluded.status`,args:docs.flatMap(doc=>columns.map(column=>doc[column]??null))};
}
module.exports={loadTitles,videoTitle,documentBatch};
