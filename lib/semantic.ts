import {query} from './turso';
import common from '../scripts/semantic-common.cjs';
export const semanticRevision=common.REVISION;
export type SemanticInput={revision:string;vector:number[]};
export function parseSemantic(value:unknown):SemanticInput|undefined{
 if(value===undefined||value===null)return;
 const item=value as SemanticInput;
 if(item.revision!==semanticRevision||!common.vectorValid(item.vector))throw Error('INVALID_SEMANTIC_VECTOR');
 return {revision:item.revision,vector:item.vector};
}
let cached:{until:number;ready:boolean}|undefined;
export async function semanticReady(){
 if(process.env.LP_SEMANTIC_ENABLED!=='true')return false;
 if(cached&&cached.until>Date.now())return cached.ready;
 try{const rows=await query('SELECT revision,ready FROM lp_semantic_state WHERE id=1');const ready=rows[0]?.revision===semanticRevision&&rows[0]?.ready===1;cached={until:Date.now()+30000,ready};return ready}catch{return false}
}
export async function semanticMatches(input?:SemanticInput){
 if(!input||!await semanticReady())return [];
 try{
  // Return original parent passages so quote checks and citation locations are unchanged.
  const rows=await query("SELECT c.*,d.title,d.path,d.source_url,d.collection,d.status,vector_distance_cos(v.embedding,vector32(?)) distance FROM vector_top_k('lp_semantic_idx',vector32(?),80) n JOIN lp_semantic_vectors v ON v.id=n.id JOIN lp_chunks c ON c.id=v.chunk_id AND c.document_version=v.document_version JOIN lp_documents d ON d.id=c.document_id AND d.version=c.document_version ORDER BY distance,v.id",[JSON.stringify(input.vector),JSON.stringify(input.vector)]);
  const seen=new Set<number>();return rows.filter((row:any)=>{if(seen.has(row.id)||row.content.length<100)return false;seen.add(row.id);return true}).slice(0,30);
 }catch{console.warn('LP semantic search unavailable; using keywords');return []}
}
export const fuseResults=common.fuse;
