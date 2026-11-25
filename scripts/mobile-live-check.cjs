// Production phone smoke check. Never calls /api/answer. Temporary data is removed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
const {chromium}=require(process.env.LP_PLAYWRIGHT_PATH||'playwright');
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const cache=new Map();function load(file){const key=path.resolve(file);if(cache.has(key))return cache.get(key);const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),m,m.exports);cache.set(key,m.exports);return m.exports;}
const accounts=load('lib/accounts.ts'),chats=load('lib/chats.ts'),db=accounts.accountDb();
const base='https://lp-insight-ten.vercel.app',email='lp-mobile-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomUUID()+'-Test';
const report={checkedAt:new Date().toISOString(),url:base,phoneEmulation:true,answerRequests:0,blockedAnswerRequests:0,checks:[],widths:[]};let browser,userId;
async function size(){return Number((await db.execute('PRAGMA page_count')).rows[0][0])*Number((await db.execute('PRAGMA page_size')).rows[0][0]);}
(async()=>{try{
 report.storageBefore=await size();assert.ok(report.storageBefore+64000000<4000000000,'Storage safety margin');
 const signup=await fetch(base+'/api/account',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Temporary mobile verification',email,password,invite:process.env.LP_ACCESS_PASSWORD})});assert.equal(signup.status,201,'Temporary account signup');
 const row=(await db.execute({sql:'SELECT id FROM lp_users WHERE email=?',args:[email]})).rows[0];assert.ok(row);userId=String(row.id);
 const source=(await db.execute("SELECT c.*,d.title,d.path,d.source_url,d.collection,d.status FROM lp_chunks c JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version WHERE d.collection='books' AND length(c.content)>200 LIMIT 1")).rows[0];assert.ok(source);const quote=String(source.content).slice(0,180);
 browser=await chromium.launch({executablePath:process.env.LP_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const width of [390,320]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base)return route.abort();if(u.pathname==='/api/answer'){report.blockedAnswerRequests++;return route.abort();}return route.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function signIn(){await page.goto(base+'/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await Promise.all([page.waitForURL(base+'/'),page.locator('form[action="/api/login"] button').click()]);await page.waitForFunction(()=>window.lpSavedChats&&!document.getElementById('question').disabled);assert.equal(await page.locator('#accountEmail').textContent(),email);}
 await signIn();report.checks.push(`live sign-in form and authenticated account at ${width}px`);
 if(!report.chatId){const created=await page.evaluate(async()=>{const r=await fetch('/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return{status:r.status,body:await r.json()};});assert.equal(created.status,201);report.chatId=created.body.id;
 const turn=await chats.beginTurn(userId,report.chatId,{question:'Mobile verification fixture — saved library quotation, not an AI answer',chatRevision:0,chatState:{}});
 await chats.finishTurn(turn,{status:'answered',topics:['Display-only fixture'],sentences:[{topic:0,section:'Answer',text:quote,evidence:[{source_id:Number(source.id),quote}]}],citations:[{...source,id:Number(source.id),document_id:source.document_id}],message:'Display-only verification fixture copied from the library; no AI generation or evidence check was run.'});
 }
 await page.reload();await page.waitForFunction(()=>window.lpSavedChats&&!document.getElementById('question').disabled);await page.click('#toggleChats');await page.locator('.saved-chat').filter({hasText:'Mobile verification fixture'}).click();await page.waitForFunction(()=>document.getElementById('chatSaveStatus').textContent.includes('Conversation reopened'));
 assert.ok((await page.locator('#messages').textContent()).includes(quote));assert.equal(await page.locator('#toggleChats').getAttribute('aria-expanded'),'false');
 await page.locator('.citation').first().click();await page.waitForSelector('#sourceDialog[open]');assert.equal(await page.locator('#sourceTitle').textContent(),String(source.title));assert.equal(await page.locator('#sourceText mark').first().textContent(),quote);let close=await page.locator('#closeDialog').boundingBox();assert.ok(close.y>=0&&close.x>=0&&close.x+close.width<=width+1);await page.screenshot({path:`.sites-runtime/mobile/live-citation-${width}.png`});await page.click('#closeDialog');assert.equal(await page.locator('#sourceDialog').isVisible(),false);
 await page.click('#toggleChats');await Promise.all([page.waitForURL(base+'/login'),page.locator('form[action="/api/logout"] button').click()]);await signIn();await page.click('#toggleChats');await page.locator('.saved-chat').filter({hasText:'Mobile verification fixture'}).click();await page.waitForFunction(()=>document.getElementById('chatSaveStatus').textContent.includes('Conversation reopened'));assert.ok((await page.locator('#messages').textContent()).includes(quote));
 await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`.sites-runtime/mobile/live-reopened-${width}.png`});assert.deepEqual(errors,[]);
 report.widths.push({width,signIn:true,savedChatReopened:true,exactQuoteHighlighted:true,dialogClosed:true,signOutAndSignInRestoredHistory:true,pageErrors:errors});await context.close();
 }
 assert.equal(report.blockedAnswerRequests,0);report.passed=true;
 }finally{
 if(browser)await browser.close();
 // Strictly scope cleanup to this unique synthetic account, including budget.
 const tx=await db.transaction('write');try{const rows=(await tx.execute({sql:'SELECT id FROM lp_users WHERE email=?',args:[email]})).rows;for(const row of rows){const bytes=Number((await tx.execute({sql:'SELECT coalesce(sum(bytes),0) n FROM lp_chat_turns WHERE user_id=?',args:[row.id]})).rows[0].n);await tx.execute({sql:'DELETE FROM lp_chat_turns WHERE user_id=?',args:[row.id]});await tx.execute({sql:'DELETE FROM lp_chats WHERE user_id=?',args:[row.id]});await tx.execute({sql:'DELETE FROM lp_users WHERE id=?',args:[row.id]});await tx.execute({sql:'UPDATE lp_chat_budget SET used_bytes=max(0,used_bytes-?) WHERE id=1',args:[bytes]});}await tx.commit();report.temporaryDataRemoved=true;}catch(e){await tx.rollback();throw e;}finally{tx.close();}
 report.storageAfter=await size();report.headroomBelow4GB=4000000000-report.storageAfter;report.headroomBelow5GB=5000000000-report.storageAfter;fs.writeFileSync('.sites-runtime/mobile/live-flows-proof.json',JSON.stringify(report,null,2));
 }console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error('Mobile live verification failed:',e.message);process.exitCode=1});
