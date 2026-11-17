import {reviewEvidence,modelStatus} from './agent-desk.mjs';
export const publicSources=config=>({dart:Boolean(config.key),krx:Boolean(config.krxKey),news:Boolean(config.newsClientId&&config.newsClientSecret),flow:Boolean(config.kisAppKey&&config.kisAppSecret)});
export async function probeModel({config,batchReviewer,signal,fetcher}={}){
 const checkedAt=new Date().toISOString(),start=Date.now();
 if(!modelStatus(config).configured)return {status:'not_configured',checkedAt,checks:[],message:'선택한 검토 엔진의 PC 또는 서버 설정이 필요합니다.'};
 const evidence=[{id:'E1',kind:'diagnostic_sample',value:{label:'연결 점검용 가상 예제',observations:5,missing:['시장·업종 비교'],instruction:'원자료 아님 · 투자 판단에 사용하지 않음'}}];
 try{
  let usage,cached=false;
  if(config.provider==='codex'){const batch=await batchReviewer(evidence,{signal});usage=batch.usage;cached=batch.cached;}
  else await reviewEvidence({role:'BOOK',evidence,config,signal,fetcher});
  return {status:'available',checkedAt,durationMs:Date.now()-start,checks:['응답 수신','JSON 구조','제공된 근거 ID'],usage,cached,message:'예제 응답과 근거 ID 형식을 확인했습니다. 실제 금융 분석의 정확도·성과를 검증한 결과는 아닙니다.'};
 }catch{return {status:signal?.aborted?'cancelled':'failed',checkedAt,durationMs:Date.now()-start,checks:[],message:'엔진 응답·근거 형식 확인 실패. 로그인·설정·사용 한도를 확인하세요. 자동 재시도하지 않습니다.'};}
}
