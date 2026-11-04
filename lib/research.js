// Layer 2: market & competitor intelligence.
// discover → user curates the list → deep research per competitor → cross-competitor analysis.
// Every claim keeps a basis (fact / observation / inference), a source and the research date.
const store = require('./store');
const brands = require('./brands');
const { research } = require('./search');
const { randomId } = require('./crypto');

const err = (status, message) => Object.assign(new Error(message), { status });
const DOC = (id) => `research/${id}.json`;
const CLAIM = { type: 'object', properties: { value: { type: 'string' }, basis: { type: 'string', enum: ['fact', 'observation', 'inference'] }, source: { type: 'string' } }, required: ['value', 'basis'] };
const LIST = (d) => ({ type: 'array', items: { type: 'object', properties: { value: { type: 'string', description: d }, basis: { type: 'string', enum: ['fact', 'observation', 'inference'] }, source: { type: 'string' } }, required: ['value', 'basis'] } });

const SECTIONS = [
  ['dna', 'Brand DNA'], ['archetype', 'Archetype'], ['positioning', 'التموضع'], ['personality', 'الشخصية'], ['tone', 'نبرة التواصل'], ['audience', 'الجمهور المستهدف'],
  ['strategy', 'الاستراتيجية التسويقية'], ['social', 'السوشال ميديا'], ['ads', 'الإعلانات'], ['campaigns', 'الحملات'], ['funnel', 'قمع التسويق'],
];
const LISTS = [['pillars', 'محاور المحتوى'], ['offers', 'العروض'], ['hooks', 'الخطافات'], ['ctas', 'الدعوات للإجراء'], ['strengths', 'نقاط القوة'], ['weaknesses', 'نقاط الضعف']];

async function load(id) {
  return store.readJSON(DOC(id), { competitors: [], cross: null, updatedAt: null });
}
async function save(id, data) {
  data.updatedAt = new Date().toISOString();
  return store.writeJSON(DOC(id), data);
}

function brandLine(b) {
  const f = (k) => b.fields?.[k]?.value || '';
  return `Brand: ${b.name}${b.website ? ` (${b.website})` : ''}. Industry: ${f('industry') || 'unknown'}. Market: ${f('market') || 'unknown'}. Audience: ${f('audience') || 'unknown'}. Offer: ${f('description')}. ${(b.products || []).length ? `Products: ${b.products.slice(0, 10).map((p) => p.name).join(', ')}.` : ''}`;
}

// ---------- 1. discovery ----------
const DISCOVER_SCHEMA = {
  type: 'object',
  properties: {
    competitors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, website: { type: 'string' }, instagram: { type: 'string', description: 'handle or URL if found' },
          kind: { type: 'string', enum: ['direct', 'indirect'] }, why: { type: 'string', description: 'one sentence in Arabic: why they compete with the brand' }, source: { type: 'string' },
        },
        required: ['name', 'why'],
      },
    },
  },
  required: ['competitors'],
};

async function discover(id, { seeds = '', market = '', hint = '' } = {}) {
  const b = await brands.get(id);
  const seedList = String(seeds || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean).slice(0, 10);
  const mk = String(market || b.fields?.market?.value || '').slice(0, 120);
  const prompt = `Find the real competitors of this brand${mk ? ` in this market: ${mk}` : ''}.
${brandLine(b)}${hint ? ` More about the brand: ${String(hint).slice(0, 600)}` : ''}
${seedList.length ? `The owner already named: ${seedList.join(', ')}. Include them and add up to 6 more.` : 'List up to 8 competitors.'}
Prefer brands that are active in the same country/city and sell to the same audience. Include their website and Instagram when you can find them. Do not list the brand itself.`;
  const queries = [`${b.fields?.industry?.value || b.name} ${mk} competitors`, `${b.fields?.industry?.value || ''} ${mk} brands instagram`, ...seedList.slice(0, 3).map((s) => `${s} ${mk}`)];
  const out = await research(prompt, DISCOVER_SCHEMA, queries, { brand: id, kind: 'discover' });
  const data = await load(id);
  const have = new Set(data.competitors.map((c) => c.name.toLowerCase()));
  const found = [];
  for (const c of (out.json.competitors || []).slice(0, 12)) {
    const name = String(c.name || '').trim().slice(0, 80);
    if (!name || have.has(name.toLowerCase()) || name.toLowerCase() === b.name.toLowerCase()) continue;
    have.add(name.toLowerCase());
    const row = { id: randomId(4), name, website: String(c.website || '').slice(0, 200), instagram: String(c.instagram || '').slice(0, 200), kind: c.kind === 'indirect' ? 'indirect' : 'direct', why: String(c.why || '').slice(0, 300), source: String(c.source || '').slice(0, 300), status: 'found', addedAt: new Date().toISOString(), seed: seedList.some((s) => s.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.toLowerCase())) };
    data.competitors.push(row);
    found.push(row);
  }
  data.discovery = { at: new Date().toISOString(), via: out.via, web: out.web, sources: out.sources };
  await save(id, data);
  return { found, competitors: data.competitors, via: out.via, web: out.web };
}

