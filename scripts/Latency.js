/** HTTPS wall-clock request sampling, not an Egern core benchmark.
 * NODES: existing policy names separated by §. No configuration/control APIs used.
 * Source downloads are controlled separately by the module's update interval.
 */
const LATENCY_URL = 'https://cp.cloudflare.com/generate_204';
const ROUNDS = 5;

export default async function(ctx) {
  const raw = String(ctx.env?.NODES || '').trim();
  const nodes = [...new Set((raw ? raw.split('§') : ['Proxy']).map(s => s.trim()).filter(Boolean))];
  if (!nodes.length || nodes.length > 12) return errorWidget('节点数量须为 1–12；较大列表请分批检测');
  const samples = new Map(nodes.map(name => [name, []]));
  const attempts = new Map(nodes.map(name => [name, []]));
  console.log(`[Latency diagnostics 20261017] HTTPS HEAD ${LATENCY_URL}; values are request elapsed times, not guaranteed fresh TCP/TLS handshakes.`);
  // Preserve the sampling budget and maximum concurrency of the original widget.
  const deadline = Date.now() + 50000;
  for (let round = 0; round < ROUNDS; round++) {
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(3, nodes.length) }, async () => {
      while (index < nodes.length && Date.now() < deadline) {
        const name = nodes[index++];
        const start = Date.now();
        try {
          const response = await ctx.http.head(LATENCY_URL, {
            policy: name,
            timeout: Math.max(1, Math.min(4000, deadline - start)),
            redirect: 'manual',
            credentials: 'omit',
            headers: { 'Cache-Control': 'no-cache', 'Connection': 'close' }
          });
          const elapsed = Date.now() - start;
          attempts.get(name).push({ round: round + 1, elapsedMs: elapsed, status: response?.status ?? null });
          // A redirect or captive-portal response is not a successful probe.
          if (response?.status === 204 && elapsed > 0) samples.get(name).push(elapsed);
        } catch (error) {
          attempts.get(name).push({ round: round + 1, elapsedMs: Date.now() - start, status: null, failed: true });
          console.log(`[Latency] ${name} round ${round + 1}: ${String(error?.message || error)}`);
        }
      }
    }));
    if (Date.now() >= deadline) break;
  }
  const rows = nodes.map(name => {
    const values = samples.get(name);
    const latency = values.length ? median(values) : null;
    console.log(`[Latency] ${JSON.stringify({ policy: name, url: LATENCY_URL, method: 'HEAD', attempts: attempts.get(name), successfulSamplesMs: values, medianMs: latency })}`);
    return {
      name,
      latency,
      jitter: values.length >= 3 ? median(values.map(value => Math.abs(value - latency))) : null,
      count: values.length
    };
  }).sort((a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity));
  return render(ctx.widgetFamily, rows);
}

const INK = { light: '#182638', dark: '#EBF1FA' };
const MUTED = { light: '#586879', dark: '#A5B3C5' };
const BACKGROUND = { light: '#F4F7FB', dark: '#101D2E' };
const ERROR = { light: '#B84538', dark: '#FF9C8F' };

function text(value, size = 11, color = INK, weight = 'regular', maxLines = 1) {
  return {
    type: 'text', text: String(value), font: { size, weight },
    textColor: color, maxLines, minScale: 0.8
  };
}

function render(family, rows) {
  const fastest = rows.find(row => row.latency !== null);
  if (String(family).startsWith('accessory')) {
    const summary = fastest ? `${fastest.name} ${Math.round(fastest.latency)} ms` : '测速失败';
    return {
      type: 'widget', gap: 3,
      children: family === 'accessoryInline'
        ? [text(`HTTPS · ${summary}`, 11, fastest ? INK : ERROR)]
        : [text('HTTPS', 10, MUTED), text(summary, 11, fastest ? INK : ERROR, 'medium', 2)]
    };
  }

  const small = family === 'systemSmall';
  const limit = small ? 1 : family === 'systemLarge' ? 6 : family === 'systemExtraLarge' ? 8 : 2;
  const visible = rows.slice(0, limit);
  const section = row => ({
    type: 'stack', direction: 'column', alignItems: 'start', gap: 4, flex: 1,
    children: [
      {
        type: 'stack', direction: 'column', alignItems: 'start', height: small ? 24 : 26,
        children: [text(row.name, small ? 10 : 11, INK, 'medium', 2)]
      },
      text('HTTPS', 10, MUTED),
      text(row.latency === null ? '失败' : `${Math.round(row.latency)} ms`,
        small ? 21 : 24, row.latency === null ? ERROR : INK, 'semibold'),
      text(`抖动  ${row.jitter === null ? '—' : format(row.jitter) + ' ms'}`, 10, MUTED),
      ...(row.count < ROUNDS ? [text(`有效样本 ${row.count}/${ROUNDS}`, 9, MUTED)] : [])
    ]
  });

  const columns = [[], []];
  visible.forEach((row, index) => columns[index % 2].push(section(row)));
  const body = small ? section(visible[0]) : {
    type: 'stack', direction: 'row', alignItems: 'start', gap: 16, flex: 1,
    children: columns.filter(items => items.length).map(items => items.length === 1 ? items[0] : {
      type: 'stack', direction: 'column', alignItems: 'start', gap: 18, flex: 1, children: items
    })
  };
  return {
    type: 'widget', padding: small ? 12 : 14, gap: small ? 6 : 10,
    backgroundColor: BACKGROUND,
    children: [
      text('Yanyu · Latency', small ? 12 : 13, INK, 'semibold'),
      body,
      ...(rows.length > limit ? [text(`显示 ${visible.length}/${rows.length} 个节点 · 按延迟排序`, 9, MUTED)] : [])
    ]
  };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function format(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

function errorWidget(message) {
  return {
    type: 'widget', padding: 14, gap: 10, backgroundColor: BACKGROUND,
    children: [text('Yanyu · Latency', 13, INK, 'semibold'), text(message, 11, ERROR, 'regular', 3)]
  };
}
