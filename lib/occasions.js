// Marketing occasions for the brand's market: national days per country, Islamic moments
// (Umm al-Qura calendar, approximate ±1 day), shopping seasons and useful world days.
const COUNTRIES = {
  SA: { name: 'السعودية', re: /سعود|saudi|ksa|الرياض|جد[ةه]|الدمام|riyadh|jeddah/i },
  AE: { name: 'الإمارات', re: /إمارات|امارات|uae|emirates|دبي|dubai|أبو ?ظبي|ابو ?ظبي|abu ?dhabi|الشارقة|sharjah/i },
  QA: { name: 'قطر', re: /قطر|qatar|الدوحة|doha/i },
  KW: { name: 'الكويت', re: /كويت|kuwait/i },
  BH: { name: 'البحرين', re: /بحرين|bahrain|المنامة|manama/i },
  OM: { name: 'عُمان', re: /عُمان|سلطنة عمان|\boman\b|مسقط|muscat/i },
  MA: { name: 'المغرب', re: /مغرب|morocco|maroc|الدار البيضاء|casablanca|الرباط|rabat|مراكش|marrakech|طنجة/i },
  EG: { name: 'مصر', re: /مصر|egypt|القاهرة|cairo/i },
  JO: { name: 'الأردن', re: /أردن|اردن|jordan|عمّان/i },
};
const GCC = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'];

const NATIONAL = {
  SA: [['02-22', 'يوم التأسيس السعودي'], ['03-11', 'يوم العلم السعودي'], ['09-23', 'اليوم الوطني السعودي']],
  AE: [['11-03', 'يوم العلم الإماراتي'], ['11-30', 'يوم الشهيد (الإمارات)'], ['12-02', 'عيد الاتحاد (اليوم الوطني الإماراتي)']],
  QA: [['12-18', 'اليوم الوطني القطري']],
  KW: [['02-25', 'العيد الوطني الكويتي'], ['02-26', 'عيد التحرير (الكويت)']],
  BH: [['12-16', 'العيد الوطني البحريني']],
  OM: [['11-20', 'اليوم الوطني العُماني']],
  MA: [['01-14', 'رأس السنة الأمازيغية'], ['07-30', 'عيد العرش (المغرب)'], ['08-20', 'ذكرى ثورة الملك والشعب (المغرب)'], ['11-06', 'ذكرى المسيرة الخضراء (المغرب)'], ['11-18', 'عيد الاستقلال (المغرب)']],
  EG: [['07-23', 'عيد ثورة يوليو (مصر)'], ['10-06', 'ذكرى نصر أكتوبر (مصر)']],
  JO: [['05-25', 'عيد الاستقلال الأردني']],
};

const WORLD = [
  ['01-01', 'رأس السنة الميلادية'], ['02-14', 'عيد الحب'], ['03-08', 'اليوم العالمي للمرأة'], ['03-21', 'عيد الأم (العالم العربي)'],
  ['04-07', 'اليوم العالمي للصحة'], ['04-22', 'يوم الأرض'], ['05-01', 'عيد العمال'], ['06-05', 'اليوم العالمي للبيئة'],
  ['08-12', 'اليوم العالمي للشباب'], ['10-01', 'اليوم العالمي للقهوة'], ['10-16', 'اليوم العالمي للغذاء'], ['11-11', 'تخفيضات 11.11'],
  ['12-03', 'اليوم العالمي لذوي الإعاقة'], ['12-18', 'اليوم العالمي للغة العربية'], ['12-31', 'ليلة رأس السنة'],
];

// Hijri moments: [month, day, name, countries (null = all)]
const HIJRI = [
  [1, 1, 'رأس السنة الهجرية', null],
  [3, 12, 'المولد النبوي', ['MA', 'EG', 'JO', 'AE', 'OM', 'KW', 'BH', 'QA']],
  [9, 1, 'بداية رمضان', null],
  [9, 27, 'ليلة القدر', null],
  [10, 1, 'عيد الفطر', null],
  [12, 9, 'يوم عرفة', null],
  [12, 10, 'عيد الأضحى', null],
];

function countriesOf(market) {
  const m = String(market || '');
  const out = new Set();
  if (/خليج|gcc|gulf/i.test(m)) GCC.forEach((c) => out.add(c));
  for (const [code, c] of Object.entries(COUNTRIES)) if (c.re.test(m)) out.add(code);
  return [...out];
}

function blackFriday(year) {
  const d = new Date(Date.UTC(year, 10, 30));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(5, 10);
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

// Occasions in a month for the brand's market. Without a known country: world days + Islamic moments only.
function forMonth(year, month, market = '') {
  const mm = String(month).padStart(2, '0');
  const cs = countriesOf(market);
  const list = [];
  const add = (md, name, kind) => list.push({ date: `${year}-${md}`, name, kind });
  for (const [d, n] of WORLD) if (d.startsWith(mm)) add(d, n, 'world');
  for (const c of cs) for (const [d, n] of NATIONAL[c] || []) if (d.startsWith(mm)) add(d, n, 'national');
  if (month === 11) {
    const gulf = cs.some((c) => GCC.includes(c));
    add(blackFriday(year), gulf ? 'الجمعة البيضاء / Black Friday' : 'الجمعة السوداء (Black Friday)', 'shopping');
  }
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    const h = hijri(new Date(Date.UTC(year, month - 1, day)));
    if (!h) break;
    for (const [hm, hd, name, only] of HIJRI) {
      if (h.m === hm && h.d === hd && (!only || !cs.length || only.some((c) => cs.includes(c)))) {
        add(`${mm}-${String(day).padStart(2, '0')}`, `${name} (تقريبي)`, 'religious');
      }
    }
  }
  // de-duplicate by date+name
  const seen = new Set();
  return list.filter((o) => !seen.has(o.date + o.name) && seen.add(o.date + o.name)).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { forMonth, countriesOf, COUNTRIES };
