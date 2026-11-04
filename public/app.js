/* Marketing OS — Phase 1 frontend (vanilla JS, VentureOS style, RTL Arabic) */
(() => {
'use strict';

// ---------------- utils ----------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => new Intl.NumberFormat('en').format(Math.round(Number(n) || 0));
const short = (n) => { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n)); };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
function rel(t) {
  if (!t) return '—';
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  if (s < 86400 * 30) return `منذ ${Math.floor(s / 86400)} يوم`;
  return new Date(t).toLocaleDateString('ar-MA');
}

const P = {
  home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  brands: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  create: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',
  studio: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  voice: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  keys: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  research: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  approvals: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  insights: '<path d="M4 19h16M7 15l4-4 3 3 5-6"/>',
  api: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  arrow: '<path d="M19 12H5M12 5l-7 7 7 7"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  providers: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
};
const ic = (k, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${P[k] || P.dot}</svg>`;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'x-mos': '1' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') { S.authed = false; renderLogin(); throw new Error(data.error || 'سجّل الدخول'); }
  if (!res.ok) throw Object.assign(new Error(data.error || `خطأ ${res.status}`), { status: res.status });
  return data;
}

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), err ? 6000 : 3200);
}

// Long tasks keep running when the user moves to another page: the button's job is tracked
// globally (key = data-job or the button id), shown in the jobs pill, and re-marked busy on return.
const JOBS = new Map();
async function busy(btn, fn) {
  if (!btn) return fn();
  const key = btn.dataset.job || btn.id || '';
  if (key && JOBS.has(key)) return toast('هذه العملية ما زالت تعمل…');
  if (btn.disabled) return;
  const html = btn.innerHTML;
  const label = (btn.dataset.jobLabel || btn.textContent || '').trim().slice(0, 60);
  const page0 = S.page;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span>${btn.dataset.busy || ''}`;
  if (key) { JOBS.set(key, { label, page: page0, html, busyText: btn.dataset.busy || '', t: Date.now() }); drawJobs(); }
  try { return await fn(); } finally {
    if (key) {
      JOBS.delete(key); drawJobs();
      if (S.page !== page0) toast(`✓ اكتمل: ${label}`);
      $$(`[data-job="${key}"], #${CSS.escape(key)}`).forEach((b2) => { if (b2.dataset.jobBusy) { b2.disabled = false; b2.innerHTML = b2.dataset.jobBusy; delete b2.dataset.jobBusy; } });
    }
    if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; }
  }
}
function markJobs(root) {
  for (const [key, j] of JOBS) {
    $$(`[data-job="${key}"], #${CSS.escape(key)}`, root).forEach((b2) => { if (b2.tagName !== 'BUTTON' || b2.dataset.jobBusy) return; b2.dataset.jobBusy = b2.innerHTML; b2.disabled = true; b2.innerHTML = `<span class="spin"></span>${j.busyText}`; });
  }
}
const PAGE_NAMES = () => Object.fromEntries(Object.entries(typeof TITLES === 'object' ? TITLES : {}).map(([k, v]) => [k, v[0]]));
function drawJobs() {
  let el = $('#jobs');
  if (!JOBS.size) { el && el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'jobs'; el.className = 'jobs'; document.body.append(el); }
  const names = PAGE_NAMES();
  el.innerHTML = `<b class="xs">يعمل في الخلفية (${JOBS.size})</b>${[...JOBS.values()].map((j) => `<button class="job" data-jp="${j.page}"><span class="spin"></span><span class="grow">${esc(j.label)}</span><span class="muted xs">${esc(names[j.page] || '')}</span></button>`).join('')}`;
  $$('[data-jp]', el).forEach((x) => (x.onclick = () => go(x.dataset.jp)));
}

// ---------------- state ----------------
const S = {
  authed: false, user: null, page: 'home', brands: [], activeId: store.get('mos-brand', ''), brand: null,
  ov: null, brainTab: 'identity', keys: null, keyFilter: 'all', keyQuery: '', keySel: new Set(), keyLimit: 50,
  voices: null, models: null, audio: null, voiceId: store.get('mos-voice', ''), voiceQuery: '', tts: { modelId: 'eleven_multilingual_v2', stability: 0.5, similarity: 0.75, style: 0, speed: 1, text: '' },
  analysis: null, sys: null, textTest: null, storage: null,
  ctab: 'new', stab: 'image', mcache: {}, pick: (() => { try { return JSON.parse(store.get('mos-pick', '{}')) || {}; } catch { return {}; } })(), opts: null, prov: null, batches: null, batch: null, plan: null, planMonths: [], images: null,
  form: { platforms: ['instagram'], types: ['post'], type: 'post', goal: 'engagement', dialect: 'darija', framework: 'auto', count: 3, idea: '', productId: '', occasion: '' },
  planForm: { month: '', perWeek: 4, platforms: ['instagram', 'facebook'], goal: 'engagement', dialect: 'darija' },
  vid: { prompt: '', voiceover: '', aspect: '9:16', seconds: 8, audio: true, resolution: '720p', imageUrl: '' }, videos: null,
  img: { prompt: '', aspect: '1:1', style: 'photo', useLogo: false, useColors: true, text: '', quality: 'medium' },
};

const NAV = [
  ['g', 'Workspace'], ['home', 'لوحة القيادة'], ['brands', 'البراندات'], ['brain', 'عقل البراند'],
  ['g', 'Create'], ['create', 'إنشاء المحتوى'], ['studio', 'الاستوديو'], ['voice', 'التعليق الصوتي'],
  ['g', 'Strategy'], ['research', 'بحث المنافسين'], ['approvals', 'الموافقات'], ['calendar', 'التقويم والنشر'], ['insights', 'الأداء والتعلّم'],
  ['g', 'System'], ['providers', 'المفاتيح والمزوّدون'], ['keys', 'مفاتيح ElevenLabs'], ['api', 'لوحة الـ API'],
];
const TITLES = {
  home: ['لوحة القيادة', 'نظرة سريعة على براندك ومفاتيحك واستخدامك'],
  brands: ['البراندات', 'كل البراندات في محفظتك. لكل براند عقله ومفاتيحه الخاصة'],
  brain: ['عقل البراند', 'كل ما يعرفه النظام عن براندك، ومصدر كل معلومة'],
  voice: ['الأصوات', 'تعليق صوتي بـ ElevenLabs من مفاتيح البراند'],
  keys: ['مفاتيح ElevenLabs', 'مخزن مفاتيح لكل براند، مع تدوير تلقائي حسب الرصيد'],
  api: ['لوحة الـ API', 'المزوّدون والاستخدام والسجلات'],
  create: ['إنشاء المحتوى', 'منشورات جاهزة بصوت براندك، وخطة شهرية كاملة'],
  studio: ['الاستوديو', 'صور وفيديو بهوية براندك من مفاتيحك الخاصة'],
  providers: ['المفاتيح والمزوّدون', 'اربط مفاتيحك الخاصة من كل شركة. أنت تدفع للمزوّد مباشرة'],
  research: ['بحث المنافسين والسوق', 'اكتشاف المنافسين، تحليل كل واحد بمصادره، ثم الفرص لبراندك'],
  approvals: ['الموافقات', 'لا شيء يُنشر قبل موافقتك'],
  calendar: ['التقويم والنشر', 'كل ما جدولته من منشورات وصور وفيديوهات'],
  insights: ['الأداء والتعلّم', 'النظام يتعلّم من كل منشور'],
};
const SOON = {
};
const SRC = { confirmed: ['مؤكد', 'em'], extracted: ['مستخرج', 'am'], inferred: ['مستنتج', 'vi'] };
const KSTAT = { active: ['نشط', 'em'], exhausted: ['انتهى الرصيد', 'am'], invalid: ['غير صالح', 'ro'], disabled: ['معطّل', ''], error: ['خطأ مؤقت', 'sk'] };
const chip = (label, cls = '', dot = true) => `<span class="chip ${cls}">${dot ? '<span class="d"></span>' : ''}${esc(label)}</span>`;

// ---------------- menus & selects ----------------
let openMenuEl = null;
function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; } }
function openMenu(anchor, items, { search = false, width } = {}) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  const draw = (q = '') => {
    const ql = q.trim().toLowerCase();
    const list = items.filter((it) => it.divider || !ql || (it.label + ' ' + (it.desc || '')).toLowerCase().includes(ql));
    m.innerHTML = (search ? `<div class="msearch"><input placeholder="ابحث…" value="${esc(q)}"></div>` : '') +
      list.map((it, i) => it.divider ? '<div class="div"></div>' :
        `<button class="mi" data-i="${items.indexOf(it)}" style="${it.danger ? 'color:#E11D48' : ''}">
          ${it.avatar ? it.avatar : it.icon ? ic(it.icon) : it.color ? `<span class="dot" style="background:${it.color}"></span>` : ''}
          <span class="grow">${esc(it.label)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</span>
          ${it.selected ? `<span class="ck">${ic('check')}</span>` : ''}</button>`).join('');
    if (search) { const inp = $('input', m); inp.oninput = () => { draw(inp.value); $('input', m).focus(); const v = $('input', m); v.setSelectionRange(v.value.length, v.value.length); }; }
  };
  draw();
  m.addEventListener('click', (e) => {
    const b = e.target.closest('.mi');
    if (!b) return;
    const it = items[Number(b.dataset.i)];
    closeMenu();
    it.onClick && it.onClick();
  });
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  const w = Math.max(width || r.width, 220);
  m.style.width = w + 'px';
  let left = r.right - w; // RTL: align to the start (right) edge
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  const h = m.offsetHeight;
  const top = r.bottom + 6 + h > innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : r.bottom + 6;
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  openMenuEl = m;
  if (search) $('input', m).focus();
}
document.addEventListener('mousedown', (e) => { if (openMenuEl && !openMenuEl.contains(e.target) && !e.target.closest('[data-menu]')) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeModal(); } });
addEventListener('resize', closeMenu);
addEventListener('scroll', (e) => { if (openMenuEl && e.target instanceof Node && openMenuEl.contains(e.target)) return; closeMenu(); }, true);

