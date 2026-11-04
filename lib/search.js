// Web research for Layer 2, using only the platform's built-in providers. Order:
// 1) A model that searches the web itself: Gemini (Google Search), OpenAI (web_search), Claude (web_search)
// 2) Tavily search (own key) + the text model
// 3) No web access: the text model's own knowledge, clearly flagged as unverified.
const providers = require('./providers');
const ai = require('./ai');
const store = require('./store');

const err = (status, message) => Object.assign(new Error(message), { status });

// Only the platform's own providers are used for web research (no custom gateways).
async function connected(id) {
  const all = await providers.list();
  return all.some((p) => p.id === id && p.connected);
}
const key = async (id) => (await providers.secret(id)).apiKey;

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

// Each method searches the web itself and returns { text, sources }.
const METHODS = [
  ['gemini', 'Gemini · Google Search', async (prompt) => {
    const d = await postJSON('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', { 'x-goog-api-key': await key('gemini') }, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ googleSearch: {} }],
    }, 180000);
    const c = d.candidates?.[0];
    return {
      text: (c?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join(''),
      sources: (c?.groundingMetadata?.groundingChunks || []).map((x) => x.web).filter(Boolean).map((w) => ({ title: w.title || '', url: w.uri })),
    };
  }],
  ['openai', 'OpenAI · Web search', async (prompt) => {
    let last;
    for (const model of ['gpt-5-mini', 'gpt-4.1-mini']) {
      try {
        const d = await postJSON('https://api.openai.com/v1/responses', { Authorization: `Bearer ${await key('openai')}` }, { model, input: prompt, tools: [{ type: 'web_search' }] }, 200000);
        const parts = (d.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text');
        return { text: parts.map((p) => p.text).join(''), sources: parts.flatMap((p) => (p.annotations || []).filter((a) => a.url).map((a) => ({ title: a.title || '', url: a.url }))) };
      } catch (e) { last = e; }
    }
    throw last;
  }],
  ['anthropic', 'Claude · Web search', async (prompt) => {
    const d = await postJSON('https://api.anthropic.com/v1/messages', { 'x-api-key': await key('anthropic'), 'anthropic-version': '2023-06-01' }, {
      model: 'claude-sonnet-4-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    }, 200000);
    const blocks = d.content || [];
    const sources = [];
    for (const bl of blocks) {
      if (bl.type === 'web_search_tool_result') for (const r of bl.content || []) if (r.url) sources.push({ title: r.title || '', url: r.url });
      if (bl.type === 'text') for (const c of bl.citations || []) if (c.url) sources.push({ title: c.title || '', url: c.url });
    }
    return { text: blocks.filter((bl) => bl.type === 'text').map((bl) => bl.text).join(''), sources };
  }],
];

async function webSearchJSON(prompt, { brand, kind }) {
  let last;
  for (const [id, label, fn] of METHODS) {
    if (!(await connected(id))) continue;
    const started = Date.now();
    try {
      const r = await fn(prompt);
      const seen = new Set();
      const sources = r.sources.filter((x) => x.url && !seen.has(x.url) && seen.add(x.url)).slice(0, 30);
      const json = ai.parseJSON(r.text);
      await store.logEvent({ kind, brand, provider: id, model: 'web-search', status: 200, ms: Date.now() - started });
      return { json, sources, via: label };
    } catch (e) {
      last = e;
      await store.logEvent({ kind, brand, provider: id, model: 'web-search', status: e.status || 500, ms: Date.now() - started, error: e.message });
    }
  }
  return last ? { error: last } : null;
}

async function tavily(queries, { brand }) {
  if (!(await connected('tavily'))) return null;
  const k = await key('tavily');
  const results = [];
  try {
    for (const q of queries.slice(0, 5)) {
      const d = await postJSON('https://api.tavily.com/search', { Authorization: `Bearer ${k}` }, { query: q, max_results: 6, search_depth: 'basic' }, 60000);
      for (const x of d.results || []) results.push({ title: x.title, url: x.url, content: String(x.content || '').slice(0, 900) });
    }
    await store.logEvent({ kind: 'search', brand, provider: 'tavily', model: 'tavily', status: 200 });
  } catch (e) {
    await store.logEvent({ kind: 'search', brand, provider: 'tavily', model: 'tavily', status: e.status || 500, error: e.message });
  }
  return results.length ? { results, via: 'Tavily' } : null;
}

// Research with the best available method. `queries` are used for Tavily; `prompt` asks for JSON matching `schema`.
async function research(prompt, schema, queries, { brand, kind = 'research' } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const jsonRule = `\n\nToday is ${today}. Reply with ONLY valid JSON (no markdown) matching this JSON schema:\n${JSON.stringify(schema)}\nFor every claim set "basis": "fact" only when a source states it, "observation" for patterns you saw in sources, "inference" for your own deduction. Put the source URL in "source" when you have one. Never invent numbers, sales or ad results.`;
  const g = await webSearchJSON(prompt + jsonRule, { brand, kind });
  if (g && !g.error) return { ...g, web: true };
  const t = await tavily(queries, { brand });
  if (t) {
    const ctx = t.results.map((x, i) => `[${i + 1}] ${x.title} — ${x.url}\n${x.content}`).join('\n\n');
    const out = await ai.json(`${prompt}\n\n=== WEB SEARCH RESULTS (cite by URL) ===\n${ctx}`, schema, { kind, brand, system: jsonRule.trim() });
    return { json: out.json, sources: t.results.map((x) => ({ title: x.title, url: x.url })), via: `${t.via} + ${out.providerName || out.provider} · ${out.model}`, web: true };
  }
  const out = await ai.json(`${prompt}\n\nYou have NO web access for this task: rely on what you know, mark everything as "inference", and say so.`, schema, { kind, brand });
  return { json: out.json, sources: [], via: `${out.providerName || out.provider} · ${out.model} (بدون بحث على الإنترنت)`, web: false };
}

module.exports = { research };
