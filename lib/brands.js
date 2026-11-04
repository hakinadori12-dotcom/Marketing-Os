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
      source: SOURCES.includes(p.source) ? p.source : 'confirmed',
    })).filter((p) => p.name);
  }
  if (body.visual) {
    const colors = (body.visual.colors || []).map((c) => String(c).trim()).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8);
    b.visual = { ...b.visual, colors };
    if (body.visual.font) b.visual.font = String(body.visual.font).slice(0, 60);
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
  properties: { value: S('the value in Arabic, empty string if unknown'), basis: { type: 'string', enum: ['stated', 'inferred'] } },
  required: ['value', 'basis'],
};
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    name: S('brand name as written by the brand'),
    ...Object.fromEntries(FIELDS.map(([k]) => [k, FIELD_SCHEMA])),
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: S('product name'), price: S('price with currency if stated, else empty'), description: S('one short sentence in Arabic') },
        required: ['name'],
      },
    },
  },
  required: ['name', ...FIELDS.map(([k]) => k), 'products'],
};

async function analyze(id, { url, text, ai: aiPick }) {
  const b = await get(id, { withUrls: false });
  let site = null;
  if (url || (!text && b.website)) site = await fetchSite(url || b.website);
  const userText = String(text || '').trim().slice(0, 12000);
  if (!site && !userText) throw err(400, 'أدخل رابط الموقع أو اكتب وصفاً للبراند');

  const prompt = `You are the Brand Brain of a marketing platform. Build a brand profile for "${b.name}".
Answer every field in Arabic (keep brand and product names as written).
For each field set basis="stated" only when the sources say it explicitly, and basis="inferred" when you deduce it.
Never invent prices, numbers, awards or claims. Leave value empty when there is nothing to go on.
Field meanings: industry=sector and what they sell; description=one or two sentences; audience=who buys (age, gender, place, needs);
market=countries/cities served; tone=voice of the brand; languages=languages the content should use;
promise=main value promise; usp=what makes them different; cta=preferred call to action; forbidden=things to avoid saying; competitors=names of direct competitors in the same market if the sources mention or clearly imply them (else empty).
List up to 20 products/services that the sources mention.
${site ? `\n=== WEBSITE ${site.url} ===\nTitle: ${site.title}\nMeta description: ${site.description}\n${site.text}\n` : ''}
${userText ? `\n=== OWNER NOTES ===\n${userText}\n` : ''}`;

  const out = await ai.json(prompt, ANALYSIS_SCHEMA, { kind: 'analyze', brand: id, override: aiPick?.provider ? { provider: String(aiPick.provider), model: String(aiPick.model || '') } : undefined });
  const j = out.json || {};
  const fromSite = Boolean(site);
  const fields = {};
  for (const [k] of FIELDS) {
    const f = j[k];
    if (!f?.value) continue;
    fields[k] = { value: String(f.value).slice(0, 1200), source: f.basis !== 'stated' ? 'inferred' : fromSite ? 'extracted' : 'confirmed' };
  }
  return {
    name: j.name || '',
    fields,
    products: (j.products || []).filter((p) => p?.name).slice(0, 20).map((p) => ({ name: p.name, price: p.price || '', description: p.description || '', source: 'extracted' })),
    colors: site?.colors || [],
    site: site ? { url: site.url, title: site.title } : null,
  };
}

module.exports = { FIELDS, index, get, create, patch, remove, uploadLogo, analyze, readiness };
