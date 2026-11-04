// Brands (profiles in the portfolio) and their Brand Brain.
// Every brain field keeps its source: confirmed (typed by the user), extracted (read from
// the website or a file) or inferred (guessed by the AI) so nobody mistakes a guess for a fact.
const store = require('./store');
const ai = require('./ai');
const { randomId } = require('./crypto');

const FIELDS = [
  ['industry', 'المجال'],
  ['description', 'وصف قصير'],
  ['audience', 'الجمهور المستهدف'],
  ['market', 'السوق / البلد'],
  ['tone', 'نبرة الصوت'],
  ['languages', 'لغات المحتوى'],
  ['promise', 'الوعد / القيمة'],
  ['usp', 'ما يميّزنا'],
  ['cta', 'الدعوة المفضّلة للإجراء'],
  ['forbidden', 'ممنوعات'],
  ['competitors', 'المنافسون'],
];
const SOURCES = ['confirmed', 'extracted', 'inferred'];
const AVATAR = ['#5A3FFB', '#D946EF', '#FF9719', '#10B981', '#0EA5E9', '#F43F5E', '#111111'];

const docName = (id) => `brands/${id}.json`;
const err = (status, message) => Object.assign(new Error(message), { status });

async function index() {
  return store.readJSON('brands.json', []);
}

function readiness(b) {
  const filled = FIELDS.filter(([k]) => b.fields?.[k]?.value).length;
  const checks = [
    ['هوية البراند', filled >= 6, `${filled}/${FIELDS.length} حقول`],
    ['الشعار', Boolean(b.logo), b.logo ? 'مرفوع' : 'غير مرفوع'],
    ['الألوان', (b.visual?.colors || []).length >= 2, `${(b.visual?.colors || []).length} ألوان`],
    ['المنتجات', (b.products || []).length > 0, `${(b.products || []).length} منتجات`],
    ['الموافقة (بوابة 1)', Boolean(b.gate1?.approved), b.gate1?.approved ? 'معتمد' : 'بانتظار موافقتك'],
  ];
  const score = Math.round(((filled / FIELDS.length) * 40 + (b.logo ? 15 : 0) + ((b.visual?.colors || []).length >= 2 ? 10 : 0) + ((b.products || []).length ? 15 : 0) + (b.gate1?.approved ? 20 : 0)));
  return { score, checks };
}

