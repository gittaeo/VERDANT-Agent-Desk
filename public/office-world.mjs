import {PEOPLE,NODES,routeBetween,stepToward,sceneSnapshot,addStops} from './office-state.mjs';

const find=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stateNames={waiting:'업무 대기',running:'실행 중',completed:'완료',partial:'부분 확인',blocked:'보류',rejected:'조건 탈락'};
const time=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
const roomNames={data:'데이터 수집실',analysis:'리서치 분석부',risk:'리스크 관제실',lounge:'휴게 라운지',meeting:'회의·전략실',ops:'운영·기록부'};
const roomFor=id=>id==='SCAN'?'data':['VET','BOOK'].includes(id)?'analysis':id==='RISK'?'risk':id==='CHIEF'?'meeting':'ops';

function plant(x,y,size=1){return `<g transform="translate(${x} ${y}) scale(${size})"><ellipse cy="9" rx="14" ry="6" fill="#111b18" opacity=".5"/><path d="M-9 0h18l-3 15H-6Z" fill="#93724c"/><path d="M-6 2H6V5H-6Z" fill="#c09c6b"/><path d="M0 2V-32M0-7l-13-10M0-14l12-11" stroke="#799d70" stroke-width="6"/><path d="M-8-14l-11-7 4-7 10 9M6-20l11-10 5 7-12 8M-3-25l-6-12 6-5 6 15" fill="#53876b"/></g>`}
function chair(x,y,rotation=0){return `<g transform="translate(${x} ${y}) rotate(${rotation})"><rect x="-17" y="-12" width="34" height="27" rx="6" fill="#111f20"/><rect x="-13" y="-9" width="26" height="18" rx="4" fill="#44605d"/><path d="M-17-10v23M17-10v23" stroke="#82928a" stroke-width="3"/><path d="M-10 19h20" stroke="#111c19" stroke-width="4"/></g>`}
function screen(x,y,color,width=46){return `<g transform="translate(${x} ${y})"><rect x="-2" y="-2" width="${width+4}" height="31" rx="3" fill="#101b20"/><rect width="${width}" height="25" rx="1" fill="#203d42"/><path d="M5 7h${width*.6}M5 12h${width*.4}M5 17h${width*.7}" stroke="${color}" stroke-width="2" opacity=".8"/><path d="M${width/2} 29v8m-10 0h20" stroke="#85988b" stroke-width="4"/></g>`}
function desk(x,y,color,multiple=false){return `<g>${chair(x,y+15)}<rect x="${x-61}" y="${y-48}" width="122" height="39" rx="5" fill="#14231d" opacity=".6"/><rect x="${x-65}" y="${y-56}" width="130" height="42" rx="5" fill="#ac956c" stroke="#6c6048" stroke-width="3"/><path d="M${x-57} ${y-17}v8m114-8v8" stroke="#534b39" stroke-width="5"/>${multiple?screen(x-55,y-84,color,49)+screen(x+3,y-84,color,49):screen(x-24,y-85,color)}<rect x="${x-21}" y="${y-34}" width="44" height="11" rx="2" fill="#dad6bd"/><path d="M${x-17} ${y-30}h35M${x-17} ${y-26}h35" stroke="#838c7b"/><circle cx="${x+42}" cy="${y-36}" r="6" fill="#d6d2b9"/><circle cx="${x+42}" cy="${y-36}" r="3" fill="#806347"/><rect x="${x-52}" y="${y-34}" width="16" height="19" transform="rotate(-8 ${x-52} ${y-34})" fill="#e2dec6"/></g>`}
function shelves(x,y,color='#9e9d7a'){return `<g transform="translate(${x} ${y})"><rect width="51" height="92" rx="2" fill="#343f35" stroke="#17271e" stroke-width="4"/>${[12,39,66].map((row,i)=>`<path d="M5 ${row+17}h41" stroke="#72806a" stroke-width="3"/><rect x="7" y="${row}" width="8" height="17" fill="${color}"/><rect x="18" y="${row+3}" width="6" height="14" fill="#729e8c"/><rect x="27" y="${row-2}" width="8" height="19" fill="${i%2?'#cc9f73':'#8e8bb0'}"/><rect x="38" y="${row+4}" width="6" height="13" fill="#d2c9a0"/>`).join('')}</g>`}
function room({id,x,y,w,h,title,subtitle,tint,door='bottom',doorX}){
  const opening=doorX??x+w/2,edge=door==='bottom'?y+h:y;
  return `<g id="room-${id}"><rect x="${x}" y="${y+10}" width="${w}" height="${h}" rx="4" fill="#0c1715"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tint}" stroke="#101e1a" stroke-width="8"/><rect x="${x+5}" y="${y+5}" width="${w-10}" height="${h-10}" fill="url(#${id==='lounge'?'wood':'tiles'})" opacity=".3"/><path d="M${x} ${y+h}H${x+w}" stroke="#75806a" stroke-width="4"/><rect x="${opening-29}" y="${edge-5}" width="58" height="12" fill="#293830"/><path d="M${opening-29} ${edge-3}h58" stroke="#a0906a" stroke-width="3"/><path d="M${opening-26} ${edge+3}v${door==='bottom'?-43:43}" stroke="#64785f" stroke-width="3"/><rect x="${x+13}" y="${y+13}" width="${w-26}" height="33" rx="3" fill="#13231e"/><text x="${x+25}" y="${y+34}" fill="#e3e8ce" font-size="14" font-weight="600">${title}</text><text x="${x+w-22}" y="${y+33}" fill="#93aa91" font-size="8" text-anchor="end" letter-spacing="1">${subtitle}</text></g>`;
}
function architecture(){
  return `<svg viewBox="0 0 1200 780" xmlns="http://www.w3.org/2000/svg" role="presentation"><defs><pattern id="tiles" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#789078" stroke-width="1"/></pattern><pattern id="wood" width="76" height="18" patternUnits="userSpaceOnUse"><rect width="76" height="18" fill="#80734c"/><path d="M0 17h76M37 0v17" stroke="#443f2e"/></pattern><pattern id="hall" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#293830"/><path d="M28 0H0v28" stroke="#33443a" fill="none"/></pattern><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#3e6265"/><stop offset="1" stop-color="#233c45"/></linearGradient></defs>
  <rect x="8" y="15" width="1184" height="748" rx="12" fill="#0a1813" stroke="#687b60" stroke-width="3"/><rect x="23" y="30" width="1154" height="718" fill="url(#hall)"/>
  ${room({id:'data',x:30,y:40,w:310,h:245,title:'데이터 수집실',subtitle:'DATA & DISCOVERY',tint:'#344336',doorX:190})}
  ${room({id:'analysis',x:365,y:40,w:450,h:245,title:'리서치 분석부',subtitle:'RESEARCH & VERIFICATION',tint:'#2c4341',doorX:590})}
  ${room({id:'risk',x:840,y:40,w:330,h:245,title:'리스크 관제실',subtitle:'RISK MONITORING',tint:'#3b4131',doorX:1000})}
  ${room({id:'lounge',x:30,y:425,w:310,h:310,title:'휴게 라운지',subtitle:'TAKE A BREATH',tint:'#625b42',door:'top',doorX:190})}
  ${room({id:'meeting',x:365,y:425,w:450,h:310,title:'회의·전략실',subtitle:'DISCUSS & SYNTHESIZE',tint:'#3c4240',door:'top',doorX:590})}
  ${room({id:'ops',x:840,y:425,w:330,h:310,title:'운영·기록부',subtitle:'OPERATIONS & RECORDS',tint:'#333f45',door:'top',doorX:1000})}
  <g fill="url(#glass)" stroke="#91a39a" stroke-width="2">${[100,205,420,525,630,735,890,1000,1110].map(x=>`<rect x="${x}" y="19" width="60" height="14" rx="2"/>`).join('')}</g>
  ${shelves(49,112)}${shelves(267,112,'#b3a06a')}${desk(190,185,'#dfb173')}
  <rect x="75" y="236" width="70" height="21" rx="3" fill="#1d3026"/><text x="110" y="250" text-anchor="middle" fill="#92ac82" font-size="8">SOURCE LIBRARY</text>
  ${desk(480,180,'#7fd5c5')}${desk(700,180,'#b7a6df')}${plant(392,247,.8)}${plant(785,247,.8)}
  <g fill="#1a312d" stroke="#6b8b7a" stroke-width="2"><rect x="556" y="91" width="70" height="66" rx="4"/><path d="M565 106h50m-50 12h35m-35 12h45m-45 12h22"/></g>
  ${desk(1000,180,'#e7c96d',true)}<rect x="874" y="215" width="244" height="34" rx="3" fill="#1c2e27" stroke="#5f7054"/><g fill="#a3ad7c"><circle cx="889" cy="232" r="3"/><circle cx="906" cy="232" r="3"/><circle cx="923" cy="232" r="3"/></g><text x="1106" y="236" fill="#a6bb91" text-anchor="end" font-size="9">DATA QUALITY / RISK</text>
  <path d="M55 318H1145M55 391H1145" stroke="#6b7b5f" stroke-opacity=".3" stroke-dasharray="3 9"/><text x="590" y="333" text-anchor="middle" font-size="20" fill="#c7d79f" letter-spacing="7" font-weight="600">VERDANT</text><text x="590" y="379" text-anchor="middle" font-size="9" fill="#a9bc9a" letter-spacing="4">A PLACE TO THINK TOGETHER</text>
  <text x="75" y="373" fill="#91a489" font-size="10">← RECHARGE</text><text x="1128" y="373" text-anchor="end" fill="#91a489" font-size="10">RESEARCH LAB →</text>${plant(350,333,.8)}${plant(826,373,.8)}
  <g transform="translate(57 477)"><rect width="108" height="36" rx="4" fill="#a48c60" stroke="#504a34" stroke-width="3"/><rect x="10" y="-21" width="30" height="34" rx="3" fill="#232c2a" stroke="#83917f" stroke-width="2"/><rect x="15" y="-15" width="20" height="9" fill="#8caf83"/><path d="M20 1v5h10V1" stroke="#d6c6a0" stroke-width="3"/><circle cx="69" cy="12" r="6" fill="#e1d5af"/><circle cx="90" cy="12" r="6" fill="#e1d5af"/></g>
  <rect x="265" y="478" width="48" height="69" rx="3" fill="#c1c7b4" stroke="#677b68" stroke-width="3"/><path d="M265 500h48M303 487v8m0 13v14" stroke="#6c7d69" stroke-width="2"/>
  <rect x="62" y="550" width="227" height="105" rx="18" fill="#64765b" opacity=".6"/><rect x="70" y="558" width="211" height="89" rx="14" fill="none" stroke="#91a17a" stroke-dasharray="2 5"/><rect x="160" y="602" width="54" height="32" rx="8" fill="#ab8c59" stroke="#625438" stroke-width="3"/><rect x="176" y="608" width="20" height="12" transform="rotate(-8 176 608)" fill="#d8ccac"/>
  <g fill="#5e8680" stroke="#2f534e" stroke-width="3"><rect x="63" y="669" width="168" height="38" rx="9"/><rect x="66" y="665" width="12" height="44" rx="5"/><rect x="216" y="665" width="12" height="44" rx="5"/><path d="M119 672v32m54-32v32"/></g>${plant(304,698,.85)}<text x="74" y="724" fill="#dad4ad" font-size="8" letter-spacing="2">COFFEE / CONVERSATION / REST</text>
  <rect x="478" y="468" width="225" height="28" rx="3" fill="#c9d2bc" stroke="#7f9180" stroke-width="3"/><path d="M491 478h73m12 0h43m-128 8h121m13 0h45" stroke="#6d8972" stroke-width="2"/>
  <rect x="522" y="551" width="145" height="86" rx="35" fill="#19271f" opacity=".6"/><rect x="515" y="540" width="150" height="86" rx="35" fill="#9e865d" stroke="#66563d" stroke-width="4"/><path d="M529 548h122" stroke="#c4aa78" stroke-width="2" opacity=".7"/>
  ${[[590,505,180],[465,530,90],[715,530,-90],[465,600,90],[715,600,-90],[535,660,0],[645,660,0]].map(([x,y,r])=>chair(x,y,r)).join('')}
  <rect x="568" y="561" width="40" height="25" fill="#d4d6bf" transform="rotate(7 568 561)"/><path d="M574 568h25m-25 6h20" stroke="#849280" stroke-width="2"/><circle cx="625" cy="600" r="7" fill="#d8ceb2"/>${plant(395,696,.85)}${shelves(742,630)}
  ${desk(920,560,'#a4c785')}${desk(1090,560,'#9eb9e0')}
  <g transform="translate(870 660)"><rect width="80" height="42" rx="3" fill="#87998b" stroke="#344f43" stroke-width="3"/><rect x="6" y="-10" width="68" height="14" rx="2" fill="#d7d9c0"/><path d="M12 11h55m-55 9h55m-55 9h35" stroke="#435d4e" stroke-width="3"/></g>${shelves(1086,632,'#98abc7')}${plant(1000,701,.9)}
  <text x="600" y="754" text-anchor="middle" fill="#8da487" font-size="9" letter-spacing="3">VERDANT AGENT CAMPUS · 07 TEAMMATES · 06 SPACES</text></svg>`;
}

