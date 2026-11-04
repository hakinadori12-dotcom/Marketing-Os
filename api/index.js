// Marketing OS — single serverless entry point (all /api/* routes are rewritten here).
const store = require('../lib/store');
const brands = require('../lib/brands');
const eleven = require('../lib/eleven');
const providers = require('../lib/providers');
const ai = require('../lib/ai');
const content = require('../lib/content');
const video = require('../lib/video');
const schedule = require('../lib/schedule');
const stt = require('../lib/stt');
const assistant = require('../lib/assistant');
const research = require('../lib/research');
const identity = require('../lib/identity');
const { sign, verify, safeEqual } = require('../lib/crypto');

const COOKIE = 'mos_s';
const SESSION_DAYS = 7;

const httpError = (status, message) => Object.assign(new Error(message), { status });

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function session(req) {
  try {
    return verify(cookies(req)[COOKIE]);
  } catch {
    return null;
  }
}

function setSession(res, data) {
  const maxAge = SESSION_DAYS * 86400;
  const token = data ? sign({ ...data, exp: Date.now() + maxAge * 1000 }) : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${data ? maxAge : 0}`);
}

const failed = new Map(); // ip -> { n, until }
function ipOf(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

function parse(req) {
  const url = new URL(req.url, 'http://x');
  let p = url.searchParams.get('__p') || url.pathname;
  let query = url.searchParams;
  const q = p.indexOf('?');
  if (q >= 0) {
    query = new URLSearchParams(p.slice(q + 1));
    for (const [k, v] of url.searchParams) if (k !== '__p' && !query.has(k)) query.set(k, v);
    p = p.slice(0, q);
  }
  return { path: p.replace(/\/+$/, '') || '/', query };
}


// ---------------- handlers ----------------
async function health() {
  const env = {
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    APP_SECRET: Boolean(process.env.APP_SECRET),
  };
  let st = { db: false, blob: false };
  let storageError;
  try {
    st = await store.ping();
  } catch (e) {
    storageError = e.message;
  }
  let blobOk = null;
  if (st.blob && process.env.HEALTH_BLOB_CHECK === '1') {
    try {
      const f = await store.saveFile('health/check.txt', Buffer.from('ok'), 'text/plain');
      await store.deleteFile(f.url);
      blobOk = true;
    } catch (e) {
      blobOk = e.message;
    }
  }
  return { ok: Object.values(env).every(Boolean) && st.db, app: 'marketing-os', version: 2, env, storage: { ...st, blobOk }, storageError };
}

async function overview() {
  const list = await brands.index();
  const perBrand = await Promise.all(list.map((b) => eleven.listKeys(b.id).then(eleven.summarize).catch(() => eleven.summarize([]))));
  const keys = perBrand.reduce(
    (a, s) => ({ total: a.total + s.total, active: a.active + (s.active || 0), remaining: a.remaining + s.remaining }),
    { total: 0, active: 0, remaining: 0 }
  );
  const logs = await store.listLogs(14);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(store.dayKey(Date.now() - i * 86400000));
  const byDay = Object.fromEntries(days.map((d) => [d, { tts: 0, content: 0, image: 0, chars: 0 }]));
  const totals = { tts: 0, chars: 0, content: 0, image: 0, plan: 0 };
  for (const l of logs) {
    if (l.status !== 200) continue;
    const d = byDay[store.dayKey(l.t)];
    if (l.kind === 'tts') { totals.tts++; totals.chars += l.chars || 0; if (d) { d.tts++; d.chars += l.chars || 0; } }
    if (l.kind === 'content') { totals.content++; if (d) d.content++; }
    if (l.kind === 'image') { totals.image++; if (d) d.image++; }
    if (l.kind === 'plan') totals.plan++;
  }
  const provs = await providers.list();
  const st = await providers.settings();
  return {
    brands: list.map((b, i) => ({ ...b, keys: perBrand[i] })),
    keys,
    providers: { connected: provs.filter((p) => p.connected).length, text: st.text ? { ...st.text, name: provs.find((p) => p.id === st.text.provider)?.name || st.text.provider } : null, image: st.image || null },
    usage: { ...totals, ttsCount: totals.tts, ttsChars: totals.chars, days: days.map((d) => ({ day: d, ...byDay[d] })) },
    recent: logs.slice(0, 12),
  };
}

async function system() {
  const list = await brands.index();
  const perBrand = await Promise.all(list.map((b) => eleven.listKeys(b.id).then(eleven.summarize).catch(() => eleven.summarize([]))));
  const pool = perBrand.reduce((a, s) => {
    for (const k of ['total', 'active', 'exhausted', 'invalid', 'disabled', 'error', 'remaining', 'limit']) a[k] = (a[k] || 0) + (s[k] || 0);
    return a;
  }, {});
  const logs = await store.listLogs(30);
  const byProvider = {};
  for (const l of logs) {
    const p = l.provider || 'other';
    byProvider[p] = byProvider[p] || { calls: 0, errors: 0, ms: 0, chars: 0, inTok: 0, outTok: 0 };
    byProvider[p].calls++;
    if (l.status !== 200) byProvider[p].errors++;
    byProvider[p].ms += l.ms || 0;
    byProvider[p].chars += l.chars || 0;
    byProvider[p].inTok += l.inTok || 0;
    byProvider[p].outTok += l.outTok || 0;
  }
  return {
    providers: await providers.list(),
    settings: await providers.settings(),
    eleven: pool,
    storage: await store.ping().catch(() => ({ db: false })),
    usage: byProvider,
    logs: logs.slice(0, 60),
  };
}

// ---------------- router ----------------
module.exports = async (req, res) => {
  const { path, query } = parse(req);
  const method = req.method;
  const started = Date.now();
  try {
    if (path === '/api/health') return send(res, 200, await health());
    const fw = path.match(/^\/api\/font\/(\d{3})$/);
    if (fw) {
      const f = (await store.readJSON('fonts.json', {}))[fw[1]];
      if (!f) throw httpError(404, 'Font not found');
      let buf;
      const local = f.url.match(/^\/api\/file\/([a-f0-9]+)$/);
      if (local) buf = (await store.readFile(local[1]))?.buffer;
      else buf = Buffer.from(await (await fetch(f.url)).arrayBuffer());
      res.statusCode = 200;
      res.setHeader('Content-Type', { woff: 'font/woff', woff2: 'font/woff2', opentype: 'font/otf', truetype: 'font/ttf' }[f.format]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(buf);
    }
    if (path === '/api/fonts.css') {
      let css = '';
      try {
        const f = await store.readJSON('fonts.json', {});
        css = Object.entries(f).map(([w, x]) => `@font-face{font-family:"Thmanyah Sans";src:url(/api/font/${w}?v=${x.size}) format("${x.format}");font-weight:${w};font-style:normal;font-display:swap}`).join('\n');
      } catch { /* no db yet: system font */ }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.end(css);
    }

    if (path === '/api/login' && method === 'POST') {
      const ip = ipOf(req);
      const f = failed.get(ip);
      if (f && f.until > Date.now()) throw httpError(429, 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.');
      const pw = process.env.ADMIN_PASSWORD;
      if (!pw) throw httpError(500, 'ADMIN_PASSWORD غير موجود في إعدادات Vercel');
      const body = await readBody(req);
      if (!safeEqual(String(body.password || ''), pw)) {
        const n = (f?.n || 0) + 1;
        failed.set(ip, { n, until: n >= 5 ? Date.now() + 60000 : 0 });
        await new Promise((r) => setTimeout(r, 600));
        throw httpError(401, 'كلمة المرور غير صحيحة');
      }
      failed.delete(ip);
      setSession(res, { u: 'owner' });
      return send(res, 200, { ok: true });
    }
    if (path === '/api/logout' && method === 'POST') {
      setSession(res, null);
      return send(res, 200, { ok: true });
    }
    if (path === '/api/session') {
      const s = session(req);
      let storage = null;
      if (s) storage = await store.ping().catch((e) => ({ db: false, error: e.message }));
      return send(res, 200, { authenticated: Boolean(s), user: s ? { name: process.env.OWNER_NAME || 'حكيم' } : null, storage });
    }

    // Everything below needs a session.
    if (!session(req)) throw httpError(401, 'سجّل الدخول أولاً');
    if (method !== 'GET' && req.headers['x-mos'] !== '1') throw httpError(403, 'Missing x-mos header');

    if (path === '/api/overview') return send(res, 200, await overview());
    if (path === '/api/system') return send(res, 200, await system());
    if (path === '/api/system/test-text' && method === 'POST') return send(res, 200, await ai.quickTest());

    const fm = path.match(/^\/api\/file\/([a-f0-9]+)$/);
    if (fm) {
      const f = await store.readFile(fm[1]);
      if (!f) throw httpError(404, 'الملف غير موجود');
      res.statusCode = 200;
      res.setHeader('Content-Type', f.contentType);
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      return res.end(f.buffer);
    }

    if (path === '/api/providers') {
      if (method === 'GET') return send(res, 200, { providers: await providers.list(), settings: await providers.settings() });
    }
    if (path === '/api/models') return send(res, 200, await providers.models(query.get('kind') || 'text'));
    if (path === '/api/providers/custom' && method === 'POST') {
      const r = await providers.addCustom(await readBody(req));
      await store.logEvent({ kind: 'connect', provider: r.id, status: 200, ms: Date.now() - started });
      return send(res, 200, r);
    }
    if (path === '/api/providers/settings' && method === 'PUT') return send(res, 200, { settings: await providers.setSettings(await readBody(req)) });
    const pm = path.match(/^\/api\/providers\/([a-z0-9_]+)(\/test)?$/);
    if (pm) {
      if (pm[2] && method === 'POST') return send(res, 200, await providers.test(pm[1]));
      if (!pm[2] && method === 'PUT') {
        const r = await providers.connect(pm[1], await readBody(req));
        await store.logEvent({ kind: 'connect', provider: pm[1], status: 200, ms: Date.now() - started });
        return send(res, 200, r);
      }
      if (!pm[2] && method === 'DELETE') {
        await providers.disconnect(pm[1]);
        return send(res, 200, { ok: true });
      }
    }
    if (path === '/api/fonts' && method === 'GET') return send(res, 200, { fonts: await store.readJSON('fonts.json', {}) });
    if (path === '/api/fonts' && method === 'POST') {
      const body = await readBody(req);
      const w = String(body.weight);
      if (!['300', '400', '500', '700', '900'].includes(w)) throw httpError(400, 'وزن غير صحيح');
      const m = String(body.dataUrl || '').match(/^data:[^;]*;base64,(.+)$/);
      if (!m) throw httpError(400, 'ملف غير صالح');
      const buf = Buffer.from(m[1], 'base64');
      if (buf.length > 3 * 1024 * 1024) throw httpError(400, 'الملف أكبر من 3MB');
      const sig = buf.subarray(0, 4).toString('latin1');
      const format = sig === 'wOFF' ? 'woff' : sig === 'wOF2' ? 'woff2' : sig === 'OTTO' ? 'opentype' : 'truetype';
      const ct = { woff: 'font/woff', woff2: 'font/woff2', opentype: 'font/otf', truetype: 'font/ttf' }[format];
      const saved = await store.saveFile(`fonts/thmanyah-${w}.${{ woff: 'woff', woff2: 'woff2', opentype: 'otf', truetype: 'ttf' }[format]}`, buf, ct);
      const fonts = await store.update('fonts.json', {}, (f) => { const old = f[w]?.url; f[w] = { url: saved.url, format, size: buf.length }; if (old) store.deleteFile(old).catch(() => {}); return f; });
      return send(res, 200, { fonts });
    }
    if (path === '/api/transcribe' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, await stt.transcribe(b.brandId && /^[a-f0-9]+$/.test(b.brandId) ? b.brandId : null, b.dataUrl));
    }
    if (path === '/api/assistant' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, await assistant.understand(b.brandId && /^[a-f0-9]+$/.test(b.brandId) ? b.brandId : null, b.text, { ai: b.ai?.provider ? b.ai : undefined }));
    }
    if (path === '/api/content/options') return send(res, 200, { ...content.OPTIONS, styles: Object.keys(content.STYLES) });
    if (path === '/api/eleven/models') return send(res, 200, { models: eleven.MODELS });

    if (path === '/api/brands') {
      if (method === 'GET') return send(res, 200, { brands: await brands.index() });
      if (method === 'POST') return send(res, 201, await brands.create(await readBody(req)));
    }

    const m = path.match(/^\/api\/brands\/([a-f0-9]+)(?:\/(.+))?$/);
    if (m) {
      const [, id, sub] = m;
      if (!sub) {
        if (method === 'GET') return send(res, 200, await brands.get(id));
        if (method === 'PATCH') return send(res, 200, await brands.patch(id, await readBody(req)));
        if (method === 'DELETE') {
          await brands.remove(id);
          return send(res, 200, { ok: true });
        }
      }
      if (sub === 'logo' && method === 'POST') return send(res, 200, await brands.uploadLogo(id, await readBody(req)));
      if (sub === 'guide' && method === 'POST') return send(res, 200, await brands.analyzeGuide(id, await readBody(req)));
      if (sub === 'guide' && method === 'DELETE') return send(res, 200, await brands.removeGuide(id));
      if (sub === 'analyze' && method === 'POST') return send(res, 200, await brands.analyze(id, await readBody(req)));

      if (sub === 'keys') {
        await brands.get(id, { withUrls: false });
        if (method === 'GET') {
          const keys = await eleven.listKeys(id);
          return send(res, 200, { keys, summary: eleven.summarize(keys) });
        }
        if (method === 'POST') {
          const r = await eleven.addKeys(id, (await readBody(req)).text);
          await store.logEvent({ kind: 'keys-add', brand: id, provider: 'elevenlabs', status: 200, ms: Date.now() - started, count: r.added });
          return send(res, 200, r);
        }
      }
      if (sub === 'keys/test' && method === 'POST') {
        const body = await readBody(req);
        return send(res, 200, { summary: await eleven.testKeys(id, Array.isArray(body.ids) && body.ids.length ? body.ids : null) });
      }
      if (sub === 'keys/delete' && method === 'POST') {
        const body = await readBody(req);
        return send(res, 200, { removed: await eleven.deleteKeys(id, Array.isArray(body.ids) ? body.ids : []) });
      }
      const km = sub && sub.match(/^keys\/([a-f0-9]+)$/);
      if (km && method === 'PATCH') {
        await eleven.patchKey(id, km[1], await readBody(req));
        return send(res, 200, { ok: true });
      }

      if (sub === 'batches') {
        if (method === 'GET') return send(res, 200, { batches: await content.listBatches(id) });
        if (method === 'POST') return send(res, 200, await content.generate(id, await readBody(req)));
      }
      const bm = sub && sub.match(/^batches\/([a-z0-9]+)(?:\/items\/([a-f0-9]+)(\/rewrite)?)?$/);
      if (bm) {
        const [, batchId, itemId, rw] = bm;
        if (!itemId && method === 'GET') return send(res, 200, await content.getBatch(id, batchId));
        if (!itemId && method === 'DELETE') { await content.deleteBatch(id, batchId); return send(res, 200, { ok: true }); }
        if (itemId && !rw && method === 'PATCH') return send(res, 200, await content.patchItem(id, batchId, itemId, await readBody(req)));
        if (itemId && rw && method === 'POST') return send(res, 200, await content.rewriteItem(id, batchId, itemId, await readBody(req)));
      }
      if (sub === 'plan') {
        if (method === 'GET') return send(res, 200, await content.getPlan(id, query.get('month')));
        if (method === 'POST') return send(res, 200, await content.makePlan(id, await readBody(req)));
      }
      if (sub === 'occasions') {
        const [y, mo] = String(query.get('month') || '').split('-').map(Number);
        const now = new Date();
        return send(res, 200, { occasions: content.occasions(y || now.getFullYear(), mo || now.getMonth() + 1) });
      }
      if (sub === 'images') {
        if (method === 'GET') return send(res, 200, { images: await content.listImages(id) });
        if (method === 'POST') return send(res, 200, await content.makeImage(id, await readBody(req)));
      }
      const ie = sub && sub.match(/^images\/([a-z0-9]+)\/edit$/);
      if (ie && method === 'POST') return send(res, 200, await content.editImage(id, ie[1], await readBody(req)));
      const ve = sub && sub.match(/^videos\/([a-z0-9]+)\/edit$/);
      if (ve && method === 'POST') return send(res, 200, await video.edit(id, ve[1], await readBody(req)));
      const im = sub && sub.match(/^images\/([a-z0-9]+)$/);
      if (im && method === 'DELETE') { await content.deleteImage(id, im[1]); return send(res, 200, { ok: true }); }

      if (sub === 'research' && method === 'GET') return send(res, 200, await research.load(id));
      if (sub === 'research/discover' && method === 'POST') return send(res, 200, await research.discover(id, await readBody(req)));
      if (sub === 'research/competitors' && method === 'POST') return send(res, 200, await research.add(id, await readBody(req)));
      if (sub === 'research/cross' && method === 'POST') return send(res, 200, await research.cross(id));
      if (sub === 'research/export' && method === 'GET') {
        const f = await research.exportCSV(id, query.get('c'));
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`);
        return res.end(f.body);
      }
      const rc = sub && sub.match(/^research\/competitors\/([a-f0-9]+)(\/analyze)?$/);
      if (rc && rc[2] && method === 'POST') return send(res, 200, await research.analyze(id, rc[1]));
      if (rc && !rc[2] && method === 'DELETE') { await research.remove(id, rc[1]); return send(res, 200, { ok: true }); }
      const ro = sub && sub.match(/^research\/opportunities\/([a-f0-9]+)$/);
      if (ro && method === 'PATCH') return send(res, 200, await research.setOpportunity(id, ro[1], (await readBody(req)).status));
      if (sub === 'identity/palettes' && method === 'POST') return send(res, 200, { palettes: await identity.palettes(id, await readBody(req)) });
      if (sub === 'identity/logos' && method === 'POST') return send(res, 200, await identity.logos(id, await readBody(req)));
      if (sub === 'identity/use-logo' && method === 'POST') return send(res, 200, await identity.useLogo(id, await readBody(req)));

      if (sub === 'schedule') {
        if (method === 'GET') return send(res, 200, { items: await schedule.list(id, query.get('month')) });
        if (method === 'POST') return send(res, 200, await schedule.add(id, await readBody(req)));
      }
      const sm = sub && sub.match(/^schedule\/([a-z0-9]+)$/);
      if (sm && method === 'PATCH') return send(res, 200, await schedule.patch(id, sm[1], await readBody(req)));
      if (sm && method === 'DELETE') { await schedule.remove(id, sm[1]); return send(res, 200, { ok: true }); }

      if (sub === 'videos') {
        if (method === 'GET') return send(res, 200, { videos: await video.list(id) });
        if (method === 'POST') return send(res, 200, await video.start(id, await readBody(req)));
      }
      const vm = sub && sub.match(/^videos\/([a-z0-9]+)$/);
      if (vm && method === 'GET') return send(res, 200, await video.status(id, vm[1]));
      if (vm && method === 'DELETE') { await video.remove(id, vm[1]); return send(res, 200, { ok: true }); }

      if (sub === 'voices') { const list = await eleven.voices(id); return send(res, 200, { voices: list, note: list.note || null }); }
      if (sub === 'audio') return send(res, 200, { items: await eleven.history(id, Number(query.get('limit')) || 30) });
      if (sub === 'tts' && method === 'POST') {
        const body = await readBody(req);
        try {
          const r = await eleven.tts(id, body);
          await store.logEvent({ kind: 'tts', brand: id, provider: 'elevenlabs', model: r.model, status: 200, ms: r.ms, chars: r.chars, key: r.key.label, attempts: r.tries });
          return send(res, 200, r);
        } catch (e) {
          await store.logEvent({ kind: 'tts', brand: id, provider: 'elevenlabs', status: e.status || 500, ms: Date.now() - started, error: e.message });
          throw e;
        }
      }
    }

    throw httpError(404, `Not found: ${method} ${path}`);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(path, err);
    return send(res, status, { error: err.message || 'Server error' });
  }
};
