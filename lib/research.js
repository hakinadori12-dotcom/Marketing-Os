// Layer 2: market & competitor intelligence.
// discover → user curates the list → deep research per competitor → cross-competitor analysis.
// Every claim keeps a basis (fact / observation / inference), a source and the research date.
const store = require('./store');
const brands = require('./brands');
const { research } = require('./search');
const { randomId } = require('./crypto');
const ai = require('./ai');

const err = (status, message) => Object.assign(new Error(message), { status });
const DOC = (id) => `research/${id}.json`;
const CLAIM = { type: 'object', properties: { value: { type: 'string' }, basis: { type: 'string', enum: ['fact', 'observation', 'inference'] }, source: { type: 'string' } }, required: ['value', 'basis'] };
const LIST = (d) => ({ type: 'array', items: { type: 'object', properties: { value: { type: 'string', description: d }, basis: { type: 'string', enum: ['fact', 'observation', 'inference'] }, source: { type: 'string' } }, required: ['value', 'basis'] } });

const SECTIONS = [
  ['dna', 'Brand DNA'], ['archetype', 'Archetype'], ['positioning', 'التموضع'], ['personality', 'الشخصية'], ['tone', 'نبرة التواصل'], ['audience', 'الجمهور المستهدف'],
  ['strategy', 'الاستراتيجية التسويقية'], ['social', 'السوشال ميديا'], ['ads', 'الإعلانات'], ['campaigns', 'الحملات'], ['funnel', 'قمع التسويق'],
];
// Every public place a competitor can be found (not only website + Instagram).
const CHANNELS = [['website', 'الموقع'], ['instagram', 'إنستغرام'], ['tiktok', 'تيك توك'], ['facebook', 'فيسبوك'], ['youtube', 'يوتيوب'], ['x', 'X / تويتر'], ['linkedin', 'لينكدإن'], ['snapchat', 'سناب شات'], ['pinterest', 'بنترست'], ['threads', 'ثريدز'], ['whatsapp', 'واتساب'], ['google_maps', 'خرائط Google / التقييمات'], ['marketplace', 'متاجر (أمازون، نون، تطبيق…)']];
const cleanChannels = (o) => Object.fromEntries(CHANNELS.map(([k]) => [k, String(o?.[k] || '').trim().slice(0, 300)]).filter(([, v]) => v && !/^(n\/a|none|unknown|-|لا يوجد)$/i.test(v)));
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
          channels: { type: 'object', description: 'every public channel you found (URL or handle), leave out what you did not find', properties: Object.fromEntries(CHANNELS.map(([k, l]) => [k, { type: 'string', description: l }])) },
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
Prefer brands that are active in the same country/city and sell to the same audience. For each one, list every public channel you can find: website, Instagram, TikTok, Facebook, YouTube, X, LinkedIn, Snapchat, Pinterest, Threads, WhatsApp, Google Maps listing, marketplaces (Amazon, Noon, apps). Do not list the brand itself.`;
  const queries = [`${b.fields?.industry?.value || b.name} ${mk} competitors`, `${b.fields?.industry?.value || ''} ${mk} brands instagram`, ...seedList.slice(0, 3).map((s) => `${s} ${mk}`)];
  const out = await research(prompt, DISCOVER_SCHEMA, queries, { brand: id, kind: 'discover' });
  const data = await load(id);
  const have = new Set(data.competitors.map((c) => c.name.toLowerCase()));
  const found = [];
  for (const c of (out.json.competitors || []).slice(0, 12)) {
    const name = String(c.name || '').trim().slice(0, 80);
    if (!name || have.has(name.toLowerCase()) || name.toLowerCase() === b.name.toLowerCase()) continue;
    have.add(name.toLowerCase());
    const channels = cleanChannels({ ...(c.channels || {}), website: c.website || c.channels?.website, instagram: c.instagram || c.channels?.instagram });
    const row = { id: randomId(4), name, website: channels.website || '', instagram: channels.instagram || '', channels, kind: c.kind === 'indirect' ? 'indirect' : 'direct', why: String(c.why || '').slice(0, 300), source: String(c.source || '').slice(0, 300), status: 'found', addedAt: new Date().toISOString(), seed: seedList.some((s) => s.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.toLowerCase())) };
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
  const channels = cleanChannels({ ...(body.channels || {}), website: body.website || body.channels?.website, instagram: body.instagram || body.channels?.instagram });
  const row = { id: randomId(4), name, website: channels.website || '', instagram: channels.instagram || '', channels, kind: 'direct', why: 'أضافه المستخدم', status: 'found', addedAt: new Date().toISOString(), seed: true };
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
    channels: {
      type: 'array',
      description: 'one row per channel where the competitor is present',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: CHANNELS.map(([k]) => k) }, url: { type: 'string' },
          audience: { type: 'string', description: 'followers / subscribers / reviews count as shown publicly, else empty' },
          activity: { type: 'string', description: 'posting frequency and last activity, in Arabic' },
          content: { type: 'string', description: 'what they post there and what gets the most engagement, in Arabic' },
          basis: { type: 'string', enum: ['fact', 'observation', 'inference'] }, source: { type: 'string' },
        },
        required: ['platform', 'content', 'basis'],
      },
    },
    pricing: CLAIM,
    reviews: { ...CLAIM, description: 'what customers say (Google Maps, store reviews, comments): praise and complaints' },
  },
  required: ['summary', 'channels', ...SECTIONS.map(([k]) => k)],
};

async function analyze(id, cid) {
  const b = await brands.get(id);
  const data = await load(id);
  const c = data.competitors.find((x) => x.id === cid);
  if (!c) throw err(404, 'المنافس غير موجود');
  const known = Object.entries(c.channels || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || [c.website, c.instagram].filter(Boolean).join(', ');
  const prompt = `Do a marketing research profile of the competitor "${c.name}"${known ? ` (known channels: ${known})` : ''}.
