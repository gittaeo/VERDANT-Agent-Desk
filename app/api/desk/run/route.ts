import {env} from 'cloudflare:workers';
import {runDesk} from '../../../../lib/agent-desk.mjs';
import {modelProfiles,selectModel} from '../../../../lib/model-config.mjs';
export async function POST(request:Request){
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'허용되지 않은 요청'},{status:403});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON 입력 필요'},{status:400});
  if(Number(request.headers.get('content-length'))>4096)return Response.json({error:'요청 크기 초과'},{status:413});
  let body;try{const raw=await request.text();if(raw.length>4096)return Response.json({error:'요청 크기 초과'},{status:413});body=JSON.parse(raw)}catch{return Response.json({error:'JSON 입력 오류'},{status:400})}
  if(!['crypto','stocks'].includes(body.market)||typeof body.query!=='string'||body.query.length>80)return Response.json({error:'시장·검색어 입력 오류'},{status:400});
  const e=env as any,encoder=new TextEncoder();
  let llm;try{llm=selectModel(modelProfiles(e),body.modelMode||'rules')}catch{return Response.json({error:'선택한 모델의 서버 설정이 필요합니다.'},{status:400})}
  const stream=new ReadableStream({async start(controller){
    let closed=false;
    const emit=(type:string,data:unknown)=>{if(!closed)try{controller.enqueue(encoder.encode(JSON.stringify({type,data})+'\n'))}catch{closed=true}};
    try{const result=await runDesk({market:body.market,query:body.query,signal:request.signal,onEvent:(data:unknown)=>emit('event',data),stockConfig:{key:e.DART_API_KEY,krxKey:e.KRX_API_KEY,kisAppKey:e.KIS_APP_KEY,kisAppSecret:e.KIS_APP_SECRET,newsClientId:e.NAVER_NEWS_CLIENT_ID,newsClientSecret:e.NAVER_NEWS_CLIENT_SECRET},llm,worldmonitorUrl:e.VERDANT_WORLDMONITOR_URL});emit('result',result)}catch{emit('error',{message:'분석 실패 · 데이터 공급원과 서버 설정을 확인해 주세요.'})}finally{if(!closed)try{controller.close()}catch{}}
  }});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
