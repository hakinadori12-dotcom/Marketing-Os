// Layer 2 ↔ Google Sheets. One spreadsheet per competitor + one master spreadsheet for the brand.
// The sheets are a control surface: the owner can add notes (kept on every refresh) and decide on
// opportunities / calendar items from the sheet; «مزامنة» reads those decisions back into the platform.
const store = require('./store');
const brands = require('./brands');
const google = require('./google');

const err = (status, message) => Object.assign(new Error(message), { status });
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const RDOC = (id) => `research/${id}.json`;
const SDOC = (id) => `schedule/${id}.json`;
const BASIS = { fact: 'حقيقة', observation: 'ملاحظة', inference: 'استنتاج' };
const FUNNEL = { awareness: 'الوعي', consideration: 'الاهتمام', conversion: 'التحويل', retention: 'الولاء' };
const OPP = { proposed: 'مقترحة', approved: 'موافَق عليها', rejected: 'مرفوضة' };
const SCHED = { scheduled: 'مجدول', published: 'منشور', draft: 'مسودة' };
const back = (map, label) => Object.entries(map).find(([, v]) => v === String(label || '').trim())?.[0];

// Text cells: a leading = + - @ would be read as a formula, so force text.
const txt = (v) => {
  const s = String(v ?? '').slice(0, 45000);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};
