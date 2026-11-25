import assert from 'node:assert/strict';
import {plantBasedOnly} from '../lib/guard.ts';
const blocked=['Eat fish for omega-3.','Consider fish oil capsules.','Add eggs and yogurt to breakfast.','Use whey protein powder.','Honey is a good sweetener.','Take animal collagen.','Choose oat milk and whey protein.','Do not avoid fish.','Try chicken soup.','Use ghee for cooking.','Choose a vitamin D3 supplement.','Consider omega-3 supplements.','Use vegan protein powder mixed with dairy milk.','Choose veggie bacon with eggs.','Choose plant-based sausage and whey.','Choose vegetarian cheese.','Use vegan fish oil.','Choose veggies with bacon.','Choose plant-based sausage and chicken.'];
const allowed=['Choose beans and lentils.','Use almond milk.','Choose soy yogurt.','Add peanut butter to oats.','Include eggplant and butternut squash.','Consider vegan algae-derived omega-3 supplements.','Choose vegan lichen-derived vitamin D3 supplements.','Use plant-based protein powder.','Choose grilled tempeh, scrambled tofu, veggie bacon and veggie sausage.','Choose plant-based sausage.','Use vegan bacon.','Choose vegan chicken and soy yogurt.'];
for(const text of blocked)assert.equal(plantBasedOnly(text),false,text);
for(const text of allowed)assert.equal(plantBasedOnly(text),true,text);
console.log('Passed '+(blocked.length+allowed.length)+' plant-based policy cases.');
