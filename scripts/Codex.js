/** Yanyu · Codex — Egern generic widget. Credentials ONLY from ctx.env.
 * Read-only, one fixed-origin request. No refresh, storage, telemetry or logging.
 * Backend endpoint is evidenced by openai/codex, not a stable public API.
 */
export default async function(ctx) {
  const env = ctx.env || {};
  const token = clean(env.ACCESS_TOKEN), account = clean(env.ACCOUNT_ID);
  const policy = clean(env.POLICY) || 'Proxy';
  const done = state => render(ctx.widgetFamily, state);
  if (!token || !account) return done({ error: '待授权', detail: '请在模块环境填写 ACCESS_TOKEN / ACCOUNT_ID' });
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(token) || !/^[A-Za-z0-9_-]+$/.test(account))
    return done({ error: '授权参数格式无效', detail: '仅填 access_token 本身及账户 ID，不含 Bearer 前缀' });
  let response;
  try {
    response = await ctx.http.get('https://chatgpt.com/backend-api/wham/usage', {
      policy, timeout: 10000, redirect: 'error', credentials: 'omit',
      headers: { Authorization: `Bearer ${token}`, 'ChatGPT-Account-Id': account,
        Accept: 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (_) {
    return done({ error: '请求失败', detail: '检查网络、策略或超时；未获取额度' });
  }
  const status = response && response.status;
  if (!Number.isInteger(status)) return done({ error: '无有效 HTTP 状态', detail: '未获取额度' });
  if (status < 200 || status >= 300) {
    const errors = {
      401: ['授权已过期或无效', '请本地重新登录并更新 access_token；不会自动刷新'],
      403: ['访问被拒绝', '检查账户、地区或访问限制'],
      429: ['请求过于频繁', '稍后手动重试；不等同于 Codex 额度耗尽']
    };
    const [error, detail] = errors[status] || [`HTTP ${status}`, '未获取额度；不显示旧数据'];
    return done({ error, detail });
  }
  let data;
  try { data = await response.json(); }
  catch (_) { return done({ error: '接口返回格式错误', detail: 'JSON 解析失败；未获取额度' }); }
  let parsed;
  try { parsed = parseUsage(data); }
  catch (_) { return done({ error: '额度字段无法识别', detail: '接口可能已变更；未获取有效额度' }); }
  // Only stamp a successful, validated query. Never label invocation time as success.
  return done({ ...parsed, queriedAt: Date.now() });
}

function clean(v) { return typeof v === 'string' ? v.trim() : ''; }
function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function parseUsage(d) {
  if (!object(d) || !clean(d.plan_type) || !Object.prototype.hasOwnProperty.call(d, 'rate_limit')) throw new Error('schema');
  if (d.rate_limit !== null && !object(d.rate_limit)) throw new Error('schema');
  const windows = [];
  // Top-level rate_limit is mapped to "codex" by the official client.
  // Never use additional_rate_limits, code_review_rate_limit or model-specific pools.
  for (const key of ['primary_window', 'secondary_window']) {
    const w = d.rate_limit && d.rate_limit[key];
    if (!object(w)) continue;
    const seconds = w.limit_window_seconds;
    if (seconds !== 18000 && seconds !== 604800) continue;
    if (typeof w.used_percent !== 'number' || !Number.isFinite(w.used_percent) || w.used_percent < 0 || w.used_percent > 100) continue;
    if (windows.some(x => x.seconds === seconds)) continue;
    // reset_at is Unix seconds. Do not invent a reset from current time or a fixed cycle.
    const reset = Number.isInteger(w.reset_at) && w.reset_at > 0 && w.reset_at <= 8640000000000
      ? w.reset_at * 1000 : null;
    windows.push({ seconds, used: w.used_percent, reset });
  }
  windows.sort((a, b) => a.seconds - b.seconds);
  const plans = { plus: 'Plus', pro: 'Pro', free: 'Free', team: 'Team', business: 'Business', enterprise: 'Enterprise', edu: 'Edu' };
  return { plan: plans[d.plan_type] || '其他套餐', windows };
}
function localTime(ms, seconds = false) {
  const d = new Date(ms), pad = v => String(v).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}${seconds ? ':' + pad(d.getSeconds()) : ''}`;
}
const INK = { light: '#182638', dark: '#EBF1FA' };
const MUTED = { light: '#586879', dark: '#A5B3C5' };
const BACKGROUND = { light: '#F4F7FB', dark: '#101D2E' };
const ERROR = { light: '#B84538', dark: '#FF9C8F' };
function text(value, size = 11, color = INK, weight = 'regular', maxLines = 1) {
  return { type: 'text', text: String(value), font: { size, weight }, textColor: color, maxLines, minScale: 0.8 };
}
function render(family, state) {
  const small = family === 'systemSmall';
  const windows = state.windows || [];
  const summary = state.error || (windows.length ? windows.map(w => `${w.seconds === 18000 ? '5h' : '7d'}已用 ${w.used}%`).join(' · ') : '未返回 5h / 周窗口');
  if (String(family).startsWith('accessory')) return {
    type: 'widget', gap: 3,
    children: family === 'accessoryInline'
      ? [text(`Yanyu · Codex · ${summary}`, 11, state.error ? ERROR : INK)]
      : [text('Yanyu · Codex', 10, MUTED), text(summary, 11, state.error ? ERROR : INK, 'medium', 2)]
  };
  const section = w => ({
    type: 'stack', direction: 'column', alignItems: 'start', gap: small ? 4 : 6, flex: 1,
    children: [
      text(w.seconds === 18000 ? '5h' : '7d', small ? 10 : 11, MUTED, 'medium'),
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 5, children: [
        text('已用', small ? 10 : 11, MUTED),
        text(`${w.used}%`, small ? 17 : 20, INK, 'semibold')
      ] },
      text(w.reset === null ? '重置时间未返回' : `重置 ${localTime(w.reset)}`, 10, MUTED, 'regular', 2)
    ]
  });
  return {
    type: 'widget', padding: small ? 12 : 14, gap: small ? 6 : 10, backgroundColor: BACKGROUND,
    children: [
      text('Yanyu · Codex', small ? 12 : 13, INK, 'semibold'),
      ...(state.error ? [
        text(state.error, small ? 11 : 13, ERROR, 'semibold', 2),
        text(state.detail, 10, MUTED, 'regular', 3)
      ] : [
        ...(windows.length ? [{ type: 'stack', direction: small ? 'column' : 'row', alignItems: 'start',
          gap: small ? 10 : 16, children: windows.map(section) }]
          : [text('未返回 5h / 7d 窗口', 11, MUTED, 'regular', 2)])
      ])
    ]
  };
}
