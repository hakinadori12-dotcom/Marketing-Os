// Google account link (OAuth 2.0, BYOK): the owner creates an OAuth client in their own Google Cloud
// project, pastes the Client ID / Secret here, then grants access. We only ask for `drive.file`,
// so the platform can see and edit ONLY the spreadsheets it creates — nothing else in the Drive.
const nodeCrypto = require('crypto');
const store = require('./store');
const { encrypt, decrypt, safeEqual } = require('./crypto');

const err = (status, message) => Object.assign(new Error(message), { status });
const DOC = 'google.json';
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive.file'];

const load = () => store.readJSON(DOC, {}, { fresh: true });
const save = (d) => store.writeJSON(DOC, d);

// The redirect URI must match exactly what the owner registers in Google Cloud.
function redirectUri(origin) {
  const base = (process.env.PUBLIC_URL || origin || '').replace(/\/+$/, '');
  return `${base}/api/google/callback`;
}

function stateMac(body) {
  return nodeCrypto.createHmac('sha256', 'gstate:' + (process.env.APP_SECRET || process.env.API_SECRET)).update(body).digest('base64url');
}
function makeState(extra = {}) {
  const body = Buffer.from(JSON.stringify({ ...extra, n: nodeCrypto.randomBytes(8).toString('hex'), exp: Date.now() + 10 * 60000 })).toString('base64url');
  return `${body}.${stateMac(body)}`;
}
function readState(s) {
  const [body, mac] = String(s || '').split('.');
  if (!body || !mac || !safeEqual(mac, stateMac(body))) return null;
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return d.exp > Date.now() ? d : null;
  } catch {
    return null;
  }
}

async function status(origin) {
  const d = await load();
  return {
    configured: Boolean(d.clientId && d.secretEnc),
    clientId: d.clientId ? d.clientId.replace(/^(.{8}).*(.{30})$/, '$1…$2') : '',
    connected: Boolean(d.tokenEnc),
    email: d.email || '',
    connectedAt: d.connectedAt || null,
    redirectUri: redirectUri(origin),
    error: d.error || null,
  };
}

async function saveConfig({ clientId, clientSecret }) {
  const d = await load();
  const id = String(clientId || '').trim() || d.clientId || '';
  const sec = String(clientSecret || '').trim();
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(id)) throw err(400, 'Client ID غير صحيح. يجب أن ينتهي بـ .apps.googleusercontent.com');
  const keepSecret = !sec && d.secretEnc && d.clientId === id;
  if (!keepSecret && sec.length < 10) throw err(400, 'اكتب Client Secret');
  const changed = d.clientId && d.clientId !== id;
  const next = { clientId: id, secretEnc: keepSecret ? d.secretEnc : encrypt(sec), savedAt: new Date().toISOString() };
  if (!changed && d.tokenEnc) Object.assign(next, { tokenEnc: d.tokenEnc, email: d.email, connectedAt: d.connectedAt });
  await save(next);
}

async function authUrl(origin) {
  const d = await load();
  if (!d.clientId) throw err(400, 'أدخل Client ID و Client Secret أولاً');
  const p = new URLSearchParams({
    client_id: d.clientId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: makeState(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw err(res.status === 400 || res.status === 401 ? 424 : 502, `Google: ${data.error_description || data.error || `HTTP ${res.status}`}`);
  return data;
}

async function callback({ code, state, error }, origin) {
  if (error) throw err(400, error === 'access_denied' ? 'رفضت إعطاء الإذن في Google' : `Google: ${error}`);
  if (!readState(state)) throw err(400, 'انتهت صلاحية طلب الربط. أعد المحاولة من المنصة.');
  const d = await load();
  if (!d.clientId) throw err(400, 'إعدادات Google غير موجودة');
  const t = await tokenRequest({ code, client_id: d.clientId, client_secret: decrypt(d.secretEnc), redirect_uri: redirectUri(origin), grant_type: 'authorization_code' });
  if (!t.refresh_token) throw err(400, 'لم يرسل Google رمز التحديث. احذف إذن التطبيق من حسابك في Google ثم أعد الربط.');
  if (!String(t.scope || '').includes('drive.file')) throw err(400, 'لم تعطِ إذن Google Drive. أعد الربط وفعّل الخيار.');
  let email = '';
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } });
    email = (await r.json()).email || '';
  } catch { /* email is only for display */ }
  d.tokenEnc = encrypt(JSON.stringify({ refresh: t.refresh_token, access: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 }));
  d.email = email;
  d.connectedAt = new Date().toISOString();
  delete d.error;
  await save(d);
  return { email };
}

// A valid access token (refreshed when needed).
async function accessToken() {
  const d = await load();
  if (!d.tokenEnc) throw err(400, 'اربط حساب Google أولاً من صفحة «مزوّدو الذكاء» ← Google Sheets');
  const tok = JSON.parse(decrypt(d.tokenEnc));
  if (tok.access && tok.exp > Date.now()) return tok.access;
  try {
    const t = await tokenRequest({ refresh_token: tok.refresh, client_id: d.clientId, client_secret: decrypt(d.secretEnc), grant_type: 'refresh_token' });
    tok.access = t.access_token;
    tok.exp = Date.now() + (t.expires_in - 60) * 1000;
    if (t.refresh_token) tok.refresh = t.refresh_token;
    d.tokenEnc = encrypt(JSON.stringify(tok));
    delete d.error;
    await save(d);
    return tok.access;
  } catch (e) {
    d.error = e.message;
    await save(d);
    throw err(424, `انتهى إذن Google أو أُلغي. أعد ربط الحساب. (${e.message})`);
  }
}

// Authorised call to any Google API. Returns parsed JSON.
async function gapi(method, url, body) {
  const token = await accessToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    const e = err(res.status === 404 ? 404 : res.status === 403 ? 424 : 502, `Google Sheets: ${msg}`);
    e.google = res.status;
    throw e;
  }
  return data;
}

async function disconnect({ forget = false } = {}) {
  const d = await load();
  if (d.tokenEnc) {
    try {
      const tok = JSON.parse(decrypt(d.tokenEnc));
      await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: tok.refresh }).toString() });
    } catch { /* best effort */ }
  }
  if (forget) return save({});
  delete d.tokenEnc; delete d.email; delete d.connectedAt; delete d.error;
  return save(d);
}

module.exports = { status, saveConfig, authUrl, callback, gapi, disconnect, redirectUri };