// ---------------- drag & drop (every upload) ----------------
const dropOf = (e) => e.target instanceof Element ? e.target.closest('.drop, [data-drop]') : null;
document.addEventListener('dragover', (e) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault();
  $$('.drop.over, [data-drop].over').forEach((x) => x !== dropOf(e) && x.classList.remove('over'));
  const z = dropOf(e);
  e.dataTransfer.dropEffect = z && $('input[type=file]', z) ? 'copy' : 'none';
  z && z.classList.add('over');
});
document.addEventListener('dragleave', (e) => { const z = dropOf(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  if (!e.dataTransfer?.files?.length) return;
  e.preventDefault();
  const z = dropOf(e);
  $$('.drop.over, [data-drop].over').forEach((x) => x.classList.remove('over'));
  const input = z && $('input[type=file]', z);
  if (!input) return toast('أفلت الملف داخل خانة الرفع', true);
  const files = [...e.dataTransfer.files];
  const acc = (input.accept || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const okType = (f) => !acc.length || acc.some((a) => (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
  const good = files.filter(okType);
  if (!good.length) return toast('نوع الملف غير مدعوم هنا', true);
  const dt = new DataTransfer();
  (input.multiple ? good : good.slice(0, 1)).forEach((f) => dt.items.add(f));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});

// ---------------- modal ----------------
function modal(html, onMount) {
  closeModal();
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.id = 'modal';
  w.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  w.addEventListener('mousedown', (e) => { if (e.target === w) closeModal(); });
  document.body.append(w);
  enhanceMics(w);
  onMount && onMount($('.modal', w));
  const f = $('input,textarea', w);
  f && setTimeout(() => f.focus(), 30);
}
function closeModal() { $('#modal')?.remove(); }
function confirmBox(title, text, okLabel = 'تأكيد', danger = false) {
  return new Promise((resolve) => {
    modal(`<h2>${esc(title)}</h2><p class="sec mt8">${esc(text)}</p><div class="foot"><button class="btn ghost" data-no>إلغاء</button><button class="btn primary" data-yes style="${danger ? 'background:#BE123C;color:#fff' : ''}">${esc(okLabel)}</button></div>`, (m) => {
      $('[data-no]', m).onclick = () => { closeModal(); resolve(false); };
      $('[data-yes]', m).onclick = () => { closeModal(); resolve(true); };
    });
  });
}

// ---------------- pills ----------------
function pills(key, items, current) {
  return `<div class="pills" data-pills="${key}">${items.map(([v, l]) => `<button data-v="${v}" class="${v === current ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
}
function placePills(root = document) {
  $$('.pills', root).forEach((p) => {
    let hl = $('.hl', p);
    if (!hl) { hl = document.createElement('span'); hl.className = 'hl'; p.prepend(hl); }
    const on = $('button.on', p);
    if (!on) { hl.style.width = '0'; return; }
    Object.assign(hl.style, { left: on.offsetLeft + 'px', top: on.offsetTop + 'px', width: on.offsetWidth + 'px', height: on.offsetHeight + 'px' });
  });
}
addEventListener('resize', () => placePills());

// ---------------- login ----------------
function renderLogin() {
  $('#root').innerHTML = `<div class="login"><form class="box" id="lf">
    <div class="logo"><div class="logo-mark"><i></i></div><div><b>Marketing OS</b><small>نظام تشغيل التسويق</small></div></div>
    <h1>تسجيل الدخول</h1><p class="muted sm">أدخل كلمة المرور التي وضعتها في Vercel (ADMIN_PASSWORD).</p>
    <label class="lbl" for="pw">كلمة المرور</label>
    <input class="field" id="pw" type="password" autocomplete="current-password" required>
    <p class="xs mt8" id="lerr" style="color:#E11D48" hidden></p>
    <button class="btn primary mt16" style="width:100%" id="lbtn">دخول</button>
  </form></div>`;
  $('#pw').focus();
  $('#lf').onsubmit = (e) => {
    e.preventDefault();
    busy($('#lbtn'), async () => {
      try {
        await api('/api/login', { method: 'POST', body: { password: $('#pw').value } });
        await boot();
      } catch (err) { const el = $('#lerr'); el.hidden = false; el.textContent = err.message; }
    });
  };
}

// ---------------- shell ----------------
function brandAvatar(b, cls = '') {
  if (!b) return `<span class="av ${cls}" style="background:var(--bg-hover);color:var(--text-muted)">+</span>`;
  const url = b.logo?.url;
  return url ? `<span class="av ${cls}" style="background-image:url('${esc(url)}');background-color:#fff;border:1px solid var(--border)"></span>`
    : `<span class="av ${cls}" style="background:${esc(b.color || '#111')}">${esc((b.name || '?').trim().charAt(0))}</span>`;
}

// The platform takes the active brand's colours (only colours: buttons, selection, highlights).
function hexMix(hex, to, t) { const a = String(hex).replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16)); const d = to === 'w' ? 255 : 0; return '#' + c.map((x) => Math.round(x + (d - x) * t).toString(16).padStart(2, '0')).join(''); }
function applyBrandTheme() {
  const r = document.documentElement.style;
  const c = (S.brand?.visual?.colors || []).find((x) => /^#[0-9a-f]{6}$/i.test(x) && lum(x) > 0.02 && lum(x) < 0.85);
  const on = store.get('mos-brandui') !== 'off';
  if (!c || !on) { ['--brand', '--brand-text', '--brand-soft', '--brand-2'].forEach((k) => r.removeProperty(k)); document.documentElement.classList.remove('branded'); return; }
  const dark = document.documentElement.dataset.theme === 'dark';
  let main = c;
  if (dark && lum(main) < 0.12) main = hexMix(main, 'w', 0.35);
  if (!dark && lum(main) > 0.6) main = hexMix(main, 'b', 0.35);
  const second = (S.brand.visual.colors || []).find((x) => x !== c && /^#[0-9a-f]{6}$/i.test(x)) || hexMix(main, 'w', 0.4);
  r.setProperty('--brand', main);
  r.setProperty('--brand-text', onColor(main));
  r.setProperty('--brand-soft', dark ? hexMix(main, 'b', 0.78) : hexMix(main, 'w', 0.9));
  r.setProperty('--brand-2', second);
  document.documentElement.classList.add('branded');
}
function renderShell() {
  applyBrandTheme();
  const theme = document.documentElement.dataset.theme;
  const b = S.brand;
  $('#root').innerHTML = `<div class="app">
    <aside class="side" id="side">
      <div class="logo"><div class="logo-mark"><i></i></div><div><b>Marketing OS</b><small>نظام تشغيل التسويق</small></div></div>
      <button class="brand-btn" id="brandBtn" data-menu>${brandAvatar(b)}<span class="grow">${b ? `<b>${esc(b.name)}</b><small>البراند النشط</small>` : '<b>لا يوجد براند</b><small>أنشئ أول براند</small>'}</span>${ic('chev')}</button>
      <nav class="nav" id="nav">${NAV.map(([k, l, phase]) => k === 'g' ? `<div class="grp eyebrow">${l}</div>` :
        `<a data-p="${k}" tabindex="0" class="${S.page === k ? 'on' : ''}">${ic(k)}${esc(l)}${phase ? `<span class="soon">م${phase}</span>` : ''}</a>`).join('')}</nav>
      <div class="side-foot">
        ${pills('theme', [['light', 'فاتح'], ['dark', 'داكن']], theme)}
        ${(b?.visual?.colors || []).length ? `<label class="flex xs" style="cursor:pointer;padding:0 6px"><input type="checkbox" class="check" id="brandui" ${store.get('mos-brandui') !== 'off' ? 'checked' : ''}>ألوان ${esc(b.name)} في الواجهة <span class="grow"></span>${b.visual.colors.slice(0, 3).map((x) => `<span class="dot" style="background:${x}"></span>`).join('')}</label>` : ''}
        <div class="userrow"><span class="av" style="background:var(--btn);color:var(--btn-text)">${esc((S.user?.name || 'ح').charAt(0))}</span><span class="grow sm">${esc(S.user?.name || '')}</span><button class="btn grey icon sm" id="logout" title="خروج">${ic('logout', 'rtl-flip')}</button></div>
      </div>
    </aside>
    <div class="backdrop" id="bd" hidden></div>
    <main class="main"><header class="head" id="head"></header><div id="view"></div></main>
  </div>
  <button class="assist-fab" id="assist" title="المساعد الصوتي: قل ما تريد">${ic('voice')}<span>تكلّم</span></button>`;
  $('#brandui') && ($('#brandui').onchange = (e) => { store.set('mos-brandui', e.target.checked ? 'on' : 'off'); applyBrandTheme(); });
  $('[data-pills="theme"]').style.display = 'flex';
  $$('[data-pills="theme"] button').forEach((x) => (x.style.flex = '1'));
  $$('#nav a').forEach((a) => { a.onclick = () => go(a.dataset.p); a.onkeydown = (e) => { if (e.key === 'Enter') go(a.dataset.p); }; });
  $('#brandBtn').onclick = (e) => brandMenu(e.currentTarget);
  $('#logout').onclick = async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.hash = ''; renderLogin(); };
  $('#bd').onclick = () => toggleSide(false);
  $('#assist').onclick = assistantModal;
  placePills($('.side'));
}
function toggleSide(open) { $('#side')?.classList.toggle('open', open); const bd = $('#bd'); if (bd) bd.hidden = !open; }

function brandMenu(anchor) {
  const items = S.brands.map((b) => ({ label: b.name, desc: b.industry || (b.approved ? 'معتمد' : 'غير معتمد بعد'), color: b.color, selected: b.id === S.activeId, onClick: () => setBrand(b.id) }));
  items.push({ divider: true }, { label: 'براند جديد', icon: 'plus', onClick: newBrandModal }, { label: 'كل البراندات', icon: 'brands', onClick: () => go('brands') });
  openMenu(anchor, items, { search: S.brands.length > 6, width: anchor.offsetWidth });
}

async function setBrand(id, { silent = false } = {}) {
  S.activeId = id || '';
  store.set('mos-brand', S.activeId);
  S.brand = null; S.keys = null; S.voices = null; S.audio = null; S.analysis = null; S.keySel.clear();
  if (id) { try { S.brand = await api(`/api/brands/${id}`); } catch (e) { toast(e.message, true); } }
  if (!silent) { renderShell(); go(S.page, { replace: true }); }
}

function header(extra = '') {
  const [t, sub] = TITLES[S.page] || ['', ''];
  $('#head').innerHTML = `<button class="btn grey icon menu-btn" id="mb" aria-label="القائمة">${ic('menu')}</button>
    <div class="grow"><h1>${esc(t)}</h1><p>${esc(sub)}</p></div><div class="end">${extra}</div>`;
  $('#mb').onclick = () => toggleSide(true);
}

function go(page, { replace = false } = {}) {
  if (!PAGES[page]) page = 'home';
  S.page = page;
  closeMenu();
  toggleSide(false);
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.p === page));
  if (location.hash.slice(1) !== page) history[replace ? 'replaceState' : 'pushState'](null, '', '#' + page);
  header();
  $('#view').innerHTML = '<div class="grid c3"><div class="skel" style="height:140px"></div><div class="skel" style="height:140px"></div><div class="skel" style="height:140px"></div></div>';
  scrollTo(0, 0);
  Promise.resolve(PAGES[page]()).catch((e) => { $('#view').innerHTML = `<div class="empty"><h3>حدث خطأ</h3><p>${esc(e.message)}</p></div>`; });
}
addEventListener('popstate', () => S.authed && go(location.hash.slice(1) || 'home', { replace: true }));

function view(html) {
  const v = $('#view');
  v.innerHTML = `<div class="page">${html}</div>`;
  enhanceMics(v);
  markJobs(v);
  requestAnimationFrame(() => placePills(v));
  return v;
}
function needBrand() {
  if (S.brand) return false;
  view(`<div class="empty"><span class="ic">${ic('brands')}</span><h3>لا يوجد براند نشط</h3><p>أنشئ براندك الأول. كل براند له عقله ومفاتيحه وأصواته الخاصة.</p><button class="btn primary" id="nb">${ic('plus')}براند جديد</button></div>`);
  $('#nb').onclick = newBrandModal;
  return true;
}

// global pill clicks
document.addEventListener('click', (e) => {
  const b = e.target.closest('.pills button');
  if (!b) return;
  const p = b.parentElement;
  $$('button', p).forEach((x) => x.classList.toggle('on', x === b));
  placePills(p.parentElement);
  const key = p.dataset.pills;
  const v = b.dataset.v;
  if (key === 'theme') { document.documentElement.dataset.theme = v; store.set('mos-theme', v); applyBrandTheme(); }
  if (key === 'brain') { S.brainTab = v; PAGES.brain(); }
  if (key === 'kf') { S.keyFilter = v; S.keyLimit = 50; drawKeys(); }
  if (key === 'ctab') { S.ctab = v; S.batch = null; PAGES.create(); }
  if (key === 'aspect') S.img.aspect = v;
  if (key === 'stab') { S.stab = v; PAGES.studio(); }
  if (key === 'rtab') { S.rtab = v; PAGES.research(); }
  if (key === 'af') { S.af = v; PAGES.approvals(); }
});

// ---------------- brand create ----------------
function newBrandModal() {
  modal(`<h2>براند جديد</h2><p class="muted sm mt8">كل براند في محفظتك له عقل، ومفاتيح ElevenLabs، وأصوات خاصة به.</p>
    <label class="lbl">اسم البراند</label><input class="field" id="bn" placeholder="مثلاً: نوارة كوزمتيك" maxlength="80">
    <label class="lbl">الموقع (اختياري)</label><input class="field ltr" id="bw" placeholder="example.com" style="text-align:left">
    <p class="hint">إذا أضفت الموقع، يمكن للنظام تحليله وملء عقل البراند تلقائياً.</p>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="bc">إنشاء</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    const submit = () => busy($('#bc'), async () => {
      try {
        const b = await api('/api/brands', { method: 'POST', body: { name: $('#bn').value, website: $('#bw').value } });
        closeModal();
        S.brands = (await api('/api/brands')).brands;
        await setBrand(b.id, { silent: true });
        renderShell();
        S.brainTab = b.website ? 'analyze' : 'identity';
        go('brain');
        toast('تم إنشاء البراند');
      } catch (e) { toast(e.message, true); }
    });
    $('#bc').onclick = submit;
    $('#bn').onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  });
}

// ================= PAGES =================
const PAGES = {};

// ---------- home ----------
PAGES.home = async () => {
  header(`<button class="btn primary" id="hb">${ic('sparkle')}محتوى جديد</button>`);
  $('#hb').onclick = () => go(S.brand ? 'create' : 'brands');
  const ov = (S.ov = await api('/api/overview'));
  const b = S.brand;
  const ready = b?.readiness;
  const steps = b ? [
    ['البراند', ready.score >= 60], ['الموافقة', b.gate1?.approved], ['مفتاح AI', Boolean(ov.providers.text)], ['أول محتوى', ov.usage.content > 0],
  ] : [];
  const firstOpen = steps.findIndex((x) => !x[1]);
  const target = ['brain', 'brain', 'providers', 'create'][firstOpen] || 'create';
  const label = ['أكمل عقل البراند', 'راجع واعتمد', 'اربط مفتاح AI', 'أنشئ أول محتوى'][firstOpen] || 'أنشئ محتوى';
  const series = ov.usage.days.map((d) => d.content + d.image + d.tts);
  const maxDay = Math.max(1, ...series);
  view(`
  <div class="card outer mb16"><div class="banner"><div class="glow"></div>
    <span class="eyebrow">${b ? 'Active brand' : 'Welcome'}</span>
    <h2>${b ? `${esc(b.name)} <span>· جاهزية ${ready.score}%</span>` : 'مرحباً بك في <span>Marketing OS</span>'}</h2>
    <p>${b ? 'عقل براند مكتمل + مفتاحك الخاص = محتوى جاهز للنشر، صور إعلانية، تعليق صوتي، وخطة شهرية.' : 'ابدأ بإنشاء أول براند في محفظتك. النظام سيحلّل موقعه ويبني عقله.'}</p>
    ${b ? `<div class="steps">${steps.map(([l, ok], i) => `<span class="${ok ? 'done' : i === firstOpen ? 'now' : ''}">${ok ? '✓ ' : ''}${l}</span>`).join('')}</div>` : ''}
  </div>
  <div class="entity-foot">${b ? (b.gate1?.approved ? chip('بوابة 1 معتمدة', 'em') : chip('بوابة 1 بانتظار موافقتك', 'am')) : ''}${ov.providers.text ? chip(`الكتابة: ${ov.providers.text.name || ov.providers.text.provider}`, '', false) : chip('لا يوجد مفتاح AI', 'am')}<span class="grow"></span>
    ${b ? `<button class="btn ghost sm" data-go="studio">الاستوديو</button><button class="btn primary sm" data-go="${target}">${label}</button>` : `<button class="btn primary sm" id="hb2">${ic('plus')}براند جديد</button>`}</div></div>

  <div class="grid c4 mb16">
    ${[['create', 'دفعات محتوى', fmt(ov.usage.content), `${fmt(ov.usage.plan)} خطة شهرية · 14 يوم`],
       ['studio', 'صور مولّدة', fmt(ov.usage.image), 'آخر 14 يوماً'],
       ['voice', 'تعليقات صوتية', fmt(ov.usage.tts), `${short(ov.usage.chars)} حرف`],
       ['plug', 'مزوّدون مربوطون', fmt(ov.providers.connected), `${fmt(ov.keys.active)} مفتاح ElevenLabs نشط`]]
      .map(([i, l, n, d], ix) => `<div class="card stat ${ix === 0 ? 'feature' : ''}"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div><span class="muted xs">${d}</span></div>`).join('')}
  </div>

  <div class="grid c12">
    <div class="card s8"><div class="card-h"><h3>النشاط · آخر 14 يوماً</h3><div class="end"><span class="muted xs">محتوى + صور + أصوات</span></div></div>
      <div class="chart">${ov.usage.days.map((d, i) => `<div class="col" title="${d.day}: ${d.content} محتوى · ${d.image} صورة · ${d.tts} صوت"><i style="height:${(series[i] / maxDay) * 100}%"></i><small>${d.day.slice(8)}</small></div>`).join('')}</div>
      ${series.some(Boolean) ? '' : '<p class="muted xs mt8">لا توجد بيانات بعد. ستظهر هنا بعد أول توليد.</p>'}
    </div>
    <div class="stack s4">
      ${b ? `<div class="card"><div class="card-h"><h3>جاهزية ${esc(b.name)}</h3><div class="end"><b class="num">${ready.score}%</b></div></div>
        <div class="bar grad"><i style="width:${ready.score}%"></i></div>
        <div class="rows mt12">${ready.checks.map(([l, ok, d]) => `<div class="row-i"><span class="dot" style="background:${ok ? '#10B981' : '#D4D4D4'}"></span><div class="t"><b style="font-weight:500">${l}</b></div><span class="muted xs">${esc(d)}</span></div>`).join('')}</div></div>` : ''}
      <div class="card"><div class="card-h"><h3>خطة البناء</h3></div><div class="rows">
        ${[['1', 'البراندات، عقل البراند، الأصوات، المفاتيح', 'em', 'جاهز'], ['2', 'إنشاء المحتوى، الخطة الشهرية، استوديو الصور', 'em', 'جاهز'], ['3', 'الفيديو (Kling, Seedance, Veo)، الموافقات، التقويم والنشر', '', 'التالي'], ['4', 'بحث المنافسين + التعلّم من الأداء', '', 'لاحقاً']]
          .map(([n, t, c, st]) => `<div class="row-i"><span class="ic" style="width:26px;height:26px;border-radius:8px;font-size:12px">${n}</span><div class="t"><small style="color:var(--text)">${t}</small></div>${chip(st, c)}</div>`).join('')}
      </div></div>
    </div>
  </div>`);
  $$('[data-go]').forEach((x) => (x.onclick = () => go(x.dataset.go)));
  $('#hb2') && ($('#hb2').onclick = newBrandModal);
};

// ---------- brands (portfolio) ----------
PAGES.brands = async () => {
  header(`<button class="btn primary" id="nb">${ic('plus')}براند جديد</button>`);
  $('#nb').onclick = newBrandModal;
  S.brands = (await api('/api/brands')).brands;
  const ov = S.ov || (S.ov = await api('/api/overview'));
  const keysOf = (id) => ov.brands.find((x) => x.id === id)?.keys || { total: 0, active: 0 };
  const v = view(`<div class="grid c3">
    ${S.brands.map((b) => { const k = keysOf(b.id); return `<div class="card outer ent" data-b="${b.id}">
      <div class="cover"><i style="background:${esc(b.color)}"></i></div>
      <div class="tile" style="background:${esc(b.color)}">${esc(b.name.charAt(0))}</div>
      <div class="body"><div class="flex"><b class="grow" style="font-size:15px">${esc(b.name)}</b>
        <button class="btn grey icon sm" data-more="${b.id}" data-menu aria-label="خيارات">${ic('dots')}</button></div>
        <p class="muted xs">${esc(b.industry || b.website || 'لم يُحلَّل بعد')}</p>
        <div class="flex mt12"><span class="xs sec">الجاهزية</span><span class="grow"><span class="bar grad" style="display:block"><i style="width:${b.score}%"></i></span></span><b class="xs num">${b.score}%</b></div>
        <div class="flex wrap mt12">${b.approved ? chip('معتمد', 'em') : chip('غير معتمد', 'am')}${chip(`${k.active}/${k.total} مفتاح`, '', false)}${b.id === S.activeId ? chip('نشط', 'vi') : ''}</div>
      </div></div>`; }).join('')}
    <div class="ent"><div class="add" id="addCard"><span class="ic">${ic('plus')}</span><b>براند جديد</b><span class="xs">أضف براند لمحفظتك</span></div></div>
  </div>`);
  $('#addCard').onclick = newBrandModal;
  $$('[data-b]', v).forEach((c) => (c.onclick = async (e) => {
    if (e.target.closest('[data-more]')) return;
    await setBrand(c.dataset.b, { silent: true });
    renderShell();
    go('brain');
  }));
  $$('[data-more]', v).forEach((btn) => (btn.onclick = (e) => {
    e.stopPropagation();
    const b = S.brands.find((x) => x.id === btn.dataset.more);
    openMenu(btn, [
      { label: 'فتح عقل البراند', icon: 'brain', onClick: async () => { await setBrand(b.id, { silent: true }); renderShell(); go('brain'); } },
      { label: 'المفاتيح', icon: 'keys', onClick: async () => { await setBrand(b.id, { silent: true }); renderShell(); go('keys'); } },
      { divider: true },
      { label: 'حذف البراند', icon: 'trash', danger: true, onClick: async () => {
        if (!(await confirmBox('حذف البراند؟', `سيتم حذف "${b.name}" وكل مفاتيحه. لا يمكن التراجع.`, 'حذف', true))) return;
        try { await api(`/api/brands/${b.id}`, { method: 'DELETE' }); S.ov = null; toast('تم الحذف'); if (b.id === S.activeId) { S.brands = (await api('/api/brands')).brands; await setBrand(S.brands[0]?.id || '', { silent: true }); renderShell(); } go('brands', { replace: true }); } catch (err) { toast(err.message, true); }
      } },
    ], { width: 220 });
  }));
};

// ---------- brain ----------
PAGES.brain = async () => {
  if (needBrand()) return header();
  const b = S.brand;
  header(b.gate1?.approved
    ? `${chip('بوابة 1 · معتمد', 'em')}<button class="btn ghost" id="unap">إلغاء الاعتماد</button>`
    : `<button class="btn primary" id="ap">${ic('check')}اعتماد البراند</button>`);
  $('#ap') && ($('#ap').onclick = (e) => busy(e.currentTarget, async () => { await patchBrand({ gate1: true }); toast('تم اعتماد البراند (بوابة 1)'); }));
  $('#unap') && ($('#unap').onclick = (e) => busy(e.currentTarget, () => patchBrand({ gate1: false })));
  const tabs = pills('brain', [['identity', 'الهوية'], ['products', `المنتجات${b.products.length ? ' · ' + b.products.length : ''}`], ['visual', 'الهوية البصرية'], ['analyze', '✦ التحليل الذكي']], S.brainTab);
  if (S.brainTab === 'analyze') await loadModels('text').catch(() => null);
  const html = { identity: brainIdentity, products: brainProducts, visual: brainVisual, analyze: brainAnalyze }[S.brainTab]();
  const v = view(`<div class="toolbar">${tabs}</div>${html}`);
  bindBrain(v);
};

async function patchBrand(body) {
  S.brand = await api(`/api/brands/${S.brand.id}`, { method: 'PATCH', body });
  S.ov = null;
  const i = S.brands.findIndex((x) => x.id === S.brand.id);
  if (i >= 0) S.brands[i] = { ...S.brands[i], name: S.brand.name, approved: Boolean(S.brand.gate1?.approved), score: S.brand.readiness.score };
  if (S.page === 'brain') { renderShell(); go('brain', { replace: true }); }
}

function readinessCard() {
  const r = S.brand.readiness;
  return `<div class="card stat"><div class="flex"><span class="ic">${ic('brain')}</span><span class="sec sm">اكتمال عقل البراند</span></div>
    <div class="num">${r.score}%</div><div class="bar grad"><i style="width:${r.score}%"></i></div>
    <div class="rows mt12">${r.checks.map(([l, ok, d]) => `<div class="row-i" style="padding:8px 0"><span class="dot" style="background:${ok ? '#10B981' : 'var(--border)'}"></span><div class="t"><small style="color:var(--text)">${l}</small></div><span class="muted xs">${esc(d)}</span></div>`).join('')}</div></div>`;
}

function brainIdentity() {
  const b = S.brand;
  const row = (k, label, val, src, ltr) => `<div class="prop"><span class="k">${ic('dot')}${esc(label)}</span><span class="v">
    <span class="val ${val ? '' : 'empty'} ${ltr ? 'ltr' : ''}" data-edit="${k}" tabindex="0">${val ? esc(val) : 'اضغط للإضافة'}</span>
    ${src ? `<button class="chip ${SRC[src][1]}" data-confirm="${k}" title="${src === 'confirmed' ? 'أكّدتها أنت' : 'اضغط للتأكيد'}"><span class="d"></span>${SRC[src][0]}</button>` : ''}</span></div>`;
  return `<div class="grid c12">
    <div class="card s8"><div class="card-h"><h3>هوية البراند</h3><div class="end"><span class="muted xs">اضغط على أي قيمة لتعديلها</span></div></div>
      ${row('name', 'الاسم', b.name)}
      ${row('website', 'الموقع', b.website, null, true)}
      ${b.fieldDefs.map(([k, l]) => row(k, l, b.fields[k]?.value, b.fields[k]?.source)).join('')}
      <div class="legend mt12">${Object.values(SRC).map(([l, c]) => chip(l, c)).join('')}<span class="muted">مؤكد = كتبته أنت · مستخرج = من الموقع · مستنتج = تخمين الذكاء الاصطناعي</span></div>
    </div>
    <div class="stack s4">${readinessCard()}
      <div class="card"><div class="card-h"><h3>املأها تلقائياً</h3></div><p class="muted sm">دع النظام يقرأ موقعك أو وصفك ويملأ الحقول، ثم راجعها.</p><button class="btn grey mt12" data-tab="analyze">${ic('sparkle')}التحليل الذكي</button></div>
    </div></div>`;
}

function brainProducts() {
  const p = S.brand.products;
  const missing = p.filter((x) => !x.photo && x.kind !== 'service').length;
  return `<div class="grid c12"><div class="card s8"><div class="card-h"><h3>المنتجات والخدمات</h3><div class="end">${missing ? chip(`${missing} بدون صورة`, 'am') : ''}<span class="muted xs">${p.length} عنصر</span></div></div>
    ${missing ? `<div class="inset sm mb16">صورة المنتج <b>إلزامية</b> لتوليد صوره: الذكاء الاصطناعي يستعملها كمرجع حتى يُظهر نفس المنتج بالضبط ولا يخترع منتجاً آخر. اضغط «تعديل» لإضافة الصورة والسعر.</div>` : ''}
    ${p.length ? `<div class="tablewrap"><table><thead><tr><th>الصورة</th><th>الاسم</th><th>السعر</th><th>الوصف</th><th>المصدر</th><th></th></tr></thead><tbody>
      ${p.map((x) => `<tr><td>${x.photo ? `<img src="${esc(x.photo)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;display:block">` : `<button class="btn grey sm" data-ep="${x.id}">${ic('upload')}صورة</button>`}</td>
      <td><b>${esc(x.name)}</b>${x.kind === 'service' ? ` ${chip('خدمة', 'sk', false)}` : ''}${x.category ? `<div class="xs muted">${esc(x.category)}</div>` : ''}</td><td class="tnum">${x.price ? esc(x.price) : `<button class="btn ghost sm" data-ep="${x.id}">+ السعر</button>`}</td><td class="sec sm">${esc(x.description || '')}</td><td>${chip(SRC[x.source]?.[0] || 'مؤكد', SRC[x.source]?.[1] || 'em')}</td>
      <td><div class="flex" style="gap:6px"><button class="btn grey sm" data-ep="${x.id}">${ic('edit')}تعديل</button><button class="btn grey icon sm" data-delp="${x.id}" aria-label="حذف">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty" style="padding:28px"><span class="ic">${ic('studio')}</span><h3>لا توجد منتجات بعد</h3><p>أضف منتجاتك يدوياً أو استخرجها من الموقع عبر التحليل الذكي.</p></div>`}
  </div>
  <div class="card s4"><div class="card-h"><h3>إضافة منتج</h3></div>
    <label class="drop" id="pdrop" style="display:block;padding:14px">${ic('upload')}<div class="mt8"><b id="pphl">صورة المنتج (إلزامية)</b></div><div class="xs">PNG / JPG / WEBP · خلفية بسيطة أفضل · حتى 5MB</div><input type="file" id="pph" accept="image/png,image/jpeg,image/webp" hidden></label>
    <label class="lbl">الاسم</label><input class="field" id="pn">
    <label class="lbl">السعر</label><input class="field" id="pp" placeholder="مثلاً: 189 درهم أو 49 ر.س">
    <label class="lbl">وصف قصير</label><textarea class="field" id="pd" rows="3"></textarea>
    <button class="btn primary mt16" style="width:100%" id="padd" data-busy="يحفظ…">${ic('plus')}إضافة</button></div></div>`;
}
const readImage = (file, max = 5) => new Promise((ok, no) => {
  if (!file) return no(new Error('اختر صورة'));
  if (file.size > max * 1024 * 1024) return no(new Error(`حجم الصورة أكبر من ${max}MB`));
  const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('تعذّرت قراءة الملف')); r.readAsDataURL(file);
});
// Product without a photo: upload it right here (saved to the Brand Brain), then continue.
function productPhotoModal(prod, onDone) {
  let photo = null;
  modal(`<h2>صورة المنتج مطلوبة</h2>
    <p class="muted sm mt8">لتصميم صورة لـ <b>${esc(prod.name)}</b> نحتاج صورته الحقيقية كمرجع، حتى يُظهر الذكاء الاصطناعي نفس المنتج بالضبط ولا يخترع منتجاً آخر. ستُحفظ أيضاً في عقل البراند ← المنتجات.</p>
    <label class="drop mt12" style="display:block;padding:18px"><span id="ppmv">${ic('upload')}<div class="mt8"><b>ارفع صورة المنتج</b></div><div class="xs">PNG / JPG / WEBP · خلفية بسيطة أفضل · حتى 5MB</div></span><input type="file" id="ppmf" accept="image/png,image/jpeg,image/webp" hidden></label>
    ${S.brand.products.some((p) => p.photo && p.id !== prod.id) ? `<p class="xs muted mt12">أو استعمل صورة منتج آخر محفوظ:</p><div class="flex wrap mt8" style="gap:8px">${S.brand.products.filter((p) => p.photo && p.id !== prod.id).slice(0, 8).map((p) => `<button class="btn grey sm" data-usep="${p.id}" style="height:auto;padding:6px"><img src="${esc(p.photo)}" alt="${esc(p.name)}" style="width:40px;height:40px;object-fit:cover;border-radius:8px"><span class="xs">${esc(p.name)}</span></button>`).join('')}</div>` : ''}
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="ppms" data-busy="يحفظ…" disabled>${ic('check')}احفظ وتابع التصميم</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    $('#ppmf', m).onchange = async (e) => { try { photo = await readImage(e.target.files[0]); $('#ppmv', m).innerHTML = `<img src="${photo}" alt="" style="max-height:160px;border-radius:12px">`; $('#ppms', m).disabled = false; } catch (err) { toast(err.message, true); } };
    const save = async (dataUrl) => { S.brand = await api(`/api/brands/${S.brand.id}/products/${prod.id}/photo`, { method: 'POST', body: { dataUrl } }); closeModal(); toast('حُفظت صورة المنتج'); onDone && onDone(); };
    $('#ppms', m).onclick = () => busy($('#ppms', m), async () => { try { await save(photo); } catch (err) { toast(err.message, true); } });
    $$('[data-usep]', m).forEach((x) => (x.onclick = () => busy(x, async () => {
      try { const src = S.brand.products.find((p) => p.id === x.dataset.usep).photo; const blob = await (await fetch(src)).blob(); const dataUrl = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); }); await save(dataUrl); } catch (err) { toast(err.message, true); }
    })));
  });
}
function productModal(x) {
  const b = S.brand;
  let photo = null;
  modal(`<h2>${esc(x.name)}</h2>
    <div class="flex mt12" style="gap:14px;align-items:flex-start">
      <label class="drop" style="display:block;width:150px;flex:none;padding:10px;text-align:center">${x.photo ? `<img id="pmimg" src="${esc(x.photo)}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px">` : `<span id="pmimg">${ic('upload')}</span>`}<div class="xs mt8">${x.photo ? 'تغيير الصورة' : 'ارفع الصورة (إلزامية)'}</div><input type="file" id="pmf" accept="image/png,image/jpeg,image/webp" hidden></label>
      <div class="grow"><label class="lbl" style="margin-top:0">الاسم</label><input class="field" id="pmn" value="${esc(x.name)}">
        <label class="lbl">السعر</label><input class="field" id="pmp" value="${esc(x.price || '')}" placeholder="مثلاً: 189 درهم أو 49 ر.س"></div></div>
    <label class="lbl">الوصف</label><textarea class="field" id="pmd" rows="3">${esc(x.description || '')}</textarea>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="pms" data-busy="يحفظ…">${ic('check')}حفظ</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    $('#pmf', m).onchange = async (e) => { try { photo = await readImage(e.target.files[0]); $('#pmimg', m).outerHTML = `<img id="pmimg" src="${photo}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px">`; } catch (err) { toast(err.message, true); } };
    $('#pms', m).onclick = () => busy($('#pms', m), async () => {
      try {
        const name = $('#pmn', m).value.trim();
        if (!name) return toast('اكتب اسم المنتج', true);
        await patchBrand({ products: b.products.map((p) => (p.id === x.id ? { ...p, name, price: $('#pmp', m).value, description: $('#pmd', m).value, source: 'confirmed' } : p)) });
        if (photo) { S.brand = await api(`/api/brands/${b.id}/products/${x.id}/photo`, { method: 'POST', body: { dataUrl: photo } }); renderShell(); go('brain', { replace: true }); }
        closeModal(); toast('تم الحفظ');
      } catch (err) { toast(err.message, true); }
    });
  });
}

function guideCard(b) {
  const g = b.visual?.guide;
  if (!g) return `<div class="card s12"><div class="card-h"><h3>دليل الهوية البصرية</h3><div class="end">${chip('اختياري', '', false)}</div></div>
    <p class="muted sm">ارفع دليل البراند (Brand Book) أو ملف نظام التصميم: PDF أو MD أو TXT. النظام يستخرج الألوان وأدوارها، والخطوط، والقواعد والممنوعات، ويطبّقها على كل الصور والمحتوى.</p>
    <div class="grid c2 mt12" style="gap:12px">
      <label class="drop" id="gdrop" style="display:block">${ic('upload')}<div class="mt8"><b>ارفع الملف</b></div><div class="xs">PDF · MD · TXT · حتى 4MB</div><input type="file" id="gfile" accept=".pdf,.md,.markdown,.txt,.json,.css,application/pdf,text/*" hidden></label>
      <div><textarea class="field" id="gtext" data-mic rows="5" placeholder="أو الصق نص الدليل هنا…"></textarea><div class="flex mt8" style="justify-content:flex-end"><button class="btn primary sm" id="gpaste" data-busy="يقرأ الدليل…">${ic('sparkle')}تحليل النص</button></div></div>
    </div></div>`;
  return `<div class="card s12"><div class="card-h"><h3>دليل الهوية البصرية</h3><div class="end">${chip('مطبّق على كل التوليدات', 'em')}<span class="muted xs">${esc(g.source)} · ${rel(g.at)}</span>
      <label class="btn grey sm" data-drop style="cursor:pointer">${ic('refresh')}تحديث<input type="file" id="gfile" accept=".pdf,.md,.markdown,.txt,.json,.css,application/pdf,text/*" hidden></label><button class="btn grey icon sm" id="gdel" aria-label="حذف الدليل">${ic('trash')}</button></div></div>
    <p class="sm">${esc(g.summary)}</p>
    ${g.colors.length ? `<span class="lbl">الألوان</span><div class="flex wrap" style="gap:10px">${g.colors.map((c) => `<div class="flex" style="gap:8px;min-width:200px"><span class="swatch" style="background:${c.hex};width:34px;height:34px;cursor:default"></span><div><b class="xs">${esc(c.name || c.hex)}</b> <span class="mono xs ltr muted">${c.hex}</span><div class="xs muted">${esc(c.use || '')}</div></div></div>`).join('')}</div>` : ''}
    ${g.fonts.length ? `<span class="lbl">الخطوط</span><div class="flex wrap">${g.fonts.map((f) => chip(`${f.name}${f.use ? ' · ' + f.use : ''}`, '', false)).join('')}</div>` : ''}
    <div class="grid c2 mt8" style="gap:16px">
      ${g.rules.length ? `<div><span class="lbl">القواعد</span><ul class="sm sec" style="padding-inline-start:18px">${g.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
      ${g.donts.length ? `<div><span class="lbl">الممنوعات</span><ul class="sm sec" style="padding-inline-start:18px">${g.donts.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    </div></div>`;
}

function brainVisual() {
  const b = S.brand;
  const colors = b.visual?.colors || [];
  const needs = !b.logo || colors.length < 2 || !b.visual?.fonts?.heading;
  const miss = [!b.logo && 'شعار', colors.length < 2 && 'ألوان', !b.visual?.fonts?.heading && 'خطوط'].filter(Boolean);
  return `<div class="grid c12">${needs ? `<div class="card s12 propose"><div class="flex wrap" style="gap:14px"><span class="ic">${ic('sparkle')}</span><div class="grow"><b>ما عندكش ${miss.join(' ولا ')}؟</b><p class="muted sm">الذكاء الاصطناعي يقترح عليك ${miss.join(' و')} تناسب براندك وجمهورك وتميّزك عن المنافسين. أنت من يقرر.</p></div>
    ${colors.length < 2 ? `<button class="btn ghost" id="idpal" data-busy="يقترح…">${ic('sparkle')}اقترح ألواناً</button>` : ''}${!b.visual?.fonts?.heading ? `<button class="btn ghost" id="idfont2" data-busy="يقترح…">${ic('sparkle')}اقترح خطوطاً</button>` : ''}${!b.logo ? `<button class="btn primary" id="idlogo">${ic('studio')}صمّم شعاراً</button>` : ''}</div></div>` : ''}${guideCard(b)}
    <div class="card s6"><div class="card-h"><h3>الشعار</h3>${b.logo ? `<div class="end">${chip('مرفوع', 'em')}</div>` : ''}</div>
      ${b.logo?.url ? `<div class="inset" style="display:grid;place-items:center;height:180px"><img src="${esc(b.logo.url)}" alt="logo" style="max-width:70%;max-height:150px;object-fit:contain"></div>` : ''}
      <label class="drop mt12" id="drop" style="display:block">${ic('upload')}<div class="mt8"><b>${b.logo ? 'تغيير الشعار' : 'ارفع الشعار'}</b></div><div class="xs">PNG بخلفية شفافة أفضل · حتى 3MB</div><input type="file" id="logoIn" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
    </div>
    <div class="stack s6">
      <div class="card"><div class="card-h"><h3>ألوان البراند</h3><div class="end"><span class="muted xs">${colors.length}/8</span></div></div>
        <div class="flex wrap" style="gap:10px">${colors.map((c, i) => `<span class="swatch" style="background:${c}" title="${c}"><button data-delc="${i}" aria-label="حذف">×</button></span>`).join('')}
          ${colors.length < 8 ? `<label class="swatch" style="display:grid;place-items:center;border-style:dashed" title="إضافة لون">${ic('plus')}<input type="color" id="addc" value="#5A3FFB" style="position:absolute;opacity:0;inset:0;cursor:pointer"></label>` : ''}</div>
        <p class="hint mt12">${colors.length ? colors.map((c) => `<span class="ltr mono">${c}</span>`).join(' · ') : 'أضف لونين على الأقل. التحليل الذكي يقترح ألواناً من موقعك.'}</p>
      </div>
      <div class="card"><div class="card-h"><h3>خطوط البراند</h3><div class="end"><button class="btn ${b.visual?.fonts?.heading ? 'grey' : 'primary'} sm" id="idfont" data-busy="يقترح…">${ic('sparkle')}${b.visual?.fonts?.heading ? 'اقترح غيرها' : 'اقترح خطوطاً'}</button></div></div>
        ${b.visual?.fonts?.heading ? (loadGFonts([b.visual.fonts.heading, b.visual.fonts.body, b.visual.fonts.latin]), `<div style="font-family:'${esc(b.visual.fonts.heading)}';font-size:34px;font-weight:700;line-height:1.2">${esc(b.name)}</div>
          <p style="font-family:'${esc(b.visual.fonts.body)}';font-size:16px" class="mt8">نص تجريبي يوضح كيف يبدو المحتوى المكتوب بخط البراند على الشاشة.</p>
          ${b.visual.fonts.latin ? `<p class="ltr" style="font-family:'${esc(b.visual.fonts.latin)}';font-size:16px;text-align:left">The quick brown fox · 0123456789</p>` : ''}
          <div class="flex wrap mt8">${chip(`العناوين: ${b.visual.fonts.heading}`, 'vi', false)}${chip(`النصوص: ${b.visual.fonts.body}`, '', false)}${b.visual.fonts.latin ? chip(`لاتيني: ${b.visual.fonts.latin}`, '', false) : ''}</div>`)
        : `<p class="muted sm">ما عندكش خط محدد؟ الذكاء الاصطناعي يقترح 3 توليفات (خط للعناوين + خط للنصوص + خط لاتيني) تناسب شخصية براندك وألوانه وشعاره، كلها خطوط Google مجانية للاستعمال التجاري.</p>`}
      </div>
    </div></div>`;
}

function brainAnalyze() {
  const a = S.analysis;
  const b = S.brand;
  const BT = { ecommerce: 'متجر إلكتروني', services: 'خدمات', both: 'منتجات وخدمات', other: 'نشاط آخر' };
  const sug = a ? Object.entries(a.suggestions || {}) : [];
  const res = !a ? '' : `<div class="card mt16"><div class="card-h"><span class="ic">${ic('check')}</span><h3>تم ملء عقل البراند</h3><div class="end">${chip(BT[a.businessType] || '', 'vi', false)}<span class="muted xs">${esc(a.via || '')}</span></div></div>
    ${a.understanding ? `<div class="inset sm"><b>فهمت براندك هكذا:</b><p class="mt8 sec">${esc(a.understanding)}</p></div>` : ''}
    <div class="grid c4 mt12">
      <div class="inset"><div class="num" style="font-size:24px;font-weight:600">${a.filled.length}</div><div class="xs muted">حقل فارغ مُلئ</div></div>
      <div class="inset"><div class="num" style="font-size:24px;font-weight:600">${a.products.added}</div><div class="xs muted">${a.businessType === 'services' ? 'خدمة' : 'منتج/خدمة'} جديد${a.products.catalogue ? ` · من ${esc(a.products.platform)}` : ''}</div></div>
      <div class="inset"><div class="num" style="font-size:24px;font-weight:600">${a.products.photos}</div><div class="xs muted">صورة منتج من المتجر</div></div>
      <div class="inset"><div class="num" style="font-size:24px;font-weight:600">${a.site ? a.site.pages + 1 : 0}</div><div class="xs muted">صفحة قُرئت${a.web ? ' + بحث الإنترنت' : ''}</div></div>
    </div>
    ${a.filled.length ? `<p class="xs muted mt12">مُلئت: ${a.filled.map((k) => esc((b.fieldDefs.find(([x]) => x === k) || [k, k])[1])).join('، ')}. كل حقل موسوم بمصدره (مستخرج / مستنتج)، وتقدر تعدّله في «الهوية».</p>` : ''}
    ${sug.length ? `<span class="lbl">اقتراحات لحقول عندك فيها قيمة (لن تُستبدل إلا إذا اخترت)</span>
      ${sug.map(([k, f]) => `<label class="prop" style="cursor:pointer"><span class="k"><input type="checkbox" class="check" data-af="${k}">${esc((b.fieldDefs.find(([x]) => x === k) || [k, k])[1])}</span><span class="v"><span class="grow">${esc(f.value)}<div class="muted xs mt8">الحالي: ${esc(b.fields[k]?.value || '')}</div></span>${chip(SRC[f.source][0], SRC[f.source][1])}</span></label>`).join('')}
      <div class="flex mt12" style="justify-content:flex-end"><button class="btn grey" id="aapply">${ic('check')}استبدل المحدد</button></div>` : ''}
    ${a.competitors?.competitors?.length ? `<span class="lbl">المنافسون (${a.competitors.competitors.length})</span><div class="flex wrap">${a.competitors.competitors.slice(0, 12).map((c) => chip(c.name, c.status === 'researched' ? 'em' : '', false)).join('')}<button class="btn grey sm" data-go="research">${ic('research')}افتح بحث المنافسين</button></div>` : ''}
    <div class="flex mt16" style="justify-content:flex-end"><button class="btn ghost" id="adisc">إغلاق</button><button class="btn primary" data-tab="products">${ic('studio')}راجع المنتجات (${a.products.total})</button></div></div>`;
  return `<div class="grid c12"><div class="card s8"><div class="card-h"><h3>التحليل الذكي</h3><div class="end" style="min-width:240px">${pickerHTML('text')}</div></div>
    <p class="muted sm">يقرأ موقعك كاملاً (الرئيسية، من نحن، الخدمات، المتجر…) وكل منتجاتك بأسعارها وصورها إن كان متجراً، ويبحث عن براندك في الإنترنت، ثم يملأ <b>كل الحقول الفارغة</b> تلقائياً. الحقول التي كتبتها أنت لا تُستبدل.</p>
    <label class="lbl">رابط الموقع</label><input class="field ltr" id="aurl" value="${esc(b.website)}" placeholder="example.com" style="text-align:left">
    <label class="lbl">ملاحظات عن البراند (اختياري)</label><textarea class="field" id="atext" data-mic rows="4" placeholder="مثلاً: نبيع مستحضرات طبيعية بزيت الأرغان للنساء في المغرب، أسلوبنا دافئ وبالدارجة…"></textarea>
    <label class="flex sm mt12" style="cursor:pointer"><input type="checkbox" class="check" id="acomp" checked>ابحث أيضاً عن المنافسين في الإنترنت (يضافون لصفحة بحث المنافسين)</label>
    <input class="field mt8" id="aseeds" placeholder="منافسون تعرفهم (اختياري): Optic 2000، Atlas Optique…">
    <div class="flex mt16" style="justify-content:flex-end"><button class="btn primary" id="arun" data-busy="يقرأ الموقع ويحلّل… حتى دقيقتين">${ic('sparkle')}تحليل وملء عقل البراند</button></div>
    ${res}</div><div class="stack s4">${readinessCard()}</div></div>`;
}

function bindBrain(v) {
  const b = S.brand;
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
  bindPicker(v, () => PAGES.brain());
  $$('[data-tab]', v).forEach((x) => (x.onclick = () => { S.brainTab = x.dataset.tab; PAGES.brain(); }));
  // inline edit
  $$('[data-edit]', v).forEach((el) => {
    const start = () => {
      if (el.querySelector('textarea')) return;
      const k = el.dataset.edit;
      const cur = k === 'name' ? b.name : k === 'website' ? b.website : b.fields[k]?.value || '';
      const multi = !['name', 'website'].includes(k);
      el.innerHTML = `<${multi ? 'textarea rows="3"' : 'input'} class="field" style="margin:4px 0">${multi ? esc(cur) + '</textarea>' : ''}<div class="flex mt8"><button class="btn primary sm" data-s>حفظ</button><button class="btn ghost sm" data-c>إلغاء</button></div>`;
      el.classList.remove('empty');
      const f = $('.field', el);
      if (!multi) f.value = cur;
      f.focus();
      const save = () => busy($('[data-s]', el), async () => {
        const val = f.value.trim();
        try {
          if (k === 'name' || k === 'website') await patchBrand({ [k]: val });
          else await patchBrand({ fields: { [k]: val ? { value: val, source: 'confirmed' } : null } });
          toast('تم الحفظ');
        } catch (e) { toast(e.message, true); }
      });
      $('[data-s]', el).onclick = (e) => { e.stopPropagation(); save(); };
      $('[data-c]', el).onclick = (e) => { e.stopPropagation(); PAGES.brain(); };
      f.onkeydown = (e) => { if (e.key === 'Enter' && (!multi || e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } };
    };
    el.onclick = start;
    el.onkeydown = (e) => { if (e.key === 'Enter') start(); };
  });
  $$('[data-confirm]', v).forEach((c) => (c.onclick = async () => {
    const k = c.dataset.confirm;
    if (b.fields[k]?.source === 'confirmed') return;
    try { await patchBrand({ fields: { [k]: { value: b.fields[k].value, source: 'confirmed' } } }); toast('تم التأكيد'); } catch (e) { toast(e.message, true); }
  }));
  // products
  let newPhoto = null;
  $('#pph', v) && ($('#pph', v).onchange = async (e) => { try { newPhoto = await readImage(e.target.files[0]); $('#pphl', v).innerHTML = `<img src="${newPhoto}" alt="" style="max-height:90px;border-radius:10px">`; } catch (err) { toast(err.message, true); } });
  $$('[data-ep]', v).forEach((x) => (x.onclick = () => productModal(b.products.find((p) => p.id === x.dataset.ep))));
  $('#padd', v) && ($('#padd').onclick = (e) => busy(e.currentTarget, async () => {
    const name = $('#pn').value.trim();
    if (!newPhoto) return toast('صورة المنتج إلزامية: ارفعها أولاً', true);
    if (!name) return toast('اكتب اسم المنتج', true);
    try {
      const id = Math.random().toString(16).slice(2, 10);
      await patchBrand({ products: [...b.products, { id, name, price: $('#pp').value, description: $('#pd').value, source: 'confirmed' }] });
      S.brand = await api(`/api/brands/${b.id}/products/${id}/photo`, { method: 'POST', body: { dataUrl: newPhoto } });
      renderShell(); go('brain', { replace: true }); toast('تمت الإضافة');
    } catch (err) { toast(err.message, true); }
  }));
  $$('[data-delp]', v).forEach((x) => (x.onclick = () => busy(x, async () => {
    try { await patchBrand({ products: b.products.filter((p) => p.id !== x.dataset.delp) }); } catch (err) { toast(err.message, true); }
  })));
  // visual
  const input = $('#logoIn', v);
  if (input) {
    const upload = (file) => {
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) return toast('حجم الشعار أكبر من 3MB', true);
      const r = new FileReader();
      r.onload = async () => {
        try { toast('جارٍ رفع الشعار…'); S.brand = await api(`/api/brands/${b.id}/logo`, { method: 'POST', body: { dataUrl: r.result } }); renderShell(); go('brain', { replace: true }); toast('تم رفع الشعار'); } catch (e) { toast(e.message, true); }
      };
      r.readAsDataURL(file);
    };
    input.onchange = () => upload(input.files[0]);
    const d = $('#drop', v);
    d.ondragover = (e) => { e.preventDefault(); d.classList.add('over'); };
    d.ondragleave = () => d.classList.remove('over');
    d.ondrop = (e) => { e.preventDefault(); d.classList.remove('over'); upload(e.dataTransfer.files[0]); };
  }
  $('#addc', v) && ($('#addc').onchange = async (e) => {
    const c = e.target.value.toUpperCase();
    const colors = [...new Set([...(b.visual?.colors || []), c])];
    try { await patchBrand({ visual: { colors } }); } catch (err) { toast(err.message, true); }
  });
  $$('[data-delc]', v).forEach((x) => (x.onclick = async (e) => {
    e.preventDefault();
    const colors = (b.visual?.colors || []).filter((_, i) => i !== Number(x.dataset.delc));
    try { await patchBrand({ visual: { colors } }); } catch (err) { toast(err.message, true); }
  }));
  // identity proposals (palette / logo)
  $('#idpal', v) && ($('#idpal').onclick = (e) => busy(e.currentTarget, () => paletteModal()));
  $('#idlogo', v) && ($('#idlogo').onclick = () => logoModal());
  $('#idfont', v) && ($('#idfont').onclick = (e) => busy(e.currentTarget, () => fontModal()));
  $('#idfont2', v) && ($('#idfont2').onclick = (e) => busy(e.currentTarget, () => fontModal()));
  // visual identity guide
  const sendGuide = (body) => api(`/api/brands/${b.id}/guide`, { method: 'POST', body }).then((nb) => { S.brand = nb; toast('تم تحليل الدليل وتطبيقه'); PAGES.brain(); }).catch((e) => toast(e.message, true));
  const gfile = $('#gfile', v);
  if (gfile) {
    const up = (file) => {
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) return toast('الملف أكبر من 4MB', true);
      const r = new FileReader();
      r.onload = () => { toast('يقرأ الدليل… قد يستغرق دقيقة'); sendGuide({ dataUrl: r.result, filename: file.name }); };
      r.readAsDataURL(file);
    };
    gfile.onchange = () => up(gfile.files[0]);
    const d = $('#gdrop', v);
    if (d) { d.ondragover = (e) => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over'); d.ondrop = (e) => { e.preventDefault(); d.classList.remove('over'); up(e.dataTransfer.files[0]); }; }
  }
  $('#gpaste', v) && ($('#gpaste').onclick = (e) => busy(e.currentTarget, () => sendGuide({ text: $('#gtext').value, filename: 'نص ملصوق' })));
  $('#gdel', v) && ($('#gdel').onclick = async () => { if (!(await confirmBox('حذف الدليل؟', 'لن تُطبّق قواعده على التوليدات القادمة.', 'حذف', true))) return; try { S.brand = await api(`/api/brands/${b.id}/guide`, { method: 'DELETE' }); PAGES.brain(); } catch (e) { toast(e.message, true); } });
  // analyze
  $('#arun', v) && ($('#arun').onclick = (e) => busy(e.currentTarget, async () => {
    try {
      S.analysis = await api(`/api/brands/${b.id}/analyze`, { method: 'POST', body: { url: $('#aurl').value.trim(), text: $('#atext').value, ai: aiOf('text'), competitors: $('#acomp').checked, seeds: $('#aseeds').value } });
      S.brand = S.analysis.brand; renderShell();
      const cp = S.analysis.competitors;
      if (cp?.error) toast(`البحث عن المنافسين: ${cp.error}`, true);
      toast(`مُلئ ${S.analysis.filled.length} حقل · ${S.analysis.products.added} منتج جديد`);
      go('brain', { replace: true });
    } catch (err) { toast(err.message, true); }
  }));
  $('#adisc', v) && ($('#adisc').onclick = () => { S.analysis = null; PAGES.brain(); });
  $('#aapply', v) && ($('#aapply').onclick = (e) => busy(e.currentTarget, async () => {
    const a = S.analysis;
    const fields = {};
    $$('[data-af]:checked', v).forEach((c) => (fields[c.dataset.af] = a.suggestions[c.dataset.af]));
    if (!Object.keys(fields).length) return toast('لم تحدد أي شيء', true);
    try { Object.keys(fields).forEach((k) => delete a.suggestions[k]); await patchBrand({ fields }); toast('تم الاستبدال'); } catch (err) { toast(err.message, true); }
  }));
}

// ---------- keys ----------
PAGES.keys = async () => {
  if (needBrand()) return header();
  header(`<button class="btn grey" id="ktest" data-busy="يختبر…">${ic('refresh')}اختبار الكل</button><button class="btn primary" id="kadd">${ic('plus')}إضافة مفاتيح</button>`);
  $('#kadd').onclick = addKeysModal;
  $('#ktest').onclick = (e) => busy(e.currentTarget, async () => {
    try { await api(`/api/brands/${S.brand.id}/keys/test`, { method: 'POST', body: {} }); await loadKeys(); toast('تم اختبار كل المفاتيح'); } catch (err) { toast(err.message, true); }
  });
  await loadKeys();
};
async function loadKeys() {
  S.keys = await api(`/api/brands/${S.brand.id}/keys`);
  S.ov = null;
  drawKeys();
}
function drawKeys() {
  const { keys, summary: s } = S.keys;
  const q = S.keyQuery.trim().toLowerCase();
  const list = keys.filter((k) => (S.keyFilter === 'all' || k.status === S.keyFilter) && (!q || (k.label + ' ' + k.last4).toLowerCase().includes(q)));
  const shown = list.slice(0, S.keyLimit);
  for (const id of [...S.keySel]) if (!keys.some((k) => k.id === id)) S.keySel.delete(id);
  const pct = s.limit ? Math.round((s.remaining / s.limit) * 100) : 0;
  if (!keys.length) {
    view(`<div class="empty"><span class="ic">${ic('keys')}</span><h3>لا توجد مفاتيح لـ ${esc(S.brand.name)}</h3>
      <p>الصق مفاتيح ElevenLabs (واحد في كل سطر، 100 أو أكثر). النظام يختبر كل مفتاح ويعرف رصيده، ثم يوزّع التوليد عليها تلقائياً.</p>
      <button class="btn primary" id="k0">${ic('plus')}إضافة مفاتيح</button></div>`);
    $('#k0').onclick = addKeysModal;
    return;
  }
  const v = view(`
  <div class="grid c4 mb16">
    ${[['keys', 'كل المفاتيح', fmt(s.total), `${fmt(s.active || 0)} نشط`], ['check', 'نشطة', fmt(s.active || 0), 'جاهزة للتوليد'],
       ['x', 'منتهية / غير صالحة', fmt((s.exhausted || 0) + (s.invalid || 0)), `${fmt(s.error || 0)} خطأ مؤقت · ${fmt(s.disabled || 0)} معطّل`], ['voice', 'الأحرف المتبقية', short(s.remaining), `${pct}% من ${short(s.limit)}`]]
      .map(([i, l, n, d], ix) => `<div class="card stat ${ix === 0 ? 'feature' : ''}"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div><span class="muted xs">${d}</span></div>`).join('')}
  </div>
  <div class="toolbar">${pills('kf', [['all', `الكل ${s.total}`], ['active', 'نشط'], ['exhausted', 'انتهى الرصيد'], ['invalid', 'غير صالح'], ['error', 'خطأ'], ['disabled', 'معطّل']], S.keyFilter)}
    <div class="end">
      <div class="search ${S.keyQuery ? 'open' : ''}" id="ks"><button aria-label="بحث">${ic('search')}</button><input placeholder="ابحث بالاسم أو آخر 4 أحرف" value="${esc(S.keyQuery)}"></div>
      ${S.keySel.size ? `<span class="chip" style="height:36px;border-radius:12px;padding:0 12px">${S.keySel.size} محدد</span><button class="btn grey" id="kts">${ic('refresh')}اختبار</button><button class="btn ghost danger" id="kdel">${ic('trash')}حذف</button>` : ''}
    </div></div>
  <div class="card" style="padding-top:8px"><div class="tablewrap"><table>
    <thead><tr><th style="width:28px"><input type="checkbox" class="check" id="kall" ${shown.length && shown.every((k) => S.keySel.has(k.id)) ? 'checked' : ''}></th><th>الاسم</th><th>المفتاح</th><th>الحالة</th><th style="min-width:160px">الرصيد</th><th>الخطة</th><th>الاستخدام</th><th>آخر استخدام</th><th></th></tr></thead>
    <tbody>${shown.map((k) => { const st = KSTAT[k.status] || [k.status, '']; const used = k.charLimit ? Math.round(((k.charLimit - (k.remaining ?? 0)) / k.charLimit) * 100) : null; return `<tr class="${S.keySel.has(k.id) ? 'sel-row' : ''}">
      <td><input type="checkbox" class="check" data-ks="${k.id}" ${S.keySel.has(k.id) ? 'checked' : ''}></td>
      <td><b class="sm" data-kl="${k.id}" style="cursor:text">${esc(k.label)}</b></td>
      <td><span class="mono muted ltr">••••${esc(k.last4)}</span></td>
      <td><span title="${esc(k.lastError || '')}">${chip(st[0], st[1])}</span></td>
      <td>${k.charLimit != null ? `<div class="flex"><span class="grow"><span class="bar" style="display:block"><i style="width:${100 - used}%;background:${used > 90 ? '#F59E0B' : 'var(--text)'}"></i></span></span><span class="xs tnum muted">${short(k.remaining)}/${short(k.charLimit)}</span></div>` : `<span class="muted xs">${k.tier === 'restricted' ? 'مقيّد (لا يمكن قراءة الرصيد)' : '—'}</span>`}</td>
      <td class="xs sec">${esc(k.tier || '—')}</td>
      <td class="tnum sm">${fmt(k.uses || 0)}</td>
      <td class="xs muted">${rel(k.lastUsed)}</td>
      <td><button class="btn grey icon sm" data-km="${k.id}" data-menu aria-label="خيارات">${ic('dots')}</button></td></tr>`; }).join('')}
    </tbody></table></div>
    ${list.length > shown.length ? `<div class="flex mt12" style="justify-content:center"><button class="btn grey sm" id="kmore">عرض المزيد (${list.length - shown.length})</button></div>` : ''}
    ${!list.length ? '<p class="muted sm" style="padding:16px 0;text-align:center">لا توجد مفاتيح بهذا الفلتر</p>' : ''}
  </div>`);
  const id = S.brand.id;
  // search
  const sb = $('#ks', v); const si = $('input', sb);
  $('button', sb).onclick = () => { sb.classList.toggle('open'); if (sb.classList.contains('open')) si.focus(); };
  let tmr; si.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { S.keyQuery = si.value; S.keyLimit = 50; drawKeys(); const n = $('#ks input'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200); };
  si.onkeydown = (e) => { if (e.key === 'Escape') { si.value = ''; S.keyQuery = ''; drawKeys(); } };
  si.onblur = () => { if (!si.value) sb.classList.remove('open'); };
  $('#kmore', v) && ($('#kmore').onclick = () => { S.keyLimit += 100; drawKeys(); });
  $('#kall', v).onchange = (e) => { shown.forEach((k) => (e.target.checked ? S.keySel.add(k.id) : S.keySel.delete(k.id))); drawKeys(); };
  $$('[data-ks]', v).forEach((c) => (c.onchange = () => { c.checked ? S.keySel.add(c.dataset.ks) : S.keySel.delete(c.dataset.ks); drawKeys(); }));
  $('#kts', v) && ($('#kts').onclick = (e) => busy(e.currentTarget, async () => { try { await api(`/api/brands/${id}/keys/test`, { method: 'POST', body: { ids: [...S.keySel] } }); await loadKeys(); toast('تم الاختبار'); } catch (err) { toast(err.message, true); } }));
  $('#kdel', v) && ($('#kdel').onclick = async () => {
    if (!(await confirmBox('حذف المفاتيح؟', `سيتم حذف ${S.keySel.size} مفتاح من هذا البراند.`, 'حذف', true))) return;
    try { const r = await api(`/api/brands/${id}/keys/delete`, { method: 'POST', body: { ids: [...S.keySel] } }); S.keySel.clear(); await loadKeys(); toast(`تم حذف ${r.removed}`); } catch (err) { toast(err.message, true); }
  });
  $$('[data-kl]', v).forEach((el) => (el.onclick = () => {
    const k = keys.find((x) => x.id === el.dataset.kl);
    modal(`<h2>اسم المفتاح</h2><input class="field mt16" id="kln" value="${esc(k.label)}" maxlength="60"><div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="kls">حفظ</button></div>`, (m) => {
      $('[data-x]', m).onclick = closeModal;
      $('#kls').onclick = () => busy($('#kls'), async () => { try { await api(`/api/brands/${id}/keys/${k.id}`, { method: 'PATCH', body: { label: $('#kln').value } }); closeModal(); await loadKeys(); } catch (err) { toast(err.message, true); } });
    });
  }));
  $$('[data-km]', v).forEach((btn) => (btn.onclick = () => {
    const k = keys.find((x) => x.id === btn.dataset.km);
    openMenu(btn, [
      { label: 'اختبار المفتاح', icon: 'refresh', onClick: async () => { try { await api(`/api/brands/${id}/keys/test`, { method: 'POST', body: { ids: [k.id] } }); await loadKeys(); toast('تم الاختبار'); } catch (err) { toast(err.message, true); } } },
      { label: k.enabled === false ? 'تفعيل' : 'تعطيل', icon: k.enabled === false ? 'check' : 'x', onClick: async () => { try { await api(`/api/brands/${id}/keys/${k.id}`, { method: 'PATCH', body: { enabled: k.enabled === false } }); await loadKeys(); } catch (err) { toast(err.message, true); } } },
      ...(k.lastError ? [{ label: 'آخر خطأ', desc: k.lastError, icon: 'dot' }] : []),
      { divider: true },
      { label: 'حذف', icon: 'trash', danger: true, onClick: async () => { if (!(await confirmBox('حذف المفتاح؟', `${k.label} (••••${k.last4})`, 'حذف', true))) return; try { await api(`/api/brands/${id}/keys/delete`, { method: 'POST', body: { ids: [k.id] } }); await loadKeys(); } catch (err) { toast(err.message, true); } } },
    ], { width: 240 });
  }));
}
function addKeysModal() {
  modal(`<h2>إضافة مفاتيح ElevenLabs</h2>
    <p class="muted sm mt8">للبراند: <b style="color:var(--text)">${esc(S.brand.name)}</b>. الصق مفتاحاً في كل سطر، حتى 500 مفتاح في المرة. المفاتيح تُشفَّر ولا تظهر كاملة مرة أخرى.</p>
    <label class="lbl">المفاتيح</label>
    <textarea class="field mono ltr" id="kt" rows="9" style="text-align:left;font-size:12px" placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx\nAccount 2, sk_yyyyyyyyyyyyyyyyyyyy\nAccount 3 | sk_zzzzzzzzzzzzzzzzzz"></textarea>
    <p class="hint" id="kcount">الصيغ المقبولة: المفتاح وحده، أو "الاسم, المفتاح"، أو "الاسم | المفتاح". المكرر يُتجاهل تلقائياً.</p>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="ksave" data-busy="يضيف ويختبر…">إضافة واختبار</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    const t = $('#kt');
    t.oninput = () => { const n = t.value.split(/\n/).filter((l) => /[A-Za-z0-9_\-]{20,}/.test(l)).length; $('#kcount').textContent = n ? `${n} مفتاح في النص` : 'الصيغ المقبولة: المفتاح وحده، أو "الاسم, المفتاح"، أو "الاسم | المفتاح".'; };
    $('#ksave').onclick = () => busy($('#ksave'), async () => {
      try {
        const r = await api(`/api/brands/${S.brand.id}/keys`, { method: 'POST', body: { text: t.value } });
        closeModal();
        toast(`أُضيف ${r.added} · نشط ${r.active || 0} · غير صالح ${r.invalid || 0} · منتهي ${r.exhausted || 0}${r.duplicates ? ` · مكرر ${r.duplicates}` : ''}`);
        if (S.page === 'keys') await loadKeys(); else go('keys');
      } catch (err) { toast(err.message, true); }
    });
  });
}

// ---------- voices ----------
let previewAudio = null;
PAGES.voice = async () => {
  if (needBrand()) return header();
  header(`<button class="btn ghost" id="vk">${ic('keys')}المفاتيح</button>`);
  $('#vk').onclick = () => go('keys');
  const id = S.brand.id;
  const [k, models] = await Promise.all([api(`/api/brands/${id}/keys`), S.models ? { models: S.models } : api('/api/eleven/models')]);
  S.models = models.models;
  if (!k.summary.active && !k.summary.error) {
    view(`<div class="empty"><span class="ic">${ic('keys')}</span><h3>أضف مفاتيح ElevenLabs أولاً</h3><p>هذا البراند ليس فيه مفتاح نشط. أضف مفاتيحك وسيوزّع النظام التوليد عليها حسب الرصيد.</p><button class="btn primary" id="vk0">${ic('plus')}إضافة مفاتيح</button></div>`);
    $('#vk0').onclick = () => { go('keys'); setTimeout(addKeysModal, 300); };
    return;
  }
  drawVoice({ loading: !S.voices, pool: k.summary });
  try {
    if (!S.voices) { const vr = await api(`/api/brands/${id}/voices`); S.voices = vr.voices; if (vr.note) toast(`تعذّر جلب أصوات حسابك (${vr.note}). تظهر الأصوات الجاهزة من ElevenLabs.`, true); }
    if (!S.audio) S.audio = (await api(`/api/brands/${id}/audio`)).items;
  } catch (e) { toast(e.message, true); S.voices = S.voices || []; S.audio = S.audio || []; }
  if (S.page === 'voice' && S.brand?.id === id) drawVoice({ pool: k.summary });
};
// ElevenLabs voice labels come in English: show them in Arabic.
const VTR = {
  male: 'رجل', female: 'امرأة', neutral: 'محايد', young: 'شاب', middle_aged: 'متوسط العمر', 'middle aged': 'متوسط العمر', old: 'كبير السن',
  professional: 'احترافي', premade: 'جاهز', cloned: 'مستنسخ', generated: 'مُولَّد', high_quality: 'جودة عالية',
  advertisement: 'إعلانات', informative_educational: 'تعليمي وشرح', social_media: 'سوشال ميديا وريلز', narrative_story: 'سرد قصص', conversational: 'محادثة طبيعية', characters_animation: 'شخصيات ورسوم', news: 'أخبار', entertainment_tv: 'ترفيه وتلفزيون', meditation: 'هدوء وتأمل', narration: 'تعليق صوتي', audiobook: 'كتب صوتية', documentary: 'وثائقي', commercial: 'تجاري', asmr: 'ASMR',
  ar: 'عربي', en: 'إنجليزي', fr: 'فرنسي', es: 'إسباني', arabic: 'عربي', english: 'إنجليزي', french: 'فرنسي',
  saudi: 'سعودي', gulf: 'خليجي', emirati: 'إماراتي', kuwaiti: 'كويتي', egyptian: 'مصري', moroccan: 'مغربي', levantine: 'شامي', 'modern standard': 'فصحى', msa: 'فصحى', american: 'أمريكي', british: 'بريطاني', australian: 'أسترالي', standard: 'قياسي',
  rich: 'غني', sophisticated: 'راقٍ', warm: 'دافئ', deep: 'عميق', calm: 'هادئ', upbeat: 'حيوي', energetic: 'حماسي', confident: 'واثق', friendly: 'ودود', soft: 'ناعم', clear: 'واضح', modern: 'عصري', smooth: 'سلس', authoritative: 'رسمي واثق', casual: 'عفوي', expressive: 'معبّر', gentle: 'لطيف', bright: 'مشرق', serious: 'جاد', playful: 'مرح', mature: 'ناضج', trustworthy: 'موثوق', engaging: 'جذاب', natural: 'طبيعي', crisp: 'نقي', strong: 'قوي', reels: 'ريلز', voice: 'صوت', commercial_: 'تجاري', documentary_: 'وثائقي',
};
const vtr = (w) => { const k = String(w || '').trim().toLowerCase(); return VTR[k] || VTR[k.replace(/\s+/g, '_')] || w; };
const vtrPhrase = (p) => String(p || '').split(/(\s*[&,/]\s*|\s+)/).map((x) => (/^\s*[&,/]?\s*$/.test(x) ? x.replace('&', 'و') : vtr(x))).join('');
function voiceName(x) { const [n, d] = String(x.name).split(/\s+-\s+/); return { name: n, desc: d ? vtrPhrase(d) : '' }; }
function voiceTags(x) {
  const L = x.labels || {};
  const tags = [L.gender, L.age, L.accent, L.use_case || L['use case'], L.language, x.category].filter(Boolean).map(vtr);
  if (L.description && !/\s/.test(L.description.trim())) tags.push(vtr(L.description));
  else if (L.description) tags.push(vtrPhrase(L.description));
  return [...new Set(tags)].slice(0, 5);
}
function drawVoice({ loading = false, pool } = {}) {
  const t = S.tts;
  const q = S.voiceQuery.trim().toLowerCase();
  const isAr = (x) => /^(ar|arabic)$/i.test(x.labels?.language || '') || /arab|saudi|gulf|egypt|morocc|emirat|عرب/i.test(Object.values(x.labels || {}).join(' ') + x.name);
  const voices = (S.voices || []).filter((x) => !q || (x.name + ' ' + Object.values(x.labels || {}).join(' ') + ' ' + voiceTags(x).join(' ')).toLowerCase().includes(q))
    .sort((a, b2) => (S.vrec?.[a.id]?.rank || 9) - (S.vrec?.[b2.id]?.rank || 9) || Number(isAr(b2)) - Number(isAr(a)));
  if (S.voices && !S.voices.some((x) => x.id === S.voiceId)) S.voiceId = S.voices[0]?.id || '';
  const model = S.models.find((m) => m.id === t.modelId) || S.models[0];
  const slider = (key, label, min, max, step, val, fmtv) => `<div><div class="flex"><span class="sm sec grow">${label}</span><b class="xs tnum" id="sv-${key}">${fmtv(val)}</b></div><input type="range" data-sl="${key}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const v = view(`<div class="grid c12">
    <div class="card s7"><div class="card-h"><h3>تعليق صوتي</h3><div class="end"><button class="btn primary sm" id="vscript">${ic('sparkle')}اكتب لي السكريبت</button>${chip('ElevenLabs', '', false)}${pool ? chip(`${pool.active} مفتاح · ${short(pool.remaining)} حرف`, 'em') : ''}</div></div>
      <textarea class="field" id="vt" data-mic data-enhance="voice" rows="5" maxlength="5000" placeholder="اكتب النص الذي تريد تحويله إلى صوت…">${esc(t.text)}</textarea>
      <div class="flex mt8"><span class="hint grow" style="margin:0">يمكنك الكتابة بالدارجة أو الفصحى أو الفرنسية.</span><span class="xs tnum muted" id="vc">${t.text.length}/5000</span></div>
      <div class="grid c2 mt16" style="gap:12px">
        <div><span class="lbl" style="margin-top:0">النموذج</span><div class="sel"><button class="sel-btn" id="vm" data-menu><span class="lab">${esc(model.name)} <span class="muted xs">· ${esc(model.note)}</span></span>${ic('chev')}</button></div></div>
        <div><span class="lbl" style="margin-top:0">الإعدادات</span><div class="stack" style="gap:6px">
          ${slider('stability', 'الثبات', 0, 1, 0.05, t.stability, (x) => Math.round(x * 100) + '%')}
          ${slider('similarity', 'التطابق مع الصوت', 0, 1, 0.05, t.similarity, (x) => Math.round(x * 100) + '%')}
          ${slider('style', 'المبالغة في الأسلوب', 0, 1, 0.05, t.style, (x) => Math.round(x * 100) + '%')}
          ${slider('speed', 'السرعة', 0.7, 1.2, 0.05, t.speed, (x) => Number(x).toFixed(2) + '×')}
        </div></div>
      </div>
      <div class="flex mt16"><span class="lbl grow" style="margin:0">الصوت</span><button class="btn ghost sm" id="vrec" data-busy="يختار…">${ic('sparkle')}اقترح لي الأنسب</button><div class="search ${S.voiceQuery ? 'open' : ''}" id="vs"><button aria-label="بحث">${ic('search')}</button><input placeholder="ابحث في الأصوات" value="${esc(S.voiceQuery)}"></div></div>
      <div class="voice-list mt8" id="vl">${loading ? '<div class="skel" style="height:46px"></div><div class="skel" style="height:46px"></div><div class="skel" style="height:46px"></div>' :
        voices.length ? voices.map((x) => `<div class="voice ${x.id === S.voiceId ? 'on' : ''}" data-v="${x.id}" tabindex="0">
          ${x.preview ? `<button class="play" data-pv="${x.id}" aria-label="استماع">${ic('play')}</button>` : '<span class="play" style="opacity:.3">' + ic('play') + '</span>'}
          <div class="grow"><b class="sm">${esc(voiceName(x).name)}</b>${voiceName(x).desc ? ` <span class="xs sec">· ${esc(voiceName(x).desc)}</span>` : ''}${S.vrec?.[x.id] ? ` ${chip(`مقترح #${S.vrec[x.id].rank}`, 'em', false)}` : ''}<div class="muted xs">${esc(voiceTags(x).join(' · '))}</div>${S.vrec?.[x.id] ? `<div class="xs mt8" style="color:var(--accent)">${esc(S.vrec[x.id].why)}${S.vrec[x.id].settings ? ` · ${esc(S.vrec[x.id].settings)}` : ''}</div>` : ''}</div>
          ${x.id === S.voiceId ? ic('check') : ''}</div>`).join('') : '<p class="muted sm" style="padding:12px">لا توجد أصوات مطابقة</p>'}</div>
      <div class="flex mt16" style="justify-content:flex-end"><span class="muted xs grow" id="vcost">${t.text.length ? `سيستهلك حوالي ${fmt(t.text.length)} حرف من رصيد المفاتيح` : ''}</span><button class="btn primary" id="vgo" data-busy="يولّد…" ${loading ? 'disabled' : ''}>${ic('voice')}توليد الصوت</button></div>
    </div>
    <div class="card s5"><div class="card-h"><h3>آخر التسجيلات</h3><div class="end"><span class="muted xs">${S.audio ? S.audio.length : ''}</span></div></div>
      <div id="vh">${!S.audio ? '<div class="skel" style="height:80px"></div>' : S.audio.length ? `<div class="rows">${S.audio.map((a, i) => `<div style="padding:12px 0">
        <div class="flex"><b class="sm grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.voiceName || 'صوت')} <span class="muted xs" style="font-weight:400">· ${rel(a.createdAt)}</span></b>${i === 0 && a.fresh ? chip('جديد', 'em') : ''}<a class="btn grey icon sm" href="${esc(a.url)}" download="voice-${i + 1}.mp3" target="_blank" rel="noopener" aria-label="تحميل">${ic('download')}</a></div>
        <p class="sec xs mt8" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.text)}</p>
        <audio class="mt8" controls preload="none" src="${esc(a.url)}"></audio>
        <div class="muted xs">${fmt(a.chars)} حرف · ${esc(a.model || '')}</div></div>`).join('')}</div>`
        : `<div class="empty" style="padding:28px"><span class="ic">${ic('voice')}</span><h3>لا توجد تسجيلات</h3><p>اكتب نصاً واختر صوتاً ثم اضغط توليد.</p></div>`}</div>
    </div></div>`);
  $('#vscript', v).onclick = () => scriptModal((r) => { t.text = r.script; drawVoice({ pool }); if (r.voiceHint) toast(`الصوت المناسب: ${r.voiceHint}`); });
  const ta = $('#vt', v);
  ta.oninput = () => { t.text = ta.value; $('#vc').textContent = `${ta.value.length}/5000`; $('#vcost').textContent = ta.value.length ? `سيستهلك حوالي ${fmt(ta.value.length)} حرف من رصيد المفاتيح` : ''; };
  $$('[data-sl]', v).forEach((r) => (r.oninput = () => { const k = r.dataset.sl; t[k] = Number(r.value); $(`#sv-${k}`).textContent = k === 'speed' ? Number(r.value).toFixed(2) + '×' : Math.round(r.value * 100) + '%'; }));
  $('#vrec', v).onclick = (e) => busy(e.currentTarget, async () => {
    try {
      const r = await api(`/api/brands/${S.brand.id}/voices/recommend`, { method: 'POST', body: { text: t.text } });
      S.vrec = Object.fromEntries(r.picks.map((p, i) => [p.id, { ...p, rank: i + 1 }]));
      if (r.picks[0]) { S.voiceId = r.picks[0].id; store.set('mos-voice', S.voiceId); }
      drawVoice({ pool }); toast(r.picks.length ? 'اخترت لك أنسب 3 أصوات، الأول محدد الآن' : 'لم أجد صوتاً مناسباً', !r.picks.length);
    } catch (err) { toast(err.message, true); }
  });
  $('#vm', v).onclick = (e) => openMenu(e.currentTarget, S.models.map((m) => ({ label: m.name, desc: m.note, selected: m.id === t.modelId, onClick: () => { t.modelId = m.id; drawVoice({ pool }); } })));
  const sb = $('#vs', v); const si = $('input', sb);
  $('button', sb).onclick = () => { sb.classList.toggle('open'); if (sb.classList.contains('open')) si.focus(); };
  si.oninput = () => { S.voiceQuery = si.value; const pos = si.value.length; drawVoice({ pool }); const n = $('#vs input'); n.focus(); n.setSelectionRange(pos, pos); };
  si.onblur = () => { if (!si.value) sb.classList.remove('open'); };
  $$('[data-v]', v).forEach((el) => {
    const pick = () => { S.voiceId = el.dataset.v; store.set('mos-voice', S.voiceId); $$('.voice', v).forEach((x) => x.classList.toggle('on', x === el)); };
    el.onclick = (e) => { if (!e.target.closest('[data-pv]')) pick(); };
    el.onkeydown = (e) => { if (e.key === 'Enter') pick(); };
  });
  $$('[data-pv]', v).forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const vo = S.voices.find((x) => x.id === b.dataset.pv);
    if (previewAudio && previewAudio.dataset.id === vo.id && !previewAudio.paused) { previewAudio.pause(); b.innerHTML = ic('play'); return; }
    if (previewAudio) previewAudio.pause();
    $$('[data-pv]', v).forEach((x) => (x.innerHTML = ic('play')));
    previewAudio = new Audio(vo.preview);
    previewAudio.dataset.id = vo.id;
    previewAudio.play().catch(() => toast('تعذر تشغيل المعاينة', true));
    b.innerHTML = ic('pause');
    previewAudio.onended = () => (b.innerHTML = ic('play'));
  }));
  $('#vgo', v).onclick = (e) => busy(e.currentTarget, async () => {
    if (!t.text.trim()) return toast('اكتب النص أولاً', true);
    if (!S.voiceId) return toast('اختر صوتاً', true);
    const vo = S.voices.find((x) => x.id === S.voiceId);
    try {
      const r = await api(`/api/brands/${S.brand.id}/tts`, { method: 'POST', body: { text: t.text, voiceId: S.voiceId, voiceName: vo?.name, modelId: t.modelId, stability: t.stability, similarity: t.similarity, style: t.style, speed: t.speed } });
      S.audio = [{ url: r.url, text: t.text, voiceName: vo?.name, chars: r.chars, model: r.model, createdAt: new Date().toISOString(), fresh: true }, ...(S.audio || [])];
      if (pool) pool.remaining = Math.max(0, pool.remaining - r.chars);
      S.ov = null;
      drawVoice({ pool });
      const a = $('#vh audio');
      a && a.play().catch(() => {});
      toast(`تم التوليد · ${fmt(r.chars)} حرف · المفتاح: ${r.key.label}${r.tries > 1 ? ` (بعد ${r.tries} محاولات)` : ''}`);
    } catch (err) { toast(err.message, true); }
  });
}