async function add(id, body) {
  const data = await load(id);
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) throw err(400, 'اكتب اسم المنافس');
  if (data.competitors.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw err(400, 'هذا المنافس موجود');
  const row = { id: randomId(4), name, website: String(body.website || '').slice(0, 200), instagram: String(body.instagram || '').slice(0, 200), kind: 'direct', why: 'أضافه المستخدم', status: 'found', addedAt: new Date().toISOString(), seed: true };
  data.competitors.push(row);
  await save(id, data);
  return row;
}

async function remove(id, cid) {
  const data = await load(id);
  data.competitors = data.competitors.filter((c) => c.id !== cid);
  await save(id, data);
}

// ---------- 2. deep research per competitor ----------
const PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '3 sentences in Arabic' },
    ...Object.fromEntries(SECTIONS.map(([k]) => [k, CLAIM])),
    ...Object.fromEntries(LISTS.map(([k, l]) => [k, LIST(l)])),
  },
  required: ['summary', ...SECTIONS.map(([k]) => k)],
};

async function analyze(id, cid) {
  const b = await brands.get(id);
  const data = await load(id);
  const c = data.competitors.find((x) => x.id === cid);
  if (!c) throw err(404, 'المنافس غير موجود');
  const prompt = `Do a marketing research profile of the competitor "${c.name}"${c.website ? ` (${c.website})` : ''}${c.instagram ? `, Instagram ${c.instagram}` : ''}.
It competes with: ${brandLine(b)}
Study what is publicly visible: website, social media (Instagram, TikTok, Facebook, YouTube, LinkedIn), Meta Ad Library style advertising, campaigns, offers.
Write every value in Arabic (keep brand names and quotes as written). Sections: Brand DNA, archetype, positioning, personality, tone of voice, target audience, marketing strategy, social media content (platforms, formats, frequency, what performs), advertising creatives, campaigns, marketing funnel, content pillars, offers, hooks, CTAs, strengths, weaknesses.
Be specific (real examples of posts, slogans, offers) and honest about what you could not see.`;
  const queries = [`${c.name} ${b.fields?.market?.value || ''}`, `${c.name} instagram`, `${c.name} offre promotion`, `${c.name} campaign ads`];
  const out = await research(prompt, PROFILE_SCHEMA, queries, { brand: id, kind: 'competitor' });
  const j = out.json || {};
  const clean = (x) => (x && x.value ? { value: String(x.value).slice(0, 1500), basis: ['fact', 'observation', 'inference'].includes(x.basis) ? x.basis : 'inference', source: String(x.source || '').slice(0, 300) } : null);
  const profile = { summary: String(j.summary || '').slice(0, 1200) };
  for (const [k] of SECTIONS) profile[k] = clean(j[k]);
  for (const [k] of LISTS) profile[k] = (j[k] || []).map(clean).filter(Boolean).slice(0, 12);
  const fresh = await load(id);
  const row = fresh.competitors.find((x) => x.id === cid);
  if (!row) throw err(404, 'المنافس غير موجود');
  Object.assign(row, { status: 'researched', profile, sources: out.sources, via: out.via, web: out.web, researchedAt: new Date().toISOString() });
  await save(id, fresh);
  return row;
}