function summary(b) {
  return {
    id: b.id,
    name: b.name,
    color: b.color,
    industry: b.fields?.industry?.value || '',
    website: b.website || '',
    hasLogo: Boolean(b.logo),
    approved: Boolean(b.gate1?.approved),
    score: readiness(b).score,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

async function get(id, { withUrls = true } = {}) {
  const b = await store.readJSON(docName(id), null, { fresh: true });
  if (!b) throw err(404, 'البراند غير موجود');
  return { ...b, readiness: readiness(b), fieldDefs: FIELDS };
}

async function saveDoc(b) {
  b.updatedAt = Date.now();
  const clean = structuredClone(b);
  delete clean.readiness;
  delete clean.fieldDefs;
  await store.writeJSON(docName(b.id), clean);
  await store.update('brands.json', [], (list) => {
    const s = summary(clean);
    const i = list.findIndex((x) => x.id === b.id);
    if (i >= 0) list[i] = s;
    else list.push(s);
    return list;
  });
  return clean;
}

async function create({ name, website }) {
  const n = String(name || '').trim();
  if (!n) throw err(400, 'اكتب اسم البراند');
  const list = await index();
  if (list.length >= 200) throw err(400, 'وصلت للحد الأقصى من البراندات (200)');
  const b = {
    id: randomId(5),
    name: n.slice(0, 80),
    website: String(website || '').trim().slice(0, 300),
    color: AVATAR[list.length % AVATAR.length],
    createdAt: Date.now(),
    fields: {},
    products: [],
    visual: { colors: [], font: 'Thmanyah Sans' },
    logo: null,
    gate1: { approved: false },
  };
  await saveDoc(b);
  return get(b.id);
}

async function patch(id, body) {
  const b = await get(id, { withUrls: false });
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) throw err(400, 'الاسم لا يمكن أن يكون فارغاً');
    b.name = n.slice(0, 80);
  }
  if (body.website !== undefined) b.website = String(body.website).trim().slice(0, 300);
  if (body.fields && typeof body.fields === 'object') {
    for (const [k, v] of Object.entries(body.fields)) {
      if (!FIELDS.some(([f]) => f === k)) continue;
      if (v === null || v?.value === '') {
        delete b.fields[k];
        continue;
      }
      const value = String(v.value ?? v).trim().slice(0, 1200);
      const source = SOURCES.includes(v.source) ? v.source : 'confirmed';
      b.fields[k] = { value, source, at: Date.now() };
    }
    // Any change to the brain after approval needs a new approval.
    if (b.gate1?.approved && !body.keepApproval) b.gate1 = { approved: false, reopenedAt: Date.now() };
  }
  if (Array.isArray(body.products)) {
    b.products = body.products.slice(0, 300).map((p) => ({
      id: p.id || randomId(4),
      name: String(p.name || '').slice(0, 120),
      price: String(p.price || '').slice(0, 40),
      description: String(p.description || '').slice(0, 600),
      kind: p.kind === 'service' ? 'service' : 'product',
      category: String(p.category || '').slice(0, 80),
      url: /^https?:\/\//.test(String(p.url || '')) ? String(p.url).slice(0, 300) : '',
      source: SOURCES.includes(p.source) ? p.source : 'confirmed',
      photo: /^(https:\/\/[^/]+\.blob\.vercel-storage\.com\/|\/api\/file\/[a-f0-9]+$)/.test(String(p.photo || '')) ? String(p.photo) : (b.products || []).find((o) => o.id === p.id)?.photo || '',
    })).filter((p) => p.name);
  }
  if (body.visual) {
    const colors = (body.visual.colors || []).map((c) => String(c).trim()).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8);
    b.visual = { ...b.visual, colors };
    if (body.visual.font) b.visual.font = String(body.visual.font).slice(0, 60);
    if (body.visual.fonts && typeof body.visual.fonts === 'object') b.visual.fonts = { heading: String(body.visual.fonts.heading || '').slice(0, 60), body: String(body.visual.fonts.body || '').slice(0, 60), latin: String(body.visual.fonts.latin || '').slice(0, 60) };
  }
  if (body.gate1 !== undefined) {
    b.gate1 = body.gate1 ? { approved: true, at: Date.now() } : { approved: false };
  }
  await saveDoc(b);
  return get(id);
}

async function remove(id) {
  const b = await store.readJSON(docName(id), null, { fresh: true });
  if (b?.logo?.url) await store.deleteFile(b.logo.url).catch(() => {});
  await store.removeJSON(docName(id));
  await store.removeJSON(`keys/${id}.json`);
  for (const l of [`audio:${id}`, `images:${id}`, `batches:${id}`]) await store.dropList(l).catch(() => {});
  await store.update('brands.json', [], (list) => list.filter((x) => x.id !== id));
}

// Product photo: used as the exact reference whenever an image is generated for this product.
async function productPhoto(id, pid, { dataUrl }) {
  const m = String(dataUrl || '').match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
  if (!m) throw err(400, 'ارفع صورة PNG أو JPG أو WEBP');
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 5 * 1024 * 1024) throw err(400, 'حجم الصورة أكبر من 5MB');
  const b = await get(id, { withUrls: false });
  const p = (b.products || []).find((x) => x.id === pid);
  if (!p) throw err(404, 'المنتج غير موجود');
  const saved = await store.saveFile(`brands/${id}/products/${pid}-${Date.now()}.${{ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[m[1]]}`, buf, m[1]);
  if (p.photo) await store.deleteFile(p.photo).catch(() => {});
  p.photo = saved.url;
  await saveDoc(b);
  return get(id);
}

async function uploadLogo(id, { dataUrl }) {
  const m = String(dataUrl || '').match(/^data:(image\/(png|jpeg|webp|svg\+xml));base64,(.+)$/);
  if (!m) throw err(400, 'ارفع صورة PNG أو JPG أو WEBP أو SVG');
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 3 * 1024 * 1024) throw err(400, 'حجم الشعار أكبر من 3MB');
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[m[1]];
  const b = await get(id, { withUrls: false });
  const saved = await store.saveFile(`brands/${id}/logo.${ext}`, buf, m[1]);
  if (b.logo?.url) await store.deleteFile(b.logo.url).catch(() => {});
  b.logo = { url: saved.url, contentType: m[1], size: buf.length };
  await saveDoc(b);
  return get(id);
}

