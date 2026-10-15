import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('./Route.js', import.meta.url), 'utf8');
const { default: run } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const who = (ip = '8.8.8.8', extra = {}) => ({ success:true, ip, country_code:'US', country:'United States',
  region:'California', city:'Mountain View', connection:{isp:'Google LLC',org:'Google LLC'}, ...extra });
function context(env = {}, handler = () => who(), family = 'systemMedium') {
  const calls = [];
  return {env, widgetFamily:family, device:{ipv4:{address:'192.168.1.2'}}, calls,
    http:{get:async (url, options) => {
      calls.push({url,options});
      const out = await handler(url, calls.length);
      if (out instanceof Error) throw out;
      if (out && 'status' in out) return out;
      return {status:200,json:async () => out};
    }} };
}
const strings = tree => [tree.text || '', ...(tree.children || []).flatMap(x => strings(x))].filter(Boolean);
const text = tree => strings(tree).join('\n');
let passed = 0;
async function test(name, fn) { await fn(); console.log('PASS', name); passed++; }
await test('默认 Proxy；没有入口不使用设备私网地址', async () => {
  const c = context(); const w = await run(c); const s = text(w);
  assert.equal(w.type,'widget'); assert.match(s,/未设置/); assert.match(s,/8\.8\.8\.8/); assert.doesNotMatch(s,/192\.168/);
  assert.equal(c.calls.length,1); assert.equal(c.calls[0].options.policy,'Proxy');
  assert.equal(c.calls[0].options.timeout,4000); assert.equal(c.calls[0].options.redirect,'error');
});
await test('自定义策略与手填入口：ISP 优先级、位置、本次所有 HTTP 均指定策略', async () => {
  const c = context({POLICY:'测试策略',ENTRANCE_IP:'1.1.1.1'}, url => url.includes('/1.1.1.1?')
    ? who('1.1.1.1',{country_code:'CN',region:'北京市',city:'北京市',connection:{org:'Private Customer',isp:'China Telecom'}}) : who());
  const s = text(await run(c)); assert.match(s,/手填参数/); assert.match(s,/中国电信/); assert.match(s,/位置：北京/);
  assert.match(s,/Google Cloud/); assert.equal(c.calls.length,2); assert.ok(c.calls.every(x => x.options.policy === '测试策略'));
});
await test('入口等于落地仅保留落地', async () => {
  const s = text(await run(context({ENTRANCE_IP:'8.8.8.8'}))); assert.doesNotMatch(s,/入口/); assert.match(s,/落地/);
});
await test('IPv6 规范化相等，不截断地址', async () => {
  const c = context({ENTRANCE_IP:'2606:4700:4700:0:0:0:0:1111'}, () => who('2606:4700:4700::1111'));
  const s = text(await run(c)); assert.doesNotMatch(s,/入口/); assert.match(s,/2606:4700:4700::1111/);
});
await test('私网、保留、畸形入口拒绝，不发送归属查询', async () => {
  for (const ip of ['10.0.0.1','100.64.0.1','127.0.0.1','192.168.1.2','169.254.1.1',
    '203.0.113.1','fc00::1','fe80::1','::1','2001:db8::1','::ffff:c0a8:101',
    '1.1.1.1:443','example.com','999.1.1.1','2001:::1','1:2:3:4:5:6:7:8:9']) {
    const c = context({ENTRANCE_IP:ip}); assert.match(text(await run(c)),/参数无效/); assert.equal(c.calls.length,1,ip);
  }
});
await test('HTTP失败、超时、坏JSON、业务失败、伪造私网响应均不成功', async () => {
  for (const result of [{status:429},new Error('secret://credentials'),{status:200,json:async()=>{throw Error('bad');}},
    {success:false,ip:'8.8.8.8'},who('192.168.1.2'),{}]) {
    const c = context({}, () => result); const s = text(await run(c));
    assert.match(s,/落地失败/); assert.doesNotMatch(s,/secret|查询时间/);
  }
});
await test('入口 ipwho 失败回退 ip.sb，落地独立成功', async () => {
  const c = context({ENTRANCE_IP:'1.1.1.1'},url => url.includes('api.ip.sb')
    ? {ip:'1.1.1.1',country_code:'HK',organization:'DMIT Inc.'}
    : url.includes('/1.1.1.1?') ? {success:false} : who());
  const s = text(await run(c)); assert.match(s,/DMIT Cloud/); assert.match(s,/中国香港/);
  assert.equal(c.calls.length,3); assert.ok(c.calls.every(x => x.options.policy === 'Proxy'));
});
await test('入口接口 IP 不匹配不能冒充入口归属成功', async () => {
  const c = context({ENTRANCE_IP:'1.1.1.1'},()=>who()); const s = text(await run(c));
  assert.match(s,/归属查询失败/); assert.match(s,/1\.1\.1\.1/); assert.match(s,/位置：未知/);
});
await test('入口失败不抹除手填 IP、落地失败不抹除入口', async () => {
  const c = context({ENTRANCE_IP:'1.1.1.1'},url => url.includes('/1.1.1.1?') ? who('1.1.1.1') : new Error('offline'));
  const s = text(await run(c)); assert.match(s,/1\.1\.1\.1/); assert.match(s,/落地失败/);
});
await test('所有 widget family 返回可序列化的官方 DSL 节点', async () => {
  const allowed = new Set(['widget','stack','text','image','spacer','date']);
  function validate(n) { assert.ok(allowed.has(n.type)); if(n.type==='text') assert.equal(typeof n.text,'string');
    for(const child of n.children || []) validate(child); }
  for(const family of ['systemSmall','systemMedium','systemLarge','systemExtraLarge','accessoryInline','accessoryCircular','accessoryRectangular']) {
    const w = await run(context({},()=>who(),family)); validate(JSON.parse(JSON.stringify(w)));
  }
});
console.log(`\n${passed} tests passed`);
