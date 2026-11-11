import {modelStatus} from './agent-desk.mjs';
export function modelProfiles(env={}){
  const legacy=env.VERDANT_LLM_PROVIDER;
  return {
    rules:{provider:'rules'},
    ollama:{provider:'ollama',model:env.VERDANT_OLLAMA_MODEL||(legacy==='ollama'?env.VERDANT_LLM_MODEL:undefined),baseUrl:env.VERDANT_OLLAMA_URL||(legacy==='ollama'?env.VERDANT_LLM_BASE_URL:undefined)||'http://127.0.0.1:11434'},
    compatible:{provider:'compatible',model:env.VERDANT_API_MODEL||(legacy==='compatible'?env.VERDANT_LLM_MODEL:undefined),baseUrl:env.VERDANT_API_BASE_URL||(legacy==='compatible'?env.VERDANT_LLM_BASE_URL:undefined),apiKey:env.VERDANT_API_KEY||(legacy==='compatible'?env.VERDANT_LLM_API_KEY:undefined)}
  };
}
export const publicProfiles=profiles=>Object.fromEntries(Object.entries(profiles).map(([id,config])=>[id,modelStatus(config)]));
export function selectModel(profiles,mode='rules'){
  if(!Object.hasOwn(profiles,mode))throw Error('모델 모드 오류');
  if(mode!=='rules'&&!modelStatus(profiles[mode]).configured)throw Error('선택한 모델 설정이 필요합니다.');
  return profiles[mode];
}
