// Discussion-partner layer: labeled analysis, protocol mode, conversation history, next questions.
// Uses mocked model stages; it proves the server-side rules, not live model quality.
const fs = require('fs'), ts = require('typescript'), assert = require('node:assert/strict');
function load(file, bindings = {}) {
  const m = {exports: {}};
  new Function('exports', 'require', 'module', ...Object.keys(bindings), ts.transpileModule(fs.readFileSync(file, 'utf8').replace(/^import .*;\r?\n/gm, ''), {compilerOptions: {module: 1, target: 9}}).outputText)(m.exports, require, m, ...Object.values(bindings));
  return m.exports;
}
const g = load('lib/grounded.ts'), r = load('lib/retrieval.ts',{...load('lib/clinical-guidance.ts'),medlineForTopics:async()=>({sources:[],status:'disabled'})}), guard = load('lib/guard.ts'), disc = load('lib/discussion.ts', guard);
const filters = {plantBasedOnly: guard.plantBasedOnly, unsafeDirective: t => /\b(dose|dosage|stop taking|discontinue)\b/i.test(t)};

// --- unit: protocol detection
assert.equal(disc.detectProtocol('Can you make a protocol for improving sleep?'), true);
assert.equal(disc.detectProtocol('Build me a step by step plan to lower cholesterol'), true);
assert.equal(disc.detectProtocol('Create a meal plan for the week'), true);
assert.equal(disc.detectProtocol('What does the library say about fasting?'), false);
assert.equal(disc.detectProtocol('I plan to eat more beans'), false);
assert.equal(disc.detectProtocol('Make a sleep protocol\nClarification: Why does that help?'),false);
assert.equal(disc.detectProtocol('Discuss weight\nPrior recommendation: establish a routine.\nClarification: so what type of sustainable lifestyles?'),false);
assert.equal(r.requestNeedsSteps('Based on that, make a sleep protocol'),true);
assert.equal(r.answerMeetsRequest('How do sleep and blood sugar relate?',[{section:'Explanation',text:'A supported explanation.'}]),true);
const sleepQueries=r.nextStepTopics('Discuss blood sugar\nClarification: Make a protocol for sleep and morning energy',[{question:'Old context',queries:['blood sugar']}]);assert.ok(sleepQueries.at(-1).queries.includes('sleep regularity'));

assert.equal(disc.stripRepeatedPhaseLabel({phase:'Phase 1: Foundations',text:'Phase 1: Foundations. Choose beans.'}).text,'Choose beans.');
assert.equal(disc.stripRepeatedPhaseLabel({phase:'Phase 1: Foundations',text:'Choose 2 servings of beans.'}).text,'Choose 2 servings of beans.');
const req='Make a plant-based protocol to improve my sleep and morning energy';
const step=(text,quote)=>({section:'Practical next steps',text,evidence:[{quote}]});
assert.equal(disc.protocolGoalCheck(step('Include B12 daily.','Everybody on a vegan diet needs B12.'),req).ok,false);
assert.equal(disc.protocolGoalCheck(step('Eat earlier for more morning energy.','People who eat earlier have lower blood glucose.'),req).ok,false);
assert.equal(disc.protocolGoalCheck(step('Choose a whole-food pattern to improve sleep.','A plant-food pattern was associated with better sleep quality.'),req).ok,false);
assert.equal(disc.protocolGoalCheck(step('Consider a whole-food pattern, which was associated with better sleep quality.','A plant-food pattern was associated with better sleep quality.'),req).ok,true);
assert.equal(disc.protocolGoalCheck(step('Eat melatonin-rich berries.','Melatonin in berries may explain sleep improvements.'),req).ok,false);
assert.equal(disc.protocolGoalCheck(step('Consider melatonin-rich berries; the proposed link to sleep is tentative.','Melatonin in berries may explain sleep improvements.'),req).ok,true);
assert.equal(disc.protocolGoalCheck(step('Keep a consistent bedtime.','Keep a consistent bedtime to support sleep.'),req).ok,true);
const coverage=disc.protocolGoalCoverage([{evidence:[{quote:'Keep a consistent bedtime to support sleep.'}]}],req);assert.equal(coverage.sleep_evidence,true);assert.equal(coverage.energy_evidence,false);
assert.equal(r.answerMeetsRequest('ways to help with weightloss',[{section:'Practical next steps',text:'Choose beans.'}]),true);
assert.equal(r.requestNeedsSteps('what are the ways to help a person with weightloss fluctuations'),true);
assert.equal(r.requestNeedsSteps('so what type of sustainable lifestyles can be given to them'),true);
const weightTopics=r.nextStepTopics('ways to help with weightloss fluctuation', [{question:'Weight',queries:['weight fluctuation']}]);assert.ok(weightTopics.some(t=>t.queries.includes('calorie density vegetables beans')));assert.ok(weightTopics.some(t=>t.queries.includes('self monitoring weight')));
assert.deepEqual([...r.coveredAnswerTopics([{topic:0}],{answers_request:true,covered_topics:[]})],[0]);assert.deepEqual([...r.coveredAnswerTopics([],{answers_request:true,covered_topics:[0]})],[]);
assert.ok(!disc.protocolWriterFor('Build a weight-loss plan').includes('CURRENT sleep/energy'));
// --- unit: history sanitising
const h = disc.cleanHistory([{q: 'a'.repeat(900), a: 'b'.repeat(900)}, {q: ' ', a: 'x'}, {q: 'second', a: 'answer'}, 7, null, {q: 'three', a: 1}, {q: 'four', a: ''}, {q: 'five', a: ''}]);
assert.ok(h.length <= 4);
assert.ok(h.every(t => t.q.length <= 300 && t.a.length <= 500 && t.q.trim()));
assert.deepEqual(disc.cleanHistory('nope'), []);

