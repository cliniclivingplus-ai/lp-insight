// Discussion-partner layer: labeled analysis, protocol mode, conversation history and follow-up questions.
// Facts still come only from cited, verified library sentences. "Analysis" items may only connect or weigh
// those verified sentences; they are labelled as reasoning in the UI and are never treated as evidence.
import {groundedIn, numbersIn} from './guard';

export type DiscussionFilters = {plantBasedOnly: (text: string) => boolean; unsafeDirective: (text: string) => boolean};

const PROTOCOL_WORDS = /\b(protocol|regimen|step[- ]by[- ]step|roadmap|programme|program|routine)\b|\b(?:make|build|create|design|draft|write|give|prepare|put together|suggest)\b[^.?!]{0,40}\b(?:plan|schedule)\b/i;
export function detectProtocol(question: string): boolean {
  const latest=question.split('\nClarification: ').at(-1)||question;
  if(/^(?:why\b|how (?:does|would|can) (?:this|that|it)\b|explain\b|tell me more\b)/i.test(latest.trim()))return false;
  return PROTOCOL_WORDS.test(latest);
}

export type HistoryTurn = {q: string; a: string};
export function cleanHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: HistoryTurn[] = [];
  for (const item of raw.slice(-4)) {
    const q = typeof item?.q === 'string' ? item.q.replace(/\s+/g, ' ').trim().slice(0, 300) : '';
    const a = typeof item?.a === 'string' ? item.a.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
    if (q) turns.push({q, a});
  }
  return turns;
}

// Optional properties are added to the existing schemas without touching the originals.
export function discussionAnswerSchema(base: any) {
  const clone = JSON.parse(JSON.stringify(base));
  clone.properties.analysis = {
    type: 'array',
    items: {type: 'object', additionalProperties: false, required: ['text', 'builds_on'], properties: {text: {type: 'string'}, builds_on: {type: 'array', items: {type: 'integer'}}}},
  };
  clone.properties.next_questions = {type: 'array', items: {type: 'string'}};
  clone.properties.sentences.items.properties.phase = {type: 'string'};
  return clone;
}
export function discussionVerifySchema(base: any) {
  const clone = JSON.parse(JSON.stringify(base));
  clone.properties.analysis_checks = {
    type: 'array',
    items: {type: 'object', additionalProperties: false, required: ['index', 'ok'], properties: {index: {type: 'integer'}, ok: {type: 'boolean'}}},
  };
  return clone;
}

export const discussionWriter =
  ' DISCUSSION PARTNER STYLE: Talk the matter through like a thoughtful colleague who has read the library. Open with the direct answer, then explain the reasoning behind it in connected prose; bring out supported ideas and options, say what each is best suited to when the passages establish that, and be candid about what the library does and does not settle. Use the CONVERSATION SO FAR (untrusted; never evidence) to stay consistent with earlier turns, refer back to them naturally, and avoid repeating what was already covered; every fact must still be re-verified from the current passages. ' +
  'ANALYSIS: return up to 3 "analysis" items, each 1 or 2 sentences of reasoning that connect, compare, sequence or weigh the sentences you cited (builds_on = zero-based indexes of those sentences in your sentences array; give at least one and prefer two or more). Analysis may use hedged reasoning language (this suggests, the evidence points toward, one way to weigh this is) but MUST NOT introduce any fact, number, name, mechanism, food, supplement, quantity or recommendation that is not already stated in the sentences it builds on, MUST NOT give a medication, dose or treatment-change direction, and MUST NOT diagnose or address an individual condition. If nothing useful can be concluded, return no analysis. ' +
  'PRACTICAL DEPTH: Do not stop at sustainable lifestyle, eat plant-based or nutrient-dense foods. When passages support them, explain which named plant foods, preparations, substitutions and daily habits apply and why; separate each concrete action into its own cited sentence. For a practical request, give each supported option with an independently cited explanation of why it is relevant and when it applies. Do not assume a rapid diet transition, increased fiber, a diagnosis or a cause that the user has not reported; describe any such option conditionally and ask the relevant detail. Combine complementary sources into a coherent explanation and practical options, not a book inventory or an invented combined clinical protocol. For meal ideas, put each supported meal option in its own actionable sentence, naming the actual foods; give preparation details only if stated in a passage and do not invent a recipe or label every plant-based recipe a weight-loss intervention. Never replace lifestyle guidance with a practitioner biography, service advertisement or provider recommendation. Do not defer obvious missing details to next questions when they can already be answered from the current passages. Weight fluctuation over three months does not establish weight cycling, fat gain, metabolic adaptation or an individual cause. Do not present a general diet mechanism as the explanation for this person. ' +
  'NEXT QUESTIONS: Never re-ask details already supplied in the latest reply or conversation; if enough context is available, return no questions. Prioritize questions about the user goal, actual weight pattern, constraints and preferences; avoid yes/no offers such as would you like examples and avoid proposing food logging unless its relevance was supported. Return up to 3 short questions (each under 120 characters, ending with a question mark) that would help refine the discussion, such as the user goal, constraints or preferences. They must contain no facts or numbers.';

