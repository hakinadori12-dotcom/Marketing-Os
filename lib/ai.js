// One AI layer for every provider the user connected with their own key.
// text()/json() for writing and analysis, image() for the image studio.
const providers = require('./providers');
const store = require('./store');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY = new Set([429, 500, 502, 503, 504, 529]);
const err = (status, message) => Object.assign(new Error(message), { status });

async function post(url, headers, body, { timeout = 240000, raw = false } = {}) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
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
      if (!RETRY.has(res.status) || attempt === 3) break;
      await sleep(1500 * attempt);
    } catch (e) {
      last = { status: 504, msg: e.name === 'AbortError' ? 'انتهت مهلة المزوّد' : e.message };
      if (attempt === 3) break;
    } finally {
      clearTimeout(t);
    }
  }
  const status = last.status === 401 || last.status === 403 ? 424 : last.status === 429 ? 429 : 502;
  throw err(status, last.status === 401 || last.status === 403 ? `المفتاح مرفوض (${last.msg})` : last.msg);
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

async function text({ system = '', prompt, schema = null, maxTokens = 8000, override, kind = 'text', brand } = {}) {
  const r = await providers.resolve('text', override);
  const started = Date.now();
  const sys = schema
    ? `${system}\n\nReturn ONLY valid JSON (no markdown fences) that matches this JSON schema:\n${JSON.stringify(schema)}`.trim()
    : system;
  let out;
  try {
    const compatBase = r.custom ? r.baseUrl.replace(/\/+$/, '') : OPENAI_COMPAT[r.provider];
    if (r.custom && r.compat === 'anthropic') {
      const body = { model: r.model, max_tokens: maxTokens, ...(sys ? { system: sys } : {}), messages: [{ role: 'user', content: prompt }] };
      const d = await post(`${compatBase}/messages`, { 'x-api-key': r.secret.apiKey, Authorization: `Bearer ${r.secret.apiKey}`, 'anthropic-version': '2023-06-01' }, body);
      out = { text: (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0 };
    } else if (compatBase) {
      const body = { model: r.model, messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: prompt }] };
      if (schema) body.response_format = { type: 'json_object' };
      const headers = { Authorization: `Bearer ${r.secret.apiKey}` };
      if (r.provider === 'openrouter') Object.assign(headers, { 'HTTP-Referer': 'https://marketing-os.app', 'X-Title': 'Marketing OS' });
      let d;
      try {
        d = await post(`${compatBase}/chat/completions`, headers, body);
      } catch (e) {
        // some gateways reject response_format: retry once without it
        if (!schema || !r.custom || e.status === 424) throw e;
        delete body.response_format;
        d = await post(`${compatBase}/chat/completions`, headers, body);
      }
      out = { text: d.choices?.[0]?.message?.content || '', inTok: d.usage?.prompt_tokens || 0, outTok: d.usage?.completion_tokens || 0 };
    } else if (r.provider === 'gemini') {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192), ...(schema ? { responseMimeType: 'application/json', responseSchema: geminiSchema(schema) } : {}) },
      };
      const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`, { 'x-goog-api-key': r.secret.apiKey }, body);
      const parts = d.candidates?.[0]?.content?.parts || [];
      out = { text: parts.filter((p) => !p.thought).map((p) => p.text || '').join(''), inTok: d.usageMetadata?.promptTokenCount || 0, outTok: (d.usageMetadata?.candidatesTokenCount || 0) + (d.usageMetadata?.thoughtsTokenCount || 0) };
      if (!out.text && d.promptFeedback?.blockReason) throw err(422, `Gemini رفض الطلب: ${d.promptFeedback.blockReason}`);
    } else if (r.provider === 'anthropic') {
      const body = { model: r.model, max_tokens: maxTokens, ...(sys ? { system: sys } : {}), messages: [{ role: 'user', content: prompt }] };
      const d = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': r.secret.apiKey, 'anthropic-version': '2023-06-01' }, body);
      out = { text: (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0 };
    } else {
      throw err(400, `${r.name} لا يدعم الكتابة بعد`);
    }
  } catch (e) {
    await store.logEvent({ kind, brand, provider: r.provider, model: r.model, status: e.status || 500, ms: Date.now() - started, error: e.message });
    throw e;
  }
  await store.logEvent({ kind, brand, provider: r.provider, model: r.model, status: 200, ms: Date.now() - started, inTok: out.inTok, outTok: out.outTok });
  return { ...out, provider: r.provider, model: r.model, ms: Date.now() - started };
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
async function image({ prompt, aspect = '1:1', refs = [], quality = 'medium', override, brand } = {}) {
  const r = await providers.resolve('image', override);
  const started = Date.now();
  let b64;
  let mime = 'image/png';
  try {
    if (r.custom) {
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

module.exports = { text, json, image, quickTest, parseJSON };
