import assert from 'node:assert/strict';import {sourceMetadataGrounded,groundedIn,patientAdviceSafe} from '../lib/guard.ts';
const sources=[{id:1,collection:'pcrm'},{id:2,collection:'videos'},{id:3,collection:'books'}],sentence=(text,id)=>({text,evidence:[{source_id:id}]});
assert.equal(sourceMetadataGrounded(sentence('The video Gut Bacteria describes inflammation.',1),sources),false);
assert.equal(sourceMetadataGrounded(sentence('According to the video Gut Bacteria, fiber matters.',2),sources),true);
assert.equal(sourceMetadataGrounded(sentence('As described in the article Gut Bacteria, fiber matters.',1),sources),true);
assert.equal(sourceMetadataGrounded(sentence('The book Gut Bacteria describes inflammation.',1),sources),false);
assert.equal(sourceMetadataGrounded(sentence('The source discusses a video about gut bacteria.',1),sources),true);
assert.equal(sourceMetadataGrounded(sentence('Low-carb diets are more effective for weight loss.',3),sources,'Compare low-carb and Mediterranean diets'),false);
assert.equal(sourceMetadataGrounded(sentence('Low-carb diets were more effective than low-fat diets in the trial.',3),sources,'Compare low-carb and Mediterranean diets'),true);
assert.equal(sourceMetadataGrounded(sentence('The source reports improved glycemic control.',3),sources,'Compare low-carb and Mediterranean diets'),true);
console.log('Passed source-kind attribution and unspecified-comparator regressions.');

assert.equal(groundedIn('Choose whole grains and beans.', 'Whole grains and beans provide fiber.').ok,true);
assert.equal(groundedIn('Consider Ozempic.', 'Discuss options.').ok,false);

assert.equal(groundedIn('Emphasize whole grains.', 'Whole grains provide fiber.').ok,true);
assert.equal(sourceMetadataGrounded(sentence('Participants struggled to maintain extremely low levels of both carbohydrates and fat.',2),sources,'Compare low-carb and Mediterranean diets'),false);

assert.equal(groundedIn('Insufficient sleep impairs insulin sensitivity.', 'Sleep deprivation impairs insulin sensitivity.').ok,true);

for(const text of ['Consult a clinician.', 'Monitor blood sugar.', 'Quality sleep matters.'])assert.equal(groundedIn(text,'A clinician can discuss glucose and sleep.').ok,true);
assert.equal(groundedIn('Clinton recommends sleep.','Sleep matters.').ok,false);

assert.equal(groundedIn('Intermittent fasting involves eating windows.', 'Time-restricted feeding uses eating windows.').ok,true);
assert.equal(groundedIn('Going without food involves fasting.', 'Time-restricted feeding involves fasting.').ok,true);
assert.equal(groundedIn('Meta-analyses found an association.', 'Pooled trials found an association.').ok,true);

assert.equal(groundedIn('Support protein needs with beans.', 'Beans can meet protein needs.').ok,true);
assert.equal(groundedIn('Distribute protein across meals.', 'Spread protein across meals.').ok,true);
assert.equal(groundedIn('Achieving a threshold depends on context.', 'A threshold depends on context.').ok,true);

assert.equal(groundedIn('Utilize vegan rice and pea blends.', 'Vegan rice and pea blends are suitable.').ok,true);

assert.equal(groundedIn('Basic requirements include protein.', 'Requirements include protein.').ok,true);

assert.equal(groundedIn('Lower the calorie density of meals.', 'Lowering the calorie density of meals helps.').ok,true);
assert.equal(groundedIn('Increasing fiber can help.', 'Increase fiber gradually.').ok,true);
assert.equal(groundedIn('Stanford recommends meals.', 'Lowering calorie density helps.').ok,false);
assert.equal(groundedIn('LDL affects outcomes.', 'No matching acronym.').ok,false);

assert.equal(patientAdviceSafe('The root pathophysiological cause should be cleared through diet.'),false);
assert.equal(patientAdviceSafe('Your blood sugar is caused by ectopic fat.'),false);
assert.equal(patientAdviceSafe('In trials of adults with type 2 diabetes, researchers examined insulin sensitivity.'),true);
