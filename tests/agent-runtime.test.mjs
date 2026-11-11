import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAgentRuntime} from '../scripts/agent-runtime.mjs';
import {modelProfiles,publicProfiles,selectModel} from '../lib/model-config.mjs';
import {readWorldmonitor,worldmonitorDataAvailable} from '../lib/worldmonitor.mjs';
test('Model selection rejects missing config and public profiles never leak keys',()=>{
  const profiles=modelProfiles({VERDANT_API_MODEL:'test',VERDANT_API_KEY:'private-secret',VERDANT_API_BASE_URL:'https://example.test/v1'});
  assert.equal(selectModel(profiles,'compatible').provider,'compatible');assert.throws(()=>selectModel(profiles,'ollama'));
  assert.ok(!JSON.stringify(publicProfiles(profiles)).includes('private-secret'));assert.throws(()=>selectModel(profiles,'__proto__'));
});
test('Worldmonitor checks data independently from HTTP success',async()=>{
  assert.equal(worldmonitorDataAvailable({dataAvailable:false,markets:[1]}),false);
  assert.equal(worldmonitorDataAvailable({dataAvailable:true,markets:[]}),false);
  assert.equal((await readWorldmonitor()).status,'not_connected');
  let n=0;const degraded=await readWorldmonitor({baseUrl:'http://localhost:3000',fetcher:async()=>new Response(JSON.stringify(++n===3?{message:'Internal server error'}:{dataAvailable:false}),{status:n===3?503:200})});
  assert.equal(degraded.status,'degraded');assert.equal(degraded.checks.length,3);assert.equal(degraded.checks[2].httpStatus,503);
  const ready=await readWorldmonitor({baseUrl:'http://localhost:3000',fetcher:async()=>new Response(JSON.stringify({dataAvailable:true,markets:[{id:'a'}]}))});assert.equal(ready.status,'available');
});
test('Local HTTP validates origins, limits payload and persists ledger across runtime restart',async t=>{
  const root=await mkdtemp(join(tmpdir(),'verdant-test-'));
  let runtime=createAgentRuntime({root,stockConfig:{},profiles:modelProfiles({})});
  const server=createServer(async(req,res)=>{await runtime.handle(req,res,new URL(req.url,`http://${req.headers.host}`))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{runtime.close();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true})});
  const status=await (await fetch(base+'/api/desk/status')).json();assert.equal(status.execution,'local');assert.equal(status.models.ollama.configured,false);
  assert.deepEqual(await(await fetch(base+'/api/desk/history')).json(),[]);
  const headers={'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/desk/run',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/desk/run',{method:'POST',headers,body:'x'.repeat(4200)})).status,413);
  assert.equal((await fetch(base+'/api/desk/run',{method:'POST',headers,body:'{'})).status,400);
  assert.equal((await fetch(base+'/api/desk/run',{method:'POST',headers,body:JSON.stringify({market:'crypto',query:'x',modelMode:'ollama'})})).status,400);
  const updated=await(await fetch(base+'/api/desk/paper',{method:'POST',headers,body:JSON.stringify({type:'refresh'})})).json();assert.equal(updated.cash,1000);assert.ok(updated.updatedAt);
  runtime.close();runtime=createAgentRuntime({root,stockConfig:{},profiles:modelProfiles({})});
  const restored=await(await fetch(base+'/api/desk/paper')).json();assert.equal(restored.updatedAt,updated.updatedAt);
});
