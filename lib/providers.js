// BYOK: the user enters their own API key for each AI company inside the platform.
// Keys are encrypted at rest (AES-256-GCM from APP_SECRET) and never sent back in full.
const store = require('./store');
const { encrypt, decrypt } = require('./crypto');

const DOC = 'providers.json';
const SETTINGS = 'settings.json';

// kinds: text = writing/analysis/assistant, image, video
const CATALOG = [
  { id: 'openai', name: 'OpenAI', kinds: ['text', 'image'], site: 'platform.openai.com/api-keys', hint: 'sk-…', defaults: { text: 'gpt-5-mini', image: 'gpt-image-1' } },
  { id: 'gemini', name: 'Google Gemini', kinds: ['text', 'image', 'video'], site: 'aistudio.google.com/apikey', hint: 'AIza…', defaults: { text: 'gemini-2.5-flash', image: 'gemini-2.5-flash-image', video: 'veo-3.1-fast-generate-preview' } },
  { id: 'anthropic', name: 'Anthropic Claude', kinds: ['text'], site: 'console.anthropic.com/settings/keys', hint: 'sk-ant-…', defaults: { text: 'claude-sonnet-4-5' } },
  { id: 'openrouter', name: 'OpenRouter', kinds: ['text'], site: 'openrouter.ai/keys', hint: 'sk-or-…', defaults: { text: 'openai/gpt-5-mini' } },
  { id: 'xai', name: 'xAI Grok', kinds: ['text', 'image'], site: 'console.x.ai', hint: 'xai-…', defaults: { text: 'grok-4', image: 'grok-2-image' } },
  { id: 'deepseek', name: 'DeepSeek', kinds: ['text'], site: 'platform.deepseek.com/api_keys', hint: 'sk-…', defaults: { text: 'deepseek-chat' } },
  { id: 'kling', name: 'Kling AI', kinds: ['video', 'image'], site: 'app.klingai.com/global/dev', hint: 'Access Key + Secret Key', fields: ['accessKey', 'secretKey'], soon: true },
  { id: 'byteplus', name: 'BytePlus ModelArk (Seedance · Seedream)', kinds: ['video', 'image'], site: 'console.byteplus.com/ark', hint: 'API key', soon: true },
  { id: 'dashscope', name: 'Alibaba Model Studio (Wan)', kinds: ['video', 'image'], site: 'modelstudio.console.alibabacloud.com', hint: 'sk-…', soon: true },
];
const byId = Object.fromEntries(CATALOG.map((p) => [p.id, p]));
const err = (status, message) => Object.assign(new Error(message), { status });

async function raw() {
  return store.readJSON(DOC, {});
}

function publicRow(p, rec) {
  return {
    id: p.id, name: p.name, kinds: p.kinds, site: p.site, hint: p.hint, fields: p.fields || ['apiKey'], soon: Boolean(p.soon), defaults: p.defaults || {},
    connected: Boolean(rec),
    last4: rec?.last4 || '',
    status: rec?.status || null,
    error: rec?.error || null,
    testedAt: rec?.testedAt || null,
    addedAt: rec?.addedAt || null,
    models: rec?.models || [],
  };
}

async function list() {
  const all = await raw();
  return CATALOG.map((p) => publicRow(p, all[p.id]));
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

async function check(id, s) {
  const k = s.apiKey;
  let r;
  let models = [];
  switch (id) {
    case 'openai':
      r = await getJSON('https://api.openai.com/v1/models', { Authorization: `Bearer ${k}` });
      models = (r.data.data || []).map((m) => m.id).filter((m) => /^(gpt|o\d|chatgpt|gpt-image|dall-e)/.test(m));
      break;
    case 'gemini':
      r = await getJSON('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': k });
      models = (r.data.models || []).map((m) => String(m.name).replace('models/', '')).filter((m) => /gemini|veo|imagen/.test(m));
      break;
    case 'anthropic':
      r = await getJSON('https://api.anthropic.com/v1/models?limit=100', { 'x-api-key': k, 'anthropic-version': '2023-06-01' });
      models = (r.data.data || []).map((m) => m.id);
      break;
    case 'openrouter':
      r = await getJSON('https://openrouter.ai/api/v1/key', { Authorization: `Bearer ${k}` });
      if (r.status === 404) r = await getJSON('https://openrouter.ai/api/v1/auth/key', { Authorization: `Bearer ${k}` });
      break;
    case 'xai':
      r = await getJSON('https://api.x.ai/v1/models', { Authorization: `Bearer ${k}` });
      models = (r.data.data || []).map((m) => m.id);
      break;
    case 'deepseek':
      r = await getJSON('https://api.deepseek.com/models', { Authorization: `Bearer ${k}` });
      models = (r.data.data || []).map((m) => m.id);
      break;
    default:
      return { status: 'saved', models: [] }; // video providers: verified on first use
  }
  if (r.ok) return { status: 'active', models: models.sort().slice(0, 300) };
  return { status: r.status === 401 || r.status === 403 || r.status === 400 ? 'invalid' : 'error', error: pickMsg(r.data, r.status), models: [] };
}

