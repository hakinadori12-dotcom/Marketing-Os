// Content calendar: anything generated (post, image, video, voice) can be scheduled.
// Publishing itself is manual for now (copy / download from the calendar); automatic
// posting needs the social accounts connected (next phase).
const store = require('./store');
const { randomId } = require('./crypto');

const err = (status, message) => Object.assign(new Error(message), { status });
const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'snapchat', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky', 'googlebusiness', 'telegram', 'whatsapp'];
const key = (brandId) => `schedule/${brandId}.json`;

function clean(body, prev = {}) {
  const date = String(body.date ?? prev.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw err(400, 'اختر تاريخاً صحيحاً');
  const time = String(body.time ?? prev.time ?? '10:00');
  if (!/^\d{2}:\d{2}$/.test(time)) throw err(400, 'وقت غير صحيح');
  const platforms = (Array.isArray(body.platforms) ? body.platforms : prev.platforms || []).filter((p) => PLATFORMS.includes(p)).slice(0, 14);
  if (!platforms.length) throw err(400, 'اختر منصة واحدة على الأقل');
  const media = body.media === null ? null : body.media || prev.media || null;
  return {
    date, time, platforms,
    title: String(body.title ?? prev.title ?? '').slice(0, 160),
    caption: String(body.caption ?? prev.caption ?? '').slice(0, 5000),
    media: media && /^(image|video|audio)$/.test(media.type) && /^(https:\/\/|\/api\/file\/)/.test(String(media.url)) ? { type: media.type, url: String(media.url), aspect: media.aspect || null } : null,
    source: body.source || prev.source || null,
    status: ['scheduled', 'published', 'draft', 'rejected', 'queued', 'failed', 'manual'].includes(body.status) ? body.status : prev.status || 'scheduled',
  };
}

async function list(brandId, month) {
  const all = await store.readJSON(key(brandId), []);
  const items = month ? all.filter((x) => x.date.startsWith(month)) : all;
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

async function add(brandId, body) {
  const item = { id: `${Date.now().toString(36)}${randomId(3)}`, ...clean(body), createdAt: new Date().toISOString() };
  await store.update(key(brandId), [], (l) => [...l, item].slice(-2000));
  return item;
}

async function get(brandId, id) {
  const it = (await store.readJSON(key(brandId), [], { fresh: true })).find((x) => x.id === id);
  if (!it) throw err(404, 'العنصر غير موجود');
  return it;
}

// Result of the automatic publishing (Zernio) is stored on the item.
async function setPublish(brandId, id, publish, status) {
  let out = null;
  await store.update(key(brandId), [], (l) => l.map((x) => (x.id === id ? (out = { ...x, publish: { ...(x.publish || {}), ...publish }, status: status || x.status, updatedAt: new Date().toISOString() }) : x)));
  if (!out) throw err(404, 'العنصر غير موجود');
  return out;
}

async function patch(brandId, id, body) {
  let out = null;
  await store.update(key(brandId), [], (l) => l.map((x) => (x.id === id ? (out = { ...x, ...clean(body, x), updatedAt: new Date().toISOString() }) : x)));
  if (!out) throw err(404, 'العنصر غير موجود');
  return out;
}

async function remove(brandId, id) {
  await store.update(key(brandId), [], (l) => l.filter((x) => x.id !== id));
}

async function upcoming(brandId, n = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return (await list(brandId)).filter((x) => x.date >= today && x.status === 'scheduled').slice(0, n);
}

module.exports = {
  PLATFORMS, get, setPublish, list, add, patch, remove, upcoming };
