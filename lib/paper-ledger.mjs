import {volumeRisk} from './agent-desk.mjs';

export const newLedger=()=>({version:1,initialCash:1000,cash:1000,positions:[],closed:[],events:[]});
const fee=value=>Math.max(.95,value*.0045);
export async function pairQuote(chain,pair,fetcher=fetch) {
  if(!/^[a-z0-9-]{1,40}$/i.test(chain)||!/^[a-z0-9]{10,160}$/i.test(pair))throw Error('페어 주소 형식 오류');
  const url=`https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${encodeURIComponent(pair)}`;
  const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('시세 조회 실패');
  const data=await response.json();
  const quote=data.pairs?.find(p=>p.chainId===chain&&p.pairAddress===pair);
  const price=Number(quote?.priceUsd);
  if(!Number.isFinite(price)||price<=0)throw Error('유효한 가격 없음');
  return {price,volume:quote.volume,liquidity:Number(quote.liquidity?.usd)||0,at:new Date().toISOString(),url};
}
export async function updateLedger(ledger,action,{fetcher=fetch,now=new Date()}={}) {
  const next=structuredClone(ledger),at=now.toISOString();
  const log=(type,detail)=>next.events.push({at,type,...detail});
  if(action.type==='observe') {
    if(next.positions.length>=7)throw Error('최대 모의 포지션 7개');
    if(next.positions.some(p=>p.chain===action.chain&&p.pair===action.pair))throw Error('이미 관찰 중인 페어');
    const dollars=Number(action.dollars);
    if(!Number.isFinite(dollars)||dollars<50||dollars>next.cash*.06)throw Error('관찰 금액은 50달러 이상, 남은 현금 6% 이하');
    const quote=await pairQuote(action.chain,action.pair,fetcher);
    if(quote.liquidity<10000||quote.liquidity<dollars*50)throw Error('유동성 기준 미달');
    const cost=dollars+fee(dollars);
    if(cost>next.cash)throw Error('수수료 포함 잔고 부족');
    next.cash-=cost;
    const position={id:crypto.randomUUID(),chain:action.chain,pair:action.pair,name:String(action.name||action.pair).slice(0,80),dollars,entryFee:fee(dollars),quantity:dollars/quote.price,entryPrice:quote.price,openedAt:at,quote,status:'observing',assumption:'관측 가격 가상 매입 · 슬리피지·호가·매도 가능성 미반영'};
    next.positions.push(position);log('OBSERVATION_OPENED',{positionId:position.id,quote});
  } else if(['refresh','close'].includes(action.type)) {
    const targets=action.type==='close'?next.positions.filter(p=>p.id===action.id):[...next.positions];
    if(action.type==='close'&&!targets.length)throw Error('포지션 없음');
    for(const position of targets) {
      let quote;
      try{quote=await pairQuote(position.chain,position.pair,fetcher)}catch{
        position.status='unpriced';position.lastAttemptAt=at;
        log('PRICE_UNAVAILABLE',{positionId:position.id,reason:'청산 요청 필요 · 가격 미확인으로 체결 기록 보류'});continue;
      }
      position.quote=quote;position.risk=volumeRisk(quote.volume);position.status='observing';
      if(action.type==='close'||position.risk.decision==='CLOSE_SIGNAL') {
        const gross=position.quantity*quote.price,exitFee=fee(gross);
        next.cash+=gross-exitFee;
        const closed={...position,closedAt:at,exitPrice:quote.price,exitFee,pnl:gross-exitFee-position.dollars-position.entryFee,reason:action.type==='close'?'사용자 관찰 종료':'거래량 비율 0.20 미만',status:'closed_observation'};
        next.closed.push(closed);next.positions=next.positions.filter(p=>p.id!==position.id);
        log('OBSERVATION_CLOSED',{positionId:position.id,reason:closed.reason,pnl:closed.pnl,quote});
      } else log('RISK_CHECK',{positionId:position.id,risk:position.risk});
    }
  } else throw Error('알 수 없는 원장 작업');
  next.events=next.events.slice(-500);next.closed=next.closed.slice(-200);
  next.updatedAt=at;
  return next;
}