// ---------- API dashboard ----------
PAGES.api = async () => {
  header(`<button class="btn grey" id="sref">${ic('refresh')}تحديث</button><button class="btn primary" id="sprov">${ic('plug')}المزوّدون</button>`);
  $('#sref').onclick = (e) => busy(e.currentTarget, () => PAGES.api());
  $('#sprov').onclick = () => go('providers');
  const s = (S.sys = await api('/api/system'));
  const total = Object.values(s.usage).reduce((a, u) => ({ calls: a.calls + u.calls, errors: a.errors + u.errors, tok: a.tok + u.inTok + u.outTok }), { calls: 0, errors: 0, tok: 0 });
  const NAMES = Object.fromEntries(s.providers.map((p) => [p.id, p.name]));
  NAMES.elevenlabs = 'ElevenLabs'; NAMES.other = 'أخرى';
  const KINDS = { tts: 'تعليق صوتي', analyze: 'تحليل براند', test: 'اختبار', 'keys-add': 'إضافة مفاتيح', content: 'توليد محتوى', rewrite: 'إعادة كتابة', plan: 'خطة شهرية', image: 'صورة', connect: 'ربط مزوّد', text: 'نص' };
  const v = view(`
  <div class="grid c4 mb16">
    ${[['api', 'الطلبات · 30 يوم', fmt(total.calls)], ['x', 'أخطاء', fmt(total.errors)], ['create', 'Tokens مستهلكة', short(total.tok)], ['voice', 'أحرف ElevenLabs المتبقية', short(s.eleven.remaining || 0)]]
      .map(([i, l, n], ix) => `<div class="card stat ${ix === 0 ? 'feature' : ''}"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div></div>`).join('')}
  </div>
  <div class="grid c12">
    <div class="card s8"><div class="card-h"><h3>المزوّدون</h3></div>
      <div class="tablewrap"><table><thead><tr><th>المزوّد</th><th>الاستعمال</th><th>المفتاح</th><th>الحالة</th><th>طلبات</th></tr></thead><tbody>
      ${s.providers.map((p) => { const u = s.usage[p.id]; const used = Object.entries(s.settings).filter(([, x]) => x.provider === p.id).map(([k, x]) => `${KIND[k]}: <span class="ltr">${esc(x.model)}</span>`).join('<br>'); return `<tr><td><b>${esc(p.name)}</b></td><td class="xs sec">${used || p.kinds.map((k) => KIND[k]).join(' · ')}</td>
        <td class="xs muted">${p.connected ? `<span class="mono ltr">••••${esc(p.last4)}</span>` : '—'}</td>
        <td>${p.connected ? chip((PST[p.status] || [p.status])[0], (PST[p.status] || ['', ''])[1]) : chip('غير مربوط', '')}</td><td class="tnum sm">${u ? fmt(u.calls) : '—'}</td></tr>`; }).join('')}
        <tr><td><b>ElevenLabs</b></td><td class="xs sec">أصوات · لكل براند</td><td class="xs muted">${fmt(s.eleven.total || 0)} مفتاح</td><td>${s.eleven.active ? chip(`${fmt(s.eleven.active)} نشط`, 'em') : chip('لا مفاتيح نشطة', 'am')}</td><td class="tnum sm">${s.usage.elevenlabs ? fmt(s.usage.elevenlabs.calls) : '—'}</td></tr>
      </tbody></table></div></div>
    <div class="stack s4">
      <div class="card"><div class="card-h"><h3>التخزين</h3></div><div class="rows">
        <div class="row-i"><span class="dot" style="background:${s.storage.db ? '#10B981' : '#E11D48'}"></span><div class="t"><b style="font-weight:500">قاعدة البيانات</b><small>Redis · ${esc(s.storage.mode || 'غير مربوطة')}</small></div></div>
        <div class="row-i"><span class="dot" style="background:${s.storage.blob ? '#10B981' : '#F59E0B'}"></span><div class="t"><b style="font-weight:500">الملفات</b><small>${s.storage.blob ? 'Vercel Blob' : 'داخل Redis (اربط Blob للملفات الكبيرة)'}</small></div></div>
      </div></div>
      <div class="card"><div class="card-h"><h3>خط المنصة</h3><div class="end">${chip('Thmanyah Sans', '', false)}</div></div>
        <p class="muted xs">ارفع ملفات الخط (OTF/WOFF). الوزن يُعرف من اسم الملف: Light, Regular, Medium, Bold, Black. يُعرض بـ font-display: swap.</p>
        <div class="flex wrap mt8" id="fw"></div>
        <label class="btn grey sm mt12" data-drop style="cursor:pointer">${ic('upload')}رفع ملفات الخط<input type="file" id="fontIn" accept=".otf,.ttf,.woff,.woff2" multiple hidden></label></div>
      <div class="card"><div class="card-h"><h3>الاستخدام حسب المزوّد</h3></div><div class="rows">
        ${Object.entries(s.usage).map(([p, u]) => `<div class="row-i"><div class="t"><b>${esc(NAMES[p] || p)}</b><small>${fmt(u.calls)} طلب · ${fmt(u.errors)} خطأ · متوسط ${fmt(u.calls ? u.ms / u.calls : 0)}ms</small></div><span class="xs tnum muted">${u.inTok + u.outTok ? short(u.inTok + u.outTok) + ' tok' : u.chars ? short(u.chars) + ' حرف' : ''}</span></div>`).join('') || '<p class="muted sm">لا يوجد استخدام بعد</p>'}
      </div></div>
    </div>
    <div class="card s12"><div class="card-h"><h3>آخر الطلبات</h3></div>
      ${s.logs.length ? `<div class="tablewrap"><table><thead><tr><th>الوقت</th><th>النوع</th><th>المزوّد</th><th>البراند</th><th>الحالة</th><th>المدة</th><th>التفاصيل</th></tr></thead><tbody>
      ${s.logs.map((l) => `<tr><td class="xs muted">${rel(l.t)}</td><td class="sm">${esc(KINDS[l.kind] || l.kind || '')}</td><td class="sm">${esc(NAMES[l.provider] || l.provider || '')}</td>
        <td class="sm">${esc(S.brands.find((b) => b.id === l.brand)?.name || '—')}</td><td>${l.status === 200 ? chip('200', 'em') : chip(String(l.status || '—'), 'ro')}</td><td class="tnum xs">${l.ms ? fmt(l.ms) + 'ms' : '—'}</td>
        <td class="xs sec" style="max-width:300px">${esc(l.error || [l.model || '', l.chars ? fmt(l.chars) + ' حرف' : '', l.inTok ? `${fmt(l.inTok)}→${fmt(l.outTok)} tok` : '', l.key ? 'مفتاح: ' + l.key : '', l.count ? l.count + ' مفتاح' : ''].filter(Boolean).join(' · '))}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted sm">لا توجد طلبات بعد</p>'}
    </div>
  </div>`);
  const drawFonts = (f) => { $('#fw').innerHTML = [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [700, 'Bold'], [900, 'Black']].map(([w, n]) => chip(n, f[w] ? 'em' : '', true)).join(''); };
  api('/api/fonts').then((r) => drawFonts(r.fonts)).catch(() => {});
  $('#fontIn', v).onchange = async (e) => {
    const W = [['black', 900], ['heavy', 900], ['bold', 700], ['medium', 500], ['light', 300], ['regular', 400], ['book', 400]];
    for (const file of e.target.files) {
      const w = (W.find(([k]) => file.name.toLowerCase().includes(k)) || [0, 400])[1];
      const dataUrl = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
      try { const r = await api('/api/fonts', { method: 'POST', body: { weight: w, dataUrl } }); drawFonts(r.fonts); toast(`تم رفع ${file.name}`); } catch (err) { toast(`${file.name}: ${err.message}`, true); }
    }
    toast('حدّث الصفحة لرؤية الخط');
  };
};

// ---------- model picker (each page shows only the models of its kind) ----------
const KIND_L = { text: 'نموذج الكتابة', image: 'نموذج الصور', video: 'نموذج الفيديو' };
async function loadModels(kind, force = false) {
  if (!force && S.mcache[kind]) return S.mcache[kind];
  S.mcache[kind] = await api(`/api/models?kind=${kind}`);
  const cur = S.pick[kind];
  if (cur && !S.mcache[kind].models.some((m) => m.provider === cur.provider && m.model === cur.model)) delete S.pick[kind];
  return S.mcache[kind];
}
function aiOf(kind) {
  return S.pick[kind] || { provider: 'auto' };
}
function fallbackNote(r) {
  if (r?.fallback) toast(`النموذج ${r.fallback.from.join('، ')} لم يعمل، فاستُعمل ${r.model || ''} بدلاً منه`);
}
function pickerHTML(kind) {
  const cur = aiOf(kind);
  const auto = cur.provider === 'auto';
  const pname = auto ? '' : (S.mcache[kind]?.models.find((m) => m.provider === cur.provider)?.providerName || cur.provider);
  return `<div class="sel picker"><button class="sel-btn" data-mp="${kind}" data-menu title="${KIND_L[kind]}">${ic(auto ? 'sparkle' : kind === 'text' ? 'edit' : kind === 'image' ? 'studio' : 'play')}<span class="lab">${auto ? 'تلقائي <span class="muted xs">· الأفضل للمهمة + بديل عند الفشل</span>' : `${esc(pname)} <span class="muted xs ltr">· ${esc(cur.model)}</span>`}</span>${ic('chev')}</button></div>`;
}
function bindPicker(root, onChange) {
  $$('[data-mp]', root).forEach((btn) => (btn.onclick = async () => {
    const kind = btn.dataset.mp;
    const data = await loadModels(kind).catch(() => ({ models: [] }));
    const cur = aiOf(kind);
    if (!data.models.length) return openMenu(btn, [{ label: 'لا توجد نماذج مناسبة', desc: 'اربط مفتاحاً يدعم ' + KIND[kind], icon: 'plug', onClick: () => go('providers') }], { width: 300 });
    const groups = {};
    for (const m of data.models) (groups[m.providerName] = groups[m.providerName] || []).push(m);
    const items = [{ label: '✦ تلقائي', desc: 'يختار أفضل نموذج للمهمة، وإذا فشل يجرّب البديل وحده', selected: cur.provider === 'auto', onClick: () => { S.pick[kind] = { provider: 'auto' }; store.set('mos-pick', JSON.stringify(S.pick)); onChange && onChange(); } }, { divider: true }];
    for (const [name, list] of Object.entries(groups)) {
      if (items.length && !items[items.length - 1].divider) items.push({ divider: true });
      for (const m of list) items.push({ label: m.model, desc: name + (data.current?.provider === m.provider && data.current?.model === m.model ? ' · الافتراضي' : '') + (m.soon && kind === 'video' ? ' · قريباً' : ''), selected: cur?.provider === m.provider && cur?.model === m.model, onClick: () => { S.pick[kind] = { provider: m.provider, model: m.model }; store.set('mos-pick', JSON.stringify(S.pick)); onChange && onChange(); } });
    }
    items.push({ divider: true }, { label: 'تحديث القائمة من المزوّدين', icon: 'refresh', onClick: async () => { delete S.mcache[kind]; await loadModels(kind, true); onChange && onChange(); } });
    openMenu(btn, items, { search: data.models.length > 8, width: 340 });
  }));
}

// ---------- providers (BYOK) ----------
const KIND = { text: 'كتابة وتحليل', image: 'صور', video: 'فيديو', search: 'بحث الإنترنت', social: 'النشر على المنصات' };
const PST = { active: ['يعمل', 'em'], saved: ['محفوظ', 'sk'], invalid: ['مرفوض', 'ro'], error: ['خطأ مؤقت', 'am'] };
async function loadProviders() {
  const [p, g] = await Promise.all([api('/api/providers'), api('/api/google').catch(() => null)]);
  S.prov = p; S.google = g; S.mcache = {};
  return S.prov;
}
PAGES.providers = async () => {
  header(`<button class="btn grey" id="ptt" data-busy="يختبر…">${ic('sparkle')}اختبار الكتابة</button>`);
  $('#ptt').onclick = (e) => busy(e.currentTarget, async () => {
    try { const r = await api('/api/system/test-text', { method: 'POST', body: {} }); r.ok ? toast(`يعمل · ${r.provider} · ${r.model} · ${r.ms}ms`) : toast(r.error, true); } catch (err) { toast(err.message, true); }
  });
  await loadProviders();
  drawProviders();
};
function drawProviders() {
  const { providers: list, settings: st } = S.prov;
  const connected = list.filter((p) => p.connected);
  const assign = (kind) => {
    const cur = st[kind];
    const opts = connected.filter((p) => p.kinds.includes(kind) && !p.soon);
    return `<div class="prop"><span class="k">${ic(kind === 'text' ? 'edit' : kind === 'image' ? 'studio' : 'play')}${KIND[kind]}</span><span class="v">
      ${opts.length ? `<div class="sel" style="flex:1"><button class="sel-btn" data-asg="${kind}" data-menu><span class="lab">${cur ? `${esc(list.find((p) => p.id === cur.provider)?.name || cur.provider)} <span class="muted xs ltr">· ${esc(cur.model)}</span>` : 'اختر المزوّد'}</span>${ic('chev')}</button></div>
      ${cur ? `<button class="btn grey sm" data-model="${kind}">النموذج</button>` : ''}` : `<span class="muted sm">${kind === 'video' ? 'قريباً (المرحلة 3) · يمكنك حفظ المفاتيح الآن' : 'اربط مزوّداً يدعم ' + KIND[kind]}</span>`}</span></div>`;
  };
  const v = view(`
  <div class="grid c12 mb16">
    <div class="card s8"><div class="card-h"><h3>من يقوم بماذا</h3><div class="end"><span class="muted xs">يمكنك تغييره في أي وقت</span></div></div>
      ${assign('text')}${assign('image')}${assign('video')}
      <p class="hint mt12">كل طلب يذهب مباشرة من المنصة إلى الشركة بمفتاحك. الفاتورة عندهم، لا نقاط ولا اشتراك عندنا.</p></div>
    <div class="card s4"><div class="card-h"><h3>الأمان</h3></div><div class="rows">
      ${[['المفاتيح مشفّرة', 'AES-256-GCM قبل الحفظ'], ['لا تظهر كاملة', 'آخر 4 أحرف فقط'], ['تُختبر عند الإضافة', 'نعرف فوراً إن كانت مرفوضة'], ['ElevenLabs منفصل', '100+ مفتاح لكل براند مع تدوير']].map(([t, d]) => `<div class="row-i"><span class="dot" style="background:#10B981"></span><div class="t"><b style="font-weight:500">${t}</b><small>${d}</small></div></div>`).join('')}
    </div></div>
  </div>
  <div class="grid c3">${list.map((p) => { const stt = PST[p.status] || ['', '']; return `<div class="card">
    <div class="card-h"><h3>${esc(p.name)}</h3><div class="end">${p.connected ? chip(stt[0], stt[1]) : p.soon ? chip('الفيديو قريباً', '') : ''}</div></div>
    <div class="flex wrap">${p.kinds.map((k) => chip(KIND[k], '', false)).join('')}</div>
    ${p.custom ? `<p class="muted xs mt8 ltr" style="text-align:right">${esc(p.baseUrl)} · ${p.compat === 'anthropic' ? 'Anthropic' : 'OpenAI'}-compatible</p>` : ''}
    <p class="muted xs mt12">${p.connected ? `<span class="mono ltr">••••${esc(p.last4)}</span> · ${p.models.length ? `${p.models.length} نموذج متاح · ` : ''}${rel(p.testedAt)}` : `احصل على المفتاح من <span class="ltr">${esc(p.site)}</span>`}</p>
    ${p.error ? `<p class="xs mt8" style="color:var(--t-ro)">${esc(p.error)}</p>` : ''}
    <div class="flex mt16">${p.connected ? `<button class="btn grey sm" data-pt="${p.id}">${ic('refresh')}اختبار</button><button class="btn ghost sm" data-pc="${p.id}">تغيير المفتاح</button><span class="grow"></span><button class="btn grey icon sm" data-pd="${p.id}" aria-label="فصل">${ic('trash')}</button>` : `<button class="btn primary sm" data-pc="${p.id}">${ic('plug')}ربط المفتاح</button>`}</div>
  </div>`; }).join('')}
    <div class="card ent" id="addCustom" style="cursor:pointer"><div class="add" style="min-height:100%"><span class="ic">${ic('plus')}</span><b>مزوّد مخصص</b><span class="xs">أي API متوافق مع OpenAI أو Anthropic: Base URL + مفتاح</span></div></div>
    <div class="card"><div class="card-h"><h3>ElevenLabs</h3><div class="end">${chip('لكل براند', 'vi')}</div></div><div class="flex wrap">${chip('أصوات', '', false)}</div>
      <p class="muted xs mt12">مفاتيح ElevenLabs تُضاف لكل براند على حدة (100+ مفتاح) مع تدوير حسب الرصيد.</p>
      <div class="flex mt16"><button class="btn ghost sm" data-go="keys">${ic('keys')}إدارة المفاتيح</button></div></div>
    ${googleCard(S.google)}
  </div>`);
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
  $('#addCustom', v).onclick = customModal;
  $$('[data-pc]', v).forEach((x) => (x.onclick = () => connectModal(list.find((p) => p.id === x.dataset.pc))));
  $$('[data-pt]', v).forEach((x) => (x.onclick = () => busy(x, async () => {
    try { const r = await api(`/api/providers/${x.dataset.pt}/test`, { method: 'POST', body: {} }); toast(r.status === 'active' ? `${r.name} يعمل · ${r.ms}ms` : `${r.name}: ${r.error || r.status}`, r.status !== 'active' && r.status !== 'saved'); await loadProviders(); drawProviders(); } catch (err) { toast(err.message, true); }
  })));
  $$('[data-pd]', v).forEach((x) => (x.onclick = async () => {
    const p = list.find((y) => y.id === x.dataset.pd);
    if (!(await confirmBox(`فصل ${p.name}؟`, 'سيُحذف المفتاح من المنصة. يمكنك ربطه مجدداً لاحقاً.', 'فصل', true))) return;
    try { await api(`/api/providers/${p.id}`, { method: 'DELETE' }); await loadProviders(); drawProviders(); toast('تم الفصل'); } catch (err) { toast(err.message, true); }
  }));
  $$('[data-asg]', v).forEach((btn) => (btn.onclick = () => {
    const kind = btn.dataset.asg;
    openMenu(btn, connected.filter((p) => p.kinds.includes(kind) && !p.soon).map((p) => ({ label: p.name, desc: p.defaults[kind], selected: st[kind]?.provider === p.id, onClick: () => saveAssign(kind, p.id, p.defaults[kind]) })));
  }));
  $$('[data-model]', v).forEach((btn) => (btn.onclick = () => modelModal(btn.dataset.model)));
  bindGoogle(v);
}

// ---------- Google account (Sheets) ----------
function googleCard(g) {
  if (!g) return '';
  return `<div class="card"><div class="card-h"><h3>Google Sheets</h3><div class="end">${g.connected ? chip('مربوط', 'em') : g.error ? chip('يحتاج إعادة ربط', 'ro') : g.configured ? chip('جاهز للربط', 'am') : ''}</div></div>
    <div class="flex wrap">${chip('ملفات البحث', '', false)}${chip('موافقات', '', false)}</div>
    <p class="muted xs mt12">${g.connected ? `<span class="ltr">${esc(g.email)}</span> · ${rel(g.connectedAt)}` : 'ملف لكل منافس + ملف رئيسي للبراند داخل Google Drive الخاص بك.'}</p>
    ${g.error ? `<p class="xs mt8" style="color:var(--t-ro)">${esc(g.error)}</p>` : ''}
    ${!g.configured ? '<p class="xs mt8 muted">يحتاج إعداداً واحداً من مسؤول المنصة، بعدها يكفي زر واحد لكل مستخدم.</p>' : ''}
    <div class="flex mt16">${g.connected
      ? `<button class="btn grey sm" data-gcon>${ic('refresh')}إعادة الربط</button>${g.managed ? '' : `<button class="btn ghost sm" data-gset>للمسؤول</button>`}<span class="grow"></span><button class="btn grey icon sm" data-goff aria-label="فصل">${ic('trash')}</button>`
      : g.configured ? `<button class="btn primary sm" data-gcon>${ic('plug')}ربط حساب Google</button>${g.managed ? '' : `<button class="btn ghost sm" data-gset>للمسؤول</button>`}`
      : `<button class="btn ghost sm" data-gset>${ic('settings')}إعداد (للمسؤول)</button>`}</div></div>`;
}
async function googleConnect() {
  try { const r = await api('/api/google/connect', { method: 'POST', body: {} }); location.href = r.url; } catch (err) { toast(err.message, true); }
}
function bindGoogle(v) {
  $$('[data-gcon]', v).forEach((x) => (x.onclick = googleConnect));
  $$('[data-gset]', v).forEach((x) => (x.onclick = googleModal));
  $$('[data-goff]', v).forEach((x) => (x.onclick = async () => {
    if (!(await confirmBox('فصل حساب Google؟', 'سيُلغى إذن المنصة. ملفاتك تبقى في Google Drive، ويمكنك الربط مجدداً لاحقاً.', 'فصل', true))) return;
    try { S.google = await api('/api/google', { method: 'DELETE' }); drawProviders(); toast('تم الفصل'); } catch (err) { toast(err.message, true); }
  }));
}
function googleModal() {
  const g = S.google || {};
  const steps = [
    ['افتح <a class="src" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud ↗</a> وأنشئ مشروعاً (أو استعمل مشروعاً موجوداً).', ''],
    ['فعّل <a class="src" href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener">Google Sheets API ↗</a> و <a class="src" href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener">Google Drive API ↗</a> (زر Enable).', ''],
    ['<a class="src" href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener">OAuth consent screen ↗</a>: نوع External، اسم التطبيق Marketing OS، وأضف بريدك في Test users.', ''],
    ['<a class="src" href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener">Clients ↗</a> ← Create client ← Web application. في Authorized redirect URIs الصق هذا الرابط:', g.redirectUri],
    ['انسخ Client ID و Client Secret والصقهما هنا، ثم اضغط «حفظ والربط».', ''],
  ];
  modal(`<h2>إعداد Google (مرة واحدة · للمسؤول)</h2><p class="muted sm mt8">هذا الإعداد تقني ويقوم به صاحب المنصة مرة واحدة فقط. الأفضل: ضع القيمتين في Vercel كـ <span class="ltr mono">GOOGLE_CLIENT_ID</span> و <span class="ltr mono">GOOGLE_CLIENT_SECRET</span>، فيرى كل المستخدمين زر «ربط حساب Google» فقط. المنصة ترى وتعدّل <b>فقط</b> الملفات التي تنشئها هي.</p>
    <div class="rows mt12">${steps.map(([t, code], i) => `<div class="row-i" style="align-items:flex-start"><span class="ic" style="width:26px;height:26px;border-radius:8px;font-size:12px;flex:none">${i + 1}</span><div class="t"><small style="color:var(--text);white-space:normal">${t}</small>${code ? `<div class="flex mt8"><input class="field mono ltr sm" readonly value="${esc(code)}" style="text-align:left" id="gru"><button class="btn grey sm" id="gcp">نسخ</button></div>` : ''}</div></div>`).join('')}</div>
    <label class="lbl">Client ID</label><input class="field mono ltr" id="gid" placeholder="…apps.googleusercontent.com" style="text-align:left" value="">
    <label class="lbl">Client Secret</label><input class="field mono ltr" id="gsec" type="password" autocomplete="off" style="text-align:left" placeholder="${g.configured ? 'محفوظ · اكتب قيمة جديدة لتغييره' : 'GOCSPX-…'}">
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="gsave" data-busy="يحفظ…">${ic('plug')}حفظ والربط</button></div>`, (m) => {
    m.style.maxWidth = '640px';
    $('[data-x]', m).onclick = closeModal;
    $('#gcp', m) && ($('#gcp', m).onclick = () => { navigator.clipboard?.writeText($('#gru', m).value); toast('تم النسخ'); });
    $('#gsave', m).onclick = () => busy($('#gsave', m), async () => {
      try {
        S.google = await api('/api/google', { method: 'PUT', body: { clientId: $('#gid', m).value.trim(), clientSecret: $('#gsec', m).value.trim() } });
        closeModal(); await googleConnect();
      } catch (err) { toast(err.message, true); }
    });
  });
}
async function saveAssign(kind, provider, model) {
  try { const r = await api('/api/providers/settings', { method: 'PUT', body: { [kind]: { provider, model } } }); S.prov.settings = r.settings; S.ov = null; drawProviders(); toast('تم الحفظ'); } catch (err) { toast(err.message, true); }
}
async function modelModal(kind) {
  const cur = S.prov.settings[kind];
  const p = S.prov.providers.find((x) => x.id === cur.provider);
  const models = ((await loadModels(kind).catch(() => ({ models: [] }))).models || []).filter((m) => m.provider === p.id).map((m) => m.model);
  modal(`<h2>نموذج ${KIND[kind]} · ${esc(p.name)}</h2><p class="muted sm mt8">اختر من النماذج المتاحة في حسابك أو اكتب اسم النموذج.</p>
    <label class="lbl">اسم النموذج</label><input class="field ltr" id="mname" value="${esc(cur.model)}" style="text-align:left">
    ${models.length ? `<div class="opts mt12" style="max-height:220px;overflow:auto">${models.slice(0, 80).map((m) => `<button class="opt ltr ${m === cur.model ? 'on' : ''}" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>` : ''}
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="msave">حفظ</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    $$('[data-m]', m).forEach((b) => (b.onclick = () => { $('#mname').value = b.dataset.m; $$('[data-m]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#msave').onclick = () => { const val = $('#mname').value.trim(); if (!val) return; closeModal(); saveAssign(kind, cur.provider, val); };
  });
}
function connectModal(p) {
  const labels = { apiKey: 'API Key', accessKey: 'Access Key', secretKey: 'Secret Key' };
  modal(`<h2>ربط ${esc(p.name)}</h2><p class="muted sm mt8">أنشئ المفتاح من <b class="ltr" style="color:var(--text)">${esc(p.site)}</b> ثم الصقه هنا. يُختبر ويُشفّر ولا يظهر كاملاً مرة أخرى.</p>
    ${p.fields.map((f) => `<label class="lbl">${labels[f] || f}</label><input class="field mono ltr" type="password" autocomplete="off" data-f="${f}" placeholder="${esc(p.hint)}" style="text-align:left">`).join('')}
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="pcs" data-busy="يختبر…">ربط واختبار</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    const save = () => busy($('#pcs'), async () => {
      const body = {};
      $$('[data-f]', m).forEach((i) => (body[i.dataset.f] = i.value.trim()));
      try { const r = await api(`/api/providers/${p.id}`, { method: 'PUT', body }); closeModal(); toast(r.status === 'active' ? `تم ربط ${p.name} ✓` : `تم الحفظ (${PST[r.status]?.[0] || r.status})`); S.ov = null; await loadProviders(); if (S.page === 'providers') drawProviders(); } catch (err) { toast(err.message, true); }
    });
    $('#pcs').onclick = save;
    $$('[data-f]', m).forEach((i) => (i.onkeydown = (e) => { if (e.key === 'Enter') save(); }));
  });
}

function customModal() {
  modal(`<h2>مزوّد مخصص</h2><p class="muted sm mt8">أي خدمة توفّر API متوافقاً مع OpenAI (<span class="ltr">/v1/chat/completions</span>) أو Anthropic (<span class="ltr">/v1/messages</span>). المفتاح يُشفّر ولا يظهر مرة أخرى.</p>
    <label class="lbl">الاسم</label><input class="field" id="cn" maxlength="60" placeholder="مثلاً: ALFIA LLM">
    <label class="lbl">Base URL</label><input class="field ltr" id="cu" placeholder="https://example.com/v1" style="text-align:left">
    <p class="hint">الرابط الذي ينتهي بـ <span class="ltr">/v1</span>، بدون <span class="ltr">/chat/completions</span>.</p>
    <span class="lbl">نوع التوافق</span><div class="opts" data-opts="compat"><button class="opt on" data-k="openai">OpenAI-compatible</button><button class="opt" data-k="anthropic">Anthropic-compatible</button></div>
    <span class="lbl">يُستعمل لـ</span><div class="opts" data-opts="kinds"><button class="opt on" data-k="text">كتابة وتحليل</button><button class="opt" data-k="image">صور</button></div>
    <label class="lbl">API Key</label><input class="field mono ltr" id="ck" type="password" autocomplete="off" style="text-align:left">
    <label class="lbl">اسم نموذج افتراضي (اختياري)</label><input class="field ltr" id="cm" placeholder="يُجلب تلقائياً إن كانت الخدمة تعرض /models" style="text-align:left">
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="cs" data-busy="يختبر…">${ic('plug')}ربط واختبار</button></div>`, (m) => {
    const st = { compat: 'openai', kinds: ['text'] };
    bindOpts(m, st, ['kinds']);
    $('[data-x]', m).onclick = closeModal;
    $('#cs').onclick = () => busy($('#cs'), async () => {
      try {
        const r = await api('/api/providers/custom', { method: 'POST', body: { name: $('#cn').value, baseUrl: $('#cu').value, apiKey: $('#ck').value.trim(), compat: st.compat, kinds: st.kinds, model: $('#cm').value } });
        closeModal(); toast(r.models.length ? `تم ربط ${r.name} · ${r.models.length} نموذج` : `تم حفظ ${r.name}. اكتب اسم النموذج من زر "النموذج".`);
        await loadProviders(); if (S.page === 'providers') drawProviders();
      } catch (err) { toast(err.message, true); }
    });
  });
}

// ---------- create (content generator + results + monthly plan) ----------
const PLAT_IC = { instagram: 'IG', facebook: 'FB', tiktok: 'TT', x: 'X', linkedin: 'IN', snapchat: 'SC', youtube: 'YT', threads: 'TH', whatsapp: 'WA' };
async function needText() {
  if (!S.prov) await loadProviders().catch(() => null);
  if (S.prov?.settings?.text) return false;
  view(`<div class="empty"><span class="ic">${ic('plug')}</span><h3>اربط مفتاح AI أولاً</h3><p>إنشاء المحتوى يستعمل مفتاحك الخاص (OpenAI أو Gemini أو Claude أو OpenRouter…). أضفه مرة واحدة وسيعمل لكل البراندات.</p><button class="btn primary" id="gp">${ic('plug')}المفاتيح والمزوّدون</button></div>`);
  $('#gp').onclick = () => go('providers');
  return true;
}
PAGES.create = async () => {
  if (needBrand()) return header();
  header(pills('ctab', [['new', 'محتوى جديد'], ['results', 'النتائج'], ['plan', 'الخطة الشهرية']], S.ctab));
  requestAnimationFrame(() => placePills($('#head')));
  if (await needText()) return;
  if (!S.opts) S.opts = await api('/api/content/options');
  if (S.ctab === 'results') return S.batch ? drawBatch() : drawBatches();
  if (S.ctab === 'plan') return drawPlan();
  return drawCreate();
};
function optsRow(key, map, cur, multi = false) {
  return `<div class="opts" data-opts="${key}">${Object.entries(map).map(([k, l]) => `<button class="opt ${multi ? (cur.includes(k) ? 'on' : '') : k === cur ? 'on' : ''}" data-k="${k}">${esc(l.split(' (')[0])}</button>`).join('')}</div>`;
}
function bindOpts(root, state, multi = [], max = {}) {
  $$('[data-opts]', root).forEach((row) => {
    const key = row.dataset.opts;
    $$('.opt', row).forEach((b) => (b.onclick = () => {
      if (multi.includes(key)) {
        const set = new Set(state[key]);
        set.has(b.dataset.k) ? set.delete(b.dataset.k) : set.add(b.dataset.k);
        if (!set.size) return toast('اختر واحدة على الأقل', true);
        if (max[key] && set.size > max[key]) return toast(`الحد الأقصى ${max[key]}`, true);
        state[key] = [...set];
        b.classList.toggle('on');
      } else {
        state[key] = b.dataset.k;
        $$('.opt', row).forEach((x) => x.classList.toggle('on', x === b));
      }
    }));
  });
}
async function drawCreate() {
  const f = S.form;
  const o = S.opts;
  const b = S.brand;
  if (f.productId && !b.products.some((p) => p.id === f.productId)) f.productId = '';
  const prod = b.products.find((p) => p.id === f.productId);
  await loadModels('text').catch(() => null);
  let occ = []; let occMarket = '';
  try { const r = await api(`/api/brands/${b.id}/occasions`); occ = r.occasions; occMarket = r.market; } catch { /* optional */ }
  if (!S.batches) { try { S.batches = (await api(`/api/brands/${b.id}/batches`)).batches; } catch { S.batches = []; } }
  const v = view(`<div class="grid c12">
    <div class="card s8"><div class="card-h"><h3>ماذا نكتب اليوم؟</h3><div class="end">${pickerHTML('text')}</div></div>
      <span class="lbl" style="margin-top:0">المنتج أو الخدمة</span>
      <div class="sel"><button class="sel-btn" id="cprod" data-menu><span class="lab">${prod ? esc(prod.name) : b.products.length ? 'البراند كاملاً (بدون منتج محدد)' : 'البراند كاملاً · أضف منتجات من عقل البراند'}</span>${ic('chev')}</button></div>
      <span class="lbl">المنصات</span>${optsRow('platforms', o.PLATFORMS, f.platforms, true)}
      <span class="lbl">نوع المحتوى <span class="muted xs" style="font-weight:400">· اختر حتى 3 أنواع في نفس الطلب</span></span>${optsRow('types', o.TYPES, f.types, true)}
      <div id="cslides">${f.types.includes('carousel') ? `<span class="lbl">عدد شرائح الكاروسيل</span><div class="opts" data-opts="slides">${[3, 4, 5, 6, 7, 8, 10].map((n) => `<button class="opt ${(f.slides || 6) === n ? 'on' : ''}" data-k="${n}">${n}</button>`).join('')}</div>` : ''}</div>
      <span class="lbl">الهدف</span>${optsRow('goal', o.GOALS, f.goal)}
      <div class="grid c2" style="gap:12px">
        <div><span class="lbl">اللغة / اللهجة</span>${optsRow('dialect', o.DIALECTS, f.dialect)}</div>
        <div><span class="lbl">إطار الكتابة</span>${optsRow('framework', o.FRAMEWORKS, f.framework)}</div>
      </div>
      <span class="lbl">الفكرة أو ملاحظاتك (اختياري)</span>
      <textarea class="field" id="cidea" data-mic data-enhance="content" rows="3" maxlength="1500" placeholder="مثلاً: عرض خاص 20% بمناسبة العودة للمدارس، ركّز على الجودة والتوصيل السريع…">${esc(f.idea)}</textarea>
      ${occ.length ? `<span class="lbl">مناسبات هذا الشهر <span class="muted xs" style="font-weight:400">· ${occMarket ? `حسب سوقك: ${esc(occMarket)}` : 'حدّد السوق في عقل البراند لتظهر مناسبات بلدك'}</span></span><div class="opts" id="cocc">${occ.map((x) => `<button class="opt ${f.occasion === x.name ? 'on' : ''}" data-o="${esc(x.name)}">${esc(x.name)} <span class="muted xs ltr">${x.date.slice(5)}</span></button>`).join('')}</div>` : ''}
      <div class="flex mt16"><span class="sm sec">${f.types.length > 1 ? 'العدد لكل نوع' : 'العدد'}</span><div class="pills" data-pills="count">${[1, 3, 5, 7, 10].map((n) => `<button data-v="${n}" class="${n === f.count ? 'on' : ''}">${n}</button>`).join('')}</div><span class="grow"></span>
        <button class="btn primary" id="cgo" data-busy="يكتب… قد يستغرق دقيقة">${ic('sparkle')}توليد المحتوى</button></div>
    </div>
    <div class="stack s4">
      <div class="card"><div class="card-h"><h3>عقل البراند المستعمل</h3><div class="end"><b class="num">${b.readiness.score}%</b></div></div>
        <div class="bar grad"><i style="width:${b.readiness.score}%"></i></div>
        <p class="muted xs mt12">${b.readiness.score < 50 ? 'العقل ناقص: النتائج ستكون عامة. أكمل الهوية من صفحة عقل البراند.' : 'النبرة، الجمهور، الوعد والممنوعات كلها تُرسل مع كل طلب.'}</p>
        <button class="btn grey sm mt12" data-go="brain">${ic('brain')}عقل البراند</button></div>
      <div class="card"><div class="card-h"><h3>آخر الدفعات</h3><div class="end"><button class="btn grey sm" data-tab="results">الكل</button></div></div>
        ${S.batches.length ? `<div class="rows">${S.batches.slice(0, 5).map((x) => `<div class="row-i" style="cursor:pointer" data-bt="${x.id}"><div class="t"><b class="sm" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.first || '—')}</b><small>${x.count} · ${esc(o.TYPES[x.params.type]?.split(' (')[0] || '')} · ${rel(x.createdAt)}</small></div></div>`).join('')}</div>` : '<p class="muted sm">لا توجد دفعات بعد</p>'}
      </div>
    </div></div>`);
  bindOpts(v, f, ['platforms', 'types'], { types: 3 });
  $$('[data-opts="types"] .opt', v).forEach((x) => x.addEventListener('click', () => { if (x.dataset.k === 'carousel') drawCreate(); }));
  $$('[data-opts="slides"] .opt', v).forEach((x) => x.addEventListener('click', () => (f.slides = Number(x.dataset.k))));
  bindPicker(v, () => drawCreate());
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
  $$('[data-tab]', v).forEach((x) => (x.onclick = () => { S.ctab = x.dataset.tab; PAGES.create(); }));
  $$('[data-bt]', v).forEach((x) => (x.onclick = () => openBatch(x.dataset.bt)));
  $('#cidea', v).oninput = (e) => (f.idea = e.target.value);
  $$('#cocc .opt', v).forEach((x) => (x.onclick = () => { f.occasion = f.occasion === x.dataset.o ? '' : x.dataset.o; $$('#cocc .opt', v).forEach((y) => y.classList.toggle('on', y.dataset.o === f.occasion)); }));
  $$('[data-pills="count"] button', v).forEach((x) => x.addEventListener('click', () => (f.count = Number(x.dataset.v))));
  $('#cprod', v).onclick = (e) => openMenu(e.currentTarget, [{ label: 'البراند كاملاً', selected: !f.productId, onClick: () => { f.productId = ''; drawCreate(); } },
    ...b.products.map((p) => ({ label: p.name, desc: p.price || '', selected: p.id === f.productId, onClick: () => { f.productId = p.id; drawCreate(); } })),
    { divider: true }, { label: 'إضافة منتج', icon: 'plus', onClick: () => { S.brainTab = 'products'; go('brain'); } }], { search: b.products.length > 6 });
  $('#cgo', v).onclick = (e) => busy(e.currentTarget, async () => {
    try {
      const batch = await api(`/api/brands/${b.id}/batches`, { method: 'POST', body: { ...f, ai: aiOf('text') } });
      S.batches = null; S.ov = null;
      S.batch = batch; S.ctab = 'results';
      PAGES.create();
      toast(`تم توليد ${batch.items.length} عنصر · ${batch.model}`);
      if (batch.fallback) fallbackNote({ fallback: batch.fallback, model: batch.model });
    } catch (err) { toast(err.message, true); }
  });
}
async function openBatch(id) {
  try { S.batch = await api(`/api/brands/${S.brand.id}/batches/${id}`); S.ctab = 'results'; PAGES.create(); } catch (err) { toast(err.message, true); }
}
async function drawBatches() {
  S.batches = (await api(`/api/brands/${S.brand.id}/batches`)).batches;
  const o = S.opts;
  if (!S.batches.length) {
    view(`<div class="empty"><span class="ic">${ic('create')}</span><h3>لا توجد نتائج بعد</h3><p>كل دفعة محتوى تولّدها تُحفظ هنا لتعود إليها، تعدّلها، أو تصمم صورها.</p><button class="btn primary" id="cn">${ic('sparkle')}محتوى جديد</button></div>`);
    $('#cn').onclick = () => { S.ctab = 'new'; PAGES.create(); };
    return;
  }
  const v = view(`<div class="card" style="padding-top:8px"><div class="tablewrap"><table><thead><tr><th>أول عنصر</th><th>النوع</th><th>المنصات</th><th>العدد</th><th>معتمد</th><th>المنتج</th><th>التاريخ</th></tr></thead><tbody>
    ${S.batches.map((x) => `<tr style="cursor:pointer" data-bt="${x.id}"><td style="max-width:340px"><b class="sm" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.first)}</b></td>
      <td class="sm">${esc(o.TYPES[x.params.type]?.split(' (')[0] || '')}</td><td class="xs">${x.params.platforms.map((p) => chip(o.PLATFORMS[p] || p, '', false)).join(' ')}</td>
      <td class="tnum">${x.count}</td><td>${x.approved ? chip(String(x.approved), 'em') : '<span class="muted">—</span>'}</td><td class="sm sec">${esc(x.params.productName || '—')}</td><td class="xs muted">${rel(x.createdAt)}</td></tr>`).join('')}
  </tbody></table></div></div>`);
  $$('[data-bt]', v).forEach((x) => (x.onclick = () => openBatch(x.dataset.bt)));
}
function itemText(it) {
  return [it.hook, '', it.caption, it.slides?.length ? '\n' + it.slides.join('\n') : '', it.cta ? '\n' + it.cta : '', it.hashtags?.length ? '\n' + it.hashtags.map((h) => '#' + h.replace(/\s+/g, '_')).join(' ') : ''].filter((x) => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function drawBatch() {
  const bt = S.batch;
  const o = S.opts;
  const p = bt.params;
  const v = view(`<div class="toolbar"><button class="btn ghost sm" id="bback">${ic('arrow', 'rtl-flip')}كل النتائج</button>
      <span class="sm sec">${esc((p.types || [p.type]).map((t) => o.TYPES[t]?.split(' (')[0]).join(' + '))} · ${esc(o.GOALS[p.goal])} · ${esc(o.DIALECTS[p.dialect])}${p.productName ? ' · ' + esc(p.productName) : ''}</span>
      <div class="end"><span class="muted xs ltr">${esc(bt.model)}</span><button class="btn grey icon sm" id="bdel" aria-label="حذف">${ic('trash')}</button></div></div>
    <div class="grid c2" style="align-items:start">${bt.items.map((it) => `<div class="card post ${it.best ? 'is-best' : ''}" data-it="${it.id}">
      <div class="card-h"><span class="pf">${PLAT_IC[it.platform] || '•'}</span><h3 style="font-size:14px">${esc(it.title || o.PLATFORMS[it.platform])}</h3>${(p.types || []).length > 1 ? chip(o.TYPES[it.type]?.split(' (')[0] || '', '', false) : ''}
        <div class="end">${it.status === 'approved' ? chip('معتمد', 'em') : it.status === 'rejected' ? chip('مرفوض', 'ro') : chip('مسودة', '')}</div></div>
      ${it.image?.url ? `<img class="post-img" src="${esc(it.image.url)}" alt="">` : ''}
      ${it.score ? `<div class="verdict ${it.best ? 'best' : ''}"><b>${it.best ? '★ الأفضل في هذه الدفعة · ' : ''}${it.score}/10</b><span>${esc(it.why || '')}</span></div>` : ''}
      <p class="hook">${esc(it.hook)}</p>
      <p class="cap">${esc(it.caption)}</p>
      ${it.cards?.length ? `<div class="cards-ed"><div class="flex"><b class="sm grow">الشرائح (${it.cards.length})</b><button class="btn ghost sm" data-a="cards">${ic('edit')}تعديل الشرائح</button></div>
        <div class="cards-row">${it.cards.map((c, i) => `<div class="cardlet">${c.image?.url ? `<img src="${esc(c.image.url)}" alt="">` : ''}<span class="n">${i + 1}</span><b>${esc(c.headline)}</b>${c.body ? `<p>${esc(c.body)}</p>` : ''}</div>`).join('')}</div></div>` : ''}
      ${it.slides?.length ? `<ol class="slides">${it.slides.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      ${it.cta ? `<p class="sm mt8"><b>CTA:</b> ${esc(it.cta)}</p>` : ''}
      ${it.hashtags?.length ? `<p class="tags">${it.hashtags.map((h) => '#' + esc(h)).join(' ')}</p>` : ''}
      <div class="inset mt12 xs vis" data-vis><div class="flex" style="align-items:flex-start"><span class="grow"><b>فكرة البصري:</b> <span class="vtxt">${esc(it.visual)}</span></span><button class="btn grey icon sm" data-a="visual" aria-label="تعديل فكرة البصري" title="تعديل فكرة البصري">${ic('edit')}</button></div></div>
      <div class="flex wrap mt12">
        <button class="btn grey sm" data-a="copy">${ic('copy')}نسخ</button>
        <button class="btn grey sm" data-a="edit">${ic('edit')}تعديل</button>
        <button class="btn grey sm" data-a="rewrite">${ic('refresh')}إعادة بملاحظة</button>
        <button class="btn grey sm" data-a="schedule">${ic('calendar')}جدولة</button>
        <button class="btn grey sm" data-a="image">${ic('studio')}${it.image ? 'عدّل التصميم' : it.cards?.length ? 'صمّم الشرائح' : 'صمّم'}</button>
        <span class="grow"></span>
        <button class="btn ${it.status === 'approved' ? 'ghost' : 'primary'} sm" data-a="approve">${ic('check')}${it.status === 'approved' ? 'إلغاء' : 'اعتماد'}</button>
      </div></div>`).join('')}</div>`);
  $('#bback').onclick = () => { S.batch = null; PAGES.create(); };
  $('#bdel').onclick = async () => {
    if (!(await confirmBox('حذف الدفعة؟', 'سيتم حذف كل العناصر في هذه الدفعة.', 'حذف', true))) return;
    try { await api(`/api/brands/${S.brand.id}/batches/${bt.id}`, { method: 'DELETE' }); S.batch = null; PAGES.create(); } catch (err) { toast(err.message, true); }
  };
  const url = (it) => `/api/brands/${S.brand.id}/batches/${bt.id}/items/${it.id}`;
  const replace = (n) => { bt.items = bt.items.map((x) => (x.id === n.id ? n : x)); drawBatch(); };
  $$('[data-it]', v).forEach((card) => {
    const it = bt.items.find((x) => x.id === card.dataset.it);
    $$('[data-a]', card).forEach((btn) => (btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === 'schedule') return scheduleModal({ platforms: [it.platform], title: it.title, caption: itemText(it), media: it.image?.url ? { type: 'image', url: it.image.url } : null, source: { kind: 'post', batch: bt.id, item: it.id } });
      if (a === 'copy') return navigator.clipboard.writeText(itemText(it)).then(() => toast('تم النسخ'), () => toast('تعذر النسخ', true));
      if (a === 'approve') return busy(btn, async () => { try { replace(await api(url(it), { method: 'PATCH', body: { status: it.status === 'approved' ? 'draft' : 'approved' } })); } catch (err) { toast(err.message, true); } });
      if (a === 'edit') return modal(`<h2>تعديل النص</h2><label class="lbl">الخطّاف</label><input class="field" id="eh" value="${esc(it.hook)}"><label class="lbl">النص</label><textarea class="field" id="ec" rows="9">${esc(it.caption)}</textarea><label class="lbl">CTA</label><input class="field" id="ecta" value="${esc(it.cta)}"><label class="lbl">الهاشتاغات</label><input class="field" id="et" value="${esc(it.hashtags.join(' '))}"><div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="es">حفظ</button></div>`, (m) => {
        $('[data-x]', m).onclick = closeModal;
        $('#es').onclick = () => busy($('#es'), async () => { try { replace(await api(url(it), { method: 'PATCH', body: { hook: $('#eh').value, caption: $('#ec').value, cta: $('#ecta').value, hashtags: $('#et').value.split(/[\s,]+/).map((x) => x.replace(/^#/, '')).filter(Boolean) } })); closeModal(); toast('تم الحفظ'); } catch (err) { toast(err.message, true); } });
      });
      if (a === 'rewrite') return modal(`<h2>إعادة الكتابة</h2><p class="muted sm mt8">قل ما تريد تغييره، والنظام يعيد كتابة هذا العنصر فقط.</p><textarea class="field mt12" id="rf" data-mic rows="4" placeholder="مثلاً: اجعله أقصر وأكثر مرحاً، وأضف سؤالاً للجمهور"></textarea>
        <div class="opts mt12">${['أقصر', 'أكثر مرحاً', 'أكثر رسمية', 'ركّز على السعر', 'أضف قصة قصيرة', 'خطّاف أقوى'].map((x) => `<button class="opt" data-q="${x}">${x}</button>`).join('')}</div>
        <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="rs" data-busy="يعيد الكتابة…">${ic('refresh')}إعادة</button></div>`, (m) => {
        $('[data-x]', m).onclick = closeModal;
        $$('[data-q]', m).forEach((q) => (q.onclick = () => { const t = $('#rf'); t.value = (t.value ? t.value + '، ' : '') + q.dataset.q; }));
        $('#rs').onclick = () => busy($('#rs'), async () => { try { const n = await api(url(it) + '/rewrite', { method: 'POST', body: { feedback: $('#rf').value, ai: aiOf('text') } }); closeModal(); replace(n); toast('تمت إعادة الكتابة'); } catch (err) { toast(err.message, true); } });
      });
      if (a === 'visual') {
        const box = btn.closest('[data-vis]');
        box.innerHTML = `<b>فكرة البصري</b><textarea class="field mt8" rows="3" data-enhance="image">${esc(it.visual)}</textarea><div class="flex mt8"><button class="btn primary sm" data-vs>حفظ</button><button class="btn ghost sm" data-vc>إلغاء</button></div>`;
        enhancePrompts(box);
        const ta = $('textarea', box); ta.focus();
        $('[data-vc]', box).onclick = () => drawBatch();
        $('[data-vs]', box).onclick = () => busy($('[data-vs]', box), async () => { try { replace(await api(url(it), { method: 'PATCH', body: { visual: ta.value.trim(), imagePrompt: '' } })); toast('حُفظت فكرة البصري'); } catch (err) { toast(err.message, true); } });
        return;
      }
      if (a === 'cards') return cardsModal(it, async (cards) => replace(await api(url(it), { method: 'PATCH', body: { cards } })));
      if (a === 'image') {
        const aspect = ['tiktok', 'snapchat'].includes(it.platform) || ['reel', 'story', 'ugc'].includes(it.type) ? '9:16' : it.platform === 'instagram' ? '4:5' : ['x', 'youtube', 'linkedin'].includes(it.platform) ? '16:9' : '1:1';
        const prod = S.brand.products.find((p) => p.id === bt.params?.productId);
        if (prod && prod.kind !== 'service' && !prod.photo) return productPhotoModal(prod, () => btn.isConnected && btn.click());
        const short = (t, n) => { const w = String(t || '').replace(/[^\p{L}\p{N}\s%!؟?.,،]/gu, '').split(/\s+/).filter(Boolean); return w.slice(0, n).join(' '); };
        const slides = it.cards?.length
          ? it.cards.map((c, i) => ({ headline: c.headline, sub: c.body, cta: i === it.cards.length - 1 ? it.cta : '', prompt: c.visual, bg: c.bgUrl || '' }))
          : [{ headline: short(it.hook, 9), sub: '', cta: short(it.cta, 4), prompt: it.imagePrompt || it.visual }];
        return designer({ aspect, productId: prod?.id || '', slides, from: { batch: bt.id, item: it.id }, auto: !it.image, onSave: async (items) => {
          try {
            const body = { image: { url: items[0].url, id: items[0].id } };
            if (it.cards?.length) body.cards = it.cards.map((c, i) => ({ ...c, image: items[i] ? { url: items[i].url, id: items[i].id } : c.image }));
            replace(await api(url(it), { method: 'PATCH', body }));
          } catch (err) { toast(err.message, true); }
        } });
      }
    }));
  });
}
// Voice-over script writer: the owner picks the product/service and a few options.
function scriptModal(onDone) {
  const b = S.brand;
  const o = { productId: '', goal: 'ad', seconds: 30, dialect: b.fields?.languages?.value?.includes('دارج') ? 'darija' : 'msa', tone: '', cta: b.fields?.cta?.value || '', notes: '' };
  const DIA = S.opts?.DIALECTS || { msa: 'العربية الفصحى', darija: 'الدارجة المغربية', gulf: 'الخليجية', egyptian: 'المصرية', fr: 'الفرنسية', en: 'الإنجليزية' };
  modal(`<h2>سكريبت التعليق الصوتي</h2><p class="muted sm mt8">اختر المنتج أو الخدمة والخيارات، والذكاء الاصطناعي يكتب نصاً جاهزاً للقراءة بالمدة المطلوبة.</p>
    <span class="lbl">عن ماذا؟</span><div class="sel"><button class="sel-btn" id="sprod" data-menu><span class="lab">البراند بشكل عام</span>${ic('chev')}</button></div>
    <span class="lbl">الهدف</span><div class="opts" data-opts="goal">${[['ad', 'إعلان'], ['intro', 'تعريف'], ['offer', 'عرض خاص'], ['explainer', 'شرح الفوائد'], ['story', 'قصة قصيرة'], ['testimonial', 'تجربة عميل']].map(([k, l]) => `<button class="opt ${o.goal === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <span class="lbl">المدة</span><div class="opts" data-opts="seconds">${[15, 30, 45, 60].map((n) => `<button class="opt ${o.seconds === n ? 'on' : ''}" data-k="${n}">${n} ث</button>`).join('')}</div>
    <span class="lbl">اللهجة</span><div class="opts" data-opts="dialect">${Object.entries(DIA).map(([k, l]) => `<button class="opt ${o.dialect === k ? 'on' : ''}" data-k="${k}">${esc(String(l).split(' (')[0])}</button>`).join('')}</div>
    <div class="grid c2" style="gap:12px"><div><label class="lbl">النبرة (اختياري)</label><input class="field" id="stone" placeholder="${esc(b.fields?.tone?.value || 'دافئة وواثقة')}"></div><div><label class="lbl">الدعوة للإجراء</label><input class="field" id="scta" value="${esc(o.cta)}" placeholder="اطلب الآن عبر الرابط"></div></div>
    <label class="lbl">ملاحظات (اختياري)</label><textarea class="field" id="snotes" data-mic rows="2" placeholder="مثلاً: نذكر التوصيل المجاني، ونخاطب الأمهات"></textarea>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="sgo" data-busy="يكتب…">${ic('sparkle')}اكتب السكريبت</button></div>`, (m) => {
    m.style.maxWidth = '640px';
    bindOpts(m, o);
    $('[data-x]', m).onclick = closeModal;
    $('#sprod', m).onclick = (e) => openMenu(e.currentTarget, [{ label: 'البراند بشكل عام', selected: !o.productId, onClick: () => { o.productId = ''; $('#sprod .lab', m).textContent = 'البراند بشكل عام'; } }, ...b.products.map((p) => ({ label: p.name, desc: [p.kind === 'service' ? 'خدمة' : 'منتج', p.price].filter(Boolean).join(' · '), selected: o.productId === p.id, onClick: () => { o.productId = p.id; $('#sprod .lab', m).textContent = p.name; } }))]);
    $('#sgo', m).onclick = () => busy($('#sgo', m), async () => {
      try { const r = await api(`/api/brands/${b.id}/voice/script`, { method: 'POST', body: { ...o, seconds: Number(o.seconds), tone: $('#stone', m).value, cta: $('#scta', m).value, notes: $('#snotes', m).value, ai: aiOf('text') } }); closeModal(); onDone(r); toast('السكريبت جاهز · راجعه ثم اضغط «اقترح لي الأنسب» لاختيار الصوت'); } catch (err) { toast(err.message, true); }
    });
  });
}

// Carousel: edit every slide in one place (text, visual idea, order, add / remove).
function cardsModal(it, onSave) {
  let cards = (it.cards || []).map((c) => ({ ...c }));
  const draw = (m) => {
    $('#cmlist', m).innerHTML = cards.map((c, i) => `<div class="inset cm" data-i="${i}"><div class="flex"><b class="sm grow">الشريحة ${i + 1}${i === 0 ? ' · الغلاف' : i === cards.length - 1 ? ' · الدعوة للإجراء' : ''}</b>
      <button class="btn grey icon sm" data-up aria-label="أعلى" ${i ? '' : 'disabled'}>↑</button><button class="btn grey icon sm" data-down aria-label="أسفل" ${i < cards.length - 1 ? '' : 'disabled'}>↓</button><button class="btn grey icon sm" data-rm aria-label="حذف" ${cards.length > 2 ? '' : 'disabled'}>${ic('trash')}</button></div>
      <input class="field mt8" data-f="headline" value="${esc(c.headline)}" placeholder="العنوان على الشريحة">
      <textarea class="field mt8" data-f="body" rows="2" placeholder="نص داعم (اختياري)">${esc(c.body || '')}</textarea>
      <textarea class="field mt8" data-f="visual" rows="2" data-enhance="image" placeholder="ماذا تُظهر صورة هذه الشريحة؟">${esc(c.visual || '')}</textarea></div>`).join('');
    enhancePrompts(m);
    $$('[data-i]', m).forEach((row) => {
      const i = Number(row.dataset.i);
      $$('[data-f]', row).forEach((f) => (f.oninput = () => (cards[i][f.dataset.f] = f.value)));
      $('[data-up]', row).onclick = () => { [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]]; draw(m); };
      $('[data-down]', row).onclick = () => { [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]]; draw(m); };
      $('[data-rm]', row).onclick = () => { cards.splice(i, 1); draw(m); };
    });
  };
  modal(`<h2>شرائح الكاروسيل</h2><p class="muted sm mt8">كل الشرائح في مكان واحد: عدّل النص، فكرة الصورة، والترتيب. بعد الحفظ اضغط «صمّم الشرائح».</p>
    <div id="cmlist" class="stack mt12" style="gap:10px"></div>
    <button class="btn ghost sm mt12" id="cmadd">${ic('plus')}أضف شريحة</button>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="cms" data-busy="يحفظ…">${ic('check')}حفظ الشرائح</button></div>`, (m) => {
    m.style.maxWidth = '720px';
    draw(m);
    $('[data-x]', m).onclick = closeModal;
    $('#cmadd', m).onclick = () => { if (cards.length >= 10) return toast('حتى 10 شرائح', true); cards.splice(cards.length - 1, 0, { headline: '', body: '', visual: '' }); draw(m); };
    $('#cms', m).onclick = () => busy($('#cms', m), async () => { try { await onSave(cards); closeModal(); toast('حُفظت الشرائح'); } catch (err) { toast(err.message, true); } });
  });
}
function monthOptions() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 3; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push([`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`, x.toLocaleDateString('ar-MA', { month: 'long', year: 'numeric' })]);
  }
  return out;
}
async function drawPlan() {
  const pf = S.planForm;
  const months = monthOptions();
  if (!pf.month) pf.month = months[0][0];
  const r = await api(`/api/brands/${S.brand.id}/plan${S.plan?.id ? '?month=' + S.plan.id : ''}`);
  S.plan = r.plan; S.planMonths = r.months;
  const o = S.opts;
  const plan = S.plan;
  let cal = '';
  if (plan) {
    const [y, m] = plan.id.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
    const days = new Date(y, m, 0).getDate();
    const byDate = {};
    for (const d of plan.days) (byDate[d.date] = byDate[d.date] || []).push(d);
    const occ = Object.fromEntries((plan.occasions || []).map((x) => [x.date, x.name]));
    const cells = [];
    for (let i = 0; i < first; i++) cells.push('<div class="cd blank"></div>');
    for (let d = 1; d <= days; d++) {
      const key = `${plan.id}-${String(d).padStart(2, '0')}`;
      cells.push(`<div class="cd"><div class="flex"><b class="xs tnum">${d}</b>${occ[key] ? `<span class="occ" title="${esc(occ[key])}">${esc(occ[key])}</span>` : ''}</div>
        ${(byDate[key] || []).map((x) => `<button class="ci" data-pd="${x.id}" title="${esc(x.idea)}"><span class="pf sm">${PLAT_IC[x.platform] || '•'}</span><span>${esc(x.idea)}</span></button>`).join('')}</div>`);
    }
    while (cells.length % 7) cells.push('<div class="cd blank"></div>');
    cal = `<div class="card mt16"><div class="card-h"><h3>${esc(months.find((x) => x[0] === plan.id)?.[1] || plan.id)}</h3><div class="end"><span class="muted xs">${plan.days.length} منشور · ${esc(plan.model)}</span></div></div>
      <p class="sm">${esc(plan.strategy)}</p>${plan.pillars.length ? `<div class="flex wrap mt8">${plan.pillars.map((x) => chip(x, 'vi', false)).join('')}</div>` : ''}
      <div class="cal mt16">${['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((x) => `<div class="cw">${x}</div>`).join('')}${cells.join('')}</div>
      <p class="hint mt12">اضغط على أي فكرة لتحويلها إلى محتوى جاهز.</p></div>`;
  }
  await loadModels('text').catch(() => null);
  const v = view(`<div class="card"><div class="card-h"><h3>خطة شهرية بالذكاء الاصطناعي</h3>${S.planMonths.length ? `<div class="end"><span class="muted xs">خطط محفوظة:</span>${S.planMonths.map((x) => `<button class="btn ${plan?.id === x ? 'primary' : 'grey'} sm" data-pm="${x}">${x}</button>`).join('')}</div>` : ''}</div>
    <div class="grid c2" style="gap:12px">
      <div><span class="lbl" style="margin-top:0">الشهر</span><div class="opts" data-opts="month">${months.map(([k, l]) => `<button class="opt ${pf.month === k ? 'on' : ''}" data-k="${k}">${esc(l)}</button>`).join('')}</div></div>
      <div><span class="lbl" style="margin-top:0">منشورات في الأسبوع</span><div class="opts" data-opts="perWeek">${[2, 3, 4, 5, 7, 10, 14].map((n) => `<button class="opt ${pf.perWeek === n ? 'on' : ''}" data-k="${n}">${n}</button>`).join('')}</div></div>
    </div>
    <span class="lbl">المنصات</span>${optsRow('platforms', o.PLATFORMS, pf.platforms, true)}
    <div class="grid c2" style="gap:12px"><div><span class="lbl">الهدف</span>${optsRow('goal', o.GOALS, pf.goal)}</div><div><span class="lbl">اللغة</span>${optsRow('dialect', o.DIALECTS, pf.dialect)}</div></div>
    <div class="flex mt16"><div style="min-width:260px">${pickerHTML('text')}</div><span class="grow"></span><button class="btn primary" id="pgo" data-busy="يخطط… قد يستغرق دقيقة">${ic('calendar')}${plan && plan.id === pf.month ? 'إعادة بناء الخطة' : 'بناء الخطة'}</button></div>
  </div>${cal}`);
  bindOpts(v, pf, ['platforms']);
  bindPicker(v, () => drawPlan());
  $$('[data-opts="perWeek"] .opt', v).forEach((x) => x.addEventListener('click', () => (pf.perWeek = Number(x.dataset.k))));
  $$('[data-pm]', v).forEach((x) => (x.onclick = () => { S.plan = { id: x.dataset.pm }; drawPlan(); }));
  $('#pgo', v).onclick = (e) => busy(e.currentTarget, async () => {
    try { S.plan = await api(`/api/brands/${S.brand.id}/plan`, { method: 'POST', body: { ...pf, ai: aiOf('text') } }); S.ov = null; drawPlan(); toast(`خطة ${S.plan.days.length} منشور جاهزة`); } catch (err) { toast(err.message, true); }
  });
  $$('[data-pd]', v).forEach((x) => (x.onclick = () => {
    const d = plan.days.find((y) => y.id === x.dataset.pd);
    modal(`<h2>${esc(d.date)} · ${esc(o.PLATFORMS[d.platform] || d.platform)}</h2>
      <div class="flex wrap mt8">${chip(o.TYPES[d.type]?.split(' (')[0] || d.type, '', false)}${d.pillar ? chip(d.pillar, 'vi', false) : ''}${d.occasion ? chip(d.occasion, 'am', false) : ''}</div>
      <p class="mt12">${esc(d.idea)}</p>
      <div class="foot"><button class="btn ghost" data-x>إغلاق</button><button class="btn primary" id="pw">${ic('sparkle')}اكتب هذا المحتوى</button></div>`, (m) => {
      $('[data-x]', m).onclick = closeModal;
      $('#pw').onclick = () => {
        closeModal();
        Object.assign(S.form, { platforms: [d.platform], type: d.type, idea: d.idea, occasion: d.occasion || '', count: 1, dialect: plan.params.dialect, goal: plan.params.goal });
        S.ctab = 'new'; PAGES.create();
      };
    });
  }));
}

// ---------- studio (images) ----------
const STYLE_L = { none: 'بدون', photo: 'تصوير منتج', studio: 'استوديو', lifestyle: 'لايف ستايل', flat: 'رسم مسطّح', '3d': 'ثلاثي الأبعاد', minimal: 'مينيمال' };
PAGES.studio = async () => {
  if (needBrand()) return header();
  header();
  if (!S.prov) await loadProviders().catch(() => null);
  if (S.stab === 'video') return drawVideo();
  await loadModels('image').catch(() => null);
  if (!S.mcache.image?.models.length) {
    view(`${studioTabs()}<div class="empty"><span class="ic">${ic('studio')}</span><h3>اربط مزوّد صور</h3><p>استوديو الصور يعمل بمفتاحك: Gemini (Nano Banana) أو OpenAI (GPT Image) أو xAI (Grok).</p><button class="btn primary" id="gp">${ic('plug')}المفاتيح والمزوّدون</button></div>`);
    $('#gp').onclick = () => go('providers');
    return;
  }
  if (!S.images) S.images = (await api(`/api/brands/${S.brand.id}/images`)).images;
  drawStudio();
};
function drawStudio() {
  const g = S.img;
  const b = S.brand;
  g.kind = g.kind || 'post'; g.slides = g.slides || 5; g.aspect = g.aspect || '4:5';
  const prods = b.products.filter((p) => p.kind !== 'service');
  const v = view(`${studioTabs()}<div class="grid c12">
    <div class="card s5"><div class="card-h"><h3>تصميم جديد</h3><div class="end"><span class="muted xs">خلفية بالذكاء الاصطناعي + نصوصك وشعارك بخط البراند</span></div></div>
      <span class="lbl" style="margin-top:0">نوع التصميم</span><div class="opts" data-opts="kind">${[['post', 'منشور'], ['carousel', 'كاروسيل'], ['story', 'ستوري'], ['ad', 'إعلان']].map(([k, l]) => `<button class="opt ${g.kind === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      ${g.kind === 'carousel' ? `<span class="lbl">عدد الشرائح</span><div class="opts" data-opts="slides">${[3, 4, 5, 6, 7, 8, 10].map((n) => `<button class="opt ${g.slides === n ? 'on' : ''}" data-k="${n}">${n}</button>`).join('')}</div>` : ''}
      ${g.kind !== 'story' ? `<span class="lbl">المقاس</span>${pills('aspect', [['1:1', 'مربع 1:1'], ['4:5', 'عمودي 4:5'], ['16:9', 'عرضي 16:9']], g.aspect)}` : ''}
      ${prods.length ? `<span class="lbl">المنتج في التصميم</span><div class="sel"><button class="sel-btn" id="iprod" data-menu><span class="lab">${(() => { const p = prods.find((x) => x.id === g.productId); return p ? `${p.photo ? `<img src="${esc(p.photo)}" alt="" style="width:22px;height:22px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-inline-end:6px">` : ''}${esc(p.name)}` : 'بدون منتج محدد'; })()}</span>${ic('chev')}</button></div>` : ''}
      <span class="lbl">الفكرة</span>
      <textarea class="field" id="ip" data-mic data-enhance="content" rows="4" maxlength="2000" placeholder="مثلاً: عرض الجمعة البيضاء على قناع الكولاجين، نركّز على النتيجة الصباحية">${esc(g.prompt)}</textarea>
      <p class="hint mt8">الذكاء الاصطناعي يكتب العنوان والنص والدعوة للإجراء ويصمم الخلفية، ثم تعدّل كل شيء في المصمم قبل الحفظ.</p>
      <div class="flex mt16" style="justify-content:flex-end"><button class="btn ghost" id="iblank">${ic('edit')}مصمم فارغ</button><button class="btn primary" id="igo" data-busy="يحضّر التصميم…">${ic('sparkle')}صمّم</button></div>
    </div>
    <div class="card s7"><div class="card-h"><h3>معرض ${esc(b.name)}</h3><div class="end"><span class="muted xs">${S.images.length}</span></div></div>
      ${S.images.length ? `<div class="gallery">${S.images.map((x) => `<figure data-im="${x.id}"><img src="${esc(x.url)}" alt="" loading="lazy" style="aspect-ratio:${String(x.aspect || '1:1').replace(':', '/')}">
        <figcaption>${x.kind === 'design' ? chip(x.design?.total > 1 ? `تصميم ${x.design.index + 1}/${x.design.total}` : 'تصميم', 'vi', false) : x.version ? `<span class="chip vi" title="${esc(x.edit || '')}">v${x.version}</span>` : chip('خلفية', '', false)}<span class="xs grow" title="${esc(x.design?.slide?.headline || x.prompt)}">${esc(x.design?.slide?.headline || (x.edit ? 'تعديل: ' + x.edit : x.prompt))}</span>
        <a class="btn grey icon sm" href="${esc(x.url)}" download target="_blank" rel="noopener" aria-label="تحميل">${ic('download')}</a>
        <button class="btn grey icon sm" data-des="${x.id}" aria-label="${x.kind === 'design' ? 'عدّل التصميم' : 'استعمل في تصميم'}" title="${x.kind === 'design' ? 'عدّل التصميم' : 'استعمل في تصميم'}">${ic('studio')}</button>
        ${x.kind !== 'design' ? `<button class="btn grey icon sm" data-iedit="${x.id}" aria-label="تعديل الصورة" title="تعديل الصورة بالذكاء الاصطناعي">${ic('edit')}</button>` : ''}
        <button class="btn grey icon sm" data-sch="${x.id}" aria-label="جدولة" title="جدولة">${ic('calendar')}</button>
        <button class="btn grey icon sm" data-anim="${x.id}" aria-label="حوّلها إلى فيديو" title="حوّلها إلى فيديو">${ic('play')}</button>
        <button class="btn grey icon sm" data-del="${x.id}" aria-label="حذف">${ic('trash')}</button></figcaption></figure>`).join('')}</div>`
      : `<div class="empty" style="padding:28px"><span class="ic">${ic('studio')}</span><h3>لا توجد تصاميم بعد</h3><p>اكتب فكرة واضغط «صمّم». يمكنك أيضاً تصميم أي منشور من صفحة النتائج.</p></div>`}
    </div></div>`);
  bindOpts(v, g);
  $$('[data-opts="kind"] .opt', v).forEach((x) => x.addEventListener('click', () => drawStudio()));
  $$('[data-opts="slides"] .opt', v).forEach((x) => x.addEventListener('click', () => (g.slides = Number(x.dataset.k))));
  $('#ip', v).oninput = (e) => (g.prompt = e.target.value);
  $('#iprod', v) && ($('#iprod', v).onclick = () => openMenu($('#iprod', v), [{ label: 'بدون منتج محدد', selected: !g.productId, onClick: () => { g.productId = ''; drawStudio(); } }, ...prods.map((p) => ({ label: p.name, desc: p.photo ? (p.price || 'صورة المنتج جاهزة') : 'ينقصه صورة', selected: g.productId === p.id, onClick: () => { g.productId = p.id; drawStudio(); } }))]));
  const aspect = () => (g.kind === 'story' ? '9:16' : g.aspect);
  const n = () => (g.kind === 'carousel' ? g.slides : 1);
  const onSave = (items) => { S.images = [...items, ...(S.images || [])]; S.ov = null; drawStudio(); };
  $('#iblank', v).onclick = () => designer({ aspect: aspect(), productId: g.productId, slides: Array.from({ length: n() }, () => ({ prompt: g.prompt })), onSave, idea: g.prompt });
  $('#igo', v).onclick = (e) => busy(e.currentTarget, async () => {
    if (!g.prompt.trim()) return toast('اكتب الفكرة أولاً', true);
    const sp = prods.find((x) => x.id === g.productId);
    if (sp && !sp.photo) return productPhotoModal(sp, () => drawStudio());
    try {
      const r = await api(`/api/brands/${b.id}/design/copy`, { method: 'POST', body: { idea: `${g.kind === 'ad' ? 'Paid ad. ' : ''}${g.prompt}`, productId: g.productId, slides: n(), ai: aiOf('text') } });
      designer({ aspect: aspect(), productId: g.productId, slides: r.slides, onSave, idea: g.prompt, auto: true, template: g.kind === 'story' ? 'bottom' : g.kind === 'ad' ? 'split' : 'bottom' });
    } catch (err) { toast(err.message, true); }
  });
  $$('[data-des]', v).forEach((x) => (x.onclick = () => {
    const im = S.images.find((y) => y.id === x.dataset.des);
    if (im.kind === 'design' && im.design) { const dd = im.design; designer({ aspect: dd.aspect, template: dd.template, productId: dd.productId, slides: [dd.slide], onSave }); }
    else designer({ aspect: ['1:1', '4:5', '9:16', '16:9'].includes(im.aspect) ? im.aspect : '4:5', productId: im.productId, slides: [{ prompt: im.prompt, bg: im.url }], onSave });
  }));
  $$('[data-iedit]', v).forEach((x) => (x.onclick = () => editModal('image', S.images.find((y) => y.id === x.dataset.iedit))));
  $$('[data-sch]', v).forEach((x) => (x.onclick = () => { const im = S.images.find((y) => y.id === x.dataset.sch); scheduleModal({ title: (im.design?.slide?.headline || im.prompt || '').slice(0, 80), media: { type: 'image', url: im.url, aspect: im.aspect }, source: { kind: 'image', id: im.id } }); }));
  $$('[data-anim]', v).forEach((x) => (x.onclick = () => { const im = S.images.find((y) => y.id === x.dataset.anim); Object.assign(S.vid, { imageUrl: '', pendingImage: im.url, aspect: im.aspect === '9:16' || im.aspect === '4:5' ? '9:16' : '16:9', prompt: S.vid.prompt || im.prompt || '' }); S.stab = 'video'; PAGES.studio(); }));
  $$('[data-del]', v).forEach((x) => (x.onclick = async () => {
    if (!(await confirmBox('حذف الصورة؟', 'ستُحذف من المعرض والتخزين.', 'حذف', true))) return;
    try { await api(`/api/brands/${b.id}/images/${x.dataset.del}`, { method: 'DELETE' }); S.images = S.images.filter((y) => y.id !== x.dataset.del); drawStudio(); } catch (err) { toast(err.message, true); }
  }));
}

function studioTabs() {
  return `<div class="stabs" role="tablist">${[['image', 'studio', 'تصميم', 'منشورات، كاروسيل، ستوري، إعلانات'], ['video', 'play', 'فيديو', 'ريلز وإعلانات فيديو بالصوت']].map(([k, i, t, d]) => `<button class="stab ${S.stab === k ? 'on' : ''}" data-stab="${k}" role="tab" aria-selected="${S.stab === k}">${ic(i)}<span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-stab]'); if (!b) return; S.stab = b.dataset.stab; PAGES.studio(); });

function videoDurations(model) {
  const m = String(model || '').toLowerCase();
  if (/sora/.test(m)) return [4, 8, 12];
  if (/veo-2/.test(m)) return [5, 6, 7, 8];
  if (/veo/.test(m)) return [4, 6, 8];
  return [4, 6, 8];
}
let videoTimer = null;
async function drawVideo() {
  const data = await loadModels('video').catch(() => ({ models: [] }));
  if (!S.videos) S.videos = (await api(`/api/brands/${S.brand.id}/videos`)).videos;
  const g = S.vid;
  const usable = data.models.filter((m) => !m.soon);
  const cur = aiOf('video');
  const model = cur.provider === 'auto' ? (data.current?.model || usable[0]?.model) : cur.model;
  const secs = videoDurations(model);
  if (!secs.includes(g.seconds)) g.seconds = secs[secs.length - 1];
  const fmtT = (t) => { const s2 = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000)); return s2 < 60 ? `${s2} ث` : `${Math.floor(s2 / 60)} د ${s2 % 60} ث`; };
  const v = view(`${studioTabs()}<div class="grid c12">
    <div class="card s5"><div class="card-h"><h3>فيديو جديد</h3></div>
      ${usable.length ? '' : `<div class="inset sm mb16">لا يوجد نموذج فيديو جاهز. اربط Hakim AI Gateway (Veo) أو مفتاح Gemini أو OpenAI (Sora). <button class="btn grey sm mt8" data-go="providers">${ic('plug')}المزوّدون</button></div>`}
      <span class="lbl" style="margin-top:0">${KIND_L.video}</span>${pickerHTML('video')}
      <span class="lbl">صورة البداية <span class="muted xs" style="font-weight:400">· اختياري: الفيديو يبدأ منها ويحرّكها</span></span>
      ${g.imageUrl ? '' : `<div class="grid c2" style="gap:10px"><label class="drop" style="display:block;padding:14px">${ic('upload')}<div class="sm mt8"><b>ارفع صورة</b></div><div class="xs">منتج، شخص، مشهد · PNG / JPG / WEBP</div><input type="file" id="vimgf" accept="image/png,image/jpeg,image/webp" hidden></label>
        <button class="drop pick" id="vgal" style="display:block;padding:14px" type="button">${ic('studio')}<div class="sm mt8"><b>من المعرض أو المنتجات</b></div><div class="xs">تصميم، صورة أو صورة منتج</div></button></div>
        ${S.brand.logo?.url ? `<button class="btn ghost sm mt8" id="vlogo" type="button">${ic('sparkle')}ابدأ الفيديو بالشعار (ظهور الشعار متحرّكاً)</button>` : ''}`}
      <label class="flex sm mt12" style="cursor:pointer"><input type="checkbox" class="check" id="vcol" ${g.useColors !== false ? 'checked' : ''}>ألوان البراند في المشهد ${(S.brand.visual?.colors || []).map((c) => `<span class="dot" style="background:${c}"></span>`).join('')}</label>
      ${g.imageUrl ? `<div class="flex mt12 inset" style="padding:8px"><img src="${esc(g.imageUrl)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px"><span class="sm grow">${g.logoStart ? 'البداية: الشعار يظهر متحرّكاً' : 'صورة البداية: سيتم تحريكها'}</span><button class="btn grey icon sm" id="vnoimg" aria-label="إزالة">${ic('x')}</button></div>` : ''}
      <label class="lbl">وصف المشهد</label>
      <textarea class="field" id="vp" data-mic data-enhance="video" rows="4" maxlength="3000" placeholder="مثلاً: لقطة سينمائية لعائلة مغربية في صالون تقليدي، الأب يجرّب نظارات جديدة ويبتسم، الكاميرا تقترب ببطء، إضاءة دافئة">${esc(g.prompt)}</textarea>
      <label class="lbl">التعليق الصوتي / الحوار (اختياري)</label>
      <textarea class="field" id="vvo" data-mic data-enhance="voice" rows="2" maxlength="500" placeholder="الجملة التي تُقال في الفيديو، مثلاً: نظارتك الجديدة بنص الثمن، غير هاد الجمعة!">${esc(g.voiceover)}</textarea>
      <div class="grid c2 mt8" style="gap:12px">
        <div><span class="lbl">المدة</span><div class="opts" data-opts="seconds">${secs.map((n) => `<button class="opt ${g.seconds === n ? 'on' : ''}" data-k="${n}">${n} ث</button>`).join('')}</div></div>
        <div><span class="lbl">المقاس</span><div class="opts" data-opts="aspect"><button class="opt ${g.aspect === '9:16' ? 'on' : ''}" data-k="9:16">9:16 ريلز</button><button class="opt ${g.aspect === '16:9' ? 'on' : ''}" data-k="16:9">16:9</button></div></div>
      </div>
      <div class="grid c2" style="gap:12px">
        <div><span class="lbl">الجودة</span><div class="opts" data-opts="resolution"><button class="opt ${g.resolution === '720p' ? 'on' : ''}" data-k="720p">720p</button><button class="opt ${g.resolution === '1080p' ? 'on' : ''}" data-k="1080p">1080p</button></div></div>
        <div><span class="lbl">الصوت</span><label class="flex sm" style="height:36px;cursor:pointer"><input type="checkbox" class="check" id="vaud" ${g.audio ? 'checked' : ''}>صوت ومؤثرات داخل الفيديو</label></div>
      </div>
      <p class="hint mt12">كل مقطع حتى ${secs[secs.length - 1]} ثوانٍ حسب النموذج. التوليد يأخذ عادة 1 إلى 4 دقائق، ويمكنك مغادرة الصفحة.</p>
      <div class="flex mt16" style="justify-content:flex-end"><button class="btn primary" id="vgo2" data-busy="يبدأ…" ${usable.length ? '' : 'disabled'}>${ic('play')}توليد الفيديو</button></div>
    </div>
    <div class="card s7"><div class="card-h"><h3>فيديوهات ${esc(S.brand.name)}</h3><div class="end"><span class="muted xs">${S.videos.length}</span></div></div>
      ${S.videos.length ? `<div class="gallery">${S.videos.map((x) => `<figure data-vd="${x.id}">
        ${x.status === 'completed' ? `<video src="${esc(x.url)}" controls playsinline preload="metadata" style="width:100%;display:block;aspect-ratio:${x.aspect.replace(':', '/')};background:#000"></video>`
          : x.status === 'failed' ? `<div class="inset sm" style="margin:8px;color:var(--t-ro)">${esc(x.error || 'فشل التوليد')}</div>`
          : `<div style="aspect-ratio:${x.aspect.replace(':', '/')};display:grid;place-items:center;background:var(--bg-hover)"><div style="text-align:center"><span class="spin" style="width:22px;height:22px"></span><div class="xs muted mt8">يُولَّد… ${fmtT(x.createdAt)}${x.progress ? ` · ${x.progress}%` : ''}</div></div></div>`}
        <figcaption>${x.version ? `<span class="chip vi" title="${esc(x.edit || '')}">v${x.version}</span>` : ''}<span class="xs grow" title="${esc(x.edit ? 'تعديل: ' + x.edit : x.prompt)}">${esc(x.seconds + ' ث · ' + x.model)}</span>
          ${x.status === 'completed' ? `<button class="btn grey icon sm" data-vedit="${x.id}" aria-label="نسخة معدّلة" title="نسخة معدّلة">${ic('edit')}</button>` : ''}
          ${x.url ? `<a class="btn grey icon sm" href="${esc(x.url)}" download target="_blank" rel="noopener" aria-label="تحميل">${ic('download')}</a>` : ''}
          ${x.status === 'completed' ? `<button class="btn primary sm" data-vsch="${x.id}" title="أضفه للتقويم">${ic('calendar')}جدولة</button>` : ''}
          <button class="btn grey icon sm" data-vre="${x.id}" aria-label="إعادة استعمال">${ic('refresh')}</button>
          <button class="btn grey icon sm" data-vdel="${x.id}" aria-label="حذف">${ic('trash')}</button></figcaption></figure>`).join('')}</div>`
      : `<div class="empty" style="padding:28px"><span class="ic">${ic('play')}</span><h3>لا توجد فيديوهات بعد</h3><p>اكتب وصف المشهد، أو اضغط ▷ على أي صورة في معرض الصور لتحريكها.</p></div>`}
    </div></div>`);
  bindOpts(v, g);
  $$('[data-opts="seconds"] .opt', v).forEach((x) => x.addEventListener('click', () => (g.seconds = Number(x.dataset.k))));
  bindPicker(v, () => drawVideo());
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
  $('#vp', v).oninput = (e) => (g.prompt = e.target.value);
  $('#vvo', v).oninput = (e) => (g.voiceover = e.target.value);
  $('#vaud', v).onchange = (e) => (g.audio = e.target.checked);
  $('#vnoimg', v) && ($('#vnoimg', v).onclick = () => { g.imageUrl = ''; g.logoStart = false; g.useProduct = false; drawVideo(); });
  // Any image format → JPEG (video models accept only PNG/JPEG)
  const setStart = async (src, z, logo = false) => {
    z && z.classList.add('over');
    try { g.imageUrl = await uploadData(await toJpeg(src)); g.logoStart = logo; drawVideo(); } catch (err) { toast(err.message, true); z && z.classList.remove('over'); }
  };
  if (g.pendingImage) { const u = g.pendingImage; g.pendingImage = ''; setStart(u); }
  $('#vimgf', v) && ($('#vimgf', v).onchange = (e) => setStart(e.target.files[0], e.target.closest('.drop')));
  $('#vlogo', v) && ($('#vlogo', v).onclick = () => setStart(S.brand.logo.url, null, true));
  $('#vcol', v) && ($('#vcol', v).onchange = (e) => (g.useColors = e.target.checked));
  $('#vgal', v) && ($('#vgal', v).onclick = async (e) => {
    if (!S.images) { try { S.images = (await api(`/api/brands/${S.brand.id}/images`)).images; } catch { S.images = []; } }
    const items = [...S.brand.products.filter((p) => p.photo).map((p) => ({ label: `منتج: ${p.name}`, onClick: () => { g.useProduct = true; setStart(p.photo); } })), ...S.images.slice(0, 20).map((im) => ({ label: (im.design?.slide?.headline || im.prompt || 'صورة').slice(0, 50), desc: im.aspect, onClick: () => { g.aspect = im.aspect === '16:9' ? '16:9' : '9:16'; setStart(im.url); } }))];
    if (!items.length) return toast('لا توجد صور بعد في المعرض أو المنتجات', true);
    openMenu(e.currentTarget, items);
  });
  $('#vgo2', v).onclick = (e) => busy(e.currentTarget, async () => {
    if (!g.prompt.trim()) return toast('اكتب وصف المشهد', true);
    try {
      const job = await api(`/api/brands/${S.brand.id}/videos`, { method: 'POST', body: { ...g, ai: aiOf('video') } });
      S.videos = [job, ...S.videos]; S.ov = null;
      toast(`بدأ التوليد · ${job.model} · ${job.seconds} ث`);
      if (job.fallback) fallbackNote({ fallback: job.fallback, model: job.model });
      drawVideo();
    } catch (err) { toast(err.message, true); }
  });
  $$('[data-vedit]', v).forEach((x) => (x.onclick = () => editModal('video', S.videos.find((y) => y.id === x.dataset.vedit))));
  $$('[data-vsch]', v).forEach((x) => (x.onclick = () => { const j = S.videos.find((y) => y.id === x.dataset.vsch); scheduleModal({ platforms: j.aspect === '9:16' ? ['instagram', 'tiktok'] : ['youtube', 'facebook'], title: j.prompt.slice(0, 80), caption: j.voiceover || '', media: { type: 'video', url: j.url, aspect: j.aspect }, source: { kind: 'video', id: j.id } }); }));
  $$('[data-vre]', v).forEach((x) => (x.onclick = () => { const j = S.videos.find((y) => y.id === x.dataset.vre); Object.assign(g, { prompt: j.prompt, voiceover: j.voiceover || '', aspect: j.aspect, seconds: j.seconds, imageUrl: j.fromImage || '' }); drawVideo(); }));
  $$('[data-vdel]', v).forEach((x) => (x.onclick = async () => {
    if (!(await confirmBox('حذف الفيديو؟', 'سيُحذف من المعرض والتخزين.', 'حذف', true))) return;
    try { await api(`/api/brands/${S.brand.id}/videos/${x.dataset.vdel}`, { method: 'DELETE' }); S.videos = S.videos.filter((y) => y.id !== x.dataset.vdel); drawVideo(); } catch (err) { toast(err.message, true); }
  }));
  // poll running jobs while this tab is open
  clearTimeout(videoTimer);
  if (S.videos.some((x) => x.status === 'processing')) {
    const brandId = S.brand.id;
    const tick = async () => {
      if (S.page !== 'studio' || S.stab !== 'video' || S.brand?.id !== brandId) return;
      let changed = false;
      for (const j of S.videos.filter((x) => x.status === 'processing')) {
        try { const n = await api(`/api/brands/${brandId}/videos/${j.id}`); if (n.status !== 'processing') { changed = true; toast(n.status === 'completed' ? 'الفيديو جاهز ✓' : `فشل الفيديو: ${n.error}`, n.status !== 'completed'); } Object.assign(j, n); } catch { /* keep polling */ }
      }
      if (document.querySelector('#vp:focus, #vvo:focus') && !changed) { videoTimer = setTimeout(tick, 8000); return; }
      drawVideo();
    };
    videoTimer = setTimeout(tick, 8000);
  }
}


// ---------- voice input (mic on text fields) ----------
const REC = { mr: null, stream: null, chunks: [], timer: null, started: 0 };
async function recStart(onTick) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('المتصفح لا يدعم التسجيل الصوتي');
  REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  REC.mr = new MediaRecorder(REC.stream, mime ? { mimeType: mime } : {});
  REC.chunks = [];
  REC.mr.ondataavailable = (e) => e.data.size && REC.chunks.push(e.data);
  REC.mr.start(250);
  REC.started = Date.now();
  REC.timer = setInterval(() => { const sec = Math.round((Date.now() - REC.started) / 1000); onTick && onTick(sec); if (sec >= 110) recStopBtn?.click(); }, 500);
}
let recStopBtn = null;
function recStop() {
  return new Promise((resolve) => {
    clearInterval(REC.timer);
    if (!REC.mr) return resolve(null);
    REC.mr.onstop = () => {
      REC.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(REC.chunks, { type: REC.mr.mimeType || 'audio/webm' });
      REC.mr = null;
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    };
    REC.mr.stop();
  });
}
async function transcribe(dataUrl) {
  return api('/api/transcribe', { method: 'POST', body: { brandId: S.activeId || null, dataUrl } });
}
// ✨ «حسّن» on every prompt field marked data-enhance="image|video|content|voice|research"
function enhancePrompts(root) {
  $$('[data-enhance]', root).forEach((t) => {
    if (t.dataset.enh) return;
    t.dataset.enh = '1';
    const host = t.parentElement.classList.contains('micwrap') ? t.parentElement : t;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'enh';
    b.title = 'حسّن الوصف بالذكاء الاصطناعي';
    b.innerHTML = `${ic('sparkle')}<span>حسّن</span>`;
    if (host === t) { const w = document.createElement('div'); w.className = 'micwrap'; t.replaceWith(w); w.append(t, b); } else host.append(b);
    b.onclick = async () => {
      if (b.dataset.prev !== undefined) { t.value = b.dataset.prev; delete b.dataset.prev; b.innerHTML = `${ic('sparkle')}<span>حسّن</span>`; t.dispatchEvent(new Event('input', { bubbles: true })); return; }
      if (!t.value.trim()) return toast('اكتب فكرة قصيرة أولاً، ثم اضغط «حسّن»', true);
      b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      try {
        const r = await api(`/api/brands/${S.brand.id}/enhance`, { method: 'POST', body: { text: t.value, kind: t.dataset.enhance } });
        b.dataset.prev = t.value; t.value = r.text; t.dispatchEvent(new Event('input', { bubbles: true }));
        b.innerHTML = `${ic('refresh')}<span>تراجع</span>`; toast('تم تحسين الوصف · تقدر تعدّله أو تتراجع');
      } catch (e) { toast(e.message, true); b.innerHTML = `${ic('sparkle')}<span>حسّن</span>`; }
      b.disabled = false;
    };
  });
}
function enhanceMics(root) {
  setTimeout(() => enhancePrompts(root), 0);
  $$('textarea[data-mic]', root).forEach((t) => {
    if (t.parentElement.classList.contains('micwrap')) return;
    const w = document.createElement('div');
    w.className = 'micwrap';
    t.replaceWith(w);
    w.append(t);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mic';
    b.title = 'تكلّم بدل الكتابة';
    b.innerHTML = ic('voice');
    w.append(b);
    b.onclick = async () => {
      if (REC.mr) {
        recStopBtn = null;
        b.classList.remove('rec');
        b.innerHTML = '<span class="spin"></span>';
        const dataUrl = await recStop();
        try {
          const r = await transcribe(dataUrl);
          t.value = (t.value.trim() ? t.value.trim() + ' ' : '') + r.text;
          t.dispatchEvent(new Event('input', { bubbles: true }));
          toast('تم تحويل الصوت إلى نص');
        } catch (e) { toast(e.message, true); }
        b.innerHTML = ic('voice');
        return;
      }
      try {
        await recStart((sec) => { b.dataset.sec = sec; });
        recStopBtn = b;
        b.classList.add('rec');
        b.innerHTML = '<i></i>';
        toast('يسجّل… اضغط مرة أخرى للإيقاف');
      } catch (e) { toast(e.name === 'NotAllowedError' ? 'اسمح للمتصفح باستعمال الميكروفون' : e.message, true); }
    };
  });
}

// ---------- voice assistant: say what you want, it fills the form and runs it ----------
function waitFor(sel, fn, ms = 6000) {
  const t0 = Date.now();
  const tick = () => { const el = $(sel); if (el && !el.disabled) return fn(el); if (Date.now() - t0 < ms) setTimeout(tick, 150); };
  tick();
}
async function runIntent(r) {
  const a = r.action;
  if (a === 'content') {
    Object.assign(S.form, { idea: r.idea || r.transcript, occasion: '' }, r.platforms?.length ? { platforms: r.platforms } : {}, r.type ? { types: [r.type], type: r.type } : {}, r.goal ? { goal: r.goal } : {}, r.dialect ? { dialect: r.dialect } : {}, r.count ? { count: r.count } : {}, r.productId ? { productId: r.productId } : {});
    S.ctab = 'new'; S.batch = null; go('create'); waitFor('#cgo', (b) => b.click());
  } else if (a === 'plan') {
    Object.assign(S.planForm, r.platforms?.length ? { platforms: r.platforms } : {}, r.goal ? { goal: r.goal } : {}, r.dialect ? { dialect: r.dialect } : {}, r.perWeek ? { perWeek: r.perWeek } : {}, /^\d{4}-\d{2}$/.test(r.month || '') ? { month: r.month } : {});
    S.ctab = 'plan'; go('create'); waitFor('#pgo', (b) => b.click());
  } else if (a === 'image') {
    Object.assign(S.img, { prompt: r.prompt || r.idea || r.transcript }, ['1:1', '4:5', '9:16', '16:9'].includes(r.aspect) ? { aspect: r.aspect } : {});
    S.stab = 'image'; go('studio'); waitFor('#igo', (b) => b.click());
  } else if (a === 'video') {
    Object.assign(S.vid, { prompt: r.prompt || r.idea || r.transcript, voiceover: r.voiceover || '' }, ['9:16', '16:9'].includes(r.aspect) ? { aspect: r.aspect } : {}, r.seconds ? { seconds: r.seconds } : {});
    S.stab = 'video'; go('studio'); waitFor('#vgo2', (b) => b.click());
  } else if (a === 'voice') {
    S.tts.text = r.text || r.idea || r.transcript; go('voice'); waitFor('#vgo', (b) => b.click(), 10000);
  } else if (a === 'schedule') go('calendar');
  else if (a === 'analyze') { S.brainTab = 'analyze'; go('brain'); waitFor('#arun', (b) => b.click()); }
  if (r.reply) toast(r.reply);
}
function assistantModal() {
  modal(`<h2>المساعد</h2><p class="muted sm mt8">قل ما تريد بالدارجة أو الفصحى أو أي لغة، مثلاً: "بغيت 3 بوستات إنستغرام على تخفيضات الجمعة السوداء" أو "دير ليا ريل 8 ثواني لنظارات شمسية".</p>
    <div class="assist-rec"><button class="assist-mic" id="amic" aria-label="سجّل">${ic('voice')}</button><div class="muted sm" id="ast">اضغط وتكلّم</div></div>
    <label class="lbl">أو اكتب طلبك</label><textarea class="field" id="atx" rows="3" placeholder="اكتب أو تكلّم…"></textarea>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="ago" data-busy="يفهم طلبك…">${ic('sparkle')}نفّذ</button></div>`, (m) => {
    $('[data-x]', m).onclick = () => { if (REC.mr) recStop(); closeModal(); };
    const send = () => busy($('#ago'), async () => {
      const text = $('#atx').value.trim();
      if (!text) return toast('قل أو اكتب طلبك', true);
      try { const r = await api('/api/assistant', { method: 'POST', body: { brandId: S.activeId || null, text, ai: aiOf('text') } }); closeModal(); if (!S.brand && ['content', 'plan', 'image', 'video', 'voice', 'analyze'].includes(r.action)) return toast('أنشئ أو اختر براند أولاً', true); runIntent(r); } catch (e) { toast(e.message, true); }
    });
    $('#ago').onclick = send;
    const mic = $('#amic');
    mic.onclick = async () => {
      if (REC.mr) {
        mic.classList.remove('rec'); $('#ast').textContent = 'يحوّل صوتك إلى نص…';
        const dataUrl = await recStop();
        try { const r = await transcribe(dataUrl); $('#atx').value = r.text; $('#ast').textContent = 'فهمت. يرسل الطلب…'; send(); } catch (e) { $('#ast').textContent = e.message; }
        return;
      }
      try { await recStart((sec) => { $('#ast') && ($('#ast').textContent = `يسجّل… ${sec} ث · اضغط للإيقاف والإرسال`); }); recStopBtn = mic; mic.classList.add('rec'); } catch (e) { $('#ast').textContent = e.name === 'NotAllowedError' ? 'اسمح للمتصفح باستعمال الميكروفون' : e.message; }
    };
  });
}

// ---------- schedule (calendar) ----------
const PLAT_L = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', linkedin: 'LinkedIn', pinterest: 'Pinterest', reddit: 'Reddit', threads: 'Threads', snapchat: 'Snapchat', bluesky: 'Bluesky', googlebusiness: 'Google Business', telegram: 'Telegram', whatsapp: 'WhatsApp' };
const SST = { scheduled: ['مجدول (نشر يدوي)', 'vi'], queued: ['سيُنشر تلقائياً', 'sk'], published: ['نُشر', 'em'], manual: ['نشرتُه يدوياً', 'em'], failed: ['فشل النشر', 'ro'], draft: ['بانتظار الموافقة', 'am'], rejected: ['مرفوض', 'ro'] };
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
async function socialState(force) {
  if (!S.brand) return null;
  if (!force && S.social && S.social.brand === S.brand.id) return S.social;
  try { S.social = { ...(await api(`/api/brands/${S.brand.id}/social`)), brand: S.brand.id }; } catch { S.social = { configured: false, accounts: [], brand: S.brand.id }; }
  return S.social;
}
async function socialConnect(platform) {
  try { const r = await api(`/api/brands/${S.brand.id}/social/connect`, { method: 'POST', body: { platform } }); location.href = r.url; } catch (e) { toast(e.message, true); }
}
function accountsModal() {
  const so = S.social || { accounts: [] };
  const has = (p) => so.accounts.filter((a) => a.platform === p);
  modal(`<h2>الحسابات المربوطة · ${esc(S.brand.name)}</h2>
    <p class="muted sm mt8">اضغط «ربط» وسجّل الدخول في المنصة ووافق، ثم ترجع هنا تلقائياً. بعدها تنشر وتجدول من التقويم، وتظهر الإحصائيات في صفحة «الأداء والتعلّم».</p>
    ${!so.configured ? `<div class="inset sm mt12">${ic('plug')} النشر التلقائي يحتاج مفتاح <b>Zernio</b> مرة واحدة (خدمة تربط كل المنصات). أضفه من صفحة المفاتيح والمزوّدون.<div class="flex mt8"><button class="btn primary sm" data-go="providers">${ic('plug')}أضف المفتاح</button></div></div>` : ''}
    ${so.error ? `<p class="xs mt8" style="color:var(--t-ro)">${esc(so.error)}</p>` : ''}
    <div class="rows mt12">${Object.entries(PLAT_L).map(([p, l]) => `<div class="row-i"><div class="t"><b>${l}</b><small>${p === 'whatsapp' ? 'لا يوفّر نشراً تلقائياً للحسابات: انسخ النص والملف من التقويم' : has(p).length ? has(p).map((a) => `<span class="ltr">@${esc(a.username || a.name)}</span>`).join('، ') : 'غير مربوط'}</small></div>
      ${p === 'whatsapp' ? chip('يدوي', '', false) : has(p).length ? `${chip('مربوط', 'em')}<button class="btn grey icon sm" data-dis="${has(p)[0].id}" aria-label="فصل">${ic('trash')}</button>` : `<button class="btn ${so.configured ? 'primary' : 'grey'} sm" data-con="${p}" ${so.configured ? '' : 'disabled'}>${ic('plug')}ربط</button>`}</div>`).join('')}
      <div class="row-i"><div class="t"><b>Quora</b><small>Quora لا يوفر أي طريقة رسمية للنشر من التطبيقات، لذلك النشر عليه يدوي (انسخ النص من التقويم).</small></div>${chip('يدوي', '', false)}</div>
    </div>
    <div class="foot"><button class="btn ghost" data-x>إغلاق</button></div>`, (m) => {
    m.style.maxWidth = '640px';
    $('[data-x]', m).onclick = closeModal;
    $$('[data-go]', m).forEach((x) => (x.onclick = () => { closeModal(); go(x.dataset.go); }));
    $$('[data-con]', m).forEach((x) => (x.onclick = () => busy(x, () => socialConnect(x.dataset.con))));
    $$('[data-dis]', m).forEach((x) => (x.onclick = () => busy(x, async () => { try { S.social = { ...(await api(`/api/brands/${S.brand.id}/social/accounts/${x.dataset.dis}`, { method: 'DELETE' })), brand: S.brand.id }; accountsModal(); } catch (e) { toast(e.message, true); } })));
  });
}
function mediaHTML(m, h = 160) {
  if (!m) return '';
  return m.type === 'video' ? `<video src="${esc(m.url)}" controls playsinline preload="metadata" style="width:100%;max-height:${h}px;background:#000;border-radius:10px"></video>`
    : m.type === 'image' ? `<img src="${esc(m.url)}" alt="" style="width:100%;max-height:${h}px;object-fit:contain;background:var(--bg-surface);border-radius:10px">` : `<audio src="${esc(m.url)}" controls style="width:100%"></audio>`;
}
function scheduleModal(pre = {}, existing = null) {
  if (!S.brand) return toast('اختر براند أولاً', true);
  const d = new Date(Date.now() + 86400000);
  const st = { platforms: pre.platforms?.length ? [...pre.platforms] : ['instagram'] };
  const it = existing || {};
  modal(`<h2>${existing ? 'تعديل الجدولة' : 'جدولة للنشر'}</h2>
    ${mediaHTML(it.media || pre.media) ? `<div class="mt12">${mediaHTML(it.media || pre.media)}</div>` : ''}
    <div class="grid c2 mt8" style="gap:12px"><div><label class="lbl">التاريخ</label><input class="field ltr" type="date" id="sd" value="${esc(it.date || pre.date || d.toISOString().slice(0, 10))}"></div>
      <div><label class="lbl">الساعة</label><input class="field ltr" type="time" id="st" value="${esc(it.time || pre.time || '19:00')}"></div></div>
    <span class="lbl">المنصات</span><div class="opts" data-opts="platforms">${Object.entries(PLAT_L).map(([k, l]) => `<button class="opt ${(it.platforms || st.platforms).includes(k) ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <label class="lbl">العنوان (داخلي)</label><input class="field" id="sti" maxlength="160" value="${esc(it.title || pre.title || '')}">
    <label class="lbl">النص المرافق</label><textarea class="field" id="sc" data-mic rows="5" maxlength="5000">${esc(it.caption ?? pre.caption ?? '')}</textarea>
    <div class="foot">${existing ? `<button class="btn ghost danger" id="sdel">${ic('trash')}حذف</button><span class="grow"></span>` : ''}<button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="ss">${ic('calendar')}${existing ? 'حفظ' : 'جدولة'}</button></div>`, (m) => {
    if (existing) st.platforms = [...existing.platforms];
    bindOpts(m, st, ['platforms']);
    $('[data-x]', m).onclick = closeModal;
    $('#ss').onclick = () => busy($('#ss'), async () => {
      const body = { date: $('#sd').value, time: $('#st').value, platforms: st.platforms, title: $('#sti').value, caption: $('#sc').value, media: it.media || pre.media || null, source: it.source || pre.source || null };
      try {
        const r = existing ? await api(`/api/brands/${S.brand.id}/schedule/${existing.id}`, { method: 'PATCH', body }) : await api(`/api/brands/${S.brand.id}/schedule`, { method: 'POST', body });
        closeModal(); toast(`تمت الجدولة · ${r.date} ${r.time}`);
        if (S.page === 'calendar') PAGES.calendar();
      } catch (e) { toast(e.message, true); }
    });
    $('#sdel', m) && ($('#sdel').onclick = async () => { try { await api(`/api/brands/${S.brand.id}/schedule/${existing.id}`, { method: 'DELETE' }); closeModal(); PAGES.calendar(); } catch (e) { toast(e.message, true); } });
  });
}
function itemModal(x) {
  const so = S.social || { accounts: [] };
  const ready = x.platforms.filter((p) => so.accounts.some((a) => a.platform === p));
  const st = SST[x.status] || SST.scheduled;
  const pub = x.publish;
  modal(`<div class="flex"><h2 class="grow">${esc(x.title || 'منشور مجدول')}</h2>${chip(st[0], st[1])}</div>
    <p class="muted sm mt8"><span class="ltr">${esc(x.date)} · ${esc(x.time)}</span> · ${x.platforms.map((p) => PLAT_L[p] || p).join('، ')}</p>
    ${x.media ? `<div class="mt12">${mediaHTML(x.media, 360)}</div>` : ''}
    ${x.caption ? `<div class="inset mt12 sm" style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(x.caption)}</div>` : ''}
    ${pub ? `<div class="inset mt12 sm"><b>النشر التلقائي</b> · ${esc(pub.status || '')} · ${rel(pub.at)}${(pub.links || []).length ? `<div class="flex wrap mt8" style="gap:8px">${pub.links.map((l) => l.url ? `<a class="src" href="${esc(l.url)}" target="_blank" rel="noopener">${PLAT_L[l.platform] || l.platform} ↗</a>` : `<span class="xs ${l.error ? '' : 'muted'}" style="${l.error ? 'color:var(--t-ro)' : ''}">${PLAT_L[l.platform] || l.platform}: ${esc(l.error || l.status || '')}</span>`).join('')}</div>` : ''}${(pub.skipped || []).length ? `<div class="xs muted mt8">لم يُرسل إلى (غير مربوط): ${pub.skipped.map((p) => PLAT_L[p] || p).join('، ')}</div>` : ''}</div>` : ''}
    <div class="inset mt12 sm">${ready.length ? `${ic('check')} جاهز للنشر التلقائي على: <b>${ready.map((p) => PLAT_L[p]).join('، ')}</b>${ready.length < x.platforms.length ? ` · غير مربوط: ${x.platforms.filter((p) => !ready.includes(p)).map((p) => PLAT_L[p] || p).join('، ')}` : ''}` : `${ic('plug')} لا يوجد حساب مربوط لهذه المنصات. اربط حساباتك لتنشر تلقائياً، أو انسخ النص وحمّل الملف وانشر يدوياً.`}</div>
    <div class="foot" style="flex-wrap:wrap">
      ${x.caption ? `<button class="btn grey" id="icp">${ic('copy')}نسخ النص</button>` : ''}
      ${x.media ? `<a class="btn grey" href="${esc(x.media.url)}" download target="_blank" rel="noopener">${ic('download')}تحميل</a>` : ''}
      <button class="btn grey" id="ied">${ic('edit')}تعديل</button>${pub?.postId ? `<button class="btn grey" id="isy" data-busy="…">${ic('refresh')}تحديث الحالة</button>` : ''}<span class="grow"></span>
      ${ready.length && !['published', 'queued'].includes(x.status) ? `<button class="btn grey" id="iq" data-busy="يرسل…">${ic('calendar')}انشر تلقائياً في موعده</button><button class="btn primary" id="inow" data-busy="ينشر…">${ic('arrow')}انشر الآن</button>`
      : !ready.length ? `<button class="btn primary" id="iacc">${ic('plug')}اربط الحسابات</button>${x.status !== 'manual' ? `<button class="btn ghost" id="iman">${ic('check')}نشرتُه يدوياً</button>` : ''}` : ''}</div>`, (m) => {
    $('#icp', m) && ($('#icp').onclick = () => navigator.clipboard.writeText(x.caption).then(() => toast('تم النسخ')));
    $('#ied').onclick = () => scheduleModal({}, x);
    $('#iacc', m) && ($('#iacc').onclick = () => accountsModal());
    $('#iman', m) && ($('#iman').onclick = () => busy($('#iman'), async () => { try { await api(`/api/brands/${S.brand.id}/schedule/${x.id}`, { method: 'PATCH', body: { status: 'manual' } }); closeModal(); PAGES.calendar(); } catch (e) { toast(e.message, true); } }));
    const send = (now) => async () => { try { const r = await api(`/api/brands/${S.brand.id}/schedule/${x.id}/publish`, { method: 'POST', body: { now, timezone: tz() } }); closeModal(); toast(now ? `أُرسل للنشر على ${r.publish.platforms.map((p) => PLAT_L[p]).join('، ')}` : `سيُنشر تلقائياً ${r.date} ${r.time}`); PAGES.calendar(); } catch (e) { toast(e.message, true); } };
    $('#inow', m) && ($('#inow').onclick = () => busy($('#inow'), send(true)));
    $('#iq', m) && ($('#iq').onclick = () => busy($('#iq'), send(false)));
    $('#isy', m) && ($('#isy').onclick = () => busy($('#isy'), async () => { try { const r = await api(`/api/brands/${S.brand.id}/schedule/${x.id}/sync`, { method: 'POST', body: {} }); closeModal(); itemModal(r); PAGES.calendar(); } catch (e) { toast(e.message, true); } }));
  });
}
S.calMonth = new Date().toISOString().slice(0, 7);
PAGES.calendar = async () => {
  if (needBrand()) return header();
  header(`<button class="btn grey" id="cacc">${ic('plug')}الحسابات المربوطة</button><button class="btn primary" id="cadd">${ic('plus')}جدولة جديدة</button>`);
  $('#cadd').onclick = () => scheduleModal();
  $('#cacc').onclick = () => accountsModal();
  const month = S.calMonth;
  const [{ items }, so] = await Promise.all([api(`/api/brands/${S.brand.id}/schedule?month=${month}`), socialState(true)]);
  if (S.page !== 'calendar') return;
  const [y, mo] = month.split('-').map(Number);
  const first = new Date(y, mo - 1, 1).getDay();
  const days = new Date(y, mo, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const by = {};
  for (const x of items) (by[x.date] = by[x.date] || []).push(x);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<div class="cd blank"></div>');
  for (let d = 1; d <= days; d++) {
    const k = `${month}-${String(d).padStart(2, '0')}`;
    cells.push(`<div class="cd ${k === today ? 'today' : ''}" data-day="${k}"><div class="flex"><b class="xs tnum">${d}</b></div>
      ${(by[k] || []).map((x) => `<button class="ci ${['published', 'manual'].includes(x.status) ? 'pub' : x.status === 'queued' ? 'q' : x.status === 'failed' ? 'fail' : ''}" data-it="${x.id}" title="${esc(x.title || x.caption)}">${x.media?.type === 'video' ? ic('play') : x.media?.type === 'image' ? ic('studio') : ic('edit')}<span><b class="tnum">${esc(x.time)}</b> ${esc(x.title || x.caption.slice(0, 40) || x.platforms.map((p) => PLAT_L[p]).join('، '))}</span></button>`).join('')}</div>`);
  }
  while (cells.length % 7) cells.push('<div class="cd blank"></div>');
  const label = new Date(y, mo - 1, 1).toLocaleDateString('ar-MA', { month: 'long', year: 'numeric' });
  const v = view(`<div class="card mb16"><div class="flex wrap" style="gap:10px"><span class="ic">${ic('plug')}</span><div class="grow"><b class="sm">${so.accounts.length ? `${so.accounts.length} حساب مربوط` : 'لا توجد حسابات مربوطة'}</b><div class="flex wrap mt8" style="gap:6px">${so.accounts.length ? so.accounts.map((a) => chip(`${PLAT_L[a.platform] || a.platform} · ${a.username || a.name}`, 'em', false)).join('') : '<span class="muted xs">اربط إنستغرام، تيك توك، فيسبوك، يوتيوب، X، لينكدإن، بنترست، ريديت، ثريدز، سناب شات… بضغطة لكل منصة، ثم انشر أو جدول من هنا.</span>'}</div></div><button class="btn ${so.accounts.length ? 'grey' : 'primary'} sm" id="cacc2">${ic('plug')}${so.accounts.length ? 'إدارة الحسابات' : 'اربط حساباتك'}</button></div></div>
    <div class="card"><div class="card-h"><button class="btn grey icon sm" id="cprev" aria-label="السابق">${ic('arrow', 'rtl-flip')}</button><h3 style="flex:1;text-align:center">${esc(label)}</h3><button class="btn grey icon sm" id="cnext" aria-label="التالي">${ic('arrow')}</button></div>
      <div class="flex wrap mb16">${['scheduled', 'queued', 'published', 'manual', 'failed', 'draft'].map((k) => { const n = items.filter((x) => x.status === k).length; return n ? chip(`${n} ${SST[k][0]}`, SST[k][1]) : ''; }).join('')}<span class="muted xs">اضغط على يوم لإضافة جدولة فيه</span></div>
      <div class="cal">${['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((x) => `<div class="cw">${x}</div>`).join('')}${cells.join('')}</div></div>`);
  $('#cacc2', v).onclick = () => accountsModal();
  $('#cprev', v).onclick = () => { const d = new Date(y, mo - 2, 1); S.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; PAGES.calendar(); };
  $('#cnext', v).onclick = () => { const d = new Date(y, mo, 1); S.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; PAGES.calendar(); };
  $$('[data-it]', v).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); itemModal(items.find((x) => x.id === b.dataset.it)); }));
  $$('[data-day]', v).forEach((c) => (c.onclick = () => scheduleModal({ date: c.dataset.day })));
};


// ---------- edit an image / make a new version of a video ----------
function editModal(kind, src) {
  const isImg = kind === 'image';
  modal(`<h2>${isImg ? 'تعديل الصورة' : 'نسخة معدّلة من الفيديو'}</h2>
    <div class="mt12">${mediaHTML({ type: kind, url: src.url }, 260)}</div>
    <p class="muted sm mt12">${isImg ? 'قل ما تريد تغييره فقط، والباقي يبقى كما هو. تُحفظ كنسخة جديدة والأصل لا يتغيّر.' : 'نماذج الفيديو لا تعدّل الفيديو نفسه، بل تولّد نسخة جديدة بنفس الإعدادات مع التغيير الذي تطلبه. الأصل يبقى محفوظاً.'}</p>
    <label class="lbl">التعديل المطلوب</label>
    <textarea class="field" id="einst" data-mic rows="3" maxlength="1500" placeholder="${isImg ? 'مثلاً: غيّر لون الكنبة إلى الأخضر، وأضف نظارات شمسية على الطاولة' : 'مثلاً: اجعل الحركة أبطأ، والإضاءة مسائية، والأب يبتسم للكاميرا في النهاية'}"></textarea>
    ${isImg ? '' : `<label class="lbl">التعليق الصوتي (اختياري)</label><textarea class="field" id="evo" data-mic rows="2" maxlength="500">${esc(src.voiceover || '')}</textarea>`}
    <div class="opts mt12">${(isImg ? ['خلفية أبسط', 'إضاءة أدفأ', 'أضف الشعار في الزاوية', 'منتج أوضح وأكبر', 'أسلوب أكثر فخامة'] : ['حركة كاميرا أبطأ', 'إضاءة مسائية', 'ابدأ بلقطة قريبة للمنتج', 'طاقة أعلى وإيقاع أسرع']).map((x) => `<button class="opt" data-q="${x}">${x}</button>`).join('')}</div>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="esave" data-busy="${isImg ? 'يعدّل…' : 'يبدأ…'}">${ic('sparkle')}${isImg ? 'عدّل الصورة' : 'ولّد النسخة'}</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    $$('[data-q]', m).forEach((q) => (q.onclick = () => { const t = $('#einst'); t.value = (t.value ? t.value + '، ' : '') + q.dataset.q; }));
    $('#esave').onclick = () => busy($('#esave'), async () => {
      const instruction = $('#einst').value.trim();
      if (!instruction) return toast('اكتب التعديل المطلوب', true);
      try {
        if (isImg) {
          const img = await api(`/api/brands/${S.brand.id}/images/${src.id}/edit`, { method: 'POST', body: { instruction, ai: aiOf('image') } });
          S.images = [img, ...(S.images || [])]; closeModal(); toast(`نسخة v${img.version} جاهزة · ${img.model}`); fallbackNote(img);
          if (S.page === 'studio') drawStudio();
        } else {
          const job = await api(`/api/brands/${S.brand.id}/videos/${src.id}/edit`, { method: 'POST', body: { instruction, voiceover: $('#evo').value, ai: aiOf('video') } });
          S.videos = [job, ...(S.videos || [])]; closeModal(); toast(`بدأت النسخة v${job.version} · ${job.model}`);
          if (S.page === 'studio') drawVideo();
        }
      } catch (e) { toast(e.message, true); }
    });
  });
}


// ---------- identity proposals ----------
const GF_LOADED = new Set();
function loadGFonts(list) {
  const need = list.filter((f) => f && !GF_LOADED.has(f));
  if (!need.length) return;
  need.forEach((f) => GF_LOADED.add(f));
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${need.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`).join('&')}&display=swap`;
  document.head.append(l);
}
async function fontModal() {
  const b = S.brand;
  let list;
  try { list = (await api(`/api/brands/${b.id}/identity/fonts`, { method: 'POST', body: { ai: aiOf('text') } })).pairings; } catch (e) { return toast(e.message, true); }
  if (!list.length) return toast('لم أحصل على اقتراحات صالحة، حاول مجدداً', true);
  loadGFonts(list.flatMap((p) => [p.heading, p.body, p.latin]));
  const c = (b.visual?.colors || [])[0] || 'var(--text)';
  modal(`<h2>اقتراحات خطوط لـ ${esc(b.name)}</h2><p class="muted sm mt8">اختر توليفة لتطبيقها. كلها من Google Fonts (مجانية للاستعمال التجاري).</p>
    ${list.map((p, i) => `<div class="inset mt12"><div class="flex"><b class="grow">${esc(p.name)}</b><button class="btn primary sm" data-fp="${i}">${ic('check')}طبّق</button></div>
      <div class="mt8" style="font-family:'${esc(p.heading)}';font-size:30px;font-weight:700;line-height:1.25;color:${c}">${esc(b.name)} · عرض خاص اليوم</div>
      <p style="font-family:'${esc(p.body)}';font-size:15px" class="mt8">هذا مثال لنص منشور بخط البراند: واضح، مريح للقراءة على الهاتف، ويعكس شخصية العلامة.</p>
      <p class="ltr" style="font-family:'${esc(p.latin)}';font-size:15px;text-align:left">${esc(b.name)} — New collection, 2026</p>
      <div class="flex wrap mt8">${chip(`العناوين: ${p.heading}`, 'vi', false)}${chip(`النصوص: ${p.body}`, '', false)}${chip(`لاتيني: ${p.latin}`, '', false)}</div>
      <p class="xs sec mt8">${esc(p.why)}</p></div>`).join('')}
    <div class="foot"><button class="btn ghost" data-x>إغلاق</button></div>`, (m) => {
    m.style.maxWidth = '720px';
    $('[data-x]', m).onclick = closeModal;
    $$('[data-fp]', m).forEach((x) => (x.onclick = () => busy(x, async () => {
      try { const p = list[Number(x.dataset.fp)]; S.brand = await api(`/api/brands/${b.id}/identity/use-fonts`, { method: 'POST', body: p }); closeModal(); renderShell(); go('brain', { replace: true }); toast('تم تطبيق الخطوط'); } catch (e) { toast(e.message, true); }
    })));
  });
}
async function paletteModal() {
  const b = S.brand;
  let list;
  try { list = (await api(`/api/brands/${b.id}/identity/palettes`, { method: 'POST', body: { ai: aiOf('text') } })).palettes; } catch (e) { return toast(e.message, true); }
  if (!list.length) return toast('لم أحصل على اقتراحات صالحة، حاول مجدداً', true);
  modal(`<h2>اقتراحات ألوان لـ ${esc(b.name)}</h2><p class="muted sm mt8">اختر لوحة لتطبيقها على البراند. يمكنك تعديل الألوان لاحقاً.</p>
    ${list.map((p, i) => `<div class="inset mt12"><div class="flex"><b class="grow">${esc(p.name)}</b><button class="btn primary sm" data-pal="${i}">${ic('check')}طبّق</button></div>
      <div class="flex wrap mt8" style="gap:8px">${p.colors.map((c) => `<div style="text-align:center"><span class="swatch" style="background:${c.hex};display:block;cursor:default"></span><div class="xs muted">${esc(c.role)}</div><div class="mono xs ltr">${c.hex}</div></div>`).join('')}</div>
      <p class="xs sec mt8">${esc(p.why)}</p></div>`).join('')}
    <div class="foot"><button class="btn ghost" data-x>إغلاق</button></div>`, (m) => {
    $('[data-x]', m).onclick = closeModal;
    $$('[data-pal]', m).forEach((x) => (x.onclick = () => busy(x, async () => { try { await patchBrand({ visual: { colors: list[Number(x.dataset.pal)].colors.map((c) => c.hex).slice(0, 8) } }); closeModal(); toast('تم تطبيق الألوان'); } catch (e) { toast(e.message, true); } })));
  });
}
function logoModal() {
  const b = S.brand;
  const st = { style: 'wordmark' };
  modal(`<h2>صمّم شعاراً لـ ${esc(b.name)}</h2><p class="muted sm mt8">يولّد 3 اقتراحات بالنموذج المختار للصور. اختر واحداً ليصبح شعار البراند، ويمكنك دائماً رفع شعارك الحقيقي بدلاً منه.</p>
    <span class="lbl">النمط</span><div class="opts" data-opts="style">${[['wordmark', 'اسم مكتوب'], ['monogram', 'حرف / مونوغرام'], ['icon', 'أيقونة + اسم'], ['arabic', 'خط عربي'], ['emblem', 'شارة']].map(([k, l]) => `<button class="opt ${k === 'wordmark' ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <label class="lbl">ملاحظاتك (اختياري)</label><textarea class="field" id="lnote" data-mic rows="2" placeholder="مثلاً: بسيط وعصري، يوحي بالثقة، فيه شكل نظارة خفيف"></textarea>
    ${(b.visual?.colors || []).length ? `<label class="flex sm mt8" style="cursor:pointer"><input type="checkbox" class="check" id="lcol" checked>استعمل ألوان البراند ${(b.visual.colors).map((c) => `<span class="dot" style="background:${c}"></span>`).join('')}</label>` : ''}
    <div id="lres" class="mt12"></div>
    <div class="foot"><button class="btn ghost" data-x>إغلاق</button><button class="btn primary" id="lgo" data-busy="يصمم… قد يستغرق دقيقة">${ic('sparkle')}ولّد 3 اقتراحات</button></div>`, (m) => {
    bindOpts(m, st);
    $('[data-x]', m).onclick = closeModal;
    $('#lgo').onclick = () => busy($('#lgo'), async () => {
      try {
        const r = await api(`/api/brands/${b.id}/identity/logos`, { method: 'POST', body: { style: st.style, note: $('#lnote').value, colors: $('#lcol')?.checked ? b.visual.colors : [], ai: aiOf('image') } });
        $('#lres').innerHTML = `<div class="logo-grid">${r.logos.map((l) => `<figure><img src="${esc(l.url)}" alt=""><button class="btn primary sm" data-use="${esc(l.url)}">${ic('check')}اعتمد هذا</button></figure>`).join('')}</div>${r.errors.length ? `<p class="xs muted mt8">${r.errors.length} اقتراح لم يكتمل</p>` : ''}`;
        $$('[data-use]', m).forEach((x) => (x.onclick = () => busy(x, async () => { try { S.brand = await api(`/api/brands/${b.id}/identity/use-logo`, { method: 'POST', body: { url: x.dataset.use } }); closeModal(); renderShell(); go('brain', { replace: true }); toast('تم اعتماد الشعار'); } catch (e) { toast(e.message, true); } })));
      } catch (e) { toast(e.message, true); }
    });
  });
}

// ---------- research (Layer 2) ----------
const BASIS = { fact: ['حقيقة', 'em'], observation: ['ملاحظة', 'vi'], inference: ['استنتاج', 'am'] };
const FUNNEL = { awareness: 'الوعي', consideration: 'الاهتمام', conversion: 'التحويل', retention: 'الولاء' };
const RS = [['dna', 'Brand DNA'], ['archetype', 'Archetype'], ['positioning', 'التموضع'], ['personality', 'الشخصية'], ['tone', 'نبرة التواصل'], ['audience', 'الجمهور المستهدف'], ['strategy', 'الاستراتيجية التسويقية'], ['social', 'السوشال ميديا'], ['ads', 'الإعلانات'], ['campaigns', 'الحملات'], ['funnel', 'قمع التسويق']];
const RL = [['pillars', 'محاور المحتوى'], ['offers', 'العروض'], ['hooks', 'الخطافات'], ['ctas', 'الدعوات للإجراء'], ['strengths', 'نقاط القوة'], ['weaknesses', 'نقاط الضعف']];
const claim = (x) => x ? `${esc(x.value)} ${chip(BASIS[x.basis]?.[0] || '', BASIS[x.basis]?.[1] || '', false)}${x.source && /^https?:/.test(x.source) ? ` <a class="xs src" href="${esc(x.source)}" target="_blank" rel="noopener">المصدر ↗</a>` : ''}` : '<span class="muted">—</span>';
const CHL = { website: 'الموقع', instagram: 'إنستغرام', tiktok: 'تيك توك', facebook: 'فيسبوك', youtube: 'يوتيوب', x: 'X', linkedin: 'لينكدإن', snapchat: 'سناب شات', pinterest: 'بنترست', threads: 'ثريدز', whatsapp: 'واتساب', google_maps: 'خرائط Google', marketplace: 'متاجر' };
const chUrl = (k, v) => {
  v = String(v || '').trim();
  if (/^https?:\/\//.test(v)) return v;
  const h = v.replace(/^@/, '');
  return { instagram: `https://instagram.com/${h}`, tiktok: `https://www.tiktok.com/@${h}`, x: `https://x.com/${h}`, threads: `https://www.threads.net/@${h}`, snapchat: `https://www.snapchat.com/add/${h}`, youtube: `https://www.youtube.com/@${h}`, facebook: `https://facebook.com/${h}`, pinterest: `https://pinterest.com/${h}` }[k] || (/\./.test(v) ? `https://${v}` : '');
};
const chLinks = (c) => Object.entries(c.channels || { website: c.website, instagram: c.instagram }).filter(([, v]) => v).map(([k, v]) => { const u = chUrl(k, v); return u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener">${CHL[k] || k} ↗</a>` : `<span class="muted">${CHL[k] || k}: ${esc(v)}</span>`; }).join('');
const FMTS = [['xlsx', 'Excel', 'يفتح في Excel و Google Sheets و Numbers'], ['docx', 'Word', 'يفتح في Word و Google Docs'], ['pdf', 'PDF', 'صفحة جاهزة للطباعة أو الحفظ PDF'], ['csv', 'CSV', 'بيانات خام لأي برنامج'], ['md', 'Markdown', 'للصق في Notion أو أي محرر']];
function downloadMenu(btn, q) {
  openMenu(btn, FMTS.map(([f, l, d]) => ({ label: l, desc: d, onClick: () => { const u = `/api/brands/${S.brand.id}/research/export?${q}&format=${f}`; if (f === 'pdf') window.open(u, '_blank', 'noopener'); else { const a = document.createElement('a'); a.href = u; a.download = ''; document.body.append(a); a.click(); a.remove(); } } })));
}
PAGES.research = async () => {
  if (needBrand()) return header();
  const b = S.brand;
  S.rtab = S.rtab || 'competitors';
  header(pills('rtab', [['competitors', 'المنافسون'], ['compare', 'مقارنة مع براندي'], ['market', 'تحليل السوق والفرص'], ['files', 'التنزيل و Google Sheets']], S.rtab));
  const [R, G] = await Promise.all([api(`/api/brands/${b.id}/research`), api('/api/google').catch(() => ({ connected: false }))]);
  if (S.page !== 'research') return;
  S.research = R;
  const SH = R.sheets || { competitors: {} };
  const done = R.competitors.filter((c) => c.status === 'researched');
  const X = R.cross;
  const CP = R.compare;
  S.rsel = S.rsel || new Set(done.map((c) => c.id));
  const tabNote = `<div class="grid c4 mb16">${[
    ['competitors', 'research', 'المنافسون', `${done.length}/${R.competitors.length} محلَّل`],
    ['compare', 'insights', 'مقارنة مع براندي', CP ? `آخر مقارنة ${rel(CP.at)}` : 'لم تُشغَّل بعد'],
    ['market', 'sparkle', 'الفرص', X ? `${X.opportunities.length} فرصة · ${X.opportunities.filter((o) => o.status === 'approved').length} موافَق` : 'لم يُحلَّل بعد'],
    ['files', 'download', 'الملفات', G.connected ? 'Google Sheets مربوط' : 'Excel · Word · PDF'],
  ].map(([k, i, t, d]) => `<button class="card stat ${S.rtab === k ? 'feature' : ''}" data-rt="${k}" style="text-align:start;cursor:pointer;border:${S.rtab === k ? '0' : ''}"><div class="flex"><span class="ic">${ic(i)}</span><b class="sm">${t}</b></div><span class="muted xs mt8" style="display:block">${d}</span></button>`).join('')}</div>`;

  let body = '';
  if (S.rtab === 'competitors') body = `
  <div class="card mb16"><div class="card-h"><span class="ic">${ic('search')}</span><h3>اكتشاف المنافسين</h3>${R.discovery ? `<div class="end"><span class="muted xs">${R.discovery.web ? 'من الإنترنت' : 'بدون بحث'} · ${esc(R.discovery.via)} · ${rel(R.discovery.at)}</span></div>` : ''}</div>
    <div class="grid c2" style="gap:12px"><div><label class="lbl" style="margin-top:0">السوق</label><input class="field" id="rmk" value="${esc(b.fields?.market?.value || '')}" placeholder="مثلاً: الخليج، السعودية، الدار البيضاء"></div>
      <div><label class="lbl" style="margin-top:0">منافسون تعرفهم (اختياري)</label><textarea class="field" id="rseed" data-mic rows="2" placeholder="اسم أو رابط في كل سطر"></textarea></div></div>
    <p class="hint mt8">يبحث في كل القنوات: الموقع، إنستغرام، تيك توك، فيسبوك، يوتيوب، X، لينكدإن، سناب شات، بنترست، ثريدز، خرائط Google والتقييمات، والمتاجر.</p>
    <div class="flex mt12" style="justify-content:flex-end"><button class="btn primary" id="rdisc" data-busy="يبحث في الإنترنت…">${ic('search')}ابحث عن المنافسين</button></div></div>
  <div class="card"><div class="card-h"><span class="ic">${ic('brands')}</span><h3>المنافسون (${R.competitors.length})</h3><div class="end">${R.competitors.some((c) => c.status !== 'researched') ? `<button class="btn ghost sm" id="rall" data-busy="يحلل…">${ic('sparkle')}حلّل الكل</button>` : ''}<button class="btn grey sm" id="radd">${ic('plus')}إضافة يدوية</button></div></div>
    ${R.competitors.length ? `<div class="grid c3">${R.competitors.map((c) => `<div class="inset comp" data-c="${c.id}">
      <div class="flex"><b class="grow">${esc(c.name)}</b>${c.status === 'researched' ? chip('محلَّل', 'em') : chip('مكتشف', '')}${chip(c.kind === 'direct' ? 'مباشر' : 'غير مباشر', '', false)}</div>
      <p class="xs sec mt8">${esc(c.profile?.summary || c.why)}</p>
      <div class="flex wrap mt8 xs" style="gap:8px">${chLinks(c)}</div>
      <div class="flex wrap mt12">${c.status === 'researched' ? `<button class="btn primary sm" data-open="${c.id}">عرض التحليل</button><button class="btn grey sm" data-dl="${c.id}">${ic('download')}تنزيل</button><button class="btn grey icon sm" data-an="${c.id}" data-job="an-${c.id}" data-busy="" title="تحديث التحليل" aria-label="تحديث">${ic('refresh')}</button>` : `<button class="btn primary sm" data-an="${c.id}" data-job="an-${c.id}" data-busy="يحلل… حتى دقيقتين">${ic('sparkle')}حلّل</button>`}<span class="grow"></span>${SH.competitors?.[c.id] ? `<a class="btn ghost sm" href="${esc(SH.competitors[c.id].url)}" target="_blank" rel="noopener">Sheet ↗</a>` : ''}<button class="btn grey icon sm" data-rm="${c.id}" aria-label="حذف">${ic('trash')}</button></div></div>`).join('')}</div>`
    : `<div class="empty" style="padding:24px"><span class="ic">${ic('search')}</span><h3>لا يوجد منافسون بعد</h3><p>اضغط "ابحث عن المنافسين"، أو أضفهم يدوياً، أو فعّل البحث داخل التحليل الذكي في عقل البراند.</p></div>`}
  </div>`;

  if (S.rtab === 'compare') body = `
  <div class="card mb16"><div class="card-h"><span class="ic">${ic('insights')}</span><h3>${esc(b.name)} مقابل المنافسين</h3><div class="end">${CP ? `<span class="muted xs">${esc(CP.via)} · ${rel(CP.at)}</span><button class="btn grey sm" id="cpdl">${ic('download')}تنزيل</button>` : ''}</div></div>
    ${done.length ? `<span class="lbl" style="margin-top:0">اختر المنافسين للمقارنة (حتى 5)</span><div class="opts" id="cpsel">${done.map((c) => `<button class="opt ${S.rsel.has(c.id) ? 'on' : ''}" data-cs="${c.id}">${esc(c.name)}</button>`).join('')}</div>
      <span class="lbl">ماذا نقارن؟</span><div class="opts" id="cpscope">${[['brand', 'البراند والتموضع'], ['products', 'المنتجات والأسعار'], ['both', 'الاثنين معاً']].map(([k, l]) => `<button class="opt ${(S.cpScope || CP?.scope || 'brand') === k ? 'on' : ''}" data-sc="${k}">${l}</button>`).join('')}</div>
      <div class="flex mt12" style="justify-content:flex-end"><button class="btn primary" id="cpgo" data-busy="يقارن… حتى دقيقة">${ic('sparkle')}${CP ? 'أعد المقارنة' : 'قارن الآن'}</button></div>`
    : `<p class="muted sm">حلّل منافساً واحداً على الأقل من تبويب «المنافسون»، ثم ارجع هنا لترى براندك أمامهم بعداً بعداً.</p><div class="flex mt12"><button class="btn primary sm" data-rt="competitors">${ic('research')}المنافسون</button></div>`}
  </div>
  ${CP?.productCompare ? (() => { const PC = CP.productCompare; const POS = { cheaper: ['أرخص', 'em'], similar: ['مشابه', ''], pricier: ['أغلى', 'am'], unknown: ['غير معروف', ''] }; return `<div class="card mb16"><div class="card-h"><span class="ic">${ic('studio')}</span><h3>المنتجات والأسعار</h3><div class="end"><span class="muted xs">${PC.web ? 'أسعار من الإنترنت' : 'بدون بحث على الإنترنت'} · ${esc(PC.via || '')}</span></div></div>
    <p class="sm">${esc(PC.summary)}</p>
    <div class="tablewrap mt12"><table class="cmp"><thead><tr><th>منتجنا</th>${CP.names.map((n) => `<th>${esc(n)}</th>`).join('')}<th>موقعنا</th><th>الحكم</th><th>ما نفعله</th></tr></thead><tbody>
      ${PC.products.map((r) => `<tr><td style="background:var(--accent-soft)"><b>${esc(r.ours)}</b>${r.ourPrice ? `<div class="tnum xs">${esc(r.ourPrice)}</div>` : ''}</td>${r.rivals.map((x) => `<td class="sm">${x.product ? esc(x.product) : '<span class="muted">—</span>'}${x.price ? `<div class="tnum xs"><b>${esc(x.price)}</b></div>` : ''}${x.source && /^https?:/.test(x.source) ? `<a class="src xs" href="${esc(x.source)}" target="_blank" rel="noopener">المصدر</a>` : ''}</td>`).join('')}<td>${chip(POS[r.position][0], POS[r.position][1], false)}</td><td class="sm sec">${esc(r.verdict)}</td><td class="sm">${esc(r.action)}</td></tr>`).join('')}
    </tbody></table></div>
    ${PC.gaps.length ? `<span class="lbl">منتجات يبيعها المنافسون ولا نبيعها</span><ul class="sm sec" style="padding-inline-start:18px">${PC.gaps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`; })() : ''}
  ${CP && CP.rows?.length ? `<div class="card mb16"><p class="sm">${esc(CP.summary)}</p>
    <div class="tablewrap mt12"><table class="cmp"><thead><tr><th>البعد</th><th style="background:var(--accent-soft)">${esc(b.name)}</th>${CP.names.map((n) => `<th>${esc(n)}</th>`).join('')}<th>المتفوّق</th><th>ما نفعله</th></tr></thead><tbody>
      ${CP.rows.map((r) => `<tr><td><b>${esc(r.dimension)}</b></td><td style="background:var(--accent-soft)">${esc(r.brand)}</td>${r.competitors.map((x) => `<td class="sec">${esc(x)}</td>`).join('')}<td>${chip(r.leader, r.leader.trim().toLowerCase() === b.name.trim().toLowerCase() ? 'em' : 'am', false)}</td><td class="sm">${esc(r.action)}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="grid c3">${[['priorities', 'أولويات 30 يوماً', 'vi'], ['edges', 'نتفوق فيه', 'em'], ['gaps', 'يتفوقون فيه', 'am']].map(([k, l, t]) => `<div class="card"><div class="card-h"><h3>${l}</h3><div class="end">${chip(String(CP[k].length), t, false)}</div></div><ul class="sm sec" style="padding-inline-start:18px">${CP[k].map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul></div>`).join('')}</div>` : ''}`;

  if (S.rtab === 'market') body = `
  <div class="card"><div class="card-h"><span class="ic">${ic('insights')}</span><h3>تحليل السوق والفرص</h3><div class="end">${X ? `<span class="muted xs">${esc(X.via)} · ${rel(X.at)}</span><button class="btn grey sm" id="mkdl">${ic('download')}تنزيل</button>` : ''}<button class="btn ${X ? 'grey' : 'primary'} sm" id="rcross" data-busy="يقارن… حتى دقيقتين" ${done.length ? '' : 'disabled'}>${ic('sparkle')}${X ? 'أعد التحليل' : 'حلّل السوق'}</button></div></div>
    ${X ? `<p class="sm">${esc(X.summary)}</p>
      ${X.pillars.length ? `<span class="lbl">محاور المحتوى المقترحة لبراندك</span><div class="flex wrap">${X.pillars.map((p) => chip(p, 'vi', false)).join('')}</div>` : ''}
      <span class="lbl">الفرص (${X.opportunities.length}) · وافق على ما يعجبك، ثم حوّله لمحتوى. الموافقات تظهر أيضاً في صفحة «الموافقات».</span>
      <div class="grid c2">${X.opportunities.map((o) => `<div class="inset opp ${o.status}"><div class="flex"><b class="grow">${esc(o.title)}</b>${chip(FUNNEL[o.funnel], 'vi', false)}${o.status === 'approved' ? chip('موافق عليها', 'em') : o.status === 'rejected' ? chip('مرفوضة', 'ro') : ''}</div>
        <p class="sm mt8">${esc(o.angle)}</p><p class="xs muted mt8">المصدر: ${esc(o.why)}${o.need ? ` · الحاجة: ${esc(o.need)}` : ''}${o.format ? ` · الصيغة: ${esc(o.format)}` : ''}</p>
        <div class="flex mt12"><button class="btn primary sm" data-use-op="${o.id}">${ic('create')}حوّل لمحتوى</button>${o.status !== 'approved' ? `<button class="btn grey sm" data-op="${o.id}" data-st="approved">${ic('check')}موافقة</button>` : ''}${o.status !== 'rejected' ? `<button class="btn grey icon sm" data-op="${o.id}" data-st="rejected" aria-label="رفض">${ic('x')}</button>` : ''}</div></div>`).join('')}</div>
      <div class="grid c2 mt16">${[['strengths', 'نقاط قوة المنافسين'], ['weaknesses', 'ثغرات المنافسين'], ['saturated', 'مواضيع مستهلكة (تجنّبها)'], ['unmet', 'احتياجات بلا جواب']].map(([k, l]) => X[k]?.length ? `<div><span class="lbl">${l}</span><ul class="sm sec" style="padding-inline-start:18px">${X[k].map((x) => `<li>${claim(x)}</li>`).join('')}</ul></div>` : '').join('')}</div>
      ${X.seasonal.length ? `<span class="lbl">مواسم ومناسبات</span><div class="grid c2">${X.seasonal.map((s2) => `<div class="inset sm"><b>${esc(s2.moment)}</b><div class="sec mt8">${esc(s2.idea)}</div></div>`).join('')}</div>` : ''}
      ${X.sources?.length ? `<details class="mt16"><summary class="sm">المصادر (${X.sources.length})</summary><ul class="xs" style="padding-inline-start:18px">${X.sources.map((s2) => `<li><a class="src" href="${esc(s2.url)}" target="_blank" rel="noopener">${esc(s2.title || s2.url)}</a></li>`).join('')}</ul></details>` : ''}`
    : `<p class="muted sm">بعد تحليل منافس واحد على الأقل، يقارن النظام بينهم ويستخرج نقاط القوة والضعف، المواضيع المستهلكة، الاحتياجات بلا جواب، والفرص المناسبة لهوية براندك مع مرحلة القمع.</p>`}
  </div>`;

  if (S.rtab === 'files') body = `
  <div class="card mb16"><div class="card-h"><span class="ic">${ic('download')}</span><h3>تنزيل التحليلات</h3><div class="end"><span class="muted xs">Excel · Word · PDF · CSV · Markdown</span></div></div>
    <div class="rows">
      <div class="row-i"><div class="t"><b>تحليل السوق الكامل</b><small>المنافسون، الفرص، قراءة السوق، المحاور، المصادر${CP ? '، والمقارنة مع براندك' : ''}</small></div><button class="btn primary sm" data-dlq="kind=market">${ic('download')}تنزيل</button></div>
      ${CP ? `<div class="row-i"><div class="t"><b>${esc(b.name)} مقابل المنافسين</b><small>جدول المقارنة والأولويات</small></div><button class="btn grey sm" data-dlq="kind=compare">${ic('download')}تنزيل</button></div>` : ''}
      ${done.map((c) => `<div class="row-i"><div class="t"><b>${esc(c.name)}</b><small>تحليل المنافس كاملاً مع القنوات والمصادر · ${rel(c.researchedAt)}</small></div><button class="btn grey sm" data-dlq="c=${c.id}">${ic('download')}تنزيل</button></div>`).join('')}
    </div></div>
  <div class="card"><div class="card-h"><span class="ic">${ic('download')}</span><h3>Google Sheets</h3><div class="end">${G.connected ? chip(esc(G.email || 'مربوط'), 'em', false) : chip('غير مربوط', '')}</div></div>
    ${!G.connected ? `<p class="muted sm">اربط حساب Google بضغطة واحدة، فتنشئ المنصة ملفاً لكل منافس وملفاً رئيسياً لبراندك داخل Google Drive الخاص بك. تكتب ملاحظاتك في الشيت وتوافق أو ترفض الفرص من هناك.</p><div class="flex mt12">${G.configured ? `<button class="btn primary sm" id="gconr">${ic('plug')}ربط حساب Google</button>` : `<span class="muted xs">ربط Google غير مفعّل بعد في المنصة. يمكنك تنزيل الملفات بالأعلى بأي صيغة، وفتح ملف Excel مباشرة في Google Sheets.</span>`}</div>`
    : `<div class="grid c2">
      <div class="inset"><div class="flex"><b class="grow">الملف الرئيسي للبراند</b>${SH.master ? `<span class="muted xs">${rel(SH.master.at)}</span>` : ''}</div>
        <p class="xs sec mt8">مقارنة المنافسين · فرص السوق (مع خانة القرار) · الاتجاهات · أفكار المحتوى · القمع التسويقي · تقويم المحتوى · الموافقات</p>
        <div class="flex wrap mt12">${SH.master ? `<a class="btn primary sm" href="${esc(SH.master.url)}" target="_blank" rel="noopener">افتح الملف ↗</a><button class="btn grey sm" id="gmaster" data-busy="يحدّث…">${ic('refresh')}تحديث</button><button class="btn ghost sm" id="gpull" data-busy="يقرأ…">${ic('check')}اقرأ قراراتي من الشيت</button>` : `<button class="btn primary sm" id="gmaster" data-busy="ينشئ الملف…">${ic('plus')}أنشئ الملف الرئيسي</button>`}</div></div>
      <div class="inset"><div class="flex"><b class="grow">ملف لكل منافس</b><span class="muted xs">${Object.keys(SH.competitors || {}).length}/${done.length}</span></div>
        <p class="xs sec mt8">الهوية · التموضع · السوشال ميديا · الحملات · الإعلانات · استراتيجية المحتوى · القمع · الفرص · المصادر. ملاحظاتك في العمود الأخير تبقى عند كل تحديث.</p>
        <div class="flex wrap mt12">${done.map((c) => `<button class="btn grey sm" data-gs="${c.id}" data-job="gs-${c.id}" data-busy="…">${SH.competitors?.[c.id] ? ic('refresh') : ic('plus')}${esc(c.name)}</button>`).join('') || '<span class="muted xs">حلّل منافساً أولاً</span>'}</div></div>
    </div>`}
  </div>`;

  const v = view(`${tabNote}${body}
  <p class="hint mt12">كل معلومة موسومة: <b>حقيقة</b> (يذكرها مصدر) · <b>ملاحظة</b> (نمط ظاهر) · <b>استنتاج</b> (تحليل الذكاء الاصطناعي). أرقام المبيعات ونتائج الإعلانات الداخلية لا تُعتبر حقائق.</p>`);
  const reload = () => PAGES.research();
  $$('[data-rt]', v).forEach((x) => (x.onclick = () => { S.rtab = x.dataset.rt; reload(); }));
  $$('[data-dl]', v).forEach((x) => (x.onclick = () => downloadMenu(x, `c=${x.dataset.dl}`)));
  $$('[data-dlq]', v).forEach((x) => (x.onclick = () => downloadMenu(x, x.dataset.dlq)));
  $('#cpdl', v) && ($('#cpdl', v).onclick = (e) => downloadMenu(e.currentTarget, 'kind=compare'));
  $('#mkdl', v) && ($('#mkdl', v).onclick = (e) => downloadMenu(e.currentTarget, 'kind=market'));
  $$('[data-cs]', v).forEach((x) => (x.onclick = () => { const id = x.dataset.cs; if (S.rsel.has(id)) S.rsel.delete(id); else if (S.rsel.size < 5) S.rsel.add(id); else return toast('حتى 5 منافسين', true); x.classList.toggle('on', S.rsel.has(id)); }));
  $$('[data-sc]', v).forEach((x) => (x.onclick = () => { S.cpScope = x.dataset.sc; $$('[data-sc]', v).forEach((y) => y.classList.toggle('on', y === x)); }));
  $('#cpgo', v) && ($('#cpgo', v).onclick = (e) => busy(e.currentTarget, async () => {
    if (!S.rsel.size) return toast('اختر منافساً واحداً على الأقل', true);
    try { await api(`/api/brands/${b.id}/research/compare`, { method: 'POST', body: { ids: [...S.rsel], scope: S.cpScope || CP?.scope || 'brand' } }); toast('المقارنة جاهزة'); reload(); } catch (err) { toast(err.message, true); }
  }));
  $('#rdisc', v) && ($('#rdisc', v).onclick = (e) => busy(e.currentTarget, async () => { try { const r = await api(`/api/brands/${b.id}/research/discover`, { method: 'POST', body: { market: $('#rmk').value, seeds: $('#rseed').value } }); toast(`وجدت ${r.found.length} منافس جديد · ${r.web ? 'من الإنترنت' : 'بدون بحث على الإنترنت'}`); reload(); } catch (err) { toast(err.message, true); } }));
  $('#radd', v) && ($('#radd', v).onclick = () => modal(`<h2>إضافة منافس</h2><label class="lbl">الاسم</label><input class="field" id="cn2">
    <p class="muted xs mt8">أضف ما تعرفه من قنواته (اختياري). الباقي يبحث عنه التحليل.</p>
    <div class="grid c2" style="gap:10px">${['website', 'instagram', 'tiktok', 'facebook', 'youtube', 'x', 'snapchat', 'linkedin'].map((k) => `<div><label class="lbl">${CHL[k]}</label><input class="field ltr" data-chn="${k}" style="text-align:left" placeholder="${k === 'website' ? 'example.com' : '@handle أو رابط'}"></div>`).join('')}</div>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="cs2">إضافة</button></div>`, (m) => {
    m.style.maxWidth = '620px';
    $('[data-x]', m).onclick = closeModal;
    $('#cs2').onclick = () => busy($('#cs2'), async () => { try { const channels = Object.fromEntries($$('[data-chn]', m).map((i) => [i.dataset.chn, i.value.trim()]).filter(([, x]) => x)); await api(`/api/brands/${b.id}/research/competitors`, { method: 'POST', body: { name: $('#cn2').value, channels } }); closeModal(); reload(); } catch (err) { toast(err.message, true); } });
  }));
  $('#gconr', v) && ($('#gconr', v).onclick = googleConnect);
  $('#gmaster', v) && ($('#gmaster', v).onclick = (e) => busy(e.currentTarget, async () => {
    try { const r = await api(`/api/brands/${b.id}/research/sheets/master`, { method: 'POST', body: {} }); toast(r.pulled ? `تم التحديث · طُبّق ${r.pulled} قرار من الشيت` : 'تم تحديث الملف الرئيسي'); window.open(r.url, '_blank', 'noopener'); reload(); } catch (err) { toast(err.message, true); }
  }));
  $('#gpull', v) && ($('#gpull', v).onclick = (e) => busy(e.currentTarget, async () => {
    try { const r = await api(`/api/brands/${b.id}/research/sheets/pull`, { method: 'POST', body: {} }); toast(r.changed ? `طُبّق ${r.changed} قرار من الشيت` : 'لا توجد قرارات جديدة في الشيت'); reload(); } catch (err) { toast(err.message, true); }
  }));
  $$('[data-gs]', v).forEach((x) => (x.onclick = () => busy(x, async () => {
    try { const r = await api(`/api/brands/${b.id}/research/sheets/${x.dataset.gs}`, { method: 'POST', body: {} }); toast('تم إنشاء/تحديث ملف المنافس'); window.open(r.url, '_blank', 'noopener'); reload(); } catch (err) { toast(err.message, true); }
  })));
  const analyzeOne = (cid) => api(`/api/brands/${b.id}/research/competitors/${cid}/analyze`, { method: 'POST', body: {} });
  $$('[data-an]', v).forEach((x) => (x.onclick = () => busy(x, async () => { try { const c = await analyzeOne(x.dataset.an); toast(`تم تحليل ${c.name}`); S.rsel?.add(c.id); reload(); } catch (err) { toast(err.message, true); } })));
  $('#rall', v) && ($('#rall', v).onclick = (e) => busy(e.currentTarget, async () => {
    for (const c of R.competitors.filter((y) => y.status !== 'researched')) { try { toast(`يحلل ${c.name}…`); const r = await analyzeOne(c.id); S.rsel?.add(r.id); } catch (err) { toast(`${c.name}: ${err.message}`, true); } }
    reload();
  }));
  $$('[data-rm]', v).forEach((x) => (x.onclick = async () => { if (!(await confirmBox('حذف المنافس؟', 'سيُحذف من القائمة مع تحليله.', 'حذف', true))) return; await api(`/api/brands/${b.id}/research/competitors/${x.dataset.rm}`, { method: 'DELETE' }); reload(); }));
  $$('[data-open]', v).forEach((x) => (x.onclick = () => competitorModal(R.competitors.find((c) => c.id === x.dataset.open))));
  $('#rcross', v) && ($('#rcross', v).onclick = (e) => busy(e.currentTarget, async () => { try { await api(`/api/brands/${b.id}/research/cross`, { method: 'POST', body: {} }); toast('تم التحليل المقارن'); reload(); } catch (err) { toast(err.message, true); } }));
  $$('[data-op]', v).forEach((x) => (x.onclick = () => busy(x, async () => { try { await api(`/api/brands/${b.id}/research/opportunities/${x.dataset.op}`, { method: 'PATCH', body: { status: x.dataset.st } }); S.ov = null; toast(x.dataset.st === 'approved' ? 'تمت الموافقة · تظهر في صفحة الموافقات' : 'تم الرفض'); reload(); } catch (err) { toast(err.message, true); } })));
  $$('[data-use-op]', v).forEach((x) => (x.onclick = () => {
    const o = X.opportunities.find((y) => y.id === x.dataset.useOp);
    const fmt2 = String(o.format || '').toLowerCase();
    const t = /carousel|كاروسيل/.test(fmt2) ? 'carousel' : /reel|ريل|video|فيديو/.test(fmt2) ? 'reel' : /story|ستوري/.test(fmt2) ? 'story' : /ad|إعلان/.test(fmt2) ? 'ad' : 'post';
    Object.assign(S.form, { idea: `${o.title}: ${o.angle}${o.need ? ` (حاجة الجمهور: ${o.need})` : ''}`, goal: { awareness: 'awareness', consideration: 'engagement', conversion: 'sales', retention: 'trust' }[o.funnel] || 'engagement', types: [t], type: t, occasion: '' });
    S.ctab = 'new'; S.batch = null; go('create'); toast('عُبّئت الفكرة في نموذج المحتوى');
  }));
};
function competitorModal(c) {
  const p = c.profile;
  modal(`<div class="flex"><h2 class="grow">${esc(c.name)}</h2><button class="btn grey sm" id="cmdl">${ic('download')}تنزيل</button></div>
    <p class="muted xs mt8">${c.web ? 'بحث على الإنترنت' : 'بدون بحث على الإنترنت: كل شيء استنتاج'} · ${esc(c.via || '')} · ${rel(c.researchedAt)}</p>
    <p class="sm mt12">${esc(p.summary)}</p>
    ${(p.channels || []).length ? `<span class="lbl">القنوات (${p.channels.length})</span><div class="tablewrap"><table><thead><tr><th>القناة</th><th>الجمهور</th><th>النشاط</th><th>المحتوى</th></tr></thead><tbody>${p.channels.map((x) => `<tr><td>${x.url ? `<a class="src" href="${esc(chUrl(x.platform, x.url))}" target="_blank" rel="noopener">${CHL[x.platform] || x.platform} ↗</a>` : CHL[x.platform] || x.platform}</td><td class="tnum">${esc(x.audience || '—')}</td><td class="xs sec">${esc(x.activity || '')}</td><td class="xs">${esc(x.content)} ${chip(BASIS[x.basis]?.[0] || '', BASIS[x.basis]?.[1] || '', false)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="flex wrap mt8 xs" style="gap:8px">${chLinks(c)}</div>`}
    <div class="rows mt12">${[...RS, ['pricing', 'الأسعار'], ['reviews', 'آراء العملاء']].filter(([k]) => p[k]).map(([k, l]) => `<div class="row-i" style="align-items:flex-start"><div class="t"><b style="font-weight:600">${l}</b><small style="color:var(--text-2);white-space:normal">${claim(p[k])}</small></div></div>`).join('')}</div>
    ${RL.filter(([k]) => p[k]?.length).map(([k, l]) => `<span class="lbl">${l}</span><ul class="sm sec" style="padding-inline-start:18px">${p[k].map((x) => `<li>${claim(x)}</li>`).join('')}</ul>`).join('')}
    ${c.sources?.length ? `<details class="mt12"><summary class="sm">المصادر (${c.sources.length})</summary><ul class="xs" style="padding-inline-start:18px">${c.sources.map((s2) => `<li><a class="src" href="${esc(s2.url)}" target="_blank" rel="noopener">${esc(s2.title || s2.url)}</a></li>`).join('')}</ul></details>` : ''}
    <div class="foot"><button class="btn ghost" data-x>إغلاق</button></div>`, (m) => { $('[data-x]', m).onclick = closeModal; m.style.maxWidth = '860px'; $('#cmdl', m).onclick = (e) => downloadMenu(e.currentTarget, `c=${c.id}`); });
}

// ---------- insights (Layer 6) ----------
PAGES.insights = async () => {
  if (needBrand()) return header();
  const b = S.brand;
  header(`<button class="btn primary" id="ilearn" data-busy="يحلّل…">${ic('sparkle')}ماذا تعلّمنا؟</button>`);
  const I = await api(`/api/brands/${b.id}/insights`);
  if (S.page !== 'insights') return;
  const P = I.posts || [];
  const sum = (k) => P.reduce((a, x) => a + (Number(x[k]) || 0), 0);
  const reach = (x) => x.reach || x.impressions || x.views || 0;
  const avgEr = P.length ? (P.reduce((a, x) => a + (Number(x.engagementRate) || 0), 0) / P.length).toFixed(2) : '0';
  const top = [...P].sort((a, c) => (c.engagementRate || 0) - (a.engagementRate || 0)).slice(0, 3);
  const byPlat = {};
  for (const x of P) { const k = x.platform || 'other'; byPlat[k] = byPlat[k] || { n: 0, reach: 0, er: 0 }; byPlat[k].n++; byPlat[k].reach += reach(x); byPlat[k].er += Number(x.engagementRate) || 0; }
  const L = I.learned;
  const v = view(`${!I.social?.accounts?.length ? `<div class="card mb16"><div class="flex wrap" style="gap:10px"><span class="ic">${ic('plug')}</span><div class="grow"><b class="sm">اربط حساباتك لتظهر الإحصائيات</b><p class="muted xs mt8">بعد ربط إنستغرام وتيك توك وفيسبوك ويوتيوب… تقرأ المنصة الوصول والتفاعل لكل منشور، وتتعلّم ما ينجح لبراندك وتستعمله في المحتوى القادم.</p></div><button class="btn primary sm" id="iacc">${ic('plug')}اربط حساباتك</button></div></div>` : ''}
    ${I.note ? `<div class="inset sm mb16">${esc(I.note)}</div>` : ''}
    <div class="grid c4 mb16">
      <div class="card stat feature"><span class="sec sm">متوسط التفاعل</span><div class="num">${avgEr}%</div><span class="muted xs">آخر 90 يوماً</span></div>
      <div class="card stat"><span class="sec sm">المنشورات</span><div class="num">${P.length}</div></div>
      <div class="card stat"><span class="sec sm">الوصول</span><div class="num">${short(P.reduce((a, x) => a + reach(x), 0))}</div></div>
      <div class="card stat"><span class="sec sm">إعجابات · تعليقات · مشاركات</span><div class="num" style="font-size:22px">${short(sum('likes'))} · ${short(sum('comments'))} · ${short(sum('shares'))}</div></div>
    </div>
    ${L ? `<div class="card mb16"><div class="card-h"><span class="ic">${ic('sparkle')}</span><h3>ماذا تعلّم النظام</h3><div class="end"><span class="muted xs">${esc(L.via)} · ${L.posts} منشور · ${rel(L.at)}</span></div></div>
      <p class="sm">${esc(L.summary)}</p>
      <div class="grid c3 mt12">${[['works', 'ما ينجح', 'em'], ['fails', 'ما لا ينجح', 'am'], ['next', 'المحتوى القادم', 'vi']].map(([k, l, t]) => `<div class="inset"><div class="flex"><b class="grow sm">${l}</b>${chip(String(L[k].length), t, false)}</div><ul class="sm sec mt8" style="padding-inline-start:18px">${L[k].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
      ${L.bestTimes?.length ? `<div class="flex wrap mt12">${L.bestTimes.map((x) => chip(x, '', false)).join('')}</div>` : ''}
      <p class="hint mt12">هذه الدروس تُستعمل تلقائياً عند توليد المحتوى الجديد.</p></div>` : ''}
    <div class="grid c12">
      <div class="card s8"><div class="card-h"><h3>المنشورات</h3><div class="end"><span class="muted xs">${P.length}</span></div></div>
        ${P.length ? `<div class="tablewrap"><table><thead><tr><th>المنصة</th><th>المنشور</th><th>الوصول</th><th>إعجاب</th><th>تعليق</th><th>مشاركة</th><th>التفاعل</th></tr></thead><tbody>${P.slice(0, 60).map((x) => `<tr><td>${esc(PLAT_L[x.platform] || x.platform)}</td><td class="sm">${x.url ? `<a class="src" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.text.slice(0, 70) || 'فتح')}</a>` : esc(x.text.slice(0, 70))}<div class="muted xs">${esc(String(x.at).slice(0, 10))}</div></td><td class="tnum">${short(reach(x))}</td><td class="tnum">${short(x.likes)}</td><td class="tnum">${short(x.comments)}</td><td class="tnum">${short(x.shares)}</td><td class="tnum"><b>${Number(x.engagementRate || 0).toFixed(1)}%</b></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty" style="padding:28px"><span class="ic">${ic('insights')}</span><h3>لا توجد إحصائيات بعد</h3><p>انشر من التقويم عبر الحسابات المربوطة، أو انتظر حتى تُزامَن منشوراتك الحالية.</p></div>`}</div>
      <div class="stack s4">
        <div class="card"><div class="card-h"><h3>حسب المنصة</h3></div>${Object.keys(byPlat).length ? `<div class="rows">${Object.entries(byPlat).map(([k, x]) => `<div class="row-i"><div class="t"><b>${esc(PLAT_L[k] || k)}</b><small>${x.n} منشور · وصول ${short(x.reach)}</small></div><b class="tnum">${(x.er / x.n).toFixed(1)}%</b></div>`).join('')}</div>` : '<p class="muted sm">—</p>'}</div>
        <div class="card"><div class="card-h"><h3>الأفضل تفاعلاً</h3></div>${top.length ? `<div class="rows">${top.map((x, i) => `<div class="row-i"><span class="ic" style="width:26px;height:26px;border-radius:8px;font-size:12px">${i + 1}</span><div class="t"><b class="sm">${esc(x.text.slice(0, 60))}</b><small>${esc(PLAT_L[x.platform] || x.platform)} · ${Number(x.engagementRate || 0).toFixed(1)}%</small></div></div>`).join('')}</div>` : '<p class="muted sm">—</p>'}</div>
      </div>
    </div>`);
  $('#iacc', v) && ($('#iacc', v).onclick = async () => { await socialState(true); accountsModal(); });
  $('#ilearn').onclick = (e) => busy(e.currentTarget, async () => { try { await api(`/api/brands/${b.id}/insights/learn`, { method: 'POST', body: {} }); toast('تم التحليل'); PAGES.insights(); } catch (err) { toast(err.message, true); } });
};

// ================= DESIGNER (تصميم المخرج) =================
// The AI makes a clean background (no text); the platform writes the real text, logo and CTA on top
// with the brand fonts and colours (canvas), so Arabic is always correct and editable.
const DSIZE = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1920, 1080] };
const DTPL = [['bottom', 'نص أسفل الصورة'], ['top', 'شريط علوي'], ['card', 'بطاقة في الوسط'], ['split', 'نصف صورة · نصف لون'], ['clean', 'صورة فقط + شعار']];
const SPACE = { bottom: 'bottom', top: 'top', card: 'center', split: 'side', clean: '' };
const sameOrigin = (u) => (!u ? '' : /^\/api\//.test(u) || u.startsWith('data:') ? u : `/api/brands/${S.brand.id}/proxy?u=${encodeURIComponent(u)}`);
const IMGC = new Map();
function loadImg(u) {
  if (!u) return Promise.resolve(null);
  const k = sameOrigin(u);
  if (!IMGC.has(k)) IMGC.set(k, new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = k; }));
  return IMGC.get(k);
}
const lum = (hex) => { const h = String(hex || '#000').replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const onColor = (hex) => (lum(hex) > 0.45 ? '#000000' : '#FFFFFF');
function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}
function fitText(ctx, text, font, weight, maxW, startSize, maxLines) {
  let size = startSize;
  for (; size > 18; size -= 2) { ctx.font = `${weight} ${size}px "${font}", "Thmanyah Sans", system-ui, sans-serif`; const l = wrapLines(ctx, text, maxW); if (l.length <= maxLines) return { size, lines: l }; }
  ctx.font = `${weight} ${size}px "${font}", "Thmanyah Sans", system-ui, sans-serif`;
  return { size, lines: wrapLines(ctx, text, maxW).slice(0, maxLines) };
}
function drawCover(ctx, im, x, y, w, h) {
  if (!im) return;
  const r = Math.max(w / im.width, h / im.height);
  const iw = im.width * r; const ih = im.height * r;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function renderSlide(canvas, d, sl, i, n) {
  const [W, H] = DSIZE[d.aspect] || DSIZE['1:1'];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const hf = d.fontHead || 'Thmanyah Sans'; const bf = d.fontBody || hf;
  try { await Promise.all([document.fonts.load(`700 40px "${hf}"`), document.fonts.load(`400 40px "${bf}"`)]); } catch { /* fallback fonts */ }
  const [bg, logo] = await Promise.all([loadImg(sl.bg), d.showLogo ? loadImg(S.brand.logo?.url) : null]);
  const C = d.color || '#000000'; const CT = onColor(C);
  const P = Math.round(Math.min(W, H) * 0.07);
  ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#EDEDED'; ctx.fillRect(0, 0, W, H);
  const scale = { s: 0.85, m: 1, l: 1.18 }[d.size || 'm'];
  const head = (text, color, x, y, maxW, base, lines, align = 'right') => { ctx.textAlign = align; ctx.fillStyle = color; const f = fitText(ctx, text, hf, 700, maxW, Math.round(base * scale), lines); f.lines.forEach((l, k) => ctx.fillText(l, x, y + k * f.size * 1.18)); return y + (f.lines.length - 1) * f.size * 1.18 + f.size * 0.35; };
  const para = (text, color, x, y, maxW, base, lines, align = 'right') => { if (!text) return y; ctx.textAlign = align; ctx.fillStyle = color; const f = fitText(ctx, text, bf, 400, maxW, Math.round(base * scale), lines); f.lines.forEach((l, k) => ctx.fillText(l, x, y + k * f.size * 1.4)); return y + (f.lines.length - 1) * f.size * 1.4 + f.size * 0.4; };
  const pill = (text, x, y, align = 'right', inv = false) => {
    if (!text) return;
    ctx.font = `700 ${Math.round(W * 0.034 * scale)}px "${hf}", "Thmanyah Sans", sans-serif`;
    const tw = ctx.measureText(text).width; const ph = W * 0.034 * scale * 2.1; const pw = tw + ph * 1.1;
    const px = align === 'right' ? x - pw : align === 'center' ? x - pw / 2 : x;
    ctx.fillStyle = inv ? CT : C; rr(ctx, px, y, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = inv ? C : CT; ctx.textAlign = 'center'; ctx.fillText(text, px + pw / 2, y + ph * 0.66);
  };
  const t = d.template;
  if (t === 'split') {
    const land = W > H;
    const iw = land ? W * 0.5 : W; const ih = land ? H : H * 0.56;
    drawCover(ctx, bg, 0, 0, iw, ih);
    ctx.fillStyle = C; ctx.fillRect(land ? iw : 0, land ? 0 : ih, land ? W - iw : W, land ? H : H - ih);
    const x0 = W - P; const top = land ? H * 0.28 : ih + P * 1.2; const mw = (land ? W - iw : W) - P * 2;
    let y = head(sl.headline, CT, x0, top + W * 0.06, mw, W * (land ? 0.05 : 0.075), 3);
    y = para(sl.sub, CT, x0, y + W * 0.045, mw, W * (land ? 0.026 : 0.036), 3);
    pill(sl.cta, x0, y + W * 0.04, 'right', true);
  } else {
    drawCover(ctx, bg, 0, 0, W, H);
    if (t === 'bottom') {
      const g = ctx.createLinearGradient(0, H * 0.38, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.78)');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.38, W, H * 0.62);
      ctx.font = `700 ${W * 0.075}px "${hf}"`;
      const hl = fitText(ctx, sl.headline, hf, 700, W - P * 2, Math.round(W * 0.078 * scale), 3);
      const subH = sl.sub ? W * 0.04 * 3 : 0; const ctaH = sl.cta ? W * 0.08 : 0;
      let y = H - P - ctaH - subH - (hl.lines.length - 1) * hl.size * 1.18;
      y = head(sl.headline, '#FFFFFF', W - P, y, W - P * 2, W * 0.078, 3);
      y = para(sl.sub, 'rgba(255,255,255,.88)', W - P, y + W * 0.045, W - P * 2, W * 0.036, 2);
      pill(sl.cta, W - P, y + W * 0.03);
    } else if (t === 'top') {
      const bandH = H * (W > H ? 0.42 : 0.34);
      ctx.fillStyle = C; ctx.fillRect(0, 0, W, bandH);
      let y = head(sl.headline, CT, W - P, P + W * 0.08 + (d.showLogo && d.logoPos !== 'bottom' ? W * 0.02 : 0), W - P * 2 - (d.showLogo ? W * 0.16 : 0), W * 0.07, 2);
      para(sl.sub, CT, W - P, y + W * 0.045, W - P * 2, W * 0.034, 2);
      pill(sl.cta, W - P, H - P - W * 0.075);
    } else if (t === 'card') {
      const cw = W * 0.82; const cx = (W - cw) / 2;
      ctx.font = `700 ${W * 0.066}px "${hf}"`;
      const hl = fitText(ctx, sl.headline, hf, 700, cw - P * 1.4, Math.round(W * 0.066 * scale), 3);
      const ch = P * 1.4 + hl.lines.length * hl.size * 1.18 + (sl.sub ? W * 0.12 : 0) + (sl.cta ? W * 0.1 : 0);
      const cy = (H - ch) / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 40; ctx.fillStyle = 'rgba(255,255,255,.94)'; rr(ctx, cx, cy, cw, ch, W * 0.035); ctx.fill(); ctx.restore();
      let y = head(sl.headline, '#0A0A0A', W / 2, cy + P * 0.7 + hl.size, cw - P * 1.4, W * 0.066, 3, 'center');
      y = para(sl.sub, '#404040', W / 2, y + W * 0.045, cw - P * 1.4, W * 0.032, 2, 'center');
      pill(sl.cta, W / 2, y + W * 0.03, 'center');
    }
  }
  if (logo) {
    const lw = W * 0.15; const lh = (logo.height / logo.width) * lw;
    const lx = d.logoPos === 'right' ? W - P - lw : P; const ly = d.logoPos === 'bottom' ? H - P - lh : P;
    if (d.logoPlate) { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, lx - lw * 0.08, ly - lw * 0.08, lw * 1.16, lh + lw * 0.16, lw * 0.08); ctx.fill(); }
    ctx.drawImage(logo, lx, ly, lw, lh);
  }
  if (n > 1) {
    ctx.font = `700 ${W * 0.026}px "${hf}", sans-serif`; ctx.textAlign = 'left'; ctx.direction = 'ltr';
    const txt = `${i + 1}/${n}`; const tw = ctx.measureText(txt).width + W * 0.03;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, P, H - P - W * 0.05, tw, W * 0.05, W * 0.025); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, P + W * 0.015, H - P - W * 0.015); ctx.direction = 'rtl';
  }
}
const canvasData = (c, type = 'image/png', q = 0.92) => c.toDataURL(type, q);
async function uploadData(dataUrl) { return (await api(`/api/brands/${S.brand.id}/uploads`, { method: 'POST', body: { dataUrl } })).url; }
// Any image → JPEG (videos only accept PNG/JPEG; also fixes webp/heic/gif)
async function toJpeg(src, max = 1920) {
  const im = await (typeof src === 'string' ? loadImg(src) : new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = URL.createObjectURL(src); }));
  if (!im) throw new Error('تعذّرت قراءة الصورة. جرّب صيغة أخرى (JPG أو PNG).');
  const r = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

function brandFonts() { const f = S.brand.visual?.fonts || {}; return { head: f.heading || 'Thmanyah Sans', body: f.body || f.heading || 'Thmanyah Sans' }; }
// opts: { aspect, slides:[{headline,sub,cta,prompt,bg}], productId, from, template, onSave(items), auto }
function designer(opts = {}) {
  const b = S.brand;
  const fonts = brandFonts();
  if (fonts.head !== 'Thmanyah Sans') loadGFonts([fonts.head, fonts.body]);
  const d = {
    aspect: opts.aspect || '4:5', template: opts.template || 'bottom', color: (b.visual?.colors || [])[0] || '#000000',
    showLogo: Boolean(b.logo?.url) && opts.showLogo !== false, logoPos: 'left', logoPlate: false, size: 'm',
    fontHead: fonts.head, fontBody: fonts.body, productId: opts.productId || '', useProduct: Boolean(opts.productId), useColors: true,
    slides: (opts.slides && opts.slides.length ? opts.slides : [{ headline: '', sub: '', cta: '', prompt: '' }]).map((x) => ({ headline: x.headline || '', sub: x.sub || '', cta: x.cta || '', prompt: x.prompt || '', bg: x.bg || '' })),
    cur: 0,
  };
  const prods = b.products.filter((p) => p.kind !== 'service');
  modal(`<div class="flex"><h2 class="grow">تصميم ${d.slides.length > 1 ? `كاروسيل (${d.slides.length} شرائح)` : 'المنشور'}</h2><span class="muted xs">النص والشعار يُكتبان بخط براندك، والخلفية بالذكاء الاصطناعي</span></div>
    <div class="dz mt12"><div class="dz-prev"><div class="dz-stage"><canvas id="dzc"></canvas><div class="dz-busy" id="dzb" hidden><span class="spin"></span><span id="dzbt">يصمم الخلفية…</span></div></div>
      ${d.slides.length > 1 ? `<div class="dz-strip" id="dzs"></div>` : ''}</div>
      <div class="dz-ctl">
        <span class="lbl" style="margin-top:0">القالب</span><div class="opts" id="dzt">${DTPL.map(([k, l]) => `<button class="opt ${d.template === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
        <span class="lbl">المقاس</span><div class="opts" id="dza">${[['1:1', 'مربع'], ['4:5', 'عمودي'], ['9:16', 'ستوري'], ['16:9', 'عرضي']].map(([k, l]) => `<button class="opt ${d.aspect === k ? 'on' : ''}" data-a="${k}">${l}</button>`).join('')}</div>
        <div class="flex mt12"><span class="lbl grow" style="margin:0">النصوص <span class="muted xs" id="dzn"></span></span><button class="btn ghost sm" id="dzcopy" data-busy="يكتب…">${ic('sparkle')}اكتبها لي</button></div>
        <input class="field mt8" id="dzh" placeholder="العنوان الكبير (حتى 7 كلمات)">
        <textarea class="field mt8" id="dzsub" rows="2" placeholder="نص قصير داعم (اختياري)"></textarea>
        <input class="field mt8" id="dzcta" placeholder="زر الدعوة للإجراء (اختياري): اطلب الآن">
        <span class="lbl">الخلفية</span>
        <textarea class="field" id="dzp" rows="3" data-enhance="image" placeholder="ماذا تُظهر الصورة؟ مثلاً: المنتج على طاولة رخامية بإضاءة صباحية"></textarea>
        <div class="flex wrap mt8" style="gap:8px">
          ${prods.length ? `<div class="sel" style="min-width:160px;flex:1"><button class="sel-btn" id="dzprod" data-menu><span class="lab">${esc(prods.find((p) => p.id === d.productId)?.name || 'بدون منتج')}</span>${ic('chev')}</button></div>` : ''}
          <label class="flex xs" style="cursor:pointer"><input type="checkbox" class="check" id="dzcol" checked>ألوان البراند في الصورة</label>
        </div>
        <div class="flex wrap mt8" style="gap:8px"><button class="btn primary sm" id="dzgen" data-busy="يصمم…">${ic('sparkle')}صمّم الخلفية</button>${d.slides.length > 1 ? `<button class="btn grey sm" id="dzall" data-busy="…">${ic('sparkle')}كل الشرائح</button>` : ''}
          <label class="btn grey sm" data-drop style="cursor:pointer">${ic('upload')}ارفع صورة<input type="file" id="dzup" accept="image/*" hidden></label><button class="btn ghost sm" id="dzgal">${ic('studio')}من المعرض</button></div>
        <span class="lbl">العناصر</span>
        <div class="flex wrap" style="gap:12px">${b.logo?.url ? `<label class="flex sm" style="cursor:pointer"><input type="checkbox" class="check" id="dzlogo" ${d.showLogo ? 'checked' : ''}>الشعار</label>
          <div class="opts" id="dzlp">${[['left', 'يسار'], ['right', 'يمين'], ['bottom', 'أسفل']].map(([k, l]) => `<button class="opt ${d.logoPos === k ? 'on' : ''}" data-lp="${k}" style="height:30px">${l}</button>`).join('')}</div>
          <label class="flex sm" style="cursor:pointer"><input type="checkbox" class="check" id="dzplate">خلفية بيضاء للشعار</label>` : `<span class="muted xs">لا يوجد شعار. ارفعه من عقل البراند ← الهوية البصرية.</span>`}</div>
        <span class="lbl">اللون الأساسي</span><div class="flex wrap" id="dzcolors" style="gap:8px">${[...new Set([...(b.visual?.colors || []), '#000000', '#FFFFFF'])].slice(0, 8).map((c) => `<button class="swatch-btn ${c === d.color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
        <span class="lbl">حجم النص</span><div class="opts" id="dzsz">${[['s', 'صغير'], ['m', 'متوسط'], ['l', 'كبير']].map(([k, l]) => `<button class="opt ${d.size === k ? 'on' : ''}" data-sz="${k}">${l}</button>`).join('')}</div>
        <p class="xs muted mt12">الخط: ${esc(d.fontHead)}${d.fontBody !== d.fontHead ? ` + ${esc(d.fontBody)}` : ''} · تغيّره من عقل البراند ← الخطوط.</p>
      </div></div>
    <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn grey" id="dzdl">${ic('download')}تحميل PNG</button><button class="btn primary" id="dzsave" data-busy="يحفظ…">${ic('check')}حفظ التصميم</button></div>`, (m) => {
    m.classList.add('wide');
    const cv = $('#dzc', m);
    const sl = () => d.slides[d.cur];
    const sync = () => { $('#dzh', m).value = sl().headline; $('#dzsub', m).value = sl().sub; $('#dzcta', m).value = sl().cta; $('#dzp', m).value = sl().prompt; $('#dzn', m).textContent = d.slides.length > 1 ? `· الشريحة ${d.cur + 1}` : ''; };
    let tick = 0;
    const draw = async () => {
      const my = ++tick;
      const c = document.createElement('canvas');
      await renderSlide(c, d, sl(), d.cur, d.slides.length);
      if (my !== tick) return;
      cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0);
      const st = $('#dzs', m);
      if (st) st.innerHTML = d.slides.map((x, i) => `<button class="dz-th ${i === d.cur ? 'on' : ''}" data-i="${i}" title="${esc(x.headline)}">${x.bg ? `<img src="${esc(sameOrigin(x.bg))}" alt="">` : ''}<b>${i + 1}</b></button>`).join(''), $$('[data-i]', st).forEach((x) => (x.onclick = () => { d.cur = Number(x.dataset.i); sync(); draw(); }));
    };
    const busyOn = (t2) => { $('#dzb', m).hidden = !t2; if (t2) $('#dzbt', m).textContent = t2; };
    $('[data-x]', m).onclick = closeModal;
    $$('[data-t]', m).forEach((x) => (x.onclick = () => { d.template = x.dataset.t; $$('[data-t]', m).forEach((y) => y.classList.toggle('on', y === x)); draw(); }));
    $$('[data-a]', m).forEach((x) => (x.onclick = () => { d.aspect = x.dataset.a; $$('[data-a]', m).forEach((y) => y.classList.toggle('on', y === x)); draw(); }));
    $$('[data-lp]', m).forEach((x) => (x.onclick = () => { d.logoPos = x.dataset.lp; $$('[data-lp]', m).forEach((y) => y.classList.toggle('on', y === x)); draw(); }));
    $$('[data-sz]', m).forEach((x) => (x.onclick = () => { d.size = x.dataset.sz; $$('[data-sz]', m).forEach((y) => y.classList.toggle('on', y === x)); draw(); }));
    $$('[data-c]', m).forEach((x) => (x.onclick = () => { d.color = x.dataset.c; $$('[data-c]', m).forEach((y) => y.classList.toggle('on', y === x)); draw(); }));
    $('#dzlogo', m) && ($('#dzlogo', m).onchange = (e) => { d.showLogo = e.target.checked; draw(); });
    $('#dzplate', m) && ($('#dzplate', m).onchange = (e) => { d.logoPlate = e.target.checked; draw(); });
    $('#dzcol', m).onchange = (e) => { d.useColors = e.target.checked; };
    let to;
    [['#dzh', 'headline'], ['#dzsub', 'sub'], ['#dzcta', 'cta'], ['#dzp', 'prompt']].forEach(([sel, k]) => ($(sel, m).oninput = (e) => { sl()[k] = e.target.value; if (k !== 'prompt') { clearTimeout(to); to = setTimeout(draw, 120); } }));
    $('#dzprod', m) && ($('#dzprod', m).onclick = (e) => openMenu(e.currentTarget, [{ label: 'بدون منتج', selected: !d.productId, onClick: () => { d.productId = ''; $('#dzprod .lab', m).textContent = 'بدون منتج'; } }, ...prods.map((p) => ({ label: p.name, desc: p.photo ? 'صورة المنتج تُستعمل كمرجع' : 'ينقصه صورة', selected: d.productId === p.id, onClick: () => { d.productId = p.id; $('#dzprod .lab', m).textContent = p.name; } }))]));
    const genBg = async (i) => {
      const s2 = d.slides[i];
      const prompt = (s2.prompt || s2.headline || '').trim();
      if (!prompt) throw new Error('اكتب ماذا تُظهر الصورة');
      const prod = b.products.find((p) => p.id === d.productId);
      if (prod && prod.kind !== 'service' && !prod.photo) { closeModal(); return productPhotoModal(prod, () => designer({ ...opts, slides: d.slides, aspect: d.aspect, template: d.template, productId: d.productId })); }
      const img = await api(`/api/brands/${b.id}/images`, { method: 'POST', body: { prompt, aspect: d.aspect, productId: d.productId || undefined, useColors: d.useColors, space: SPACE[d.template], style: 'none', from: opts.from, ai: aiOf('image') } });
      s2.bg = img.url; S.images = null;
    };
    $('#dzgen', m).onclick = () => busy($('#dzgen', m), async () => { busyOn('يصمم الخلفية… حتى دقيقة'); try { await genBg(d.cur); await draw(); } catch (err) { toast(err.message, true); } busyOn(''); });
    $('#dzall', m) && ($('#dzall', m).onclick = () => busy($('#dzall', m), async () => {
      for (let i = 0; i < d.slides.length; i++) { if (d.slides[i].bg) continue; d.cur = i; sync(); busyOn(`يصمم الشريحة ${i + 1} من ${d.slides.length}…`); try { await genBg(i); } catch (err) { toast(`الشريحة ${i + 1}: ${err.message}`, true); } await draw(); }
      busyOn('');
    }));
    $('#dzup', m).onchange = async (e) => { busyOn('يرفع…'); try { sl().bg = await uploadData(await toJpeg(e.target.files[0], 2400)); await draw(); } catch (err) { toast(err.message, true); } busyOn(''); };
    $('#dzgal', m).onclick = async (e) => {
      if (!S.images) { try { S.images = (await api(`/api/brands/${b.id}/images`)).images; } catch { S.images = []; } }
      const items = [...b.products.filter((p) => p.photo).map((p) => ({ label: `منتج: ${p.name}`, onClick: () => { sl().bg = p.photo; draw(); } })), ...S.images.filter((x) => x.kind !== 'design').slice(0, 30).map((im) => ({ label: (im.prompt || 'صورة').slice(0, 50), desc: im.aspect, onClick: () => { sl().bg = im.url; draw(); } }))];
      if (!items.length) return toast('المعرض فارغ', true);
      openMenu(e.currentTarget, items);
    };
    $('#dzcopy', m).onclick = () => busy($('#dzcopy', m), async () => {
      try {
        const r = await api(`/api/brands/${b.id}/design/copy`, { method: 'POST', body: { idea: d.slides.map((x) => x.prompt || x.headline).filter(Boolean).join(' / ') || opts.idea || '', productId: d.productId, slides: d.slides.length, ai: aiOf('text') } });
        r.slides.forEach((x, i) => { if (d.slides[i]) Object.assign(d.slides[i], { headline: x.headline, sub: x.sub, cta: i === d.slides.length - 1 || d.slides.length === 1 ? x.cta : d.slides[i].cta, prompt: d.slides[i].prompt || x.prompt }); });
        sync(); draw();
      } catch (err) { toast(err.message, true); }
    });
    $('#dzdl', m).onclick = async () => { const c = document.createElement('canvas'); await renderSlide(c, d, sl(), d.cur, d.slides.length); const a = document.createElement('a'); a.href = canvasData(c); a.download = `${b.name}-design-${d.cur + 1}.png`; a.click(); };
    $('#dzsave', m).onclick = () => busy($('#dzsave', m), async () => {
      try {
        if (d.slides.some((x) => !x.bg) && !(await confirmBox('بعض الشرائح بدون خلفية', 'سيُحفظ التصميم بخلفية رمادية في هذه الشرائح. تكمل؟', 'حفظ'))) return;
        const saved = [];
        for (let i = 0; i < d.slides.length; i++) {
          const c = document.createElement('canvas');
          await renderSlide(c, d, d.slides[i], i, d.slides.length);
          const url = await uploadData(canvasData(c, 'image/jpeg', 0.92));
          saved.push(await api(`/api/brands/${b.id}/images/design`, { method: 'POST', body: { url, aspect: d.aspect, prompt: d.slides[i].prompt, productId: d.productId || null, from: opts.from || null, design: { ...d, cur: i, slides: undefined, slide: d.slides[i], index: i, total: d.slides.length } } }));
        }
        S.images = null; closeModal(); toast(saved.length > 1 ? `حُفظت ${saved.length} شرائح في المعرض` : 'حُفظ التصميم في المعرض');
        opts.onSave && opts.onSave(saved, d);
      } catch (err) { toast(err.message, true); }
    });
    sync(); draw();
    if (opts.auto && !sl().bg && sl().prompt) $('#dzgen', m).click();
  });
}

// ---------- approvals (4 gates) ----------
const GATES = { 1: ['البوابة 1 · البراند', 'brain'], 2: ['البوابة 2 · المفهوم والمحتوى', 'create'], 3: ['البوابة 3 · التصميم', 'studio'], 4: ['البوابة 4 · النشر', 'calendar'] };
const AKIND = { brand: 'عقل البراند', opportunity: 'فرصة من البحث', content: 'محتوى مكتوب', design: 'تصميم', post: 'منشور مجدول' };
PAGES.approvals = async () => {
  if (needBrand()) return header();
  const b = S.brand;
  S.af = S.af || 'pending';
  header(pills('af', [['pending', 'بانتظار قرارك'], ['approved', 'موافَق'], ['rejected', 'مرفوض'], ['all', 'الكل']], S.af));
  const A = await api(`/api/brands/${b.id}/approvals`);
  if (S.page !== 'approvals') return;
  const list = A.items.filter((x) => S.af === 'all' || x.status === S.af);
  const card = (x) => `<div class="inset appr ${x.status}" data-k="${x.kind}" data-i="${x.id}" ${x.batch ? `data-b="${x.batch}"` : ''}>
    <div class="flex">${x.image ? `<img src="${esc(x.image)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none">` : ''}<div class="grow"><div class="flex wrap" style="gap:6px">${chip(AKIND[x.kind], '', false)}${x.meta?.platform ? chip(PLAT_L[x.meta.platform] || x.meta.platform, '', false) : ''}${x.meta?.best ? chip('الأفضل', 'em', false) : ''}${x.meta?.funnel ? chip(FUNNEL[x.meta.funnel] || x.meta.funnel, 'vi', false) : ''}</div>
      <b class="sm" style="display:block;margin-top:6px">${esc(x.title || '—')}</b>${x.detail ? `<p class="xs sec mt8">${esc(x.detail)}</p>` : ''}</div></div>
    <div class="flex mt12">${x.status === 'approved' ? chip('موافَق', 'em') : x.status === 'rejected' ? chip('مرفوض', 'ro') : chip('بانتظار قرارك', 'am')}<span class="grow"></span>
      ${x.status !== 'approved' ? `<button class="btn primary sm" data-dec="approved">${ic('check')}موافقة</button>` : ''}${x.status !== 'rejected' ? `<button class="btn grey sm" data-dec="rejected">${ic('x')}رفض</button>` : ''}</div></div>`;
  const v = view(`<div class="grid c4 mb16">${[['pending', 'بانتظار قرارك', 'am'], ['approved', 'موافَق', 'em'], ['rejected', 'مرفوض', 'ro']].map(([k, l]) => `<div class="card stat ${k === 'pending' && A.counts.pending ? 'feature' : ''}"><span class="sec sm">${l}</span><div class="num">${A.counts[k]}</div></div>`).join('')}
    <div class="card stat"><span class="sec sm">كل القرارات</span><div class="num">${A.items.length}</div></div></div>
    ${[1, 2, 3, 4].map((g) => { const rows = list.filter((x) => x.gate === g); return `<div class="card mb16"><div class="card-h"><h3>${GATES[g][0]}</h3><div class="end"><span class="muted xs">${rows.length}</span><button class="btn ghost sm" data-go="${GATES[g][1]}">فتح</button></div></div>
      ${rows.length ? `<div class="grid c2">${rows.slice(0, 40).map(card).join('')}</div>` : `<p class="muted sm">لا شيء هنا${S.af === 'pending' ? ' بانتظار قرارك' : ''}.</p>`}</div>`; }).join('')}`);
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
  $$('[data-dec]', v).forEach((btn) => (btn.onclick = () => busy(btn, async () => {
    const el = btn.closest('[data-k]'); const k = el.dataset.k; const id = el.dataset.i; const st = btn.dataset.dec;
    try {
      if (k === 'brand') { S.brand = await api(`/api/brands/${b.id}`, { method: 'PATCH', body: { gate1: st === 'approved' } }); }
      if (k === 'opportunity') await api(`/api/brands/${b.id}/research/opportunities/${id}`, { method: 'PATCH', body: { status: st } });
      if (k === 'content') await api(`/api/brands/${b.id}/batches/${el.dataset.b}/items/${id}`, { method: 'PATCH', body: { status: st } });
      if (k === 'design') await api(`/api/brands/${b.id}/batches/${el.dataset.b}/items/${id}`, { method: 'PATCH', body: { designStatus: st } });
      if (k === 'post') await api(`/api/brands/${b.id}/schedule/${id}`, { method: 'PATCH', body: { status: st === 'approved' ? 'scheduled' : 'rejected' } });
      S.ov = null; S.batches = null; PAGES.approvals();
    } catch (err) { toast(err.message, true); }
  })));
};

// ---------- setup (database not connected yet) ----------
function renderSetup(st) {
  $('#root').innerHTML = `<div class="login"><div class="box" style="max-width:560px">
    <div class="logo"><div class="logo-mark"><i></i></div><div><b>Marketing OS</b><small>إعداد أول مرة</small></div></div>
    <h1>اربط قاعدة البيانات</h1><p class="muted sm">المنصة تعمل، لكن تحتاج مكاناً تحفظ فيه البراندات والمفاتيح والمحتوى. خطوة واحدة في Vercel (مجانية):</p>
    <div class="rows mt16">${[
      ['افتح مشروع marketing-os في Vercel ← تبويب Storage', st.db],
      ['Create Database ← اختر Upstash for Redis (Free) ← Connect', st.db],
      ['(اختياري) Create ← Blob لحفظ الصور والصوت', st.blob],
      ['Deployments ← Redeploy، ثم حدّث هذه الصفحة', st.db],
    ].map(([t, ok], i) => `<div class="row-i"><span class="ic" style="width:26px;height:26px;border-radius:8px;font-size:12px">${ok ? '✓' : i + 1}</span><div class="t"><small style="color:var(--text)">${t}</small></div></div>`).join('')}</div>
    ${st.error ? `<p class="xs mt12" style="color:#E11D48">${esc(st.error)}</p>` : ''}
    <button class="btn primary mt16" style="width:100%" onclick="location.reload()">${ic('refresh')}تحقق مرة أخرى</button>
  </div></div>`;
}

// ---------- coming soon ----------
for (const [k, [phase, text]] of Object.entries(SOON)) {
  PAGES[k] = () => {
    header(chip(`المرحلة ${phase}`, 'vi'));
    view(`<div class="empty"><span class="ic">${ic(k)}</span><h3>${esc(TITLES[k][0])} · قريباً</h3><p>${esc(text)}</p><button class="btn grey" data-go="home">العودة للوحة القيادة</button></div>`);
    $('[data-go]').onclick = () => go('home');
  };
}

// A finished background task must never draw its page on top of another page.
for (const k of Object.keys(PAGES)) { const f = PAGES[k]; PAGES[k] = (...a) => (S.page === k ? f(...a) : undefined); }
drawStudio = ((f) => (...a) => (S.page === 'studio' ? f(...a) : undefined))(drawStudio);
drawVideo = ((f) => (...a) => (S.page === 'studio' ? f(...a) : undefined))(drawVideo);
drawVoice = ((f) => (...a) => (S.page === 'voice' ? f(...a) : undefined))(drawVoice);
drawPlan = ((f) => (...a) => (S.page === 'create' ? f(...a) : undefined))(drawPlan);
drawBatch = ((f) => (...a) => (S.page === 'create' ? f(...a) : undefined))(drawBatch);
drawBatches = ((f) => (...a) => (S.page === 'create' ? f(...a) : undefined))(drawBatches);
drawProviders = ((f) => (...a) => (S.page === 'providers' ? f(...a) : undefined))(drawProviders);

// ---------------- boot ----------------
async function boot() {
  let s;
  try { s = await api('/api/session'); } catch { s = { authenticated: false }; }
  if (!s.authenticated) return renderLogin();
  S.authed = true;
  S.user = s.user;
  S.storage = s.storage;
  if (!s.storage?.db) return renderSetup(s.storage || {});
  try { S.brands = (await api('/api/brands')).brands; } catch (e) { S.brands = []; toast(e.message, true); }
  if (!S.brands.some((b) => b.id === S.activeId)) S.activeId = S.brands[0]?.id || '';
  await setBrand(S.activeId, { silent: true });
  renderShell();
  const sq = new URLSearchParams(location.search).get('social');
  if (sq) { const acc = new URLSearchParams(location.search).get('acc'); history.replaceState(null, '', '/' + location.hash); setTimeout(() => toast(sq === 'ok' ? `تم ربط الحساب ${acc ? '@' + acc : ''} ✓` : `تعذّر الربط: ${sq}`, sq !== 'ok'), 300); }
  const gq = new URLSearchParams(location.search).get('google');
  if (gq) { history.replaceState(null, '', '/' + location.hash); setTimeout(() => toast(gq === 'ok' ? 'تم ربط حساب Google ✓' : gq, gq !== 'ok'), 300); }
  go(location.hash.slice(1) || 'home', { replace: true });
  document.fonts?.ready.then(() => placePills());
}
boot();
})();
