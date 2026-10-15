/** HTTPS wall-clock request sampling, not an Egern core benchmark.
 * NODES: existing policy names separated by §. No configuration/control APIs used.
 */
export default async function(ctx) {
  const raw = String(ctx.env?.NODES || '').trim();
  const nodes = [...new Set((raw ? raw.split('§') : ['Proxy']).map(s=>s.trim()).filter(Boolean))];
  if (!nodes.length || nodes.length > 12) return errorWidget('节点数量须为 1–12；较大列表请分批检测');
  const samples = new Map(nodes.map(n=>[n,[]]));
  // Three concurrent requests maximum; global budget leaves time to render before 60s.
  const deadline = Date.now() + 50000;
  for(let round=0;round<5;round++) {
    let index=0;
    await Promise.all(Array.from({length:Math.min(3,nodes.length)},async()=>{
      while(index<nodes.length && Date.now()<deadline) {
        const name=nodes[index++];
        const start=Date.now();
        try {
          const r=await ctx.http.head('https://cp.cloudflare.com/generate_204?latency='+start+'-'+round,{
            policy:name,timeout:Math.max(1,Math.min(4000,deadline-start)),
            redirect:'error',credentials:'omit',headers:{'Cache-Control':'no-cache'}
          });
          const elapsed=Date.now()-start;
          if(r?.status===204 && elapsed>0) samples.get(name).push(elapsed);
        } catch (_) { /* Errors never become successful measurements. */ }
      }
    }));
    if(Date.now()>=deadline) break;
  }
  const rows=nodes.map(name=>{
    const s=samples.get(name);
    const latency=s.length?median(s):null;
    return {name,latency,jitter:s.length>=3?median(s.map(v=>Math.abs(v-latency))):null,count:s.length};
  }).sort((a,b)=>(a.latency??Infinity)-(b.latency??Infinity));
  const ink={light:'#182638',dark:'#EBF1FA'}, muted={light:'#586879',dark:'#A5B3C5'};
  const text=(s,size=11,color=ink)=>({type:'text',text:s,font:{size,weight:'medium'},textColor:color,maxLines:2,minScale:0.6});
  return {type:'widget',padding:12,gap:7,backgroundColor:{light:'#F4F7FB',dark:'#101D2E'},children:[
    {type:'stack',direction:'row',gap:6,children:[text('✦',15,'#8EAFE0'),{...text('Yanyu · Latency',14),font:{size:14,weight:'semibold'}}]},
    ...rows.map(r=>({type:'stack',direction:'column',alignItems:'start',gap:2,children:[
      text(r.name,12),text(r.latency===null?'综合延迟：失败 · 抖动：—':`综合延迟：${Math.round(r.latency)} ms · 抖动：${r.jitter===null?'样本不足':format(r.jitter)+' ms'}${r.count<5?'（部分样本）':''}`,10,muted)
    ]})),
    text('查询时间 '+new Date().toLocaleTimeString('zh-CN',{hour12:false}),9,muted)
  ]};
}
function median(a){const s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function format(n){return Number.isInteger(n)?String(n):n.toFixed(1);}
function errorWidget(message){return {type:'widget',padding:12,children:[{type:'text',text:'✦ Yanyu · Latency'},{type:'text',text:message}]};}
