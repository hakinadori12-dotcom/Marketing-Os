// Social Media Post Designer: the house design system of Marketing OS.
// Three style archetypes + universal layout, type, colour, copy and QA rules.
// Golden rule (v2): text NEVER touches the product (48 px protection zone); 8 text-placement layouts (L1-L8).
// Used by: design copy, AI backgrounds, 9-post campaigns (series plan + grid rhythm) and the canvas renderer.

const ARCH = {
  mono: {
    name: 'عالم بلون واحد',
    en: 'Mono-Color World',
    about: 'الحملة كلها داخل لون واحد مشبع من البراند: الأرضية والجدران والإكسسوارات والمنتج. المنتج بطل كل منشور في مشهد مختلف.',
    concept: 'The whole campaign lives inside ONE saturated brand hue: floors, walls, props, clothes and the product are tinted the same family. Recurring device: the product hero in a different themed scene each post (sport props, giant chess pieces on a checker floor, retro car hood, locker, studio plinth, fruit tray, bubbles/balloons, a model in a monochrome suit).',
    image: 'Monochrome set: floor, walls and props all in tints of the brand hero colour; the product large, sharp and centred or on a rule-of-thirds line, label facing camera and never covered by props; soft high-key studio light, crisp shadows, 50mm, editorial advertising look.',
    copy: 'Headline = brand or product + benefit; ONE highlighted word in a contrast box; placed in the empty wall/sky area beside or above the product, never over it.',
    layouts: ['L1', 'L3', 'L5'],
    palette: '80% hero hue (3 tints), 15% white, 5% accent (red/blue) used ONLY for the highlight box. One break-colour scene (sky blue or green) maximum per grid.',
    space: 'top',
  },
  glow: {
    name: 'توهّج ناعم',
    en: 'Soft Glow Beauty',
    about: 'دافئ ونظيف وأنثوي: تدرّجات وردية وخوخية بإضاءة ناعمة. بورتريه، ملمس كريم، منتج على منصة، فلات لاي، منشور تعليمي.',
    concept: 'Warm, clean, feminine: blush, rose, peach and mauve gradients with soft light. Content mix: model portrait touching skin; extreme skin/texture close-up (cream swipe, serum drop); product on a podium or glass plinth; products in a basket/flatlay; a "problem" post; an educational post.',
    image: 'Soft blush/peach/mauve background with gentle bokeh, diffused window light, natural skin texture (never plastic), 85mm, clean beauty campaign look; 1-3 delicate accents (petals, bubbles, soft circles), never cluttered.',
    copy: 'Large rounded display headline (2-3 lines), one short supporting line, then a CTA pill. Address the reader directly (feminine forms for women-focused beauty). Decorations never on the product.',
    layouts: ['L1', 'L2', 'L4', 'L6'],
    palette: 'Blush base, deep rose for headlines, white, one lilac/violet accent for logo or pill.',
    space: 'top',
  },
  street: {
    name: 'ستريت بوب',
    en: 'Street-Pop Lifestyle',
    about: 'لقطة حقيقية مرحة بعدسة واسعة: موديل بتعبير جريء، الهاتف قريب من العدسة يعرض المنتج أو التطبيق، شارع مدينة.',
    concept: 'A real-world, playful, slightly irreverent shot: ultra-wide or fisheye, low-to-high or close angle, a hand pushing a phone toward the lens (the phone shows the product page), expressive model (wink, laugh), outfit in the brand colour, city street with leading lines.',
    image: 'Ultra-wide fisheye lifestyle shot in a city street, expressive young model in an outfit using the brand colour, phone held close to the lens showing the product, daylight, playful Gen-Z energy, natural street tones plus one brand colour repeated in clothes.',
    copy: 'Minimal text: one short bold sticker-style line in the empty street/sky corner; the image does the selling; never text on the phone screen.',
    layouts: ['L5'],
    palette: 'Natural street tones + one brand colour repeated in clothes and UI.',
    space: 'corner',
  },
};

