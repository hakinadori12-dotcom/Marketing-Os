// Content generator (batches of ready posts), monthly content plan, image studio history.
const store = require('./store');
const brands = require('./brands');
const ai = require('./ai');
const { randomId } = require('./crypto');
const PD = require('./postdesign');

const err = (status, message) => Object.assign(new Error(message), { status });

const PLATFORMS = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', x: 'X (Twitter)', linkedin: 'LinkedIn', snapchat: 'Snapchat', youtube: 'YouTube', threads: 'Threads', whatsapp: 'WhatsApp Status',
};
const TYPES = {
  post: 'منشور عادي (صورة + نص)', carousel: 'كاروسيل (عدة شرائح)', reel: 'سكريبت ريلز / فيديو قصير', story: 'ستوري', ad: 'نص إعلان ممول', thread: 'سلسلة تغريدات', ugc: 'سكريبت UGC', email: 'رسالة بريد تسويقية',
};
const GOALS = {
  awareness: 'التعريف بالبراند', engagement: 'التفاعل', sales: 'البيع والتحويل', launch: 'إطلاق منتج', offer: 'عرض / تخفيض', education: 'محتوى تعليمي', trust: 'بناء الثقة وآراء العملاء',
};
const DIALECTS = {
  msa: 'العربية الفصحى المبسطة', darija: 'الدارجة المغربية (بالحروف العربية)', khaleeji: 'اللهجة الخليجية', masri: 'اللهجة المصرية', shami: 'اللهجة الشامية', fr: 'Français', en: 'English',
};
const FRAMEWORKS = { auto: 'اختر الأنسب', aida: 'AIDA', pas: 'PAS (مشكلة، تحريض، حل)', bab: 'Before / After / Bridge', story: 'قصة قصيرة', fab: 'ميزات ← فوائد' };

const OPTIONS = { PLATFORMS, TYPES, GOALS, DIALECTS, FRAMEWORKS };

function brandContext(b, product) {
  const f = (k) => b.fields?.[k]?.value;
  const lines = [
    `Brand: ${b.name}${b.website ? ` (${b.website})` : ''}`,
    f('industry') && `Industry: ${f('industry')}`,
    f('description') && `About: ${f('description')}`,
    f('audience') && `Audience: ${f('audience')}`,
    f('market') && `Market: ${f('market')}`,
    f('tone') && `Tone of voice: ${f('tone')}`,
    f('promise') && `Promise: ${f('promise')}`,
    f('usp') && `Differentiators: ${f('usp')}`,
    f('cta') && `Preferred CTA: ${f('cta')}`,
    f('forbidden') && `NEVER say / avoid: ${f('forbidden')}`,
    (b.visual?.colors || []).length && `Brand colors: ${b.visual.colors.join(', ')}`,
    b.understanding?.text && `What the brand does: ${b.understanding.text}`,
    b.visual?.guide?.summary && `Visual identity: ${b.visual.guide.summary}`,
    b.visual?.fonts?.heading && `Brand fonts: ${b.visual.fonts.heading} (headings), ${b.visual.fonts.body} (body)${b.visual.fonts.latin ? `, ${b.visual.fonts.latin} (Latin)` : ''}`,
  ].filter(Boolean);
  if (product) lines.push(`Focus product: ${product.name}${product.price ? ` — price ${product.price}` : ''}${product.description ? ` — ${product.description}` : ''}`);
  else if ((b.products || []).length) lines.push(`Products: ${b.products.slice(0, 12).map((p) => p.name + (p.price ? ` (${p.price})` : '')).join('; ')}`);
  return lines.join('\n');
}

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'platform id from the list given' },
    title: { type: 'string', description: 'short internal title for the idea (3-6 words)' },
    hook: { type: 'string', description: 'the first line that stops the scroll' },
    caption: { type: 'string', description: 'the full ready-to-post text, with line breaks and emojis if they fit the tone' },
    cta: { type: 'string', description: 'call to action' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '3-10 hashtags without #' },
    slides: { type: 'array', items: { type: 'string' }, description: 'reel/UGC/story script scenes with timing; empty for posts and carousels' },
    cards: { type: 'array', description: 'ONLY for carousel: one object per slide, in order (slide 1 = cover hook, last = CTA)', items: { type: 'object', properties: { headline: { type: 'string', description: 'big text on the slide (max ~8 words)' }, body: { type: 'string', description: 'supporting text on the slide (max ~25 words), may be empty' }, visual: { type: 'string', description: 'what this slide shows, in the content language' } }, required: ['headline', 'visual'] } },
    visual: { type: 'string', description: 'what the image or video should show, in the content language' },
    imagePrompt: { type: 'string', description: 'detailed English prompt for an AI image model: subject, setting, composition, lighting, style, brand colors; no text in the image unless essential' },
    framework: { type: 'string', description: 'copywriting framework used' },
    type: { type: 'string', description: 'content type id of this piece' },
    score: { type: 'number', description: 'your honest 1-10 rating of how well this piece will perform for this brand, audience, goal and platform, compared with what competitors usually post' },
    why: { type: 'string', description: 'one or two sentences, in the content language, explaining the score: why it stands out (or not) versus competitors and for this audience' },
  },
  required: ['platform', 'title', 'hook', 'caption', 'cta', 'hashtags', 'visual', 'imagePrompt'],
};
const BATCH_SCHEMA = { type: 'object', properties: { items: { type: 'array', items: ITEM_SCHEMA } }, required: ['items'] };

// Model chosen on the page ({ provider, model }); falls back to the default in settings.
function pickAI(ai) {
  if (!ai || typeof ai !== 'object' || !ai.provider) return undefined;
  return { provider: String(ai.provider).slice(0, 40), model: String(ai.model || '').slice(0, 160) };
}

function pickKey(map, v, d) {
  return Object.prototype.hasOwnProperty.call(map, v) ? v : d;
}

