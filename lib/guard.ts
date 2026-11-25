// Deterministic guard: numbers and proper names in an answer sentence must occur as whole tokens
// in the cited source text or title. It reduces, but cannot eliminate, unsupported details.
// Only erasable TypeScript syntax is used so the unit test can run with node --experimental-strip-types.

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};

const OPENERS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'according', 'additionally', 'however', 'both', 'while', 'this', 'these', 'that', 'those',
  'it', 'they', 'he', 'she', 'for', 'from', 'as', 'by', 'with', 'one', 'several', 'many', 'some', 'when', 'although', 'overall',
  'also', 'per', 'among', 'studies', 'research', 'people', 'individuals', 'participants', 'another', 'other', 'there', 'here',
  'furthermore', 'moreover', 'similarly', 'meanwhile', 'finally', 'first', 'second', 'third', 'next', 'then', 'because', 'if',
  'elevated', 'raised', 'abnormal', 'high', 'low', 'measuring', 'interpreting', 'reported', 'published', 'specific', 'explore', 'human', 'align', 'embrace', 'consume', 'establish', 'finish', 'front-load', 'basic', 'utilize', 'utilise', 'support', 'achieving', 'distribute', 'spread', 'combine', 'vary', 'balance', 'opt', 'intermittent', 'going', 'meta-analyses', 'consult', 'monitor', 'quality', 'prefer', 'ensure', 'incorporate', 'gradually', 'getting', 'staying', 'drinking', 'having', 'emphasise', 'select', 'replace', 'work', 'talk', 'speak', 'reduce', 'increase', 'prioritise', 'take', 'regular', 'adequate', 'healthy', 'dietary', 'medical', 'insufficient', 'proponents', 'emphasize', 'choose', 'consider', 'include', 'avoid', 'focus', 'aim', 'keep', 'discuss', 'ask', 'limit', 'try', 'eat', 'build', 'prioritize', 'maintain', 'use', 'check', 'seek', 'review', 'compare', 'remember',
]);
const GENERIC_CAPS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'md', 'phd', 'video', 'transcript', 'book', 'podcast', 'article', 'episode', 'study', 'trial',
  'library', 'source', 'sources', 'document', 'chapter', 'page', 'part', 'show', 'channel',
]);

