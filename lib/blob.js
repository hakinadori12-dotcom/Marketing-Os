// Vercel Blob over its HTTP API (no SDK needed). Used for media files only:
// logos, images, audio. Every file gets a random suffix, so URLs are unguessable
// and never change (safe for CDN caching).
const API = () => (process.env.VERCEL_BLOB_API_URL || 'https://vercel.com/api/blob').replace(/\/+$/, '');
const token = () => process.env.BLOB_READ_WRITE_TOKEN || '';
const enabled = () => Boolean(token());

function headers(extra = {}) {
  return { authorization: `Bearer ${token()}`, 'x-api-version': '11', ...extra };
}

async function put(pathname, body, contentType) {
  if (!enabled()) throw Object.assign(new Error('Vercel Blob غير مربوط (BLOB_READ_WRITE_TOKEN)'), { status: 503 });
  const res = await fetch(`${API()}/?pathname=${encodeURIComponent(pathname)}`, {
    method: 'PUT',
    headers: headers({
      'x-content-type': contentType || 'application/octet-stream',
      'x-add-random-suffix': '1',
      'x-vercel-blob-access': 'public',
      'x-cache-control-max-age': '31536000',
    }),
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`Blob upload failed: ${data.error?.message || res.status}`), { status: 502 });
  return { url: data.url, pathname: data.pathname, downloadUrl: data.downloadUrl };
}

async function del(urls) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter((u) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(String(u)));
  if (!list.length || !enabled()) return;
  await fetch(`${API()}/delete`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ urls: list }),
  }).catch(() => {});
}

module.exports = { put, del, enabled };
