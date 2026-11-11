import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {runDesk,modelStatus} from '../lib/agent-desk.mjs';
import {newLedger,updateLedger} from '../lib/paper-ledger.mjs';
import {publicProfiles,selectModel} from '../lib/model-config.mjs';

export function createAgentRuntime({root,stockConfig,profiles,worldmonitorUrl}) {
  const folder=join(root,'data','agent-desk');
  let lock=Promise.resolve();
  const serial=work=>{const pending=lock.then(work);lock=pending.catch(()=>{});return pending;};
  async function load(file,fallback){try{return JSON.parse(await readFile(join(folder,file),'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw Error('저장된 데이터 읽기 실패')}}
  async function save(file,data){await mkdir(folder,{recursive:true});const dest=join(folder,file);await writeFile(dest+'.tmp',JSON.stringify(data,null,2));await rename(dest+'.tmp',dest)}
  async function paper(action){return serial(async()=>{const ledger=await load('paper.json',newLedger());if(!action)return ledger;const next=await updateLedger(ledger,action);await save('paper.json',next);return next})}
  async function saveRun(result){return serial(async()=>{await save(`${result.id}.json`,result);const history=await load('history.json',[]);history.unshift({id:result.id,market:result.market,query:result.query,createdAt:result.createdAt,status:result.status,conclusion:result.conclusion});await save('history.json',history.slice(0,100));})}
  let running=false;
  const timer=setInterval(async()=>{if(running)return;running=true;try{const ledger=await paper();if(ledger.positions.length)await paper({type:'refresh'})}catch{console.error('Agent risk monitor: check failed; previous ledger preserved.')}finally{running=false}},300000);
  timer.unref();
  return {
    close:()=>clearInterval(timer),
    async handle(req,res,url){
      if(!url.pathname.startsWith('/api/desk'))return false;
      const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
      try {
        if(req.method==='GET'&&url.pathname==='/api/desk/status'){send(200,{model:modelStatus(profiles.rules),models:publicProfiles(profiles),worldmonitorConfigured:Boolean(worldmonitorUrl),roles:7,execution:'local',paper:'observation_only',riskIntervalSeconds:300,background:'로컬 서버 실행 중에만 감시',stockConfigured:Boolean(stockConfig.key)});return true}
        if(req.method==='GET'&&url.pathname==='/api/desk/history'){send(200,await load('history.json',[]));return true}
        if(req.method==='GET'&&/^\/api\/desk\/history\/[a-f0-9-]{36}$/.test(url.pathname)){const r=await load(url.pathname.split('/').at(-1)+'.json',null);send(r?200:404,r||{error:'기록 없음'});return true}
        if(req.method==='GET'&&url.pathname==='/api/desk/paper'){send(200,await paper());return true}
        if(req.method!=='POST'||!['/api/desk/run','/api/desk/paper'].includes(url.pathname)){send(404,{error:'경로 없음'});return true}
        if((req.headers.origin&&req.headers.origin!==url.origin)||!String(req.headers['content-type']).startsWith('application/json')){send(403,{error:'허용되지 않은 요청'});return true}
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096){send(413,{error:'요청 크기 초과'});return true}chunks.push(chunk)}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{send(400,{error:'JSON 입력 오류'});return true}
        if(url.pathname==='/api/desk/paper'){send(200,await paper(body));return true}
        if(!['stocks','crypto'].includes(body.market)||typeof body.query!=='string'||body.query.length>80){send(400,{error:'시장·검색어 입력 오류'});return true}
        const llm=selectModel(profiles,body.modelMode||'rules');
        res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        const controller=new AbortController();res.on('close',()=>controller.abort());
        const emit=(type,data)=>{if(!res.destroyed)res.write(JSON.stringify({type,data})+'\n')};
        try{const result=await runDesk({market:body.market,query:body.query,signal:controller.signal,stockConfig,llm,worldmonitorUrl,onEvent:e=>emit('event',e)});await saveRun(result);emit('result',result)}catch{emit('error',{message:controller.signal.aborted?'분석 취소':'분석을 완료하지 못했습니다. 데이터 연결과 서버 설정을 확인해 주세요.'})}
        res.end();return true;
      }catch{if(!res.headersSent)send(400,{error:'요청 처리 실패. 입력·연결·저장 상태를 확인해 주세요.'});else res.end();return true}
    }
  };
}