It competes with: ${brandLine(b)}
Search ALL their public channels, not only the website and Instagram: TikTok, Facebook, YouTube, X, LinkedIn, Snapchat, Pinterest, Threads, WhatsApp business, Google Maps / reviews, marketplaces (Amazon, Noon, apps), press, Meta Ad Library / TikTok ads, Google search results. Fill "channels" with one row per channel found (with the public follower/review count when visible), plus pricing and customer reviews.
Write every value in Arabic (keep brand names and quotes as written). Sections: Brand DNA, archetype, positioning, personality, tone of voice, target audience, marketing strategy, social media content (platforms, formats, frequency, what performs), advertising creatives, campaigns, marketing funnel, content pillars, offers, hooks, CTAs, strengths, weaknesses.
Be specific (real examples of posts, slogans, offers) and honest about what you could not see.`;
  const queries = [`${c.name} ${b.fields?.market?.value || ''}`, `${c.name} instagram tiktok`, `${c.name} facebook youtube`, `${c.name} reviews تقييمات`, `${c.name} offer promotion ads`];
  const out = await research(prompt, PROFILE_SCHEMA, queries, { brand: id, kind: 'competitor' });
  const j = out.json || {};
  const clean = (x) => (x && x.value ? { value: String(x.value).slice(0, 1500), basis: ['fact', 'observation', 'inference'].includes(x.basis) ? x.basis : 'inference', source: String(x.source || '').slice(0, 300) } : null);
  const profile = { summary: String(j.summary || '').slice(0, 1200) };
  for (const [k] of SECTIONS) profile[k] = clean(j[k]);
  for (const [k] of LISTS) profile[k] = (j[k] || []).map(clean).filter(Boolean).slice(0, 12);
  profile.pricing = clean(j.pricing);
  profile.reviews = clean(j.reviews);
  profile.channels = (j.channels || []).filter((x) => CHANNELS.some(([k]) => k === x.platform)).slice(0, 14).map((x) => ({
    platform: x.platform, url: String(x.url || '').slice(0, 300), audience: String(x.audience || '').slice(0, 80), activity: String(x.activity || '').slice(0, 300),
    content: String(x.content || '').slice(0, 800), basis: ['fact', 'observation', 'inference'].includes(x.basis) ? x.basis : 'inference', source: String(x.source || '').slice(0, 300),
  }));
  const fresh = await load(id);
  const row = fresh.competitors.find((x) => x.id === cid);
  if (!row) throw err(404, 'المنافس غير موجود');
  for (const ch of profile.channels) if (ch.url && !row.channels?.[ch.platform]) row.channels = { ...(row.channels || {}), [ch.platform]: ch.url };
  if (!row.website && row.channels?.website) row.website = row.channels.website;
  if (!row.instagram && row.channels?.instagram) row.instagram = row.channels.instagram;
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
  const brief = done.map((c) => `### ${c.name}\n${c.profile.summary}\n${SECTIONS.map(([k, l]) => (c.profile[k] ? `${l}: ${c.profile[k].value}` : '')).filter(Boolean).join('\n')}\n${LISTS.map(([k, l]) => (c.profile[k]?.length ? `${l}: ${c.profile[k].map((x) => x.value).join(' | ')}` : '')).filter(Boolean).join('\n')}
