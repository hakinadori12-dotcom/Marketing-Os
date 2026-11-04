// BYOK: the user enters their own API key for each AI company inside the platform.
// Keys are encrypted at rest (AES-256-GCM from APP_SECRET) and never sent back in full.
// Besides the built-in catalog, the user can add any number of custom providers
// (OpenAI-compatible or Anthropic-compatible base URL + key).
const store = require('./store');
const { encrypt, decrypt, randomId } = require('./crypto');

const DOC = 'providers.json';
const SETTINGS = 'settings.json';
const KINDS = ['text', 'image', 'video'];

// kinds: text = writing/analysis/assistant, image, video
const CATALOG = [
  { id: 'openai', name: 'OpenAI', kinds: ['text', 'image', 'video'], site: 'platform.openai.com/api-keys', hint: 'sk-…', defaults: { text: 'gpt-5-mini', image: 'gpt-image-1', video: 'sora-2' } },
  { id: 'gemini', name: 'Google Gemini', kinds: ['text', 'image', 'video'], site: 'aistudio.google.com/apikey', hint: 'AIza…', defaults: { text: 'gemini-2.5-flash', image: 'gemini-2.5-flash-image', video: 'veo-3.1-fast-generate-preview' } },
  { id: 'anthropic', name: 'Anthropic Claude', kinds: ['text'], site: 'console.anthropic.com/settings/keys', hint: 'sk-ant-…', defaults: { text: 'claude-sonnet-4-5' } },
  { id: 'openrouter', name: 'OpenRouter', kinds: ['text'], site: 'openrouter.ai/keys', hint: 'sk-or-…', defaults: { text: 'openai/gpt-5-mini' } },
  { id: 'xai', name: 'xAI Grok', kinds: ['text', 'image', 'video'], site: 'console.x.ai', hint: 'xai-…', defaults: { text: 'grok-4', image: 'grok-2-image' } },
  { id: 'deepseek', name: 'DeepSeek', kinds: ['text'], site: 'platform.deepseek.com/api_keys', hint: 'sk-…', defaults: { text: 'deepseek-chat' } },
  { id: 'tavily', name: 'Tavily (بحث الإنترنت)', kinds: ['search'], site: 'app.tavily.com', hint: 'tvly-…', defaults: {} },
  { id: 'kling', name: 'Kling AI', kinds: ['video', 'image'], site: 'app.klingai.com/global/dev', hint: 'Access Key + Secret Key', fields: ['accessKey', 'secretKey'], soon: true, defaults: { video: 'kling-v2-1' } },
  { id: 'byteplus', name: 'BytePlus ModelArk (Seedance · Seedream)', kinds: ['video', 'image'], site: 'console.byteplus.com/ark', hint: 'API key', soon: true, defaults: { video: 'seedance-1-0-pro', image: 'seedream-4-0' } },
  { id: 'dashscope', name: 'Alibaba Model Studio (Wan)', kinds: ['video', 'image'], site: 'modelstudio.console.alibabacloud.com', hint: 'sk-…', soon: true, defaults: { video: 'wan2.2-t2v-plus' } },
];
const byId = Object.fromEntries(CATALOG.map((p) => [p.id, p]));
const err = (status, message) => Object.assign(new Error(message), { status });
const isCustom = (id) => /^c_[a-f0-9]+$/.test(String(id));

// ---------- which kind is a model? ----------
const SKIP = /(embed|tts|whisper|transcri|moderation|realtime|audio|speech|aqa|search|rerank|similarity|edit-|davinci|babbage|computer-use|guard|ocr)/i;
function classify(model) {
  const m = String(model).toLowerCase();
  if (/(veo|sora|video|kling|seedance|wan2|t2v|i2v|hailuo|runway|luma|ray-|pika)/.test(m)) return 'video';
  if (/(image|imagen|dall-e|seedream|flux|stable-diffusion|sdxl|midjourney|ideogram|recraft|nano-banana)/.test(m)) return 'image';
  if (SKIP.test(m)) return null;
  return 'text';
}

async function raw() {
  return store.readJSON(DOC, {});
}

function customDef(id, rec) {
  return {
    id, name: rec.name, kinds: rec.kinds || ['text'], site: rec.baseUrl, hint: 'API key', custom: true, compat: rec.compat || 'openai', baseUrl: rec.baseUrl,
    defaults: rec.defaults || {},
  };
}