export const scientificWriter =
  ' SCIENTIFIC EXPLANATION: Explain the evidence, not just the conclusion. In a detailed summary answer, use Answer for the finding, Explanation for the supported biological process and what the study actually measured, Connection to your question for its applicable meaning, and Practical next steps for concrete supported options. These are optional sections, not a template to fill without evidence. Each physiological link must be directly established by the cited passages; separate links into independently cited sentences. A measured outcome does not establish its mechanism, and a plausible mechanism does not establish a clinical benefit. Define a technical term in ordinary language only when its definition is supported. Preserve trial versus observational design, participants, comparator, duration, measured outcome and uncertainty when given and relevant; do not infer missing study details from a title or describe a transcript as a trial. Compare sources only on shared outcomes and compatible populations; distinguish agreement from independent proof and do not invent an evidence ranking. Explain a finding\'s relevance to the active goal without identifying the cause of an individual patient\'s problem. Use Limitations for limitations actually stated in a passage; missing retrieval evidence is handled by the app, not a fabricated source claim. If mechanism evidence is unavailable, retain the supported finding without filling the causal gap. For a why/how follow-up, deepen the explanation of the referenced action instead of restarting the whole plan. Show the concise scientific rationale, never private chain-of-thought. Broad starting points remain brief and ask for context first. ' +
  ' NATURAL NUTRITION WORDING: All food and supplement recommendations must still meet the mandatory plant-based policy. Treat this as a selection rule, not a slogan. Do not announce or repeat plant-based in every answer, heading or step; name the actual foods or habits. Mention plant-based explicitly when the user asks, the dietary pattern itself matters to the question, or that qualifier is necessary to accurately describe the evidence or comparison. Do not inject nutrition into a non-nutrition topic. Never delete a meaningful study-population or diet qualifier merely to avoid the phrase.';

export const scientificChecker =
  ' SCIENTIFIC SCOPE CHECK: Independently verify every causal link, technical definition and claimed benefit against its own cited text. An outcome-only quote cannot support a proposed mechanism; a mechanism-only quote cannot support efficacy or a clinical recommendation. Reject observational findings restated as causes, unnamed comparators invented from context, transferred populations/outcomes, and chains assembled from disconnected findings. Do not infer what a trial measured or its duration. Connection to your question must not diagnose an individual or explain their nonresponse without evidence. A limitation must be stated in its cited passage, not inferred from retrieval absence. Short supported answers remain valid when explanatory evidence is missing; never approve filler to meet a length target. Apply the plant-based recommendation restriction regardless of whether the prose uses that label.';

