export function isConnectionError(error){
 const seen=new Set();for(let item=error;item&&!seen.has(item);item=item.cause){seen.add(item);const message=String(item.message||'');if(/STOP_|MISMATCH|NOT_COMPLETE|VERIFICATION_FAILED|RECONCILIATION|UNAUTHORIZED|FORBIDDEN|QUOTA/i.test(message))return false}
 seen.clear();for(let item=error;item&&!seen.has(item);item=item.cause){seen.add(item);if(['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH','EPIPE','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'].includes(item.code))return true;if([502,503,504].includes(Number(item.status||item.statusCode)))return true;if(/\b(fetch failed|failed to fetch|network request failed|networkerror|network is unreachable|socket hang up|connection (?:closed|reset|refused)|connect timeout)\b/i.test(String(item.message||'')))return true}return false;
}
export async function localBusyRetry(action,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onBusy=async()=>{}){for(let attempt=0;;attempt++){try{return await action()}catch(error){if(attempt>=6||!/^SQLITE_(BUSY|LOCKED)(?:_|$)/.test(String(error.code||'')))throw error;await onBusy();await sleep(Math.min(2000,100*2**attempt))}}}
export async function uploadWithRetry({attempt,readStatus,save,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let retries=0;while(true){const code=await attempt();if(code===0)return;const status=readStatus();if(status.operation!=='upload'||status.retryable!==true||status.phase!=='waiting-for-network')throw Error('Guarded upload stopped: '+(status.error||'non-retryable failure'));
 const delay=Math.min(300000,15000*2**Math.min(retries++,5));save({phase:'waiting-for-network',retries,retryAfterMs:delay,error:status.error});await sleep(delay);save({phase:'guarded-upload',retries});
 }
}
