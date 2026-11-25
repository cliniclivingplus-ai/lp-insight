let configuration,worker,pending,sequence=0,unavailable=false;
function reset(){worker?.terminate();worker=undefined;pending=undefined;unavailable=true}
async function questionVector(question,onProgress){
 if(unavailable||typeof Worker==='undefined')return;
 try{
  configuration??=fetch('/api/semantic',{signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():{enabled:false}).catch(()=>({enabled:false}));
  const config=await configuration;if(!config.enabled)return;
  if(pending)return;
  return await new Promise(resolve=>{const id=++sequence;const timer=setTimeout(()=>{reset();onProgress('Search model unavailable; continuing with keyword search…');resolve(undefined)},45000);pending={id};
   try{worker??=new Worker('/semantic-worker.js',{type:'module'});worker.onmessage=({data})=>{if(data.id!==id)return;if(data.type==='loading'){onProgress('Loading meaning-based search (about 62 MB on first use); this browser can cache it…');return}clearTimeout(timer);pending=undefined;if(data.type==='done'){onProgress('Finding relevant passages and checking the answer…');resolve({revision:config.revision,vector:data.vector})}else{reset();onProgress('Search model unavailable; continuing with keyword search…');resolve(undefined)}};worker.onerror=()=>{clearTimeout(timer);reset();onProgress('Search model unavailable; continuing with keyword search…');resolve(undefined)};worker.postMessage({id,question})}catch{clearTimeout(timer);reset();resolve(undefined)}
  });
 }catch{return}
}
window.lpQuestionVector=questionVector;
