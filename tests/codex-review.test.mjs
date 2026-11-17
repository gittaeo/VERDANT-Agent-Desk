import test from 'node:test';import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
import {compactEvidence,validateBatch} from '../lib/compact-evidence.mjs';
import {createCodexReviewer} from '../scripts/codex-review.mjs';
import {modelProfiles,selectModel} from '../lib/model-config.mjs';
import {probeModel,publicSources} from '../lib/model-probe.mjs';
import {stockDigest} from '../lib/stock-digest.mjs';
const evidence=[{id:'E1',kind:'rule_checks',value:{observations:5}}];
const reviews=['BOOK','RISK','CHIEF'].map(role=>({role,summary:'자료 확인 · 한국어 근거 검토',evidenceIds:['E1']}));
function fakeSpawn({output=reviews,hang=false,inspect=()=>{}}={}){return (binary,args,options)=>{
 inspect(binary,args,options);const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.kill=()=>{queueMicrotask(()=>child.emit('close',1));return true;};
 child.stdin.on('finish',()=>{if(hang)return;queueMicrotask(()=>{const bytes=Buffer.from(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({reviews:output})}})+'\n'+JSON.stringify({type:'turn.completed',usage:{input_tokens:100,output_tokens:20,cached_input_tokens:0}})+'\n');for(let i=0;i<bytes.length;i+=7)child.stdout.write(bytes.subarray(i,i+7));child.emit('close',0);});});return child;
};}
test('Codex batch validates all three roles, handles split UTF-8, and caches without new calls',async()=>{
 let calls=0,now=0;const review=createCodexReviewer({clock:()=>now,spawnImpl:fakeSpawn({inspect:(bin,args,options)=>{calls++;assert.equal(options.shell,false);assert.ok(args.includes('--ephemeral'));assert.ok(args.includes('features.shell_tool=false'));assert.equal(options.env.VERDANT_API_KEY,undefined);}})});
 const first=await review(evidence),second=await review(evidence);assert.equal(calls,1);assert.equal(first.reviews.length,3);assert.match(first.reviews[0].summary,/한국어/);assert.equal(second.cached,true);assert.equal(second.usage.input_tokens,0);assert.equal(second.usage.output_tokens,0);assert.equal(second.originalUsage.input_tokens,100);
 now=900001;await review(evidence);assert.equal(calls,2);
});
test('Unknown citation or duplicated roles fail closed; no failed output cached',async()=>{
 assert.throws(()=>validateBatch({reviews:reviews.map(r=>({...r,evidenceIds:['SECRET']}))},evidence));assert.throws(()=>validateBatch({reviews:[reviews[0],reviews[0],reviews[2]]},evidence));
 let calls=0;const review=createCodexReviewer({spawnImpl:fakeSpawn({output:reviews.map(r=>({...r,evidenceIds:['E99']})),inspect:()=>calls++})});await assert.rejects(review(evidence),/검증/);await assert.rejects(review(evidence));assert.equal(calls,2);
});
test('Cancellation and timeout terminate the owned child without retry',async()=>{
 const c=new AbortController(),review=createCodexReviewer({spawnImpl:fakeSpawn({hang:true}),timeout:25});const task=review(evidence,{signal:c.signal});c.abort();await assert.rejects(task,/취소/);
 await assert.rejects(createCodexReviewer({spawnImpl:fakeSpawn({hang:true}),timeout:20})(evidence),/시간 초과/);
});
test('Input compaction is bounded and excludes prior AI interpretations',()=>{const data=Array.from({length:30},(_,i)=>({id:'E'+i,kind:'public',value:'x'.repeat(15000)}));data.push({id:'AI',kind:'agent_review',value:'unverified'});const packet=compactEvidence(data);assert.ok(JSON.stringify(packet).length<=6000);assert.equal(packet.length,6);assert.ok(!packet.some(e=>e.id==='AI'));assert.ok(packet.every(e=>e.truncated));});
test('Codex requires explicit local enable; hosted config never enables PC login',()=>{const env={VERDANT_CODEX_ENABLED:'1',VERDANT_CODEX_BIN:'private-path'};assert.equal(modelProfiles(env).codex.enabled,false);assert.equal(selectModel(modelProfiles(env,{local:true}),'codex').provider,'codex');assert.throws(()=>selectModel(modelProfiles({},{local:true}),'codex'));});
test('Connection probe reports contract success, sanitizes errors and preserves missing sources',async()=>{const result=await probeModel({config:{provider:'codex',enabled:true},batchReviewer:async()=>({reviews,usage:{input_tokens:100,output_tokens:20},cached:false})});assert.equal(result.status,'available');assert.equal(result.checks.length,3);const failed=await probeModel({config:{provider:'codex',enabled:true},batchReviewer:async()=>{throw Error('SECRET TOKEN')}});assert.equal(failed.status,'failed');assert.ok(!JSON.stringify(failed).includes('SECRET'));assert.equal(publicSources({key:'secret'}).dart,true);assert.equal(publicSources({}).news,false);});
test('Stock digest never turns missing news into a neutral or bullish signal',()=>{const d=stockDigest({company:{name:'A'},coverage:{dart:'available',prices:'partial'},priceContext:{series:[{date:'20261113',close:100},{date:'20261116',close:90}]},brief:{short:{checks:['수급 확인']},long:{checks:['실적 확인']}}});assert.ok(Math.abs(d.observed.change+10)<1e-9);assert.equal(d.news.support,null);assert.ok(d.missing.includes('prices'));assert.equal(d.recheck.length,2);assert.equal(stockDigest({}),null);});

import {runDesk} from '../lib/agent-desk.mjs';
test('Codex mode sends one evidence batch for all roles and preserves deterministic paper limits',async()=>{let calls=0;const r=await runDesk({query:'TEST',llm:{provider:'codex',enabled:true},fetcher:async()=>Response.json({pairs:[]}),batchReviewer:async packet=>{calls++;assert.ok(packet.some(e=>e.kind==='rule_checks'));return {reviews:reviews.map(r=>({...r,status:'available',engine:'codex'})),usage:{input_tokens:100,output_tokens:20},cached:false,inputCharacters:400};}});assert.equal(calls,1);assert.equal(r.reviews.length,3);assert.equal(r.modelUsage.requests,1);assert.equal(r.paper.cash,1000);assert.equal(r.sizing.dollars,0);});
test('Codex failure never triggers retries or replaces the rule result',async()=>{let calls=0;const r=await runDesk({query:'TEST',llm:{provider:'codex',enabled:true},fetcher:async()=>Response.json({pairs:[]}),batchReviewer:async()=>{calls++;throw Error('private');}});assert.equal(calls,1);assert.equal(r.reviews.filter(x=>x.status==='failed').length,3);assert.equal(r.paper.cash,1000);assert.ok(!JSON.stringify(r).includes('private'));});
