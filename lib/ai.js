// One AI layer for every provider the user connected with their own key.
// text()/json() for writing and analysis, image() for the image studio.
const providers = require('./providers');
const store = require('./store');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY = new Set([429, 500, 502, 503, 504, 529]);
const err = (status, message) => Object.assign(new Error(message), { status });
// Errors that mean the whole provider is out right now (another try at it will not help).
const DEAD = /(exhausted|no candidate|quota|insufficient|billing|credit|balance|no key configured|suspended|payment)/i;

async function post(url, headers, body, { timeout = 240000, raw = false, tries = 3 } = {}) {
  let last;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: raw ? headers : { 'Content-Type': 'application/json', ...headers },
        body: raw ? body : JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      const msg = data?.error?.message || data?.error?.type || data?.message || (typeof data?.error === 'string' ? data.error : '') || `HTTP ${res.status}`;
      last = { status: res.status, msg };
      if (!RETRY.has(res.status) || attempt === tries || DEAD.test(msg)) break;
      await sleep(1500 * attempt);
    } catch (e) {
      last = { status: 504, msg: e.name === 'AbortError' ? 'انتهت مهلة المزوّد' : e.message };
      if (attempt === tries) break;
    } finally {
      clearTimeout(t);
    }
  }
  const status = last.status === 401 || last.status === 403 ? 424 : last.status === 429 ? 429 : 502;
  throw Object.assign(err(status, last.status === 401 || last.status === 403 ? `المفتاح مرفوض (${last.msg})` : last.msg), { httpStatus: last.status });
}

const OPENAI_COMPAT = {
  openai: 'https://api.openai.com/v1',
  xai: 'https://api.x.ai/v1',
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
};

// Converts a lowercase JSON schema to Gemini's responseSchema format.
function geminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type') out.type = String(v).toUpperCase();
    else if (k === 'properties') out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, geminiSchema(pv)]));
    else if (k === 'items') out.items = geminiSchema(v);
    else if (['description', 'enum', 'required'].includes(k)) out[k] = v;
  }
  return out;
}

// Tries the chosen model first, then the best backups (auto mode = best model for the task).
async function withFallback(kindAI, opts, once) {
  const list = await providers.candidates(kindAI, opts.override, 12);
  const maxTries = kindAI === 'text' ? 5 : 3;
  let tried = 0;
  const started = Date.now();
  const failed = [];
  const deadProviders = new Set();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (deadProviders.has(r.provider)) continue;
    if (tried++ >= maxTries) break;
    try {
      const out = await once(r, { tries: list.length > 1 ? 2 : 3 });
      if (failed.length) out.fallback = { from: failed.map((f) => `${f.name} · ${f.model}`), reason: failed[failed.length - 1].error };
      return out;
    } catch (e) {
      failed.push({ name: r.name, model: r.model, error: e.message });
      // the whole provider is out (no credit, all keys exhausted, key rejected): skip its other models
      if (e.status === 424 || DEAD.test(e.message) || /(rate.?limit|too many requests)/i.test(e.message)) deadProviders.add(r.provider);
      // stop early on problems another model will not fix, or when time is running out
      if (Date.now() - started > 200000) break;
    }
  }
  const last = failed[failed.length - 1];
  const triedList = failed.map((f) => `${f.name} · ${f.model}`).join('، ');
  const onlyDead = [...new Set(list.map((x) => x.provider))].every((p) => deadProviders.has(p));
  const hint = onlyDead ? ' كل المزوّدين المتاحين متوقفون أو نفد رصيدهم الآن. أضف مزوّداً آخر من "المفاتيح والمزوّدون" (مثلاً مفتاح Gemini المجاني).' : '';
  throw err(502, (failed.length > 1 ? `فشلت كل النماذج المجرَّبة (${triedList}). آخر خطأ: ${last.error}` : last?.error || 'فشل الطلب') + hint);
}

async function text(opts = {}) {
  return withFallback('text', opts, (r, o) => textOnce(r, { ...opts, ...o }));
}