// ---------- Website / text analysis ----------
function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function siteColors(html) {
  const counts = new Map();
  for (const m of String(html).matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    if (spread < 18) continue; // skip greys, black and white
    counts.set('#' + h, (counts.get('#' + h) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c.toUpperCase());
}

async function fetchSite(url) {
  let u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    throw err(400, 'رابط الموقع غير صحيح');
  }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(parsed.hostname)) throw err(400, 'رابط غير مسموح');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(parsed.href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingOS/1.0)', Accept: 'text/html' },
    });
    if (!res.ok) throw err(400, `الموقع رد بخطأ ${res.status}`);
    const html = (await res.text()).slice(0, 600000);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || '';
    return { url: parsed.href, title: htmlToText(title), description: desc, text: htmlToText(html).slice(0, 18000), colors: siteColors(html) };
  } catch (e) {
    if (e.status) throw e;
    throw err(400, e.name === 'AbortError' ? 'الموقع لم يرد خلال 12 ثانية' : `تعذر فتح الموقع: ${e.message}`);
  } finally {
    clearTimeout(t);
  }
}

const S = (description) => ({ type: 'string', description });
const FIELD_SCHEMA = {
  type: 'object',
  properties: { value: S('the value in Arabic. Never empty: when the sources do not say it, infer the most likely answer from what the brand sells and set basis=inferred'), basis: { type: 'string', enum: ['stated', 'inferred'] } },
  required: ['value', 'basis'],
};
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    name: S('brand name as written by the brand'),
    businessType: { type: 'string', enum: ['ecommerce', 'services', 'both', 'other'] },
    understanding: S('4-6 sentences in Arabic: exactly what this brand does, for whom, how it sells (online store, booking, branches…), price level, and what makes it special'),
    ...Object.fromEntries(FIELDS.map(([k]) => [k, FIELD_SCHEMA])),
    products: {
      type: 'array',
      description: 'every product AND service the brand offers',
      items: {
        type: 'object',
        properties: { name: S('product or service name as written'), kind: { type: 'string', enum: ['product', 'service'] }, price: S('price with currency only if stated, else empty'), description: S('one short sentence in Arabic'), category: S('category') },
        required: ['name', 'kind'],
      },
    },
  },
  required: ['name', 'businessType', 'understanding', ...FIELDS.map(([k]) => k), 'products'],
};