${(c.profile.channels || []).length ? `Channels: ${c.profile.channels.map((x) => `${x.platform}${x.audience ? ` (${x.audience})` : ''}: ${x.content}`).join(' | ')}` : ''}${c.profile.reviews ? `\nReviews: ${c.profile.reviews.value}` : ''}`).join('\n\n').slice(0, 40000);
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

// ---------- 4. my brand vs selected competitors ----------
const COMPARE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '3 sentences in Arabic: where our brand stands against these competitors' },
    rows: {
      type: 'array',
      description: 'one row per dimension',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string', description: 'in Arabic' },
          brand: { type: 'string', description: 'our brand on this dimension, in Arabic (say "غير معروف" when the brand brain has no info)' },
          competitors: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' } }, required: ['name', 'value'] } },
          leader: { type: 'string', description: 'who leads on this dimension: our brand name or a competitor name' },
          action: { type: 'string', description: 'one concrete action for our brand, in Arabic' },
        },
        required: ['dimension', 'brand', 'competitors', 'leader', 'action'],
      },
    },
    edges: { type: 'array', items: { type: 'string' }, description: 'where our brand is already better (Arabic)' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'where competitors beat us (Arabic)' },
    priorities: { type: 'array', items: { type: 'string' }, description: 'top 3-5 priorities for the next 30 days (Arabic)' },
  },
  required: ['summary', 'rows', 'priorities'],
};
const DIMENSIONS = ['التموضع والوعد', 'الجمهور المستهدف', 'نبرة التواصل', 'المنتجات والأسعار', 'العروض', 'الحضور على المنصات', 'نوعية المحتوى', 'الإعلانات والحملات', 'تجربة العميل والتقييمات', 'نقاط التميّز'];

async function compare(id, { ids = [] } = {}) {
  const b = await brands.get(id);
  const data = await load(id);
  const list = data.competitors.filter((c) => c.status === 'researched' && (!ids.length || ids.includes(c.id))).slice(0, 5);
  if (!list.length) throw err(400, 'اختر منافساً محلَّلاً واحداً على الأقل');
  const f = (k) => b.fields?.[k]?.value || '';
  const ours = `Name: ${b.name}. ${brandLine(b)} Tone: ${f('tone')}. Promise: ${f('promise')}. Differentiators: ${f('usp')}. Personality: ${f('personality')}. Colours: ${(b.visual?.colors || []).join(', ')}. Products: ${(b.products || []).slice(0, 15).map((p) => `${p.name}${p.price ? ` (${p.price})` : ''}`).join(', ')}.`;
  const theirs = list.map((c) => `### ${c.name}\n${c.profile.summary}\n${SECTIONS.map(([k, l]) => (c.profile[k] ? `${l}: ${c.profile[k].value}` : '')).filter(Boolean).join('\n')}\n${LISTS.map(([k, l]) => (c.profile[k]?.length ? `${l}: ${c.profile[k].map((x) => x.value).join(' | ')}` : '')).filter(Boolean).join('\n')}\n${c.profile.pricing ? `Pricing: ${c.profile.pricing.value}` : ''}\n${(c.profile.channels || []).map((x) => `${x.platform}${x.audience ? ` (${x.audience})` : ''}: ${x.content}`).join(' | ')}`).join('\n\n').slice(0, 36000);
  const out = await ai.json(`Compare OUR brand with these competitors, dimension by dimension, honestly (do not flatter our brand).
=== OUR BRAND ===
${ours}
=== COMPETITORS (researched) ===
${theirs}
Use these dimensions: ${DIMENSIONS.join(' | ')}. Use the exact competitor names: ${list.map((c) => c.name).join(', ')}. Short cell values (max 25 words). Write in Arabic.`, COMPARE_SCHEMA, { kind: 'compare', brand: id });
  const j = out.json || {};
  const names = list.map((c) => c.name);
  const result = {
    at: new Date().toISOString(), via: `${out.providerName || out.provider} · ${out.model}`, ids: list.map((c) => c.id), names,
    summary: String(j.summary || ''),
    rows: (j.rows || []).slice(0, 14).map((r) => ({
      dimension: String(r.dimension || ''), brand: String(r.brand || ''), leader: String(r.leader || ''), action: String(r.action || ''),
      competitors: names.map((n) => String((r.competitors || []).find((x) => String(x.name || '').trim().toLowerCase() === n.toLowerCase())?.value || '—')),
    })).filter((r) => r.dimension),
    edges: (j.edges || []).map(String).slice(0, 8), gaps: (j.gaps || []).map(String).slice(0, 8), priorities: (j.priorities || []).map(String).slice(0, 6),
  };
  const fresh = await load(id);
  fresh.compare = result;
  await save(id, fresh);
  return result;
}