async function generate(brandId, body) {
  const b = await brands.get(brandId);
  const platforms = (Array.isArray(body.platforms) ? body.platforms : [body.platforms]).filter((p) => PLATFORMS[p]).slice(0, 5);
  if (!platforms.length) throw err(400, 'اختر منصة واحدة على الأقل');
  const types = [...new Set((Array.isArray(body.types) ? body.types : [body.type]).filter((t) => TYPES[t]))].slice(0, 3);
  if (!types.length) types.push('post');
  const type = types[0];
  const goal = pickKey(GOALS, body.goal, 'engagement');
  const dialect = pickKey(DIALECTS, body.dialect, 'msa');
  const framework = pickKey(FRAMEWORKS, body.framework, 'auto');
  const perType = Math.min(10, Math.max(1, Number(body.count) || 3));
  const count = Math.min(12, perType * types.length);
  const product = (b.products || []).find((p) => p.id === body.productId) || null;
  const idea = String(body.idea || '').trim().slice(0, 1500);
  const slidesN = Math.min(10, Math.max(3, Number(body.slides) || 6));

  const system = `You are a senior social media copywriter for Arab and North African brands. You write native, natural, scroll-stopping content — never robotic translations. You follow the brand brain strictly and never invent facts, prices, discounts or claims that are not given.`;
  const prompt = `Write ${types.length > 1 ? `${perType} piece(s) for EACH of these ${types.length} content types (${count} in total)` : `${count} different`} ready-to-publish pieces of content.

=== BRAND BRAIN ===
${brandContext(b, product)}

=== BRIEF ===
Platforms (spread the pieces across them, use these ids): ${platforms.map((p) => `${p} = ${PLATFORMS[p]}`).join(', ')}
Content type${types.length > 1 ? 's (set "type" on every piece)' : ''}: ${types.map((t) => `${t} = ${TYPES[t]}`).join(', ')}
Goal: ${GOALS[goal]}
Language / dialect for ALL text: ${DIALECTS[dialect]}
Copywriting framework: ${FRAMEWORKS[framework]}
${idea ? `Idea / notes from the owner: ${idea}` : 'No specific idea: propose strong, varied angles.'}
${body.occasion ? `Occasion: ${String(body.occasion).slice(0, 200)}` : ''}

Rules: each piece must use a different angle. Respect platform norms (length, tone, hashtags count: X max 2, LinkedIn 3-5, Instagram/TikTok 5-10).
For carousel fill "cards" with EXACTLY ${slidesN} slides (slide 1 = scroll-stopping cover, middle = value, last = CTA) and write the caption that goes with the whole carousel. For reels/UGC fill "slides" with scenes like "0-3s: …". Keep the "imagePrompt" in English.
Then act as a strict creative director: give every piece an honest "score" (1-10) and a short "why" comparing it with what competitors in this market usually post${b.fields?.competitors?.value ? ` (known competitors: ${b.fields.competitors.value})` : ''}. Do not give everything the same score.`;

  const market = await require('./research').contextFor(brandId);
  const learned = await store.readJSON(`insights/${brandId}.json`, null).catch(() => null);
  const perf = learned ? `What worked for this brand (${learned.at.slice(0, 10)}): ${learned.works.slice(0, 4).join(' | ')}. Avoid: ${learned.fails.slice(0, 3).join(' | ')}.` : '';
  const full = [prompt, market && `=== MARKET RESEARCH (use it: stand out from competitors, use our opportunities) ===\n${market}`, perf && `=== OUR REAL PERFORMANCE (learn from it) ===\n${perf}`].filter(Boolean).join('\n\n');
  const out = await ai.json(full, BATCH_SCHEMA, { system, kind: 'content', brand: brandId, override: pickAI(body.ai) });
  const items = (out.json.items || []).slice(0, count).map((x) => ({
    id: randomId(5),
    platform: PLATFORMS[x.platform] ? x.platform : platforms[0],
    type: TYPES[x.type] && types.includes(x.type) ? x.type : type,
    title: String(x.title || '').slice(0, 120),
    hook: String(x.hook || '').slice(0, 400),
    caption: String(x.caption || '').slice(0, 5000),
    cta: String(x.cta || '').slice(0, 300),
    hashtags: (x.hashtags || []).map((h) => String(h).replace(/^#/, '').trim()).filter(Boolean).slice(0, 12),
    slides: (x.slides || []).map(String).slice(0, 12),
    cards: (TYPES[x.type] && types.includes(x.type) ? x.type : type) === 'carousel' ? (x.cards || []).slice(0, 10).map((c) => ({ id: randomId(3), headline: String(c.headline || '').slice(0, 200), body: String(c.body || '').slice(0, 600), visual: String(c.visual || '').slice(0, 600) })) : [],
    visual: String(x.visual || '').slice(0, 800),
    imagePrompt: String(x.imagePrompt || '').slice(0, 2000),
    framework: String(x.framework || '').slice(0, 60),
    score: Math.min(10, Math.max(1, Math.round(Number(x.score) || 0))) || null,
    why: String(x.why || '').slice(0, 500),
    status: 'draft',
  }));
  const top = items.reduce((a, x) => ((x.score || 0) > (a?.score || 0) ? x : a), null);
  if (top && top.score) top.best = true;
  if (!items.length) throw err(502, 'لم يُرجع النموذج أي محتوى. حاول مجدداً.');
  const batch = {
    id: `${Date.now().toString(36)}${randomId(3)}`,
    createdAt: new Date().toISOString(),
    params: { platforms, type, types, goal, dialect, framework, count, slides: types.includes('carousel') ? slidesN : undefined, productId: product?.id || null, productName: product?.name || '', idea },
    model: `${out.provider} · ${out.model}`,
    ms: out.ms,
    fallback: out.fallback || null,
    items,
  };
  await store.pushItem(`batches:${brandId}`, batch, 200);
  return batch;
}

async function listBatches(brandId, limit = 30) {
  const rows = await store.listItems(`batches:${brandId}`, 0, limit);
  return rows.map((x) => ({ id: x.id, createdAt: x.createdAt, params: x.params, model: x.model, count: x.items.length, first: x.items[0]?.hook || '', approved: x.items.filter((i) => i.status === 'approved').length }));
}

async function getBatch(brandId, id) {
  const rows = await store.listItems(`batches:${brandId}`, 0, 200);
  const b = rows.find((x) => x.id === id);
  if (!b) throw err(404, 'الدفعة غير موجودة');
  return b;
}

async function mutateBatches(brandId, fn) {
  const rows = await store.listItems(`batches:${brandId}`, 0, 200);
  const next = fn(rows);
  await store.replaceItems(`batches:${brandId}`, next);
  return next;
}

async function patchItem(brandId, batchId, itemId, body) {
  let found = null;
  await mutateBatches(brandId, (rows) =>
    rows.map((bt) => {
      if (bt.id !== batchId) return bt;
      bt.items = bt.items.map((it) => {
        if (it.id !== itemId) return it;
        for (const k of ['hook', 'caption', 'cta', 'title', 'visual', 'imagePrompt']) if (typeof body[k] === 'string') it[k] = body[k].slice(0, 5000);
        if (Array.isArray(body.hashtags)) it.hashtags = body.hashtags.map(String).slice(0, 12);
        if (Array.isArray(body.cards)) it.cards = body.cards.slice(0, 10).map((c) => ({ id: String(c.id || randomId(3)).slice(0, 12), headline: String(c.headline || '').slice(0, 200), body: String(c.body || '').slice(0, 600), visual: String(c.visual || '').slice(0, 600), ...(c.image?.url ? { image: { url: String(c.image.url), id: String(c.image.id || '') } } : {}) }));
        if (['draft', 'approved', 'rejected'].includes(body.status)) it.status = body.status;
        if (['pending', 'approved', 'rejected'].includes(body.designStatus)) it.designStatus = body.designStatus;
        if (body.image) it.image = { url: String(body.image.url || ''), id: String(body.image.id || '') };
        found = it;
        return it;
      });
      return bt;
    })
  );
  if (!found) throw err(404, 'العنصر غير موجود');
  return found;
}

async function deleteBatch(brandId, batchId) {
  await mutateBatches(brandId, (rows) => rows.filter((x) => x.id !== batchId));
}

// Rewrites one piece with the owner's feedback.
async function rewriteItem(brandId, batchId, itemId, { feedback, ai: aiPick }) {
  const batch = await getBatch(brandId, batchId);
  const it = batch.items.find((x) => x.id === itemId);
  if (!it) throw err(404, 'العنصر غير موجود');
  const b = await brands.get(brandId);
  const product = (b.products || []).find((p) => p.id === batch.params.productId) || null;
  const prompt = `Rewrite this ${PLATFORMS[it.platform]} content following the owner's feedback. Keep the language/dialect: ${DIALECTS[batch.params.dialect]}.

=== BRAND BRAIN ===
${brandContext(b, product)}

=== CURRENT VERSION ===
${JSON.stringify({ hook: it.hook, caption: it.caption, cta: it.cta, hashtags: it.hashtags, slides: it.slides, visual: it.visual, imagePrompt: it.imagePrompt })}

=== FEEDBACK ===
${String(feedback || 'Make it stronger and more natural').slice(0, 1000)}`;
  const out = await ai.json(prompt, ITEM_SCHEMA, { kind: 'rewrite', brand: brandId, override: pickAI(aiPick) });
  const x = out.json;
  return patchItem(brandId, batchId, itemId, {
    hook: x.hook || it.hook, caption: x.caption || it.caption, cta: x.cta || it.cta, visual: x.visual || it.visual, imagePrompt: x.imagePrompt || it.imagePrompt,
    hashtags: Array.isArray(x.hashtags) ? x.hashtags.map((h) => String(h).replace(/^#/, '')) : it.hashtags,
  });
}

// ---------- monthly plan ----------
// Occasions depend on the brand's market (GCC, Morocco, …): see lib/occasions.js
function occasions(year, month, market = '') {
  return require('./occasions').forMonth(year, month, market);
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    strategy: { type: 'string', description: '2-3 sentences: the month strategy and content pillars' },
    pillars: { type: 'array', items: { type: 'string' } },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          platform: { type: 'string' },
          type: { type: 'string', description: 'content type id' },
          pillar: { type: 'string' },
          idea: { type: 'string', description: 'the concrete idea in one or two sentences' },
          occasion: { type: 'string', description: 'occasion name if tied to one, else empty' },
        },
        required: ['date', 'platform', 'type', 'idea'],
      },
    },
  },
  required: ['strategy', 'days'],
};