async function textOnce(r, { system = '', prompt, schema = null, maxTokens = 8000, kind = 'text', brand, tries = 3 } = {}) {
  const started = Date.now();
  const sys = schema
    ? `${system}\n\nReturn ONLY valid JSON (no markdown fences) that matches this JSON schema:\n${JSON.stringify(schema)}`.trim()
    : system;
  let out;
  try {
    const compatBase = r.custom ? r.baseUrl.replace(/\/+$/, '') : OPENAI_COMPAT[r.provider];
    if (r.custom && r.compat === 'anthropic') {
      const body = { model: r.model, max_tokens: maxTokens, ...(sys ? { system: sys } : {}), messages: [{ role: 'user', content: prompt }] };
      const d = await post(`${compatBase}/messages`, { 'x-api-key': r.secret.apiKey, Authorization: `Bearer ${r.secret.apiKey}`, 'anthropic-version': '2023-06-01' }, body, { tries });
      out = { text: (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0 };
    } else if (compatBase) {
      const body = { model: r.model, messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: prompt }] };
      if (schema) body.response_format = { type: 'json_object' };
      const headers = { Authorization: `Bearer ${r.secret.apiKey}` };
      if (r.provider === 'openrouter') Object.assign(headers, { 'HTTP-Referer': 'https://marketing-os.app', 'X-Title': 'Marketing OS' });
      let d;
      try {
        d = await post(`${compatBase}/chat/completions`, headers, body, { tries });
      } catch (e) {
        // some gateways reject response_format: retry once without it
        if (!schema || !r.custom || ![400, 422].includes(e.httpStatus)) throw e;
        delete body.response_format;
        d = await post(`${compatBase}/chat/completions`, headers, body, { tries });
      }
      out = { text: d.choices?.[0]?.message?.content || '', inTok: d.usage?.prompt_tokens || 0, outTok: d.usage?.completion_tokens || 0 };
    } else if (r.provider === 'gemini') {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192), ...(schema ? { responseMimeType: 'application/json', responseSchema: geminiSchema(schema) } : {}) },
      };
      const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`, { 'x-goog-api-key': r.secret.apiKey }, body, { tries });
      const parts = d.candidates?.[0]?.content?.parts || [];
      out = { text: parts.filter((p) => !p.thought).map((p) => p.text || '').join(''), inTok: d.usageMetadata?.promptTokenCount || 0, outTok: (d.usageMetadata?.candidatesTokenCount || 0) + (d.usageMetadata?.thoughtsTokenCount || 0) };
      if (!out.text && d.promptFeedback?.blockReason) throw err(422, `Gemini رفض الطلب: ${d.promptFeedback.blockReason}`);
    } else if (r.provider === 'anthropic') {
      const body = { model: r.model, max_tokens: maxTokens, ...(sys ? { system: sys } : {}), messages: [{ role: 'user', content: prompt }] };
      const d = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': r.secret.apiKey, 'anthropic-version': '2023-06-01' }, body, { tries });
      out = { text: (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0 };
    } else {
      throw err(400, `${r.name} لا يدعم الكتابة بعد`);
    }
  } catch (e) {
    await store.logEvent({ kind, brand, provider: r.provider, model: r.model, status: e.status || 500, ms: Date.now() - started, error: e.message });
    throw e;
  }
  await store.logEvent({ kind, brand, provider: r.provider, model: r.model, status: 200, ms: Date.now() - started, inTok: out.inTok, outTok: out.outTok });
  return { ...out, provider: r.provider, providerName: r.name, model: r.model, ms: Date.now() - started };
}

function parseJSON(t) {
  const s = String(t || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1));
      } catch { /* fall through */ }
    }
    throw err(502, 'النموذج لم يُرجع JSON صالحاً. جرّب مرة أخرى أو غيّر النموذج.');
  }
}

async function json(prompt, schema, opts = {}) {
  const out = await text({ ...opts, prompt, schema });
  return { ...out, json: parseJSON(out.text) };
}

// ---------- images ----------
const OPENAI_SIZES = { '1:1': '1024x1024', '4:5': '1024x1536', '9:16': '1024x1536', '16:9': '1536x1024', '3:4': '1024x1536', '4:3': '1536x1024' };

// refs: [{ mime, b64 }] reference images (logo, product photo)
async function geminiImage(modelUrl, headers, model, prompt, aspect, refs) {
  if (/^imagen/i.test(model)) {
    const d = await post(`${modelUrl}:predict`, headers, { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspect) ? aspect : '1:1' } });
    return { b64: d.predictions?.[0]?.bytesBase64Encoded, mime: d.predictions?.[0]?.mimeType || 'image/png' };
  }
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }, ...refs.slice(0, 3).map((x) => ({ inlineData: { mimeType: x.mime, data: x.b64 } }))] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspect } },
  };
  const d = await post(`${modelUrl}:generateContent`, headers, body);
  const part = (d.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  const inl = part?.inlineData || part?.inline_data;
  if (!inl?.data) throw err(422, `لم يُرجع ${model} صورة${d.candidates?.[0]?.finishReason ? ` (${d.candidates[0].finishReason})` : ''}. عدّل الوصف وحاول مجدداً.`);
  return { b64: inl.data, mime: inl.mimeType || inl.mime_type || 'image/png' };
}

async function image(opts = {}) {
  return withFallback('image', opts, (r) => imageOnce(r, opts));
}

async function imageOnce(r, { prompt, aspect = '1:1', refs = [], quality = 'medium', brand } = {}) {
  const started = Date.now();
  let b64;
  let mime = 'image/png';
  try {
    const isGeminiModel = /gemini|banana|imagen/i.test(r.model);
    if (r.custom && isGeminiModel) {
      // Gemini-native route (Hakim AI Gateway and similar proxies): <root>/v1beta/models/<model>:generateContent
      const root = r.baseUrl.replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '');
      const model = r.model.replace(/^models\//, '');
      const gem = await geminiImage(`${root}/v1beta/models/${encodeURIComponent(model)}`, { 'x-goog-api-key': r.secret.apiKey, Authorization: `Bearer ${r.secret.apiKey}` }, model, prompt, aspect, refs);
      b64 = gem.b64;
      mime = gem.mime;
    } else if (r.custom) {
      const d = await post(`${r.baseUrl.replace(/\/+$/, '')}/images/generations`, { Authorization: `Bearer ${r.secret.apiKey}` }, { model: r.model, prompt, n: 1, size: OPENAI_SIZES[aspect] || '1024x1024', response_format: 'b64_json' });
      b64 = d.data?.[0]?.b64_json;
      if (!b64 && d.data?.[0]?.url) {
        const res = await fetch(d.data[0].url);
        mime = res.headers.get('content-type') || mime;
        b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
      }
    } else if (r.provider === 'gemini' && /^imagen/i.test(r.model)) {
      const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:predict`, { 'x-goog-api-key': r.secret.apiKey }, { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspect) ? aspect : '1:1' } });
      b64 = d.predictions?.[0]?.bytesBase64Encoded;
      mime = d.predictions?.[0]?.mimeType || mime;
    } else if (r.provider === 'openai') {
      const auth = { Authorization: `Bearer ${r.secret.apiKey}` };
      const size = OPENAI_SIZES[aspect] || '1024x1024';
      let d;
      if (refs.length) {
        const fd = new FormData();
        fd.append('model', r.model);
        fd.append('prompt', prompt);
        fd.append('size', size);
        fd.append('quality', quality);
        refs.slice(0, 4).forEach((x, i) => fd.append('image[]', new Blob([Buffer.from(x.b64, 'base64')], { type: x.mime }), `ref${i}.${x.mime.split('/')[1] || 'png'}`));
        d = await post('https://api.openai.com/v1/images/edits', auth, fd, { raw: true });
      } else {
        d = await post('https://api.openai.com/v1/images/generations', auth, { model: r.model, prompt, size, quality, n: 1 });
      }
      b64 = d.data?.[0]?.b64_json;
      if (!b64 && d.data?.[0]?.url) b64 = Buffer.from(await (await fetch(d.data[0].url)).arrayBuffer()).toString('base64');
    } else if (r.provider === 'gemini') {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }, ...refs.slice(0, 3).map((x) => ({ inlineData: { mimeType: x.mime, data: x.b64 } }))] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
      };
      const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`, { 'x-goog-api-key': r.secret.apiKey }, body);
      const part = (d.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      const inl = part?.inlineData || part?.inline_data;
      b64 = inl?.data;
      mime = inl?.mimeType || inl?.mime_type || mime;
      if (!b64) throw err(422, `لم يُرجع Gemini صورة${d.candidates?.[0]?.finishReason ? ` (${d.candidates[0].finishReason})` : ''}. عدّل الوصف وحاول مجدداً.`);
    } else if (r.provider === 'xai') {
      const d = await post('https://api.x.ai/v1/images/generations', { Authorization: `Bearer ${r.secret.apiKey}` }, { model: r.model, prompt, n: 1, response_format: 'b64_json' });
      b64 = d.data?.[0]?.b64_json;
      mime = 'image/jpeg';
    } else {
      throw err(400, `${r.name} للصور قادم قريباً`);
    }
    if (!b64) throw err(502, 'المزوّد لم يُرجع صورة');
  } catch (e) {
    await store.logEvent({ kind: 'image', brand, provider: r.provider, model: r.model, status: e.status || 500, ms: Date.now() - started, error: e.message });
    throw e;
  }
  const ms = Date.now() - started;
  await store.logEvent({ kind: 'image', brand, provider: r.provider, model: r.model, status: 200, ms });
  return { buffer: Buffer.from(b64, 'base64'), mime, provider: r.provider, model: r.model, ms };
}

async function quickTest() {
  const started = Date.now();
  try {
    const out = await text({ prompt: 'Reply with the single word: OK', maxTokens: 50, kind: 'test' });
    return { ok: true, ms: Date.now() - started, provider: out.provider, model: out.model, reply: out.text.trim().slice(0, 60) };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: e.message };
  }
}

// Reads a file (PDF, image) with a Gemini model that can see it: direct Gemini key or a gateway exposing Gemini.
async function geminiFileJSON(prompt, schema, file, { brand, kind = 'file' } = {}) {
  const all = await providers.list();
  const routes = [];
  if (all.some((p) => p.id === 'gemini' && p.connected)) routes.push({ name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', key: async () => (await providers.secret('gemini')).apiKey });
  for (const p of all.filter((x) => x.connected && x.custom && x.compat !== 'anthropic')) {
    const model = p.models.find((m) => m === 'gemini-2.5-flash') || p.models.find((m) => /^gemini-[\d.]+-(flash|pro)$/.test(m));
    if (model) routes.push({ name: p.name, url: `${String(p.baseUrl).replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '')}/v1beta/models/${model}:generateContent`, key: async () => (await providers.secret(p.id)).apiKey });
  }
  if (!routes.length) throw err(412, 'قراءة ملفات PDF تحتاج نموذج Gemini (مفتاح Gemini أو Gateway فيه Gemini). يمكنك لصق النص بدلاً من ذلك.');
  let last;
  for (const r of routes) {
    const started = Date.now();
    try {
      const k = await r.key();
      const d = await post(r.url, { 'x-goog-api-key': k, Authorization: `Bearer ${k}` }, {
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: file.mime, data: file.b64 } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema(schema) },
      }, { tries: 2 });
      const text = (d.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      await store.logEvent({ kind, brand, provider: r.name, model: 'gemini', status: 200, ms: Date.now() - started });
      return { json: parseJSON(text), provider: r.name };
    } catch (e) {
      last = e;
      await store.logEvent({ kind, brand, provider: r.name, status: e.status || 500, ms: Date.now() - started, error: e.message });
    }
  }
  throw last;
}

module.exports = { text, json, image, quickTest, parseJSON, geminiFileJSON };
