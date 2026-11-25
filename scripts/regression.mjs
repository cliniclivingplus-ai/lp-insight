// Run against a local dev server: node --env-file=.env scripts/regression.mjs
// Uses the pilot password without printing it. Detailed results stay in ignored local scratch.
import fs from 'node:fs';
import path from 'node:path';
import {classifyResponse} from './regression-checks.mjs';
const base=process.env.BASE_URL||'http://localhost:5174',password=process.env.LP_TEST_PASSWORD||process.env.LP_ACCESS_PASSWORD;
if(!password){console.error('LP_ACCESS_PASSWORD missing');process.exit(2)}
const cases=JSON.parse(fs.readFileSync(new URL('./regression-cases.json',import.meta.url),'utf8')).filter(c=>!process.env.LP_REGRESSION_CASES||process.env.LP_REGRESSION_CASES.split(',').includes(c.id));
const login=await fetch(base+'/api/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',origin:base},body:new URLSearchParams({...(process.env.LP_TEST_EMAIL?{email:process.env.LP_TEST_EMAIL}:{}),password})});
const cookie=(login.headers.getSetCookie?.()||[]).map(c=>c.split(';')[0]).join('; ');
if(![200,302,303].includes(login.status)||!cookie){console.error('Login failed');process.exit(2)}
const report=[],output=process.env.LP_REGRESSION_FILE||'.sites-runtime/regression-http.json';fs.mkdirSync(path.dirname(output),{recursive:true});
for(const c of cases){if(report.length&&Number(process.env.LP_CASE_PAUSE_MS)>0)await new Promise(resolve=>setTimeout(resolve,Number(process.env.LP_CASE_PAUSE_MS)));let record;try{const res=await fetch(base+'/api/answer',{method:'POST',headers:{'content-type':'application/json',origin:base,cookie},body:JSON.stringify({question:c.question})});const response=await res.json();record={...c,httpStatus:res.status,response,...classifyResponse(c,response,res.status)}}catch(e){record={...c,result:'ERROR',reason:e.message}}report.push(record);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(record.result+' '+c.id+(record.reason?' – '+record.reason:''))}
console.log(JSON.stringify(Object.fromEntries(['PASS','FAIL','BLOCKED','ERROR'].map(result=>[result,report.filter(c=>c.result===result).length]))));
process.exitCode=report.some(c=>['FAIL','ERROR'].includes(c.result))?1:report.some(c=>c.result==='BLOCKED')?2:0;