const norm = (x) => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function analyze(id, { url, text, ai: aiPick, competitors = true, seeds = '' }) {
  const b = await get(id, { withUrls: false });
  const crawl = require('./sitecrawl');
  let site = null;
  if (url || (!text && b.website)) site = await crawl.crawl(url || b.website);
  const userText = String(text || '').trim().slice(0, 12000);
  if (!site && !userText) throw err(400, 'أدخل رابط الموقع أو اكتب وصفاً للبراند');

  const catalogue = site?.products || [];
  const prompt = `You are the Brand Brain of a marketing platform. Understand the brand "${b.name}" EXACTLY: what it does, what it sells, to whom, where, at what price level, and how.
Fill EVERY field in Arabic (keep brand and product names as written). basis="stated" only when a source says it explicitly; otherwise infer the most likely answer from the evidence and set basis="inferred". Never invent prices, numbers, awards or claims.
Field meanings: industry=sector and what they sell; description=one or two sentences; audience=who buys (age, gender, place, needs); market=countries/cities served; tone=voice of the brand; languages=languages the content should use;
promise=main value promise; usp=what makes them different; cta=preferred call to action; forbidden=things to avoid saying (claims, competitors' names, sensitive topics); competitors=names of direct competitors in the same market.
List EVERY product and service (up to 60). For a services business list each service.
${catalogue.length ? `\nThe store catalogue was read directly (${site.platform}, ${catalogue.length} items), e.g.: ${catalogue.slice(0, 40).map((x) => `${x.name}${x.price ? ` (${x.price})` : ''}${x.category ? ` [${x.category}]` : ''}`).join(' | ')}\n` : ''}
${site ? `\n=== WEBSITE ${site.url} (home + ${site.pages.length} pages) ===\nTitle: ${site.title}\nMeta description: ${site.description}\n${site.text}\n` : ''}
${userText ? `\n=== OWNER NOTES ===\n${userText}\n` : ''}`;

  const search = require('./search');
  let out;
  if (await search.hasWeb()) {
    const r = await search.research(`${prompt}\nAlso search the web for "${b.name}" ${site ? `(${new URL(site.url).hostname})` : ''}: social media, reviews, press, marketplaces, to understand the brand better.`, ANALYSIS_SCHEMA, [`${b.name} ${site ? new URL(site.url).hostname : ''}`, `${b.name} avis reviews`, `${b.name} instagram`], { brand: id, kind: 'analyze' });
    out = { json: r.json, via: r.via, web: r.web };
  } else {
    const r = await ai.json(prompt, ANALYSIS_SCHEMA, { kind: 'analyze', brand: id, override: aiPick?.provider ? { provider: String(aiPick.provider), model: String(aiPick.model || '') } : undefined });
    out = { json: r.json, via: `${r.providerName || r.provider} · ${r.model}`, web: false };
  }
  const j = out.json || {};
  const fromSite = Boolean(site);
  const proposed = {};
  for (const [k] of FIELDS) {
    const f = j[k];
    if (!f?.value) continue;
    proposed[k] = { value: String(f.value).slice(0, 1200), source: f.basis !== 'stated' ? 'inferred' : fromSite ? 'extracted' : 'confirmed' };
  }

  // ---- apply automatically: fill every EMPTY field; keep what the owner already has ----
  const fresh = await get(id, { withUrls: false });
  const filled = [];
  const suggestions = {};
  for (const [k, f] of Object.entries(proposed)) {
    if (!fresh.fields[k]?.value) { fresh.fields[k] = { ...f, at: Date.now() }; filled.push(k); }
    else if (norm(fresh.fields[k].value) !== norm(f.value)) suggestions[k] = f;
  }
  // products: catalogue (real prices + photos) first, then what the AI found (services…)
  const items = [
    ...catalogue.map((x) => ({ name: x.name, price: x.price, description: x.description, category: x.category, image: x.image, url: x.url, kind: 'product' })),
    ...(j.products || []).filter((x) => x?.name).map((x) => ({ name: String(x.name), price: String(x.price || ''), description: String(x.description || ''), category: String(x.category || ''), kind: x.kind === 'service' ? 'service' : 'product' })),
  ];
  let added = 0; let priced = 0; const needPhoto = [];
  for (const it of items) {
    const ex = fresh.products.find((p) => norm(p.name) === norm(it.name));
    if (ex) {
      if (!ex.price && it.price) { ex.price = it.price.slice(0, 40); priced++; }
      if (!ex.description && it.description) ex.description = it.description.slice(0, 600);
      if (!ex.photo && it.image) needPhoto.push([ex, it.image]);
      continue;
    }
    if (fresh.products.length >= 300) break;
    const np = { id: randomId(4), name: it.name.slice(0, 120), price: String(it.price || '').slice(0, 40), description: String(it.description || '').slice(0, 600), category: String(it.category || '').slice(0, 80), kind: it.kind, url: String(it.url || '').slice(0, 300), source: 'extracted', photo: '' };
    fresh.products.push(np); added++;
    if (it.image) needPhoto.push([np, it.image]);
  }
  // product photos from the store (max 40, 6 at a time)
  let photos = 0;
  const queue = needPhoto.slice(0, 40);
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const [p, src] = queue.shift();
      const im = await crawl.image(src);
      if (!im) continue;
      try { p.photo = (await store.saveFile(`brands/${id}/products/${p.id}-${Date.now()}.${im.type.split('/')[1].replace('jpeg', 'jpg')}`, im.buf, im.type)).url; photos++; } catch { /* skip */ }
    }
  }));
  const colors = site ? siteColors(site.html) : [];
  if (!(fresh.visual?.colors || []).length && colors.length) fresh.visual = { ...(fresh.visual || {}), colors: colors.slice(0, 5) };
  if (site && !fresh.website) fresh.website = site.url;
  fresh.understanding = { text: String(j.understanding || '').slice(0, 2000), businessType: j.businessType || 'other', at: Date.now(), via: out.via, web: out.web };
  if (filled.length && fresh.gate1?.approved) fresh.gate1 = { approved: false, reopenedAt: Date.now() };
  await saveDoc(fresh);

  return {
    name: j.name || '', businessType: j.businessType || 'other', understanding: fresh.understanding.text, via: out.via, web: out.web,
    filled, suggestions, products: { added, priced, photos, total: fresh.products.length, catalogue: catalogue.length, platform: site?.platform || '' },
    colors, site: site ? { url: site.url, title: site.title, pages: site.pages.length } : null,
    brand: await get(id),
    competitors: competitors ? await require('./research').discover(id, { seeds, market: (proposed.market || fresh.fields.market)?.value || '', hint: [proposed.industry?.value, proposed.description?.value, proposed.audience?.value].filter(Boolean).join(' · ') }).catch((e) => ({ error: e.message })) : null,
  };
}