async function makePlan(brandId, body) {
  const b = await brands.get(brandId);
  const now = new Date();
  const [year, month] = String(body.month || '').match(/^\d{4}-\d{2}$/) ? body.month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const perWeek = Math.min(14, Math.max(1, Number(body.perWeek) || 4));
  const platforms = (body.platforms || []).filter((p) => PLATFORMS[p]).slice(0, 5);
  if (!platforms.length) throw err(400, 'اختر منصة واحدة على الأقل');
  const dialect = pickKey(DIALECTS, body.dialect, 'msa');
  const goal = pickKey(GOALS, body.goal, 'engagement');
  const days = new Date(year, month, 0).getDate();
  const occ = occasions(year, month, b.fields?.market?.value || '');
  const total = Math.round((perWeek * days) / 7);
  const prompt = `Build a content calendar for ${year}-${String(month).padStart(2, '0')} (${days} days) with about ${total} posts (${perWeek} per week), spread evenly, never two posts on the same day for the same platform.

=== BRAND BRAIN ===
${brandContext(b)}

Platforms (use these ids): ${platforms.map((p) => `${p} = ${PLATFORMS[p]}`).join(', ')}
Content type ids: ${Object.keys(TYPES).join(', ')}
Main goal: ${GOALS[goal]}
Write strategy, pillars and ideas in: ${DIALECTS[dialect]}
Known occasions this month: ${occ.map((o) => `${o.date} ${o.name}`).join('; ') || 'none'}.
Also consider religious/seasonal moments relevant to the brand's market in this month only if you are sure of their dates; otherwise skip them.
Use 3-5 content pillars and vary the content types.`;
  const out = await ai.json(prompt, PLAN_SCHEMA, { kind: 'plan', brand: brandId, override: pickAI(body.ai) });
  const j = out.json;
  const plan = {
    id: `${year}-${String(month).padStart(2, '0')}`,
    createdAt: new Date().toISOString(),
    params: { perWeek, platforms, dialect, goal },
    strategy: String(j.strategy || ''),
    pillars: (j.pillars || []).map(String).slice(0, 6),
    occasions: occ,
    model: `${out.provider} · ${out.model}`,
    days: (j.days || [])
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
      .map((d) => ({ id: randomId(4), date: d.date, platform: PLATFORMS[d.platform] ? d.platform : platforms[0], type: TYPES[d.type] ? d.type : 'post', pillar: String(d.pillar || ''), idea: String(d.idea || ''), occasion: String(d.occasion || '') }))
      .sort((a, b2) => a.date.localeCompare(b2.date)),
  };
  await store.writeJSON(`plans/${brandId}/${plan.id}.json`, plan);
  await store.update(`plans/${brandId}/index.json`, [], (l) => [plan.id, ...l.filter((x) => x !== plan.id)].slice(0, 24));
  return plan;
}

async function getPlan(brandId, month) {
  const idx = await store.readJSON(`plans/${brandId}/index.json`, []);
  const id = month || idx[0];
  const plan = id ? await store.readJSON(`plans/${brandId}/${id}.json`, null) : null;
  return { months: idx, plan };
}

// ---------- image studio ----------
async function refsFor(b, use) {
  const refs = [];
  if (use?.logo && b.logo?.url) {
    const f = await loadUrl(b.logo.url).catch(() => null);
    if (f && f.mime !== 'image/svg+xml') refs.push(f);
  }
  for (const u of (use?.urls || []).slice(0, 2)) {
    const f = await loadUrl(u).catch(() => null);
    if (f) refs.push(f);
  }
  return refs;
}

async function loadUrl(url) {
  const m = String(url).match(/^\/api\/file\/([a-f0-9]+)$/);
  if (m) {
    const f = await store.readFile(m[1]);
    return f && { mime: f.contentType, b64: f.buffer.toString('base64') };
  }
  if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return { mime: res.headers.get('content-type') || 'image/png', b64: Buffer.from(await res.arrayBuffer()).toString('base64') };
}

