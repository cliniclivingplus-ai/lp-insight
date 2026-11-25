import {AccountError,accountFailure,sameOrigin} from '../../../lib/accounts';
import {beginTurn,finishTurn} from '../../../lib/chats';
import {allowed,query,json} from '../../../lib/turso';
import {currentUser,sessionKey} from '../../../lib/session';
import {parseSemantic,type SemanticInput} from '../../../lib/semantic';
import {runAgent,agentConfigured,agentErrorMessage,providerCode,type HistoryMessage} from '../../../lib/agent';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=300;

const personalMedicalQuestion=(q:string)=>/\bpatient\b/i.test(q)||/\b(my|i|me|should i|can i|do i)\b[^.?!]{0,80}\b(dose|dosage|dosing|mg|medication|medicine|metformin|insulin|prescri\w*|tablet|pill|stop taking|start taking|diagnos\w*)/i.test(q)||/\b(dose|dosage|how (much|many) (mg|units)|exact dose)\b/i.test(q);
function cleanMessages(value:unknown):HistoryMessage[]{
 if(!Array.isArray(value))return [];
 return value.slice(-10).filter((m:any)=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.text==='string'&&m.text.trim()).map((m:any)=>({role:m.role,text:String(m.text).slice(0,3000)}));
}
// Same shared budgets as /api/answer: per session, per 10 minutes for everyone, and per day.
async function withinBudget(){
 const limit=(name:string,fallback:number)=>{const n=Number(process.env[name]);return Number.isInteger(n)&&n>0?n:fallback};
 const perSession=limit('LP_ANSWER_LIMIT_SESSION_10MIN',15),perAll10=limit('LP_ANSWER_LIMIT_ALL_10MIN',60),perAllDay=limit('LP_ANSWER_LIMIT_ALL_DAY',1500);
 const who=(await sessionKey())||'unknown';
 await query('CREATE TABLE IF NOT EXISTS lp_answer_usage (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, session TEXT NOT NULL)');
 const now=Math.floor(Date.now()/1000);
 const inserted=await query('INSERT INTO lp_answer_usage(created_at,session) SELECT ?,? WHERE (SELECT count(*) FROM lp_answer_usage WHERE session=? AND created_at>?)<? AND (SELECT count(*) FROM lp_answer_usage WHERE created_at>?)<? AND (SELECT count(*) FROM lp_answer_usage WHERE created_at>?)<? RETURNING id',[now,who,who,now-600,perSession,now-600,perAll10,now-86400,perAllDay]);
 await query('DELETE FROM lp_answer_usage WHERE created_at<?',[now-86400]);
 return inserted.length>0;
}

export async function POST(request:Request){
 if(!await allowed())return json({error:'Sign in required'},401);
 const origin=request.headers.get('origin');const expected=(request.headers.get('x-forwarded-proto')||new URL(request.url).protocol.replace(':',''))+'://'+request.headers.get('host');
 if(origin!==expected)return json({error:'Request origin rejected'},403);
 if(Number(request.headers.get('content-length')||0)>60000)return json({error:'Request is too large'},413);
 let payload:any,question:string,semantic:SemanticInput|undefined,messages:HistoryMessage[];
 try{
  const body=await request.text();if(body.length>60000)return json({error:'Request is too large'},413);
  payload=JSON.parse(body);question=payload.question;
  if(typeof question!=='string'||!question.trim()||question.length>4000)return json({error:'Enter a question of up to 4,000 characters'},400);
  question=question.trim();semantic=parseSemantic(payload.semantic);messages=cleanMessages(payload.messages);
 }catch{return json({error:'Invalid question or search vector'},400)}
 if(!agentConfigured())return json({error:agentErrorMessage('AI_NOT_CONFIGURED')},503);

 // Saved chats: reserve the turn before streaming, exactly like /api/answer.
 let turn:Awaited<ReturnType<typeof beginTurn>>|undefined;
 if(payload.chatId){
  try{if(!sameOrigin(request))throw new AccountError('Forbidden',403);const user=await currentUser();if(!user)throw new AccountError('Individual sign-in required for saved chats',401);turn=await beginTurn(user.id,payload.chatId,payload)}catch(e){return accountFailure(e)}
 }
 try{if(!await withinBudget()){
  if(turn)await finishTurn(turn,{error:'Question limit reached'}).catch(()=>{});
  return json({error:'You have reached the question limit for now. Please wait a few minutes and try again.'},429);
 }}catch{
  if(turn)await finishTurn(turn,{error:'Usage check failed'}).catch(()=>{});
  return json({error:'The answer could not be started. Please retry.'},503);
 }

 const encoder=new TextEncoder();
 const stream=new ReadableStream({async start(controller){
  let closed=false;
  const send=(event:unknown)=>{if(closed)return;try{controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'))}catch{closed=true}};
  try{
   let result:any;
   try{
    result=await runAgent({question,history:messages,semantic,personalMedical:personalMedicalQuestion(question),emit:send,signal:request.signal});
   }catch(e){
    const code=providerCode(e);console.warn('LP agent failure:',code);
    result={error:agentErrorMessage(code)};
   }
   let saved:any={};
   if(turn){
    try{await finishTurn(turn,result);saved={savedTurn:{id:turn.id,chatId:turn.chatId,revision:turn.revision}}}
    catch{saved={savedTurn:{id:turn.id,chatId:turn.chatId,revision:turn.revision},persistenceError:'The answer could not be saved completely. Keep this page open and copy the answer before leaving.'}}
   }
   send(result.error?{type:'error',error:result.error,...saved}:{type:'final',result:{...result,...saved}});
  }finally{closed=true;try{controller.close()}catch{}}
 }});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});
}
