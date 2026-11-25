// Pure post-processing for agent answers: citations, quotes, safety gates. No I/O, so it can be unit-tested.
export type Src=Record<string,any>;
export type Deps={plantBasedOnly:(text:string)=>boolean;numbersIn:(text:string)=>Set<string>};
export type Evidence={source_id:number;quote:string};
export type Sentence={topic:number;section:string;text:string;evidence:Evidence[];flags?:string[]};
export type Block={t:'h';level:number;text:string}|{t:'p';i:number[]}|{t:'ul'|'ol';items:number[][]};
export type Formatted={blocks:Block[];sentences:Sentence[];citations:Src[];nextQuestions:string[];stats:{policyRemoved:number;doseRemoved:number;uncited:number;figureFlags:number;figureDropped:number;unknownRefs:number}};

const STOP=new Set('that this these those with from have has had were been will would should could their there which about into than then also such more most other some only over under between within without while where when what your they them its are was and for not but can may might the'.split(' '));
const words=(s:string)=>(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>3&&!STOP.has(w));
const MAX_QUOTE=300;

// Finds the passage sentence(s) that best match a claim. The result is always a literal substring of `content`.
export function bestQuote(claim:string,content:string):string|null{
 const wanted=new Set(words(claim));if(!wanted.size||!content)return null;
 const segments:{s:number;e:number}[]=[];
 for(const m of content.matchAll(/[^.!?\n]+[.!?]*/g)){if(m[0].trim().length>=8)segments.push({s:m.index!,e:m.index!+m[0].length})}
 let best:{text:string;score:number}|null=null;
 for(let i=0;i<segments.length;i++)for(const span of [1,2]){
  const last=segments[i+span-1];if(!last)continue;
  let text=content.slice(segments[i].s,last.e).trim();if(text.length<25)continue;if(text.length>MAX_QUOTE)text=text.slice(0,MAX_QUOTE).trim();
  const found=new Set(words(text));let overlap=0;for(const w of wanted)if(found.has(w))overlap++;
  const score=overlap-text.length/4000;
  if(!best||score>best.score)best={text,score};
 }
 const needed=Math.min(2,wanted.size);
 return best&&Math.round(best.score)>=needed&&best.text.length>=12?best.text:null;
}

const REF=/\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\]/g;
export function refsIn(text:string):number[]{
 const out:number[]=[];
 for(const m of text.matchAll(REF))for(const part of m[1].split(/\s*,\s*/)){
  const range=part.split(/\s*[–-]\s*/).map(Number);
  if(range.length===2&&range[1]>=range[0]&&range[1]-range[0]<=10)for(let n=range[0];n<=range[1];n++)out.push(n);
  else if(range.length===1&&Number.isInteger(range[0]))out.push(range[0]);
 }
 return out;
}
export function stripRefs(text:string){return text.replace(REF,'').replace(/\s+([.,;:!?])/g,'$1').replace(/\s{2,}/g,' ').trim()}

