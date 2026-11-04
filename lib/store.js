// Persistence: JSON documents + logs + lists in Redis, media files in Vercel Blob.
// If Blob is not connected, small files fall back to Redis and are served by /api/file/:id.
const redis = require('./redis');
const blob = require('./blob');
const { randomId } = require('./crypto');

const P = 'mos:';
const cache = new Map(); // name -> { at, data }
const CACHE_MS = 3000;

async function readJSON(name, fallback, { fresh = false } = {}) {
  const hit = cache.get(name);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return structuredClone(hit.data);
  const raw = await redis.cmd('GET', P + 'doc:' + name);
  const data = raw == null ? fallback : JSON.parse(raw);
  cache.set(name, { at: Date.now(), data });
  return structuredClone(data);
}

async function writeJSON(name, data) {
  await redis.cmd('SET', P + 'doc:' + name, JSON.stringify(data));
  cache.set(name, { at: Date.now(), data: structuredClone(data) });
  return data;
}

async function removeJSON(name) {
  cache.delete(name);
  await redis.cmd('DEL', P + 'doc:' + name);
}

// Read-modify-write. Always reads fresh to reduce lost updates.
async function update(name, fallback, fn) {
  const current = await readJSON(name, fallback, { fresh: true });
  const next = (await fn(current)) ?? current;
  await writeJSON(name, next);
  return next;
}

// ---------- lists (newest first) ----------
async function pushItem(list, item, max = 500) {
  await redis.pipeline([
    ['LPUSH', P + 'list:' + list, JSON.stringify(item)],
    ['LTRIM', P + 'list:' + list, 0, max - 1],
  ]);
  return item;
}

async function listItems(list, start = 0, count = 50) {
  const rows = (await redis.cmd('LRANGE', P + 'list:' + list, start, start + count - 1)) || [];
  return rows.map((r) => JSON.parse(r));
}

async function replaceItems(list, items) {
  const cmds = [['DEL', P + 'list:' + list]];
  if (items.length) cmds.push(['RPUSH', P + 'list:' + list, ...items.map((x) => JSON.stringify(x))]);
  await redis.pipeline(cmds);
}

async function dropList(list) {
  await redis.cmd('DEL', P + 'list:' + list);
}

// ---------- logs ----------
const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

async function logEvent(evt) {
  const t = Date.now();
  const row = { ...evt, t };
  for (const k of Object.keys(row)) if (row[k] === undefined || row[k] === null) delete row[k];
  if (row.error) row.error = String(row.error).slice(0, 300);
  try {
    const key = P + 'logs:' + dayKey(t);
    await redis.pipeline([['LPUSH', key, JSON.stringify(row)], ['EXPIRE', key, 60 * 86400]]);
  } catch (err) {
    console.error('log failed', err.message);
  }
}

async function listLogs(days) {
  const cmds = [];
  for (let i = 0; i < days; i++) cmds.push(['LRANGE', P + 'logs:' + dayKey(Date.now() - i * 86400000), 0, 4999]);
  const out = [];
  for (const rows of await redis.pipeline(cmds)) for (const r of rows || []) out.push(JSON.parse(r));
  return out.sort((a, b) => b.t - a.t);
}

// ---------- files ----------
async function saveFile(name, buffer, contentType) {
  if (blob.enabled()) {
    const r = await blob.put(name, buffer, contentType);
    return { url: r.url, size: buffer.length, contentType };
  }
  if (buffer.length > 4.5 * 1024 * 1024) throw Object.assign(new Error('الملف كبير. اربط Vercel Blob لحفظ الملفات الكبيرة.'), { status: 413 });
  const id = randomId(12);
  await redis.cmd('SET', P + 'file:' + id, JSON.stringify({ ct: contentType, b64: buffer.toString('base64') }));
  return { url: `/api/file/${id}`, size: buffer.length, contentType };
}

async function readFile(id) {
  const raw = await redis.cmd('GET', P + 'file:' + id);
  if (!raw) return null;
  const f = JSON.parse(raw);
  return { contentType: f.ct, buffer: Buffer.from(f.b64, 'base64') };
}

async function deleteFile(url) {
  if (!url) return;
  const m = String(url).match(/^\/api\/file\/([a-f0-9]+)$/);
  if (m) return redis.cmd('DEL', P + 'file:' + m[1]).catch(() => {});
  return blob.del(url);
}

async function ping() {
  const m = redis.mode();
  if (!m) return { db: false, mode: null, blob: blob.enabled() };
  await redis.cmd('PING');
  return { db: true, mode: m, blob: blob.enabled() };
}

module.exports = {
  readJSON, writeJSON, removeJSON, update,
  pushItem, listItems, replaceItems, dropList,
  logEvent, listLogs, dayKey,
  saveFile, readFile, deleteFile, ping,
};