function publicRow(p, rec) {
  return {
    id: p.id, name: p.name, kinds: p.kinds, site: p.site, hint: p.hint, fields: p.fields || ['apiKey'], soon: Boolean(p.soon), defaults: p.defaults || {},
    custom: Boolean(p.custom), compat: p.compat || null, baseUrl: p.baseUrl || null,
    connected: Boolean(rec),
    last4: rec?.last4 || '',
    status: rec?.status || null,
    error: rec?.error || null,
    testedAt: rec?.testedAt || null,
    addedAt: rec?.addedAt || null,
    models: rec?.models || [],
  };
}

function defOf(id, all) {
  if (byId[id]) return byId[id];
  if (isCustom(id) && all[id]) return customDef(id, all[id]);
  return null;
}

async function list() {
  const all = await raw();
  const rows = CATALOG.map((p) => publicRow(p, all[p.id]));
  for (const [id, rec] of Object.entries(all)) if (isCustom(id)) rows.push(publicRow(customDef(id, rec), rec));
  return rows;
}

async function secret(id) {
  const rec = (await raw())[id];
  if (!rec) return null;
  return JSON.parse(decrypt(rec.enc));
}

// ---------- key checks ----------
async function getJSON(url, headers) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

const pickMsg = (d, status) => d?.error?.message || d?.error?.type || d?.message || (typeof d?.error === 'string' ? d.error : '') || `HTTP ${status}`;
const idsOf = (d) => (d?.data || d?.models || []).map((m) => (typeof m === 'string' ? m : m.id || String(m.name || '').replace('models/', ''))).filter(Boolean);

