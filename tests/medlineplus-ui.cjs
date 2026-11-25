const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{constructor(){this.children=[];this.textContent='';this.value=''}append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}querySelector(){return this.button||(this.button=new Element())}}
const items=new Map(),el=id=>{if(!items.has(id))items.set(id,new Element());return items.get(id)};
const source={id:-2000000000001,title:'Sleep summary',attribution:'MedlinePlus.gov',content:'Supporting text.',evidence_access:'health_topic_summary'};
let calls=[],preview;const context={document:{getElementById:el,createElement:()=>new Element()},showCloudSource:s=>{preview=s},fetch:async url=>{calls.push(url);assert.ok(['/api/medlineplus','/api/pubmed'].includes(url));return{ok:true,json:async()=>({sources:[source],articles:[{...source,pmid:'12345',publication_types:[]}],access_notice:'Scope notice'})}}};
vm.runInNewContext(fs.readFileSync('public/research.js','utf8'),context);
(async()=>{el('researchProvider').value='medlineplus';el('researchQuery').value='sleep';await el('researchForm').onsubmit({preventDefault(){}});assert.equal(calls[0],'/api/medlineplus');assert.match(el('researchStatus').textContent,/No AI quota used/);const row=el('researchResults').children[0];assert.match(row.children[0].children[1].textContent,/MedlinePlus.gov.*Health-topic summary/);row.children[1].onclick();assert.equal(preview,source);
 el('researchProvider').value='pubmed';await el('researchForm').onsubmit({preventDefault(){}});assert.equal(calls[1],'/api/pubmed');assert.ok(!calls.includes('/api/answer'));
 assert.ok(fs.readFileSync('public/chats.js','utf8').includes('medlinePath'));assert.ok(fs.readFileSync('public/app.js','utf8').includes('MedlinePlus · Health-topic summary'));
 console.log('PASS Research provider switch, summary attribution/preview, existing PubMed selection and saved-source metadata; zero AI/network.');})().catch(e=>{console.error(e);process.exitCode=1});
