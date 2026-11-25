// Run: node --experimental-strip-types scripts/guard-test.mjs
import assert from 'node:assert/strict';
import {groundedIn, numbersIn} from '../lib/guard.ts';

const cases = [
  ['Specific meal ideas include lentil soup.', 'Meal ideas include lentil soup.', true, 'specific is an ordinary sentence opener'],
  ['Explore plant-based recipes.', 'Plant-based recipes are available.', true, 'explore is an ordinary action opener'],
  ['Participants struggled to maintain the strict low-carb and low-fat levels of the keto regimen.', 'They could not maintain very low carb and very low fat. A keto diet is all fat.', false, 'restriction wording with regimen after the claim'],
  ['Medical literature notes that clinicians may consider kidney function when prescribing.', 'Your doctor may take into account your kidney function when prescribing.', true, 'ordinary sentence-opening adjective is not a name'],
  ['The video Low Fat Versus Keto Diet reports lower triglycerides on keto.', 'Low Fat Versus Keto Diet reports lower triglycerides on keto. A keto diet is all fat.', true, 'a comparison title is not a restriction claim'],
  ['The ketogenic diet required very low levels of carbohydrates and fats.', 'They could not maintain very low carb and very low fat. A keto diet is all fat.', false, 'internally contradictory diet restrictions'],
  ['The ketogenic diet lowered triglycerides.', 'The ketogenic diet lowered triglycerides. A keto diet is all fat.', true, 'unrelated supported outcome survives'],
  ['The low-fat group avoided fats.', 'The low-fat group avoided fats. A keto diet is all fat.', true, 'separate low-fat arm is preserved'],
  ['The trial had 225 participants.', 'The trial had two hundred and twenty-five participants.', true, 'hundreds and remainder'],
  ['The trial had 1500 participants.', 'The trial had one thousand five hundred participants.', true, 'compound thousands'],
  ['The result was 25.', 'The result was twenty-five.', true, 'sentence-final quantity'],
  ['The change was 0.5.', 'The change was .5.', true, 'leading decimal'],
  ['The change was 3.5.', 'The change was three point five.', true, 'spelled decimal'],
  ['The change was 2.', 'The change was -2.', false, 'sign matters'],
  ['The source states 2mg.', 'The source states 20mg.', false, 'attached unit'],
  ['The study names WHO.', 'The study names WHOM.', false, 'whole acronym'],
  ['Williams reported it.', 'William reported it.', false, 'names are not plurals'],
  ['José reported it.', 'Jose reported it.', false, 'unicode name tokens'],
  ['The count was 3.', 'The counts were one, two.', false, 'separate number words'],
  // [sentence, source, expectedOk, note]
  ['Participants fasted for 2 days.', 'They fasted for 20 days.', false, '2 must not match 20'],
  ['The trial lasted 25 weeks.', 'The trial lasted twenty five weeks.', true, 'compound number words'],
  ['The trial lasted 25 weeks.', 'The trial lasted twenty-five weeks.', true, 'hyphenated number words'],
  ['A 6- to 10-hour eating window.', 'a window of six to ten hours', true, 'number words as digits'],
  ['LDL cholesterol rose.', 'The diet raised cholesterol.', false, 'uppercase acronym must be grounded'],
  ['LDL cholesterol rose.', 'The diet raised LDL cholesterol.', true, 'acronym present'],
  ['Huberman describes cortisol.', 'Andrew Huberman talks about cortisol.', true, 'sentence-initial name present'],
  ['Huberman describes cortisol.', 'Someone talks about cortisol.', false, 'sentence-initial name absent'],
  ['The study found a 38 percent dropout rate.', 'dropout rate of 38 percent', true, 'plain number'],
  ['Greger explains it.', 'Michael Greger explains it.', true, 'name present'],
  ['Sean Hashmi explains it.', 'Dr. Sean Hashmi explains it.', true, 'title prefix'],
  ['Two hundred people took part.', 'A total of 200 people took part.', true, 'hundred'],
  ['1,500 people took part.', 'A total of 1500 people took part.', true, 'thousands separator'],
];
let failed = 0;
for (const [sentence, source, expected, note] of cases) {
  const got = groundedIn(sentence, source).ok;
  if (got !== expected) { failed++; console.log('FAIL', note, '|', sentence, '|', source, '| expected', expected, 'got', got); }
}
assert.deepEqual([...numbersIn('twenty five and 3.5 and two hundred')].sort(), ['200', '25', '3.5']);
console.log(failed ? failed + ' failed' : 'all ' + cases.length + ' guard cases passed');
process.exit(failed ? 1 : 0);
