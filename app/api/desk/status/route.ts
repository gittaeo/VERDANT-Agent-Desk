import {publicSources} from '../../../../lib/model-probe.mjs';
import {env} from 'cloudflare:workers';
import {modelStatus} from '../../../../lib/agent-desk.mjs';
import {modelProfiles,publicProfiles} from '../../../../lib/model-config.mjs';
export function GET(){const e=env as any;return Response.json({sources:publicSources({key:e.DART_API_KEY,krxKey:e.KRX_API_KEY,newsClientId:e.NAVER_NEWS_CLIENT_ID,newsClientSecret:e.NAVER_NEWS_CLIENT_SECRET,kisAppKey:e.KIS_APP_KEY,kisAppSecret:e.KIS_APP_SECRET}),model:modelStatus({provider:'rules'}),models:publicProfiles(modelProfiles(e)),worldmonitorConfigured:Boolean(e.VERDANT_WORLDMONITOR_URL),roles:7,execution:'hosted',history:'browser',paper:'local_only',riskIntervalSeconds:null,background:'웹에서는 분석 중에만 실행 · 모의 원장은 PC 서버에서 사용',stockConfigured:Boolean(e.DART_API_KEY)},{headers:{'Cache-Control':'no-store'}})}