// --- unit: analysis rules
const base = ['Beans provide plant protein and fiber.', 'Whole grains contain fiber and help people feel full.'];
assert.equal(disc.analysisItemOk('Together these suggest pairing beans with whole grains is a reasonable way to cover protein and fiber.', base, 'plant meals', filters), true);
assert.equal(disc.analysisItemOk('Beans lower cholesterol by 15 percent.', base, 'plant meals', filters), false, 'invented number');
assert.equal(disc.analysisItemOk('Quinoa and tempeh would complement these foods.', base, 'plant meals', filters), false, 'invented names');
assert.equal(disc.analysisItemOk('Together these suggest a reasonable approach; consider the dose carefully.', base, 'plant meals', filters), false, 'directive');
assert.equal(disc.analysisItemOk('See https://example.com for more.', base, 'plant meals', filters), false, 'url');
assert.equal(disc.analysisItemOk('Quinoa and tempeh would complement these foods.',base,'Should I use Quinoa and tempeh?',filters),false,'question is not evidence');
assert.equal(disc.nextQuestionOk('Which goal matters most to you?', filters), true);
assert.equal(disc.nextQuestionOk('Do you eat 3 meals a day?', filters), false, 'digits');
assert.equal(disc.nextQuestionOk('Tell me more', filters), false, 'not a question');

// --- route: mocked stages
const claims = [
  ['Answer', 'Beans provide plant protein and fiber.', null],
  ['Explanation', 'Whole grains contain fiber and help people feel full.', null],
  ['Practical next steps', 'Choose beans at lunch.', 'Phase 1: Foundations'],
  ['Practical next steps', 'Add whole grains to dinner.', 'Phase 2: Building'],
];
const source = {id: 1, document_id: 'one', title: 'Library evidence', collection: 'books', content: claims.map(c => c[1]).join(' ') + ' Lentils are legumes.'};
const seen = {planner: null, writer: null, checker: null, writerInstr: ''};
function makeRoute(draftExtra, verdicts) {
  return load('app/api/answer/route.ts', {
    ...g, ...r, ...guard, ...disc,
    parseSemantic: () => undefined, allowed: async () => true, sessionKey: async () => 'test',
    json: (body, status = 200) => Response.json(body, {status}), aiConfigured: () => true, aiProvider: () => 'test',
    query: async sql => sql.includes('RETURNING id') ? [{id: 1}] : [],
    retrieveTopics: async () => [source],
    structured: async (instructions, input, schema, name) => {
      if (name === 'search_plan') { seen.planner = input; return {question: input.question, topics: [{question: 'Plan', queries: ['plant meals']}, {question: 'Practical applications', queries: ['plant options']}], answer_style: 'summary', personal_medical: false, clarification_kind: 'none'}; }
      if (name === 'evidence_check') {
        seen.checker = input;assert.ok(input.sentences.every((s,i)=>!('_i' in s)&&s.index===i),'checker gets explicit filtered positions, never original draft indices');
        assert.match(instructions, /ANALYSIS CHECK/);
        return {answers_request: true, relevant: true, covered_topics: [0], checks: input.sentences.map(s => ({index:s.index,supported:true,action_supported:true,goal_relevant:true,benefits_supported:true})), analysis_checks: verdicts(input)};
      }
      seen.writer = input; seen.writerInstr = instructions;
      return {status: 'answered', sentences: claims.map(([section, text, phase]) => ({topic: 0, section, text, ...(phase ? {phase} : {}), evidence: [{source_id: 1, quote: text}]})), ...draftExtra};
    },
  });
}
const request = body => new Request('https://test.local/api/answer', {method: 'POST', headers: {host: 'test.local', origin: 'https://test.local'}, body: JSON.stringify(body)});

