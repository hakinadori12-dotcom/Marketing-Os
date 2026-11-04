// Tiny Redis client with zero dependencies.
// 1) Upstash REST (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + _TOKEN)
// 2) Any Redis over TCP/TLS (REDIS_URL / KV_URL), speaking RESP directly.
const net = require('net');
const tls = require('tls');

const restUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const restToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const tcpUrl = () => process.env.REDIS_URL || process.env.KV_URL || '';

function mode() {
  if (restUrl() && restToken()) return 'rest';
  if (tcpUrl()) return 'tcp';
  return null;
}

// ---------- REST ----------
async function restCall(path, body) {
  const res = await fetch(restUrl().replace(/\/+$/, '') + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${restToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !Array.isArray(data)) throw new Error(`Redis: ${data.error || res.status}`);
  return data;
}

// ---------- TCP (RESP2) ----------
let conn = null; // { sock, queue, buf }

function encode(args) {
  let out = `*${args.length}\r\n`;
  for (const a of args) {
    const s = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
    out += `$${s.length}\r\n${s.toString('binary')}\r\n`;
  }
  return Buffer.from(out, 'binary');
}

// Returns [value, nextOffset] or null when the buffer is incomplete.
function parseReply(buf, i = 0) {
  if (i >= buf.length) return null;
  const type = String.fromCharCode(buf[i]);
  const end = buf.indexOf('\r\n', i);
  if (end < 0) return null;
  const line = buf.toString('utf8', i + 1, end);
  const next = end + 2;
  if (type === '+') return [line, next];
  if (type === '-') return [new Error(line), next];
  if (type === ':') return [Number(line), next];
  if (type === '$') {
    const len = Number(line);
    if (len < 0) return [null, next];
    if (buf.length < next + len + 2) return null;
    return [buf.toString('utf8', next, next + len), next + len + 2];
  }
  if (type === '*') {
    const n = Number(line);
    if (n < 0) return [null, next];
    const arr = [];
    let pos = next;
    for (let k = 0; k < n; k++) {
      const r = parseReply(buf, pos);
      if (!r) return null;
      arr.push(r[0]);
      pos = r[1];
    }
    return [arr, pos];
  }
  throw new Error('Bad Redis reply');
}

function connect() {
  if (conn && !conn.sock.destroyed) return conn;
  const u = new URL(tcpUrl());
  const secure = u.protocol === 'rediss:';
  const opts = { host: u.hostname, port: Number(u.port || 6379), servername: u.hostname };
  const sock = secure ? tls.connect(opts) : net.connect(opts);
  sock.setNoDelay(true);
  const c = { sock, queue: [], buf: Buffer.alloc(0) };
  sock.on('data', (d) => {
    c.buf = Buffer.concat([c.buf, d]);
    for (;;) {
      const r = parseReply(c.buf);
      if (!r) break;
      c.buf = c.buf.subarray(r[1]);
      const p = c.queue.shift();
      if (p) r[0] instanceof Error ? p.reject(r[0]) : p.resolve(r[0]);
    }
  });
  const fail = (err) => {
    for (const p of c.queue.splice(0)) p.reject(err || new Error('Redis connection closed'));
    if (conn === c) conn = null;
  };
  sock.on('error', fail);
  sock.on('close', () => fail());
  conn = c;
  const user = decodeURIComponent(u.username || '');
  const pass = decodeURIComponent(u.password || '');
  if (pass) send(c, user && user !== 'default' ? ['AUTH', user, pass] : ['AUTH', pass]).catch(() => {});
  return c;
}

function send(c, args) {
  return new Promise((resolve, reject) => {
    c.queue.push({ resolve, reject });
    c.sock.write(encode(args));
  });
}

// ---------- public ----------
async function cmd(...args) {
  const m = mode();
  if (m === 'rest') {
    const d = await restCall('', args.map(String));
    if (d.error) throw new Error(`Redis: ${d.error}`);
    return d.result;
  }
  if (m === 'tcp') return send(connect(), args);
  throw Object.assign(new Error('قاعدة البيانات غير مربوطة بعد (Redis)'), { status: 503, code: 'NO_DB' });
}

async function pipeline(commands) {
  if (!commands.length) return [];
  const m = mode();
  if (m === 'rest') {
    const d = await restCall('/pipeline', commands.map((c) => c.map(String)));
    return d.map((x) => {
      if (x.error) throw new Error(`Redis: ${x.error}`);
      return x.result;
    });
  }
  if (m === 'tcp') {
    const c = connect();
    return Promise.all(commands.map((args) => send(c, args)));
  }
  throw Object.assign(new Error('قاعدة البيانات غير مربوطة بعد (Redis)'), { status: 503, code: 'NO_DB' });
}

module.exports = { cmd, pipeline, mode };
