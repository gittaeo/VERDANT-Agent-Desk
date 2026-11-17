import {priceEvidence} from './price-evidence.mjs';
export function stockDigest(stock){
 if(!stock?.company)return null;
 const observed=priceEvidence(stock.priceContext?.series||[]),news=stock.newsEvidence;
 const sources=['dart','prices','financials','news'].map(key=>({key,status:stock.coverage?.[key]||'unknown'}));
 const newsAvailable=news?.status==='available',support=newsAvailable?news.support?.length||0:null,risk=newsAvailable?news.risk?.length||0:null,watch=newsAvailable?news.watch?.length||0:null;
 const missing=sources.filter(s=>s.status!=='available').map(s=>s.key);
 const conclusion=!observed?'가격 자료가 부족합니다. 가격 방향 판단을 보류합니다.':support&&risk?'가격 관측과 함께 긍정·위험 기사가 공존합니다. 상반된 근거를 함께 확인하세요.':newsAvailable&&support===0&&risk===0?'실제 가격은 확인했지만 뉴스에서 방향을 뒷받침할 사건 근거가 부족합니다.':'가격·재무·뉴스의 확인 범위를 비교하고 다음 자료를 확인하세요.';
 return {sources,missing,conclusion,observed,news:{status:news?.status||'unknown',support,risk,watch,partial:Boolean(news?.partial)},recheck:[...(stock.brief?.short?.checks||[]).slice(0,1),...(stock.brief?.long?.checks||[]).slice(0,1)]};
}