// ---------- 3. cross-competitor intelligence ----------
const CROSS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '3-4 sentences in Arabic: the state of the market' },
    strengths: LIST('a strength seen in competitors (name the competitor)'),
    weaknesses: LIST('a weakness / gap in competitors (name the competitor)'),
    repeated: LIST('marketing tactics repeated across the market'),
    saturated: LIST('topics/angles the competition over-uses'),
    unmet: LIST('audience needs or questions nobody answers well'),
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' }, why: { type: 'string', description: 'which research finding it comes from' }, angle: { type: 'string', description: 'the creative angle for OUR brand' },
          funnel: { type: 'string', enum: ['awareness', 'consideration', 'conversion', 'retention'] }, need: { type: 'string', description: 'audience need it answers' },
          format: { type: 'string', description: 'suggested content type: post, carousel, reel, story, ad…' },
        },
        required: ['title', 'why', 'angle', 'funnel'],
      },
    },
    pillars: { type: 'array', items: { type: 'string' }, description: '3-5 content pillars for our brand' },
    seasonal: { type: 'array', items: { type: 'object', properties: { moment: { type: 'string' }, idea: { type: 'string' } }, required: ['moment', 'idea'] } },
  },
  required: ['summary', 'opportunities', 'pillars'],
};

async function cross(id) {
  const b = await brands.get(id);
  const data = await load(id);
  const done = data.competitors.filter((c) => c.status === 'researched');
  if (!done.length) throw err(400, 'حلّل منافساً واحداً على الأقل أولاً');
  const brief = done.map((c) => `### ${c.name}\n${c.profile.summary}\n${SECTIONS.map(([k, l]) => (c.profile[k] ? `${l}: ${c.profile[k].value}` : '')).filter(Boolean).join('\n')}\n${LISTS.map(([k, l]) => (c.profile[k]?.length ? `${l}: ${c.profile[k].map((x) => x.value).join(' | ')}` : '')).filter(Boolean).join('\n')}`).join('\n\n').slice(0, 40000);
  const prompt = `You are a market strategist. Compare these competitors and turn the findings into a content strategy for OUR brand.
=== OUR BRAND ===
${brandLine(b)}
Tone: ${b.fields?.tone?.value || ''}. Promise: ${b.fields?.promise?.value || ''}. Differentiators: ${b.fields?.usp?.value || ''}.
=== COMPETITOR RESEARCH (${new Date().toISOString().slice(0, 10)}) ===
${brief}
Find real opportunities that fit OUR identity (not copies of competitors). Link each opportunity to a finding, an audience need and a funnel stage. Include seasonal moments of this market (e.g. Ramadan, Eid, back to school, national days) when relevant. Write in Arabic.`;
  const out = await research(prompt, CROSS_SCHEMA, [`${b.fields?.industry?.value || ''} ${b.fields?.market?.value || ''} marketing trends ${new Date().getFullYear()}`], { brand: id, kind: 'cross' });
  const j = out.json || {};
  const cl = (arr) => (arr || []).map((x) => (typeof x === 'string' ? { value: x, basis: 'inference' } : { value: String(x.value || ''), basis: x.basis || 'inference', source: x.source || '' })).filter((x) => x.value).slice(0, 12);
  const fresh = await load(id);
  fresh.cross = {
    at: new Date().toISOString(), via: out.via, web: out.web, sources: out.sources, competitors: done.map((c) => c.name),
    summary: String(j.summary || ''), strengths: cl(j.strengths), weaknesses: cl(j.weaknesses), repeated: cl(j.repeated), saturated: cl(j.saturated), unmet: cl(j.unmet),
    opportunities: (j.opportunities || []).slice(0, 12).map((o) => ({ id: randomId(3), title: String(o.title || ''), why: String(o.why || ''), angle: String(o.angle || ''), funnel: ['awareness', 'consideration', 'conversion', 'retention'].includes(o.funnel) ? o.funnel : 'awareness', need: String(o.need || ''), format: String(o.format || ''), status: 'proposed' })),
    pillars: (j.pillars || []).map(String).slice(0, 6), seasonal: (j.seasonal || []).slice(0, 8).map((s) => ({ moment: String(s.moment || ''), idea: String(s.idea || '') })),
  };
  await save(id, fresh);
  // feed the brand brain: competitor names become a confirmed-by-research field
  const names = fresh.competitors.map((c) => c.name).join('، ');
  if (names && !b.fields?.competitors?.value) await brands.patch(id, { fields: { competitors: { value: names, source: 'extracted' } } }).catch(() => {});
  return fresh.cross;
}

