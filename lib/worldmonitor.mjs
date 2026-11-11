const endpoints=[['sentiment','/api/market/v1/get-fear-greed-index'],['predictions','/api/prediction/v1/list-prediction-markets?page_size=5'],['signals','/api/intelligence/v1/list-cross-source-signals']];
export function worldmonitorDataAvailable(data){
  if(!data||typeof data!=='object'||data.unavailable===true||data.dataAvailable===false||data.fetchedAt===0)return false;
  const values=[data.markets,data.signals,data.data,data.index,data.value,data.fearGreedIndex];
  return values.some(v=>Array.isArray(v)?v.length>0:typeof v==='number'?Number.isFinite(v):v&&typeof v==='object'?Object.keys(v).length>0:false);
}
export async function readWorldmonitor({baseUrl,fetcher=fetch,signal}={}){
  if(!baseUrl)return {status:'not_connected',checks:[],reason:'월드모니터 URL 미설정 · 세계 뉴스·예측 시장 근거 제외'};
  const base=new URL(baseUrl);if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('월드모니터 URL 설정 오류');
  const checks=[];
  // Each endpoint is inspected independently; a successful HTTP status is not data readiness.
  for(const [name,path] of endpoints){
    if(signal?.aborted)throw Error('분석 취소');
    try{const response=await fetcher(new URL(path,base),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});let data=null;try{data=await response.json()}catch{}
      checks.push({name,path,httpStatus:response.status,status:response.ok&&worldmonitorDataAvailable(data)?'available':'degraded',data});
    }catch{if(signal?.aborted)throw Error('분석 취소');checks.push({name,path,httpStatus:null,status:'unavailable',data:null})}
  }
  return {status:checks.every(c=>c.status==='available')?'available':'degraded',checks,reason:'HTTP 200만으로 준비 완료로 판단하지 않습니다. 비어 있는 자료는 검토 근거에서 제외합니다.'};
}
