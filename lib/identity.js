// Brand identity proposals for brands without a logo or colours: AI palettes + logo concepts.
const ai = require('./ai');
const brands = require('./brands');
const store = require('./store');
const { randomId } = require('./crypto');

const err = (status, message) => Object.assign(new Error(message), { status });

const PALETTE_SCHEMA = {
  type: 'object',
  properties: {
    palettes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'short evocative name in Arabic' },
          why: { type: 'string', description: 'two sentences in Arabic: why it fits this brand, audience and market, and how it differs from competitors' },
          colors: { type: 'array', items: { type: 'object', properties: { hex: { type: 'string' }, role: { type: 'string', description: 'primary / secondary / accent / background / text — in Arabic' } }, required: ['hex', 'role'] } },
        },
        required: ['name', 'why', 'colors'],
      },
    },
  },
  required: ['palettes'],
};

function brief(b) {
  const f = (k) => b.fields?.[k]?.value || '';
  return `Brand "${b.name}". Industry: ${f('industry')}. About: ${f('description')}. Audience: ${f('audience')}. Market: ${f('market')}. Tone: ${f('tone')}. Promise: ${f('promise')}. Competitors: ${f('competitors')}.`;
}

async function palettes(id, body = {}) {
  const b = await brands.get(id);
  const out = await ai.json(`Propose 3 distinct brand colour palettes (4-5 colours each, WCAG-friendly text/background contrast) for this brand. ${brief(b)}
${body.note ? `Owner wishes: ${String(body.note).slice(0, 400)}` : ''}
Avoid looking like the competitors. Use #RRGGBB.`, PALETTE_SCHEMA, { kind: 'identity', brand: id, override: body.ai?.provider ? body.ai : undefined });
  return (out.json.palettes || []).slice(0, 3).map((p) => ({
    name: String(p.name || ''), why: String(p.why || ''),
    colors: (p.colors || []).map((c) => ({ hex: String(c.hex || '').toUpperCase(), role: String(c.role || '') })).filter((c) => /^#[0-9A-F]{6}$/.test(c.hex)).slice(0, 6),
  })).filter((p) => p.colors.length >= 3);
}

const STYLES = {
  wordmark: 'a clean wordmark logo: the brand name in a distinctive custom typeface',
  monogram: 'a monogram logo built from the initial letter(s), bold and memorable',
  icon: 'a simple pictorial icon next to the brand name, flat geometric shapes',
  arabic: 'an Arabic calligraphy-inspired logo of the brand name, modern and legible',
  emblem: 'an emblem / badge logo with the brand name inside a simple shape',
};

async function logos(id, body = {}) {
  const b = await brands.get(id);
  const style = STYLES[body.style] ? body.style : 'wordmark';
  const colors = (body.colors || b.visual?.colors || []).filter((c) => /^#[0-9A-F]{6}$/i.test(c)).slice(0, 4);
  const count = Math.min(3, Math.max(1, Number(body.count) || 3));
  const out = [];
  const errors = [];
  for (let i = 0; i < count; i++) {
    const prompt = `Design ${STYLES[style]} for the brand "${b.name}". ${brief(b)}
Variation ${i + 1} of ${count}: make it clearly different from the other variations.
Flat vector logo, centred, on a plain pure white background, no mockup, no shadows, no gradients unless essential, no extra text or tagline${colors.length ? `, use only these colours: ${colors.join(', ')} (never write the codes)` : ''}. The brand name must be spelled exactly "${b.name}". ${body.note ? `Owner wishes: ${String(body.note).slice(0, 300)}` : ''}`;
    try {
      const img = await ai.image({ prompt, aspect: '1:1', quality: 'high', brand: id, override: body.ai?.provider ? body.ai : undefined });
      const ext = img.mime.includes('jpeg') ? 'jpg' : 'png';
      const saved = await store.saveFile(`brands/${id}/logo-concept-${Date.now()}-${i}.${ext}`, img.buffer, img.mime);
      out.push({ id: randomId(4), url: saved.url, style, model: img.model });
    } catch (e) {
      errors.push(e.message);
      if (!out.length && i === 0 && e.status === 412) throw e;
    }
  }
  if (!out.length) throw err(502, errors[errors.length - 1] || 'تعذّر توليد الشعار');
  return { logos: out, errors };
}

async function useLogo(id, { url }) {
  if (!/^(https:\/\/[^/]+\.blob\.vercel-storage\.com\/|\/api\/file\/)/.test(String(url))) throw err(400, 'رابط غير صالح');
  const b = await brands.get(id);
  return brands.setLogoUrl(id, url, b);
}

module.exports = { palettes, logos, useLogo, STYLES };
