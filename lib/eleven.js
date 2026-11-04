// ElevenLabs key pools: every brand (profile) keeps its own list of API keys (100+ is fine).
// Keys are encrypted at rest; calls rotate across keys, using the one with the most
// characters left, and fall over to the next key on quota / auth / rate-limit errors.
const store = require('./store');
const { encrypt, decrypt, sha256, randomId } = require('./crypto');

const API = 'https://api.elevenlabs.io';
const file = (brandId) => `keys/${brandId}.json`;
const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', note: 'أفضل جودة للعربية' },
  { id: 'eleven_v3', name: 'Eleven v3', note: 'الأكثر تعبيراً' },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', note: 'الأسرع والأرخص' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', note: 'سريع وجودة جيدة' },
];

function publicKey(k) {
  const { secret, hash, ...rest } = k;
  const remaining = k.charLimit != null && k.charCount != null ? Math.max(0, k.charLimit - k.charCount) : null;
  return { ...rest, remaining };
}

async function rawKeys(brandId) {
  return store.readJSON(file(brandId), [], { fresh: true });
}

async function listKeys(brandId) {
  const keys = await store.readJSON(file(brandId), []);
  return keys.map(publicKey);
}

function summarize(keys) {
  const s = { total: keys.length, active: 0, exhausted: 0, invalid: 0, disabled: 0, error: 0, remaining: 0, limit: 0 };
  for (const k of keys) {
    s[k.status] = (s[k.status] || 0) + 1;
    if (k.status === 'active' && k.charLimit != null) {
      s.remaining += Math.max(0, k.charLimit - (k.charCount || 0));
      s.limit += k.charLimit;
    }
  }
  return s;
}

// Parses pasted text: one key per line, optionally "label, key" / "label | key" / "label: key".
function parseLines(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(.*?)[\s]*[,|;:\t][\s]*([A-Za-z0-9_\-]{20,})$/);
    if (m && m[1]) out.push({ label: m[1].trim().slice(0, 60), key: m[2] });
    else {
      const key = line.split(/\s+/).pop();
      if (/^[A-Za-z0-9_\-]{20,}$/.test(key)) out.push({ label: '', key });
    }
  }
  return out;
}