function words(text: string): string[] {
  return text.toLowerCase().replace(/[’‘]/g, "'").split(/[^\p{L}\p{N}']+/u).filter(Boolean);
}

// Replace spelled-out numbers with digits ("twenty five" / "twenty-five" -> 25, "two hundred" -> 200).
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  const normalized = text.toLowerCase().replace(/[’‘]/g, "'");
  for (const m of normalized.matchAll(/(?<![\p{L}\p{N}_.])[-+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?![\p{N}_]|\.\d)(?=$|[^\p{L}]|(?:mg|mcg|ug|iu|ml|kg|g)\b)/gu)) out.add(String(Number(m[0].replaceAll(',', ''))));
  // Keep punctuation so separate counts ("two, five") cannot become a compound number.
  const tokens = normalized.replace(/(?<=[a-z])-(?=[a-z])/g, ' ').match(/[a-z]+|[^\s]/g)||[];
  const scales:Record<string,number>={thousand:1000,million:1000000,billion:1000000000};
  for (let i = 0; i < tokens.length; i++) {
    if(!Object.hasOwn(UNITS,tokens[i])&&!Object.hasOwn(TENS,tokens[i]))continue;
    let j=i,total=0,group=0,last='',lastScale=Infinity;
    while(j<tokens.length){
      const t=tokens[j];
      if(t==='and'&&(last==='hundred'||last==='scale')&&(Object.hasOwn(UNITS,tokens[j+1])||Object.hasOwn(TENS,tokens[j+1]))){j++;continue}
      if(Object.hasOwn(UNITS,t)){
        const n=UNITS[t];if(last==='unit'||(last==='tens'&&(n===0||n>=10)))break;
        group+=n;last='unit';j++;continue;
      }
      if(Object.hasOwn(TENS,t)){
        if(last==='unit'||last==='tens')break;
        group+=TENS[t];last='tens';j++;continue;
      }
      if(t==='hundred'&&last==='unit'&&group>0&&group<10){group*=100;last='hundred';j++;continue}
      if(Object.hasOwn(scales,t)&&group>0&&scales[t]<lastScale){total+=group*scales[t];group=0;lastScale=scales[t];last='scale';j++;continue}
      break;
    }
    let value=String(total+group);
    if(tokens[j]==='point'&&Object.hasOwn(UNITS,tokens[j+1])&&UNITS[tokens[j+1]]<10){let decimal='';j++;while(Object.hasOwn(UNITS,tokens[j])&&UNITS[tokens[j]]<10){decimal+=UNITS[tokens[j]];j++}value=String(Number(value+'.'+decimal))}
    out.add(value);i=j-1;
  }
  return out;
}

function nameBase(w: string): string {
  return w.replace(/'s$/, '').replace(/^'+|'+$/g, '');
}

export function groundedIn(sentenceText: string, sourceText: string): {ok: boolean; missing: string[]} {
  const missing: string[] = [];
  // Mixed-study transcripts can contain mutually inconsistent diet restrictions.
  // Do not resolve that contradiction into a factual restriction in the answer.
  const source=sourceText.replace(/\s+/g,' '),sentence=sentenceText.replace(/\s+/g,' ');
  if((/\blow[- ]carb(?:ohydrate)?s? and low[- ]fat (?:levels?|intake|restrictions?|requirements?)[^.]{0,40}\bketo(?:genic)?\b/i.test(sentence)||/\bketo(?:genic)? diet(?:'s)?[^.]{0,80}\blow(?: (?:levels?|amounts?))?(?: of)? (?:carbohydrates?|carbs?) and (?:dietary )?fats?\b/i.test(sentence))&&/\bketo(?:genic)? diet is (?:all|high in) fat\b/i.test(source))missing.push('conflicting-diet-restrictions');
  const haveNumbers = numbersIn(sourceText);
  for (const n of numbersIn(sentenceText)) if (!haveNumbers.has(n)) missing.push(n);

  const haveWords = new Set<string>();
  for (const w of words(sourceText)) {
    const b = nameBase(w).replace(/\.+$/, '');
    if (!b) continue;
    haveWords.add(b);
  }

  const raw = sentenceText.replace(/[’‘]/g, "'").split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
  raw.forEach((w, i) => {
    if (!/^\p{Lu}/u.test(w)) return;
    const base = nameBase(w.toLowerCase());
    if (base.length < 2 || GENERIC_CAPS.has(base) || Object.hasOwn(UNITS,base) || Object.hasOwn(TENS,base) || ['hundred','thousand','million','billion'].includes(base)) return;
    if (i === 0 && OPENERS.has(base)) return;
    // A capitalized opening verb can be an inflection of a word in the evidence,
    // e.g. Lower versus lowering. Acronyms and unknown opening names stay strict.
    if(i===0&&w!==w.toUpperCase()){
      const forms=[base+'s',base+'es',base+'ed',base+'ing'];
      if(base.endsWith('e'))forms.push(base.slice(0,-1)+'ing',base+'d');
      if(base.endsWith('ing'))forms.push(base.slice(0,-3),base.slice(0,-3)+'e');
      if(base.endsWith('ed'))forms.push(base.slice(0,-2),base.slice(0,-1));
      if(forms.some(form=>haveWords.has(form)))return;
    }
    for (const part of base.split('-')) {
      if (part.length < 2) continue;
      const found = haveWords.has(part);
      if (!found && !missing.includes(part)) missing.push(part);
    }
  });
  return {ok: missing.length === 0, missing};
}
// Conservative source-kind and comparative-attribution checks complement quote matching.
export function sourceMetadataGrounded(sentence:{text:string;evidence:{source_id:number}[]},sources:{id:number;collection:string}[],question=''){
 if(/low[- ]carb|ketogenic/i.test(question)&&/mediterranean/i.test(question)&&/both (?:carbohydrates?|carbs?) and (?:dietary )?fat|both (?:dietary )?fat and (?:carbohydrates?|carbs?)/i.test(sentence.text))return false;
 const cited=sources.filter(source=>sentence.evidence.some(e=>e.source_id===source.id));
 const prefix=/^(?:(?:according to|as (?:stated|noted|described|explained) in|in)\s+)?(?:the\s+)?(video|transcript|book|article)\b/iu.exec(sentence.text.trim());
 if(prefix){const kind=prefix[1].toLowerCase();if((kind==='video'||kind==='transcript')&&!cited.some(c=>c.collection==='videos'))return false;if(kind==='book'&&!cited.some(c=>c.collection==='books'))return false;if(kind==='article'&&!cited.some(c=>!['books','videos'].includes(c.collection)))return false}
 // Without a named comparator, "more effective" can imply an unsupported head-to-head result.
 if(/\bcompar\w*|\bversus\b|\bvs\b/iu.test(question)&&/\b(?:more effective|superior|better results)\b/iu.test(sentence.text)&&!/\b(?:than|compared (?:with|to)|relative to)\b/iu.test(sentence.text))return false;
 return true;
}

// Conservative nutrition policy: omit animal-food statements rather than risk an endorsement.
// Exact plant alternatives are removed first; unrelated animal ingredients still fail.
export function plantBasedOnly(text:string){
 // Mask only immediately qualified plant substitutes, never an entire sentence or list.
 // Vegetarian/veggie meals can still contain dairy/eggs, so 'veggie' is limited to explicit meat substitutes.
 const substitutes=text.replace(/\b(?:vegan|plant[- ]based)\s+(?:bacon|sausages?|ham|chicken|beef|pork|meat|burgers?|nuggets?|fish(?!\s+oil\b))\b/gi,'plant substitute').replace(/\bveggie\s+(?:bacon|sausages?|burgers?|nuggets?)\b/gi,'plant substitute');
 const normalized=substitutes.toLowerCase().replace(/[’‘]/g,"'").replace(/\b(?:soy|soya|almond|oat|coconut|rice|hemp|cashew|pea|plant[- ]based|vegan|non[- ]dairy)\s+(?:milk|yogurt|yoghurt|cheese|butter|cream|protein)\b/g,'plant alternative').replace(/\b(?:peanut|almond|cashew|nut|seed|cocoa|shea) butter\b/g,'plant spread').replace(/\b(?:eggplant|nutmeg|butternut)\b/g,'plant food');
 if(/\b(?:meat|beef|pork|lamb|mutton|veal|venison|bacon|ham|sausage|poultry|chicken|turkey|duck|fish|salmon|tuna|sardines?|mackerel|cod|seafood|shellfish|shrimp|prawns?|crab|lobster|oysters?|mussels?|eggs?|dairy|milk|cheese|yogurt|yoghurt|butter|ghee|cream|whey|casein|gelatin|gelatine|collagen|bone broth|lard|tallow|honey|bee pollen|royal jelly|cod liver oil|fish oil|animal[- ]derived|animal[- ]based)\b/i.test(normalized))return false;
 // Recommending supplements/protein products requires an explicit compatible origin.
 const recommends=/\b(?:take|use|choose|consider|try|add|include|recommend|recommended|supplement with|opt for)\b/i.test(text);
 const product=/\b(?:supplements?|vitamin d3|omega[- ]?3|protein powders?|protein shakes?)\b/i.test(text);
 if(recommends&&product&&!/\b(?:vegan|plant[- ]based|alga[el]|algae[- ]derived|lichen[- ]derived|microbial|fermentation[- ]derived)\b/i.test(text))return false;
 return true;
}

// Do not turn a general patient question into an inferred individual diagnosis.
export function patientAdviceSafe(text:string){
 return !/\b(?:stop(?:ping)?|discontinu(?:e|ing))\b[^.]{0,45}\b(?:diet|keto(?:genic)?)\b|\b(?:root|underlying|pathophysiological)[ -]causes?\b|\b(?:your|the patient['’]?s|this patient['’]?s)\b[^.]{0,70}\b(?:is caused by|is due to|results from)\b/i.test(text);
}


// Quote existence is not entailment: preserve explicit clinical populations and action objects.
export function evidenceScopeGrounded(sentence:{text:string;evidence:{source_id:number;quote:string}[]},sources:{id:number;content:string}[]){
 const text=sentence.text;
 // A citation cannot establish an inventory-wide absence of evidence. Coverage gaps belong in server metadata.
 if(/\b(?:retrieved|supplied|library|passages)\b[^.]{0,100}\b(?:do not|does not|cannot|lack|no evidence|not establish|not provide)\b/i.test(text))return false;
 const quotes=sentence.evidence.map(e=>e.quote).join(' ');
 if(/\b(?:study|trial|research)\b/i.test(text)&&/\bhealthy men\b/i.test(quotes)&&!/\bhealthy men\b/i.test(text))return false;
 if(/\bobservational\b/i.test(text)&&!/observational|cohort|cross[- ]sectional|case[- ]control|survey|associated|association|correlat/i.test(quotes))return false;
 if(/prevent(?:ing)? (?:nighttime|night[- ]time|nocturnal) awakenings/i.test(text)&&!/alcohol[- ](?:related|induced|caused)/i.test(text))return false;
 if(/\b(?:reduced|lower|higher|increased) risk\b[^.]{0,100}\b(?:relative|compared)\b/i.test(quotes)&&/\b(?:support|improv|prevent|reduce|help)\w*/i.test(text)&&!/associated|association|correlat|linked/i.test(text))return false;

 if(/\b(?:clinicians?|doctors?|physicians?)\b/i.test(text)&&!/\b(?:clinicians?|doctors?|physicians?|medical professionals?)\b/i.test(quotes))return false;
 if(/\bmedication|\bmedicine|\binsulin dose/i.test(text)&&!/\bmedication|\bmedicine|\binsulin|\bdrug/i.test(quotes))return false;
 const mechanism=/insulin resistance|carbohydrate intolerance|glucose intolerance|mask(?:s|ing)?|fat accumulation|ectopic fat|pathophysiolog|underlying (?:issue|reason|cause)/i.test(text);
 // Do not assign a fiber-specific mechanism to proteins merely because both are recommended.
 if(/\bproteins?\b/i.test(text)&&/\b(?:trap|traps|bind|binds|binding|carry|carries|remove|removes)\b/i.test(text)&&!sentence.evidence.some(e=>/\bproteins?\b/i.test(e.quote)&&/\b(?:trap|traps|bind|binds|binding|carry|carries|remove|removes)\b/i.test(e.quote)))return false;
 if(/saturated fat/i.test(text)&&/too much saturated fat|excess(?:ive)? saturated fat/i.test(quotes)&&!/too much|excess|high|large|higher/i.test(text))return false;
 const cited=sentence.evidence.map(e=>sources.find(s=>s.id===e.source_id)?.content||'').join(' ');
 if(mechanism&&/type[- ,]*(?:2|two) diabetes|adult[- ]onset/i.test(cited)&&!/type[- ,]*(?:2|two) diabetes|adult[- ]onset/i.test(text))return false;
 if(/type[- ,]*(?:2|two) diabetes|adult[- ]onset/i.test(quotes)&&!/type[- ,]*(?:2|two) diabetes|adult[- ]onset/i.test(text))return false;
 return true;
}
