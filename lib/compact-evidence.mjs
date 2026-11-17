// A bounded public-data packet, shared by the local Codex adapter and tests.
export function compactEvidence(evidence,budget=6000){
 const raw=evidence.filter(e=>e.kind!=='agent_review');
 const selected=raw.length>6?[...raw.slice(0,4),...raw.slice(-2)]:raw;
 const perItem=Math.max(100,Math.floor((budget-700)/Math.max(1,selected.length)));
 return selected.map(e=>{
  let value=e.value;
  if(e.kind==='stock_research')value={company:value.company,coverage:value.coverage,prices:value.priceContext?.series,news:Object.fromEntries(['support','risk','watch'].map(k=>[k,(value.newsEvidence?.[k]||[]).slice(0,2).map(n=>({title:n.title,reason:n.reason,check:n.check,timing:n.timing}))])),financials:{period:value.financials?.period,revenue:value.financials?.revenue,operating:value.financials?.operating,cash:value.financials?.cash},brief:{headline:value.brief?.headline,short:value.brief?.short?.label,long:value.brief?.long?.label}};
  if(e.kind==='dex_pair')value={chain:value.chain||value.chainId,contract:value.contract||value.baseToken?.address,symbol:value.symbol||value.baseToken?.symbol,pairAddress:value.pairAddress,priceUsd:value.priceUsd,liquidity:value.liquidity,volume:value.volume,txns:value.txns,pairCreatedAt:value.pairCreatedAt};
  if(e.kind==='rule_checks')value={sizing:value.sizing,riskSignals:value.riskSignals,warnings:value.warnings,candidates:value.candidates?.slice(0,4).map(c=>({name:c.name,inspection:c.inspection,reasons:c.reasons,risk:c.risk}))};
  const data=JSON.stringify(value??null);
  return {id:e.id,kind:e.kind,data:data.slice(0,perItem),truncated:data.length>perItem};
 });
}
export function validateBatch(value,packet){
 const allowed=new Set(packet.map(e=>e.id)),roles=['BOOK','RISK','CHIEF'];
 if(!Array.isArray(value?.reviews)||value.reviews.length!==3)throw Error('Codex 응답 형식 확인 필요');
 return roles.map(role=>{const matches=value.reviews.filter(r=>r.role===role),r=matches[0];
  if(matches.length!==1||typeof r.summary!=='string'||!r.summary.trim()||r.summary.length>1200||!Array.isArray(r.evidenceIds)||!r.evidenceIds.length||r.evidenceIds.some(id=>!allowed.has(id)))throw Error('Codex 근거 ID 검증 실패');
  return {role,summary:r.summary,evidenceIds:[...new Set(r.evidenceIds)],status:'available',engine:'codex',label:'Codex 해석 · 원문 사실과 별도 검토 필요'};
 });
}
