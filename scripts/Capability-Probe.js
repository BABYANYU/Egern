/** Read-only capability probe. No network, storage writes or policy changes. */
export default async function(ctx) {
  const checks = [];
  const inspect = (label, value) => {
    if (value == null) { checks.push(label + ': 不存在'); return; }
    for (const key of ['selectGroupDetails','setSelectGroupPolicy','getPolicyGroups','getSelectedPolicy','setSelectedPolicy']) {
      let type;
      try { type = typeof value[key]; } catch (_) { type = '不可访问'; }
      checks.push(label + '.' + key + ': ' + type);
    }
  };
  inspect('$surge', typeof $surge === 'undefined' ? null : $surge);
  checks.push('$httpAPI: ' + (typeof $httpAPI));
  inspect('ctx', ctx);
  inspect('ctx.policies', ctx && ctx.policies);
  inspect('ctx.policyGroups', ctx && ctx.policyGroups);
  inspect('ctx.egern', ctx && ctx.egern);
  checks.unshift('版本: ' + (ctx && ctx.app && ctx.app.version || '未知'));
  const text = checks.join('\n');
  console.log(text);
  return {type:'widget',padding:12,gap:6,children:[
    {type:'text',text:'Egern · 只读能力检测',font:{size:14,weight:'semibold'}},
    {type:'text',text, font:{size:10,family:'Menlo'},maxLines:40,minScale:0.5},
    {type:'text',text:'仅检查接口名称，不调用控制函数；存在也不代表可用。',font:{size:10}}
  ]};
}
