// Evidence-led summaries. Labels are reproducible review rules, not probabilities.
const amount = v => {
  if (v == null || String(v).trim()==='' || String(v).trim()==='-') return null;
  const s=String(v).replaceAll(',','').trim();
  const n=Number(s.startsWith('(')&&s.endsWith(')')?'-'+s.slice(1,-1):s);
  return Number.isFinite(n)?n:null;
};
const pct=(a,b)=>a!=null&&b>0?(a/b-1)*100:null;
const percent=n=>`${n>0?'+':''}${n.toFixed(1)}%`;
export function financialReportPeriods(now=new Date()) {
  const end=now.toISOString().slice(0,10), year=Number(end.slice(0,4)), periods=[];
  for(let y=year;y>=year-1;y--)for(const [code,month,day,label] of [['11011','12','31','연간'],['11014','09','30','3분기'],['11012','06','30','반기'],['11013','03','31','1분기']]) {
    if(`${y}-${month}-${day}`<end)periods.push({year:y,code,label:`${y}년 ${label}`,end:`${y}-${month}-${day}`});
  }
  return periods.slice(0,4);
}
export function extractFinancials(rows,period,basis) {
  const choose=(section,ids,names)=>rows.find(r=>section.includes(r.sj_div)&&ids.includes(r.account_id))||rows.find(r=>section.includes(r.sj_div)&&names.includes(r.account_nm?.replaceAll(' ','')));
  const metric=(row,income=false)=>{
    if(!row)return null;
    const cumulative=income&&period.code!=='11011'&&amount(row.thstrm_add_amount)!=null;
    const current=amount(cumulative?row.thstrm_add_amount:row.thstrm_amount);
    const previous=amount(cumulative?row.frmtrm_add_amount:(income&&period.code!=='11011'?row.frmtrm_q_amount:row.frmtrm_amount));
    return {value:current,previous,growth:pct(current,previous),basis:cumulative?'cumulative':income&&period.code!=='11011'?'quarter':'annual_or_balance',currency:row.currency||null,label:row.account_nm};
  };
  const revenue=metric(choose(['IS','CIS'],['ifrs-full_Revenue','ifrs-full_RevenueFromContractsWithCustomers'],['매출액','수익(매출액)','영업수익']),true);
  const operating=metric(choose(['IS','CIS'],['dart_OperatingIncomeLoss','ifrs-full_ProfitLossFromOperatingActivities'],['영업이익','영업이익(손실)','영업손익']),true);
  const assets=metric(choose(['BS'],['ifrs-full_Assets'],['자산총계']));
  const liabilities=metric(choose(['BS'],['ifrs-full_Liabilities'],['부채총계']));
  const cash=metric(choose(['CF'],['ifrs-full_CashFlowsFromUsedInOperatingActivities'],['영업활동현금흐름','영업활동으로인한현금흐름']));
  const receipt=rows.find(r=>/^\d{14}$/.test(r.rcept_no||''))?.rcept_no;
  const sameCurrency=(a,b)=>a?.currency&&a.currency===b?.currency;
  return {status:revenue||operating?'available':'partial',period,basis,revenue,operating,assets,liabilities,cash,
    operatingMargin:sameCurrency(revenue,operating)&&revenue.basis===operating.basis&&revenue.value>0&&operating.value!=null?operating.value/revenue.value*100:null,
    liabilitiesToAssets:sameCurrency(assets,liabilities)&&assets.value>0&&liabilities.value!=null?liabilities.value/assets.value*100:null,
    url:receipt?`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`:null};
}
export async function loadFinancials({company,now,key,request}) {
  if(!company)return {status:'company_required'};
  try {
    for(const period of financialReportPeriods(now))for(const basis of ['CFS','OFS']) {
      const response=await request('fnlttSinglAcntAll.json',{corp_code:company.corpCode,bsns_year:period.year,reprt_code:period.code,fs_div:basis});
      const data=await response.json();
      if(data.status==='013')continue;
      if(data.status!=='000'||!Array.isArray(data.list))return {status:'unavailable',message:'재무정보를 확인하지 못했습니다.'};
      return extractFinancials(data.list,period,basis);
    }
    return {status:'empty',message:'최근 보고서의 비교 가능한 재무자료가 없습니다.'};
  } catch {return {status:'unavailable',message:'재무정보 연결에 실패했습니다. 가격·공시 결과는 유지합니다.'};}
}
export function buildResearchBrief({company,disclosures,priceContext,financials,news}) {
  const evidence=[...disclosures], relevant=evidence.filter(e=>/실적|사업보고서|반기보고서|분기보고서|공급계약|수주|자기주식|유상증자|전환사채|합병|영업정지|소송/.test(e.title));
  const risks=relevant.filter(e=>/유상증자|전환사채|영업정지|소송/.test(e.title));
  const series=(priceContext?.series||[]).filter(r=>Number.isFinite(r.close)&&r.close>0),latest=series.at(-1);
  const move=series.length>=2?pct(latest.close,series[0].close):null;
  const priorVolumes=series.slice(0,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>=0);
  const volumeAverage=priorVolumes.length>=2?priorVolumes.reduce((a,b)=>a+b,0)/priorVolumes.length:null;
  const volumeRatio=volumeAverage>0&&Number.isFinite(latest?.volume)?latest.volume/volumeAverage:null;
  const short={label:'자료 보완',tone:'neutral',reasons:[],checks:[],invalidation:[],horizon:'단타 · 1–5거래일',evidence:[]};
  if(move!=null){
    short.label=Math.abs(move)>=10?'변동성 주의':move>0&&volumeRatio>=1.5?'관심 관찰':move>0?'거래량 확인':'반등 확인 필요';
    short.tone=Math.abs(move)>=10?'caution':move>0&&volumeRatio>=1.5?'positive':'neutral';
    short.reasons.push(`확인한 ${series.length}개 종가 구간의 가격 변화는 ${percent(move)}입니다. 배당·분할 미조정 기준입니다.`);
    if(volumeRatio!=null)short.reasons.push(`최근 거래량은 앞선 ${priorVolumes.length}개 자료 평균의 ${volumeRatio.toFixed(2)}배입니다.`);
    short.checks.push('다음 거래일의 가격 방향과 거래량이 함께 유지되는지 확인합니다.');
    short.invalidation.push('최근 흐름이 반전되거나 거래량이 줄면 이 관찰 판단을 다시 검토합니다.');
    short.evidence.push({label:'KRX 종가·거래량',date:latest.date});
  }else short.reasons.push('가격을 비교할 자료가 충분하지 않습니다.');
  if(risks.length){short.label='공시 위험 확인';short.tone='caution';short.reasons.push(`${risks.length}건의 자금조달·법적 이슈 관련 공시가 있어 원문 확인을 우선합니다.`);}
  short.checks.push('장중 호가·체결과 시장·업종 상대 강도는 아직 평가하지 못했습니다.');
  const long={label:'재무 확인 필요',tone:'neutral',reasons:[],checks:[],invalidation:[],horizon:'장기 · 6–12개월',evidence:[]};
  const f=financials;
  if(f?.revenue?.growth!=null&&f?.operating?.value!=null){
    const op=f.operating, rev=f.revenue;
    long.label=op.value<=0?'수익성 회복 확인':rev.growth>0&&op.growth>0?'실적 개선 관찰':'성장 지속성 확인';
    long.tone=long.label==='실적 개선 관찰'?'positive':op.value<=0?'caution':'neutral';
    long.reasons.push(`${f.period.label} ${f.basis==='CFS'?'연결':'별도'} 기준, 매출은 전년 동기 대비 ${percent(rev.growth)}입니다.`);
    if(op.growth!=null)long.reasons.push(`같은 보고서의 영업이익은 비교 기간보다 ${percent(op.growth)}입니다.`);
    else long.reasons.push(op.value>0?'영업이익은 양수지만 전기 손익 때문에 단순 성장률 비교는 생략했습니다.':'영업손익이 0 이하로, 수익성 회복 여부가 핵심입니다.');
    if(f.operatingMargin!=null)long.reasons.push(`보고서 기준 영업이익률은 ${f.operatingMargin.toFixed(1)}%입니다.`);
    if(f.cash?.value!=null)long.reasons.push(`영업활동 현금흐름은 ${f.cash.value>=0?'양수':'음수'}입니다.`);
    if(f.url)long.evidence.push({label:`${f.period.label} 재무 원문`,url:f.url});
    long.checks.push('다음 보고서에서도 매출·영업이익·현금흐름의 방향이 이어지는지 확인합니다.');
    long.invalidation.push('실적이 둔화하거나 현금흐름·부채 부담이 악화되면 판단을 재검토합니다.');
  }else long.reasons.push(f?.message||'비교 가능한 재무 수치가 충분하지 않습니다. 가격 상승만으로 장기 성장성을 판단하지 않습니다.');
  long.checks.push('적정 가치·경쟁력·산업 전망은 아직 평가하지 않았습니다. 실적 개선은 저평가를 의미하지 않습니다.');
  const newsConnected=news?.status==='available';
  const missing=[...(!newsConnected?['뉴스 미연결']:[]),'시장·업종 비교 미연결','가치평가 미완료'];
  const topEvents=relevant.slice(0,3).map(e=>({title:e.title,name:e.name,url:e.url,date:e.receiptDate,
    takeaway:/정정/.test(e.title)?'기존 내용의 변경 범위를 확인해야 합니다.':/자기주식/.test(e.title)?'주주환원 관련 공시입니다. 취득·처분·소각 여부와 규모가 중요합니다.':/실적|사업보고서|분기보고서|반기보고서/.test(e.title)?'실적·재무를 확인할 자료입니다. 아래 장기 관점과 함께 보세요.':/유상증자|전환사채/.test(e.title)?'자금 조달 관련 공시입니다. 희석 조건과 사용 목적을 확인해야 합니다.':'사업 이벤트 관련 공시입니다. 계약 조건과 실적 반영 규모를 확인해야 합니다.'}));
  const headline=company?`${company.name}: 단타는 ‘${short.label}’, 장기는 ‘${long.label}’입니다.`:`${disclosures.length}건 중 사업·실적·자금 관련 공시 ${relevant.length}건을 추렸습니다.`;
  const overview=company?`${latest?`가격은 ${latest.date} 종가까지 확인했습니다.`:'가격 자료가 충분하지 않습니다.'} ${f?.period?`장기 관점은 ${f.period.label} 재무자료에 근거합니다.`:'장기 판단은 재무자료 보완이 필요합니다.'} 현재 판단은 관찰 우선순위이며 매수·매도 신호가 아닙니다.`:'보유·관심 종목을 선택하면 가격·거래량과 재무 수치를 결합한 단타·장기 판단을 제공합니다.';
  return {version:'evidence-rules-v1',headline,overview,short,long,topEvents,eventCounts:{total:disclosures.length,relevant:relevant.length,risk:risks.length},metrics:{move,volumeRatio},missing,
    sourceNotes:['공시 유형은 제목을 분류한 것입니다. 본문 전체 해석과 구분합니다.','뉴스가 연결되지 않았다면 주가 변동 원인을 기사에서 확인한 것으로 설명하지 않습니다.'],
    watchCandidates:company?[]:[...new Map([...relevant].reverse().filter(e=>e.stockCode).map(e=>[e.stockCode,e])).values()].slice(0,4).map(e=>({name:e.name,stockCode:e.stockCode,title:e.title,url:e.url}))};
}