// ---------- visual identity guide (brand book, design-system file, PDF) ----------
const GUIDE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-3 sentences in Arabic: the visual identity in plain words' },
    colors: { type: 'array', items: { type: 'object', properties: { hex: { type: 'string', description: '#RRGGBB' }, name: { type: 'string' }, use: { type: 'string', description: 'where/how it is used, in Arabic' } }, required: ['hex'] } },
    fonts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, use: { type: 'string' } }, required: ['name'] } },
    rules: { type: 'array', items: { type: 'string' }, description: 'concrete visual rules in Arabic (layout, logo, spacing, corners, photography, tone)' },
    donts: { type: 'array', items: { type: 'string' }, description: 'things to avoid, in Arabic' },
    imageStyle: { type: 'string', description: 'one English paragraph telling an image model how visuals for this brand must look (palette roles, mood, composition, typography feel). No hex codes.' },
  },
  required: ['summary', 'colors', 'rules', 'imageStyle'],
};

async function analyzeGuide(id, { text, dataUrl, filename }) {
  const b = await get(id);
  const prompt = `Extract the visual identity guidelines of the brand "${b.name}" from this document (brand book, style guide or design-system file).
Only report what the document states; do not invent colours or fonts. Keep the key colour roles (primary, accent, backgrounds, text) and the "never do" rules.`;
  let out;
  const m = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/);
  if (m && /pdf|image\//.test(m[1])) {
    if (m[2].length > 6_000_000) throw err(400, 'الملف كبير جداً (حد أقصى ~4MB)');
    out = await ai.geminiFileJSON(prompt, GUIDE_SCHEMA, { mime: m[1], b64: m[2] }, { brand: id, kind: 'guide' });
  } else {
    const t = String(text || (m ? Buffer.from(m[2], 'base64').toString('utf8') : '')).trim().slice(0, 60000);
    if (t.length < 40) throw err(400, 'ارفع ملف الدليل (PDF أو MD أو TXT) أو الصق نصه');
    out = await ai.json(`${prompt}\n\n=== DOCUMENT ===\n${t}`, GUIDE_SCHEMA, { kind: 'guide', brand: id });
  }
  const j = out.json || {};
  const colors = (j.colors || []).map((c) => ({ hex: String(c.hex || '').toUpperCase(), name: String(c.name || '').slice(0, 40), use: String(c.use || '').slice(0, 120) })).filter((c) => /^#[0-9A-F]{6}$/.test(c.hex)).slice(0, 16);
  const guide = {
    summary: String(j.summary || '').slice(0, 800), colors,
    fonts: (j.fonts || []).map((f) => ({ name: String(f.name || '').slice(0, 60), use: String(f.use || '').slice(0, 120) })).filter((f) => f.name).slice(0, 8),
    rules: (j.rules || []).map(String).slice(0, 20), donts: (j.donts || []).map(String).slice(0, 12),
    imageStyle: String(j.imageStyle || '').slice(0, 1500), source: String(filename || 'نص ملصوق').slice(0, 120), at: Date.now(),
  };
  const doc = await get(id);
  doc.visual = { ...(doc.visual || {}), guide };
  if (!(doc.visual.colors || []).length && colors.length) doc.visual.colors = colors.slice(0, 8).map((c) => c.hex);
  await saveDoc(doc);
  return get(id);
}

async function removeGuide(id) {
  const doc = await get(id);
  if (doc.visual) delete doc.visual.guide;
  await saveDoc(doc);
  return get(id);
}

async function setLogoUrl(id, url) {
  const b = await get(id);
  b.logo = { url, contentType: 'image/png', generated: true };
  await saveDoc(b);
  return get(id);
}

module.exports = {
  productPhoto, setLogoUrl, analyzeGuide, removeGuide, FIELDS, index, get, create, patch, remove, uploadLogo, analyze, readiness };
