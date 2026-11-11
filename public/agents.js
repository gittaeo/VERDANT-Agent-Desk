'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleList=[['CHIEF','총괄','작업 배분 · 근거 종합'],['SCAN','탐색','실제 자료 · 후보 수집'],['VET','검증','자료 품질 · 조건 검사'],['BOOK','맥락','공시·뉴스 · 반대 근거'],['SIZE','규모','자금 상한 · 수수료'],['FILLS','기록','가상 관찰 · 기록'],['RISK','위험','거래량 · 불확실성']];
const labels={waiting:'대기',running:'실행 중',completed:'완료',partial:'부분 확인',blocked:'보류',rejected:'조건 탈락'};
const money=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:8}).format(Number(n)):'미확인';
const kst=v=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(v));
let events=[],selected='CHIEF',result=null,abort=null,toastTimer=null,statusInfo=null,paper=null;
const browserHistoryKey='verdant-agent-desk-history-v1';
function browserHistory(){try{const rows=JSON.parse(localStorage.getItem(browserHistoryKey)||'[]');return Array.isArray(rows)?rows.filter(r=>r?.version==='agent-desk-v1'&&typeof r.id==='string').slice(0,10):[]}catch{return []}}
function saveBrowserRun(run){try{localStorage.setItem(browserHistoryKey,JSON.stringify([run,...browserHistory().filter(r=>r.id!==run.id)].slice(0,10)))}catch{toast('브라우저 기록 저장 실패 · JSON으로 내보내 주세요.')}}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500)}
function showDialog(title,html){$('#dialogTitle').textContent=title;$('#dialogBody').innerHTML=html;$('#infoDialog').showModal()}
$('#closeDialog').onclick=()=>$('#infoDialog').close();
async function api(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const data=await r.json();if(!r.ok)throw Error(data.error||'조회 실패');return data}
function renderTeam(){
  $('#team').innerHTML=roleList.map(([id,name,job])=>{const e=events.findLast(x=>x.agent===id),state=e?.state||'waiting';return `<button class="agent ${esc(state)}" data-agent="${id}" aria-pressed="${selected===id}"><span class="agent-code">${id}</span><strong>${name}</strong><small>${job}</small><span class="state ${esc(state)}">${labels[state]||state}</span></button>`}).join('');
  $('#team').querySelectorAll('[data-agent]').forEach(button=>button.onclick=()=>{selected=button.dataset.agent;renderTeam();renderDetail()});
}
function renderDetail(){
  $('#selectedAgent').textContent=selected;const own=events.filter(e=>e.agent===selected),last=own.at(-1);
  if(!last){$('#agentDetail').innerHTML='<span class="large-symbol">◈</span><h3>작업을 기다리고 있습니다.</h3><p>서버에서 실행한 검사와 핵심 판단 근거가 여기에 표시됩니다.</p>';window.dispatchEvent(new Event('desk:update'));return}
  $('#agentDetail').innerHTML=`<span class="badge">${esc(labels[last.state]||last.state)}</span><h3>${esc(roleList.find(r=>r[0]===selected)[1])}의 검토 기록</h3>${own.slice(-12).map(e=>`<p><small class="muted">${kst(e.at)} · ${e.engine?'LLM 해석':'규칙·도구 실행'}</small><br>${esc(e.message)}${e.checks?`<table>${e.checks.map(c=>`<tr><td>${esc(c.name)}</td><td>${c.pass?'✓ 통과':'! 미통과'}</td></tr>`).join('')}</table>`:''}${e.evidenceIds?.length?`<br><small class="muted">근거 ${e.evidenceIds.map(esc).join(', ')}</small>`:''}</p>`).join('')}<p class="muted">표시된 내용은 실행 기록과 핵심 검토 요약입니다. 모델의 내부 사고 전체를 표시하지 않습니다.</p>`;
  window.dispatchEvent(new Event('desk:update'));
}
function renderEvents(){
  renderTeam();renderDetail();$('#eventCount').textContent=`${events.length} EVENTS`;
  const timeline=$('#timeline'),nearBottom=timeline.scrollTop+timeline.clientHeight>=timeline.scrollHeight-80;
  timeline.innerHTML=events.map(e=>`<li><time>${kst(e.at)}</time><span class="timeline-code">${esc(e.agent)}</span><span>${esc(e.message)}</span></li>`).join('')||'<li class="empty">분석을 시작하면 실제 작업이 표시됩니다.</li>';
  if(nearBottom)timeline.scrollTop=timeline.scrollHeight;
}
function markInterrupted(){for(const [agent] of roleList){const last=events.findLast(e=>e.agent===agent);if(last?.state==='running')events.push({seq:events.length+1,agent,state:'partial',at:new Date().toISOString(),message:'작업 중단 · 완료 결과 없음',source:'browser'})}}
function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}}
function stockSummary(stock){
  if(!stock?.brief)return '';
  const brief=stock.brief,link=(label,url)=>{const safe=safeUrl(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:esc(label)};
  const views=['short','long'].map(key=>{const view=brief[key];return `<article class="candidate"><h3>${esc(view.horizon)}</h3><p><strong>${esc(view.label)}</strong></p>${view.reasons.map(r=>`<p>${esc(r)}</p>`).join('')}<p class="muted">추가 확인</p>${view.checks.map(r=>`<p class="muted">${esc(r)}</p>`).join('')}</article>`}).join('');
  return `<section class="stock-brief"><h3>${esc(brief.headline)}</h3><p class="muted">${esc(brief.overview)}</p><div class="candidates">${views}</div><h3>공시 근거</h3>${brief.topEvents.map(e=>`<p class="muted">${link(e.title,e.url)}<br>${esc(e.date)} · ${esc(e.takeaway)}</p>`).join('')||'<p class="muted">주요 공시 없음</p>'}<h3>뉴스의 상반된 근거</h3>${['support','risk','watch'].map(bucket=>`<div class="review"><strong>${{support:'긍정 사건 검토',risk:'위험 사건 검토',watch:'방향 판단 보류'}[bucket]}</strong>${(stock.newsEvidence?.[bucket]||[]).map(item=>`<p>${link(item.title,item.url)}<br>${esc(item.reason)}<br><small class="muted">${esc(item.check)} · ${esc(item.timing)}</small></p>`).join('')||'<p class="muted">확인된 기사 없음 · 중립 판단을 의미하지 않습니다.</p>'}</div>`).join('')}</section>`;
}
function renderResult(){
  $('#exportButton').disabled=!result;if(!result)return;
  $('#conclusion').textContent=result.conclusion;
  $('#warnings').innerHTML=(result.warnings||[]).map(w=>`<p class="warning">${esc(w)}</p>`).join('');
  $('#candidates').innerHTML=result.candidates.map((c,i)=>`<article class="candidate"><div class="candidate-top"><h3>${esc(c.name)}</h3><span class="badge">${esc(c.inspection?.decision|| (c.strategy==='short'?'단타 관찰':'장기 관찰'))}</span></div><p class="muted">${esc(c.chain||c.market||'국내 주식')} · ${esc(c.stockCode||c.contract||'')}<br>${esc(c.pairAddress||'')}</p><div class="metrics"><div><small>${c.chain?'관측 가격 USD':'종가 KRW'}</small>${c.chain?money(c.price):esc(Number(c.close).toLocaleString())}</div><div><small>${c.chain?'유동성 USD':'기준일'}</small>${c.chain?money(c.liquidity):esc(c.asOf)}</div></div><div class="checks">${c.inspection?c.inspection.checks.map(check=>`${check.pass?'✓':'!'} ${esc(check.name)}`).join('<br>'):(c.reasons||[]).map(esc).join('<br>')}</div>${c.risk?`<p>거래량 비율 ${c.risk.ratio===null?'미확인':Number(c.risk.ratio).toFixed(3)} · ${esc(c.risk.decision)}</p>`:''}<p class="muted">${esc(c.inspection?.reason||'기존 VERDANT의 규칙 기반 후보입니다. 수익률 예측이 아닙니다.')}</p>${c.chain?`<button data-observe="${i}" ${c.inspection.decision==='REJECT'?'disabled':''}>관측 가격으로 가상 관찰 기록 +</button>`:''}</article>`).join('')||'<p class="muted">조건에 맞는 후보가 없습니다. 임의 후보로 채우지 않습니다.</p>';
  $('#candidates').querySelectorAll('[data-observe]').forEach(b=>b.onclick=()=>observe(Number(b.dataset.observe)));
  $('#reviews').innerHTML=result.reviews.map(r=>`<div class="review"><strong>${esc(r.role)} · ${r.status==='available'?'AI 해석':r.status==='failed'?'검토 실패':'LLM 미연결'}</strong><br>${esc(r.summary)}${r.evidenceIds?.length?`<br><small class="muted">참조 ${r.evidenceIds.map(esc).join(', ')}</small>`:''}</div>`).join('');
  $('#reviews').insertAdjacentHTML('afterbegin',stockSummary(result.stock));
  $('#evidence').innerHTML=result.evidence.map(e=>{const url=safeUrl(e.url);return `<details><summary>${esc(e.id)} · ${esc(e.kind)} · ${esc(e.observedAt)}</summary>${url?`<p><a target="_blank" rel="noopener noreferrer" href="${esc(url)}">조회 출처 열기 ↗</a></p>`:''}<pre>${esc(JSON.stringify(e.value,null,2))}</pre></details>`}).join('');
}
$('#runForm').onsubmit=async e=>{
  e.preventDefault();if(abort)return;abort=new AbortController();events=[];result=null;renderEvents();
  $('#conclusion').textContent='실제 자료를 확인하고 있습니다.';$('#candidates').innerHTML='';$('#warnings').innerHTML='';$('#reviews').innerHTML='';$('#evidence').innerHTML='';$('#exportButton').disabled=true;
  $('#runButton').disabled=true;$('#cancelButton').hidden=false;$('#runState').textContent='팀 분석 실행 중';
  try{
    const response=await fetch('/api/desk/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({market:$('#market').value,query:$('#query').value.trim(),modelMode:$('#modelMode').value}),signal:abort.signal});
    if(!response.ok)throw Error('분석 요청 실패');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',received=false;
    const process=line=>{if(!line.trim())return;const data=JSON.parse(line);if(data.type==='event'){events.push(data.data);renderEvents()}else if(data.type==='result'){result=data.data;received=true;if(statusInfo?.execution==='hosted')saveBrowserRun(result);renderResult();$('#runState').textContent=result.status==='degraded'?'부분 데이터 · 분석 완료':'분석 완료'}else if(data.type==='error')throw Error(data.data.message)};
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines)process(line)}
    buffer+=decoder.decode();if(buffer.trim())process(buffer);if(!received)throw Error('완료 결과를 받지 못했습니다. 연결을 확인해 주세요.');
  }catch(error){const cancelled=error.name==='AbortError';$('#runState').textContent=cancelled?'분석 취소':'분석 실패';$('#conclusion').textContent=cancelled?'분석을 취소했습니다. 완료 결과로 저장하지 않습니다.':error.message;markInterrupted();renderEvents();toast(cancelled?'분석 취소':error.message)}finally{abort=null;$('#runButton').disabled=false;$('#cancelButton').hidden=true;window.dispatchEvent(new Event('desk:update'))}
};
$('#cancelButton').onclick=()=>abort?.abort();
$('#market').onchange=()=>{const stock=$('#market').value==='stocks';$('#query').value=stock?'삼성전자':'BONK';$('#query').placeholder=stock?'기업명·6자리 종목코드 (빈칸: 시장 탐색)':'코인 이름 또는 계약 주소'};
$('#exportButton').onclick=()=>{if(!result)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.href=url;a.download=`verdant-${result.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#historyButton').onclick=async()=>{try{const hosted=statusInfo?.execution==='hosted',rows=hosted?browserHistory():await api('/api/desk/history');showDialog(hosted?'분석 기록 · 이 브라우저에 저장':'분석 기록 · PC 서버에 저장',rows.map(r=>`<button class="history-row" data-run="${esc(r.id)}">${esc(r.query||'시장 탐색')} · ${esc(r.market)}<small>${esc(new Date(r.createdAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))} · ${esc(r.status)}</small></button>`).join('')||'<p>저장된 완료 분석이 없습니다.</p>');$('#dialogBody').querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{try{if(abort){toast('진행 중인 분석을 먼저 완료하거나 취소해 주세요.');return}result=hosted?rows.find(r=>r.id===b.dataset.run):await api('/api/desk/history/'+encodeURIComponent(b.dataset.run));events=result.events;renderEvents();renderResult();$('#runState').textContent='저장된 분석 재열기';$('#infoDialog').close()}catch(e){toast(e.message)}})}catch(e){toast(e.message)}};
$('#settingsButton').onclick=()=>showDialog('LLM 연결 · 실행 안내',`<p>현재 모드: <strong>${esc(statusInfo?.model?.provider||'확인 전')}</strong> / 모델 ${esc(statusInfo?.model?.model||'미설정')}</p><p>서버 환경변수로 모델을 선택합니다. 설정 후 로컬 서버를 재시작하세요. 키는 브라우저나 Git에 저장하지 않습니다.</p><h3>로컬 Ollama</h3><pre>$env:VERDANT_LLM_PROVIDER = 'ollama'\n$env:VERDANT_LLM_MODEL = '설치한 모델 이름'\n$env:VERDANT_LLM_BASE_URL = 'http://127.0.0.1:11434'\nnode scripts/local-dashboard.mjs</pre><h3>호환 API</h3><p>VERDANT_LLM_PROVIDER=compatible, VERDANT_LLM_BASE_URL(제공사의 /v1 주소), VERDANT_LLM_MODEL, VERDANT_LLM_API_KEY를 서버 환경에 설정합니다. 검토 결과에는 근거 ID가 필요하며, 검증 실패 시 규칙 결과를 유지합니다.</p><p>로컬 서버의 5분 감시는 서버 실행 중에만 동작합니다. 현재 웹 호스팅과 로컬 원장은 자동 동기화되지 않습니다.</p><p><a href="https://docs.ollama.com/api/introduction" target="_blank" rel="noopener noreferrer">Ollama 공식 문서 ↗</a></p>`);
async function loadPaper(){paper=await api('/api/desk/paper');renderPaper()}
function renderPaper(){
  const unpriced=paper.positions.some(p=>p.status==='unpriced');
  const marked=paper.positions.reduce((s,p)=>s+(p.quote?.price||p.entryPrice)*p.quantity,0);
  $('#paperSummary').innerHTML=`<div><small>가상 현금</small>${money(paper.cash)}</div><div><small>최근 관측 총자산 · 매도 수수료 전${unpriced?' · 미평가 포함':''}</small>${money(paper.cash+marked)}</div><div><small>열린 관찰</small>${paper.positions.length} / 7</div>`;
  $('#positions').innerHTML=paper.positions.map(p=>`<div class="position"><div><strong>${esc(p.name)}</strong><p>${money(p.dollars)} · ${esc(p.status)} · ${esc(p.risk?.decision||'첫 감시 전')}<br>최근 관측 ${esc(p.quote.at)}<br>${esc(p.assumption)}</p></div><button data-close="${esc(p.id)}">관찰 종료</button></div>`).join('')||'<p class="muted">열린 관찰이 없습니다. 자동 진입은 필수 검증 부족으로 보류됩니다.</p>';
  $('#positions').querySelectorAll('[data-close]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{paper=await api('/api/desk/paper',{type:'close',id:b.dataset.close});renderPaper();toast('원장 확인 완료. 가격 미확인 시 관찰이 유지됩니다.')}catch(e){toast(e.message);b.disabled=false}});
  $('#closed').innerHTML=paper.closed.slice().reverse().map(p=>`<div class="position"><div>${esc(p.name)} · ${esc(p.reason)}<p>${esc(p.closedAt)}</p></div><span>${money(p.pnl)}</span></div>`).join('')||'<p class="muted">종료 기록 없음</p>';
  window.dispatchEvent(new Event('desk:update'));
}
function observe(index){const c=result?.candidates[index];if(!c)return;showDialog('관측 가격으로 가상 관찰',`<p><strong>${esc(c.name)} · ${esc(c.chain)}</strong></p><p>검증되지 않은 자산의 관측 가격을 기록하는 실험입니다. 실제 주문이나 실행 가능한 모의 체결이 아닙니다. 수수료는 0.45%, 최소 $0.95로 계산합니다.</p><form id="observeForm"><label>가상 금액 USD (최소 50, 남은 현금의 최대 6%)<input id="observeAmount" type="number" min="50" step="0.01" value="50" required></label><p><button class="primary">가상 관찰 기록</button></p><p id="observeError" role="status"></p></form>`);$('#observeForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{paper=await api('/api/desk/paper',{type:'observe',chain:c.chain,pair:c.pairAddress,name:c.name,dollars:Number($('#observeAmount').value)});renderPaper();$('#infoDialog').close();toast('가상 관찰을 기록했습니다.')}catch(e){$('#observeError').textContent=e.message;button.disabled=false}}}
$('#paperButton').onclick=()=>$('#paperSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
$('#refreshPaper').onclick=async()=>{const b=$('#refreshPaper');b.disabled=true;try{paper=await api('/api/desk/paper',{type:'refresh'});renderPaper();toast('가격·위험 확인 완료')}catch(e){toast(e.message)}finally{b.disabled=false}};
renderTeam();
api('/api/desk/status').then(data=>{statusInfo=data;const available=Object.values(data.models||{}).filter(m=>m.configured);$('#connection').textContent=available.length?`LLM ${available.length}개 설정됨`:'규칙 기반 · LLM 미연결';for(const id of ['ollama','compatible']){const model=data.models?.[id],option=$('#modelMode').querySelector(`[value="${id}"]`);option.disabled=!model?.configured;option.textContent=`${id==='ollama'?'로컬 LLM':'외부 API'} · ${model?.configured?model.model:'미설정'}`}$('#modeNote').textContent=`실제 주문 없음 · ${data.background} · 근거 ID로 검토 내용을 확인하세요.`;if(data.execution==='hosted'){$('#paperSummary').textContent='모의 원장·5분 감시는 PC 서버에서 사용할 수 있습니다. 웹 분석 기록은 이 브라우저에 저장됩니다.';$('#refreshPaper').disabled=true}else loadPaper().catch(()=>$('#paperSummary').textContent='원장 연결을 확인해 주세요.')}).catch(()=>{$('#connection').textContent='데스크 API 연결 실패';$('#paperSummary').textContent='데스크 API 연결을 확인해 주세요.'});
setInterval(()=>{if(statusInfo?.execution==='local'&&document.visibilityState==='visible')loadPaper().catch(()=>{})},30000);

