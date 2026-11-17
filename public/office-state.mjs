// The office is a spatial projection of tool events, never a source of market decisions.
export const PEOPLE = [
  {id:'CHIEF',name:'총괄',department:'회의·전략실',work:'chiefDesk',rest:'rest1',meeting:'meeting1',color:'#c9ec89',hair:'#d6c5a0'},
  {id:'SCAN',name:'시장 탐색',department:'데이터 수집실',work:'scanDesk',rest:'rest2',meeting:'meeting2',color:'#e5b37b',hair:'#79533d'},
  {id:'VET',name:'자료 검증',department:'리서치 분석부',work:'vetDesk',rest:'rest3',meeting:'meeting3',color:'#80c9bf',hair:'#353b41'},
  {id:'BOOK',name:'맥락 분석',department:'리서치 분석부',work:'bookDesk',rest:'rest4',meeting:'meeting4',color:'#bbabe3',hair:'#ad7049'},
  {id:'SIZE',name:'자금 계산',department:'운영·기록부',work:'sizeDesk',rest:'rest5',meeting:'meeting5',color:'#a9c783',hair:'#5b4636'},
  {id:'FILLS',name:'관찰 기록',department:'운영·기록부',work:'fillsDesk',rest:'rest6',meeting:'meeting6',color:'#9bb7df',hair:'#d1af75'},
  {id:'RISK',name:'위험 검토',department:'리스크 관제실',work:'riskDesk',rest:'rest7',meeting:'meeting7',color:'#e7ca76',hair:'#3a3939'},
];
export const NODES = {
  hallWest:[190,350],hallCenter:[590,350],hallEast:[1000,350],
  dataDoor:[190,282],scanDesk:[190,185],
  analysisDoor:[590,282],analysisCenter:[590,235],vetAisle:[480,235],bookAisle:[700,235],vetDesk:[480,180],bookDesk:[700,180],
  riskDoor:[1000,282],riskDesk:[1000,180],
  loungeDoor:[190,426],loungeCenter:[190,510],rest1:[100,510],rest2:[280,510],rest3:[100,580],rest4:[190,580],rest5:[280,580],rest6:[120,640],rest7:[270,640],
  coffeeStand:[135,527],loungeWindow:[302,600],readingSeat:[80,620],
  meetingDoor:[590,426],meetingNorth:[590,477],meetingWest:[465,477],meetingEast:[715,477],meetingSouthWest:[465,660],meetingSouthEast:[715,660],
  chiefDesk:[590,505],meeting1:[590,505],meeting2:[465,530],meeting3:[715,530],meeting4:[465,600],meeting5:[715,600],meeting6:[535,660],meeting7:[645,660],
  opsDoor:[1000,426],opsCenter:[1000,485],sizeAisle:[920,485],fillsAisle:[1090,485],sizeDesk:[920,560],fillsDesk:[1090,560],
};
const connections = [
  ['hallWest','hallCenter'],['hallCenter','hallEast'],['hallWest','dataDoor'],['dataDoor','scanDesk'],
  ['hallCenter','analysisDoor'],['analysisDoor','analysisCenter'],['analysisCenter','vetAisle'],['analysisCenter','bookAisle'],['vetAisle','vetDesk'],['bookAisle','bookDesk'],
  ['hallEast','riskDoor'],['riskDoor','riskDesk'],['hallWest','loungeDoor'],['loungeDoor','loungeCenter'],
  ...Array.from({length:7},(_,i)=>['loungeCenter',`rest${i+1}`]),
  ['loungeCenter','coffeeStand'],['loungeCenter','loungeWindow'],['loungeCenter','readingSeat'],
  ['hallCenter','meetingDoor'],['meetingDoor','meetingNorth'],['meetingNorth','chiefDesk'],['meetingNorth','meeting1'],['meetingNorth','meetingWest'],['meetingNorth','meetingEast'],
  ['meetingWest','meeting2'],['meeting2','meeting4'],['meeting4','meetingSouthWest'],['meetingSouthWest','meeting6'],
  ['meetingEast','meeting3'],['meeting3','meeting5'],['meeting5','meetingSouthEast'],['meetingSouthEast','meeting7'],
  ['hallEast','opsDoor'],['opsDoor','opsCenter'],['opsCenter','sizeAisle'],['opsCenter','fillsAisle'],['sizeAisle','sizeDesk'],['fillsAisle','fillsDesk'],
];
export const GRAPH=Object.fromEntries(Object.keys(NODES).map(id=>[id,[]]));
for(const [a,b] of connections){GRAPH[a].push(b);GRAPH[b].push(a)}
export function routeBetween(from,to){
  if(!NODES[from]||!NODES[to])return [];
  const queue=[[from]],seen=new Set([from]);
  for(let index=0;index<queue.length;index++){
    const path=queue[index],last=path.at(-1);if(last===to)return path;
    for(const next of GRAPH[last])if(!seen.has(next)){seen.add(next);queue.push([...path,next])}
  }
  return [];
}
export function stepToward(position,target,seconds,speed=155){
  const dx=target[0]-position[0],dy=target[1]-position[1],distance=Math.hypot(dx,dy),travel=Math.max(0,seconds)*speed;
  if(distance<=travel||distance===0)return {position:[...target],arrived:true,facing:Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south')};
  return {position:[position[0]+dx/distance*travel,position[1]+dy/distance*travel],arrived:false,facing:Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south')};
}
export function destinationsFor(person,event){
  if(!event)return [person.rest];
  if(event.state==='running')return [person.work];
  // Results pass through the meeting room. The walk is an illustration, not extra analysis.
  if(['blocked','partial','rejected'].includes(event.state))return [person.meeting];
  if(event.state==='completed')return person.id==='CHIEF'?[person.meeting]:[person.meeting,person.rest];
  return [person.rest];
}
export function sceneSnapshot(events=[],{running=false,historical=false}={}){
  const latest=new Map();for(const event of events)if(PEOPLE.some(p=>p.id===event.agent))latest.set(event.agent,event);
  return PEOPLE.map(person=>{let event=latest.get(person.id)||null;
    // A saved snapshot must not reanimate an old "running" event as live work.
    if(event?.state==='running'&&(!running||historical))event={...event,state:'partial',message:event.message+' · 과거 기록 / 현재 실행 아님'};
    return {...person,event,state:event?.state||'waiting',destinations:destinationsFor(person,event)};
  });
}
export function addStops(stops,next,limit=4){
  const output=[...stops];for(const node of next)if(output.at(-1)!==node)output.push(node);
  // Retain the first real movement and the latest state; avoid a long fake work queue.
  return output.length>limit?[output[0],...output.slice(-(limit-1))]:output;
}
