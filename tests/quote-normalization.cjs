const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict'),m={exports:{}};
new Function('exports','require','module',ts.transpileModule(fs.readFileSync('lib/grounded.ts','utf8').replace(/^import .*;\r?\n/gm,''),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,require,m);
const {exactQuote,validSentences}=m.exports;
const source={id:1,content:'Quality protein includes essential amino acids.\nWe must get them from the diet.'};
assert.equal(exactQuote(source.content,'quality protein includes essential amino acids.'),'Quality protein includes essential amino acids.');
assert.equal(exactQuote(source.content,'acids. we must get them'),'acids.\nWe must get them');
for(const quote of ['We get them from the diet.','Quality protein ... amino acids.','Quality protein cures disease.'])assert.equal(exactQuote(source.content,quote),null,quote);
const sentences=validSentences({status:'answered',sentences:[{text:'A supported paraphrase.',evidence:[{source_id:1,quote:'quality protein includes essential amino acids.'}]}]},[source]);assert.equal(sentences[0].evidence[0].quote,'Quality protein includes essential amino acids.');assert.ok(source.content.includes(sentences[0].evidence[0].quote));
console.log('Passed case/whitespace normalization to exact stored text; missing/altered words and ellipses still rejected.');
