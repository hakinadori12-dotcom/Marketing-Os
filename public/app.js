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

async function busy(btn, fn) {
  if (!btn || btn.disabled) return fn();
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span>${btn.dataset.busy || ''}`;
  try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; } }
}

// ---------------- state ----------------
const S = {
  authed: false, user: null, page: 'home', brands: [], activeId: store.get('mos-brand', ''), brand: null,
  ov: null, brainTab: 'identity', keys: null, keyFilter: 'all', keyQuery: '', keySel: new Set(), keyLimit: 50,
  voices: null, models: null, audio: null, voiceId: store.get('mos-voice', ''), voiceQuery: '', tts: { modelId: 'eleven_multilingual_v2', stability: 0.5, similarity: 0.75, style: 0, speed: 1, text: '' },
  analysis: null, sys: null, textTest: null, storage: null,
  ctab: 'new', stab: 'image', mcache: {}, pick: (() => { try { return JSON.parse(store.get('mos-pick', '{}')) || {}; } catch { return {}; } })(), opts: null, prov: null, batches: null, batch: null, plan: null, planMonths: [], images: null,
  form: { platforms: ['instagram'], type: 'post', goal: 'engagement', dialect: 'darija', framework: 'auto', count: 3, idea: '', productId: '', occasion: '' },
  planForm: { month: '', perWeek: 4, platforms: ['instagram', 'facebook'], goal: 'engagement', dialect: 'darija' },
  img: { prompt: '', aspect: '1:1', style: 'photo', useLogo: false, useColors: true, text: '', quality: 'medium' },
};

const NAV = [
  ['g', 'Workspace'], ['home', 'لوحة القيادة'], ['brands', 'البراندات'], ['brain', 'عقل البراند'],
  ['g', 'Create'], ['create', 'إنشاء المحتوى'], ['studio', 'الاستوديو'], ['voice', 'التعليق الصوتي'],
  ['g', 'Strategy'], ['research', 'بحث المنافسين', 4], ['approvals', 'الموافقات', 3], ['calendar', 'التقويم والنشر', 3], ['insights', 'الأداء والتعلّم', 4],
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
  research: ['بحث المنافسين', 'كل منافس في Google Sheet خاص به'],
  approvals: ['الموافقات', 'لا شيء يُنشر قبل موافقتك'],
  calendar: ['التقويم والنشر', 'الجدولة على كل المنصات'],
  insights: ['الأداء والتعلّم', 'النظام يتعلّم من كل منشور'],
};
const SOON = {
  research: [4, 'اكتشاف المنافسين، بحث معمّق لكل منافس (Brand DNA، السوشال، الإعلانات، Funnels) في Google Sheet خاص، ثم الفرص.'],
  approvals: [3, 'أربع بوابات: البراند، المفهوم، التصميم، النشر. البوابة الأولى تعمل الآن من صفحة عقل البراند.'],
  calendar: [3, 'تقويم شهري، جدولة على إنستغرام وفيسبوك وتيك توك ولينكدإن، وحماية من النشر المكرر.'],
  insights: [4, 'الوصول والتفاعل والنقرات لكل منشور، ثم ماذا تعلّم النظام وما يوصي به للمحتوى القادم.'],
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

// ---------------- modal ----------------
function modal(html, onMount) {
  closeModal();
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.id = 'modal';
  w.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  w.addEventListener('mousedown', (e) => { if (e.target === w) closeModal(); });
  document.body.append(w);
  onMount && onMount($('.modal', w));
  const f = $('input,textarea', w);
  f && setTimeout(() => f.focus(), 30);
}
function closeModal() { $('#modal')?.remove(); }
function confirmBox(title, text, okLabel = 'تأكيد', danger = false) {
  return new Promise((resolve) => {
    modal(`<h2>${esc(title)}</h2><p class="sec mt8">${esc(text)}</p><div class="foot"><button class="btn ghost" data-no>إلغاء</button><button class="btn primary" data-yes style="${danger ? 'background:#E11D48;color:#fff' : ''}">${esc(okLabel)}</button></div>`, (m) => {
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

function renderShell() {
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
        <div class="userrow"><span class="av" style="background:var(--btn);color:var(--btn-text)">${esc((S.user?.name || 'ح').charAt(0))}</span><span class="grow sm">${esc(S.user?.name || '')}</span><button class="btn grey icon sm" id="logout" title="خروج">${ic('logout', 'rtl-flip')}</button></div>
      </div>
    </aside>
    <div class="backdrop" id="bd" hidden></div>
    <main class="main"><header class="head" id="head"></header><div id="view"></div></main>
  </div>`;
  $('[data-pills="theme"]').style.display = 'flex';
  $$('[data-pills="theme"] button').forEach((x) => (x.style.flex = '1'));
  $$('#nav a').forEach((a) => { a.onclick = () => go(a.dataset.p); a.onkeydown = (e) => { if (e.key === 'Enter') go(a.dataset.p); }; });
  $('#brandBtn').onclick = (e) => brandMenu(e.currentTarget);
  $('#logout').onclick = async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.hash = ''; renderLogin(); };
  $('#bd').onclick = () => toggleSide(false);
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
  if (key === 'theme') { document.documentElement.dataset.theme = v; store.set('mos-theme', v); }
  if (key === 'brain') { S.brainTab = v; PAGES.brain(); }
  if (key === 'kf') { S.keyFilter = v; S.keyLimit = 50; drawKeys(); }
  if (key === 'ctab') { S.ctab = v; S.batch = null; PAGES.create(); }
  if (key === 'aspect') S.img.aspect = v;
  if (key === 'stab') { S.stab = v; PAGES.studio(); }
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
  <div class="entity-foot">${b ? (b.gate1?.approved ? chip('بوابة 1 معتمدة', 'em') : chip('بوابة 1 بانتظار موافقتك', 'am')) : ''}${ov.providers.text ? chip(`الكتابة: ${ov.providers.text.provider}`, '', false) : chip('لا يوجد مفتاح AI', 'am')}<span class="grow"></span>
    ${b ? `<button class="btn ghost sm" data-go="studio">الاستوديو</button><button class="btn primary sm" data-go="${target}">${label}</button>` : `<button class="btn primary sm" id="hb2">${ic('plus')}براند جديد</button>`}</div></div>

  <div class="grid c4 mb16">
    ${[['create', 'دفعات محتوى', fmt(ov.usage.content), `${fmt(ov.usage.plan)} خطة شهرية · 14 يوم`],
       ['studio', 'صور مولّدة', fmt(ov.usage.image), 'آخر 14 يوماً'],
       ['voice', 'تعليقات صوتية', fmt(ov.usage.tts), `${short(ov.usage.chars)} حرف`],
       ['plug', 'مزوّدون مربوطون', fmt(ov.providers.connected), `${fmt(ov.keys.active)} مفتاح ElevenLabs نشط`]]
      .map(([i, l, n, d]) => `<div class="card stat"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div><span class="muted xs">${d}</span></div>`).join('')}
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
  return `<div class="grid c12"><div class="card s8"><div class="card-h"><h3>المنتجات والخدمات</h3><div class="end"><span class="muted xs">${p.length} عنصر</span></div></div>
    ${p.length ? `<div class="tablewrap"><table><thead><tr><th>الاسم</th><th>السعر</th><th>الوصف</th><th>المصدر</th><th></th></tr></thead><tbody>
      ${p.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td class="tnum">${esc(x.price || '—')}</td><td class="sec sm">${esc(x.description || '')}</td><td>${chip(SRC[x.source]?.[0] || 'مؤكد', SRC[x.source]?.[1] || 'em')}</td>
      <td><button class="btn grey icon sm" data-delp="${x.id}" aria-label="حذف">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty" style="padding:28px"><span class="ic">${ic('studio')}</span><h3>لا توجد منتجات بعد</h3><p>أضف منتجاتك يدوياً أو استخرجها من الموقع عبر التحليل الذكي.</p></div>`}
  </div>
  <div class="card s4"><div class="card-h"><h3>إضافة منتج</h3></div>
    <label class="lbl" style="margin-top:0">الاسم</label><input class="field" id="pn">
    <label class="lbl">السعر</label><input class="field" id="pp" placeholder="مثلاً: 189 درهم">
    <label class="lbl">وصف قصير</label><textarea class="field" id="pd" rows="3"></textarea>
    <button class="btn primary mt16" style="width:100%" id="padd">${ic('plus')}إضافة</button></div></div>`;
}

function brainVisual() {
  const b = S.brand;
  const colors = b.visual?.colors || [];
  return `<div class="grid c12">
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
      <div class="card"><div class="card-h"><h3>خط البراند</h3><div class="end">${chip('Thmanyah Sans', '', false)}</div></div>
        <div style="font-size:40px;font-weight:700;line-height:1.15">أبجد هوز Aa 123</div>
        <div class="flex wrap mt12" style="gap:14px">${[[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [700, 'Bold'], [900, 'Black']].map(([w, n]) => `<span style="font-weight:${w};font-size:18px">ثمانية <small class="muted xs" style="font-weight:400">${n}</small></span>`).join('')}</div>
      </div>
    </div></div>`;
}

function brainAnalyze() {
  const a = S.analysis;
  const b = S.brand;
  const res = !a ? '' : `<div class="card mt16"><div class="card-h"><h3>النتيجة</h3>${a.site ? `<div class="end"><span class="muted xs ltr">${esc(a.site.url)}</span></div>` : ''}</div>
    <p class="muted sm mb16">اختر ما تريد حفظه. الحقول التي فيها قيمة الآن غير محددة مسبقاً حتى لا تُستبدل.</p>
    ${b.fieldDefs.filter(([k]) => a.fields[k]).map(([k, l]) => `<label class="prop" style="cursor:pointer"><span class="k"><input type="checkbox" class="check" data-af="${k}" ${b.fields[k]?.value ? '' : 'checked'}>${esc(l)}</span>
      <span class="v"><span class="grow">${esc(a.fields[k].value)}${b.fields[k]?.value ? `<div class="muted xs mt8">الحالي: ${esc(b.fields[k].value)}</div>` : ''}</span>${chip(SRC[a.fields[k].source][0], SRC[a.fields[k].source][1])}</span></label>`).join('')}
    ${a.products.length ? `<span class="lbl">المنتجات (${a.products.length})</span><div class="rows">${a.products.map((p, i) => `<label class="row-i" style="cursor:pointer"><input type="checkbox" class="check" data-ap="${i}" ${b.products.some((x) => x.name === p.name) ? '' : 'checked'}><div class="t"><b>${esc(p.name)}</b><small>${esc([p.price, p.description].filter(Boolean).join(' · '))}</small></div></label>`).join('')}</div>` : ''}
    ${a.colors.length ? `<span class="lbl">ألوان من الموقع</span><div class="flex wrap" style="gap:10px">${a.colors.map((c) => `<label class="flex" style="cursor:pointer"><input type="checkbox" class="check" data-ac="${c}" ${(b.visual?.colors || []).includes(c) ? '' : 'checked'}><span class="swatch" style="background:${c};width:32px;height:32px"></span><span class="mono xs ltr">${c}</span></label>`).join('')}</div>` : ''}
    <div class="flex mt16" style="justify-content:flex-end"><button class="btn ghost" id="adisc">تجاهل</button><button class="btn primary" id="aapply">${ic('check')}حفظ المحدد</button></div></div>`;
  return `<div class="grid c12"><div class="card s8"><div class="card-h"><h3>التحليل الذكي</h3><div class="end" style="min-width:240px">${pickerHTML('text')}</div></div>
    <p class="muted sm">النظام يقرأ موقعك و/أو ملاحظاتك ويقترح الحقول. كل اقتراح موسوم بمصدره، ولا يُحفظ شيء قبل موافقتك.</p>
    <label class="lbl">رابط الموقع</label><input class="field ltr" id="aurl" value="${esc(b.website)}" placeholder="example.com" style="text-align:left">
    <label class="lbl">ملاحظات عن البراند (اختياري)</label><textarea class="field" id="atext" rows="4" placeholder="مثلاً: نبيع مستحضرات طبيعية بزيت الأرغان للنساء في المغرب، أسلوبنا دافئ وبالدارجة…"></textarea>
    <div class="flex mt16" style="justify-content:flex-end"><button class="btn primary" id="arun" data-busy="يحلّل…">${ic('sparkle')}تحليل</button></div>
    ${res}</div><div class="stack s4">${readinessCard()}</div></div>`;
}

function bindBrain(v) {
  const b = S.brand;
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
  $('#padd', v) && ($('#padd').onclick = (e) => busy(e.currentTarget, async () => {
    const name = $('#pn').value.trim();
    if (!name) return toast('اكتب اسم المنتج', true);
    try { await patchBrand({ products: [...b.products, { name, price: $('#pp').value, description: $('#pd').value, source: 'confirmed' }] }); toast('تمت الإضافة'); } catch (err) { toast(err.message, true); }
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
  // analyze
  $('#arun', v) && ($('#arun').onclick = (e) => busy(e.currentTarget, async () => {
    try {
      S.analysis = await api(`/api/brands/${b.id}/analyze`, { method: 'POST', body: { url: $('#aurl').value.trim(), text: $('#atext').value, ai: aiOf('text') } });
      if (!Object.keys(S.analysis.fields).length && !S.analysis.products.length) toast('لم أجد معلومات كافية. أضف ملاحظات عن البراند.', true);
      PAGES.brain();
    } catch (err) { toast(err.message, true); }
  }));
  $('#adisc', v) && ($('#adisc').onclick = () => { S.analysis = null; PAGES.brain(); });
  $('#aapply', v) && ($('#aapply').onclick = (e) => busy(e.currentTarget, async () => {
    const a = S.analysis;
    const fields = {};
    $$('[data-af]:checked', v).forEach((c) => (fields[c.dataset.af] = a.fields[c.dataset.af]));
    const products = $$('[data-ap]:checked', v).map((c) => a.products[Number(c.dataset.ap)]);
    const colors = $$('[data-ac]:checked', v).map((c) => c.dataset.ac);
    const body = {};
    if (Object.keys(fields).length) body.fields = fields;
    if (products.length) body.products = [...b.products, ...products];
    if (colors.length) body.visual = { colors: [...new Set([...(b.visual?.colors || []), ...colors])].slice(0, 8) };
    const url = $('#aurl').value.trim();
    if (url && url !== b.website) body.website = url;
    if (!Object.keys(body).length) return toast('لم تحدد أي شيء', true);
    try { S.analysis = null; S.brainTab = 'identity'; await patchBrand(body); toast('تم الحفظ في عقل البراند'); } catch (err) { toast(err.message, true); }
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
      .map(([i, l, n, d]) => `<div class="card stat"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div><span class="muted xs">${d}</span></div>`).join('')}
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
function drawVoice({ loading = false, pool } = {}) {
  const t = S.tts;
  const q = S.voiceQuery.trim().toLowerCase();
  const voices = (S.voices || []).filter((x) => !q || (x.name + ' ' + Object.values(x.labels || {}).join(' ')).toLowerCase().includes(q));
  if (S.voices && !S.voices.some((x) => x.id === S.voiceId)) S.voiceId = S.voices[0]?.id || '';
  const model = S.models.find((m) => m.id === t.modelId) || S.models[0];
  const slider = (key, label, min, max, step, val, fmtv) => `<div><div class="flex"><span class="sm sec grow">${label}</span><b class="xs tnum" id="sv-${key}">${fmtv(val)}</b></div><input type="range" data-sl="${key}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const v = view(`<div class="grid c12">
    <div class="card s7"><div class="card-h"><h3>تعليق صوتي</h3><div class="end">${chip('ElevenLabs', '', false)}${pool ? chip(`${pool.active} مفتاح · ${short(pool.remaining)} حرف`, 'em') : ''}</div></div>
      <textarea class="field" id="vt" rows="5" maxlength="5000" placeholder="اكتب النص الذي تريد تحويله إلى صوت…">${esc(t.text)}</textarea>
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
      <div class="flex mt16"><span class="lbl grow" style="margin:0">الصوت</span><div class="search ${S.voiceQuery ? 'open' : ''}" id="vs"><button aria-label="بحث">${ic('search')}</button><input placeholder="ابحث في الأصوات" value="${esc(S.voiceQuery)}"></div></div>
      <div class="voice-list mt8" id="vl">${loading ? '<div class="skel" style="height:46px"></div><div class="skel" style="height:46px"></div><div class="skel" style="height:46px"></div>' :
        voices.length ? voices.map((x) => `<div class="voice ${x.id === S.voiceId ? 'on' : ''}" data-v="${x.id}" tabindex="0">
          ${x.preview ? `<button class="play" data-pv="${x.id}" aria-label="استماع">${ic('play')}</button>` : '<span class="play" style="opacity:.3">' + ic('play') + '</span>'}
          <div class="grow"><b class="sm">${esc(x.name)}</b><div class="muted xs">${esc([x.category, ...Object.values(x.labels || {})].filter(Boolean).slice(0, 4).join(' · '))}</div></div>
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
  const ta = $('#vt', v);
  ta.oninput = () => { t.text = ta.value; $('#vc').textContent = `${ta.value.length}/5000`; $('#vcost').textContent = ta.value.length ? `سيستهلك حوالي ${fmt(ta.value.length)} حرف من رصيد المفاتيح` : ''; };
  $$('[data-sl]', v).forEach((r) => (r.oninput = () => { const k = r.dataset.sl; t[k] = Number(r.value); $(`#sv-${k}`).textContent = k === 'speed' ? Number(r.value).toFixed(2) + '×' : Math.round(r.value * 100) + '%'; }));
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
      .map(([i, l, n]) => `<div class="card stat"><div class="flex"><span class="ic">${ic(i)}</span><span class="sec sm">${l}</span></div><div class="num">${n}</div></div>`).join('')}
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
        <label class="btn grey sm mt12" style="cursor:pointer">${ic('upload')}رفع ملفات الخط<input type="file" id="fontIn" accept=".otf,.ttf,.woff,.woff2" multiple hidden></label></div>
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
    const items = kind === 'video' ? [] : [{ label: '✦ تلقائي', desc: 'يختار أفضل نموذج للمهمة، وإذا فشل يجرّب البديل وحده', selected: cur.provider === 'auto', onClick: () => { S.pick[kind] = { provider: 'auto' }; store.set('mos-pick', JSON.stringify(S.pick)); onChange && onChange(); } }, { divider: true }];
    for (const [name, list] of Object.entries(groups)) {
      if (items.length && !items[items.length - 1].divider) items.push({ divider: true });
      for (const m of list) items.push({ label: m.model, desc: name + (data.current?.provider === m.provider && data.current?.model === m.model ? ' · الافتراضي' : '') + (m.soon && kind === 'video' ? ' · قريباً' : ''), selected: cur?.provider === m.provider && cur?.model === m.model, onClick: () => { S.pick[kind] = { provider: m.provider, model: m.model }; store.set('mos-pick', JSON.stringify(S.pick)); onChange && onChange(); } });
    }
    items.push({ divider: true }, { label: 'تحديث القائمة من المزوّدين', icon: 'refresh', onClick: async () => { delete S.mcache[kind]; await loadModels(kind, true); onChange && onChange(); } });
    openMenu(btn, items, { search: data.models.length > 8, width: 340 });
  }));
}

