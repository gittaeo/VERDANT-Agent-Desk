import {env} from 'cloudflare:workers';
import {modelProfiles,selectModel} from '../../../../lib/model-config.mjs';
import {probeModel} from '../../../../lib/model-probe.mjs';
export async function POST(request:Request){
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'허용되지 않은 요청'},{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON 입력 필요'},{status:400});
 if(Number(request.headers.get('content-length'))>1024)return Response.json({error:'요청 크기 초과'},{status:413});
 try{const raw=await request.text();if(raw.length>1024)return Response.json({error:'요청 크기 초과'},{status:413});const body=JSON.parse(raw),config=selectModel(modelProfiles(env as any),body.modelMode||'rules');
 return Response.json(await probeModel({config,signal:AbortSignal.any([request.signal,AbortSignal.timeout(90000)])}),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'엔진 설정·입력값을 확인하세요. Codex 연결은 PC 실행본에서 사용합니다.'},{status:400});}
}