export const clinicalEvidenceWriter=' LABORATORY EVIDENCE DISCUSSION: This response is an educational interpretation, not a prescription for the described person. Give a supported Answer and Explanation about what the named test measures, how published evidence interprets an abnormal result, and what distinctions matter before selecting management. Where supplied NIH guidance supports it, organize the answer as: what the result can mean; why the result alone does not identify the cause; useful assessment steps and their reasons; symptom-dependent urgency; then missing details. Cite each factual sentence and each assessment action. A question about what can I give should not be answered only by listing possible conditions or saying evidence is insufficient. Provide the supported assessment guidance even when no specific treatment can be established. Label NIH clinical_guidance as selected guidance excerpts, not journal studies or PubMed abstracts. Do not infer a cause, diagnose pancreatitis from an enzyme value, or turn salivary/digestive enzyme activity into a claim about raised serum enzyme levels. Do not turn animal experiments or case reports into human treatment recommendations or general causal conclusions. State an evidence-supported assessment/management option only when its conditions and relevance are explicit in its own citation. If no food, supplement or treatment is established, give the useful supported interpretation without inventing one. Questions collecting the result, specimen, reference range, symptoms and existing assessment will be shown separately; do not add a generic instruction to discuss medication with a doctor, especially when medication was not asked about. Every substantive sentence still needs exact supporting evidence. The plant-based food selection rule remains in effect; it does not make an abnormal laboratory value a nutrition problem.';
export const clinicalEvidenceChecker=' EDUCATIONAL LABORATORY SCOPE: The current response explicitly provides evidence context and asks for missing case details, rather than choosing a treatment. For this mode, answers_request can be true for a directly relevant supported interpretation even when only part of the overview survives or its section label is Explanation; judge the meaning, not the presence of an Answer heading. An explicitly partial evidence overview plus missing-detail questions is permitted without a Practical next steps item; do not demand an invented food, supplement or treatment to make it actionable. Reject a risk list or generic disclaimer alone. Verify every retained statement normally. Reject diagnostic inference from an isolated result, salivary-to-serum transfer, animal-to-human transfer, and causal/treatment claims from case reports. Do not require a referral sentence. This scope does not relax quote, nutrition, medication or dose safeguards.';

export const protocolWriter =
  ' PROTOCOL MODE: the user asked for a protocol or plan. Build a library-based protocol. Include ONLY actions with an explicit connection to the CURRENT sleep/energy goal in the cited passage, not generic nutrition completeness. Protein/B12 advice and glucose-only meal timing do not become sleep or energy interventions merely because this is plant-based. Use direct sleep-quality, insomnia, awakenings, tiredness or alertness evidence. If the evidence supports sleep but not morning energy, state the supported sleep focus without promising energy improvement; the app will report the uncovered goal separately. Preserve associations as associations, not proven benefits. For plant-food patterns supported only by observational studies, describe the association explicitly in the step itself (for example, consider a pattern that was associated with better sleep); do not turn it into a proven sleep treatment. For proposed mechanisms or tentative food findings, preserve may/consider/associated language in the step and do not imply all foods with a component have been tested for the same benefit. Avoid broad promises such as preventing nighttime awakenings: an alcohol finding supports only alcohol-related disruption, not every cause of waking. For sleep schedules, prefer explicit sleep-regularity recommendations over a mortality association; if citing an association, retain that qualifier. Each step should be independently usable with its supporting conditions; do not invent prerequisite phases or an escalation schedule. Start with a short Answer (what the protocol is for and the population or scope the evidence supports). Then give 3 to 10 steps, each its own item with section "Practical next steps", a short "phase" label that groups the steps (for example "Phase 1: Foundations", "Phase 2: Building", "Monitoring and review"), a concise instruction, and its own exact supporting evidence. Put phase headings ONLY in the phase property, never repeat them or step numbers inside text; text must contain just the instruction. Use Explanation for why the steps are ordered or chosen, only where supported. Include a monitoring or review step only if a passage supports what to monitor. Use "Limitations" only for limitations explicitly stated in the cited evidence, not invented claims about what the library lacks. Give timeframes, amounts and frequencies only when a passage states them, with their population and units; never invent a schedule. Never include medication doses, medication changes or stopping or starting treatment. Present it as a general educational protocol for clinician review, not an individualized prescription.';

export const analysisChecker =
  ' ANALYSIS CHECK: also review each analysis item and return analysis_checks with one entry per analysis index. Set ok=true only if the item introduces no fact, number, name, mechanism, product or recommendation that is absent from the sentences it builds on, gives no medication or treatment direction, and its reasoning follows from those sentences without overstating certainty or causation.';

const REASONING_VOCAB = new Set([
  'suggests', 'suggest', 'together', 'therefore', 'because', 'whether', 'between', 'overall', 'general', 'reasonable', 'approach', 'priority',
  'balance', 'consider', 'evidence', 'pattern', 'options', 'option', 'combine', 'combined', 'context', 'practical', 'important', 'likely',
  'unclear', 'limited', 'depends', 'depending', 'statements', 'together', 'cannot', 'support', 'supports', 'supported', 'findings', 'established',
  'complement', 'sequence', 'sequencing', 'starting', 'foundation', 'building', 'strongest', 'weighing', 'relevant', 'tradeoff', 'trade-off',
]);