find('officeArchitecture').innerHTML=architecture();
const residents=new Map();
let snapshot={events:[],selected:'CHIEF',running:false},previousRun='',preview=false,previewStart=0,zoom=1,lastFrame=0,uiAt=0,inspectOpen=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

function spriteMarkup(){return '<span class="resident-shadow"></span><span class="resident-person"><i class="resident-leg leg-left"></i><i class="resident-leg leg-right"></i><i class="resident-body"></i><i class="resident-arm arm-left"></i><i class="resident-arm arm-right"></i><i class="resident-head"></i><i class="resident-hair"></i><i class="resident-eyes"></i></span>'}
for(const [index,person] of PEOPLE.entries()){
  const element=document.createElement('button');element.className='campus-resident';element.dataset.person=person.id;
  element.style.setProperty('--person-color',person.color);element.style.setProperty('--person-hair',person.hair);
  element.innerHTML=`<span class="resident-bubble"></span>${spriteMarkup()}<span class="resident-name">${person.id}</span><span class="resident-status-dot"></span>`;
  element.onclick=()=>window.dispatchEvent(new CustomEvent('verdant:office-select',{detail:person.id}));
  find('officeResidents').append(element);
  residents.set(person.id,{person,element,node:person.rest,position:[...NODES[person.rest]],route:[],stops:[],holdUntil:0,wanderAt:performance.now()+5000+index*1600,state:'waiting',event:null,eventKey:'',phase:'rest',previewStep:-1});
}
function receiveUpdate(event){
  snapshot=event.detail;
  if(snapshot.running&&preview)togglePreview(false);
  const key=snapshot.events[0]?.at||'';
  if(key&&key!==previousRun){previousRun=key;for(const resident of residents.values()){resident.stops=[];resident.route=resident.route.slice(0,1);resident.eventKey=''}}
  for(const person of sceneSnapshot(snapshot.events,{running:snapshot.running})){
    const resident=residents.get(person.id);resident.state=person.state;resident.event=person.event;
    const eventKey=person.event?`${person.event.seq}:${person.event.at}:${person.event.state}`:'';
    if(eventKey!==resident.eventKey){
      resident.eventKey=eventKey;
      if(!preview){resident.stops=addStops(resident.stops,person.destinations);resident.wanderAt=performance.now()+12000}
      if(reducedMotion.matches){resident.route=[];resident.stops=[];resident.node=person.destinations.at(-1);resident.position=[...NODES[resident.node]]}
    }
  }
  renderPanels();updateActors();
}
window.addEventListener('verdant:office-update',receiveUpdate);