async function setOpportunity(id, oid, status) {
  const data = await load(id);
  const o = data.cross?.opportunities.find((x) => x.id === oid);
  if (!o) throw err(404, 'الفرصة غير موجودة');
  o.status = ['proposed', 'approved', 'rejected'].includes(status) ? status : o.status;
  await save(id, data);
  return o;
}

// Short research memory used by the content generator.
async function contextFor(id) {
  const data = await load(id).catch(() => null);
  if (!data?.cross) return '';
  const approved = data.cross.opportunities.filter((o) => o.status === 'approved');
  const ops = (approved.length ? approved : data.cross.opportunities).slice(0, 4).map((o) => `${o.title}: ${o.angle}`).join(' | ');
  return `Market research (${data.cross.at.slice(0, 10)}): ${data.cross.summary} Over-used by competitors (avoid): ${data.cross.saturated.slice(0, 4).map((x) => x.value).join('; ')}. Opportunities for us: ${ops}. Pillars: ${data.cross.pillars.join(', ')}.`;
}

// CSV (opens directly in Google Sheets / Excel): one file per competitor, and a master file for our brand.
const B = { fact: 'حقيقة', observation: 'ملاحظة', inference: 'استنتاج' };
const csv = (rows) => '\ufeff' + rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
async function exportCSV(id, cid) {
  const data = await load(id);
  if (cid) {
    const c = data.competitors.find((x) => x.id === cid);
    if (!c?.profile) throw err(404, 'حلّل المنافس أولاً');
    const rows = [['القسم', 'المعلومة', 'النوع', 'المصدر', 'تاريخ البحث']];
    rows.push(['ملخص', c.profile.summary, '', '', c.researchedAt.slice(0, 10)]);
    for (const [k, l] of SECTIONS) if (c.profile[k]) rows.push([l, c.profile[k].value, B[c.profile[k].basis], c.profile[k].source, c.researchedAt.slice(0, 10)]);
    for (const [k, l] of LISTS) for (const x of c.profile[k] || []) rows.push([l, x.value, B[x.basis], x.source, c.researchedAt.slice(0, 10)]);
    for (const s2 of c.sources || []) rows.push(['مصدر', s2.title, '', s2.url, '']);
    return { name: `competitor-${c.name}.csv`, body: csv(rows) };
  }
  const rows = [['المنافس', 'الموقع', 'إنستغرام', 'النوع', 'لماذا', 'الحالة', 'تاريخ البحث']];
  for (const c of data.competitors) rows.push([c.name, c.website, c.instagram, c.kind === 'direct' ? 'مباشر' : 'غير مباشر', c.why, c.status === 'researched' ? 'محلَّل' : 'مكتشف', (c.researchedAt || '').slice(0, 10)]);
  if (data.cross) {
    rows.push([], ['الفرصة', 'الزاوية', 'من أين جاءت', 'مرحلة القمع', 'الحاجة', 'الصيغة', 'الحالة']);
    for (const o of data.cross.opportunities) rows.push([o.title, o.angle, o.why, o.funnel, o.need, o.format, o.status]);
    rows.push([], ['محاور المحتوى'], ...data.cross.pillars.map((p) => [p]));
  }
  return { name: 'brand-master.csv', body: csv(rows) };
}

module.exports = { exportCSV, load, discover, add, remove, analyze, cross, setOpportunity, contextFor, SECTIONS, LISTS };