async function connect(id, body) {
  const p = byId[id];
  if (!p) throw err(404, 'مزوّد غير معروف');
  const fields = p.fields || ['apiKey'];
  const s = {};
  for (const f of fields) {
    const v = String(body?.[f] || '').trim();
    if (!v || v.length < 8) throw err(400, 'أدخل المفتاح كاملاً');
    if (/\s/.test(v)) throw err(400, 'المفتاح فيه مسافات. انسخه مرة أخرى');
    s[f] = v;
  }
  const c = await check(id, s).catch((e) => ({ status: 'error', error: e.message, models: [] }));
  if (c.status === 'invalid') throw err(400, `المفتاح مرفوض من ${p.name}: ${c.error}`);
  const main = s.apiKey || s.accessKey;
  await store.update(DOC, {}, (all) => {
    all[id] = { enc: encrypt(JSON.stringify(s)), last4: main.slice(-4), status: c.status, error: c.error || null, models: c.models, addedAt: Date.now(), testedAt: Date.now() };
    return all;
  });
  await autoDefaults(id);
  return publicRow(p, (await raw())[id]);
}

async function test(id) {
  const p = byId[id];
  const s = await secret(id);
  if (!p || !s) throw err(404, 'المزوّد غير مربوط');
  const started = Date.now();
  const c = await check(id, s).catch((e) => ({ status: 'error', error: e.message, models: [] }));
  await store.update(DOC, {}, (all) => {
    if (all[id]) Object.assign(all[id], { status: c.status, error: c.error || null, testedAt: Date.now(), ...(c.models.length ? { models: c.models } : {}) });
    return all;
  });
  await store.logEvent({ kind: 'test', provider: id, status: c.status === 'active' || c.status === 'saved' ? 200 : 502, ms: Date.now() - started, error: c.error });
  return { ...publicRow(p, (await raw())[id]), ms: Date.now() - started };
}

async function disconnect(id) {
  await store.update(DOC, {}, (all) => {
    delete all[id];
    return all;
  });
  const st = await settings();
  for (const kind of ['text', 'image', 'video']) if (st[kind]?.provider === id) delete st[kind];
  await store.writeJSON(SETTINGS, st);
}

// ---------- which provider/model is used for what ----------
async function settings() {
  return store.readJSON(SETTINGS, {});
}

async function setSettings(body) {
  const st = await settings();
  const all = await raw();
  for (const kind of ['text', 'image', 'video']) {
    const v = body?.[kind];
    if (!v) continue;
    const p = byId[v.provider];
    if (!p || !p.kinds.includes(kind)) throw err(400, 'مزوّد غير مناسب');
    if (!all[p.id]) throw err(400, `اربط مفتاح ${p.name} أولاً`);
    st[kind] = { provider: p.id, model: String(v.model || p.defaults?.[kind] || '').trim().slice(0, 120) };
  }
  return store.writeJSON(SETTINGS, st);
}

async function autoDefaults(id) {
  const p = byId[id];
  const st = await settings();
  let changed = false;
  for (const kind of p.kinds) {
    if (!st[kind] && p.defaults?.[kind] && !p.soon) {
      st[kind] = { provider: id, model: p.defaults[kind] };
      changed = true;
    }
  }
  if (changed) await store.writeJSON(SETTINGS, st);
}

// Resolves { provider, model, secret } for a job; throws a clear Arabic error when missing.
async function resolve(kind, override) {
  const st = await settings();
  const pick = override?.provider ? { provider: override.provider, model: override.model } : st[kind];
  const label = { text: 'الكتابة والتحليل', image: 'الصور', video: 'الفيديو' }[kind];
  if (!pick?.provider) throw err(412, `لا يوجد مزوّد لـ${label}. أضف مفتاحك من صفحة "المفاتيح والمزوّدون".`);
  const p = byId[pick.provider];
  const s = await secret(pick.provider);
  if (!p || !s) throw err(412, `مفتاح ${p?.name || pick.provider} غير مربوط. أضفه من صفحة "المفاتيح والمزوّدون".`);
  return { provider: p.id, name: p.name, model: pick.model || p.defaults?.[kind], secret: s };
}

module.exports = { CATALOG, list, connect, test, disconnect, settings, setSettings, resolve, secret };
