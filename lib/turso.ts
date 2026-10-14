import {signedIn} from './session';export async function allowed(){return signedIn()}async function queryInternal(sql:string,args:unknown[]=[]){const config=process.env as Record<string,string>;if(!config.TURSO_DATABASE_URL)throw Error('Database configuration missing');const target=new URL((config.TURSO_DATABASE_URL||'').replace(/^libsql:/,'https:'));if(target.hostname!=='lp-insight-living-plus.aws-ap-south-1.turso.io')throw Error('Database configuration missing');const token=config.TURSO_AUTH_TOKEN;if(!token)throw Error('Database configuration missing');const response=await fetch(target.origin+'/v2/pipeline',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args:args.map(v=>v===null?{type:'null'}:typeof v==='number'?{type:'integer',value:String(v)}:{type:'text',value:String(v)})}},{type:'close'}]}),redirect:'manual',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Database HTTP '+response.status);const body=await response.json();if(body.results[0].type!=='ok')throw Error('Query failed');const r=body.results[0].response.result;return r.rows.map((row:any[])=>Object.fromEntries(r.cols.map((c:any,i:number)=>[c.name,row[i].type==='null'?null:row[i].type==='integer'?Number(row[i].value):row[i].value])))}export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}



export async function query(sql:string,args:unknown[]=[]){try{return await queryInternal(sql,args)}catch(error){throw error}}



