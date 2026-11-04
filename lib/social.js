// Publishing + stats through Zernio (one API for Instagram, Facebook, TikTok, YouTube, X, LinkedIn,
// Pinterest, Reddit, Threads, Snapchat, Bluesky, Google Business, Telegram).
// BYOK: the owner pastes a Zernio API key once; each brand gets its own Zernio profile, and the user
// connects accounts with one click (OAuth hosted by Zernio, back to our callback).
const store = require('./store');
const providers = require('./providers');
const brands = require('./brands');

const err = (status, message) => Object.assign(new Error(message), { status });
const API = 'https://zernio.com/api/v1';
const DOC = (id) => `social/${id}.json`;
// our id → Zernio id
const MAP = { instagram: 'instagram', facebook: 'facebook', tiktok: 'tiktok', youtube: 'youtube', x: 'twitter', linkedin: 'linkedin', pinterest: 'pinterest', reddit: 'reddit', threads: 'threads', snapchat: 'snapchat', bluesky: 'bluesky', googlebusiness: 'googlebusiness', telegram: 'telegram' };
const BACK = Object.fromEntries(Object.entries(MAP).map(([a, b]) => [b, a]));
const NEEDS_MEDIA = ['instagram', 'tiktok', 'youtube', 'pinterest', 'snapchat'];

async function key() {
  const s = await providers.secret('zernio').catch(() => null);
  if (!s?.apiKey) throw err(412, 'أضف مفتاح Zernio مرة واحدة من صفحة «المفاتيح والمزوّدون» ← Zernio، ثم اربط حساباتك.');
  return s.apiKey;
}

