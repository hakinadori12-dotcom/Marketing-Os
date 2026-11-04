const crypto = require('crypto');

function appSecret() {
  const s = process.env.APP_SECRET || process.env.API_SECRET;
  if (!s) throw new Error('APP_SECRET is not set in Vercel environment variables');
  return s;
}

function encKey() {
  return crypto.createHash('sha256').update('enc:' + appSecret()).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':');
}

function decrypt(blob) {
  const [v, iv, tag, ct] = String(blob).split(':');
  if (v !== 'v1') throw new Error('Unknown secret format');
  const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}

const sha256 = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
const randomId = (n = 8) => crypto.randomBytes(n).toString('hex');
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', 'session:' + appSecret()).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', 'session:' + appSecret()).update(body).digest('base64url');
  if (!safeEqual(mac, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  return safeEqual(crypto.scryptSync(String(pw), salt, 32).toString('hex'), hash);
}

// ---- TOTP (RFC 6238) ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(str) {
  const clean = String(str).replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function totp(secret, t = Date.now()) {
  const counter = Math.floor(t / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
  return code;
}
function verifyTotp(secret, code) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  for (const drift of [-1, 0, 1]) {
    if (safeEqual(totp(secret, Date.now() + drift * 30000), c)) return true;
  }
  return false;
}
const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

module.exports = {
  encrypt, decrypt, sha256, randomId, safeEqual, sign, verify,
  hashPassword, checkPassword, totp, verifyTotp, newTotpSecret,
};