(async () => {
  const analysis = [
    {text: 'Together these suggest pairing beans with whole grains is a reasonable way to cover protein and fiber.', builds_on: [0, 1]},
    {text: 'Beans lower cholesterol by 15 percent.', builds_on: [0]},
    {text: 'Whole grains and beans work well together overall.', builds_on: [9]},
    {text: 'Together these suggest a balanced combination is likely a practical approach.', builds_on: [0, 1]},
  ];
  const route = makeRoute(
    {analysis, next_questions: ['Which goal matters most to you?', 'Do you eat 3 meals a day?', 'How much time do you have to cook?']},
    input => input.analysis.map(a => ({index: a.index, ok: a.index !== 3})),
  );

  // protocol request with history
  const response = await route.POST(request({
    question: 'Please create a protocol for a plant-based lunch routine',
    history: [{q: 'What should I eat for protein?', a: 'Beans provide plant protein.'}],
  }));
  const body = await response.json();
  assert.equal(body.status, 'answered');
  assert.equal(body.mode, 'protocol');
  assert.equal(body.topics.length,1);assert.deepEqual(body.unanswered,[]);
  assert.equal(body.protocol_partial,true);assert.equal(body.partial,true);assert.match(body.message,/partial protocol/);
  assert.match(body.message, /clinician review/);
  assert.match(seen.writerInstr, /PROTOCOL MODE/);
  assert.equal(seen.writer.current_request,'Please create a protocol for a plant-based lunch routine');
  assert.equal(seen.checker.current_request,'Please create a protocol for a plant-based lunch routine');
  assert.match(seen.writerInstr, /DISCUSSION PARTNER/);
  assert.deepEqual(seen.writer.conversation, [{q: 'What should I eat for protein?', a: 'Beans provide plant protein.'}]);
  assert.deepEqual(seen.planner.conversation, [{q: 'What should I eat for protein?', a: 'Beans provide plant protein.'}]);
  assert.ok(body.sentences.every(s => !('_i' in s)), 'internal index must not leak');
  assert.deepEqual(body.sentences.filter(s => s.phase).map(s => s.phase), ['Phase 1: Foundations', 'Phase 2: Building']);
  // analysis: only the sound item survives (invented number, unknown builds_on, and checker-rejected items are dropped)
  assert.deepEqual(body.analysis, ['Together these suggest pairing beans with whole grains is a reasonable way to cover protein and fiber.']);
  assert.deepEqual(body.next_questions, ['Which goal matters most to you?', 'How much time do you have to cook?']);
  // analysis is never a sentence with evidence and never adds citations
  assert.equal(body.citations.length, 1);

  const gappedClaims=claims.map(([section,text,phase],i)=>({topic:0,section,text:i===2?'Eat fish daily.':text,...(phase?{phase}:{}),evidence:[{source_id:1,quote:i===2?'Lentils are legumes.':text}]}));
  const gap=await(await makeRoute({sentences:gappedClaims},()=>[]).POST(request({question:'Create a plant-based meal protocol'}))).json();assert.equal(gap.status,'answered');assert.equal(gap.sentences.length,3);assert.ok(gap.protocol_partial);assert.ok(!gap.sentences.some(s=>/fish/i.test(s.text)));
  // ordinary question: discussion mode, no protocol note
  const plain = await (await makeRoute({}, () => []).POST(request({question: 'Why do beans help?'}))).json();
  assert.equal(plain.mode, 'discussion');
  assert.doesNotMatch(plain.message, /clinician review/);
  assert.deepEqual(plain.analysis, []);
  assert.deepEqual(plain.next_questions, []);

  assert.deepEqual(disc.renumberPhases([{phase:'Phase 2: Daytime'},{phase:'Phase 2: Daytime'},{phase:'Protocol Scope'},{phase:'Phase 4: Habits'},{}]).map(s=>s.phase),['Phase 1: Daytime','Phase 1: Daytime','Protocol Scope','Phase 2: Habits',undefined]);
  console.log('Passed phase renumbering, protocol detection, history cleaning, analysis rules, protocol/phase output, history passed to planner and writer, analysis and next-question filtering.');
})().catch(e => { console.error(e); process.exitCode = 1; });
