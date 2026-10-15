/** Route for Egern. Generic widget. No credentials or node configuration required.
 * POLICY: existing Egern policy name (default Proxy).
 * ENTRANCE_IP: optional manually supplied public proxy-server IP, never auto-detected.
 */
export default async function(ctx) {
  const env = ctx.env || {};
  const policy = clean(env.POLICY) || 'Proxy';
  const rawEntrance = clean(env.ENTRANCE_IP);
  const entrance = publicIP(rawEntrance);
  const query = async (url) => {
    let r;
    try {
      r = await ctx.http.get(url, {
        policy, timeout: 4000, redirect: 'error', credentials: 'omit',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
      });
    } catch (_) { throw new Error('请求失败（网络、策略或超时）'); }
    if (!r || !Number.isInteger(r.status) || r.status < 200 || r.status >= 300)
      throw new Error(r && Number.isInteger(r.status) ? `HTTP ${r.status}` : '无有效 HTTP 状态');
    try { return await r.json(); } catch (_) { throw new Error('接口返回格式错误'); }
  };
  const stamp = Date.now();
  const whoURL = (ip = '') => `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN&route=${stamp}`;
  const fetchLanding = async () => {
    try { return { info: parseWho(await query(whoURL()), false) }; }
    catch (e) { return { error: e.message }; }
  };
  const fetchEntrance = async () => {
    if (!rawEntrance) return { error: '未设置（参数入口）' };
    if (!entrance) return { error: '参数无效：请填公网 IP，不含端口或域名' };
    try {
      const info = parseWho(await query(whoURL(entrance)), true);
      if (info.ip !== entrance) throw new Error('入口查询 IP 不匹配');
      return { info };
    } catch (_) {
      try {
        const d = await query(`https://api.ip.sb/geoip/${encodeURIComponent(entrance)}?route=${stamp}`);
        if (!d || publicIP(d.ip) !== entrance) throw new Error('入口查询 IP 不匹配');
        return { info: { ip: entrance, countryCode: d.country_code, country: d.country,
          region: d.region, city: d.city, operator: d.organization || d.isp || d.asn_organization } };
      } catch (_) { return { info: { ip: entrance }, error: '归属查询失败' }; }
    }
  };
  const [landing, entry] = await Promise.all([fetchLanding(), fetchEntrance()]);
  const same = entrance && landing.info && entrance === landing.info.ip;
  return render(ctx.widgetFamily, policy, landing, entry, Boolean(same));
}

function clean(x) { return typeof x === 'string' ? x.trim() : ''; }