const link = (url, label) => (/^https?:\/\//.test(url || '') ? `=HYPERLINK("${String(url).replace(/"/g, '%22')}","${String(label || url).replace(/"/g, "'").slice(0, 200)}")` : txt(label || url || ''));
const rng = (title, a1) => `'${title.replace(/'/g, "''")}'!${a1}`;
const day = (iso) => String(iso || '').slice(0, 10);

// ---------- competitor spreadsheet ----------
const C_HEAD = ['البند', 'المعلومة', 'النوع', 'المصدر', 'تاريخ البحث', 'ملاحظاتك'];
const C_TABS = [
  ['الهوية', ['summary', 'dna', 'archetype', 'personality', 'tone']],
  ['التموضع', ['positioning', 'audience', 'strengths', 'weaknesses']],
  ['السوشال ميديا', ['social', 'pillars', 'hooks']],
  ['الحملات', ['campaigns', 'offers']],
  ['الإعلانات', ['ads', 'ctas']],
  ['استراتيجية المحتوى', ['strategy', 'pillars']],
  ['القمع التسويقي', ['funnel']],
  ['الفرص', ['weaknesses']],
  ['المصادر', []],
];
const LABEL = {
  summary: 'ملخص', dna: 'Brand DNA', archetype: 'Archetype', positioning: 'التموضع', personality: 'الشخصية', tone: 'نبرة التواصل', audience: 'الجمهور المستهدف',
  strategy: 'الاستراتيجية التسويقية', social: 'السوشال ميديا', ads: 'الإعلانات', campaigns: 'الحملات', funnel: 'قمع التسويق',
  pillars: 'محور محتوى', offers: 'عرض', hooks: 'خطاف', ctas: 'دعوة للإجراء', strengths: 'نقطة قوة', weaknesses: 'نقطة ضعف',
};

function competitorRows(c, tab, keys) {
  const p = c.profile || {};
  const when = day(c.researchedAt);
  const rows = [];
  if (tab === 'المصادر') {
    for (const s of c.sources || []) rows.push(['مصدر', txt(s.title || s.url), '', link(s.url, s.url), when]);
    if (c.website) rows.push(['الموقع', txt(c.website), '', link(/^https?:/.test(c.website) ? c.website : `https://${c.website}`, c.website), when]);
    if (c.instagram) rows.push(['إنستغرام', txt(c.instagram), '', '', when]);
    return rows;
  }
  for (const k of keys) {
    if (k === 'summary') { if (p.summary) rows.push([LABEL.summary, txt(p.summary), '', '', when]); continue; }
    const v = p[k];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    const label = tab === 'الفرص' ? 'ثغرة يمكن استغلالها' : LABEL[k];
    for (const x of list) rows.push([label, txt(x.value), BASIS[x.basis] || '', link(x.source, x.source), when]);
  }
  return rows;
}

// ---------- master spreadsheet ----------
const M = {
  compare: 'مقارنة المنافسين',
  opps: 'فرص السوق',
  trends: 'الاتجاهات',
  concepts: 'أفكار المحتوى',
  funnel: 'القمع التسويقي',
  calendar: 'تقويم المحتوى',
  approvals: 'الموافقات',
};
const M_HEAD = {
  [M.compare]: ['المنافس', 'النوع', 'التموضع', 'نبرة التواصل', 'الجمهور', 'نقاط القوة', 'نقاط الضعف', 'العروض', 'الموقع', 'ملف المنافس', 'تاريخ البحث'],
  [M.opps]: ['المعرّف', 'الفرصة', 'من أين جاءت', 'الزاوية', 'مرحلة القمع', 'الحاجة', 'الصيغة', 'القرار', 'ملاحظاتك'],
  [M.trends]: ['النوع', 'المعلومة', 'الأساس', 'المصدر', 'ملاحظاتك'],
  [M.concepts]: ['المحور', 'الفكرة', 'الزاوية', 'الصيغة', 'المرحلة', 'ملاحظاتك'],
  [M.funnel]: ['المرحلة', 'الفرصة', 'الزاوية', 'الصيغة', 'القرار'],
  [M.calendar]: ['المعرّف', 'التاريخ', 'الوقت', 'المنصات', 'العنوان', 'النص', 'الوسائط', 'الحالة', 'ملاحظاتك'],
  [M.approvals]: ['العنصر', 'النوع', 'الحالة', 'التاريخ'],
};
const join = (list) => (list || []).map((x) => x.value).join(' • ');

// ---------- Sheets helpers ----------
async function meta(id) {
  return google.gapi('GET', `${API}/${id}?fields=spreadsheetId,spreadsheetUrl,sheets.properties(sheetId,title)`);
}

function headerFormat(sheetId, cols) {
  return [
    { updateSheetProperties: { properties: { sheetId, rightToLeft: true, gridProperties: { frozenRowCount: 1 } }, fields: 'rightToLeft,gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.133, green: 0.125, blue: 0.271 }, verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(textFormat,backgroundColor,verticalAlignment)' } },
    { repeatCell: { range: { sheetId, startRowIndex: 1 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: cols }, properties: { pixelSize: 220 }, fields: 'pixelSize' } },
  ];
}

// Makes sure the spreadsheet exists and has every tab. Returns { id, url, sheets: {title: sheetId} }.
async function ensure(existingId, title, tabs) {
  let m = null;
  if (existingId) {
    try { m = await meta(existingId); } catch (e) { if (e.google !== 404) throw e; }
  }
  const format = [];
  if (!m) {
    m = await google.gapi('POST', API, {
      properties: { title, locale: 'ar' },
      sheets: tabs.map(([t], i) => ({ properties: { title: t, index: i, rightToLeft: true, gridProperties: { frozenRowCount: 1 } } })),
    });
    for (const s of m.sheets) format.push(...headerFormat(s.properties.sheetId, (tabs.find(([t]) => t === s.properties.title)?.[1] || []).length || 6));
  } else {
    const have = new Set(m.sheets.map((s) => s.properties.title));
    const missing = tabs.filter(([t]) => !have.has(t));
    if (missing.length) {
      const r = await google.gapi('POST', `${API}/${m.spreadsheetId}:batchUpdate`, { requests: missing.map(([t]) => ({ addSheet: { properties: { title: t, rightToLeft: true } } })) });
      for (const rep of r.replies || []) {
        const p = rep.addSheet.properties;
        m.sheets.push({ properties: p });
        format.push(...headerFormat(p.sheetId, (tabs.find(([t]) => t === p.title)?.[1] || []).length || 6));
      }
    }
  }
  if (format.length) await google.gapi('POST', `${API}/${m.spreadsheetId}:batchUpdate`, { requests: format });
  return {
    id: m.spreadsheetId,
    url: m.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${m.spreadsheetId}/edit`,
    sheets: Object.fromEntries(m.sheets.map((s) => [s.properties.title, s.properties.sheetId])),
  };
}

async function readTabs(id, titles, cols = 'A:Z') {
  const q = titles.map((t) => `ranges=${encodeURIComponent(rng(t, cols))}`).join('&');
  const d = await google.gapi('GET', `${API}/${id}/values:batchGet?${q}&valueRenderOption=FORMATTED_VALUE`);
  return Object.fromEntries(titles.map((t, i) => [t, d.valueRanges?.[i]?.values || []]));
}

async function writeTabs(id, data) {
  const titles = Object.keys(data);
  await google.gapi('POST', `${API}/${id}/values:batchClear`, { ranges: titles.map((t) => rng(t, 'A1:Z5000')) });
  await google.gapi('POST', `${API}/${id}/values:batchUpdate`, {
    valueInputOption: 'USER_ENTERED',
    data: titles.map((t) => ({ range: rng(t, 'A1'), values: data[t] })),
  });
}

const dropdown = (sheetId, col, rows, values) => ({
  setDataValidation: {
    range: { sheetId, startRowIndex: 1, endRowIndex: Math.max(2, rows + 1), startColumnIndex: col, endColumnIndex: col + 1 },
    rule: { condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: true },
  },
});

// ---------- public API ----------
async function status(id) {
  const g = await google.status();
  const data = await store.readJSON(RDOC(id), {});
  return { google: { connected: g.connected, configured: g.configured, email: g.email }, sheets: data.sheets || { competitors: {} } };
}

async function syncCompetitor(id, cid) {
  const b = await brands.get(id);
  const data = await store.readJSON(RDOC(id), { competitors: [] }, { fresh: true });
  const c = data.competitors.find((x) => x.id === cid);
  if (!c) throw err(404, 'المنافس غير موجود');
  if (!c.profile) throw err(400, 'حلّل المنافس أولاً ثم أنشئ ملفه');
  const prev = data.sheets?.competitors?.[cid];
  const tabs = C_TABS.map(([t]) => [t, C_HEAD]);
  const ss = await ensure(prev?.id, `${c.name} — منافس ${b.name} · Marketing OS`, tabs);
  // Keep the owner's notes (last column) — matched by item + information.
  const notes = new Map();
  if (prev?.id === ss.id) {
    const old = await readTabs(ss.id, C_TABS.map(([t]) => t), 'A:F');
    for (const [t, rows] of Object.entries(old)) for (const r of rows.slice(1)) if (r[5]) notes.set(`${t}|${r[0]}|${String(r[1] || '').replace(/^'/, '')}`, r[5]);
  }
  const out = {};
  for (const [t, keys] of C_TABS) {
    const rows = competitorRows(c, t, keys).map((r) => [...r, txt(notes.get(`${t}|${r[0]}|${String(r[1]).replace(/^'/, '')}`) || '')]);
    out[t] = [C_HEAD, ...rows];
  }
  await writeTabs(ss.id, out);
  const rec = { id: ss.id, url: ss.url, at: new Date().toISOString() };
  await store.update(RDOC(id), { competitors: [] }, (d) => {
    d.sheets = d.sheets || { competitors: {} };
    d.sheets.competitors = d.sheets.competitors || {};
    d.sheets.competitors[cid] = rec;
    return d;
  });
  return rec;
}

// Reads the owner's decisions from the master sheet and applies the ones changed in the sheet.
async function pullDecisions(id, sheet) {
  const tabs = await readTabs(sheet.id, [M.opps, M.calendar], 'A:I');
  const written = sheet.written || { opps: {}, cal: {} };
  const opps = {};
  const cal = {};
  for (const r of tabs[M.opps].slice(1)) {
    const st = back(OPP, r[7]);
    if (r[0] && st && st !== written.opps?.[r[0]]) opps[r[0]] = st;
  }
  for (const r of tabs[M.calendar].slice(1)) {
    const st = back(SCHED, r[7]);
    if (r[0] && st && st !== written.cal?.[r[0]]) cal[r[0]] = st;
  }
  const notes = { opps: {}, cal: {}, trends: {}, concepts: {} };
  for (const r of tabs[M.opps].slice(1)) if (r[0] && r[8]) notes.opps[r[0]] = r[8];
  for (const r of tabs[M.calendar].slice(1)) if (r[0] && r[8]) notes.cal[r[0]] = r[8];
  let changed = 0;
  if (Object.keys(opps).length) {
    await store.update(RDOC(id), { competitors: [] }, (d) => {
      for (const o of d.cross?.opportunities || []) if (opps[o.id] && o.status !== opps[o.id]) { o.status = opps[o.id]; changed++; }
      return d;
    });
  }
  if (Object.keys(cal).length) {
    await store.update(SDOC(id), [], (list) => {
      for (const s of list) if (cal[s.id] && s.status !== cal[s.id]) { s.status = cal[s.id]; changed++; }
      return list;
    });
  }
  return { changed, notes };
}

async function syncMaster(id) {
  const b = await brands.get(id);
  let data = await store.readJSON(RDOC(id), { competitors: [] }, { fresh: true });
  const prev = data.sheets?.master;
  const tabs = Object.values(M).map((t) => [t, M_HEAD[t]]);
  const ss = await ensure(prev?.id, `${b.name} — الملف الرئيسي · Marketing OS`, tabs);
  let pulled = { changed: 0, notes: { opps: {}, cal: {} } };
  const other = { trends: new Map(), concepts: new Map() };
  if (prev?.id === ss.id) {
    pulled = await pullDecisions(id, { ...prev, id: ss.id });
    const old = await readTabs(ss.id, [M.trends, M.concepts], 'A:F');
    for (const r of old[M.trends].slice(1)) if (r[4]) other.trends.set(`${r[0]}|${String(r[1] || '').replace(/^'/, '')}`, r[4]);
    for (const r of old[M.concepts].slice(1)) if (r[5]) other.concepts.set(`${r[0]}|${String(r[1] || '').replace(/^'/, '')}`, r[5]);
    data = await store.readJSON(RDOC(id), { competitors: [] }, { fresh: true });
  }
  const sched = await store.readJSON(SDOC(id), [], { fresh: true });
  const X = data.cross;
  const ops = X?.opportunities || [];
  const cs = data.sheets?.competitors || {};

  const out = {};
  out[M.compare] = [M_HEAD[M.compare], ...data.competitors.map((c) => {
    const p = c.profile || {};
    return [txt(c.name), c.kind === 'indirect' ? 'غير مباشر' : 'مباشر', txt(p.positioning?.value), txt(p.tone?.value), txt(p.audience?.value), txt(join(p.strengths)), txt(join(p.weaknesses)), txt(join(p.offers)),
      c.website ? link(/^https?:/.test(c.website) ? c.website : `https://${c.website}`, c.website) : '', cs[c.id] ? link(cs[c.id].url, 'افتح الملف ↗') : (c.profile ? 'أنشئه من المنصة' : 'لم يُحلَّل بعد'), day(c.researchedAt)];
  })];
  out[M.opps] = [M_HEAD[M.opps], ...ops.map((o) => [o.id, txt(o.title), txt(o.why), txt(o.angle), FUNNEL[o.funnel] || txt(o.funnel), txt(o.need), txt(o.format), OPP[o.status] || OPP.proposed, txt(pulled.notes.opps[o.id] || '')])];
  const trendRows = [];
  if (X) {
    for (const [k, l] of [['repeated', 'يتكرر عند المنافسين'], ['saturated', 'مشبع (تجنّبه)'], ['unmet', 'حاجة غير ملبّاة'], ['strengths', 'قوة في السوق'], ['weaknesses', 'ضعف في السوق']]) {
      for (const x of X[k] || []) trendRows.push([l, txt(x.value), BASIS[x.basis] || '', link(x.source, x.source)]);
    }
    for (const s of X.seasonal || []) trendRows.push(['موسمي', txt(`${s.moment}: ${s.idea}`), '', '']);
  }
  out[M.trends] = [M_HEAD[M.trends], ...trendRows.map((r) => [...r, txt(other.trends.get(`${r[0]}|${String(r[1]).replace(/^'/, '')}`) || '')])];
  const conceptRows = [];
  for (const p of X?.pillars || []) conceptRows.push(['محور', txt(p), '', '', '']);
  for (const o of ops.filter((x) => x.status !== 'rejected')) conceptRows.push(['فكرة', txt(o.title), txt(o.angle), txt(o.format), FUNNEL[o.funnel] || txt(o.funnel)]);
  out[M.concepts] = [M_HEAD[M.concepts], ...conceptRows.map((r) => [...r, txt(other.concepts.get(`${r[0]}|${String(r[1]).replace(/^'/, '')}`) || '')])];
  const order = Object.keys(FUNNEL);
  out[M.funnel] = [M_HEAD[M.funnel], ...[...ops].sort((a, b2) => order.indexOf(a.funnel) - order.indexOf(b2.funnel)).map((o) => [FUNNEL[o.funnel] || txt(o.funnel), txt(o.title), txt(o.angle), txt(o.format), OPP[o.status] || OPP.proposed])];
  const cal = [...sched].sort((a, b2) => `${a.date} ${a.time}`.localeCompare(`${b2.date} ${b2.time}`));
  out[M.calendar] = [M_HEAD[M.calendar], ...cal.map((s) => [s.id, s.date, s.time, s.platforms.join('، '), txt(s.title), txt(s.caption), s.media?.url && /^https:/.test(s.media.url) ? link(s.media.url, s.media.type === 'video' ? 'فيديو ↗' : s.media.type === 'audio' ? 'صوت ↗' : 'صورة ↗') : (s.media ? 'داخل المنصة' : ''), SCHED[s.status] || SCHED.scheduled, txt(pulled.notes.cal[s.id] || '')])];
  out[M.approvals] = [M_HEAD[M.approvals],
    ...ops.filter((o) => o.status !== 'proposed').map((o) => [txt(o.title), 'فرصة', OPP[o.status], day(X.at)]),
    ...cal.filter((s) => s.status !== 'scheduled').map((s) => [txt(s.title || s.caption.slice(0, 60)), 'منشور في التقويم', SCHED[s.status], s.date])];

  await writeTabs(ss.id, out);
  await google.gapi('POST', `${API}/${ss.id}:batchUpdate`, {
    requests: [
      dropdown(ss.sheets[M.opps], 7, ops.length, Object.values(OPP)),
      dropdown(ss.sheets[M.calendar], 7, cal.length, Object.values(SCHED)),
    ],
  });
  const rec = {
    id: ss.id, url: ss.url, at: new Date().toISOString(),
    written: { opps: Object.fromEntries(ops.map((o) => [o.id, o.status || 'proposed'])), cal: Object.fromEntries(cal.map((s) => [s.id, s.status || 'scheduled'])) },
  };
  await store.update(RDOC(id), { competitors: [] }, (d) => { d.sheets = d.sheets || { competitors: {} }; d.sheets.master = rec; return d; });
  return { ...rec, written: undefined, pulled: pulled.changed };
}

// Only read decisions from the sheet (no rewrite).
async function pull(id) {
  const data = await store.readJSON(RDOC(id), {}, { fresh: true });
  const m = data.sheets?.master;
  if (!m) throw err(400, 'أنشئ الملف الرئيسي أولاً');
  const r = await pullDecisions(id, m);
  // Remember what is now applied so the same edit is not re-applied.
  if (r.changed) {
    const fresh = await store.readJSON(RDOC(id), {}, { fresh: true });
    const sched = await store.readJSON(SDOC(id), [], { fresh: true });
    await store.update(RDOC(id), {}, (d) => {
      d.sheets.master.written = {
        opps: Object.fromEntries((fresh.cross?.opportunities || []).map((o) => [o.id, o.status || 'proposed'])),
        cal: Object.fromEntries(sched.map((s) => [s.id, s.status || 'scheduled'])),
      };
      return d;
    });
  }
  return { changed: r.changed };
}

async function forget(id, which) {
  return store.update(RDOC(id), {}, (d) => {
    if (!d.sheets) return d;
    if (which === 'master') delete d.sheets.master;
    else if (d.sheets.competitors) delete d.sheets.competitors[which];
    return d;
  });
}

module.exports = { status, syncCompetitor, syncMaster, pull, forget };
