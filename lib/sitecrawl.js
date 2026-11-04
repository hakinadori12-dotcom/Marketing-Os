// Reads a brand website deeply: home + key pages (about, services, shop, contact),
// and the full product catalogue when the site is a store (Shopify, WooCommerce, JSON-LD Product data).
const err = (status, message) => Object.assign(new Error(message), { status });
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingOS/1.0; +https://marketing-os-app-bay.vercel.app)', 'Accept-Language': 'ar,en;q=0.8,fr;q=0.6' };

function safeUrl(u) {
  let s = String(u || '').trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  const p = new URL(s);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(p.hostname) || !p.hostname.includes('.')) throw err(400, 'رابط غير مسموح');
  return p;
}

async function get(url, { accept = 'text/html', timeout = 12000, max = 900000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { ...UA, Accept: accept } });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    const text = (await res.text()).slice(0, max);
    return { url: res.url || url, type, text };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const strip = (html) => String(html || '')
  .replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<script[^>]*ld\+json[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

const KEY_PAGE = /(about|a-propos|qui-sommes|من-نحن|نبذة|story|our-story|services?|خدمات|prestations|offres?|products?|collections?|shop|boutique|store|منتجات|catalog|menu|pricing|tarifs?|الأسعار|contact|faq|livraison|shipping)/i;

function links(html, base) {
  const out = new Set();
  for (const m of String(html).matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname.replace(/^www\./, '') !== new URL(base).hostname.replace(/^www\./, '')) continue;
      if (/\.(jpg|jpeg|png|webp|gif|pdf|zip|mp4|svg)$/i.test(u.pathname)) continue;
      u.search = ''; u.hash = '';
      out.add(u.href);
    } catch { /* ignore */ }
  }
  return [...out];
}

function jsonLdProducts(html, base) {
  const out = [];
  for (const m of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let d;
    try { d = JSON.parse(m[1].trim()); } catch { continue; }
    const walk = (x) => {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) return x.forEach(walk);
      const t = [].concat(x['@type'] || []).join(',');
      if (/Product/i.test(t) && x.name) {
        const off = [].concat(x.offers || [])[0] || {};
        const img = [].concat(x.image || [])[0];
        out.push({ name: String(x.name), price: off.price ? `${off.price} ${off.priceCurrency || ''}`.trim() : '', description: strip(x.description || '').slice(0, 300), image: typeof img === 'string' ? img : img?.url || '', url: x.url ? new URL(x.url, base).href : '', category: x.category || '' });
      }
      if (/Service/i.test(t) && x.name) out.push({ name: String(x.name), description: strip(x.description || '').slice(0, 300), kind: 'service' });
      Object.values(x).forEach((v) => typeof v === 'object' && walk(v));
    };
    walk(d);
  }
  return out;
}

async function shopify(origin) {
  const r = await get(`${origin}/products.json?limit=250`, { accept: 'application/json', max: 4000000 });
  if (!r || !/json/.test(r.type)) return null;
  let d; try { d = JSON.parse(r.text); } catch { return null; }
  if (!Array.isArray(d.products)) return null;
  return d.products.map((p) => {
    const v = (p.variants || [])[0] || {};
    return { name: p.title, price: v.price ? String(v.price) : '', description: strip(p.body_html || '').slice(0, 300), image: (p.images || [])[0]?.src || '', url: `${origin}/products/${p.handle}`, category: p.product_type || '' };
  });
}

async function woo(origin) {
  const r = await get(`${origin}/wp-json/wc/store/v1/products?per_page=100`, { accept: 'application/json', max: 4000000 });
  if (!r || !/json/.test(r.type)) return null;
  let d; try { d = JSON.parse(r.text); } catch { return null; }
  if (!Array.isArray(d)) return null;
  return d.map((p) => {
    const pr = p.prices || {};
    const minor = Number(pr.currency_minor_unit ?? 2);
    const price = pr.price ? `${(Number(pr.price) / 10 ** minor).toString()} ${pr.currency_code || ''}`.trim() : '';
    return { name: strip(p.name), price, description: strip(p.short_description || p.description || '').slice(0, 300), image: (p.images || [])[0]?.src || '', url: p.permalink || '', category: (p.categories || [])[0]?.name || '' };
  });
}

// Main entry: returns { url, title, description, text, html, products, platform, pages }
async function crawl(url, { maxPages = 7 } = {}) {
  const p = safeUrl(url);
  const home = await get(p.href, { timeout: 15000 });
  if (!home) throw err(400, 'تعذّر فتح الموقع. تأكد من الرابط أو اكتب وصفاً للبراند.');
  const origin = new URL(home.url).origin;
  const title = strip((home.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = (home.text.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)/i) || [])[1] || '';
  // Key pages first (about, services, shop…), then other internal links.
  const all = links(home.text, home.url);
  const key = all.filter((l) => KEY_PAGE.test(decodeURIComponent(l))).slice(0, maxPages);
  const pages = (await Promise.all(key.map((l) => get(l)))).filter(Boolean);
  // Catalogue
  let products = [];
  let platform = '';
  const [sh, wc] = await Promise.all([shopify(origin), woo(origin)]);
  if (sh?.length) { products = sh; platform = 'Shopify'; } else if (wc?.length) { products = wc; platform = 'WooCommerce'; }
  if (!products.length) {
    const ld = [home, ...pages].flatMap((x) => jsonLdProducts(x.text, x.url));
    if (ld.length) { products = ld; platform = 'schema.org'; }
  }
  if (!products.length) {
    // product pages found in the sitemap → read a few for JSON-LD
    const sm = await get(`${origin}/sitemap.xml`, { accept: 'application/xml' });
    let urls = sm ? [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
    const child = urls.filter((u) => /product/i.test(u) && /\.xml$/i.test(u))[0];
    if (child) { const c = await get(child, { accept: 'application/xml' }); urls = c ? [...c.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : []; }
    const prodUrls = urls.filter((u) => /\/(products?|produit|item|p)\//i.test(u) && !/\.xml$/i.test(u)).slice(0, 12);
    if (prodUrls.length) {
      const got = (await Promise.all(prodUrls.map((u) => get(u)))).filter(Boolean);
      products = got.flatMap((x) => jsonLdProducts(x.text, x.url));
      if (products.length) platform = 'sitemap';
    }
  }
  const seen = new Set();
  products = products.filter((x) => x.name && !seen.has(x.name.toLowerCase()) && seen.add(x.name.toLowerCase())).slice(0, 120);
  const text = [`# ${title}`, strip(home.text).slice(0, 9000), ...pages.map((x) => `\n## ${x.url}\n${strip(x.text).slice(0, 3500)}`)].join('\n').slice(0, 30000);
  return { url: home.url, origin, title, description, text, html: home.text, products, platform, pages: pages.map((x) => x.url) };
}

// Downloads a product image (for the product photo). Returns { buf, type } or null.
async function image(url) {
  try {
    const u = safeUrl(url.startsWith('//') ? `https:${url}` : url);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(u.href, { signal: ctrl.signal, headers: UA }).finally(() => clearTimeout(t));
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!/^image\/(png|jpeg|webp)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 50 && buf.length < 6 * 1024 * 1024 ? { buf, type } : null;
  } catch {
    return null;
  }
}

module.exports = { crawl, image };