const STYLES = {
  none: '',
  photo: 'professional commercial product photography, natural soft light, shallow depth of field, high detail',
  studio: 'clean studio shot on seamless background, softbox lighting, premium advertising look',
  lifestyle: 'authentic lifestyle scene, real people in a Moroccan/Arab everyday setting, warm natural light',
  flat: 'modern flat illustration, bold shapes, limited palette',
  '3d': 'soft 3D render, clay materials, playful lighting',
  minimal: 'minimal composition, generous negative space, editorial',
};

async function makeImage(brandId, body) {
  const b = await brands.get(brandId);
  const base = String(body.prompt || '').trim();
  if (!base) throw err(400, 'اكتب وصف الصورة');
  const aspect = ['1:1', '4:5', '9:16', '16:9', '3:4', '4:3'].includes(body.aspect) ? body.aspect : '1:1';
  const style = STYLES[body.style] ?? '';
  const colors = (b.visual?.colors || []).join(', ');
  // A product image must show THE product: its photo is sent as the first reference.
  const stage = Boolean(body.stage);
  let productId = stage ? null : body.productId;
  if (!productId && body.from?.batch) productId = (await getBatch(brandId, body.from.batch).catch(() => null))?.params?.productId;
  const product = productId ? (b.products || []).find((p) => p.id === productId) : null;
  if (product && product.kind !== 'service' && !product.photo) throw err(412, `أضف صورة للمنتج «${product.name}» في عقل البراند ← المنتجات، حتى يولّد الذكاء الاصطناعي صوراً لنفس المنتج بالضبط.`);
  const productRef = product?.photo ? await loadUrl(product.photo).catch(() => null) : null;
  if (product?.photo && !productRef) throw err(400, `تعذّر قراءة صورة المنتج «${product.name}». ارفعها مجدداً.`);
  const refs = [...(productRef ? [productRef] : []), ...(await refsFor(b, { logo: body.useLogo, urls: body.refs }))].slice(0, 3);
  // Short ideas are expanded by the text model into an art-directed prompt (subject, setting, light, lens, mood).
  let directed = base;
  if (body.enhance !== false && base.length < 260) directed = (await enhanceText(brandId, base, 'image').catch(() => null)) || base;
  // Backgrounds for designs: no text at all, clean space where the headline will go.
  const arch = PD.ARCH[body.arch];
  const zone = { corner: 'one top corner', top: 'the top third', bottom: 'the bottom third', center: 'the centre', side: 'one side' }[body.space];
  const away = { corner: 'the opposite lower part', top: 'the lower half', bottom: 'the upper half', center: 'around the edges', side: 'the other side' }[body.space];
  const lay = PD.LAYOUTS[body.layout];
  const pz = PD.PRODUCT_ZONES[body.layout];
  const stageTxt = stage && pz ? `EMPTY PRODUCT STAGE: do NOT show any product, bottle, tube, jar, box or packaging anywhere (the real product photo is added later). Prepare its place: an empty ${body.surface || 'podium / plinth / surface'} centred at about ${Math.round((pz[0] + pz[1]) * 50)}% from the left, its top surface at about ${Math.round(pz[3] * 100 - 3)}% of the height, with free empty space above it up to ${Math.round(pz[2] * 100)}% of the height. Text will go over ${lay.text}: keep that area plain and empty. Props and decorations stay outside both areas.` : '';
  const space = stageTxt || (lay ? `COMPOSITION (layout ${body.layout}): text will be placed over ${lay.text}; keep that area as plain, soft, EMPTY background (no product, face, hands, props or texture there). The product: ${lay.product}, fully visible, label facing camera, never extending into the text area.` : zone ? `COMPOSITION: text will be placed over ${zone}. Keep ${zone} as plain, soft, empty background (no product, no face, no hands, no props, no texture detail there). Place the product / main subject fully in ${away}, smaller if needed (max ~45% of the frame), never cut by the text area.` : '');
  const prompt = [
    directed,
    arch && `Art direction (${arch.en}): ${arch.image} ${PD.IMAGE_RULES}`,
    space,
    product && `The FIRST reference image is the real product "${product.name}"${product.description ? ` (${product.description.slice(0, 200)})` : ''}. Show exactly this product: same shape, colours, materials, label and details. Do not redesign it, do not invent another product, do not add other products.`,
    style && `Style: ${style}.`,
    b.visual?.guide?.imageStyle && `Brand visual guidelines: ${b.visual.guide.imageStyle}${(b.visual.guide.donts || []).length ? ` Avoid: ${b.visual.guide.donts.slice(0, 6).join('; ')}.` : ''}`,
    body.useColors && colors && `Use the brand color palette (${colors}) in the scene: props, clothing, background and accents. Never write colour codes, hex values or palette names as text in the image.`,
    refs.length && body.useLogo && 'Place the provided brand logo naturally and legibly, unchanged.',
    body.text ? `Include this exact text, spelled correctly: "${String(body.text).slice(0, 120)}".` : 'Absolutely no text, letters, numbers, logos or watermarks anywhere in the image (the design text is added later).',
  ].filter(Boolean).join(' ');
  const out = await ai.image({ prompt, aspect, refs, strictRefs: Boolean(productRef), quality: body.quality === 'high' ? 'high' : body.quality === 'low' ? 'low' : 'medium', brand: brandId, override: pickAI(body.ai) });
  const ext = out.mime.includes('jpeg') ? 'jpg' : out.mime.includes('webp') ? 'webp' : 'png';
  const id = `${Date.now().toString(36)}${randomId(3)}`;
  const saved = await store.saveFile(`images/${brandId}/${id}.${ext}`, out.buffer, out.mime);
  const item = { id, url: saved.url, prompt: base, directed: directed !== base ? directed : undefined, aspect, style: body.style || 'none', productId: product?.id || null, provider: out.provider, model: out.model, ms: out.ms, createdAt: new Date().toISOString(), from: body.from || null };
  if (out.fallback) item.fallback = out.fallback;
  if (stage) item.stage = true;
  else if (body.locate) item.subject = await locate(out, product, brandId);
  await store.pushItem(`images:${brandId}`, item, 500);
  return item;
}

