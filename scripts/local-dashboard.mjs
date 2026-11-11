import {checkNewsConnection} from '../lib/news-health.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { runResearch, ResearchError } from '../lib/market-research.mjs';
import {createAgentRuntime} from './agent-runtime.mjs';
import {modelProfiles} from '../lib/model-config.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try{process.loadEnvFile(join(root,'.env.local'))}catch(error){if(error.code!=='ENOENT')throw error}
const port = Number(process.env.VERDANT_PORT || 5177);
const keyPath = resolve(root, '..', 'DART API.txt');
const key = process.env.DART_API_KEY || (existsSync(keyPath) ? readFileSync(keyPath, 'utf8').trim() : '');
const krxPath = ['KRX API.txt','KPX API.txt'].map(name=>resolve(root,'..',name)).find(path=>existsSync(path));
const krxKey = process.env.KRX_API_KEY || (krxPath ? readFileSync(krxPath,'utf8').trim() : '');
let newsConfig={};
try{newsConfig=JSON.parse(readFileSync(resolve(root,'..','NEWS API.json'),'utf8').replace(/^\uFEFF/,''))}catch{}
const newsClientId=process.env.NAVER_NEWS_CLIENT_ID||newsConfig.clientId;
const newsClientSecret=process.env.NAVER_NEWS_CLIENT_SECRET||newsConfig.clientSecret;
let kisConfig={};
try{kisConfig=JSON.parse(readFileSync(resolve(root,'..','KIS API.json'),'utf8').replace(/^\uFEFF/,''))}catch{}
const kisAppKey=process.env.KIS_APP_KEY||kisConfig.appKey;
const kisAppSecret=process.env.KIS_APP_SECRET||kisConfig.appSecret;
const agents=createAgentRuntime({root,stockConfig:{key,krxKey,kisAppKey,kisAppSecret,newsClientId,newsClientSecret},profiles:modelProfiles(process.env),worldmonitorUrl:process.env.VERDANT_WORLDMONITOR_URL});
const files = new Map([
  ['/agents', ['web/agents.html','text/html; charset=utf-8']],
  ['/agents.css', ['public/agents.css','text/css; charset=utf-8']],
  ['/agents.js', ['public/agents.js','application/javascript; charset=utf-8']],
  ['/agent-views.js', ['public/agent-views.js','application/javascript; charset=utf-8']],
  ['/agent-views.css', ['public/agent-views.css','text/css; charset=utf-8']],
  ['/', ['web/index.html','text/html; charset=utf-8']],
  ['/refined.js', ['public/refined.js','application/javascript; charset=utf-8']],
  ['/refined.css', ['public/refined.css','text/css; charset=utf-8']],
  ['/desk.css', ['public/desk.css','text/css; charset=utf-8']],
  ['/liquid-hero.js', ['public/liquid-hero.js','application/javascript; charset=utf-8']],
  ['/desk.js', ['public/desk.js','application/javascript; charset=utf-8']],
  ['/art/verdant-observation.svg', ['public/art/verdant-observation.svg','image/svg+xml']],
  ['/favicon.svg', ['public/favicon.svg','image/svg+xml']],
]);
const server = createServer(async (req,res) => {
  if (![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)) { res.writeHead(403).end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);
  if(await agents.handle(req,res,url))return;
  const send = (status,data) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
  if (req.method === 'GET' && url.pathname === '/api/status') { const newsHealth=await checkNewsConnection({clientId:newsClientId,clientSecret:newsClientSecret});send(200,{dart:/^[a-zA-Z0-9]{40}$/.test(key),krxConfigured:Boolean(krxKey),newsConfigured:Boolean(newsClientId&&newsClientSecret),investorConfigured:Boolean(kisAppKey&&kisAppSecret),prices:false,news:newsHealth.status==='available',newsHealth,intraday:false,execution:'local'});return; }
  if (req.method === 'POST' && url.pathname === '/api/research') {
    const origin = req.headers.origin;
    if ((origin && origin !== url.origin) || !String(req.headers['content-type']).startsWith('application/json')) { send(403,{error:'허용되지 않은 요청입니다.'});return; }
    const chunks=[];let size=0;
    for await (const chunk of req) { size+=chunk.length;if(size>2048){send(413,{error:'요청이 너무 큽니다.'});return;}chunks.push(chunk); }
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{send(400,{error:'입력을 확인해 주세요.'});return;}
    if(typeof body.query!=='string'||body.query.length>80||![7,30,90].includes(body.days)){send(400,{error:'종목과 기간을 확인해 주세요.'});return;}
    res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    const abort = new AbortController();res.on('close',()=>abort.abort());
    const event=(type,data)=>{if(!res.destroyed)res.write(JSON.stringify({type,data})+'\n')};
    try { const result=await runResearch({key,krxKey,kisAppKey,kisAppSecret,newsClientId,newsClientSecret,query:body.query.trim(),days:body.days,signal:abort.signal,onProgress:data=>event('progress',data)});event('result',result); }
    catch(error){event('error',{code:error instanceof ResearchError?error.code:'internal',message:error instanceof ResearchError?error.message:'조회를 완료하지 못했습니다. 다시 시도해 주세요.'});}
    res.end();return;
  }
  if (req.method === 'GET' && files.has(url.pathname)) {
    const [file,type]=files.get(url.pathname);
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(readFileSync(join(root,file)));return;
  }
  res.writeHead(404).end('Not found');
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'VERDANT is already running.':'VERDANT could not start.');process.exit(1)});
server.listen(port,'127.0.0.1',()=>console.log(`VERDANT Local: http://127.0.0.1:${port}`));