const GENERIC_WORDS = new Set([
  'these', 'those', 'which', 'would', 'could', 'should', 'while', 'their', 'there', 'about', 'other', 'through', 'where', 'being', 'between',
  'without', 'within', 'another', 'across', 'together', 'whether', 'because', 'often', 'since', 'still', 'might', 'every', 'least', 'most',
  'first', 'later', 'after', 'before', 'under', 'above', 'below', 'having', 'making', 'taking', 'using', 'works', 'works', 'based', 'point',
  'points', 'least', 'rather', 'itself', 'themselves', 'otherwise', 'instead', 'enough', 'something', 'anything', 'everything',
]);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || []);
}

// Deterministic checks on one analysis item (the model checker is separate).
export function analysisItemOk(text: string, buildsOnTexts: string[], question: string, filters: DiscussionFilters): boolean {
  const t = text.trim();
  if (t.length < 20 || t.length > 520 || /https?:|www\./i.test(t)) return false;
  if (!filters.plantBasedOnly(t) || filters.unsafeDirective(t)) return false;
  const base = buildsOnTexts.join(' ');
  // Analysis opens with ordinary reasoning words, so its first letter is not treated as a proper name.
  if (!groundedIn(t.charAt(0).toLowerCase() + t.slice(1), base).ok) return false;
  const have = numbersIn(base);
  for (const n of numbersIn(t)) if (!have.has(n)) return false;
  // Heuristic novelty check: several unfamiliar content words suggest a fact that its sources do not state.
  // The independent model check remains the main safeguard; this only catches obvious invented items.
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');
  const known = new Set(words(base).flatMap(w => [w, stem(w)]));
  const mine = words(t).filter(w => !REASONING_VOCAB.has(w) && !GENERIC_WORDS.has(w));
  const novel = mine.filter(w => !known.has(w) && !known.has(stem(w)));
  if (novel.length >= 3 || (mine.length >= 4 && novel.length / mine.length > 0.4)) return false;
  return true;
}

export function nextQuestionOk(q: string, filters: DiscussionFilters): boolean {
  const t = q.trim();
  return t.length >= 8 && t.length <= 140 && t.endsWith('?') && !/[0-9]|https?:/i.test(t) && filters.plantBasedOnly(t) && !filters.unsafeDirective(t);
}

// Map the draft's analysis onto the sentences actually sent to the checker (positions in `sent`).
export function analysisForChecker(draft: any, sent: any[]): {index: number; text: string; builds_on: number[]}[] {
  const raw = Array.isArray(draft?.analysis) ? draft.analysis.slice(0, 3) : [];
  const out: {index: number; text: string; builds_on: number[]}[] = [];
  for (const item of raw) {
    if (typeof item?.text !== 'string' || !Array.isArray(item.builds_on)) continue;
    const positions = [...new Set<number>(item.builds_on.map((i: any) => sent.findIndex(s => s._i === i)))];
    if (!positions.length || positions.some(p => p < 0)) continue;
    out.push({index: out.length, text: item.text.trim(), builds_on: positions});
  }
  return out;
}

export function finalizeAnalysis(
  proposed: {index: number; text: string; builds_on: number[]}[],
  sent: any[], supported: any[], check: any, question: string, filters: DiscussionFilters,
): {text: string; builds_on: number[]}[] {
  const verdicts: any[] = Array.isArray(check?.analysis_checks) ? check.analysis_checks : [];
  const kept: {text: string; builds_on: number[]}[] = [];
  for (const item of proposed) {
    const verdict=verdicts.filter(v=>v.index===item.index);
    if(verdict.length!==1||verdict[0].ok!==true)continue;
    const sources = item.builds_on.map(p => sent[p]);
    if (sources.some(s => !supported.includes(s))) continue;
    if (!analysisItemOk(item.text, sources.map(s => s.text), question, filters)) continue;
    kept.push({text: item.text, builds_on: item.builds_on});
  }
  return kept;
}

