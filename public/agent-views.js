'use strict';
let deskTab='research',logFilter='all';
function setDeskTab(name,focus=false){
  deskTab=name;
  $('main').classList.toggle('immersive',name!=='research');
  for(const id of ['research','control','office']){const button=$(`#${id}Tab`);button.setAttribute('aria-selected',String(id===name));button.tabIndex=id===name?0:-1;$(`#${id}Panel`).hidden=id!==name;if(focus&&id===name)button.focus()}
  renderLiveViews();
}
document.querySelectorAll('[data-tab]').forEach(button=>{
  button.onclick=()=>setDeskTab(button.dataset.tab);
  button.onkeydown=e=>{const names=['research','control','office'],index=names.indexOf(deskTab);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();setDeskTab(e.key==='Home'?'research':e.key==='End'?'office':names[(index+(e.key==='ArrowRight'?1:2))%3],true)}};
});
document.querySelectorAll('[data-log]').forEach(button=>button.onclick=()=>{logFilter=button.dataset.log;document.querySelectorAll('[data-log]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderControlLog()});
$('#officeEvidenceButton').onclick=()=>{setDeskTab('research');$('#agentDetail').scrollIntoView({block:'center'})};
function chooseViewAgent(id){selected=id;renderTeam();renderDetail()}
function latestAgent(id){return events.findLast(e=>e.agent===id)}
function renderControlLog(){
  const visible=events.filter(e=>logFilter==='all'||e.agent===logFilter);
  $('#controlLog').innerHTML=visible.slice(-100).map(e=>`<button class="console-row" data-log-agent="${esc(e.agent)}"><time>${kst(e.at)}</time><span class="log-agent">${esc(e.agent)}</span><span>${esc(e.message)}</span><small>${esc(labels[e.state]||e.state)}</small></button>`).join('')||'<p class="muted">실행 기록이 없습니다. 위에서 분석을 시작하세요.</p>';
  $('#controlLog').querySelectorAll('[data-log-agent]').forEach(b=>b.onclick=()=>chooseViewAgent(b.dataset.logAgent));
}
function renderLiveViews(){
  const running=Boolean(abort)&&!result;
  $('#controlLive').textContent=running?'● 실제 분석 중':result?'분석 완료 · 저장된 결과':'분석 대기';
  $('#officeState').textContent=running?'실행 중인 담당자가 작업하고 있습니다':result?'마지막 분석의 작업 상태':'팀 작업 대기';
  const elapsed=events.length>1?Math.max(0,new Date(events.at(-1).at)-new Date(events[0].at)):0;
  const duration=elapsed<1000&&events.length>1?'< 1초':`${(elapsed/1000).toFixed(1)}초`;
  const net=paper?paper.closed.reduce((sum,p)=>sum+p.pnl,0):null;
  const stat=(label,value,note='')=>`<div class="control-stat"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`;
  $('#controlStats').innerHTML=stat('관측 원장 시작 자금',paper?money(paper.initialCash):'—','가상 USD')+stat('현재 가상 현금',paper?money(paper.cash):'—',paper?'수수료 반영':'PC 원장 연결 시 표시')+stat('종료한 관찰 손익',net===null?'—':money(net),'실제 체결 수익 아님')+stat('분석 기록 구간',events.length?duration:'—',`${events.length}개 서버 이벤트`);
  const laneDefs=[['SCAN','탐색','01'],['VET','검증','02'],['FILLS','가상 기록','03'],['RISK','위험 감시','04']];
  $('#controlLanes').innerHTML=laneDefs.map(([id,name,no])=>{
    const event=latestAgent(id),state=event?.state||'waiting',own=events.filter(e=>e.agent===id),checks=own.filter(e=>e.checks).flatMap(e=>e.checks);
    return `<button class="control-lane lane-${id} ${state}" data-lane-agent="${id}" aria-pressed="${selected===id}"><div class="lane-head"><span>${name}</span><b>${no}</b></div><small class="lane-state">${labels[state]||state}</small><h3>${id==='SCAN'?(result?result.candidates.length+'개 검토':'후보 수집'):id==='VET'?(checks.length?checks.filter(c=>c.pass).length+'/'+checks.length+' 조건 통과':'자료 품질 검사'):id==='FILLS'?(paper?paper.positions.length+'개 가상 관찰':'관찰 원장'):result?result.riskSignals+'개 청산 신호':'위험 조건 검사'}</h3><p>${esc(event?.message||'실제 작업을 기다리고 있습니다.')}</p><div class="event-ticks" aria-label="담당자 이벤트 ${own.length}건">${own.slice(-18).map(e=>`<i class="tick-${e.state}" title="${esc(labels[e.state]||e.state)}"></i>`).join('')}</div><small class="muted">${id} · ${own.length}개 실행 기록</small></button>`;
  }).join('');
  $('#controlLanes').querySelectorAll('[data-lane-agent]').forEach(b=>b.onclick=()=>chooseViewAgent(b.dataset.laneAgent));
  renderControlLog();
  $('#controlDetail').innerHTML=$('#agentDetail').innerHTML;
  $('#officeDetail').innerHTML=$('#agentDetail').innerHTML;
  $('#officeSelected').textContent=`${roleList.find(r=>r[0]===selected)[1]}의 작업 기록`;
  $('#officeRooms').innerHTML=roleList.map(([id,name,job],i)=>{
    const last=latestAgent(id),state=last?.state||'waiting';
    return `<button class="office-room room-${id} ${state}" style="--room-accent:${['#c1f879','#dfb173','#66c8be','#afa0d8','#a7c68c','#a1b9ed','#e6be66'][i]}" data-room-agent="${id}" aria-pressed="${selected===id}"><div class="room-header"><strong>${id} <span>${name}</span></strong><small>${esc(labels[state]||state)}</small></div><div class="room-scene" aria-hidden="true"><div class="window-pixels"></div><div class="plant-pixels"></div><div class="pixel-desk"><div class="pixel-monitor"><i></i><i></i><i></i></div><div class="pixel-keyboard"></div><div class="pixel-mug"></div></div><div class="pixel-chair"></div><div class="pixel-agent"><div class="pixel-hair"></div><div class="pixel-face"></div><div class="pixel-body"></div><div class="pixel-arm"></div></div><div class="room-light"></div></div><p class="room-task">${esc(last?.message||job+' · 작업 대기')}</p><span class="room-evidence">${last?`${kst(last.at)} · ${last.evidenceIds?.length?'근거 '+last.evidenceIds.map(esc).join(', '):'실행 기록'}`:'조회·검토 기록이 생기면 표시됩니다.'}</span></button>`;
  }).join('');
  $('#officeRooms').querySelectorAll('[data-room-agent]').forEach(b=>b.onclick=()=>chooseViewAgent(b.dataset.roomAgent));
}
window.addEventListener('desk:update',renderLiveViews);
renderLiveViews();
if(['control','office'].includes(location.hash.slice(1)))setDeskTab(location.hash.slice(1));
