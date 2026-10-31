import { LIMIT_ROWS } from './limits.js';
import { detectEngine, parseEngineVersion, ENGINES } from './detect.js';
import { buildReport, classify, pngSize, extOf } from './analyze.js';
import { parsePE } from './pe.js';
import { readZipEntries, extractZipEntry, createZip } from './zip.js';
import { newProject, validate, exportFiles, slug, SCREENS } from './project.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/* ---------- Pestañas ---------- */
const tabs = [...document.querySelectorAll('#tabs button')];
function showTab(name) {
  for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== `tab-${name}`;
  try { history.replaceState(null, '', `#${name}`); } catch { /* ignore */ }
  if (name === 'editor') render();
}
tabs.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

/* ---------- Límites ---------- */
for (const [k, v] of LIMIT_ROWS) {
  const tr = el('tr'); tr.append(el('td', '', k), el('td', '', v)); $('limits-table').append(tr);
}

/* ---------- Importar ---------- */
const MAX_FILES = 200000;

async function readDirEntry(entry, prefix, out) {
  if (out.length > MAX_FILES) return;
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ path: prefix + entry.name, size: file.size, read: async (n) => new Uint8Array(await file.slice(0, n).arrayBuffer()) });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const c of batch) await readDirEntry(c, `${prefix}${entry.name}/`, out);
    }
  }
}

const fromFile = (file, path = file.webkitRelativePath || file.name) => ({ path, size: file.size, read: async (n) => new Uint8Array(await file.slice(0, n).arrayBuffer()) });

async function entriesFromZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return readZipEntries(bytes).map((e) => ({ path: e.path, size: e.size, read: (n) => extractZipEntry(bytes, e, n) }));
}

async function analyze(entries) {
  const out = $('report');
  out.hidden = false; out.replaceChildren(el('p', 'muted', 'Analizando…'));
  const det = detectEngine(entries.map((e) => e.path));
  const stats = classify(entries);
  let version = null;
  let pe = null;
  const textures = [];
  try {
    if (det.versionFile) {
      const e = entries.find((x) => x.path.replace(/\\/g, '/') === det.versionFile) || entries.find((x) => x.path.endsWith(det.versionFile));
      if (e) version = parseEngineVersion(det.engine, new TextDecoder().decode(await e.read(65536)));
    }
    if (det.engine === 'exe') pe = parsePE(await entries[0].read(4096));
    for (const e of entries.filter((x) => extOf(x.path) === 'png').slice(0, 400)) {
      const s = pngSize(await e.read(32));
      if (s) textures.push({ path: e.path, ...s });
    }
  } catch (err) { console.warn('Lectura parcial', err); }

  const rep = buildReport({ engine: det.engine, version, stats, textures, pe });
  out.replaceChildren();
  out.append(el('h3', '', `Resultado: ${ENGINES[det.engine].label}`));
  const verdicts = {
    portable: 'Sin bloqueos duros: los assets son reutilizables, la lógica hay que portarla a C/C++.',
    port: 'Requiere trabajo de portado importante (ver errores). Puedes reutilizar parte de los assets.',
    blocked: 'No se puede convertir automáticamente.',
  };
  out.append(el('div', 'verdict', verdicts[rep.verdict]));
  for (const f of rep.findings) {
    const d = el('div', `finding ${f.level}`); d.append(el('b', '', f.title), el('span', '', f.detail)); out.append(d);
  }
  if (det.engine !== 'unknown') {
    const b = el('button', 'btn primary', 'Empezar un proyecto 3DS nuevo en el editor');
    b.addEventListener('click', () => showTab('editor')); out.append(b);
  }
}

async function handleFiles(files) {
  try {
    if (files.length === 1 && /\.zip$/i.test(files[0].name)) return await analyze(await entriesFromZip(files[0]));
    return await analyze(files.map((f) => fromFile(f)));
  } catch (err) {
    $('report').hidden = false;
    $('report').replaceChildren(el('div', 'finding error', `No se pudo leer: ${err.message}`));
  }
}

const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', async (e) => {
  const items = [...e.dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (items.some((i) => i.isDirectory)) {
    const out = [];
    try { for (const i of items) await readDirEntry(i, '', out); } catch (err) { console.warn(err); }
    return analyze(out);
  }
  handleFiles([...e.dataTransfer.files]);
});
$('pick-dir').addEventListener('change', (e) => handleFiles([...e.target.files]));
$('pick-file').addEventListener('change', (e) => handleFiles([...e.target.files]));

/* ---------- Editor ---------- */
let project = newProject();
let selected = null;
let nextId = 100;
const cv = { top: $('cv-top'), bottom: $('cv-bottom') };