// ---------- FULL POST: one image with scene + real product + text + logo (Nano Banana style), built from the skill ----------
const normAr = (t) => String(t || '').replace(/[ً-ْـ‏‎]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}%]+/gu, '').toLowerCase();
async function fullPost(brandId, body = {}) {
  const b = await brands.get(brandId);
  const aspect = ['1:1', '4:5', '9:16', '16:9'].includes(body.aspect) ? body.aspect : '4:5';
  const sl = body.slide || {};
  const headline = String(sl.headline || '').trim().slice(0, 90);
  if (!headline) throw err(400, 'اكتب العنوان أولاً (أو اضغط «اكتبها لي»)');
  const product = (b.products || []).find((p) => p.id === body.productId) || null;
  if (product && product.kind !== 'service' && !product.photo) throw err(412, `أضف صورة للمنتج «${product.name}» في عقل البراند ← المنتجات أولاً.`);
  // product reference: the background-removed cutout when the browser made one, else the original photo
  let productRef = null;
  if (product) {
    const cutUrl = typeof body.cutoutUrl === 'string' && /^\/api\/file\/|^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(body.cutoutUrl) ? body.cutoutUrl : '';
    productRef = (cutUrl && await loadUrl(cutUrl).catch(() => null)) || (product.photo && await loadUrl(product.photo).catch(() => null));
    if (!productRef) throw err(400, `تعذّر قراءة صورة المنتج «${product.name}». ارفعها مجدداً.`);
  }
  const logoRef = body.useLogo !== false && b.logo?.url ? await loadUrl(b.logo.url).catch(() => null) : null;
  const refs = [productRef, logoRef].filter(Boolean);
  const arch = PD.ARCH[body.arch] || PD.ARCH[PD.autoStyle(b)];
  const code = PD.LAYOUTS[body.layout] ? body.layout : aspect === '9:16' ? 'L7' : (arch.layouts || ['L1'])[0];
  const lay = PD.LAYOUTS[code];
  const pz = PD.PRODUCT_ZONES[code];
  const pct = (v) => `${Math.round(v * 100)}%`;
  const colors = (b.visual?.colors || []).slice(0, 4);
  const textCol = body.textColor || '#FFFFFF'; const accent = body.accent || colors[1] || '#E3262F'; const ctaCol = body.ctaColor || colors[0] || '#111111';
  const font = body.fontHint || 'a bold, clean, modern rounded Arabic sans-serif (like Thmanyah Sans / Cairo / IBM Plex Sans Arabic), perfectly joined letters';
  const scene = String(body.prompt || sl.prompt || '').trim().slice(0, 900) || `${arch.concept}`;
  const lines = [
    `Design a FINISHED, publish-ready Instagram ad post (${aspect}), as a professional art director would: one cohesive image where the scene, the product and the typography belong together.`,
    `STYLE: ${arch.en}. ${arch.image} ${PD.IMAGE_RULES}${colors.length ? ` Brand colour palette: ${colors.join(', ')} (use in the set, props and type; never write the codes).` : ''}`,
    `SCENE: ${scene}`,
    product ? `PRODUCT: reference image 1 is the real product "${product.name}". Reproduce EXACTLY this product (same shape, colours, cap, label text and logo) — do not redesign it, no other products. Ignore any background in that photo; integrate the product into the scene with matching light, reflections and a real contact shadow. Place it ${lay.product}: inside the area from ${pct(pz[0])} to ${pct(pz[1])} of the width and ${pct(pz[2])} to ${pct(pz[3])} of the height, fully visible, label facing camera and readable.` : '',
    `LAYOUT ${code}: the text block sits in ${lay.text}. GOLDEN RULE: no letter, box, button, logo or decoration may touch or overlap the product, its label, a face or a phone screen; keep a clear margin (about 5% of the width) around the product.`,
    `TYPOGRAPHY (render EXACTLY these Arabic words, right-to-left, correct spelling and letter joining, no extra words, no translation, nothing else written anywhere):`,
    `• Headline (largest, ${font}, colour ${textCol}): «${headline}»`,
    sl.highlight && headline.includes(sl.highlight) ? `• Inside the headline, the word «${sl.highlight}» sits in a solid rounded rectangle of colour ${accent} with high-contrast text — the ONLY highlighted word.` : '',
    sl.sub ? `• Support line under the headline (small, regular weight, same colour): «${String(sl.sub).slice(0, 110)}»` : '',
    sl.cta ? `• Call-to-action pill button under the text (background ${ctaCol}, white bold text): «${String(sl.cta).slice(0, 30)}»` : '',
    body.footer ? `• Small footer text at the bottom edge: «${String(body.footer).slice(0, 40)}»` : '',
    logoRef ? `LOGO: reference image ${product ? 2 : 1} is the brand logo. Place it small (about 12% of the width) in the top ${code === 'L4' ? 'centre' : 'left'} corner, unchanged, on its own (no background box), never on the product.` : 'No logo.',
    `Text contrast at least 4.5:1 against what is behind it (use a soft shadow or calm area, never a box over the product). Clear hierarchy: product → headline → CTA. Safe margins ${aspect === '9:16' ? '(nothing in the top 13% and bottom 18%)' : '(at least 7% from every edge)'}. No watermark, no price unless written above, no lorem ipsum, no fake text.`,
  ].filter(Boolean).join('\n');
  const out = await ai.image({ prompt: lines, aspect, refs, strictRefs: Boolean(productRef), quality: body.quality === 'low' ? 'low' : 'high', brand: brandId, override: pickAI(body.ai) });
  const ext = out.mime.includes('jpeg') ? 'jpg' : out.mime.includes('webp') ? 'webp' : 'png';
  const id = `${Date.now().toString(36)}${randomId(3)}`;
  const saved = await store.saveFile(`images/${brandId}/${id}.${ext}`, out.buffer, out.mime);
  // check that the model wrote the text correctly (best effort, Gemini vision)
  let textCheck = null;
  try {
    const r = await Promise.race([
      ai.geminiFileJSON('Read ALL the text written in this image exactly as written (Arabic and Latin), each separate text block as one item, top to bottom. Also say if any text overlaps the product.', { type: 'object', properties: { texts: { type: 'array', items: { type: 'string' } }, textOnProduct: { type: 'boolean' } }, required: ['texts'] }, { mime: out.mime, b64: out.buffer.toString('base64') }, { brand: brandId, kind: 'text-check' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000)),
    ]);
    const all = normAr((r.json.texts || []).join(' '));
    const want = [['العنوان', headline], ['الكلمة المميّزة', sl.highlight], ['السطر الثانوي', sl.sub], ['الزر', sl.cta]].filter(([, v]) => v);
    const missing = want.filter(([, v]) => !all.includes(normAr(v))).map(([k]) => k);
    textCheck = { ok: !missing.length && !r.json.textOnProduct, missing, onProduct: Boolean(r.json.textOnProduct), read: (r.json.texts || []).slice(0, 8).map((x) => String(x).slice(0, 120)) };
  } catch { /* no Gemini: no automatic check */ }
  const item = { id, url: saved.url, prompt: headline, directed: lines, aspect, style: 'full', full: true, layout: code, productId: product?.id || null, provider: out.provider, model: out.model, ms: out.ms, createdAt: new Date().toISOString(), from: body.from || null, textCheck };
  if (out.fallback) item.fallback = out.fallback;
  await store.pushItem(`images:${brandId}`, item, 500);
  return item;
}

