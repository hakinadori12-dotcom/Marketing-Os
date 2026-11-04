// Video studio: text → video and image → video, as background jobs.
// Supported now: Hakim AI Gateway / any gateway with /v1/videos (Veo on Vertex),
// Google Gemini API key (Veo), OpenAI (Sora). Finished videos are copied to our storage.
const store = require('./store');
const brands = require('./brands');
const providers = require('./providers');
const { randomId } = require('./crypto');

const err = (status, message) => Object.assign(new Error(message), { status });
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

// Allowed clip lengths per model family (seconds).
function durations(model) {
  const m = String(model).toLowerCase();
  if (/sora/.test(m)) return [4, 8, 12];
  if (/veo-2/.test(m)) return [5, 6, 7, 8];
  if (/veo/.test(m)) return [4, 6, 8];
  return [5, 8, 10];
}

async function req(url, { method = 'GET', headers = {}, body, raw = false, timeout = 60000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers: raw ? headers : { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: raw ? body : body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`;
      throw err(res.status === 401 || res.status === 403 ? 424 : res.status === 429 ? 429 : 502, typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw err(504, 'انتهت مهلة المزوّد');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function geminiRoot(baseUrl) {
  return baseUrl.replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '');
}

// ---------- start ----------
async function startRemote(r, p) {
  const model = r.model.replace(/^models\//, '');
  if (r.custom) {
    const base = r.baseUrl.replace(/\/+$/, '');
    const body = { prompt: p.prompt, model, durationSeconds: p.seconds, aspectRatio: p.aspect, generateAudio: p.audio, resolution: p.resolution };
    if (p.image) Object.assign(body, { imageBase64: p.image.b64, imageMimeType: p.image.mime });
    const d = await req(`${base}/videos`, { method: 'POST', headers: { Authorization: `Bearer ${r.secret.apiKey}`, 'x-api-key': r.secret.apiKey }, body });
    if (!d.id) throw err(502, 'المزوّد لم يُرجع رقم المهمة');
    return { kind: 'gateway', base, id: d.id };
  }
  if (r.provider === 'gemini') {
    const instance = { prompt: p.prompt };
    if (p.image) instance.image = { bytesBase64Encoded: p.image.b64, mimeType: p.image.mime };
    const parameters = { aspectRatio: p.aspect, durationSeconds: p.seconds };
    if (p.resolution) parameters.resolution = p.resolution;
    const d = await req(`${GEMINI}/models/${encodeURIComponent(model)}:predictLongRunning`, { method: 'POST', headers: { 'x-goog-api-key': r.secret.apiKey }, body: { instances: [instance], parameters } });
    if (!d.name) throw err(502, 'Gemini لم يُرجع رقم المهمة');
    return { kind: 'gemini', id: d.name };
  }
  if (r.provider === 'openai') {
    const fd = new FormData();
    fd.append('model', model);
    fd.append('prompt', p.prompt);
    fd.append('seconds', String(p.seconds));
    fd.append('size', p.aspect === '9:16' ? '720x1280' : '1280x720');
    if (p.image) fd.append('input_reference', new Blob([Buffer.from(p.image.b64, 'base64')], { type: p.image.mime }), 'ref.' + (p.image.mime.split('/')[1] || 'png'));
    const d = await req('https://api.openai.com/v1/videos', { method: 'POST', headers: { Authorization: `Bearer ${r.secret.apiKey}` }, body: fd, raw: true });
    return { kind: 'openai', id: d.id };
  }
  throw err(400, `${r.name}: توليد الفيديو عبر هذا المزوّد قادم قريباً`);
}

async function loadImage(url) {
  const m = String(url || '').match(/^\/api\/file\/([a-f0-9]+)$/);
  if (m) {
    const f = await store.readFile(m[1]);
    return f && { mime: f.contentType, b64: f.buffer.toString('base64') };
  }
  if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(String(url))) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return { mime: res.headers.get('content-type') || 'image/png', b64: Buffer.from(await res.arrayBuffer()).toString('base64') };
}

// New version of an existing video: same settings + the requested change (models regenerate, they do not edit pixels).
async function edit(brandId, id, body) {
  const rows = await store.listItems(`videos:${brandId}`, 0, 200);
  const src = rows.find((x) => x.id === id);
  if (!src) throw err(404, 'الفيديو غير موجود');
  const change = String(body.instruction || '').trim().slice(0, 1000);
  if (!change) throw err(400, 'اكتب التعديل المطلوب');
  const root = src.root || src.id;
  const version = rows.filter((x) => (x.root || x.id) === root).reduce((m, x) => Math.max(m, x.version || 1), 1) + 1;
  return start(brandId, {
    prompt: `${src.prompt}\n\nChange compared with the previous version: ${change}. Keep everything else the same.`,
    voiceover: body.voiceover ?? src.voiceover, aspect: src.aspect, seconds: src.seconds, imageUrl: src.fromImage || undefined,
    ai: body.ai?.provider && body.ai.provider !== 'auto' ? body.ai : { provider: src.provider, model: src.model },
    _meta: { root, parent: src.id, version, edit: change, basePrompt: src.prompt },
  });
}

async function start(brandId, body) {
  const b = await brands.get(brandId);
  const prompt = String(body.prompt || '').trim().slice(0, 3000);
  if (!prompt) throw err(400, 'اكتب وصف الفيديو');
  const aspect = body.aspect === '9:16' ? '9:16' : '16:9';
  const image = body.imageUrl ? await loadImage(body.imageUrl) : null;
  const list = await providers.candidates('video', body.ai?.provider ? { provider: String(body.ai.provider), model: String(body.ai.model || '') } : undefined, 6);
  if (!list.length) throw err(412, 'لا يوجد نموذج فيديو. اربط مفتاحاً يدعم الفيديو (Gemini/Veo، OpenAI/Sora، أو Hakim AI Gateway).');
  const brandLine = [b.name, b.fields?.industry?.value, (b.visual?.colors || []).length ? `brand colours ${b.visual.colors.join(', ')} (use them in the scene, never as written text)` : ''].filter(Boolean).join(' · ');
  const fullPrompt = `${prompt}\n\nBrand context: ${brandLine}.${body.voiceover ? `\nVoice-over / dialogue (spoken, natural, in the language written): "${String(body.voiceover).slice(0, 500)}"` : ''}`;
  const failed = [];
  for (const r of list) {
    const allowed = durations(r.model);
    const seconds = allowed.includes(Number(body.seconds)) ? Number(body.seconds) : allowed.reduce((a, x) => (Math.abs(x - Number(body.seconds || 8)) < Math.abs(a - Number(body.seconds || 8)) ? x : a), allowed[0]);
    const started = Date.now();
    try {
      const remote = await startRemote(r, { prompt: fullPrompt, aspect, seconds, audio: body.audio !== false, resolution: body.resolution === '1080p' ? '1080p' : '720p', image });
      const job = {
        id: `${Date.now().toString(36)}${randomId(3)}`, status: 'processing', prompt, voiceover: body.voiceover || '', aspect, seconds,
        provider: r.provider, providerName: r.name, model: r.model, remote, createdAt: new Date().toISOString(), fromImage: body.imageUrl || null,
        fallback: failed.length ? { from: failed.map((f) => `${f.name} · ${f.model}`) } : undefined,
        ...(body._meta ? { root: body._meta.root, parent: body._meta.parent, version: body._meta.version, edit: body._meta.edit } : {}),
      };
      await store.pushItem(`videos:${brandId}`, job, 200);
      await store.logEvent({ kind: 'video', brand: brandId, provider: r.provider, model: r.model, status: 200, ms: Date.now() - started, seconds });
      return publicJob(job);
    } catch (e) {
      failed.push({ name: r.name, model: r.model, error: e.message });
      await store.logEvent({ kind: 'video', brand: brandId, provider: r.provider, model: r.model, status: e.status || 500, ms: Date.now() - started, error: e.message });
    }
  }
  throw err(502, failed.length > 1 ? `فشلت كل نماذج الفيديو (${failed.map((f) => `${f.name} · ${f.model}`).join('، ')}). آخر خطأ: ${failed[failed.length - 1].error}` : failed[0].error);
}

// ---------- status ----------
async function checkRemote(job) {
  const all = await providers.list();
  const pv = all.find((x) => x.id === job.provider);
  const s = await providers.secret(job.provider);
  if (!pv || !s) throw err(404, 'المزوّد الذي ولّد هذا الفيديو لم يعد مربوطاً');
  const rm = job.remote;
  if (rm.kind === 'gateway') {
    const d = await req(`${rm.base}/videos/${encodeURIComponent(rm.id)}`, { headers: { Authorization: `Bearer ${s.apiKey}`, 'x-api-key': s.apiKey } });
    if (d.status === 'processing') return { done: false };
    if (d.status === 'completed' && d.videos?.[0]?.url) return { done: true, download: { url: d.videos[0].url } };
    return { done: true, error: d.status === 'blocked' ? 'رفض المزوّد الفيديو بسبب سياسة المحتوى. عدّل الوصف.' : d.error?.message || 'فشل التوليد' };
  }
  if (rm.kind === 'gemini') {
    const d = await req(`${GEMINI}/${rm.id}`, { headers: { 'x-goog-api-key': s.apiKey } });
    if (!d.done) return { done: false };
    if (d.error) return { done: true, error: d.error.message || 'فشل التوليد' };
    const v = d.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
    if (!v?.uri) return { done: true, error: 'رفض المزوّد الفيديو بسبب سياسة المحتوى. عدّل الوصف.' };
    return { done: true, download: { url: v.uri, headers: { 'x-goog-api-key': s.apiKey } } };
  }
  if (rm.kind === 'openai') {
    const d = await req(`https://api.openai.com/v1/videos/${rm.id}`, { headers: { Authorization: `Bearer ${s.apiKey}` } });
    if (['queued', 'in_progress'].includes(d.status)) return { done: false, progress: d.progress };
    if (d.status === 'completed') return { done: true, download: { url: `https://api.openai.com/v1/videos/${rm.id}/content`, headers: { Authorization: `Bearer ${s.apiKey}` } } };
    return { done: true, error: d.error?.message || 'فشل التوليد' };
  }
  return { done: true, error: 'نوع مهمة غير معروف' };
}

function publicJob(j) {
  const { remote, ...rest } = j;
  return rest;
}

async function updateJob(brandId, id, patch) {
  const rows = await store.listItems(`videos:${brandId}`, 0, 200);
  const next = rows.map((x) => (x.id === id ? { ...x, ...patch } : x));
  await store.replaceItems(`videos:${brandId}`, next);
  return next.find((x) => x.id === id);
}

async function status(brandId, id) {
  const rows = await store.listItems(`videos:${brandId}`, 0, 200);
  const job = rows.find((x) => x.id === id);
  if (!job) throw err(404, 'الفيديو غير موجود');
  if (job.status !== 'processing') return publicJob(job);
  let c;
  try {
    c = await checkRemote(job);
  } catch (e) {
    if (Date.now() - new Date(job.createdAt).getTime() > 30 * 60000) return publicJob(await updateJob(brandId, id, { status: 'failed', error: e.message }));
    return { ...publicJob(job), note: e.message };
  }
  if (!c.done) return { ...publicJob(job), progress: c.progress };
  if (c.error) return publicJob(await updateJob(brandId, id, { status: 'failed', error: c.error }));
  const res = await fetch(c.download.url, { headers: c.download.headers || {}, redirect: 'follow' });
  if (!res.ok) return { ...publicJob(job), note: `تعذّر تحميل الفيديو بعد (${res.status})` };
  const buf = Buffer.from(await res.arrayBuffer());
  let url;
  try {
    url = (await store.saveFile(`videos/${brandId}/${job.id}.mp4`, buf, 'video/mp4')).url;
  } catch (e) {
    if (c.download.headers) throw e;
    url = c.download.url; // temporary link from the gateway (valid ~24h)
  }
  return publicJob(await updateJob(brandId, id, { status: 'completed', url, size: buf.length, doneAt: new Date().toISOString() }));
}

async function list(brandId) {
  return (await store.listItems(`videos:${brandId}`, 0, 60)).map(publicJob);
}

async function remove(brandId, id) {
  const rows = await store.listItems(`videos:${brandId}`, 0, 200);
  const j = rows.find((x) => x.id === id);
  if (j?.url) await store.deleteFile(j.url).catch(() => {});
  await store.replaceItems(`videos:${brandId}`, rows.filter((x) => x.id !== id));
}

module.exports = { start, edit, status, list, remove, durations };