function entityBox(e) {
  if (e.type === 'rect') return { x: e.x, y: e.y, w: e.w, h: e.h };
  const ctx = cv[e.screen].getContext('2d');
  ctx.font = '14px monospace';
  return { x: e.x, y: e.y, w: ctx.measureText(e.text).width || 8, h: 16 };
}

function draw(screen) {
  const c = cv[screen]; const ctx = c.getContext('2d');
  ctx.fillStyle = project.bg[screen]; ctx.fillRect(0, 0, c.width, c.height);
  ctx.textBaseline = 'top'; ctx.font = '14px monospace';
  for (const e of project.entities.filter((x) => x.screen === screen)) {
    ctx.fillStyle = e.color;
    if (e.type === 'rect') ctx.fillRect(e.x, e.y, e.w, e.h); else ctx.fillText(e.text, e.x, e.y);
    if (e === selected) {
      const b = entityBox(e);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 3]); ctx.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3); ctx.setLineDash([]);
    }
  }
}

function render() {
  draw('top'); draw('bottom');
  const w = validate(project);
  $('warnings').replaceChildren(...w.map((t) => el('li', '', t)));
}

const PROPS = { 'e-x': 'x', 'e-y': 'y', 'e-w': 'w', 'e-h': 'h', 'e-color': 'color', 'e-text': 'text', 'e-screen': 'screen', 'e-speed': 'speed' };
function syncProps() {
  $('props-empty').hidden = !!selected; $('props-form').hidden = !selected;
  if (!selected) return;
  for (const [id, k] of Object.entries(PROPS)) $(id).value = selected[k];
  $('e-player').checked = selected.player;
  const rect = selected.type === 'rect';
  document.querySelectorAll('.rect-only').forEach((n) => { n.hidden = !rect; });
  document.querySelectorAll('.text-only').forEach((n) => { n.hidden = rect; });
}
function select(e) { selected = e; syncProps(); render(); }

for (const [id, k] of Object.entries(PROPS)) {
  $(id).addEventListener('input', (ev) => {
    if (!selected) return;
    const v = ev.target.value;
    selected[k] = ['x', 'y', 'w', 'h', 'speed'].includes(k) ? Number(v) || 0 : v;
    render();
  });
}
$('e-player').addEventListener('change', (ev) => { if (selected) { selected.player = ev.target.checked; render(); } });
$('p-name').addEventListener('input', (e) => { project.name = e.target.value; });
$('p-author').addEventListener('input', (e) => { project.author = e.target.value; });
$('p-bg-top').addEventListener('input', (e) => { project.bg.top = e.target.value; render(); });
$('p-bg-bottom').addEventListener('input', (e) => { project.bg.bottom = e.target.value; render(); });

function addEntity(type) {
  const e = { id: nextId++, type, screen: 'top', x: 40, y: 40, w: type === 'rect' ? 40 : 0, h: type === 'rect' ? 40 : 0, color: '#ffffff', text: type === 'text' ? 'Texto' : '', player: false, speed: 3 };
  project.entities.push(e); select(e);
}
$('add-rect').addEventListener('click', () => addEntity('rect'));
$('add-text').addEventListener('click', () => addEntity('text'));
$('del').addEventListener('click', () => {
  if (!selected) return;
  project.entities = project.entities.filter((e) => e !== selected); select(null);
});

function pos(screen, ev) {
  const r = cv[screen].getBoundingClientRect();
  return { x: ((ev.clientX - r.left) * SCREENS[screen].w) / r.width, y: ((ev.clientY - r.top) * SCREENS[screen].h) / r.height };
}
for (const screen of ['top', 'bottom']) {
  const c = cv[screen]; let drag = null;
  c.addEventListener('pointerdown', (ev) => {
    const p = pos(screen, ev);
    const hit = [...project.entities].reverse().find((e) => {
      if (e.screen !== screen) return false;
      const b = entityBox(e); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    });
    select(hit || null);
    if (hit) { drag = { dx: p.x - hit.x, dy: p.y - hit.y }; c.setPointerCapture(ev.pointerId); }
  });
  c.addEventListener('pointermove', (ev) => {
    if (!drag || !selected) return;
    const p = pos(screen, ev);
    selected.x = Math.round(p.x - drag.dx); selected.y = Math.round(p.y - drag.dy);
    syncProps(); render();
  });
  const end = () => { drag = null; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}

$('export').addEventListener('click', () => {
  const files = exportFiles(project);
  const blob = new Blob([createZip(files)], { type: 'application/zip' });
  const a = el('a'); a.href = URL.createObjectURL(blob); a.download = `${slug(project.name)}-3ds.zip`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

$('p-name').value = project.name; $('p-author').value = project.author;
$('p-bg-top').value = project.bg.top; $('p-bg-bottom').value = project.bg.bottom;
syncProps();
const initial = location.hash.slice(1);
showTab(['import', 'editor', 'limits', 'about'].includes(initial) ? initial : 'import');