export function cleanNextQuestions(draft: any, filters: DiscussionFilters): string[] {
  const raw = Array.isArray(draft?.next_questions) ? draft.next_questions : [];
  return [...new Set<string>(raw.filter((q: any) => typeof q === 'string' && nextQuestionOk(q, filters)).map((q: string) => q.trim()))].slice(0, 3);
}

// Verification can remove a whole phase's steps; renumber "Phase N: title" labels so the protocol reads 1, 2, 3.
export function renumberPhases<T extends {phase?: string}>(sentences: T[]): T[] {
  const order: string[] = [];
  for (const s of sentences) if (typeof s.phase === 'string' && /^Phase\s+\d+/i.test(s.phase) && !order.includes(s.phase)) order.push(s.phase);
  return sentences.map(s => {
    const i = typeof s.phase === 'string' ? order.indexOf(s.phase) : -1;
    return i < 0 ? s : {...s, phase: s.phase!.replace(/^Phase\s+\d+/i, 'Phase ' + (i + 1))};
  });
}

export const protocolNote = 'This protocol is assembled from retrieved evidence as general educational information; it is not an individualized prescription, so have a clinician review it before use. ';


// Decorative phase labels are metadata, not factual claims or patient quantities.
export function stripRepeatedPhaseLabel<T extends {text?:unknown;phase?:unknown}>(sentence:T):T{
 if(typeof sentence.text!=='string'||typeof sentence.phase!=='string')return sentence;
 const phase=sentence.phase.trim();
 if(!/^(?:Phase\s+\d+\s*:[^.!?]{1,65}|Monitoring and Review)$/i.test(phase))return sentence;
 const text=sentence.text.trim();
 if(text.slice(0,phase.length).toLowerCase()!==phase.toLowerCase()||!/^\s*[.:—-]\s+/.test(text.slice(phase.length)))return sentence;
 return {...sentence,text:text.slice(phase.length).replace(/^\s*[.:—-]\s+/,'')};
}


const SLEEP_EVIDENCE=/\b(?:sleep(?:ing|s|iness)?|asleep|insomnia|bedtime|awaken(?:ing|ings)?|wake(?:fulness|up)?|waking)\b/i;
const ENERGY_EVIDENCE=/\b(?:fatigue|alertness|tired(?:ness)?|refresh(?:ed|ing)?|grogg(?:y|iness)|drows(?:y|iness)|vitality)\b|\b(?:morning|daytime|daily)\b[^.]{0,30}\benergy\b/i;
export function protocolGoalCheck(sentence:{section:string;text:string;evidence:{quote:string}[]},request:string):{ok:boolean;reason:string}{
 const sleep=/\bsleep|\binsomnia/i.test(request),energy=/morning energy|fatigue|alertness|tired|daytime energy/i.test(request);
 if(!sleep&&!energy)return {ok:true,reason:'other request'};
 const quotes=sentence.evidence.map(e=>e.quote).join(' ');
 const sleepSupported=SLEEP_EVIDENCE.test(quotes),energySupported=ENERGY_EVIDENCE.test(quotes);
 if(sentence.section==='Practical next steps'&&!((sleep&&sleepSupported)||(energy&&energySupported)))return {ok:false,reason:'step has no direct quoted link to active sleep/energy goal'};
 const benefit=/\b(?:improv\w*|boost\w*|enhanc\w*|support\w*|benefit\w*|reduc\w*|prevent\w*|promot\w*|help\w*|restor\w*)\b/i.test(sentence.text);
 if(benefit&&/\b(?:sleep quality|sleep|insomnia)\b/i.test(sentence.text)&&!sleepSupported)return {ok:false,reason:'sleep benefit absent from quotes'};
 if(benefit&&ENERGY_EVIDENCE.test(sentence.text)&&!energySupported)return {ok:false,reason:'energy benefit absent from quotes'};
 if(/associated|association|correlat|linked|people whose diets|those with lower consumption/i.test(quotes)&&(benefit||sentence.section==='Practical next steps')&&!/associated|association|correlat|linked/i.test(sentence.text))return {ok:false,reason:'association rewritten as an effect'};
 if(sentence.section==='Practical next steps'&&/\b(?:may|might|could)\b/i.test(quotes)&&!/\b(?:may|might|could|consider|uncertain)|associated/i.test(sentence.text))return {ok:false,reason:'tentative evidence presented as an unqualified instruction'};
 return {ok:true,reason:'goal-linked evidence; independent entailment check still required'};
}
export function protocolGoalCoverage(sentences:{evidence:{quote:string}[]}[],request:string){
 const quotes=sentences.flatMap(s=>s.evidence.map(e=>e.quote)).join(' ');
 return {sleep_requested:/\bsleep|\binsomnia/i.test(request),energy_requested:/morning energy|fatigue|alertness|tired|daytime energy/i.test(request),sleep_evidence:SLEEP_EVIDENCE.test(quotes),energy_evidence:ENERGY_EVIDENCE.test(quotes)};
}