// ---------- providers (BYOK) ----------
const KIND = { text: 'كتابة وتحليل', image: 'صور', video: 'فيديو' };
const PST = { active: ['يعمل', 'em'], saved: ['محفوظ', 'sk'], invalid: ['مرفوض', 'ro'], error: ['خطأ مؤقت', 'am'] };
async function loadProviders() { S.prov = await api('/api/providers'); S.mcache = {}; return S.prov; }
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
function bindOpts(root, state, multi = []) {
  $$('[data-opts]', root).forEach((row) => {
    const key = row.dataset.opts;
    $$('.opt', row).forEach((b) => (b.onclick = () => {
      if (multi.includes(key)) {
        const set = new Set(state[key]);
        set.has(b.dataset.k) ? set.delete(b.dataset.k) : set.add(b.dataset.k);
        if (!set.size) return toast('اختر واحدة على الأقل', true);
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
  let occ = [];
  try { occ = (await api(`/api/brands/${b.id}/occasions`)).occasions; } catch { /* optional */ }
  if (!S.batches) { try { S.batches = (await api(`/api/brands/${b.id}/batches`)).batches; } catch { S.batches = []; } }
  const v = view(`<div class="grid c12">
    <div class="card s8"><div class="card-h"><h3>ماذا نكتب اليوم؟</h3><div class="end">${pickerHTML('text')}</div></div>
      <span class="lbl" style="margin-top:0">المنتج أو الخدمة</span>
      <div class="sel"><button class="sel-btn" id="cprod" data-menu><span class="lab">${prod ? esc(prod.name) : b.products.length ? 'البراند كاملاً (بدون منتج محدد)' : 'البراند كاملاً · أضف منتجات من عقل البراند'}</span>${ic('chev')}</button></div>
      <span class="lbl">المنصات</span>${optsRow('platforms', o.PLATFORMS, f.platforms, true)}
      <span class="lbl">نوع المحتوى</span>${optsRow('type', o.TYPES, f.type)}
      <span class="lbl">الهدف</span>${optsRow('goal', o.GOALS, f.goal)}
      <div class="grid c2" style="gap:12px">
        <div><span class="lbl">اللغة / اللهجة</span>${optsRow('dialect', o.DIALECTS, f.dialect)}</div>
        <div><span class="lbl">إطار الكتابة</span>${optsRow('framework', o.FRAMEWORKS, f.framework)}</div>
      </div>
      <span class="lbl">الفكرة أو ملاحظاتك (اختياري)</span>
      <textarea class="field" id="cidea" rows="3" maxlength="1500" placeholder="مثلاً: عرض خاص 20% بمناسبة العودة للمدارس، ركّز على الجودة والتوصيل السريع…">${esc(f.idea)}</textarea>
      ${occ.length ? `<span class="lbl">مناسبات هذا الشهر</span><div class="opts" id="cocc">${occ.map((x) => `<button class="opt ${f.occasion === x.name ? 'on' : ''}" data-o="${esc(x.name)}">${esc(x.name)} <span class="muted xs ltr">${x.date.slice(5)}</span></button>`).join('')}</div>` : ''}
      <div class="flex mt16"><span class="sm sec">العدد</span><div class="pills" data-pills="count">${[1, 3, 5, 7, 10].map((n) => `<button data-v="${n}" class="${n === f.count ? 'on' : ''}">${n}</button>`).join('')}</div><span class="grow"></span>
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
  bindOpts(v, f, ['platforms']);
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
      <span class="sm sec">${esc(o.TYPES[p.type]?.split(' (')[0])} · ${esc(o.GOALS[p.goal])} · ${esc(o.DIALECTS[p.dialect])}${p.productName ? ' · ' + esc(p.productName) : ''}</span>
      <div class="end"><span class="muted xs ltr">${esc(bt.model)}</span><button class="btn grey icon sm" id="bdel" aria-label="حذف">${ic('trash')}</button></div></div>
    <div class="grid c2" style="align-items:start">${bt.items.map((it) => `<div class="card post" data-it="${it.id}">
      <div class="card-h"><span class="pf">${PLAT_IC[it.platform] || '•'}</span><h3 style="font-size:14px">${esc(it.title || o.PLATFORMS[it.platform])}</h3>
        <div class="end">${it.status === 'approved' ? chip('معتمد', 'em') : it.status === 'rejected' ? chip('مرفوض', 'ro') : chip('مسودة', '')}</div></div>
      ${it.image?.url ? `<img class="post-img" src="${esc(it.image.url)}" alt="">` : ''}
      <p class="hook">${esc(it.hook)}</p>
      <p class="cap">${esc(it.caption)}</p>
      ${it.slides?.length ? `<ol class="slides">${it.slides.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      ${it.cta ? `<p class="sm mt8"><b>CTA:</b> ${esc(it.cta)}</p>` : ''}
      ${it.hashtags?.length ? `<p class="tags">${it.hashtags.map((h) => '#' + esc(h)).join(' ')}</p>` : ''}
      <div class="inset mt12 xs"><b>فكرة البصري:</b> ${esc(it.visual)}</div>
      <div class="flex wrap mt12">
        <button class="btn grey sm" data-a="copy">${ic('copy')}نسخ</button>
        <button class="btn grey sm" data-a="edit">${ic('edit')}تعديل</button>
        <button class="btn grey sm" data-a="rewrite">${ic('refresh')}إعادة بملاحظة</button>
        <button class="btn grey sm" data-a="image" data-busy="يصمم…">${ic('studio')}${it.image ? 'صورة أخرى' : 'صمّم الصورة'}</button>
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
      if (a === 'copy') return navigator.clipboard.writeText(itemText(it)).then(() => toast('تم النسخ'), () => toast('تعذر النسخ', true));
      if (a === 'approve') return busy(btn, async () => { try { replace(await api(url(it), { method: 'PATCH', body: { status: it.status === 'approved' ? 'draft' : 'approved' } })); } catch (err) { toast(err.message, true); } });
      if (a === 'edit') return modal(`<h2>تعديل النص</h2><label class="lbl">الخطّاف</label><input class="field" id="eh" value="${esc(it.hook)}"><label class="lbl">النص</label><textarea class="field" id="ec" rows="9">${esc(it.caption)}</textarea><label class="lbl">CTA</label><input class="field" id="ecta" value="${esc(it.cta)}"><label class="lbl">الهاشتاغات</label><input class="field" id="et" value="${esc(it.hashtags.join(' '))}"><div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="es">حفظ</button></div>`, (m) => {
        $('[data-x]', m).onclick = closeModal;
        $('#es').onclick = () => busy($('#es'), async () => { try { replace(await api(url(it), { method: 'PATCH', body: { hook: $('#eh').value, caption: $('#ec').value, cta: $('#ecta').value, hashtags: $('#et').value.split(/[\s,]+/).map((x) => x.replace(/^#/, '')).filter(Boolean) } })); closeModal(); toast('تم الحفظ'); } catch (err) { toast(err.message, true); } });
      });
      if (a === 'rewrite') return modal(`<h2>إعادة الكتابة</h2><p class="muted sm mt8">قل ما تريد تغييره، والنظام يعيد كتابة هذا العنصر فقط.</p><textarea class="field mt12" id="rf" rows="4" placeholder="مثلاً: اجعله أقصر وأكثر مرحاً، وأضف سؤالاً للجمهور"></textarea>
        <div class="opts mt12">${['أقصر', 'أكثر مرحاً', 'أكثر رسمية', 'ركّز على السعر', 'أضف قصة قصيرة', 'خطّاف أقوى'].map((x) => `<button class="opt" data-q="${x}">${x}</button>`).join('')}</div>
        <div class="foot"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" id="rs" data-busy="يعيد الكتابة…">${ic('refresh')}إعادة</button></div>`, (m) => {
        $('[data-x]', m).onclick = closeModal;
        $$('[data-q]', m).forEach((q) => (q.onclick = () => { const t = $('#rf'); t.value = (t.value ? t.value + '، ' : '') + q.dataset.q; }));
        $('#rs').onclick = () => busy($('#rs'), async () => { try { const n = await api(url(it) + '/rewrite', { method: 'POST', body: { feedback: $('#rf').value, ai: aiOf('text') } }); closeModal(); replace(n); toast('تمت إعادة الكتابة'); } catch (err) { toast(err.message, true); } });
      });
      if (a === 'image') return busy(btn, async () => {
        try {
          const aspect = ['tiktok', 'snapchat'].includes(it.platform) || ['reel', 'story', 'ugc'].includes(it.type) ? '9:16' : it.platform === 'instagram' ? '4:5' : it.platform === 'x' || it.platform === 'youtube' || it.platform === 'linkedin' ? '16:9' : '1:1';
          const img = await api(`/api/brands/${S.brand.id}/images`, { method: 'POST', body: { prompt: it.imagePrompt || it.visual, aspect, style: 'none', useColors: true, from: { batch: bt.id, item: it.id }, ai: aiOf('image') } });
          S.images = null;
          replace(await api(url(it), { method: 'PATCH', body: { image: { url: img.url, id: img.id } } }));
          toast('تم تصميم الصورة');
        } catch (err) { toast(err.message, true); }
      });
    }));
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
    for (let i = 0; i < first; i++) cells.push('<div class="cd empty"></div>');
    for (let d = 1; d <= days; d++) {
      const key = `${plan.id}-${String(d).padStart(2, '0')}`;
      cells.push(`<div class="cd"><div class="flex"><b class="xs tnum">${d}</b>${occ[key] ? `<span class="occ" title="${esc(occ[key])}">${esc(occ[key])}</span>` : ''}</div>
        ${(byDate[key] || []).map((x) => `<button class="ci" data-pd="${x.id}" title="${esc(x.idea)}"><span class="pf sm">${PLAT_IC[x.platform] || '•'}</span><span>${esc(x.idea)}</span></button>`).join('')}</div>`);
    }
    while (cells.length % 7) cells.push('<div class="cd empty"></div>');
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
  header(pills('stab', [['image', 'الصور'], ['video', 'الفيديو']], S.stab));
  requestAnimationFrame(() => placePills($('#head')));
  if (!S.prov) await loadProviders().catch(() => null);
  if (S.stab === 'video') return drawVideo();
  await loadModels('image').catch(() => null);
  if (!S.mcache.image?.models.length) {
    view(`<div class="empty"><span class="ic">${ic('studio')}</span><h3>اربط مزوّد صور</h3><p>استوديو الصور يعمل بمفتاحك: Gemini (Nano Banana) أو OpenAI (GPT Image) أو xAI (Grok).</p><button class="btn primary" id="gp">${ic('plug')}المفاتيح والمزوّدون</button></div>`);
    $('#gp').onclick = () => go('providers');
    return;
  }
  if (!S.images) S.images = (await api(`/api/brands/${S.brand.id}/images`)).images;
  drawStudio();
};
function drawStudio() {
  const g = S.img;
  const b = S.brand;
  const st = aiOf('image');
  const v = view(`<div class="grid c12">
    <div class="card s5"><div class="card-h"><h3>صورة جديدة</h3></div>
      <span class="lbl" style="margin-top:0">${KIND_L.image}</span>${pickerHTML('image')}<div class="mt12"></div>
      <textarea class="field" id="ip" rows="5" maxlength="2000" placeholder="صف الصورة: المنتج، المكان، الأشخاص، الإضاءة، الإحساس… مثلاً: زجاجة زيت أرغان على طاولة خشبية في رياض مغربي، ضوء صباحي دافئ">${esc(g.prompt)}</textarea>
      <span class="lbl">المقاس</span>${pills('aspect', [['1:1', '1:1'], ['4:5', '4:5'], ['9:16', '9:16'], ['16:9', '16:9']], g.aspect)}
      <span class="lbl">الأسلوب</span><div class="opts" data-opts="style">${Object.entries(STYLE_L).map(([k, l]) => `<button class="opt ${g.style === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      <span class="lbl">نص داخل الصورة (اختياري)</span><input class="field" id="itx" maxlength="120" value="${esc(g.text)}" placeholder="مثلاً: تخفيض 20%">
      <div class="stack mt12" style="gap:8px">
        <label class="flex sm" style="cursor:pointer"><input type="checkbox" class="check" id="icol" ${g.useColors ? 'checked' : ''}>ألوان البراند ${(b.visual?.colors || []).map((c) => `<span class="dot" style="background:${c}"></span>`).join('')}</label>
        <label class="flex sm" style="cursor:pointer"><input type="checkbox" class="check" id="ilogo" ${g.useLogo ? 'checked' : ''} ${b.logo ? '' : 'disabled'}>ضع الشعار ${b.logo ? '' : '<span class="muted xs">(ارفع الشعار من عقل البراند)</span>'}</label>
      </div>
      ${st.provider === 'openai' ? `<span class="lbl">الجودة</span><div class="opts" data-opts="quality">${[['low', 'سريعة'], ['medium', 'متوسطة'], ['high', 'عالية']].map(([k, l]) => `<button class="opt ${g.quality === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="flex mt16" style="justify-content:flex-end"><button class="btn primary" id="igo" data-busy="يصمم…">${ic('sparkle')}توليد الصورة</button></div>
    </div>
    <div class="card s7"><div class="card-h"><h3>معرض ${esc(b.name)}</h3><div class="end"><span class="muted xs">${S.images.length}</span></div></div>
      ${S.images.length ? `<div class="gallery">${S.images.map((x) => `<figure data-im="${x.id}"><img src="${esc(x.url)}" alt="" loading="lazy" style="aspect-ratio:${x.aspect.replace(':', '/')}">
        <figcaption><span class="xs grow" title="${esc(x.prompt)}">${esc(x.prompt)}</span>
        <a class="btn grey icon sm" href="${esc(x.url)}" download target="_blank" rel="noopener" aria-label="تحميل">${ic('download')}</a>
        <button class="btn grey icon sm" data-re="${x.id}" aria-label="إعادة استعمال الوصف">${ic('refresh')}</button>
        <button class="btn grey icon sm" data-del="${x.id}" aria-label="حذف">${ic('trash')}</button></figcaption></figure>`).join('')}</div>`
      : `<div class="empty" style="padding:28px"><span class="ic">${ic('studio')}</span><h3>لا توجد صور بعد</h3><p>اكتب وصفاً واضغط توليد. يمكنك أيضاً تصميم صورة لأي منشور من صفحة النتائج.</p></div>`}
    </div></div>`);
  bindOpts(v, g);
  bindPicker(v, () => drawStudio());
  $('#ip', v).oninput = (e) => (g.prompt = e.target.value);
  $('#itx', v).oninput = (e) => (g.text = e.target.value);
  $('#icol', v).onchange = (e) => (g.useColors = e.target.checked);
  $('#ilogo', v).onchange = (e) => (g.useLogo = e.target.checked);
  $('#igo', v).onclick = (e) => busy(e.currentTarget, async () => {
    if (!g.prompt.trim()) return toast('اكتب وصف الصورة', true);
    try { const img = await api(`/api/brands/${b.id}/images`, { method: 'POST', body: { ...g, ai: aiOf('image') } }); S.images = [img, ...S.images]; S.ov = null; drawStudio(); toast(`تم · ${img.model} · ${(img.ms / 1000).toFixed(1)} ث`); fallbackNote(img); } catch (err) { toast(err.message, true); }
  });
  $$('[data-re]', v).forEach((x) => (x.onclick = () => { const im = S.images.find((y) => y.id === x.dataset.re); Object.assign(g, { prompt: im.prompt, aspect: im.aspect, style: im.style || 'none' }); drawStudio(); }));
  $$('[data-del]', v).forEach((x) => (x.onclick = async () => {
    if (!(await confirmBox('حذف الصورة؟', 'ستُحذف من المعرض والتخزين.', 'حذف', true))) return;
    try { await api(`/api/brands/${b.id}/images/${x.dataset.del}`, { method: 'DELETE' }); S.images = S.images.filter((y) => y.id !== x.dataset.del); drawStudio(); } catch (err) { toast(err.message, true); }
  }));
}

async function drawVideo() {
  const data = await loadModels('video').catch(() => ({ models: [] }));
  const groups = {};
  for (const m of data.models) (groups[m.providerName] = groups[m.providerName] || []).push(m.model);
  const v = view(`<div class="grid c12">
    <div class="card s5"><div class="card-h"><h3>فيديو جديد</h3>${chip('المرحلة القادمة', 'vi')}</div>
      <span class="lbl" style="margin-top:0">${KIND_L.video}</span>${pickerHTML('video')}
      <label class="lbl">وصف الفيديو</label><textarea class="field" rows="4" disabled placeholder="توليد الفيديو يُفعَّل في المرحلة القادمة: نص ← فيديو، صورة ← فيديو، حركات كاميرا، إعلانات جاهزة."></textarea>
      <div class="flex mt16" style="justify-content:flex-end"><button class="btn primary" disabled>${ic('play')}توليد الفيديو</button></div></div>
    <div class="card s7"><div class="card-h"><h3>نماذج الفيديو المتاحة من مفاتيحك</h3><div class="end"><span class="muted xs">${data.models.length}</span></div></div>
      ${data.models.length ? Object.entries(groups).map(([n, list]) => `<span class="lbl">${esc(n)}</span><div class="flex wrap">${list.map((m) => chip(m, '', false)).join('')}</div>`).join('')
      : `<div class="empty" style="padding:28px"><span class="ic">${ic('plug')}</span><h3>لا توجد نماذج فيديو بعد</h3><p>اربط مفتاح Gemini (Veo) أو OpenAI (Sora) أو Kling أو Seedance أو Wan وستظهر نماذجها هنا تلقائياً.</p><button class="btn primary" data-go="providers">${ic('plug')}المفاتيح والمزوّدون</button></div>`}
    </div></div>`);
  bindPicker(v, () => drawVideo());
  $$('[data-go]', v).forEach((x) => (x.onclick = () => go(x.dataset.go)));
}

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
  go(location.hash.slice(1) || 'home', { replace: true });
  document.fonts?.ready.then(() => placePills());
}
boot();
})();
