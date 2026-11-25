// Read-only deployment checks: no answer route, credentials, or AI provider calls.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base='https://lp-insight-ten.vercel.app';
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{
 const checks=[];
 const home=await fetch(base+'/',{redirect:'manual'});
 assert.ok([302,303,307,308].includes(home.status));
 assert.equal(new URL(home.headers.get('location'),base).pathname,'/login');
 checks.push({path:'/',status:home.status,redirect:'/login'});
 const login=await fetch(base+'/login');assert.equal(login.status,200);
 assert.match(await login.text(),/password/i);checks.push({path:'/login',status:200});
 for(const file of ['app.js','research.js','chats.js','style.css']){
  const response=await fetch(base+'/'+file);assert.equal(response.status,200);
  const live=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync('public/'+file);
  assert.equal(digest(live),digest(local),file+' differs from local deployment source');
  checks.push({path:'/'+file,status:200,sha256:digest(live),matchesLocal:true});
 }
 const research=await fetch(base+'/api/pubmed');assert.equal(research.status,401);
 checks.push({path:'/api/pubmed',status:401,authenticationRequired:true});
 const report={checkedAt:new Date().toISOString(),base,checks,answerRequests:0,aiProviderRequests:0,note:'Read-only smoke checks; generated answer quality not tested live.'};
 fs.writeFileSync('.sites-runtime/clinical-deployment-no-ai-proof.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1});
