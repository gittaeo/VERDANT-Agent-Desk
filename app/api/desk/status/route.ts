import {env} from 'cloudflare:workers';
import {modelStatus} from '../../../../lib/agent-desk.mjs';
import {modelProfiles,publicProfiles} from '../../../../lib/model-config.mjs';
export function GET(){const e=env as any;return Response.json({model:modelStatus({provider:'rules'}),models:publicProfiles(modelProfiles(e)),worldmonitorConfigured:Boolean(e.VERDANT_WORLDMONITOR_URL),roles:7,execution:'hosted',history:'browser',paper:'local_only',riskIntervalSeconds:null,background:'웹에서는 분석 중에만 실행 · 모의 원장은 PC 서버에서 사용',stockConfigured:Boolean(e.DART_API_KEY)},{headers:{'Cache-Control':'no-store'}})}