// Text-placement layouts (zones as described for 1080x1350; the renderer applies them).
// Product zone of each layout (fractions of the canvas): where the REAL product photo is composited.
const PRODUCT_ZONES = {
  L1: [0.18, 0.82, 0.385, 0.91], L2: [0.2, 0.8, 0.09, 0.563], L3: [0.06, 0.46, 0.16, 0.9], L3b: [0.54, 0.94, 0.16, 0.9],
  L4: [0.22, 0.78, 0.348, 0.815], L5: [0.06, 0.52, 0.44, 0.91], L5b: [0.06, 0.52, 0.1, 0.56], L6: [0.06, 0.46, 0.16, 0.9],
  L7: [0.15, 0.85, 0.427, 0.77], L7b: [0.15, 0.85, 0.2, 0.55],
};
const LAYOUTS = {
  L1: { name: 'عنوان أعلى · منتج أسفل', text: 'the top 35% (plain empty wall/background)', product: 'standing in the lower half, centred, 45-60% of the frame height' },
  L2: { name: 'منتج أعلى · عنوان أسفل', text: 'the bottom 35% (plain empty floor/gradient)', product: 'on a podium/plinth/shelf in the upper half, centred' },
  L3: { name: 'جانبي: نص ومنتج', text: 'the right half (plain empty background)', product: 'in the left half of the frame' },
  L4: { name: 'وسط متناظر', text: 'the top 30% (plain clean studio background)', product: 'centred in the middle, symmetrical clean studio set' },
  L5: { name: 'زاوية + منتج قطري', text: 'the top-right corner (open sky/wall)', product: 'on the opposite diagonal, bottom-left area' },
  L6: { name: 'بورتريه موديل', text: 'the side the model is NOT occupying (calm background)', product: 'the model on one side (left), looking toward the empty side' },
  L7: { name: 'ستوري / ريلز', text: 'the band between 20% and 40% from the top (calm background)', product: 'in the middle band (43%-77% height), nothing important in the top 13% and bottom 18%' },
};
const STORY_LAYOUT = 'L7';

const RULES = `HOUSE DESIGN RULES (Social Media Post Designer):
- GOLDEN RULE: text NEVER touches the product. No headline, highlight box, CTA, logo, sticker, price tag or decoration on the product or its label (48 px clear zone). Same protection for the model's face and a phone screen.
- Hierarchy max 3 levels: 1) hero (product or face, ONE focal point), 2) headline 4-8 words, 3) ONE of: short support line OR CTA OR URL. Eye path: image -> headline -> CTA/logo.
- Exactly ONE highlighted word or short phrase per post (shown in a contrast box), copied exactly from the headline.
- Headline formula: [brand or product] + [benefit in 2-4 words], the benefit's key word highlighted.
- Hooks: question, promise, contrast, playful wordplay tied to the scene/prop. One idea per post, no paragraphs on the image.
- Write in the audience's dialect; address the reader directly (feminine forms for women-focused beauty: اكتشفي، أعيدي، اطلبي).
- Caption (not on the image): hook line, 2-3 benefit lines, CTA, emoji used sparingly; 5-10 relevant hashtags separately.
- No unverifiable medical claims or "cures"; keep cosmetic claims soft ("helps", "feels", "looks"). Never invent prices or discounts.
- Never copy another brand's logo, name, mascot or exact layout.`;

const IMAGE_RULES = 'The product keeps its own clear zone and is fully visible (not cropped); product label readable and facing camera; props carry the story and link to the headline; at least 25% of the frame calm; keep skin tones natural (tint the set, not the skin); same colour grade across the series.';

const PILLARS = { hero: 'المنتج البطل', benefit: 'الفائدة والنتيجة', howto: 'طريقة الاستعمال', education: 'تعليمي', proof: 'آراء وتجارب', offer: 'عرض / دعوة' };
const TYPES = { model: 'موديل', product: 'منتج', texture: 'ملمس / مشهد', text: 'نصّي' };

