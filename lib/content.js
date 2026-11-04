// Content generator (batches of ready posts), monthly content plan, image studio history.
const store = require('./store');
const brands = require('./brands');
const ai = require('./ai');
const { randomId } = require('./crypto');

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
    b.visual?.guide?.summary && `Visual identity: ${b.visual.guide.summary}`,
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
    slides: { type: 'array', items: { type: 'string' }, description: 'carousel slides text, or reel/UGC script scenes with timing; empty for simple posts' },
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
For carousel fill "slides" with 5-8 slide texts. For reels/UGC fill "slides" with scenes like "0-3s: …". Keep the "imagePrompt" in English.
Then act as a strict creative director: give every piece an honest "score" (1-10) and a short "why" comparing it with what competitors in this market usually post${b.fields?.competitors?.value ? ` (known competitors: ${b.fields.competitors.value})` : ''}. Do not give everything the same score.`;

  const out = await ai.json(prompt, BATCH_SCHEMA, { system, kind: 'content', brand: brandId, override: pickAI(body.ai) });
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
    params: { platforms, type, types, goal, dialect, framework, count, productId: product?.id || null, productName: product?.name || '', idea },
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
        if (['draft', 'approved', 'rejected'].includes(body.status)) it.status = body.status;
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
const FIXED_DAYS = [
  ['01-01', 'رأس السنة الميلادية'], ['01-14', 'رأس السنة الأمازيغية'], ['02-14', 'عيد الحب'], ['03-08', 'اليوم العالمي للمرأة'], ['03-20', 'اليوم العالمي للسعادة'],
  ['04-07', 'اليوم العالمي للصحة'], ['04-22', 'يوم الأرض'], ['05-01', 'عيد الشغل'], ['06-05', 'اليوم العالمي للبيئة'], ['07-30', 'عيد العرش (المغرب)'],
  ['08-12', 'اليوم العالمي للشباب'], ['08-20', 'ذكرى ثورة الملك والشعب (المغرب)'], ['09-27', 'اليوم العالمي للسياحة'], ['10-01', 'اليوم العالمي للقهوة'], ['10-16', 'اليوم العالمي للغذاء'],
  ['11-06', 'ذكرى المسيرة الخضراء (المغرب)'], ['11-18', 'عيد الاستقلال (المغرب)'], ['12-03', 'اليوم العالمي لذوي الإعاقة'], ['12-18', 'اليوم العالمي للغة العربية'], ['12-25', 'الكريسماس'],
];

function blackFriday(year) {
  const d = new Date(Date.UTC(year, 10, 30));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(5, 10);
}

function occasions(year, month) {
  const mm = String(month).padStart(2, '0');
  const list = FIXED_DAYS.filter(([d]) => d.startsWith(mm)).map(([d, n]) => ({ date: `${year}-${d}`, name: n }));
  if (month === 11) list.push({ date: `${year}-${blackFriday(year)}`, name: 'الجمعة السوداء (Black Friday)' });
  return list.sort((a, b) => a.date.localeCompare(b.date));
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
  const occ = occasions(year, month);
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
  const refs = await refsFor(b, { logo: body.useLogo, urls: body.refs });
  const prompt = [
    base,
    style && `Style: ${style}.`,
    b.visual?.guide?.imageStyle && `Brand visual guidelines: ${b.visual.guide.imageStyle}${(b.visual.guide.donts || []).length ? ` Avoid: ${b.visual.guide.donts.slice(0, 6).join('; ')}.` : ''}`,
    body.useColors && colors && `Use the brand color palette (${colors}) in the scene: props, clothing, background and accents. Never write colour codes, hex values or palette names as text in the image.`,
    refs.length && body.useLogo && 'Place the provided brand logo naturally and legibly, unchanged.',
    body.text ? `Include this exact text, spelled correctly: "${String(body.text).slice(0, 120)}".` : 'Do not add any text or watermark.',
  ].filter(Boolean).join(' ');
  const out = await ai.image({ prompt, aspect, refs, quality: body.quality === 'high' ? 'high' : body.quality === 'low' ? 'low' : 'medium', brand: brandId, override: pickAI(body.ai) });
  const ext = out.mime.includes('jpeg') ? 'jpg' : out.mime.includes('webp') ? 'webp' : 'png';
  const id = `${Date.now().toString(36)}${randomId(3)}`;
  const saved = await store.saveFile(`images/${brandId}/${id}.${ext}`, out.buffer, out.mime);
  const item = { id, url: saved.url, prompt: base, aspect, style: body.style || 'none', provider: out.provider, model: out.model, ms: out.ms, createdAt: new Date().toISOString(), from: body.from || null };
  if (out.fallback) item.fallback = out.fallback;
  await store.pushItem(`images:${brandId}`, item, 500);
  return item;
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
  pickAI, OPTIONS, STYLES, generate, listBatches, getBatch, patchItem, deleteBatch, rewriteItem, makePlan, getPlan, occasions, makeImage, editImage, listImages, deleteImage,
};