// ---------- downloads (Excel, Word, PDF, CSV, Markdown) ----------
const B = { fact: 'حقيقة', observation: 'ملاحظة', inference: 'استنتاج' };
const FUN = { awareness: 'الوعي', consideration: 'الاهتمام', conversion: 'التحويل', retention: 'الولاء' };
const ST = { proposed: 'مقترحة', approved: 'موافَق عليها', rejected: 'مرفوضة' };
const CH = Object.fromEntries(CHANNELS);
const day = (x) => String(x || '').slice(0, 10);

async function reportModel(id, { c: cid, kind } = {}) {
  const b = await brands.get(id);
  const data = await load(id);
  const stamp = `${b.name} · Marketing OS · ${new Date().toISOString().slice(0, 10)}`;
  if (cid) {
    const c = data.competitors.find((x) => x.id === cid);
    if (!c?.profile) throw err(404, 'حلّل المنافس أولاً');
    const p = c.profile;
    const head = ['البند', 'المعلومة', 'النوع', 'المصدر', 'تاريخ البحث'];
    const when = day(c.researchedAt);
    const row = (l, x) => [l, x.value, B[x.basis] || '', x.source || '', when];
    return {
      title: `تحليل المنافس: ${c.name}`, subtitle: `${stamp} · ${c.via || ''}`, file: `competitor-${c.name}`,
      sheets: [
        { name: 'الملخص والهوية', intro: p.summary, head, rows: SECTIONS.filter(([k]) => p[k]).map(([k, l]) => row(l, p[k])).concat(['pricing', 'reviews'].filter((k) => p[k]).map((k) => row(k === 'pricing' ? 'الأسعار' : 'آراء العملاء', p[k]))) },
        { name: 'القنوات', head: ['القناة', 'الرابط', 'الجمهور', 'النشاط', 'المحتوى', 'النوع'], rows: (p.channels || []).map((x) => [CH[x.platform] || x.platform, x.url, x.audience, x.activity, x.content, B[x.basis] || '']).concat(Object.entries(c.channels || {}).filter(([k]) => !(p.channels || []).some((x) => x.platform === k)).map(([k, v]) => [CH[k] || k, v, '', '', '', ''])) },
        ...LISTS.map(([k, l]) => ({ name: l, head, rows: (p[k] || []).map((x) => row(l, x)) })).filter((sh) => sh.rows.length),
        { name: 'المصادر', head: ['العنوان', 'الرابط'], rows: (c.sources || []).map((x) => [x.title || '', x.url]) },
      ],
    };
  }
  if (kind === 'compare') {
    const X = data.compare;
    if (!X) throw err(404, 'شغّل المقارنة أولاً');
    return {
      title: `${b.name} مقابل المنافسين`, subtitle: `${stamp} · ${X.via}`, file: `${b.name}-vs-competitors`,
      sheets: [
        { name: 'المقارنة', intro: X.summary, head: ['البعد', b.name, ...X.names, 'المتفوّق', 'ما نفعله'], rows: X.rows.map((r) => [r.dimension, r.brand, ...r.competitors, r.leader, r.action]) },
        { name: 'الأولويات', head: ['النوع', 'النقطة'], rows: [...X.priorities.map((x) => ['أولوية', x]), ...X.edges.map((x) => ['نتفوق فيه', x]), ...X.gaps.map((x) => ['يتفوقون فيه', x])] },
      ],
    };
  }
  const X = data.cross;
  const comps = data.competitors;
  return {
    title: `تحليل السوق والمنافسين · ${b.name}`, subtitle: `${stamp}${X ? ` · ${X.via}` : ''}`, file: `${b.name}-market-analysis`,
    sheets: [
      { name: 'المنافسون', head: ['المنافس', 'النوع', 'التموضع', 'نبرة التواصل', 'الجمهور', 'نقاط القوة', 'نقاط الضعف', 'القنوات', 'تاريخ البحث'], rows: comps.map((c) => [c.name, c.kind === 'indirect' ? 'غير مباشر' : 'مباشر', c.profile?.positioning?.value || '', c.profile?.tone?.value || '', c.profile?.audience?.value || '', (c.profile?.strengths || []).map((x) => x.value).join(' • '), (c.profile?.weaknesses || []).map((x) => x.value).join(' • '), Object.entries(c.channels || {}).map(([k, v]) => `${CH[k] || k}: ${v}`).join('\n'), day(c.researchedAt)]) },
      ...(X ? [
        { name: 'الفرص', intro: X.summary, head: ['الفرصة', 'من أين جاءت', 'الزاوية', 'مرحلة القمع', 'الحاجة', 'الصيغة', 'القرار'], rows: X.opportunities.map((o) => [o.title, o.why, o.angle, FUN[o.funnel] || o.funnel, o.need, o.format, ST[o.status] || '']) },
        { name: 'قراءة السوق', head: ['النوع', 'المعلومة', 'الأساس', 'المصدر'], rows: [['strengths', 'قوة في السوق'], ['weaknesses', 'ثغرة'], ['repeated', 'يتكرر'], ['saturated', 'مشبع (تجنّبه)'], ['unmet', 'حاجة بلا جواب']].flatMap(([k, l]) => (X[k] || []).map((x) => [l, x.value, B[x.basis] || '', x.source || ''])) },
        { name: 'المحاور والمواسم', head: ['النوع', 'القيمة'], rows: [...X.pillars.map((p) => ['محور محتوى', p]), ...X.seasonal.map((s2) => ['موسم', `${s2.moment}: ${s2.idea}`])] },
        { name: 'المصادر', head: ['العنوان', 'الرابط'], rows: (X.sources || []).map((x) => [x.title || '', x.url]) },
      ] : []),
      ...(data.compare ? [{ name: 'مقارنة مع براندي', intro: data.compare.summary, head: ['البعد', b.name, ...data.compare.names, 'المتفوّق', 'ما نفعله'], rows: data.compare.rows.map((r) => [r.dimension, r.brand, ...r.competitors, r.leader, r.action]) }] : []),
    ],
  };
}

module.exports = { reportModel, compare, CHANNELS, load, discover, add, remove, analyze, cross, setOpportunity, contextFor, SECTIONS, LISTS };
