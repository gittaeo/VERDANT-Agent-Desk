import test from 'node:test';
import assert from 'node:assert/strict';
import {PEOPLE,NODES,GRAPH,routeBetween,stepToward,sceneSnapshot,addStops} from '../public/office-state.mjs';

test('Every teammate can reach work, meeting and lounge through the connected office',()=>{
  for(const person of PEOPLE)for(const from of [person.rest,person.work,person.meeting])for(const to of [person.rest,person.work,person.meeting]){
    const path=routeBetween(from,to);
    assert.equal(path[0],from);assert.equal(path.at(-1),to);
    for(let i=1;i<path.length;i++)assert.ok(GRAPH[path[i-1]].includes(path[i]));
  }
  assert.deepEqual(routeBetween('not-a-room','scanDesk'),[]);
});
test('Cross-department walks pass through doors and corridor instead of walls',()=>{
  const path=routeBetween('scanDesk','riskDesk');
  assert.deepEqual(path,['scanDesk','dataDoor','hallWest','hallCenter','hallEast','riskDoor','riskDesk']);
  const lower=routeBetween('bookDesk','fillsDesk');
  assert.ok(lower.includes('analysisDoor'));assert.ok(lower.includes('hallEast'));assert.ok(lower.includes('opsDoor'));
  const rooms=[{x:30,y:40,w:310,h:245,door:190,side:'bottom'},{x:365,y:40,w:450,h:245,door:590,side:'bottom'},{x:840,y:40,w:330,h:245,door:1000,side:'bottom'},{x:30,y:425,w:310,h:310,door:190,side:'top'},{x:365,y:425,w:450,h:310,door:590,side:'top'},{x:840,y:425,w:330,h:310,door:1000,side:'top'}];
  for(const [node,links] of Object.entries(GRAPH))for(const link of links){const a=NODES[node],b=NODES[link];for(const room of rooms){
    const inside=p=>p[0]>room.x&&p[0]<room.x+room.w&&p[1]>room.y&&p[1]<room.y+room.h;
    if(inside(a)!==inside(b)){const edge=room.side==='top'?room.y:room.y+room.h;const t=(edge-a[1])/(b[1]-a[1]);const x=a[0]+(b[0]-a[0])*t;assert.ok(t>=0&&t<=1&&Math.abs(x-room.door)<=29,`${node} → ${link} crossed a wall`)}
  }}
});
test('Walking advances at a bounded speed and never overshoots a waypoint',()=>{
  assert.deepEqual(stepToward([0,0],[10,0],1,20).position,[10,0]);
  const step=stepToward([0,0],[100,100],.1,100);
  assert.ok(Math.abs(Math.hypot(...step.position)-10)<1e-9);assert.equal(step.arrived,false);
  assert.equal(stepToward([10,10],[0,10],.01).facing,'west');
});
test('Actual events immediately choose departments, while completed work goes to briefing and rest',()=>{
  const events=[{agent:'SCAN',state:'running',message:'조회 중',seq:1},{agent:'BOOK',state:'blocked',message:'소스 없음',seq:2}];
  const state=sceneSnapshot(events,{running:true});
  assert.deepEqual(state.find(p=>p.id==='SCAN').destinations,['scanDesk']);
  assert.deepEqual(state.find(p=>p.id==='BOOK').destinations,['meeting4']);
  assert.equal(events[0].state,'running');
  const completed=sceneSnapshot([{agent:'SCAN',state:'completed'}]);
  assert.deepEqual(completed.find(p=>p.id==='SCAN').destinations,['meeting2','rest2']);
});
test('Historical or stopped runs never masquerade as current working agents',()=>{
  const events=[{agent:'RISK',state:'running',message:'위험 검토'}];
  assert.equal(sceneSnapshot(events,{historical:true,running:true}).find(p=>p.id==='RISK').state,'partial');
  assert.equal(sceneSnapshot(events,{running:false}).find(p=>p.id==='RISK').state,'partial');
  assert.equal(events[0].state,'running');
});
test('Fast event bursts preserve the first movement and latest destination without unbounded fake work',()=>{
  let stops=['scanDesk'];for(let i=0;i<50;i++)stops=addStops(stops,['meeting2','rest2']);
  assert.ok(stops.length<=4);assert.equal(stops[0],'scanDesk');assert.equal(stops.at(-1),'rest2');
  assert.deepEqual(addStops(['scanDesk'],['scanDesk']),['scanDesk']);
});