// Where is the product (and any face) in a generated scene? Returns fractions {x0,y0,x1,y1} or null.
async function locate(out, product, brandId) {
  try {
    const box = { type: 'object', properties: { x0: { type: 'number' }, y0: { type: 'number' }, x1: { type: 'number' }, y1: { type: 'number' } }, required: ['x0', 'y0', 'x1', 'y1'] };
    const r = await Promise.race([
      ai.geminiFileJSON(`Find ${product ? `the product "${product.name}" (the packaging)` : 'the main product or object'} and any human face in this image. Return tight bounding boxes as fractions of the image width/height (0-1, x0<x1, y0<y1). If there is no face, return an empty faces list.`, { type: 'object', properties: { product: box, faces: { type: 'array', items: box } }, required: ['product'] }, { mime: out.mime, b64: out.buffer.toString('base64') }, { brand: brandId, kind: 'locate' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000)),
    ]);
    const ok = (b) => b && [b.x0, b.y0, b.x1, b.y1].every((v) => Number.isFinite(v) && v >= -0.05 && v <= 1.05) && b.x1 > b.x0 && b.y1 > b.y0;
    const boxes = [r.json.product, ...(r.json.faces || [])].filter(ok);
    if (!boxes.length) return null;
    const u = boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
    return (u.x1 - u.x0) * (u.y1 - u.y0) < 0.9 ? u : null;
  } catch {
    return null;
  }
}

// Edit an existing image with an instruction: the image is sent as reference, a new version is saved.
async function editImage(brandId, id, body) {
  const rows = await store.listItems(`images:${brandId}`, 0, 500);
  const src = rows.find((x) => x.id === id);
  if (!src) throw err(404, 'الصورة غير موجودة');
  const instruction = String(body.instruction || '').trim().slice(0, 1500);
  if (!instruction) throw err(400, 'اكتب التعديل المطلوب');
  const ref = await loadUrl(src.url);
  if (!ref) throw err(400, 'تعذّر قراءة الصورة الأصلية');
  const prompt = `Edit the provided image. Apply ONLY this change: ${instruction}. Keep everything else identical: same composition, people, product, colours, lighting and framing. Do not add any text or watermark unless the change asks for it.`;
  const out = await ai.image({ prompt, aspect: src.aspect, refs: [ref], quality: 'medium', brand: brandId, override: pickAI(body.ai) });
  const ext = out.mime.includes('jpeg') ? 'jpg' : out.mime.includes('webp') ? 'webp' : 'png';
  const nid = `${Date.now().toString(36)}${randomId(3)}`;
  const saved = await store.saveFile(`images/${brandId}/${nid}.${ext}`, out.buffer, out.mime);
  const root = src.root || src.id;
  const version = rows.filter((x) => (x.root || x.id) === root).reduce((m, x) => Math.max(m, x.version || 1), 1) + 1;
  const item = { id: nid, url: saved.url, prompt: src.prompt, edit: instruction, aspect: src.aspect, style: src.style, provider: out.provider, model: out.model, ms: out.ms, createdAt: new Date().toISOString(), root, parent: src.id, version };
  if (out.fallback) item.fallback = out.fallback;
  await store.pushItem(`images:${brandId}`, item, 500);
  return item;
}

// ---------- prompt enhancer (any field: image, video, content idea, voice, research) ----------
const ENHANCE = {
  image: 'Rewrite it as ONE rich English prompt for an AI image model (60-110 words): subject, setting, composition and camera angle, lens, lighting, colours, mood, materials, style (premium commercial photography unless stated). Respect the brand. No text in the image.',
  video: 'Rewrite it as ONE English prompt for an AI video model (60-110 words): scene, subject and action beat by beat, camera movement, lens, lighting, mood, pacing, sound/ambience. Keep it filmable in under 10 seconds.',
  content: 'Rewrite it as a clear brief in the same language as the input (3-6 lines): angle, audience insight, key message, proof/benefit, emotion, CTA. Do not write the post itself.',
  voice: 'Rewrite it as a natural voice-over script in the same language/dialect as the input, short sentences, easy to say aloud, with a strong first line and a clear call to action.',
  research: 'Rewrite it as a precise research question/instruction in the same language as the input.',
};
async function enhanceText(brandId, text, kind = 'content') {
  const t = String(text || '').trim().slice(0, 3000);
  if (!t) throw err(400, 'اكتب فكرة أولاً');
  const b = await brands.get(brandId);
  const out = await ai.text({
    system: 'You improve prompts for a marketing platform. Return ONLY the improved text, nothing else (no quotes, no preface).',
    prompt: `Brand: ${b.name}. ${[b.fields?.industry?.value, b.fields?.audience?.value, b.fields?.tone?.value].filter(Boolean).join(' · ')}${(b.visual?.colors || []).length ? ` · palette: ${b.visual.colors.join(', ')} (never write hex codes in the result)` : ''}${b.visual?.guide?.imageStyle && ['image', 'video'].includes(kind) ? `\nVisual guide: ${b.visual.guide.imageStyle}` : ''}
Input: ${t}
${ENHANCE[kind] || ENHANCE.content}`,
    kind: 'enhance', brand: brandId,
  });
  return String(out.text || '').replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 3000);
}

