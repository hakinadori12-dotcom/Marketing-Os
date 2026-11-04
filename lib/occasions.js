// Marketing occasions for the brand's market, country by country:
// fixed dates, "nth weekday of the month" days (Thanksgiving, Mother's Day…), Easter-based days,
// Islamic moments (Umm al-Qura, approximate ±1 day) only for Muslim-majority markets, and shopping seasons.

// [code, Arabic name, regex for the market text]
const C = {
  SA: ['السعودية', /سعود|saudi|ksa|الرياض|جد[ةه]|الدمام|riyadh|jeddah/i],
  AE: ['الإمارات', /إمارات|امارات|\buae\b|emirates|دبي|dubai|أبو ?ظبي|ابو ?ظبي|abu ?dhabi|الشارقة|sharjah/i],
  QA: ['قطر', /قطر|qatar|الدوحة|doha/i],
  KW: ['الكويت', /كويت|kuwait/i],
  BH: ['البحرين', /بحرين|bahrain|المنامة|manama/i],
  OM: ['عُمان', /عُمان|سلطنة عمان|\boman\b|مسقط|muscat/i],
  MA: ['المغرب', /المغرب(?! العربي)|مغربي|morocc|maroc|الدار البيضاء|casablanca|الرباط|rabat|مراكش|marrakech|طنجة|tanger|fès|فاس/i],
  DZ: ['الجزائر', /جزائر|algeri|alg[ée]rie/i],
  TN: ['تونس', /تونس|tunisi/i],
  LY: ['ليبيا', /ليبيا|libya|libye/i],
  EG: ['مصر', /مصر|egypt|[ée]gypte|القاهرة|cairo/i],
  JO: ['الأردن', /أردن|اردن|jordan|jordanie/i],
  LB: ['لبنان', /لبنان|leban|liban|بيروت|beirut/i],
  IQ: ['العراق', /عراق|iraq|irak|بغداد/i],
  TR: ['تركيا', /تركيا|turk|türkiye|istanbul|إسطنبول|اسطنبول/i],
  PK: ['باكستان', /باكستان|pakistan/i],
  US: ['الولايات المتحدة', /الولايات المتحدة|أمريكا|امريكا|أميركا|\busa?\b|united states|[ée]tats[- ]unis|america\b|new york|نيويورك|california|كاليفورنيا|texas|florida/i],
  CA: ['كندا', /كندا|canada|toronto|montr[ée]al|vancouver/i],
  GB: ['المملكة المتحدة', /بريطانيا|المملكة المتحدة|انجلترا|إنجلترا|\buk\b|united kingdom|britain|england|royaume[- ]uni|london|لندن/i],
  FR: ['فرنسا', /فرنسا|france|paris|باريس|lyon|marseille/i],
  DE: ['ألمانيا', /ألمانيا|المانيا|german|deutschland|allemagne|berlin/i],
  ES: ['إسبانيا', /إسبانيا|اسبانيا|spain|espa[ñn]a|espagne|madrid|barcelona/i],
  IT: ['إيطاليا', /إيطاليا|ايطاليا|ital/i],
  NL: ['هولندا', /هولندا|netherlands|holland|pays-bas|amsterdam/i],
  BE: ['بلجيكا', /بلجيكا|belgi|bruxelles|brussels/i],
  CH: ['سويسرا', /سويسرا|switzerland|suisse|schweiz/i],
  AU: ['أستراليا', /أستراليا|استراليا|australia|sydney|melbourne/i],
  IN: ['الهند', /الهند|\bindia\b|inde\b|mumbai|delhi/i],
  NG: ['نيجيريا', /نيجيريا|nigeria/i],
  ZA: ['جنوب أفريقيا', /جنوب أفريقيا|جنوب افريقيا|south africa|afrique du sud/i],
  BR: ['البرازيل', /برازيل|brazil|br[ée]sil/i],
  MX: ['المكسيك', /مكسيك|mexic|m[ée]xique/i],
};
const REGIONS = [
  [/خليج|gcc|gulf|golfe/i, ['SA', 'AE', 'QA', 'KW', 'BH', 'OM']],
  [/المغرب العربي|maghreb|شمال (إ|ا)فريقيا|north africa|afrique du nord/i, ['MA', 'DZ', 'TN']],
  [/الشرق الأوسط|middle east|\bmena\b|العالم العربي|الدول العربية|arab world/i, ['SA', 'AE', 'QA', 'KW', 'EG', 'JO', 'LB']],
  [/أوروبا|اوروبا|europe|\beu\b/i, ['FR', 'DE', 'ES', 'IT', 'GB', 'NL', 'BE']],
  [/أمريكا الشمالية|north america/i, ['US', 'CA']],
];
const MUSLIM = new Set(['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'MA', 'DZ', 'TN', 'LY', 'EG', 'JO', 'LB', 'IQ', 'TR', 'PK', 'NG']);
const ARAB_MOTHERS = new Set(['EG', 'JO', 'LB', 'IQ', 'AE', 'QA', 'KW', 'BH', 'OM', 'SA']);
const BF_WEST = new Set(['US', 'CA', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AU', 'BR', 'MX', 'ZA']);

// Rules: 'MM-DD' fixed · ['nth', n, weekday(0=Sun), month] (n=-1 last) · ['easter', offset] · ['thanks', offset] (US Thanksgiving + offset)
const DAYS = {
  SA: [['02-22', 'يوم التأسيس السعودي'], ['03-11', 'يوم العلم السعودي'], ['09-23', 'اليوم الوطني السعودي']],
  AE: [['11-03', 'يوم العلم الإماراتي'], ['11-30', 'يوم الشهيد (الإمارات)'], ['12-02', 'عيد الاتحاد (اليوم الوطني الإماراتي)']],
  QA: [[['nth', 2, 2, 2], 'اليوم الرياضي للدولة (قطر)'], ['12-18', 'اليوم الوطني القطري']],
  KW: [['02-25', 'العيد الوطني الكويتي'], ['02-26', 'عيد التحرير (الكويت)']],
  BH: [['12-16', 'العيد الوطني البحريني']],
  OM: [['11-20', 'اليوم الوطني العُماني']],
  MA: [['01-11', 'ذكرى تقديم وثيقة الاستقلال (المغرب)'], ['01-14', 'رأس السنة الأمازيغية'], ['07-30', 'عيد العرش (المغرب)'], ['08-14', 'ذكرى استرجاع وادي الذهب'], ['08-20', 'ذكرى ثورة الملك والشعب'], ['08-21', 'عيد الشباب (المغرب)'], ['11-06', 'ذكرى المسيرة الخضراء'], ['11-18', 'عيد الاستقلال (المغرب)']],
  DZ: [['01-12', 'يناير (رأس السنة الأمازيغية)'], ['07-05', 'عيد الاستقلال (الجزائر)'], ['11-01', 'عيد الثورة (الجزائر)']],
  TN: [['03-20', 'عيد الاستقلال (تونس)'], ['07-25', 'عيد الجمهورية (تونس)'], ['08-13', 'عيد المرأة (تونس)']],
  LY: [['12-24', 'عيد الاستقلال (ليبيا)']],
  EG: [['01-25', 'عيد الشرطة (مصر)'], ['04-25', 'عيد تحرير سيناء'], ['07-23', 'عيد ثورة يوليو'], ['10-06', 'ذكرى نصر أكتوبر']],
  JO: [['05-25', 'عيد الاستقلال الأردني']],
  LB: [['11-22', 'عيد الاستقلال (لبنان)']],
  IQ: [['10-03', 'اليوم الوطني العراقي']],
  TR: [['04-23', 'عيد السيادة والطفل (تركيا)'], [['nth', 2, 0, 5], 'عيد الأم (تركيا)'], ['05-19', 'عيد الشباب والرياضة (تركيا)'], ['08-30', 'عيد النصر (تركيا)'], ['10-29', 'عيد الجمهورية (تركيا)']],
  PK: [['03-23', 'يوم باكستان'], ['08-14', 'عيد الاستقلال (باكستان)']],
  US: [[['nth', 3, 1, 1], 'يوم مارتن لوثر كينغ'], [['nth', 2, 0, 2], 'سوبر بول (تقريباً)'], ['02-14', 'عيد الحب (Valentine’s Day)'], [['nth', 3, 1, 2], 'يوم الرؤساء (تخفيضات)'], ['03-17', 'عيد القديس باتريك'],
    [['easter', 0], 'عيد الفصح (Easter)'], [['nth', 2, 0, 5], 'عيد الأم (Mother’s Day)'], [['nth', -1, 1, 5], 'يوم الذكرى (Memorial Day · تخفيضات)'], [['nth', 3, 0, 6], 'عيد الأب (Father’s Day)'], ['06-19', 'Juneteenth'],
    ['07-04', 'عيد الاستقلال الأمريكي'], ['08-01', 'موسم العودة للمدارس'], [['nth', 1, 1, 9], 'عيد العمال (Labor Day · تخفيضات)'], ['10-31', 'الهالوين (Halloween)'], ['11-11', 'يوم المحاربين القدامى (Veterans Day)'],
    [['thanks', 0], 'عيد الشكر (Thanksgiving)'], [['thanks', 2], 'Small Business Saturday'], [['thanks', 4], 'سايبر مانداي (Cyber Monday)'], [['thanks', 5], 'Giving Tuesday'], ['12-24', 'ليلة عيد الميلاد'], ['12-25', 'عيد الميلاد (Christmas)']],
  CA: [[['nth', 3, 1, 2], 'يوم العائلة (Family Day)'], ['02-14', 'عيد الحب'], [['easter', 0], 'عيد الفصح'], [['nth', 2, 0, 5], 'عيد الأم'], [['victoria', 0], 'يوم فيكتوريا (Victoria Day)'], [['nth', 3, 0, 6], 'عيد الأب'], ['07-01', 'يوم كندا (Canada Day)'],
    [['nth', 1, 1, 9], 'عيد العمال'], [['nth', 2, 1, 10], 'عيد الشكر الكندي'], ['10-31', 'الهالوين'], ['11-11', 'يوم الذكرى (Remembrance Day)'], [['thanks', 4], 'سايبر مانداي'], ['12-25', 'عيد الميلاد'], ['12-26', 'Boxing Day (تخفيضات)']],
  GB: [['02-14', 'عيد الحب'], [['easter', -21], 'عيد الأم البريطاني (Mothering Sunday)'], [['easter', 0], 'عيد الفصح'], [['nth', 1, 1, 5], 'عطلة بداية مايو'], [['nth', -1, 1, 5], 'عطلة الربيع (Spring bank holiday)'], [['nth', 3, 0, 6], 'عيد الأب'],
    [['nth', -1, 1, 8], 'عطلة الصيف (Summer bank holiday)'], ['10-31', 'الهالوين'], ['11-05', 'ليلة الألعاب النارية (Bonfire Night)'], [['thanks', 4], 'سايبر مانداي'], ['12-25', 'عيد الميلاد'], ['12-26', 'Boxing Day (تخفيضات)']],
  FR: [['01-06', 'عيد الغطاس (Galette des rois)'], [['nth', 2, 3, 1], 'بداية التخفيضات الشتوية (Soldes)'], ['02-14', 'عيد الحب (Saint-Valentin)'], [['easter', 0], 'عيد الفصح (Pâques)'], [['nth', -1, 0, 5], 'عيد الأم الفرنسي (Fête des mères)'],
    ['06-21', 'عيد الموسيقى (Fête de la musique)'], [['nth', 3, 0, 6], 'عيد الأب (Fête des pères)'], [['nth', -1, 3, 6], 'بداية التخفيضات الصيفية (Soldes)'], ['07-14', 'العيد الوطني الفرنسي'], ['09-01', 'الدخول المدرسي (Rentrée)'], ['11-01', 'عيد جميع القديسين'], ['12-25', 'عيد الميلاد (Noël)']],
  DE: [['02-14', 'عيد الحب'], [['easter', 0], 'عيد الفصح (Ostern)'], [['nth', 2, 0, 5], 'عيد الأم (Muttertag)'], [['easter', 39], 'عيد الأب (Vatertag)'], ['10-03', 'يوم الوحدة الألمانية'], ['11-11', 'بداية الكرنفال'], ['12-06', 'عيد القديس نيكولاس'], ['12-25', 'عيد الميلاد']],
  ES: [['01-06', 'يوم الملوك (Reyes)'], ['02-14', 'عيد الحب'], ['03-19', 'عيد الأب الإسباني'], [['easter', 0], 'عيد الفصح'], [['nth', 1, 0, 5], 'عيد الأم الإسباني'], ['10-12', 'العيد الوطني الإسباني'], ['12-25', 'عيد الميلاد']],
  IT: [['01-06', 'Befana'], ['02-14', 'عيد الحب'], ['03-19', 'عيد الأب الإيطالي'], [['easter', 0], 'عيد الفصح'], [['nth', 2, 0, 5], 'عيد الأم الإيطالي'], ['06-02', 'عيد الجمهورية الإيطالية'], ['08-15', 'فيراغوستو (Ferragosto)'], ['12-25', 'عيد الميلاد']],
  NL: [['04-27', 'يوم الملك (هولندا)'], [['nth', 2, 0, 5], 'عيد الأم'], ['12-05', 'سينتركلاس'], ['12-25', 'عيد الميلاد']],
  BE: [[['nth', 2, 0, 5], 'عيد الأم'], ['07-21', 'العيد الوطني البلجيكي'], ['12-06', 'عيد القديس نيكولاس'], ['12-25', 'عيد الميلاد']],
  CH: [[['nth', 2, 0, 5], 'عيد الأم'], ['08-01', 'العيد الوطني السويسري'], ['12-25', 'عيد الميلاد']],
  AU: [['01-26', 'يوم أستراليا'], ['04-25', 'يوم أنزاك'], [['nth', 2, 0, 5], 'عيد الأم'], ['06-30', 'نهاية السنة المالية (تخفيضات EOFY)'], [['nth', 1, 0, 9], 'عيد الأب الأسترالي'], [['thanks', 4], 'سايبر مانداي'], ['12-25', 'عيد الميلاد'], ['12-26', 'Boxing Day (تخفيضات)']],
  IN: [['01-26', 'يوم الجمهورية (الهند)'], ['08-15', 'عيد الاستقلال (الهند)'], ['10-02', 'ذكرى غاندي'], ['10-20', 'موسم ديوالي (تقريباً، تحقق من التاريخ)']],
  NG: [['06-12', 'يوم الديمقراطية (نيجيريا)'], ['10-01', 'عيد الاستقلال (نيجيريا)'], ['12-25', 'عيد الميلاد']],
  ZA: [['04-27', 'يوم الحرية (جنوب أفريقيا)'], ['06-16', 'يوم الشباب'], ['09-24', 'يوم التراث'], ['12-25', 'عيد الميلاد']],
  BR: [[['easter', -47], 'الكرنفال (Carnaval)'], [['nth', 2, 0, 5], 'عيد الأم (Dia das Mães)'], ['06-12', 'عيد الحب البرازيلي (Dia dos Namorados)'], [['nth', 2, 0, 8], 'عيد الأب (Dia dos Pais)'], ['09-07', 'عيد الاستقلال (البرازيل)'], ['12-25', 'عيد الميلاد']],
  MX: [['01-06', 'يوم الملوك'], ['02-14', 'عيد الحب والصداقة'], ['05-10', 'عيد الأم المكسيكي'], ['09-16', 'عيد الاستقلال (المكسيك)'], ['11-02', 'يوم الموتى (Día de Muertos)'], [['nth', 3, 5, 11], 'El Buen Fin (تخفيضات، تقريباً)'], ['12-25', 'عيد الميلاد']],
};

const WORLD = [
  ['01-01', 'رأس السنة الميلادية'], ['03-08', 'اليوم العالمي للمرأة'], ['04-07', 'اليوم العالمي للصحة'], ['04-22', 'يوم الأرض'], ['05-01', 'عيد العمال'],
  ['06-05', 'اليوم العالمي للبيئة'], ['08-12', 'اليوم العالمي للشباب'], ['10-01', 'اليوم العالمي للقهوة'], ['10-16', 'اليوم العالمي للغذاء'], ['11-11', 'تخفيضات 11.11'],
  ['12-03', 'اليوم العالمي لذوي الإعاقة'], ['12-31', 'ليلة رأس السنة'],
];
const ARABIC_WORLD = [['02-14', 'عيد الحب'], ['12-18', 'اليوم العالمي للغة العربية']];

const HIJRI = [
  [1, 1, 'رأس السنة الهجرية', null],
  [3, 12, 'المولد النبوي', ['MA', 'DZ', 'TN', 'LY', 'EG', 'JO', 'LB', 'IQ', 'AE', 'OM', 'KW', 'BH', 'QA', 'PK', 'TR', 'NG']],
  [9, 1, 'بداية رمضان', null],
  [9, 27, 'ليلة القدر', null],
  [10, 1, 'عيد الفطر', null],
  [12, 9, 'يوم عرفة', null],
  [12, 10, 'عيد الأضحى', null],
];

function countriesOf(market) {
  const m = String(market || '');
  const out = new Set();
  for (const [re, list] of REGIONS) if (re.test(m)) list.forEach((c) => out.add(c));
  for (const [code, [, re]] of Object.entries(C)) if (re.test(m)) out.add(code);
  return [...out];
}

const pad = (n) => String(n).padStart(2, '0');
function nth(year, n, dow, month) {
  if (n > 0) {
    const d = new Date(Date.UTC(year, month - 1, 1));
    while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCDate(d.getUTCDate() + (n - 1) * 7);
    return d;
  }
  const d = new Date(Date.UTC(year, month, 0));
  while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
function easter(year) { // Anonymous Gregorian algorithm
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
}
const add = (d, days) => new Date(d.getTime() + days * 86400000);
function resolve(rule, year) {
  if (typeof rule === 'string') return `${year}-${rule}`;
  let d;
  if (rule[0] === 'nth') d = nth(year, rule[1], rule[2], rule[3]);
  else if (rule[0] === 'easter') d = add(easter(year), rule[1]);
  else if (rule[0] === 'thanks') d = add(nth(year, 4, 4, 11), rule[1]);
  else if (rule[0] === 'victoria') { d = new Date(Date.UTC(year, 4, 24)); while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1); }
  return d ? d.toISOString().slice(0, 10) : null;
}

let hijriFmt;
function hijri(date) {
  try {
    hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
    const p = Object.fromEntries(hijriFmt.formatToParts(date).map((x) => [x.type, x.value]));
    return { m: Number(p.month), d: Number(p.day) };
  } catch {
    return null;
  }
}

// Occasions in one month for the brand's market. Unknown market: world days + Islamic moments.
function forMonth(year, month, market = '') {
  const pre = `${year}-${pad(month)}`;
  const cs = countriesOf(market);
  const many = cs.length > 1;
  const list = [];
  const push = (date, name, kind, code) => { if (date && date.startsWith(pre)) list.push({ date, name: many && code && !name.includes('(') ? `${name} · ${C[code][0]}` : name, kind, country: code || null }); };
  const arab = !cs.length || cs.some((c) => MUSLIM.has(c) && !['TR', 'PK', 'NG'].includes(c));
  for (const [d, n] of WORLD) push(`${year}-${d}`, n, 'world');
  if (arab) for (const [d, n] of ARABIC_WORLD) push(`${year}-${d}`, n, 'world');
  if (cs.some((c) => ARAB_MOTHERS.has(c))) push(`${year}-03-21`, 'عيد الأم (العالم العربي)', 'world');
  for (const c of cs) for (const [rule, name] of DAYS[c] || []) push(resolve(rule, year), name, 'national', c);
  // Black Friday (+ Cyber Monday handled per country)
  const bf = add(nth(year, 4, 4, 11), 1).toISOString().slice(0, 10);
  const gulf = cs.some((c) => ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'].includes(c));
  push(bf, gulf && !cs.some((c) => BF_WEST.has(c)) ? 'الجمعة البيضاء / Black Friday' : 'الجمعة السوداء (Black Friday)', 'shopping');
  // Islamic moments only where they matter for marketing
  if (!cs.length || cs.some((c) => MUSLIM.has(c))) {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= days; day++) {
      const h = hijri(new Date(Date.UTC(year, month - 1, day)));
      if (!h) break;
      for (const [hm, hd, name, only] of HIJRI) {
        if (h.m === hm && h.d === hd && (!only || !cs.length || only.some((c) => cs.includes(c)))) push(`${pre}-${pad(day)}`, `${name} (تقريبي)`, 'religious');
      }
    }
  }
  const seen = new Set();
  return list.filter((o) => !seen.has(o.date + o.name) && seen.add(o.date + o.name)).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { forMonth, countriesOf, COUNTRIES: C };