async function elFetch(key, path, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeout || 15000);
  try {
    return await fetch(API + path, {
      ...init,
      signal: ctrl.signal,
      headers: { 'xi-api-key': key, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function errorInfo(res) {
  const txt = await res.text().catch(() => '');
  let detail = {};
  try {
    detail = JSON.parse(txt).detail || {};
  } catch {
    /* plain text */
  }
  const status = typeof detail === 'object' ? detail.status || '' : '';
  const message = (typeof detail === 'object' ? detail.message : String(detail)) || txt.slice(0, 200) || `HTTP ${res.status}`;
  return { code: res.status, status: String(status), message: String(message).slice(0, 240) };
}

// Checks one key and returns the fields to merge into it.
async function checkKey(secret) {
  try {
    const res = await elFetch(secret, '/v1/user/subscription', { timeout: 12000 });
    if (res.ok) {
      const d = await res.json();
      return {
        status: d.character_count >= d.character_limit ? 'exhausted' : 'active',
        charCount: d.character_count ?? null,
        charLimit: d.character_limit ?? null,
        tier: d.tier || null,
        resetAt: d.next_character_count_reset_unix ? d.next_character_count_reset_unix * 1000 : null,
        lastError: null,
        checkedAt: Date.now(),
      };
    }
    const e = await errorInfo(res);
    // A key restricted to TTS only cannot read the subscription; it is still usable.
    if (/permission/i.test(e.status + e.message)) {
      return { status: 'active', tier: 'restricted', lastError: null, checkedAt: Date.now() };
    }
    if (/quota/i.test(e.status + e.message)) return { status: 'exhausted', lastError: e.message, checkedAt: Date.now() };
    if (e.code === 401 || e.code === 403) return { status: 'invalid', lastError: e.message, checkedAt: Date.now() };
    return { status: 'error', lastError: e.message, checkedAt: Date.now() };
  } catch (err) {
    return { status: 'error', lastError: err.name === 'AbortError' ? 'Timeout' : err.message, checkedAt: Date.now() };
  }
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

async function addKeys(brandId, text) {
  const parsed = parseLines(text);
  if (!parsed.length) throw Object.assign(new Error('لم أجد أي مفتاح صالح في النص'), { status: 400 });
  if (parsed.length > 500) throw Object.assign(new Error('أقصى عدد في المرة الواحدة 500 مفتاح'), { status: 400 });
  const existing = await rawKeys(brandId);
  const seen = new Set(existing.map((k) => k.hash));
  const fresh = [];
  let duplicates = 0;
  for (const p of parsed) {
    const hash = sha256(p.key);
    if (seen.has(hash)) {
      duplicates++;
      continue;
    }
    seen.add(hash);
    fresh.push(p);
  }
  const checks = await pool(fresh, 10, (p) => checkKey(p.key));
  const now = Date.now();
  const newKeys = fresh.map((p, i) => ({
    id: randomId(6),
    label: p.label || `مفتاح ${existing.length + i + 1}`,
    last4: p.key.slice(-4),
    hash: sha256(p.key),
    secret: encrypt(p.key),
    enabled: true,
    uses: 0,
    addedAt: now,
    lastUsed: null,
    ...checks[i],
  }));
  await store.update(file(brandId), [], (keys) => keys.concat(newKeys));
  const summary = { added: newKeys.length, duplicates, active: 0, invalid: 0, exhausted: 0, error: 0 };
  for (const k of newKeys) summary[k.status] = (summary[k.status] || 0) + 1;
  return summary;
}

async function testKeys(brandId, ids) {
  const keys = await rawKeys(brandId);
  const targets = keys.filter((k) => !ids || ids.includes(k.id));
  const results = await pool(targets, 10, (k) => checkKey(decrypt(k.secret)));
  const byId = new Map(targets.map((k, i) => [k.id, results[i]]));
  const next = await store.update(file(brandId), [], (list) =>
    list.map((k) => (byId.has(k.id) ? { ...k, ...byId.get(k.id), status: k.enabled === false ? 'disabled' : byId.get(k.id).status } : k))
  );
  return summarize(next);
}

async function patchKey(brandId, id, patch) {
  await store.update(file(brandId), [], (list) =>
    list.map((k) => {
      if (k.id !== id) return k;
      const n = { ...k };
      if (patch.label !== undefined) n.label = String(patch.label).slice(0, 60);
      if (patch.enabled !== undefined) {
        n.enabled = Boolean(patch.enabled);
        n.status = n.enabled ? (k.status === 'disabled' ? 'active' : k.status) : 'disabled';
      }
      return n;
    })
  );
}

async function deleteKeys(brandId, ids) {
  const set = new Set(ids);
  let removed = 0;
  await store.update(file(brandId), [], (list) =>
    list.filter((k) => {
      if (set.has(k.id)) {
        removed++;
        return false;
      }
      return true;
    })
  );
  return removed;
}

// Order: active keys with the most characters left first; keys of unknown quota after them.
function candidates(keys, chars) {
  return keys
    .filter((k) => k.enabled !== false && (k.status === 'active' || k.status === 'error'))
    .filter((k) => k.charLimit == null || k.charLimit - (k.charCount || 0) >= chars)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      const ra = a.charLimit == null ? -1 : a.charLimit - (a.charCount || 0);
      const rb = b.charLimit == null ? -1 : b.charLimit - (b.charCount || 0);
      return rb - ra;
    });
}

function noKeyError(keys) {
  const msg = keys.length
    ? 'لا يوجد مفتاح ElevenLabs صالح فيه رصيد كافٍ لهذا البراند. أضف مفاتيح أو اختبرها من صفحة المفاتيح.'
    : 'هذا البراند ليس فيه أي مفتاح ElevenLabs بعد. أضف مفاتيحك من صفحة المفاتيح.';
  return Object.assign(new Error(msg), { status: 402 });
}

// Runs fn(secret, key) across the pool until one works. fn returns a Response.
async function withPool(brandId, chars, fn, maxTries = 6) {
  const keys = await rawKeys(brandId);
  const list = candidates(keys, chars);
  if (!list.length) throw noKeyError(keys);
  const updates = new Map();
  let lastErr;
  let tries = 0;
  for (const k of list.slice(0, maxTries)) {
    tries++;
    let res;
    try {
      res = await fn(decrypt(k.secret), k);
    } catch (err) {
      lastErr = { message: err.message, code: 502 };
      updates.set(k.id, { status: 'error', lastError: err.message });
      continue;
    }
    if (res.ok) {
      updates.set(k.id, {
        status: 'active',
        lastError: null,
        lastUsed: Date.now(),
        uses: (k.uses || 0) + 1,
        charCount: k.charCount != null ? k.charCount + chars : k.charCount,
      });
      await saveUpdates(brandId, updates);
      return { res, key: k, tries };
    }
    const e = await errorInfo(res);
    lastErr = e;
    if (/quota/i.test(e.status + e.message)) updates.set(k.id, { status: 'exhausted', lastError: e.message });
    else if ((e.code === 401 || e.code === 403) && !/permission/i.test(e.status + e.message)) updates.set(k.id, { status: 'invalid', lastError: e.message });
    else if (e.code === 429 || e.code >= 500) updates.set(k.id, { lastError: e.message });
    else break; // a request problem (bad voice, bad text): another key will not help
  }
  await saveUpdates(brandId, updates);
  throw Object.assign(new Error(lastErr?.message || 'ElevenLabs request failed'), { status: lastErr?.code === 400 || lastErr?.code === 422 ? 400 : 502, tries });
}

async function saveUpdates(brandId, updates) {
  if (!updates.size) return;
  await store.update(file(brandId), [], (list) => list.map((k) => (updates.has(k.id) ? { ...k, ...updates.get(k.id) } : k)));
}

const voiceCache = new Map();
// ElevenLabs default ("premade") voices: usable with any key, even when the key
// is not allowed to list voices. Shown when the account list is empty or unavailable.
const PREMADE = [
  ['EXAVITQu4vr4xnSDxMaL', 'Sarah', 'female', 'soft'], ['JBFqnCBsd6RMkjVDRZzb', 'George', 'male', 'warm'], ['FGY2WhTYpPnrIDTdsKH5', 'Laura', 'female', 'upbeat'],
  ['IKne3meq5aSn9XLyUdCD', 'Charlie', 'male', 'natural'], ['9BWtsMINqrJLrRacOk9x', 'Aria', 'female', 'expressive'], ['CwhRBWXzGAHq8TQ4Fs17', 'Roger', 'male', 'confident'],
  ['XB0fDUnXU5powFXDhCwa', 'Charlotte', 'female', 'warm'], ['onwK4e9ZLuTAKqWW03F9', 'Daniel', 'male', 'authoritative'], ['Xb7hH8MSUJpSbSDYk0k2', 'Alice', 'female', 'confident'],
  ['nPczCjzI2devNBz1zQrb', 'Brian', 'male', 'deep'], ['XrExE9yKIg1WjnnlVkGX', 'Matilda', 'female', 'friendly'], ['TX3LPaxmHKxFdv7VOQHJ', 'Liam', 'male', 'articulate'],
  ['cgSgspJ2msm6clMCkdW9', 'Jessica', 'female', 'expressive'], ['N2lVS1w4EtoT3dr4eOWO', 'Callum', 'male', 'intense'], ['pFZP5JQG7iQjIQuC4Bku', 'Lily', 'female', 'warm'],
  ['cjVigY5qzO86Huf0OWal', 'Eric', 'male', 'friendly'], ['iP95p4xoKVk53GoZ742B', 'Chris', 'male', 'casual'], ['bIHbv24MWmeRgasZH58o', 'Will', 'male', 'relaxed'],
  ['pqHfZKP75CvOlQylNhV4', 'Bill', 'male', 'trustworthy'], ['SAz9YHcvj6GT2YYXdXww', 'River', 'neutral', 'calm'],
].map(([id, name, gender, desc]) => ({ id, name, category: 'premade', labels: { gender, description: desc }, preview: null, access: 'free' }));

// Which voices work on which plan: default ("premade") and designed voices work on the free plan;
// library / professional / cloned voices need a paid ElevenLabs subscription when used through the API.
const FREE_CATS = ['premade', 'generated'];
const mapVoice = (v) => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels || {}, preview: v.preview_url || null, access: FREE_CATS.includes(v.category) ? 'free' : 'paid' });

// The brand's plan from its active keys (tier comes from /v1/user/subscription when the key can read it).
async function plan(brandId) {
  const keys = (await rawKeys(brandId)).filter((k) => k.status === 'active');
  const tiers = keys.map((k) => String(k.tier || '').toLowerCase()).filter(Boolean);
  if (tiers.some((t) => !['free', 'restricted'].includes(t))) return 'paid';
  if (tiers.includes('free')) return 'free';
  return 'unknown';
}

async function voices(brandId) {
  const hit = voiceCache.get(brandId);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.list;
  let list = [];
  let note = null;
  try {
    const { res } = await withPool(brandId, 0, (secret) => elFetch(secret, '/v2/voices?page_size=100'));
    list = ((await res.json()).voices || []).map(mapVoice);
  } catch (e) {
    note = e.message;
  }
  if (!list.length) {
    try {
      const { res } = await withPool(brandId, 0, (secret) => elFetch(secret, '/v1/voices'));
      list = ((await res.json()).voices || []).map(mapVoice);
    } catch (e) {
      note = note || e.message;
    }
  }
  // Always offer the default voices too (some keys cannot list voices but can still speak).
  const have = new Set(list.map((v) => v.id));
  list = list.concat(PREMADE.filter((v) => !have.has(v.id)));
  if (note && list.length === PREMADE.length) list.note = note;
  list.plan = await plan(brandId).catch(() => 'unknown');
  voiceCache.set(brandId, { at: Date.now(), list });
  return list;
}

async function tts(brandId, opts) {
  try {
    return await ttsOnce(brandId, opts);
  } catch (e) {
    if (/library voices|upgrade your subscription|paid_plan|voice.*not.*(available|found)/i.test(e.message)) {
      throw Object.assign(new Error('هذا الصوت «مدفوع»: حسابك في ElevenLabs مجاني ولا يسمح بأصوات المكتبة عبر الـ API. اختر صوتاً عليه علامة «مجاني»، أو اضغط «اقترح لي الأنسب» وسأختار لك من الأصوات المجانية.'), { status: 400, code: 'paid_voice' });
    }
    throw e;
  }
}

async function ttsOnce(brandId, { text, voiceId, voiceName, modelId, stability, similarity, style, speed }) {
  const clean = String(text || '').trim();
  if (!clean) throw Object.assign(new Error('اكتب النص أولاً'), { status: 400 });
  if (clean.length > 5000) throw Object.assign(new Error('النص طويل جداً (الحد 5000 حرف)'), { status: 400 });
  if (!voiceId) throw Object.assign(new Error('اختر صوتاً'), { status: 400 });
  const model = MODELS.some((m) => m.id === modelId) ? modelId : MODELS[0].id;
  const voice_settings = {
    stability: clamp(stability, 0.5),
    similarity_boost: clamp(similarity, 0.75),
    style: clamp(style, 0),
    use_speaker_boost: true,
  };
  if (speed) voice_settings.speed = Math.min(1.2, Math.max(0.7, Number(speed)));
  const started = Date.now();
  const { res, key, tries } = await withPool(brandId, clean.length, (secret) =>
    elFetch(secret, `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      timeout: 50000,
      headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: clean, model_id: model, voice_settings }),
    })
  );
  const audio = Buffer.from(await res.arrayBuffer());
  const id = `${Date.now()}-${randomId(3)}`;
  const saved = await store.saveFile(`audio/${brandId}/${id}.mp3`, audio, 'audio/mpeg');
  const item = { id, url: saved.url, text: clean.slice(0, 600), voiceId, voiceName: voiceName || '', model, chars: clean.length, keyLabel: key.label, createdAt: new Date().toISOString() };
  await store.pushItem(`audio:${brandId}`, item, 300);
  return { ...item, ms: Date.now() - started, key: { id: key.id, label: key.label }, tries };
}

function clamp(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
}

async function history(brandId, limit = 30) {
  return store.listItems(`audio:${brandId}`, 0, limit);
}

// Speech to text with ElevenLabs Scribe, using the brand's key pool.
async function speechToText(brandId, buffer, mime) {
  const { res } = await withPool(brandId, 0, (secret) => {
    const fd = new FormData();
    fd.append('model_id', 'scribe_v1');
    fd.append('file', new Blob([buffer], { type: mime }), 'voice.' + (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'));
    return elFetch(secret, '/v1/speech-to-text', { method: 'POST', timeout: 60000, body: fd });
  });
  const d = await res.json();
  return { text: String(d.text || '').trim(), language: d.language_code || null };
}

module.exports = { plan, speechToText, MODELS, listKeys, summarize, rawKeys, addKeys, testKeys, patchKey, deleteKeys, voices, tts, history, parseLines };
