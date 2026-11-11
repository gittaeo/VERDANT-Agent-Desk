import test from 'node:test';
import assert from 'node:assert/strict';
import {volumeRisk,inspectPair,paperSize,runDesk,reviewEvidence} from '../lib/agent-desk.mjs';
import {newLedger,updateLedger} from '../lib/paper-ledger.mjs';
const pair={chainId:'solana',pairAddress:'pairAddress123456789',baseToken:{address:'mintAddress123456789',symbol:'TEST'},priceUsd:'1',liquidity:{usd:100000},pairCreatedAt:Date.now()-3600000,txns:{h1:{buys:10,sells:5}},volume:{h24:4717.7,h6:167.75}};
const response=p=>new Response(JSON.stringify(p),{headers:{'Content-Type':'application/json'}});
test('Volume ratio follows source calculation and never divides by zero',()=>{
  assert.equal(volumeRisk(pair.volume).decision,'CLOSE_SIGNAL');assert.ok(Math.abs(volumeRisk(pair.volume).ratio-.14222)<.001);
  assert.equal(volumeRisk({h24:0,h6:1}).decision,'UNKNOWN');assert.equal(volumeRisk({h24:100,h6:null}).ratio,null);
  assert.equal(volumeRisk({h24:100,h6:5}).decision,'HOLD_SIGNAL');
});
test('Screening retains missing mandatory checks and rejects missing age/price',()=>{
  assert.equal(inspectPair(pair).decision,'PASS_PARTIAL');assert.equal(inspectPair({...pair,pairCreatedAt:null}).decision,'REJECT');
  assert.equal(inspectPair({...pair,priceUsd:0}).decision,'REJECT');assert.ok(inspectPair(pair).missing.length);
});
test('Kelly never invents probability; caps cash and liquidity',()=>{
  assert.equal(paperSize().dollars,0);assert.equal(paperSize({cash:1000,liquidity:100000,probability:.8,payoff:2}).dollars,60);
  assert.equal(paperSize({cash:500,liquidity:100000,probability:.8,payoff:2}).dollars,0);
});
test('Real tool lifecycle has monotonic evidence events and no fake fills',async()=>{
  const events=[];const result=await runDesk({query:'test',fetcher:async()=>response({pairs:[pair,pair]}),onEvent:e=>events.push(e)});
  assert.equal(result.candidates.length,1);assert.equal(result.paper.orders.length,0);assert.equal(result.sizing.dollars,0);
  assert.equal(result.status,'degraded');assert.deepEqual(events.map(e=>e.seq),events.map((_,i)=>i+1));
  assert.ok(events.find(e=>e.agent==='VET'&&e.evidenceIds?.[0]==='E1'));
  assert.equal(events.at(-1).agent,'CHIEF');assert.ok(result.reviews.every(r=>r.status==='not_configured'));
});
test('Empty provider response stays empty; malformed response fails',async()=>{
  assert.equal((await runDesk({fetcher:async()=>response({pairs:[]})})).candidates.length,0);
  await assert.rejects(runDesk({fetcher:async()=>response({})}),/pairs/);
});
test('Cancellation interrupts event execution',async()=>{
  const c=new AbortController();c.abort();await assert.rejects(runDesk({signal:c.signal}),/취소/);
});
test('LLM output must cite only provided evidence; thinking field excluded',async()=>{
  const config={provider:'ollama',model:'test'},evidence=[{id:'E1',value:'public fact'}];
  const output=await reviewEvidence({role:'BOOK',config,evidence,fetcher:async()=>response({message:{content:JSON.stringify({summary:'검토',evidenceIds:['E1']}),thinking:'private'}})});
  assert.equal(output.summary,'검토');assert.equal(output.thinking,undefined);
  await assert.rejects(reviewEvidence({role:'BOOK',config,evidence,fetcher:async()=>response({message:{content:JSON.stringify({summary:'unsupported',evidenceIds:['E99']})}})}),/근거/);
});
test('Failed LLM never overwrites deterministic result',async()=>{
  const result=await runDesk({llm:{provider:'ollama',model:'test'},fetcher:async url=>String(url).includes('dexscreener')?response({pairs:[pair]}):new Response('',{status:500})});
  assert.equal(result.candidates.length,1);assert.equal(result.reviews.filter(r=>r.status==='failed').length,3);assert.equal(result.paper.cash,1000);
});
test('Paper observation includes both fees and closes on independent risk rule',async()=>{
  const fetcher=async()=>response({pairs:[pair]});
  const opened=await updateLedger(newLedger(),{type:'observe',chain:pair.chainId,pair:pair.pairAddress,name:'TEST',dollars:50},{fetcher});
  assert.equal(opened.cash,949.05);assert.equal(opened.positions.length,1);assert.equal(newLedger().cash,1000);
  const closed=await updateLedger(opened,{type:'refresh'},{fetcher});
  assert.equal(closed.positions.length,0);assert.equal(closed.closed.length,1);assert.ok(Math.abs(closed.closed[0].pnl+1.9)<1e-8);
  assert.ok(Math.abs(closed.cash-998.1)<1e-8);
});
test('API outage leaves unpriced position instead of imaginary liquidation',async()=>{
  const opened=await updateLedger(newLedger(),{type:'observe',chain:pair.chainId,pair:pair.pairAddress,dollars:50},{fetcher:async()=>response({pairs:[pair]})});
  const next=await updateLedger(opened,{type:'close',id:opened.positions[0].id},{fetcher:async()=>{throw Error('offline')}});
  assert.equal(next.closed.length,0);assert.equal(next.positions[0].status,'unpriced');assert.equal(next.cash,opened.cash);
});
test('Paper rejects oversize, duplicate positions and invalid upstream prices',async()=>{
  const fetcher=async()=>response({pairs:[pair]});
  await assert.rejects(updateLedger(newLedger(),{type:'observe',chain:pair.chainId,pair:pair.pairAddress,dollars:61},{fetcher}),/6%/);
  const opened=await updateLedger(newLedger(),{type:'observe',chain:pair.chainId,pair:pair.pairAddress,dollars:50},{fetcher});
  await assert.rejects(updateLedger(opened,{type:'observe',chain:pair.chainId,pair:pair.pairAddress,dollars:50},{fetcher}),/이미/);
  await assert.rejects(updateLedger(newLedger(),{type:'observe',chain:pair.chainId,pair:pair.pairAddress,dollars:50},{fetcher:async()=>response({pairs:[{...pair,priceUsd:0}]})}),/가격/);
});