// ---------- design copy: on-image texts (headline / highlight / sub / CTA) + caption + background prompts ----------
const COPY_SLIDE = { type: 'object', properties: {
  headline: { type: 'string', description: '4-8 words' },
  highlight: { type: 'string', description: 'ONE word or short phrase copied EXACTLY from the headline, shown in a contrast box' },
  sub: { type: 'string' }, cta: { type: 'string' },
  prompt: { type: 'string', description: 'English art-directed BACKGROUND prompt: [subject + action], [product placement], [set/props in brand colour], [lighting], [camera/lens], [mood], [colour grade], leave clean space for text. No text in the image.' },
  caption: { type: 'string', description: 'post caption (not on the image): hook, 2-3 benefit lines, CTA; emoji sparingly' },
  hashtags: { type: 'array', items: { type: 'string' }, description: '5-10 hashtags without #' },
}, required: ['headline', 'highlight', 'prompt'] };
async function designCopy(brandId, body = {}) {
  const b = await brands.get(brandId);
  const product = (b.products || []).find((p) => p.id === body.productId) || null;
  const n = Math.min(10, Math.max(1, Number(body.slides) || 1));
  const dialect = DIALECTS[body.dialect] || DIALECTS[b.fields?.languages?.value?.includes('دارج') ? 'darija' : 'msa'] || DIALECTS.msa;
  const arch = PD.ARCH[body.style] || PD.ARCH[PD.autoStyle(b)];
  const out = await ai.json(`Write the on-image text for ${n > 1 ? `a ${n}-slide carousel (slide 1 = scroll-stopping cover, last = CTA)` : 'one social media design'}.
=== BRAND BRAIN ===
${brandContext(b, product)}
Idea: ${String(body.idea || 'propose the strongest angle for this brand').slice(0, 1200)}
Style archetype: ${arch.en}. ${arch.concept} Text rule: ${arch.copy}
${PD.RULES}
Language/dialect: ${dialect}. Headline 4-8 words, sub max 14 words, CTA max 4 words.`, {
    type: 'object', properties: { slides: { type: 'array', items: COPY_SLIDE } }, required: ['slides'],
  }, { kind: 'design-copy', brand: brandId, override: pickAI(body.ai) });
  return { style: Object.keys(PD.ARCH).find((k) => PD.ARCH[k] === arch), slides: (out.json.slides || []).slice(0, n).map((x) => {
    const sl = { headline: String(x.headline || '').slice(0, 120), highlight: String(x.highlight || '').slice(0, 40), sub: String(x.sub || '').slice(0, 200), cta: String(x.cta || '').slice(0, 60), prompt: String(x.prompt || '').slice(0, 1500), caption: String(x.caption || '').slice(0, 2200), hashtags: (x.hashtags || []).slice(0, 10).map((h) => String(h).replace(/^#/, '').slice(0, 40)) };
    sl.qa = PD.checkPost(sl);
    return sl;
  }) };
}

// ---------- campaigns: concept + series plan + grid rhythm (Social Media Post Designer workflow) ----------
const CAMP_GOALS = { launch: 'product launch', awareness: 'brand awareness', sale: 'sale / offer', education: 'education' };
async function makeCampaign(brandId, body = {}) {
  const b = await brands.get(brandId);
  const product = (b.products || []).find((p) => p.id === body.productId) || null;
  if (product && product.kind !== 'service' && !product.photo) throw err(412, `أضف صورة للمنتج «${product.name}» في عقل البراند ← المنتجات أولاً، حتى تظهر نفس العبوة في كل منشورات الحملة.`);
  const count = [6, 9, 12].includes(Number(body.count)) ? Number(body.count) : 9;
  const style = PD.ARCH[body.style] ? body.style : PD.autoStyle(b);
  const arch = PD.ARCH[style];
  const aspect = ['4:5', '1:1', '9:16'].includes(body.aspect) ? body.aspect : '4:5';
  const dialect = DIALECTS[body.dialect] || DIALECTS[b.fields?.languages?.value?.includes('دارج') ? 'darija' : 'msa'] || DIALECTS.msa;
  const goal = CAMP_GOALS[body.goal] || CAMP_GOALS.awareness;
  const out = await ai.json(`Plan a ${count}-post Instagram campaign grid (3 columns) for this brand, then write every post.
=== BRAND BRAIN ===
${brandContext(b, product)}
Goal: ${goal}. Idea from the owner: ${String(body.idea || 'propose the strongest campaign idea').slice(0, 1200)}
Style archetype: ${arch.en}. ${arch.concept}
Palette rule: ${arch.palette}
Text rule: ${arch.copy}
${PD.RULES}
Series rules: write the concept first (the "world", the colour, the mood, the recurring device). Rotate content pillars (hero, benefit, howto, education, proof, offer). Alternate post types (model / product / texture / text) so neighbours differ. Mark exactly one post hero=true (the strongest launch post). At most one break=true post (a deliberate different-colour scene). Mark dark=true for darker/contrasting posts and keep them few. Each scene/prop must link to its headline.
Layouts (choose one per post; preferred for this style: ${(arch.layouts || []).join(', ')}; use at most 3 different layouts across the grid${aspect === '9:16' ? '; stories use L7' : ''}):
${Object.entries(PD.LAYOUTS).map(([k, v]) => `${k}: text in ${v.text}; product ${v.product}`).join('\n')}
Every "prompt" (English) follows: [subject + action], [product placement matching the post's layout], [set/props in brand colour], [lighting], [camera/lens], [mood], [colour grade], ${aspect}, leave clean empty space at [the layout's text zone], product not overlapping that space. No text in the image.${product ? ` The product is "${product.name}": it appears as the real packshot (label facing camera) in product/texture posts.` : ''}
Language/dialect for headlines and captions: ${dialect}.`, {
    type: 'object',
    properties: {
      concept: { type: 'object', properties: { title: { type: 'string', description: 'campaign name, 2-4 words, in the content language' }, world: { type: 'string' }, color: { type: 'string', description: 'hero colour name (no hex)' }, mood: { type: 'string' }, device: { type: 'string', description: 'the recurring visual device' } }, required: ['title', 'world'] },
      posts: { type: 'array', items: { type: 'object', properties: {
        pillar: { type: 'string', enum: Object.keys(PD.PILLARS) }, type: { type: 'string', enum: Object.keys(PD.TYPES) },
        visual: { type: 'string', description: 'the visual idea in one sentence, in the content language' },
        ...COPY_SLIDE.properties,
        layout: { type: 'string', enum: Object.keys(PD.LAYOUTS), description: 'text-placement layout code' },
        hero: { type: 'boolean' }, break: { type: 'boolean' }, dark: { type: 'boolean' },
      }, required: ['type', 'visual', 'headline', 'highlight', 'prompt', 'caption'] } },
    },
    required: ['concept', 'posts'],
  }, { kind: 'campaign', brand: brandId, override: pickAI(body.ai) });
  const posts = (out.json.posts || []).slice(0, count).map((x) => ({
    id: randomId(4), pillar: PD.PILLARS[x.pillar] ? x.pillar : 'hero', type: PD.TYPES[x.type] ? x.type : 'product',
    visual: String(x.visual || '').slice(0, 400), headline: String(x.headline || '').slice(0, 120), highlight: String(x.highlight || '').slice(0, 40),
    sub: String(x.sub || '').slice(0, 200), cta: String(x.cta || '').slice(0, 60), prompt: String(x.prompt || '').slice(0, 1500),
    caption: String(x.caption || '').slice(0, 2200), hashtags: (x.hashtags || []).slice(0, 10).map((h) => String(h).replace(/^#/, '').slice(0, 40)),
    layout: aspect === '9:16' ? PD.STORY_LAYOUT : PD.LAYOUTS[x.layout] && x.layout !== 'L7' ? x.layout : (arch.layouts || ['L1'])[0],
    hero: Boolean(x.hero), break: Boolean(x.break), dark: Boolean(x.dark), bg: '',
  }));
  if (!posts.length) throw err(502, 'لم يرجع الذكاء الاصطناعي خطة. أعد المحاولة.');
  if (!posts.some((p) => p.hero)) posts[0].hero = true;
  posts.forEach((p) => { p.qa = PD.checkPost(p); });
  const gridNotes = PD.rhythm(posts);
  const c = out.json.concept || {};
  const item = {
    id: `${Date.now().toString(36)}${randomId(3)}`, createdAt: new Date().toISOString(),
    goal: body.goal || 'awareness', style, aspect, productId: product?.id || null, idea: String(body.idea || '').slice(0, 1200),
    concept: { title: String(c.title || arch.name).slice(0, 80), world: String(c.world || '').slice(0, 600), color: String(c.color || '').slice(0, 60), mood: String(c.mood || '').slice(0, 200), device: String(c.device || '').slice(0, 300) },
    posts, gridNotes, design: null,
  };
  await store.pushItem(`campaigns:${brandId}`, item, 60);
  return item;
}
async function listCampaigns(brandId) { return store.listItems(`campaigns:${brandId}`, 0, 60); }
async function saveCampaign(brandId, cid, body = {}) {
  const rows = await listCampaigns(brandId);
  const c = rows.find((x) => x.id === cid);
  if (!c) throw err(404, 'الحملة غير موجودة');
  if (Array.isArray(body.posts)) {
    const keep = ['headline', 'highlight', 'sub', 'cta', 'prompt', 'caption', 'bg', 'visual', 'bgLayout'];
    const byId = new Map(c.posts.map((p) => [p.id, p]));
    c.posts = body.posts.filter((p) => byId.has(p.id)).map((p) => { const o = byId.get(p.id); keep.forEach((k) => { if (typeof p[k] === 'string') o[k] = p[k].slice(0, k === 'caption' ? 2200 : 1500); }); if (Array.isArray(p.hashtags)) o.hashtags = p.hashtags.slice(0, 10).map(String); if (p.layout === 'auto' || PD.LAYOUTS[p.layout]) o.layout = p.layout; if (typeof p.composite === 'boolean') o.composite = p.composite; if (typeof p.full === 'boolean') o.full = p.full; if (p.textCheck === null || (p.textCheck && typeof p.textCheck === 'object')) o.textCheck = p.textCheck ? { ok: Boolean(p.textCheck.ok), missing: (p.textCheck.missing || []).slice(0, 4).map(String), onProduct: Boolean(p.textCheck.onProduct), read: (p.textCheck.read || []).slice(0, 8).map((x) => String(x).slice(0, 120)) } : null; if (typeof p.fullSig === 'string') o.fullSig = p.fullSig.slice(0, 400); o.pz = p.pz && typeof p.pz === 'object' && ['x0', 'y0', 'x1', 'y1'].every((k) => Number.isFinite(p.pz[k])) ? { x0: p.pz.x0, y0: p.pz.y0, x1: p.pz.x1, y1: p.pz.y1 } : p.pz === null ? null : o.pz || null; if (typeof p.saved === 'string') o.saved = p.saved; o.qa = PD.checkPost(o); return o; });
    c.posts.forEach((p, i) => { p.n = i + 1; });
  }
  if (body.design && typeof body.design === 'object') c.design = JSON.parse(JSON.stringify(body.design).slice(0, 6000));
  if (typeof body.title === 'string') c.concept.title = body.title.slice(0, 80);
  c.updatedAt = new Date().toISOString();
  await store.replaceItems(`campaigns:${brandId}`, rows);
  return c;
}
async function deleteCampaign(brandId, cid) {
  const rows = await listCampaigns(brandId);
  await store.replaceItems(`campaigns:${brandId}`, rows.filter((x) => x.id !== cid));
}

// ---------- voice-over script writer ----------
async function voiceScript(brandId, body = {}) {
  const b = await brands.get(brandId);
  const product = (b.products || []).find((p) => p.id === body.productId) || null;
  const secs = Math.min(120, Math.max(10, Number(body.seconds) || 30));
  const goal = { ad: 'a persuasive ad', intro: 'an introduction of the brand/product', offer: 'a limited-time offer announcement', explainer: 'a short explainer of how it works / its benefits', story: 'a mini story (problem → discovery → result)', testimonial: 'a customer-testimonial style monologue' }[body.goal] || 'a persuasive ad';
  const dialect = DIALECTS[body.dialect] || DIALECTS.msa;
  const out = await ai.json(`Write ${goal} voice-over script for ${product ? `the ${product.kind === 'service' ? 'service' : 'product'} "${product.name}"${product.price ? ` (price: ${product.price})` : ''}${product.description ? ` — ${product.description}` : ''}` : 'the brand'}.
=== BRAND BRAIN ===
${brandContext(b, product)}
Length: about ${secs} seconds when read aloud (≈ ${Math.round(secs * 2.3)} words). Language/dialect: ${dialect}. Tone: ${String(body.tone || b.fields?.tone?.value || 'warm and confident').slice(0, 200)}.
${body.cta ? `Call to action: ${String(body.cta).slice(0, 200)}` : ''}${body.notes ? `\nOwner notes: ${String(body.notes).slice(0, 800)}` : ''}
Rules: short spoken sentences, a hook in the first 3 seconds, one clear benefit, natural pauses (use "…"), end with the call to action. Never invent prices, discounts or claims.`, {
    type: 'object',
    properties: { script: { type: 'string', description: 'the text to be read aloud, nothing else' }, title: { type: 'string' }, voiceHint: { type: 'string', description: 'the ideal voice in Arabic: gender, age, energy, accent' } },
    required: ['script'],
  }, { kind: 'voice-script', brand: brandId, override: pickAI(body.ai) });
  return { script: String(out.json.script || '').slice(0, 5000), title: String(out.json.title || ''), voiceHint: String(out.json.voiceHint || ''), seconds: secs };
}

// A finished design (rendered in the browser with real fonts + logo) is saved to the gallery.
async function saveDesign(brandId, body) {
  const url = String(body.url || '');
  if (!/^(https:\/\/[^/]+\.blob\.vercel-storage\.com\/|\/api\/file\/[a-f0-9]+$)/.test(url)) throw err(400, 'ملف التصميم غير صالح');
  const id = `${Date.now().toString(36)}${randomId(3)}`;
  const d = body.design && typeof body.design === 'object' ? JSON.parse(JSON.stringify(body.design).slice(0, 20000)) : null;
  const item = { id, url, kind: 'design', prompt: String(body.prompt || '').slice(0, 2000), aspect: String(body.aspect || '1:1'), design: d, productId: body.productId || null, createdAt: new Date().toISOString(), from: body.from || null, provider: 'design', model: d?.template || '' };
  await store.pushItem(`images:${brandId}`, item, 500);
  return item;
}

async function listImages(brandId, limit = 60) {
  return store.listItems(`images:${brandId}`, 0, limit);
}

async function deleteImage(brandId, id) {
  const rows = await store.listItems(`images:${brandId}`, 0, 500);
  const it = rows.find((x) => x.id === id);
  if (!it) return;
  await store.deleteFile(it.url).catch(() => {});
  await store.replaceItems(`images:${brandId}`, rows.filter((x) => x.id !== id));
}

module.exports = {
  LAYOUTS: PD.LAYOUTS,
  fullPost,
  enhanceText, saveDesign, voiceScript, designCopy, makeCampaign, listCampaigns, saveCampaign, deleteCampaign, ARCH: PD.ARCH,
  pickAI, OPTIONS, STYLES, generate, listBatches, getBatch, patchItem, deleteBatch, rewriteItem, makePlan, getPlan, occasions, makeImage, editImage, listImages, deleteImage,
};