// Auto pick an archetype from the brand.
function autoStyle(b) {
  const t = [b.fields?.industry?.value, b.fields?.audience?.value, b.fields?.tone?.value, ...(b.products || []).slice(0, 8).map((p) => `${p.name} ${p.category || ''}`)].join(' ').toLowerCase();
  if (/skin|beauty|cosmet|serum|cream|makeup|parfum|perfume|عناية|بشرة|تجميل|كريم|سيروم|مكياج|عطر/.test(t)) return 'glow';
  if (/app|tech|street|fashion|sneaker|gen ?z|تطبيق|موضة|أزياء|شباب/.test(t)) return 'street';
  return 'mono';
}

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
const CLAIMS = /(يعالج|علاج|يشفي|شفاء|يقضي على|نهائياً|مضمون 100|cure|heals?|treats?|guaranteed|100% results)/i;

// Checks + repairs one post (copy level). Returns notes in Arabic.
function checkPost(p) {
  const notes = [];
  const w = words(p.headline).length;
  if (w < 4 || w > 8) notes.push(`العنوان ${w} كلمات (المطلوب 4-8)`);
  if (p.highlight && !String(p.headline || '').includes(p.highlight)) {
    const hit = words(p.headline).find((x) => x.length >= 3 && (p.highlight.includes(x) || x.includes(p.highlight)));
    p.highlight = hit || '';
  }
  if (!p.highlight && words(p.headline).length) { p.highlight = words(p.headline).sort((a, b) => b.length - a.length)[0]; notes.push('اختيرت الكلمة المميّزة تلقائياً'); }
  if (CLAIMS.test(`${p.headline} ${p.sub} ${p.caption}`)) notes.push('ادعاء قوي (علاج/شفاء): خفّفه');
  return notes;
}

// Grid rhythm (3 columns): no two neighbours of the same type, one break colour max, hero in the top row, darks spread.
function rhythm(posts) {
  const cols = 3;
  const n = posts.length;
  const neighbours = (i) => [i - 1, i + 1, i - cols, i + cols].filter((j) => j >= 0 && j < n && !(j === i - 1 && i % cols === 0) && !(j === i + 1 && (i + 1) % cols === 0));
  // hero first (top-left corner is the first thing people see)
  const h = posts.findIndex((p) => p.hero);
  if (h > 0) posts.unshift(...posts.splice(h, 1));
  // break colour: keep the first only
  let br = 0;
  posts.forEach((p) => { if (p.break) { br++; if (br > 1) p.break = false; } });
  const clash = (arr, i, key) => neighbours(i).some((j) => arr[j][key] === arr[i][key]);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < n; i++) {
      if (!clash(posts, i, 'type') && !(posts[i].dark && neighbours(i).some((j) => posts[j].dark))) continue;
      for (let j = i + 1; j < n; j++) {
        [posts[i], posts[j]] = [posts[j], posts[i]];
        if (!clash(posts, i, 'type') && !clash(posts, j, 'type')) break;
        [posts[i], posts[j]] = [posts[j], posts[i]];
      }
    }
  }
  const notes = [];
  const same = posts.reduce((c, p, i) => c + (clash(posts, i, 'type') ? 1 : 0), 0);
  if (same) notes.push(`${same} منشورات بجانب منشور من نفس النوع`);
  const darkRows = [0, 1, 2].map((r) => posts.slice(r * cols, r * cols + cols).filter((p) => p.dark).length);
  if (darkRows.some((x) => x >= cols)) notes.push('صف كامل داكن: وزّع المنشورات الداكنة');
  // max 3 different layouts across the grid (feed looks designed, not random)
  const freq = {}; posts.forEach((p) => { if (p.layout) freq[p.layout] = (freq[p.layout] || 0) + 1; });
  const keep = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 3);
  const NEAR = { L1: ['L4', 'L5', 'L2', 'L3'], L2: ['L1', 'L4', 'L3'], L3: ['L6', 'L5', 'L1'], L4: ['L1', 'L2'], L5: ['L1', 'L3'], L6: ['L3', 'L1', 'L2'], L7: ['L7'] };
  posts.forEach((p) => { if (p.layout && keep.length && !keep.includes(p.layout)) p.layout = (NEAR[p.layout] || []).find((x) => keep.includes(x)) || keep[0]; });
  posts.forEach((p, i) => { p.n = i + 1; });
  return notes;
}

module.exports = { PRODUCT_ZONES, LAYOUTS, STORY_LAYOUT, ARCH, RULES, IMAGE_RULES, PILLARS, TYPES, autoStyle, checkPost, rhythm, words };
