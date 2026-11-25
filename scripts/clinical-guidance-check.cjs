// Verifies selected excerpts against the three fixed official pages. No AI calls.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/clinical-guidance.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText)(m.exports,m);
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'');
(async()=>{const checks=[];for(const row of m.exports.clinicalGuidanceForTopics([{question:'amylase',queries:[]}])){
 assert.ok(['medlineplus.gov','www.niddk.nih.gov'].includes(new URL(row.source_url).hostname));
 const response=await fetch(row.source_url,{redirect:'error',signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);
 const html=await response.text();assert.ok(html.length<2000000);
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&(?:rsquo|lsquo|#39|apos);/g,"'").replace(/&(?:amp|#38);/g,'&').replace(/&(?:nbsp|#160);/g,' ');
 for(const paragraph of row.content.split('\n\n'))assert.ok(normalize(text).includes(normalize(paragraph)),'Excerpt not found: '+row.title+' '+paragraph.slice(0,60));
 checks.push({id:row.id,url:row.source_url,paragraphsVerified:row.content.split('\n\n').length});
 }fs.writeFileSync('.sites-runtime/clinical-guidance-source-proof.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,aiCalls:0},null,2));console.log('PASS official-page excerpt verification; zero AI calls.');})().catch(e=>{console.error(e.message);process.exitCode=1});