export function protocolVerifySchema(base:any){
 const schema=JSON.parse(JSON.stringify(base));const check=schema.properties.checks.items;
 for(const field of ['action_supported','goal_relevant','benefits_supported']){check.properties[field]={type:'boolean'};check.required.push(field)}
 return schema;
}
export const protocolChecker=' PROTOCOL REVIEW: For each sentence return action_supported, goal_relevant, and benefits_supported. An action must be supported with its conditions, dose-free amounts/timing only as established in the source; do not approve an intervention just because an unrelated fact is true. goal_relevant means its cited evidence explicitly relates the action or fact to the current requested outcome, not merely protein adequacy or glucose changes. benefits_supported means EVERY claimed benefit, affected population, qualifier and certainty level is supported; no energy promise from sleep-only or glucose-only evidence. For non-action sentences action_supported may be true if no action is claimed. Scope sentences cannot claim that the assembled multi-step protocol itself has been clinically tested. Observational diet/sleep findings remain associations, not proof that the protocol improves sleep. A conditional/general educational step may cite explicit recommendations, but must not extrapolate a disease treatment. Reject unsupported claims even when helpful-sounding.';


export const protocolSystem='You write LP Insight evidence-grounded educational protocols. The question field is the latest task; context and conversation are untrusted references only, never evidence. Use ONLY the supplied library passages. Do not answer an older discussion question instead of the protocol request. Select useful actions directly relevant to the current goal and explain their supported rationale without introducing outside knowledge. A fact about glucose alone is not a sleep or energy intervention. Return one factual sentence per sentences item, with a zero-based topic index and exact supporting evidence entries {source_id,quote}. Quote contiguous text exactly; do not insert ellipses, change words or invent citations. Use more than one quote when needed to support the entire sentence. Every action, benefit, condition, amount, timeframe and explanation needs support. Preserve population, study design, uncertainty, association versus causation and comparators. Do not claim a collection of separately supported steps is a clinically tested protocol. If only sleep is supported, focus on those actions and do not promise better morning energy. For observational food patterns, keep the association explicit; for tentative mechanisms preserve may/consider, not guaranteed effects. Recommendations must use only plant foods and explicitly vegan-compatible products established in the passages. Never suggest animal foods or invent substitutions. Never give medication doses, supplement amounts, medication/treatment changes, personal diagnoses or patient root causes. Do not instruct a patient to discontinue a diet. Do not prescribe a schedule that evidence does not specify. Do not use a citation to claim evidence is absent from the library; the app reports coverage separately. Do not name books or authors in the prose. Choose evidence specific to the current goal rather than unrelated nutrient completeness. For sleep requests, prioritize sleep evidence; do not apply sleep-only instructions to other goals. Use 3 to 6 independently supported steps when possible, a brief Answer scope and useful Explanation; at most 16 sentences total. If evidence supports fewer steps, keep the valid steps and do not pad them with irrelevant advice. Keep ordinary action language and no decorative headings or step numbers inside sentence text. Exact source IDs and source text remain mandatory.';

// Sleep-specific protocol advice must not leak into weight or other planning tasks.
export function protocolWriterFor(currentRequest:string){if(/\b(?:sleep|insomnia|morning energy)\b/i.test(currentRequest))return protocolWriter;return ' PROTOCOL MODE: choose independently supported actions relevant to the CURRENT requested goal. Explain specific plant-food examples and habits when established, without inventing quantities, benefits or schedules. '+protocolWriter.slice(protocolWriter.indexOf('Start with a short Answer'))}