function locationOf(resident){
  if(resident.node.startsWith('rest')||resident.node.startsWith('lounge')||['coffeeStand','readingSeat'].includes(resident.node))return '휴게실';
  if(resident.node.startsWith('hall'))return '복도';
  if(resident.node.startsWith('meeting')||resident.node==='chiefDesk')return '회의실';
  return resident.person.department;
}
function visualActivity(resident){
  if(preview)return resident.route.length?'동선 미리보기 · 이동 중':'동선 미리보기 · 공간 체험';
  if(resident.route.length)return resident.state==='running'?'담당 업무 장소로 이동':'공간 이동 · 실제 작업 '+(stateNames[resident.state]||'대기');
  if(resident.state==='running')return '실제 작업 중';
  if(locationOf(resident)==='휴게실')return '휴게 라운지 · 업무 대기';
  return stateNames[resident.state]||'업무 대기';
}
function renderPanels(){
  const people=[...residents.values()],focus=residents.get(snapshot.selected)||people[0];
  const focusEvidence=[...new Set(snapshot.events.filter(event=>event.agent===focus.person.id).flatMap(event=>event.evidenceIds||[]))];
  const active=people.filter(r=>r.state==='running').length;
  find('campusMode').textContent=preview?'동선 미리보기 · 실제 분석 없음':'실제 작업 연결';
  find('officePreview').disabled=snapshot.running;
  find('officeRun').textContent=snapshot.running?'분석 취소':'팀 분석 시작';
  const target=snapshot.target;find('officeAnalysisTarget').textContent=target?`${target.market==='stocks'?'국내 주식':'코인 공개 시세'} · ${target.query||'시장 전체'} · ${{rules:'규칙 검사',ollama:'로컬 LLM',compatible:'외부 API'}[target.engine]||target.engine}`:'분석 설정 대기';
  find('campusActivityCount').textContent=preview?'가상 공간의 이동을 살펴보세요':`7명 · 실행 ${active} · 대기/검토 완료 ${7-active}`;
  find('officeWorld').classList.toggle('is-preview',preview);
  find('campusFocusState').textContent=stateNames[focus.state]||'대기';
  find('campusFocus').innerHTML=`<div class="campus-focus-person"><span class="campus-avatar" style="--avatar-color:${focus.person.color}">${spriteMarkup()}</span><div><strong>${focus.person.id} <span>${focus.person.name}</span></strong><small>${focus.person.department}</small></div></div><p class="campus-current-task">${escape(focus.event?.message||'아직 배정된 작업이 없습니다. 분석을 시작하면 실제 작업이 이곳에 도착합니다.')}</p><div class="campus-task-meta"><span>${focus.event?time(focus.event.at)+' · '+(focus.event.engine?'LLM 검토':'실행 기록'):'서버 이벤트 대기'}</span><span>${focusEvidence.length?'원자료 '+focusEvidence.length+'개 · 검사 내역에서 확인':focus.event?'담당자별 원자료는 검증 내역에서 확인':'참조된 원자료 없음'}</span></div><div class="campus-movement-note">${escape(visualActivity(focus))}</div>`;
  const focusEvents=snapshot.events.filter(event=>event.agent===focus.person.id).slice(-8);
  const details=document.createElement('details');details.className='campus-evidence-details';details.open=inspectOpen;
  details.innerHTML=`<summary>판단 근거·검사 내역</summary><div>${focusEvents.map(event=>`<article><time>${time(event.at)}</time><p>${escape(event.message)}</p>${event.checks?`<ul>${event.checks.map(check=>`<li>${check.pass?'✓':'!'} ${escape(check.name)} · ${check.pass?'통과':'미통과'}</li>`).join('')}</ul>`:''}${event.evidenceIds?.length?`<small>원자료 ${event.evidenceIds.map(escape).join(', ')}</small>`:''}</article>`).join('')||'<p>아직 실행 기록이 없습니다.</p>'}</div>`;
  details.addEventListener('toggle',()=>{if(details.isConnected)inspectOpen=details.open});find('campusFocus').append(details);
  find('campusRoster').innerHTML=people.map(r=>`<button class="campus-roster-person" data-select-person="${r.person.id}" aria-pressed="${r.person.id===snapshot.selected}"><i style="background:${r.person.color}"></i><strong>${r.person.id}</strong><span>${escape(stateNames[r.state]||'대기')}</span></button>`).join('');
  find('campusRoster').querySelectorAll('[data-select-person]').forEach(button=>button.onclick=()=>window.dispatchEvent(new CustomEvent('verdant:office-select',{detail:button.dataset.selectPerson})));
  find('campusFeedCount').textContent=String(snapshot.events.length);
  find('campusFeed').innerHTML=snapshot.events.slice(-6).reverse().map(event=>`<button data-feed-person="${escape(event.agent)}"><time>${time(event.at)}</time><strong>${escape(event.agent)}</strong><span>${escape(event.message)}</span></button>`).join('')||'<p class="campus-empty-feed">아직 실행한 작업이 없습니다.<br>휴게공간의 움직임은 업무 대기를 표현합니다.</p>';
  find('campusFeed').querySelectorAll('[data-feed-person]').forEach(button=>button.onclick=()=>window.dispatchEvent(new CustomEvent('verdant:office-select',{detail:button.dataset.feedPerson})));
  const signals=Object.entries(roomNames).map(([room,name])=>{const busy=people.filter(r=>roomFor(r.person.id)===room&&r.state==='running').length;return `<span class="campus-room-signal signal-${room} ${busy?'occupied':''}">${busy?busy+'명 업무 중':room==='lounge'?'휴식·대기 공간':'업무 공간'}</span>`});
  find('officeRoomSignals').innerHTML=signals.join('');
}
function updateActors(){
  for(const resident of residents.values()){
    const {element,position,event}=resident;
    const left=(position[0]/12)+'%',top=(position[1]/7.8)+'%';
    if(element.style.left!==left)element.style.left=left;if(element.style.top!==top)element.style.top=top;
    element.classList.toggle('is-selected',resident.person.id===snapshot.selected);
    element.classList.toggle('is-working',!preview&&resident.state==='running'&&!resident.route.length);
    element.classList.toggle('is-walking',resident.route.length>0&&!reducedMotion.matches);
    element.dataset.state=resident.state;
    element.setAttribute('aria-pressed',String(resident.person.id===snapshot.selected));
    const accessibleLabel=`${resident.person.id} ${resident.person.name} · ${stateNames[resident.state]} · ${event?.message||'배정된 작업 없음'} · ${visualActivity(resident)}`;
    if(element.getAttribute('aria-label')!==accessibleLabel)element.setAttribute('aria-label',accessibleLabel);
    const bubbleText=preview?'미리보기 · '+(resident.route.length?'이동 중':'공간 체험'):resident.state==='running'?event?.message||'작업 중':resident.person.id===snapshot.selected?(event?.message||'업무 배정을 기다리고 있어요'):'';
    const bubble=element.querySelector('.resident-bubble');if(bubble.textContent!==bubbleText)bubble.textContent=bubbleText;
    element.title=event?.message||`${resident.person.name} · 업무 대기`;
  }
  const focus=residents.get(snapshot.selected);
  const points=focus?.route.length?[focus.position,...focus.route.map(id=>NODES[id])]:[];
  find('officeRoute').setAttribute('points',points.map(p=>p.join(',')).join(' '));
}
function beginRoute(resident,now){
  if(resident.route.length||now<resident.holdUntil)return;
  while(resident.stops.length&&resident.stops[0]===resident.node)resident.stops.shift();
  if(resident.stops.length){resident.route=routeBetween(resident.node,resident.stops[0]).slice(1);return}
  if(!preview&&resident.state!=='running'&&now>=resident.wanderAt){
    const restIds=[...PEOPLE.map(p=>p.rest),'coffeeStand','loungeWindow','readingSeat'],own=PEOPLE.findIndex(p=>p.id===resident.person.id);
    const occupied=new Set([...residents.values()].filter(r=>r!==resident).map(r=>r.stops.at(-1)||r.route.at(-1)||r.node));
    const available=restIds.filter(node=>node!==resident.node&&!occupied.has(node));
    if(available.length)resident.stops=[available[(own+(resident.phase==='rest'?1:0))%available.length]];
    resident.phase=resident.phase==='rest'?'coffee':'rest';resident.wanderAt=now+15000+own*1700;
  }
}
function previewMotion(now){
  if(!preview)return;
  for(const [index,resident] of [...residents.values()].entries()){
    const elapsed=now-previewStart-index*650;
    const stage=elapsed<0?-1:elapsed<11000?0:elapsed<23000?1:elapsed<36000?2:3;
    if(stage!==resident.previewStep){resident.previewStep=stage;
      const destination=stage===0?resident.person.work:stage===1?resident.person.meeting:resident.person.rest;
      if(stage>=0)resident.stops=addStops(resident.stops,[destination],3);
    }
  }
  if(now-previewStart>44000)togglePreview(false);
}
function animate(now){
  const seconds=Math.min(.05,lastFrame?(now-lastFrame)/1000:0);lastFrame=now;
  if(!find('officePanel').hidden&&document.visibilityState==='visible'){
    previewMotion(now);
    for(const resident of residents.values()){
      if(!reducedMotion.matches){beginRoute(resident,now);
        if(resident.route.length){const node=resident.route[0],next=stepToward(resident.position,NODES[node],seconds,preview?175:160);resident.position=next.position;resident.element.dataset.facing=next.facing;
          if(next.arrived){resident.node=node;resident.route.shift();if(!resident.route.length){if(resident.stops[0]===node)resident.stops.shift();resident.holdUntil=now+(node.includes('Desk')?1000:350)}}
        }
      }
    }
    updateActors();
    if(now-uiAt>1800){uiAt=now;const focus=residents.get(snapshot.selected);const note=find('campusFocus').querySelector('.campus-movement-note');if(note&&focus)note.textContent=visualActivity(focus)}
  }
  requestAnimationFrame(animate);
}
function togglePreview(value=!preview){
  preview=value;previewStart=performance.now();
  for(const resident of residents.values()){resident.stops=[];resident.previewStep=-1;resident.route=resident.route.slice(0,1);if(!preview)resident.stops=sceneSnapshot(snapshot.events,{running:snapshot.running}).find(p=>p.id===resident.person.id).destinations}
  find('officePreview').setAttribute('aria-pressed',String(preview));find('officePreview').textContent=preview?'미리보기 끝내기':'동선 미리보기';
  find('campusMotionLabel').textContent=preview?'공간 동선 미리보기 · API 조회·분석·원장 변경 없음':'이동·휴식은 공간 연출 · 작업 상태는 서버 기록';
  renderPanels();
}
find('officePreview').onclick=()=>togglePreview();
find('officeRun').onclick=()=>window.dispatchEvent(new Event('verdant:office-run'));
function applyZoom(){find('officeWorld').style.width=(zoom*100)+'%';find('officeWorld').classList.toggle('fit-world',zoom===1);find('officeFit').textContent=zoom===1?'전체 보기':Math.round(zoom*100)+'%'}
find('officeZoomIn').onclick=()=>{zoom=Math.min(2.5,zoom+.25);applyZoom()};
find('officeZoomOut').onclick=()=>{zoom=Math.max(1,zoom-.25);applyZoom()};
find('officeFit').onclick=()=>{zoom=1;applyZoom();find('officeViewport').scrollTo({left:0,top:0,behavior:'instant'})};
let focusMode=false,backgroundState=[];
function toggleFocus(){
  focusMode=!focusMode;find('officePanel').classList.toggle('campus-expanded',focusMode);document.body.classList.toggle('campus-focus-open',focusMode);
  if(focusMode){backgroundState=[...document.querySelector('main').children,document.querySelector('.sidebar')].filter(e=>e&&e!==find('officePanel')).map(element=>({element,inert:element.inert}));for(const entry of backgroundState)entry.element.inert=true}
  else{for(const entry of backgroundState)entry.element.inert=entry.inert;backgroundState=[]}
  find('officeFullscreen').textContent=focusMode?'집중 보기 닫기':'⛶';find('officeFullscreen').setAttribute('aria-label',focusMode?'사무실 집중 보기 닫기':'사무실 집중 보기');
  find('officeFullscreen').focus();
}
find('officeFullscreen').onclick=toggleFocus;
window.addEventListener('verdant:office-exit-focus',()=>{if(focusMode)toggleFocus();});
document.addEventListener('keydown',event=>{if(!focusMode)return;if(event.key==='Escape'){event.preventDefault();toggleFocus()}else if(event.key==='Tab'){
  const buttons=[...find('officePanel').querySelectorAll('button,[tabindex="0"],a[href]')].filter(e=>!e.disabled&&e.getClientRects().length);const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
}});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){for(const resident of residents.values()){resident.route=[];resident.stops=[];resident.position=[...NODES[resident.node]]}updateActors()}});
applyZoom();renderPanels();updateActors();requestAnimationFrame(animate);
window.dispatchEvent(new Event('verdant:office-ready'));
if(location.pathname==='/office')toggleFocus();
