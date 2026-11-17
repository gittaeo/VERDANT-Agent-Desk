const addressKey=s=>/^0x[0-9a-f]+$/i.test(s||'')?s.toLowerCase():s;
export function selectCryptoPairs(input,query,limit=10){
 const q=query.trim(),text=q.toLowerCase();
 let rows=input.filter(p=>p?.chainId&&p.pairAddress&&p.baseToken?.address);
 const addressQuery=/^0x[0-9a-f]{40}$/i.test(q)||/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
 const exact=rows.filter(p=>addressKey(p.baseToken.address)===addressKey(q)||[p.baseToken.symbol,p.baseToken.name].some(x=>String(x||'').toLowerCase()===text));
 if(addressQuery||exact.length)rows=exact;
 rows=[...new Map(rows.map(p=>[p.chainId+':'+addressKey(p.pairAddress),p])).values()];
 const sorted=[...rows].sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0));
 const groups=new Map();for(const pair of sorted){const id=pair.chainId+':'+addressKey(pair.baseToken.address);if(!groups.has(id))groups.set(id,{pair,pairCount:0});groups.get(id).pairCount++;}
 const assets=[...groups.values()];const names=new Map();for(const {pair} of assets){const n=String(pair.baseToken.symbol||pair.baseToken.name||'').toLowerCase();names.set(n,(names.get(n)||0)+1);}
 return assets.slice(0,limit).map(({pair,pairCount})=>({pair,pairCount,sameNameAssets:names.get(String(pair.baseToken.symbol||pair.baseToken.name||'').toLowerCase()),match:exact.includes(pair)?'exact':'related'}));
}
