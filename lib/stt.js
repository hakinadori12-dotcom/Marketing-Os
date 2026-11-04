// Voice input: turns a short recording into text.
// Order: ElevenLabs Scribe (brand keys) → OpenAI transcription → Gemini (direct key or a gateway).
const eleven = require('./eleven');
const providers = require('./providers');
const store = require('./store');

const err = (status, message) => Object.assign(new Error(message), { status });

async function viaOpenAI(apiKey, buffer, mime) {
  for (const model of ['gpt-4o-mini-transcribe', 'whisper-1']) {
    const fd = new FormData();
    fd.append('model', model);
    fd.append('file', new Blob([buffer], { type: mime }), 'voice.webm');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok) return String(d.text || '').trim();
    if (res.status === 401) throw err(424, d.error?.message || 'OpenAI key rejected');
  }
  throw err(502, 'OpenAI transcription failed');
}

async function viaGemini(url, headers, buffer, mime) {
  const body = {
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: mime.split(';')[0] || 'audio/webm', data: buffer.toString('base64') } },
      { text: 'Transcribe this voice message exactly as spoken, in its original language and dialect (for Moroccan Darija use Arabic letters). Output only the transcript, nothing else.' },
    ] }],
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw err(502, d.error?.message || `Gemini ${res.status}`);
  return (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function transcribe(brandId, dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/);
  if (!m) throw err(400, 'تسجيل غير صالح');
  const mime = m[1];
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length < 800) throw err(400, 'التسجيل قصير جداً');
  if (buffer.length > 4 * 1024 * 1024) throw err(400, 'التسجيل طويل جداً (حدّ أقصى دقيقتان تقريباً)');
  const started = Date.now();
  const tries = [];
  if (brandId) tries.push(['elevenlabs', () => eleven.speechToText(brandId, buffer, mime).then((r) => r.text)]);
  const all = await providers.list();
  for (const p of all.filter((x) => x.connected)) {
    if (p.id === 'openai') tries.push(['openai', async () => viaOpenAI((await providers.secret('openai')).apiKey, buffer, mime)]);
    if (p.id === 'gemini') tries.push(['gemini', async () => viaGemini('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', { 'x-goog-api-key': (await providers.secret('gemini')).apiKey }, buffer, mime)]);
    if (p.custom && p.compat !== 'anthropic' && p.models.some((x) => /^gemini-2\.5-flash$|^gemini-.*flash$/.test(x))) {
      const model = p.models.find((x) => x === 'gemini-2.5-flash') || p.models.find((x) => /^gemini-.*flash$/.test(x));
      const root = String(p.baseUrl).replace(/\/+$/, '').replace(/\/v\d+(beta)?$/, '');
      tries.push([p.id, async () => { const k = (await providers.secret(p.id)).apiKey; return viaGemini(`${root}/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': k, Authorization: `Bearer ${k}` }, buffer, mime); }]);
    }
  }
  const errors = [];
  for (const [name, fn] of tries) {
    try {
      const text = await fn();
      if (text) {
        await store.logEvent({ kind: 'stt', brand: brandId, provider: name, status: 200, ms: Date.now() - started });
        return { text, provider: name };
      }
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  await store.logEvent({ kind: 'stt', brand: brandId, provider: 'none', status: 502, ms: Date.now() - started, error: errors.join(' | ') });
  throw err(502, tries.length ? `تعذّر تحويل الصوت إلى نص. ${errors.slice(-1)[0] || ''}` : 'لا يوجد مزوّد لتحويل الصوت إلى نص. أضف مفتاح ElevenLabs للبراند أو مفتاح OpenAI أو Gemini.');
}

module.exports = { transcribe };