// Sentence boundary: terminal punctuation, optional trailing citation markers, then a new capitalised sentence.
export function splitSentences(text:string):string[]{
 const out:string[]=[];let start=0;
 for(const m of text.matchAll(/[.!?](?:\s*\[\d{1,3}(?:\s*[,–-]\s*\d{1,3})*\])*(?=\s+[A-Z0-9“"(*]|\s*$)/g)){
  const end=m.index!+m[0].length;const piece=text.slice(start,end).trim();if(piece)out.push(piece);start=end;
 }
 const rest=text.slice(start).trim();if(rest)out.push(rest);
 return out;
}

// Dose / treatment-change statements are never produced for a personal medical question.
export const doseLike=/\b\d+(\.\d+)?\s?(mg|mcg|µg|ug|iu|units?|ml|g)\b|\b(dose|dosage|dosing)\b|\b(start|begin|stop|increase|reduce|take)\b[^.]{0,40}\b(at night|daily|twice|once|per day|a day)\b/i;
export const treatmentChangeLike=/\b(?:as[- ]needed|on demand)\b|\b(?:reduce|hold|stop|skip|increase|start|discontinue)\b[^.]{0,80}\b(?:insulin|metformin|medications?|medicines?|drugs?|tablets?|pills?)\b/i;
export function extractFollowups(raw:string):{text:string;followups:string[]}{
 const m=/^[ \t]*(?:\*\*)?follow-?ups?(?:\*\*)?\s*:?(?:\*\*)?\s*(.+)$/im.exec(raw);
 if(!m)return {text:raw,followups:[]};
 const followups=m[1].split('|').map(s=>s.replace(/^[\s\-*\d.)]+/,'').trim()).filter(s=>s.length>8&&s.length<200).slice(0,3);
 return {text:raw.replace(m[0],'').trimEnd(),followups};
}

type Unit={kind:'h';level:number;text:string}|{kind:'p'|'ul'|'ol';parts:string[]};
function parseUnits(text:string):Unit[]{
 const units:Unit[]=[];let para:string[]=[];
 const flush=()=>{if(para.length)units.push({kind:'p',parts:[para.join(' ')]});para=[]};
 for(const line of text.replace(/\r/g,'').split('\n')){
  const heading=/^\s{0,3}(#{1,4})\s+(.*\S)\s*$/.exec(line),bullet=/^\s*[-*•]\s+(.*\S)\s*$/.exec(line),number=/^\s*\d{1,2}[.)]\s+(.*\S)\s*$/.exec(line);
  if(!line.trim()){flush();continue}
  if(heading){flush();units.push({kind:'h',level:Math.min(3,Math.max(2,heading[1].length+1)),text:heading[2].replace(/[*_]+/g,'').trim()});continue}
  const list=bullet?{kind:'ul' as const,item:bullet[1]}:number?{kind:'ol' as const,item:number[1]}:null;
  if(list){flush();const last=units[units.length-1];if(last&&last.kind===list.kind)(last as any).parts.push(list.item);else units.push({kind:list.kind,parts:[list.item]});continue}
  para.push(line.trim().replace(/^\|/,'').replace(/\|$/,'').replace(/\s*\|\s*/g,' · '));
 }
 flush();return units;
}

export function formatAnswer(raw:string,byRef:Map<number,Src>,options:{personalMedical:boolean;deps:Deps;dropUnverifiedFigures?:boolean}):Formatted{
 const {text,followups}=extractFollowups(raw);
 const stats={policyRemoved:0,doseRemoved:0,uncited:0,figureFlags:0,figureDropped:0,unknownRefs:0};
 const sentences:Sentence[]=[],blocks:Block[]=[];const cited=new Map<number,Src>();
 const build=(piece:string):number|null=>{
  const refs=[...new Set(refsIn(piece))];const known=refs.filter(r=>byRef.has(r));stats.unknownRefs+=refs.length-known.length;
  const clean=stripRefs(piece);if(!clean||clean.length<2)return null;
  if(!options.deps.plantBasedOnly(clean)){stats.policyRemoved++;return null}
  if(options.personalMedical&&(doseLike.test(clean)||treatmentChangeLike.test(clean))){stats.doseRemoved++;return null}
  if(sentences.length>=60)return null;
  const evidence:Evidence[]=[];const flags:string[]=[];
  for(const ref of known){const src=byRef.get(ref)!;cited.set(src.id,src);const quote=bestQuote(clean,String(src.content||''));if(quote&&evidence.length<2)evidence.push({source_id:src.id,quote})}
  const numbers=options.deps.numbersIn(clean);
  if(numbers.size){
   if(!known.length){flags.push('uncited_figure');stats.figureFlags++}
   else{const corpus=options.deps.numbersIn(known.map(r=>String(byRef.get(r)!.content||'')).join(' '));if([...numbers].some(n=>!corpus.has(n))){flags.push('figure');stats.figureFlags++}}
  }
  if(options.dropUnverifiedFigures&&(flags.includes('figure')||flags.includes('uncited_figure'))){stats.figureDropped++;stats.figureFlags--;return null}
  if(!known.length&&clean.length>90&&!flags.length){flags.push('general');stats.uncited++}
  sentences.push({topic:0,section:'Answer',text:clean,evidence,...(flags.length?{flags}:{})});return sentences.length-1;
 };
 for(const unit of parseUnits(text)){
  if(unit.kind==='h'){blocks.push({t:'h',level:unit.level,text:unit.text});continue}
  const items=unit.parts.map(part=>splitSentences(part).map(build).filter((i):i is number=>i!==null)).filter(i=>i.length);
  if(!items.length)continue;
  if(unit.kind==='p')blocks.push({t:'p',i:items.flat()});else blocks.push({t:unit.kind,items});
 }
 // Drop headings that no longer introduce any content.
 const tidy:Block[]=[];blocks.forEach((b,i)=>{if(b.t==='h'&&(!blocks[i+1]||blocks[i+1].t==='h'))return;tidy.push(b)});
 return {blocks:tidy,sentences,citations:[...cited.values()],nextQuestions:followups,stats};
}
