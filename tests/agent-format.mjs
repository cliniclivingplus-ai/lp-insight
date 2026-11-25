// node --experimental-strip-types tests/agent-format.mjs
import assert from 'node:assert/strict';
import {formatAnswer,bestQuote,refsIn,stripRefs,splitSentences,extractFollowups} from '../lib/agent-format.ts';
const deps={plantBasedOnly:t=>!/\b(fish|chicken|eggs?)\b/i.test(t),numbersIn:t=>new Set((t.match(/\d+(?:\.\d+)?/g)||[]).map(String))};
const content='Soluble fiber binds bile acids in the gut. Trials showed LDL cholesterol fell by 10 percent after 8 weeks of oat intake. Other findings were mixed.';
const byRef=new Map([[1,{id:11,document_id:'d1',title:'Fiber book',content}],[2,{id:12,document_id:'d2',title:'Sleep video',content:'Morning light helps regularity of sleep.'}]]);
// refs and sentence splitting
assert.deepEqual(refsIn('x [1][2] y [3, 4] z [5-7]'),[1,2,3,4,5,6,7]);
assert.equal(stripRefs('Fiber lowers LDL [1] .'),'Fiber lowers LDL.');
assert.equal(splitSentences('First claim [1]. Second claim [2]. Third.').length,3);
// quote is a literal substring and picks the matching sentence
const q=bestQuote('Oat intake lowered LDL cholesterol by 10 percent',content);
assert.ok(q&&content.includes(q)&&/LDL/.test(q),q);
assert.equal(bestQuote('Completely unrelated astronomy statement',content),null);
// formatting: headings, bullets, citations, flags, policy removal, followups
const raw=`## Overview
Oat fiber lowers LDL cholesterol by 12 percent [1]. Eat chicken for protein [2].

- Morning light supports sleep regularity [2].
- Plain framing sentence that has no citation but is long enough to count as an uncited general statement here.

FOLLOWUPS: What dose of oats is studied? | How does fiber bind bile acids? | Is there a sleep effect?`;
const out=formatAnswer(raw,byRef,{personalMedical:false,deps});
assert.equal(out.nextQuestions.length,3);
assert.equal(out.stats.policyRemoved,1);
assert.equal(out.blocks[0].t,'h');
const first=out.sentences[0];
assert.ok(first.flags?.includes('figure'),'12 percent is not in the cited passage');
assert.ok(first.evidence.length===1&&content.includes(first.evidence[0].quote));
assert.equal(out.stats.uncited,1);
assert.equal(out.citations.length,2);
assert.ok(!out.sentences.some(s=>/chicken/i.test(s.text)));
// personal medical dose removal
const dose=formatAnswer('Metformin helps [1]. Take 500 mg twice a day [1].',byRef,{personalMedical:true,deps});
assert.equal(dose.stats.doseRemoved,1);
// unknown refs are dropped, not shown
const unknown=formatAnswer('A claim [9].',byRef,{personalMedical:false,deps});
assert.equal(unknown.stats.unknownRefs,1);assert.equal(unknown.sentences[0].evidence.length,0);
assert.deepEqual(extractFollowups('Body\nFOLLOWUPS: one question here | two question here').followups.length,2);
// strict mode drops sentences whose figures are not in the cited passage
const strict=formatAnswer('Oat fiber lowers LDL cholesterol by 12 percent [1]. Soluble fiber binds bile acids [1]. Trials showed LDL cholesterol fell by 10 percent [1].',byRef,{personalMedical:false,deps,dropUnverifiedFigures:true});
assert.equal(strict.stats.figureDropped,1);assert.equal(strict.sentences.length,2);assert.ok(!strict.sentences.some(s=>/12 percent/.test(s.text)));
console.log('agent-format tests passed');