async function call(method, path, body) {
  const k = await key();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${k}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || data.message || data.error || `HTTP ${res.status}`;
      throw Object.assign(err(res.status === 401 ? 424 : res.status === 402 ? 402 : res.status === 409 ? 409 : 502, `Zernio: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`), { zstatus: res.status });
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw err(504, 'Zernio لم يرد في الوقت');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function profileId(brandId) {
  const d = await store.readJSON(DOC(brandId), {}, { fresh: true });
  if (d.profileId) return d.profileId;
  const b = await brands.get(brandId);
  const r = await call('POST', '/profiles', { name: `${b.name} · Marketing OS`.slice(0, 60), description: 'Marketing OS brand' });
  const pid = r.profile?._id || r._id || r.id;
  if (!pid) throw err(502, 'Zernio لم يُرجع رقم الملف');
  await store.update(DOC(brandId), {}, (x) => ({ ...x, profileId: pid }));
  return pid;
}

const shape = (a) => ({ id: a._id || a.id, platform: BACK[a.platform] || a.platform, username: a.username || a.displayName || '', name: a.displayName || a.username || '', avatar: a.profilePicture || a.avatar || '', active: a.isActive !== false });

async function status(brandId) {
  const connected = (await providers.list()).some((p) => p.id === 'zernio' && p.connected);
  if (!connected) return { configured: false, accounts: [], platforms: Object.keys(MAP) };
  const d = await store.readJSON(DOC(brandId), {}, { fresh: true });
  if (!d.profileId) return { configured: true, accounts: [], platforms: Object.keys(MAP) };
  try {
    const r = await call('GET', `/accounts?profileId=${encodeURIComponent(d.profileId)}`);
    const accounts = (r.accounts || r.data || r || []).filter?.((a) => !a.profileId || String(a.profileId?._id || a.profileId) === d.profileId).map(shape) || [];
    return { configured: true, accounts, platforms: Object.keys(MAP) };
  } catch (e) {
    return { configured: true, accounts: [], platforms: Object.keys(MAP), error: e.message };
  }
}

async function connectUrl(brandId, platform, origin) {
  if (!MAP[platform]) throw err(400, 'منصة غير مدعومة');
  const pid = await profileId(brandId);
  const back = `${(process.env.PUBLIC_URL || origin).replace(/\/+$/, '')}/api/social/callback?brand=${brandId}&p=${platform}`;
  const r = await call('GET', `/connect/${MAP[platform]}?profileId=${encodeURIComponent(pid)}&redirect_url=${encodeURIComponent(back)}`);
  if (!r.authUrl) throw err(502, 'Zernio لم يُرجع رابط الربط');
  return r.authUrl;
}

async function disconnect(brandId, accountId) {
  await call('DELETE', `/accounts/${encodeURIComponent(accountId)}`);
  return status(brandId);
}

// Publish (now) or hand over a scheduled calendar item.
async function publish(brandId, item, { now = false, timezone = 'UTC' } = {}) {
  const st = await status(brandId);
  if (!st.configured) await key();
  const targets = [];
  const missing = [];
  for (const p of item.platforms) {
    const acc = st.accounts.find((a) => a.platform === p && a.active);
    if (acc) targets.push({ p, acc });
    else if (MAP[p]) missing.push(p);
  }
  if (!targets.length) throw err(400, 'لا يوجد حساب مربوط لهذه المنصات. اربط حساباتك من التقويم ← «الحسابات المربوطة».');
  const media = item.media && /^https:\/\//.test(item.media.url) ? item.media : null;
  if (item.media && !media) throw err(400, 'الملف محفوظ داخل المنصة فقط ولا يمكن نشره. فعّل Vercel Blob أو أعد توليده.');
  const noMedia = targets.filter((t) => NEEDS_MEDIA.includes(t.p) && !media).map((t) => t.p);
  if (noMedia.length) throw err(400, `هذه المنصات تحتاج صورة أو فيديو: ${noMedia.join('، ')}`);
  const text = [item.caption || item.title].filter(Boolean).join('\n\n').slice(0, 5000);
  const body = {
    content: text,
    platforms: targets.map(({ p, acc }) => ({
      platform: MAP[p], accountId: acc.id,
      ...(p === 'youtube' ? { platformSpecificData: { title: (item.title || text).slice(0, 95) } } : {}),
      ...(p === 'reddit' ? { platformSpecificData: { title: (item.title || text).slice(0, 280) } } : {}),
      ...(p === 'pinterest' ? { platformSpecificData: { title: (item.title || '').slice(0, 95) } } : {}),
    })),
    ...(media ? { mediaItems: [{ type: media.type === 'video' ? 'video' : 'image', url: media.url }] } : {}),
    ...(now ? { publishNow: true } : { scheduledFor: `${item.date}T${item.time}:00`, timezone }),
  };
  const r = await call('POST', '/posts', body);
  const post = r.post || r;
  return { postId: post._id || post.id, status: post.status || (now ? 'publishing' : 'scheduled'), platforms: targets.map((t) => t.p), skipped: missing, at: new Date().toISOString(), now };
}

async function postStatus(postId) {
  const r = await call('GET', `/posts/${encodeURIComponent(postId)}`);
  const post = r.post || r;
  return {
    status: post.status,
    links: (post.platforms || []).map((x) => ({ platform: BACK[x.platform] || x.platform, status: x.status, url: x.platformPostUrl || x.url || '', error: x.errorMessage || x.error || '' })),
  };
}

// Stats for the Insights page (posts published through Zernio + synced posts of the connected accounts).
async function analytics(brandId, { days = 90 } = {}) {
  const d = await store.readJSON(DOC(brandId), {}, { fresh: true });
  if (!d.profileId) return { posts: [], note: 'اربط حساباتك أولاً' };
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    const r = await call('GET', `/analytics?profileId=${encodeURIComponent(d.profileId)}&fromDate=${from}&limit=100&sortBy=date&order=desc`);
    const rows = r.posts || r.data || r.analytics || [];
    const posts = rows.map((x) => {
      const a = x.analytics || x.metrics || x;
      return {
        id: x._id || x.postId || x.id, platform: BACK[x.platform] || x.platform || (x.platforms?.[0]?.platform && BACK[x.platforms[0].platform]) || '',
        text: String(x.content || x.text || '').slice(0, 300), url: x.platformPostUrl || x.url || '', at: x.publishedAt || x.createdAt || x.date || '',
        impressions: a.impressions || 0, reach: a.reach || 0, views: a.views || 0, likes: a.likes || 0, comments: a.comments || 0, shares: a.shares || 0, saves: a.saves || 0, clicks: a.clicks || 0, engagementRate: a.engagementRate || 0,
      };
    });
    return { posts, overview: r.overview || null };
  } catch (e) {
    if (e.zstatus === 402) return { posts: [], note: 'الإحصائيات غير مفعّلة في خطة Zernio الحالية (Analytics add-on).' };
    throw e;
  }
}

module.exports = { status, connectUrl, disconnect, publish, postStatus, analytics, MAP };