async function check(id, s, def) {
  const k = s.apiKey;
  let r;
  let models = [];
  if (def?.custom) {
    let base = def.baseUrl.replace(/\/+$/, '');
    const headers = def.compat === 'anthropic' ? { 'x-api-key': k, 'anthropic-version': '2023-06-01', Authorization: `Bearer ${k}` } : { Authorization: `Bearer ${k}` };
    r = await getJSON(`${base}/models`, headers);
    // The user may have entered the site root: try <base>/v1 as well.
    if (!r.ok && !/\/v\d+$/.test(base)) {
      const r2 = await getJSON(`${base}/v1/models`, headers).catch(() => null);
      if (r2 && (r2.ok || r2.status === 401 || r2.status === 403)) {
        r = r2;
        base = `${base}/v1`;
      }
    }
    models = idsOf(r.data);
    // Some gateways have no /models route: accept the key and let the user type model names.
    if (!r.ok && r.status === 404) return { status: 'saved', models: [], error: 'لم نجد قائمة نماذج في هذا الرابط. تأكد أن الرابط ينتهي بـ /v1، أو اكتب اسم النموذج يدوياً.', baseUrl: base };
    if (r.ok) return { status: 'active', models: [...new Set(models)].filter((m) => classify(m)).sort().slice(0, 600), baseUrl: base };
  } else {
    switch (id) {
      case 'openai':
        r = await getJSON('https://api.openai.com/v1/models', { Authorization: `Bearer ${k}` });
        models = idsOf(r.data);
        break;
      case 'gemini': {
        r = await getJSON('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { 'x-goog-api-key': k });
        models = idsOf(r.data);
        break;
      }
      case 'anthropic':
        r = await getJSON('https://api.anthropic.com/v1/models?limit=100', { 'x-api-key': k, 'anthropic-version': '2023-06-01' });
        models = idsOf(r.data);
        break;
      case 'openrouter': {
        r = await getJSON('https://openrouter.ai/api/v1/key', { Authorization: `Bearer ${k}` });
        if (r.status === 404) r = await getJSON('https://openrouter.ai/api/v1/auth/key', { Authorization: `Bearer ${k}` });
        if (r.ok) models = idsOf((await getJSON('https://openrouter.ai/api/v1/models', {}).catch(() => ({}))).data);
        break;
      }
      case 'xai':
        r = await getJSON('https://api.x.ai/v1/models', { Authorization: `Bearer ${k}` });
        models = idsOf(r.data);
        break;
      case 'tavily':
        r = await getJSON('https://api.tavily.com/usage', { Authorization: `Bearer ${k}` });
        break;
      case 'deepseek':
        r = await getJSON('https://api.deepseek.com/models', { Authorization: `Bearer ${k}` });
        models = idsOf(r.data);
        break;
      default:
        return { status: 'saved', models: [] }; // video providers: verified on first use
    }
  }
  if (r.ok) return { status: 'active', models: [...new Set(models)].filter((m) => classify(m)).sort().slice(0, 600) };
  return { status: r.status === 401 || r.status === 403 || r.status === 400 ? 'invalid' : 'error', error: pickMsg(r.data, r.status), models: [] };
}

function cleanSecret(def, body) {
  const s = {};
  for (const f of def.fields || ['apiKey']) {
    const v = String(body?.[f] || '').trim();
    if (!v || v.length < 8) throw err(400, 'أدخل المفتاح كاملاً');
    if (/\s/.test(v)) throw err(400, 'المفتاح فيه مسافات. انسخه مرة أخرى');
    s[f] = v;
  }
  return s;
}

async function saveRec(id, def, s, c, extra = {}) {
  const main = s.apiKey || s.accessKey;
  await store.update(DOC, {}, (all) => {
    all[id] = { ...extra, enc: encrypt(JSON.stringify(s)), last4: main.slice(-4), status: c.status, error: c.error || null, models: c.models, addedAt: Date.now(), testedAt: Date.now() };
    return all;
  });
  await autoDefaults(id);
  const all = await raw();
  return publicRow(defOf(id, all), all[id]);
}

async function connect(id, body) {
  const all = await raw();
  const def = defOf(id, all);
  if (!def) throw err(404, 'مزوّد غير معروف');
  const s = cleanSecret(def, body);
  const c = await check(id, s, def).catch((e) => ({ status: 'error', error: e.message, models: [] }));
  if (c.status === 'invalid') throw err(400, `المفتاح مرفوض من ${def.name}: ${c.error}`);
  const extra = def.custom ? { name: all[id].name, baseUrl: c.baseUrl || all[id].baseUrl, compat: all[id].compat, kinds: all[id].kinds, defaults: customDefaults(all[id].kinds, c.models, all[id].defaults), custom: true } : {};
  return saveRec(id, def, s, c, extra);
}

// Adds a custom provider: any OpenAI-compatible (/chat/completions) or Anthropic-compatible (/messages) API.
async function addCustom(body) {
  const name = String(body?.name || '').trim().slice(0, 60);
  if (!name) throw err(400, 'اكتب اسماً للمزوّد');
  let baseUrl = String(body?.baseUrl || '').trim().replace(/\/+$/, '');
  baseUrl = baseUrl.replace(/\/(chat\/completions|responses|messages)$/, '');
  let u;
  try {
    u = new URL(baseUrl);
  } catch {
    throw err(400, 'رابط Base URL غير صحيح');
  }
  if (u.protocol !== 'https:') throw err(400, 'الرابط يجب أن يبدأ بـ https://');
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) throw err(400, 'رابط غير مسموح');
  const compat = body?.compat === 'anthropic' ? 'anthropic' : 'openai';
  const kinds = (Array.isArray(body?.kinds) ? body.kinds : ['text']).filter((k) => k === 'text' || k === 'image');
  if (!kinds.length) kinds.push('text');
  const id = 'c_' + randomId(4);
  const def = customDef(id, { name, baseUrl, compat, kinds });
  const s = cleanSecret(def, body);
  const c = await check(id, s, def).catch((e) => ({ status: 'error', error: e.message, models: [] }));
  if (c.status === 'invalid') throw err(400, `المفتاح مرفوض من ${name}: ${c.error}`);
  const typed = body?.model ? Object.fromEntries(kinds.map((k) => [k, String(body.model).trim().slice(0, 120)])) : {};
  return saveRec(id, def, s, c, { name, baseUrl: c.baseUrl || baseUrl, compat, kinds, defaults: customDefaults(kinds, c.models, typed), custom: true });
}

// Best model per kind for a custom provider (keeps a model the user typed if it still exists).
function customDefaults(kinds, list, prev = {}) {
  const out = {};
  for (const k of kinds || ['text']) {
    const mine = (list || []).filter((m) => classify(m) === k).sort((a, b) => score(b, k) - score(a, k));
    out[k] = prev?.[k] && (!mine.length || mine.includes(prev[k])) ? prev[k] : mine[0] || prev?.[k];
    if (!out[k]) delete out[k];
  }
  return out;
}

