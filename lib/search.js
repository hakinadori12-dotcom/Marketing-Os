// Web research for Layer 2. Order:
// 1) Gemini with Google Search grounding (direct Gemini key, or a gateway exposing Gemini)
// 2) Tavily search (own key, or Hakim AI Gateway /v1/tavily/search) + the text model
// 3) No web access: the text model's own knowledge, clearly flagged as unverified.
const providers = require('./providers');
const ai = require('./ai');
const store = require('./store');

const err = (status, message) => Object.assign(new Error(message), { status });

async function geminiRoutes() {
  const all = await providers.list();
  const routes = [];
  if (all.some((p) => p.id === 'gemini' && p.connected)) routes.push({ name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', id: 'gemini' });
  for (const p of all.filter((x) => x.connected && x.custom && x.compat !== 'anthropic')) {
    const model = p.models.find((m) => m === 'gemini-2.5-flash') || p.models.find((m) => /^gemini-[\d.]+-(flash|pro)$/.test(m));
    if (model) routes.push({ name: p.name, url: `${String(p.baseUrl).replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '')}/v1beta/models/${model}:generateContent`, id: p.id });
  }
  return routes;
}

async function tavilyRoutes() {
  const all = await providers.list();
  const routes = [];
  if (all.some((p) => p.id === 'tavily' && p.connected)) routes.push({ name: 'Tavily', url: 'https://api.tavily.com/search', id: 'tavily' });
  for (const p of all.filter((x) => x.connected && x.custom && x.compat !== 'anthropic')) {
    routes.push({ name: `${p.name} · Tavily`, url: `${String(p.baseUrl).replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '')}/v1/tavily/search`, id: p.id, gateway: true });
  }
  return routes;
}

async function postJSON(url, headers, body, timeout = 120000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw err(res.status === 401 || res.status === 403 ? 424 : 502, data?.error?.message || data?.detail?.error || data?.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw err(504, 'انتهت مهلة البحث');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// One grounded call: Gemini searches Google itself and answers with JSON (as text) + the web sources it used.
async function grounded(prompt, { brand, kind }) {
  const routes = await geminiRoutes();
  let last;
  for (const r of routes) {
    const started = Date.now();
    try {
      const k = (await providers.secret(r.id)).apiKey;
      const d = await postJSON(r.url, { 'x-goog-api-key': k, Authorization: `Bearer ${k}` }, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      }, 180000);
      const cand = d.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      const sources = (cand?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter(Boolean).map((w) => ({ title: w.title || w.domain || '', url: w.uri })).slice(0, 30);
      await store.logEvent({ kind, brand, provider: r.id, model: 'gemini+search', status: 200, ms: Date.now() - started });
      return { json: ai.parseJSON(text), sources, via: `${r.name} · Google Search` };
    } catch (e) {
      last = e;
      await store.logEvent({ kind, brand, provider: r.id, model: 'gemini+search', status: e.status || 500, ms: Date.now() - started, error: e.message });
    }
  }
  if (last) throw last;
  return null;
}

async function tavily(queries, { brand }) {
  const routes = await tavilyRoutes();
  for (const r of routes) {
    try {
      const k = (await providers.secret(r.id)).apiKey;
      const results = [];
      for (const q of queries.slice(0, 5)) {
        const d = await postJSON(r.url, { Authorization: `Bearer ${k}`, 'x-api-key': k }, r.gateway ? { query: q, max_results: 6, search_depth: 'basic' } : { query: q, max_results: 6, search_depth: 'basic', api_key: k }, 60000);
        for (const x of d.results || []) results.push({ title: x.title, url: x.url, content: String(x.content || '').slice(0, 900) });
      }
      await store.logEvent({ kind: 'search', brand, provider: r.id, model: 'tavily', status: 200, ms: 0 });
      if (results.length) return { results, via: r.name };
    } catch (e) {
      await store.logEvent({ kind: 'search', brand, provider: r.id, model: 'tavily', status: e.status || 500, error: e.message });
    }
  }
  return null;
}

// Research with the best available method. `queries` are used for Tavily; `prompt` asks for JSON matching `schema`.
async function research(prompt, schema, queries, { brand, kind = 'research' } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const jsonRule = `\n\nToday is ${today}. Reply with ONLY valid JSON (no markdown) matching this JSON schema:\n${JSON.stringify(schema)}\nFor every claim set "basis": "fact" only when a source states it, "observation" for patterns you saw in sources, "inference" for your own deduction. Put the source URL in "source" when you have one. Never invent numbers, sales or ad results.`;
  try {
    const g = await grounded(prompt + jsonRule, { brand, kind });
    if (g) return { ...g, web: true };
  } catch { /* try the next method */ }
  const t = await tavily(queries, { brand });
  if (t) {
    const ctx = t.results.map((x, i) => `[${i + 1}] ${x.title} — ${x.url}\n${x.content}`).join('\n\n');
    const out = await ai.json(`${prompt}\n\n=== WEB SEARCH RESULTS (cite by URL) ===\n${ctx}`, schema, { kind, brand, system: jsonRule.trim() });
    return { json: out.json, sources: t.results.map((x) => ({ title: x.title, url: x.url })), via: `${t.via} + ${out.provider} · ${out.model}`, web: true };
  }
  const out = await ai.json(`${prompt}\n\nYou have NO web access for this task: rely on what you know, mark everything as "inference", and say so.`, schema, { kind, brand });
  return { json: out.json, sources: [], via: `${out.provider} · ${out.model} (بدون بحث على الإنترنت)`, web: false };
}

module.exports = { research };
