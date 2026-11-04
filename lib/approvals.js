// One place for every decision the owner has to take (spec: 4 gates).
// Gate 1 brand · Gate 2 concept (research opportunities + written content) · Gate 3 design (visuals) · Gate 4 publishing (calendar).
const store = require('./store');
const brands = require('./brands');

async function list(id) {
  const b = await brands.get(id);
  const research = await store.readJSON(`research/${id}.json`, {});
  const batches = await store.listItems(`batches:${id}`, 0, 60);
  const sched = await store.readJSON(`schedule/${id}.json`, []);
  const items = [];
  items.push({ gate: 1, kind: 'brand', id: 'brand', title: `عقل البراند · ${b.name}`, detail: `جاهزية ${b.readiness?.score ?? 0}%`, status: b.gate1?.approved ? 'approved' : 'pending', at: b.gate1?.at ? new Date(b.gate1.at).toISOString() : null });
  for (const o of research.cross?.opportunities || []) {
    items.push({ gate: 2, kind: 'opportunity', id: o.id, title: o.title, detail: o.angle, status: o.status === 'proposed' ? 'pending' : o.status, at: research.cross.at, meta: { funnel: o.funnel, format: o.format } });
  }
  for (const bt of batches) {
    for (const it of bt.items || []) {
      const st = it.status === 'approved' ? 'approved' : it.status === 'rejected' ? 'rejected' : 'pending';
      items.push({ gate: 2, kind: 'content', id: it.id, batch: bt.id, title: it.hook || it.title || '', detail: String(it.caption || '').slice(0, 280), status: st, at: bt.createdAt, meta: { platform: it.platform, type: it.type, score: it.score, best: it.best } });
      if (it.image?.url) items.push({ gate: 3, kind: 'design', id: it.id, batch: bt.id, title: it.hook || it.title || 'تصميم', detail: '', image: it.image.url, status: it.designStatus || 'pending', at: bt.createdAt, meta: { platform: it.platform } });
    }
  }
  for (const s of sched) {
    items.push({ gate: 4, kind: 'post', id: s.id, title: s.title || String(s.caption || '').slice(0, 80), detail: `${s.date} ${s.time} · ${(s.platforms || []).join('، ')}`, image: s.media?.type === 'image' ? s.media.url : null, status: s.status === 'draft' ? 'pending' : s.status === 'rejected' ? 'rejected' : 'approved', at: s.createdAt || null, meta: { date: s.date, status: s.status } });
  }
  const count = (st) => items.filter((x) => x.status === st).length;
  return { items, counts: { pending: count('pending'), approved: count('approved'), rejected: count('rejected') } };
}

module.exports = { list };