async function test(id) {
  const all = await raw();
  const def = defOf(id, all);
  const s = await secret(id);
  if (!def || !s) throw err(404, 'المزوّد غير مربوط');
  const started = Date.now();
  const c = await check(id, s, def).catch((e) => ({ status: 'error', error: e.message, models: [] }));
  await store.update(DOC, {}, (a) => {
    if (a[id]) {
      Object.assign(a[id], { status: c.status, error: c.error || null, testedAt: Date.now(), ...(c.models.length ? { models: c.models } : {}) });
      if (a[id].custom || isCustom(id)) {
        if (c.baseUrl) a[id].baseUrl = c.baseUrl;
        a[id].defaults = customDefaults(a[id].kinds, a[id].models, a[id].defaults);
      }
    }
    return a;
  });
  await store.logEvent({ kind: 'test', provider: id, status: c.status === 'active' || c.status === 'saved' ? 200 : 502, ms: Date.now() - started, error: c.error });
  const after = await raw();
  return { ...publicRow(defOf(id, after), after[id]), ms: Date.now() - started };
}

async function disconnect(id) {
  await store.update(DOC, {}, (all) => {
    delete all[id];
    return all;
  });
  const st = await settings();
  for (const kind of KINDS) if (st[kind]?.provider === id) delete st[kind];
  await store.writeJSON(SETTINGS, st);
}

// ---------- models per kind (what each page shows) ----------
async function models(kind) {
  if (!KINDS.includes(kind)) throw err(400, 'نوع غير معروف');
  const all = await raw();
  const st = await settings();
  const out = [];
  for (const id of [...CATALOG.map((p) => p.id), ...Object.keys(all).filter(isCustom)]) {
    const rec = all[id];
    const def = defOf(id, all);
    if (!rec || !def || (!def.kinds.includes(kind) && !def.custom)) continue;
    let list = (rec.models || []).filter((m) => classify(m) === kind);
    const dflt = def.defaults?.[kind];
    if (dflt && !list.includes(dflt)) list = [dflt, ...list];
    if (st[kind]?.provider === id && st[kind].model && !list.includes(st[kind].model)) list = [st[kind].model, ...list];
    for (const m of list) out.push({ provider: id, providerName: def.name, model: m, soon: Boolean(def.soon), custom: Boolean(def.custom) });
  }
  return { kind, current: st[kind] || null, models: out };
}

// ---------- defaults per kind ----------
async function settings() {
  return store.readJSON(SETTINGS, {});
}

async function setSettings(body) {
  const st = await settings();
  const all = await raw();
  for (const kind of KINDS) {
    const v = body?.[kind];
    if (!v) continue;
    const p = defOf(v.provider, all);
    if (!p || !p.kinds.includes(kind)) throw err(400, 'مزوّد غير مناسب');
    if (!all[p.id]) throw err(400, `اربط مفتاح ${p.name} أولاً`);
    st[kind] = { provider: p.id, model: String(v.model || p.defaults?.[kind] || '').trim().slice(0, 160) };
  }
  return store.writeJSON(SETTINGS, st);
}

async function autoDefaults(id) {
  const all = await raw();
  const p = defOf(id, all);
  if (!p) return;
  const st = await settings();
  let changed = false;
  for (const kind of p.kinds) {
    if (!st[kind] && p.defaults?.[kind] && !p.soon && kind !== 'video') {
      st[kind] = { provider: id, model: p.defaults[kind] };
      changed = true;
    }
  }
  if (changed) await store.writeJSON(SETTINGS, st);
}

// Resolves { provider, model, secret, def } for a job; throws a clear Arabic error when missing.
async function resolve(kind, override) {
  const st = await settings();
  const pick = override?.provider ? { provider: override.provider, model: override.model } : st[kind];
  const label = { text: 'الكتابة والتحليل', image: 'الصور', video: 'الفيديو' }[kind];
  if (!pick?.provider) throw err(412, `لا يوجد مزوّد لـ${label}. أضف مفتاحك من صفحة "المفاتيح والمزوّدون".`);
  const all = await raw();
  const p = defOf(pick.provider, all);
  const s = await secret(pick.provider);
  if (!p || !s) throw err(412, `مفتاح ${p?.name || pick.provider} غير مربوط. أضفه من صفحة "المفاتيح والمزوّدون".`);
  return { provider: p.id, name: p.name, model: pick.model || p.defaults?.[kind], secret: s, custom: Boolean(p.custom), compat: p.compat, baseUrl: p.baseUrl };
}

