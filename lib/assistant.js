// Voice / text assistant: turns a free request ("بغيت 3 بوستات إنستغرام على عرض الجمعة السوداء")
// into a structured action that the interface fills in and runs.
const ai = require('./ai');
const brands = require('./brands');
const content = require('./content');

const ACTIONS = ['content', 'plan', 'image', 'video', 'voice', 'schedule', 'analyze', 'unknown'];

const SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ACTIONS },
    reply: { type: 'string', description: 'one short sentence to the user in the same language/dialect, saying what will be done' },
    platforms: { type: 'array', items: { type: 'string' }, description: 'platform ids' },
    type: { type: 'string', description: 'content type id' },
    goal: { type: 'string', description: 'goal id' },
    dialect: { type: 'string', description: 'dialect id' },
    count: { type: 'number' },
    idea: { type: 'string', description: 'the brief / idea in the user language, complete and specific' },
    product: { type: 'string', description: 'product name if one is mentioned' },
    prompt: { type: 'string', description: 'for image/video: detailed scene description' },
    aspect: { type: 'string', description: '1:1, 4:5, 9:16 or 16:9' },
    seconds: { type: 'number', description: 'video length in seconds' },
    voiceover: { type: 'string', description: 'for video: the spoken line' },
    text: { type: 'string', description: 'for voice: the exact text to speak' },
    month: { type: 'string', description: 'for plan: YYYY-MM' },
    perWeek: { type: 'number' },
  },
  required: ['action', 'reply'],
};

async function understand(brandId, text, opts = {}) {
  const t = String(text || '').trim().slice(0, 2000);
  if (!t) throw Object.assign(new Error('قل أو اكتب طلبك'), { status: 400 });
  const b = brandId ? await brands.get(brandId).catch(() => null) : null;
  const O = content.OPTIONS;
  const now = new Date();
  const prompt = `You are the assistant of a marketing platform. Convert the user's request into ONE action for the interface.
Today is ${now.toISOString().slice(0, 10)}. Active brand: ${b ? `${b.name}${b.fields?.industry?.value ? ' (' + b.fields.industry.value + ')' : ''}` : 'none'}.
${b?.products?.length ? `Products: ${b.products.slice(0, 15).map((p) => p.name).join(', ')}` : ''}

Actions:
- content: write posts/captions/scripts/ads (default when the user asks for "content", "posts", "بوستات", "محتوى", "منشورات").
- plan: a monthly content calendar/plan.
- image: generate a picture/visual/design.
- video: generate a video/reel/clip (reel = 9:16).
- voice: generate a voice-over audio of a given text.
- schedule: open the publishing calendar.
- analyze: analyse the brand website / fill the brand brain.
- unknown: anything else (answer briefly in "reply").

Ids to use:
platforms: ${Object.keys(O.PLATFORMS).join(', ')}
type: ${Object.keys(O.TYPES).join(', ')}
goal: ${Object.keys(O.GOALS).join(', ')}
dialect: ${Object.keys(O.DIALECTS).join(', ')} (if the user speaks Moroccan Darija and does not ask otherwise, use darija)

Fill only the fields the request implies; keep the user's details (offer, occasion, product, numbers) inside "idea" or "prompt".
For image/video write "prompt" as a rich visual description. Reply in the user's language.

User request: """${t}"""`;
  const out = await ai.json(prompt, SCHEMA, { kind: 'assistant', brand: brandId, override: opts.ai });
  const j = out.json || {};
  if (!ACTIONS.includes(j.action)) j.action = 'unknown';
  j.platforms = (j.platforms || []).filter((p) => O.PLATFORMS[p]);
  if (j.type && !O.TYPES[j.type]) delete j.type;
  if (j.goal && !O.GOALS[j.goal]) delete j.goal;
  if (j.dialect && !O.DIALECTS[j.dialect]) delete j.dialect;
  if (j.count) j.count = Math.min(10, Math.max(1, Math.round(j.count)));
  if (j.product && b?.products?.length) {
    const p = b.products.find((x) => x.name.toLowerCase().includes(String(j.product).toLowerCase()) || String(j.product).toLowerCase().includes(x.name.toLowerCase()));
    if (p) j.productId = p.id;
  }
  return { ...j, transcript: t, model: `${out.provider} · ${out.model}` };
}

module.exports = { understand };
