/** HTTP wall-clock request sampling, not an Egern core benchmark.
 * NODES: existing policy names separated by §. No configuration/control APIs used.
 */
const LATENCY_URL = 'http://1.0.0.1/favicon.ico';

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
          const r=await ctx.http.head(LATENCY_URL,{
            policy:name,timeout:Math.max(1,Math.min(4000,deadline-start)),
            redirect:'error',credentials:'omit',
            headers:{'Cache-Control':'no-cache','Connection':'close'}
          });
          const elapsed=Date.now()-start;
          // The fixed HTTP endpoint currently returns 301. Redirects are not
          // followed so the measurement remains HTTP-only and uses the exact URL.
          if(r?.status>=200 && r.status<400 && elapsed>0) samples.get(name).push(elapsed);
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
  return render(ctx.widgetFamily, rows);
}

function render(family, rows) {
  const ink={light:'#182638',dark:'#EBF1FA'};
  const muted={light:'#586879',dark:'#A5B3C5'};
  const text=(s,size=11,color=ink,maxLines=1)=>({type:'text',text:s,
    font:{size,weight:'medium'},textColor:color,maxLines,minScale:0.6});
  const fastest=rows.find(r=>r.latency!==null);
  if(String(family).startsWith('accessory')) return {type:'widget',children:[
    text('✦ Yanyu · Latency',11),
    text(fastest?`${fastest.name} ${Math.round(fastest.latency)} ms`:'测速失败',11,fastest?ink:'#D44835',2)
  ]};
  const small=family==='systemSmall';
  const section=r=>({type:'stack',direction:'column',alignItems:'start',gap:2,flex:1,
    children:small?[
      text(`${r.name}：${r.latency===null?'失败':Math.round(r.latency)+' ms'}`,10,r.latency===null?'#D44835':ink,2),
      text(`抖动：${r.jitter===null?'—':format(r.jitter)+' ms'}${r.count<5?` · ${r.count}/5 样本`:''}`,9,muted,2)
    ]:[
      text(r.name,11,muted,2),
      text(r.latency===null?'失败':`${Math.round(r.latency)} ms`,13,r.latency===null?'#D44835':ink,2),
      text(`抖动：${r.jitter===null?'—':format(r.jitter)+' ms'}${r.count<5?` · ${r.count}/5 样本`:''}`,11,muted,2)
    ]});
  const groups=[];
  if(small) rows.forEach(r=>groups.push(section(r)));
  else for(let i=0;i<rows.length;i+=2) groups.push({
    type:'stack',direction:'row',alignItems:'start',gap:10,
    children:[section(rows[i]),rows[i+1]?section(rows[i+1]):{type:'stack',flex:1,children:[]}]
  });
  return {type:'widget',padding:small?10:12,gap:small?4:8,
    backgroundColor:{light:'#F4F7FB',dark:'#101D2E'},children:[
      {type:'stack',direction:'row',gap:6,children:[
        text('✦',15,'#8EAFE0'),
        {...text('Yanyu · Latency',14),font:{size:14,weight:'semibold'}}
      ]},
      {type:'stack',direction:'column',alignItems:'start',gap:small?4:10,flex:1,children:groups},
      text('查询时间 '+new Date().toLocaleTimeString('zh-CN',{hour12:false}),9,muted,2)
    ]};
}

function median(a){const s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function format(n){return Number.isInteger(n)?String(n):n.toFixed(1);}
function errorWidget(message){return {type:'widget',padding:12,gap:8,
  backgroundColor:{light:'#F4F7FB',dark:'#101D2E'},children:[
    {type:'text',text:'✦ Yanyu · Latency'},
    {type:'text',text:message,textColor:'#D44835',maxLines:2}
  ]};}