// ---------- auto choice + backups ----------
// Rough quality/speed score so "auto" picks a strong, reliable model for the task.
function score(model, kind) {
  const m = String(model).toLowerCase();
  let s = 0;
  const v = parseFloat((m.match(/(\d+(?:\.\d+)?)/) || [])[1] || '0');
  if (v > 0 && v < 20) s += v * 4;
  if (kind === 'text') {
    if (/(gpt-5|gpt-4\.1|gpt-4o|claude-(sonnet|opus)|claude-\d|gemini-(2\.5|3)|grok-[34]|deepseek-(chat|v3|r1)|qwen3|qwen-max|llama-?4|mistral-large|kimi|glm-4)/.test(m)) s += 40;
    if (/(pro|sonnet|opus|large|max)\b/.test(m)) s += 8;
    if (/(flash|mini|haiku|fast|turbo)/.test(m)) s += 6;
    if (/(nano|lite|tiny|small|\b[1-8]b\b|instruct-0|guard|coder|code|math|vision|vl\b|ocr|audio|thinking-exp)/.test(m)) s -= 30;
  } else if (kind === 'video') {
    if (/(veo-3|sora-2|kling|seedance)/.test(m)) s += 30;
    if (/(lite|fast)/.test(m)) s += 12; // cheaper and quicker by default; pick a full model on purpose
  } else if (kind === 'image') {
    if (/(gemini-2\.5-flash-image|nano-banana|gpt-image|imagen-4|seedream-4|flux)/.test(m)) s += 40;
  }
  if (/(alpha|exp\b|experimental|deprecated|legacy)/.test(m)) s -= 15;
  if (/preview/.test(m)) s -= 4;
  if (/\d{4}-\d{2}-\d{2}|\d{8}|-\d{3,4}$/.test(m)) s -= 2; // dated snapshots after the alias
  return s;
}

// Ordered list of { provider, model, secret, ... } to try: chosen model, default, then best backups.
async function candidates(kind, override, max = 5) {
  const all = await raw();
  const st = await settings();
  const usable = (await models(kind)).models.filter((m) => !m.soon);
  const seen = new Set();
  const order = [];
  const push = (provider, model) => {
    const k = provider + '|' + model;
    if (!provider || !model || seen.has(k) || !all[provider]) return;
    seen.add(k);
    order.push({ provider, model });
  };
  if (override?.provider && override.provider !== 'auto') push(override.provider, override.model || defOf(override.provider, all)?.defaults?.[kind]);
  const isAuto = !override?.provider || override.provider === 'auto';
  if (isAuto && st[kind]) push(st[kind].provider, st[kind].model);
  // best model of every provider first (spread across providers), then the rest
  const ranked = usable.map((m) => ({ ...m, s: score(m.model, kind) })).sort((a, b) => b.s - a.s);
  const byProv = new Map();
  for (const m of ranked) { if (!byProv.has(m.provider)) byProv.set(m.provider, []); byProv.get(m.provider).push(m); }
  for (let round = 0; round < 3; round++) for (const list of byProv.values()) if (list[round]) push(list[round].provider, list[round].model);
  for (const m of ranked) push(m.provider, m.model);
  if (!isAuto && st[kind]) push(st[kind].provider, st[kind].model);
  const label = { text: 'الكتابة والتحليل', image: 'الصور', video: 'الفيديو' }[kind];
  if (!order.length) throw err(412, `لا يوجد مزوّد لـ${label}. أضف مفتاحك من صفحة "المفاتيح والمزوّدون".`);
  const out = [];
  for (const o of order.slice(0, max)) {
    const p = defOf(o.provider, all);
    const s = await secret(o.provider);
    if (p && s) out.push({ provider: p.id, name: p.name, model: o.model, secret: s, custom: Boolean(p.custom), compat: p.compat, baseUrl: p.baseUrl });
  }
  return out;
}

module.exports = { CATALOG, list, connect, addCustom, test, disconnect, settings, setSettings, resolve, secret, models, classify, candidates, score };
