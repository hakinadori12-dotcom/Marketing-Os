// Layer 6: what worked, what did not, and what to do next — from real post stats.
const ai = require('./ai');
const brands = require('./brands');
const social = require('./social');
const store = require('./store');

async function learn(id) {
  const b = await brands.get(id);
  const { posts } = await social.analytics(id, { days: 90 });
  if (!posts.length) throw Object.assign(new Error('لا توجد إحصائيات بعد. انشر عبر المنصة أو اربط حساباتك ثم انتظر يوماً.'), { status: 400 });
  const rows = posts.slice(0, 80).map((p) => `${p.platform} | ${String(p.at).slice(0, 10)} | reach ${p.reach || p.impressions || p.views} | likes ${p.likes} | comments ${p.comments} | shares ${p.shares} | saves ${p.saves} | ER ${p.engagementRate}% | ${p.text.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n');
  const out = await ai.json(`You are a performance marketer. Read the last 90 days of posts for the brand "${b.name}" (${b.fields?.industry?.value || ''}, ${b.fields?.market?.value || ''}) and explain in Arabic, with numbers from the data only:
${rows}`, {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '3 sentences' },
      works: { type: 'array', items: { type: 'string' }, description: 'what performs best (topics, formats, hooks, platforms, timing) with numbers' },
      fails: { type: 'array', items: { type: 'string' }, description: 'what under-performs, with numbers' },
      next: { type: 'array', items: { type: 'string' }, description: '5 concrete content recommendations for the next 30 days' },
      bestTimes: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'works', 'fails', 'next'],
  }, { kind: 'insights', brand: id });
  const j = out.json || {};
  const result = { at: new Date().toISOString(), via: `${out.providerName || out.provider} · ${out.model}`, posts: posts.length, summary: String(j.summary || ''), works: (j.works || []).map(String).slice(0, 8), fails: (j.fails || []).map(String).slice(0, 8), next: (j.next || []).map(String).slice(0, 8), bestTimes: (j.bestTimes || []).map(String).slice(0, 6) };
  await store.writeJSON(`insights/${id}.json`, result);
  return result;
}

module.exports = { learn };
