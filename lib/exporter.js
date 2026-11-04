// Turns a report model into downloadable files with zero dependencies.
// model = { title, subtitle, sheets: [{ name, head: [..], rows: [[..]], intro? }] }
// Formats: xlsx (Excel / Google Sheets / Numbers), docx (Word / Google Docs), csv, md (Markdown / Notion), html (print → PDF).
const zlib = require('zlib');

// ---------- tiny zip writer ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const comp = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const xml = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const sheetName = (n, used) => { let s = String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet'; let k = 2; while (used.has(s)) s = `${s.slice(0, 28)} ${k++}`; used.add(s); return s; };

// ---------- xlsx ----------
function xlsx(model) {
  const used = new Set();
  const sheets = model.sheets.map((sh) => ({ ...sh, name: sheetName(sh.name, used) }));
  const files = [];
  files.push(['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`]);
  files.push(['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
  files.push(['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sh, i) => `<sheet name="${xml(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`]);
  files.push(['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
  files.push(['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF222045"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]);
  sheets.forEach((sh, i) => {
    const rows = [sh.head, ...sh.rows];
    const widths = sh.head.map((_, c) => Math.min(60, Math.max(12, ...rows.map((r) => String(r[c] ?? '').length * 0.9))));
    const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr" s="${ri === 0 ? 1 : 2}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
    files.push([`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w.toFixed(1)}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData></worksheet>`]);
  });
  return zip(files);
}

// ---------- docx ----------
function docx(model) {
  const p = (text, { bold, size, color } = {}) => `<w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rtl/>${bold ? '<w:b/><w:bCs/>' : ''}${size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
  const cell = (text, head) => `<w:tc><w:tcPr>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="222045"/>' : ''}</w:tcPr>${p(text, head ? { bold: true, color: 'FFFFFF', size: 20 } : { size: 20 })}</w:tc>`;
  const table = (sh) => `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:color="E4E3EF"/>`).join('')}</w:tblBorders></w:tblPr>${[sh.head, ...sh.rows].map((r, i) => `<w:tr>${r.map((v) => cell(v, i === 0)).join('')}</w:tr>`).join('')}</w:tbl>`;
  const body = [
    p(model.title, { bold: true, size: 40, color: '222045' }),
    model.subtitle ? p(model.subtitle, { size: 20, color: '6B6A85' }) : '',
    ...model.sheets.map((sh) => [p(sh.name, { bold: true, size: 30, color: '684AB0' }), sh.intro ? p(sh.intro) : '', sh.rows.length ? table(sh) : p('—'), p('')].join('')),
  ].join('');
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/><w:bidi/></w:sectPr></w:body></w:document>`],
  ]);
}

// ---------- csv / md / html ----------
const csvCell = (x) => { let s = String(x ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
function csv(model) {
  const out = [];
  model.sheets.forEach((sh, i) => { if (i) out.push([], [sh.name]); out.push(sh.head, ...sh.rows); });
  return '﻿' + out.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
function md(model) {
  const c = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [`# ${model.title}`, model.subtitle ? `_${model.subtitle}_` : '', ...model.sheets.map((sh) => [`## ${sh.name}`, sh.intro || '', sh.rows.length ? [`| ${sh.head.map(c).join(' | ')} |`, `| ${sh.head.map(() => '---').join(' | ')} |`, ...sh.rows.map((r) => `| ${r.map(c).join(' | ')} |`)].join('\n') : '—'].filter(Boolean).join('\n\n'))].filter(Boolean).join('\n\n') + '\n';
}
function html(model, { print = true } = {}) {
  const e = (v) => xml(v).replace(/(https?:\/\/[^\s<"]+)/g, '<a href="$1">$1</a>');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(model.title)}</title>
<style>@page{size:A4;margin:14mm}body{font-family:-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:#1B1A33;margin:0;padding:24px;background:#fff}h1{color:#222045;margin:0 0 4px;font-size:26px}.sub{color:#6B6A85;margin:0 0 20px;font-size:13px}h2{color:#684AB0;font-size:18px;margin:26px 0 8px;break-after:avoid}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}th{background:#222045;color:#fff;text-align:right;padding:7px 8px;font-weight:600}td{border-bottom:1px solid #E4E3EF;padding:7px 8px;vertical-align:top}tr{break-inside:avoid}a{color:#684AB0;word-break:break-all}.bar{position:sticky;top:0;background:#F6F6FB;padding:10px;border-radius:12px;margin-bottom:18px;display:flex;gap:8px;align-items:center}.bar button{background:#7656BC;color:#fff;border:0;border-radius:10px;padding:8px 14px;font:inherit;cursor:pointer}@media print{.bar{display:none}body{padding:0}}</style></head><body>
<div class="bar"><button onclick="print()">حفظ PDF / طباعة</button><span style="font-size:12px;color:#6B6A85">اختر «Save as PDF» في نافذة الطباعة.</span></div>
<h1>${xml(model.title)}</h1>${model.subtitle ? `<p class="sub">${xml(model.subtitle)}</p>` : ''}
${model.sheets.map((sh) => `<h2>${xml(sh.name)}</h2>${sh.intro ? `<p>${e(sh.intro)}</p>` : ''}${sh.rows.length ? `<table><thead><tr>${sh.head.map((h) => `<th>${xml(h)}</th>`).join('')}</tr></thead><tbody>${sh.rows.map((r) => `<tr>${r.map((v) => `<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>—</p>'}`).join('\n')}
${print ? '<script>setTimeout(()=>print(),600)</script>' : ''}</body></html>`;
}

const FORMATS = {
  xlsx: { ext: 'xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', make: xlsx },
  docx: { ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', make: docx },
  csv: { ext: 'csv', type: 'text/csv; charset=utf-8', make: csv },
  md: { ext: 'md', type: 'text/markdown; charset=utf-8', make: md },
  pdf: { ext: 'html', type: 'text/html; charset=utf-8', make: html, inline: true },
};

function render(model, format = 'xlsx') {
  const f = FORMATS[format] || FORMATS.xlsx;
  const safe = String(model.file || model.title).replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'report';
  return { body: f.make(model), type: f.type, name: `${safe}.${f.ext}`, inline: Boolean(f.inline) };
}

module.exports = { render, zip, FORMATS };