// Canonicalize IP literals without DNS or Node/browser APIs (Egern JS runtime).
function canonicalIP(value) {
  const s = clean(value).toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const a = s.split('.').map(Number);
    if (a.some(n => n > 255)) return '';
    return a.join('.');
  }
  if (!s.includes(':') || /[^0-9a-f:]/.test(s)) return '';
  const sides = s.split('::');
  if (sides.length > 2) return '';
  const left = sides[0] ? sides[0].split(':') : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(':') : [];
  if ([...left, ...right].some(x => !/^[0-9a-f]{1,4}$/.test(x))) return '';
  const missing = 8 - left.length - right.length;
  if (sides.length === 1 ? missing !== 0 : missing < 1) return '';
  const groups = [...left, ...Array(missing).fill('0'), ...right].map(x => parseInt(x, 16));
  // IPv4-mapped IPv6 must be checked as IPv4, not mistaken for public IPv6.
  if (groups.slice(0, 5).every(n => n === 0) && groups[5] === 65535)
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
  let start = -1, length = 0;
  for (let i = 0; i < 8;) {
    if (groups[i]) { i++; continue; }
    let j = i; while (j < 8 && groups[j] === 0) j++;
    if (j - i > length && j - i >= 2) { start = i; length = j - i; }
    i = j;
  }
  const hex = groups.map(n => n.toString(16));
  if (start < 0) return hex.join(':');
  return `${hex.slice(0, start).join(':')}::${hex.slice(start + length).join(':')}`;
}
function publicIP(value) {
  const ip = canonicalIP(value);
  if (!ip) return '';
  if (ip.includes(':')) {
    // Conservative global-unicast-only rule; excludes ULA, link-local, multicast, loopback,
    // documentation, 6to4 and Teredo. Not a substitute for an IANA routing registry.
    const first = parseInt(ip.split(':')[0], 16);
    if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff || /^2001:db8:|^2001::|^2002:/.test(ip)) return '';
    return ip;
  }
  const [a,b,c] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)) return '';
  return ip;
}
function parseWho(d, entrance) {
  if (!d || d.success === false || !publicIP(d.ip)) throw new Error('无法获取有效公网 IP 信息');
  const c = d.connection || {};
  const org = clean(c.org), isp = clean(c.isp);
  return { ip: publicIP(d.ip), countryCode: d.country_code, country: d.country,
    region: d.region, city: d.city,
    operator: entrance ? (/^(private customer|unknown|n\/a)$/i.test(org) ? isp : org || isp) : isp || org };
}
function location(d) {
  const names = { CN:'中国大陆', HK:'中国香港', MO:'中国澳门', TW:'中国台湾', JP:'日本', SG:'新加坡',
    US:'美国', GB:'英国', KR:'韩国', DE:'德国', FR:'法国', CA:'加拿大', AU:'澳大利亚' };
  const code = clean(d.countryCode).toUpperCase();
  const country = names[code] || clean(d.country);
  const trim = v => clean(v).replace(/\s+(Sheng|Shi|Zizhiqu|Tequ)$/i, '')
    .replace(/(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市)$/u, '');
  const region = trim(d.region), city = trim(d.city);
  if (['HK','MO','TW'].includes(code)) return country;
  if (code === 'CN' && ['北京','上海','天津','重庆'].includes(region)) return region;
  return [...new Set((code === 'CN' ? [region,city] : [country,region,city]).filter(Boolean))].join(' ') || country || '未知';
}
function operator(value) {
  const s = clean(value).replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const rules = [ [/huawei|hwcsnet/i,'Huawei Cloud'], [/ucloud/i,'UCloud'],
    [/alibaba cloud|aliyun/i,'Alibaba Cloud'], [/tencent cloud|qcloud/i,'Tencent Cloud'],
    [/amazon|\baws\b/i,'AWS'], [/google cloud|google llc/i,'Google Cloud'],
    [/microsoft|azure/i,'Microsoft Azure'], [/\bdmit\b/i,'DMIT Cloud'],
    [/eons data communications|\bedcl\b/i,'Eons Data'], [/chinanet|china telecom|中国电信/i,'中国电信'],
    [/china unicom|unicom|中国联通/i,'中国联通'], [/china mobile|cmcc|中国移动/i,'中国移动'],
    [/china broadnet|中国广电/i,'中国广电'] ];
  for (const [re, name] of rules) if (re.test(s)) return name;
  return s || '未知';
}
function render(family, policy, landing, entry, same) {
  const ink = { light:'#182638', dark:'#EBF1FA' };
  const muted = { light:'#586879', dark:'#A5B3C5' };
  const text = (s, size = 11, color = ink, maxLines = 1) => ({ type:'text', text:s,
    font:{ size, weight:'medium' }, textColor:color, maxLines, minScale:0.6 });
  const details = result => result.info
    ? [`运营商：${operator(result.info.operator)}`, `位置：${location(result.info)}`]
    : [];
  const small = family === 'systemSmall';
  const section = (label, result) => {
    const fields = [
      text(label, small ? 10 : 11, muted),
      text(result.info ? result.info.ip : result.error, small ? 11 : 13,
        result.info ? ink : '#D44835', 2),
      ...details(result).map(line => text(line, small ? 9 : 11, muted)),
      ...(result.info && result.error ? [text(result.error, small ? 9 : 10, '#D44835', 2)] : [])
    ];
    return { type:'stack', direction:'column', alignItems:'start', gap:0, flex:1,
      children:fields.flatMap((field, index) => index
        ? [text('\u00a0', small ? 10 : 4, muted), field]
        : [field]) };
  };
  const footer = landing.error ? `落地失败：${landing.error}` : `查询时间 ${new Date().toLocaleTimeString('zh-CN', {hour12:false})}`;
  if (String(family).startsWith('accessory')) return { type:'widget', children:[
    text('✦ Yanyu · Route', 11), text(landing.info ? '落地 ' + landing.info.ip : footer, 11, ink, 2)
  ] };
  const sections = [];
  if (!same) sections.push(section('入口 · 手填参数', entry));
  sections.push(section('落地 · 自动查询', landing));
  return { type:'widget', padding:small ? 10 : 12, gap:small ? 4 : 8, backgroundColor:{light:'#F4F7FB',dark:'#101D2E'}, children:[
    { type:'stack', direction:'row', gap:6, children:[
      text('✦', 15, '#8EAFE0'),
      { ...text('Yanyu · Route', 14), font:{size:14, weight:'semibold'} } ] },
    { type:'stack', direction:family === 'systemSmall' ? 'column' : 'row', alignItems:'start', gap:10,
      flex:1, children:sections },
    text(footer, 9, landing.error ? '#D44835' : muted, 2)
  ] };
}
