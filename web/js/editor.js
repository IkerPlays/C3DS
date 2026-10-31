// Editor visual: escenas, objetos, recursos, variables, lógica, vista previa, guardado y exportación.
import { h, $, toast, dialog, download, debounce } from './ui.js';
import {
  SCREENS, KEYS, KEY_LABEL, LIMITS, OBJECT_TYPES, CONTROL_MODES, newProject, migrate, makeObject, makeScene, nextId, validate,
  findScene, slug, isVarName,
} from './model.js';
import { History } from './history.js';
import { listProjects, saveProject, loadProject, deleteProject, lastProjectId, newLocalId } from './storage.js';
import { Game, render, runInCanvases } from './runtime.js';
import { EVENTS, ACTIONS, OPS, OP_LABEL, EDGES, AXES, RAND_AXES, defaultWhen, defaultAction, describeRule } from './rules.js';
import { imageToAsset, audioToWav } from './images.js';
import { exportFiles } from './codegen.js';
import { createZip } from './zip.js';
import { buildHtml5 } from './html5.js';
import { startBuild, buildStatus, buildDownload, STATUS_LABEL } from './cloud.js';
import { TEMPLATES } from './templates.js';

let project; let history; let sceneId; let selectedId = null; let tab = 'object'; let runner = null;
const images = new Map(); const sounds = new Map();
const cv = {}; let grid = true; let zoom = 1.25;
const refs = {};
let saveState = 'saved';

/* ---------- Estado y cambios ---------- */
const scene = () => findScene(project, sceneId) || project.scenes[0];
const selected = () => (selectedId == null ? null : scene().objects.find((o) => o.id === selectedId) || null);

const autosave = debounce(() => {
  const r = saveProject(project);
  saveState = r.ok ? 'saved' : 'error';
  if (!r.ok) toast(r.error, 'error', 7000);
  renderStatus();
}, 700);

function changed({ structure = false, quiet = false } = {}) {
  saveState = 'dirty';
  history.commit();
  autosave();
  if (structure) refreshAll(); else { drawStage(); refreshHistoryButtons(); renderStatus(); }
  if (!quiet) renderWarnings();
}
const commitSoon = debounce(() => changed(), 500);
function live() { saveState = 'dirty'; drawStage(); renderStatus(); commitSoon(); }

function loadImages() {
  images.clear(); sounds.clear();
  for (const a of project.assets.images) { const im = new Image(); im.onload = () => drawStage(); im.src = project.blobs[a.id]; images.set(a.id, im); }
  for (const a of project.assets.sounds) sounds.set(a.id, new Audio(project.blobs[a.id]));
}

function setProject(p, { fresh = false } = {}) {
  stopPlay();
  project = p;
  project.localId ||= newLocalId();
  history = new History(project);
  sceneId = project.startScene ?? project.scenes[0]?.id;
  if (!findScene(project, sceneId)) sceneId = project.scenes[0]?.id;
  selectedId = null; tab = 'object';
  loadImages();
  if (fresh) { saveProject(project); saveState = 'saved'; }
  refreshAll();
}

/* ---------- Dibujo del escenario ---------- */
function stageGame() {
  const g = new Game(project, { rng: () => 0.5 });
  g.enter(scene().id);
  return g;
}

function objBox(ctx, o) {
  if (o.type === 'text') { ctx.font = '14px "DejaVu Sans Mono", monospace'; return { x: o.x, y: o.y, w: ctx.measureText(o.text).width || 8, h: 16 }; }
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

function drawStage() {
  if (runner || !cv.top) return;
  const g = stageGame();
  const ctxs = { top: cv.top.getContext('2d'), bottom: cv.bottom.getContext('2d') };
  render(g, ctxs, images);
  for (const key of ['top', 'bottom']) {
    const ctx = ctxs[key];
    if (grid) { ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let x = 0; x < SCREENS[key].w; x += 20) ctx.fillRect(x, 0, 1, SCREENS[key].h); for (let y = 0; y < SCREENS[key].h; y += 20) ctx.fillRect(0, y, SCREENS[key].w, 1); }
    const sel = selected();
    if (sel && sel.screen === key) {
      const b = objBox(ctx, sel);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3); ctx.setLineDash([]);
      if (sel.type !== 'text') { ctx.fillStyle = '#ff004d'; ctx.fillRect(b.x + b.w - 3, b.y + b.h - 3, 7, 7); }
    }
  }
}

function pointer(key, ev) {
  const r = cv[key].getBoundingClientRect();
  return { x: ((ev.clientX - r.left) * SCREENS[key].w) / r.width, y: ((ev.clientY - r.top) * SCREENS[key].h) / r.height };
}
const snap = (v) => (grid ? Math.round(v / 5) * 5 : Math.round(v));

function bindStage() {
  for (const key of ['top', 'bottom']) {
    const c = cv[key]; let drag = null;
    c.addEventListener('pointerdown', (ev) => {
      if (runner) return;
      const p = pointer(key, ev); const ctx = c.getContext('2d');
      const sel = selected();
      if (sel && sel.screen === key && sel.type !== 'text') {
        const b = objBox(ctx, sel);
        if (Math.abs(p.x - (b.x + b.w)) < 8 && Math.abs(p.y - (b.y + b.h)) < 8) { drag = { mode: 'resize', ox: p.x - sel.w, oy: p.y - sel.h }; c.setPointerCapture(ev.pointerId); return; }
      }
      const hit = [...scene().objects].reverse().find((o) => { if (o.screen !== key) return false; const b = objBox(ctx, o); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
      selectObject(hit?.id ?? null);
      if (hit) { drag = { mode: 'move', dx: p.x - hit.x, dy: p.y - hit.y }; c.setPointerCapture(ev.pointerId); }
    });
    c.addEventListener('pointerleave', () => { if (refs.coords) refs.coords.textContent = ''; });
    c.addEventListener('pointermove', (ev) => {
      if (refs.coords && !runner) { const q = pointer(key, ev); refs.coords.textContent = `x ${Math.round(q.x)}  y ${Math.round(q.y)}`; }
      const o = selected();
      if (!drag || !o) { const p = pointer(key, ev); c.style.cursor = scene().objects.some((q) => q.screen === key && (() => { const b = objBox(c.getContext('2d'), q); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; })()) ? 'move' : 'default'; return; }
      const p = pointer(key, ev);
      if (drag.mode === 'move') { o.x = snap(p.x - drag.dx); o.y = snap(p.y - drag.dy); } else { o.w = Math.max(4, snap(p.x - drag.ox)); o.h = Math.max(4, snap(p.y - drag.oy)); }
      syncInspector(); live();
    });
    const end = () => { if (drag) { drag = null; changed(); } };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  }
}

/* ---------- Selección y mutaciones ---------- */
function selectObject(id) { selectedId = id; if (id != null) tab = 'object'; renderLeft(); renderRight(); drawStage(); }

function addObject(type) {
  const sc = scene();
  if (sc.objects.length >= LIMITS.objectsPerScene) return toast(`Máximo ${LIMITS.objectsPerScene} objetos por escena.`, 'error');
  let over = {};
  if (type === 'sprite') {
    const img = project.assets.images[0];
    if (!img) return toast('Primero añade una imagen en Recursos.', 'error');
    over = { image: img.id, w: Math.min(img.w, 64), h: Math.min(img.h, 64) };
  }
  const o = makeObject(project, type, over);
  sc.objects.push(o);
  selectedId = o.id; changed({ structure: true });
}

function deleteSelected() {
  const o = selected(); if (!o) return;
  const sc = scene();
  sc.objects = sc.objects.filter((x) => x.id !== o.id);
  for (const s of project.scenes) s.rules = s.rules.filter((r) => !refsObject(r, o.id));
  selectedId = null; changed({ structure: true });
}
function refsObject(r, id) { return r.when.a === id || r.when.b === id || r.when.obj === id || r.then.some((a) => a.obj === id); }

let clipboard = null;
function copySelected() { const o = selected(); if (!o) return false; clipboard = JSON.parse(JSON.stringify(o)); toast(`“${o.name}” copiado (Ctrl+V para pegar).`, 'info', 1800); return true; }
function pasteObject() {
  if (!clipboard) return;
  const sc = scene();
  if (sc.objects.length >= LIMITS.objectsPerScene) return toast(`Máximo ${LIMITS.objectsPerScene} objetos por escena.`, 'error');
  const o = { ...JSON.parse(JSON.stringify(clipboard)), id: nextId(project) };
  o.x += 10; o.y += 10; clipboard.x += 10; clipboard.y += 10;
  if (o.type === 'sprite' && !project.assets.images.some((a) => a.id === o.image)) return toast('La imagen de este objeto no existe en este proyecto.', 'error');
  sc.objects.push(o); selectedId = o.id; changed({ structure: true });
}

function duplicateSelected() {
  const o = selected(); if (!o) return;
  const c = { ...o, id: nextId(project), name: `${o.name} copia`, x: o.x + 10, y: o.y + 10 };
  scene().objects.push(c); selectedId = c.id; changed({ structure: true });
}

function moveSelected(where) {
  const sc = scene(); const o = selected(); if (!o) return;
  const i = sc.objects.indexOf(o);
  const j = { front: sc.objects.length - 1, back: 0, up: Math.min(sc.objects.length - 1, i + 1), down: Math.max(0, i - 1) }[where];
  if (j === i) return;
  sc.objects.splice(i, 1); sc.objects.splice(j, 0, o);
  changed({ structure: true });
}

function centerSelected(axis) {
  const o = selected(); if (!o) return;
  const b = objBox(cv[o.screen].getContext('2d'), o);
  const s = SCREENS[o.screen];
  if (axis === 'x') o.x = Math.round((s.w - b.w) / 2); else o.y = Math.round((s.h - b.h) / 2);
  syncInspector(); changed();
}

function duplicateScene(id) {
  if (project.scenes.length >= LIMITS.scenes) return toast(`Máximo ${LIMITS.scenes} escenas.`, 'error');
  const src = findScene(project, id);
  const copy = JSON.parse(JSON.stringify(src));
  const map = new Map();
  copy.id = nextId(project); copy.name = `${src.name} copia`.slice(0, 24);
  for (const o of copy.objects) { const n = nextId(project); map.set(o.id, n); o.id = n; }
  const re = (v) => (map.has(v) ? map.get(v) : v);
  for (const r of copy.rules) {
    r.id = nextId(project);
    for (const k of ['a', 'b', 'obj']) if (k in r.when) r.when[k] = re(r.when[k]);
    for (const a of r.then) if ('obj' in a) a.obj = re(a.obj);
  }
  project.scenes.splice(project.scenes.indexOf(src) + 1, 0, copy);
  sceneId = copy.id; selectedId = null; changed({ structure: true });
}

function addScene() {
  if (project.scenes.length >= LIMITS.scenes) return toast(`Máximo ${LIMITS.scenes} escenas.`, 'error');
  const s = makeScene(project, `Escena ${project.scenes.length + 1}`);
  project.scenes.push(s); sceneId = s.id; selectedId = null; changed({ structure: true });
}

function deleteScene(id) {
  if (project.scenes.length <= 1) return toast('Debe quedar al menos una escena.', 'error');
  const s = findScene(project, id);
  project.scenes = project.scenes.filter((x) => x.id !== id);
  for (const sc of project.scenes) sc.rules = sc.rules.filter((r) => !r.then.some((a) => a.type === 'goto' && a.scene === id) && !s.objects.some((o) => refsObject(r, o.id)));
  if (project.startScene === id) project.startScene = project.scenes[0].id;
  sceneId = project.scenes[0].id; selectedId = null; changed({ structure: true });
}

/* ---------- Recursos ---------- */
async function addImages(files) {
  for (const f of files) {
    if (project.assets.images.length >= LIMITS.images) { toast(`Máximo ${LIMITS.images} imágenes.`, 'error'); break; }
    try {
      const r = await imageToAsset(f);
      const id = nextId(project);
      project.assets.images.push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 24), w: r.w, h: r.h });
      project.blobs[id] = r.dataURL;
      if (r.scaled) toast(`"${f.name}" se redujo a ${r.w}×${r.h}.`, 'info');
    } catch (e) { toast(`No se pudo leer "${f.name}" como imagen.`, 'error'); }
  }
  loadImages(); changed({ structure: true });
}

async function addSounds(files) {
  for (const f of files) {
    if (project.assets.sounds.length >= LIMITS.sounds) { toast(`Máximo ${LIMITS.sounds} sonidos.`, 'error'); break; }
    try {
      const r = await audioToWav(await f.arrayBuffer());
      const id = nextId(project);
      project.assets.sounds.push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 24), seconds: Math.round(r.seconds * 100) / 100 });
      project.blobs[id] = r.dataURL;
      if (r.trimmed) toast(`"${f.name}" se recortó a 15 s.`, 'info');
    } catch (e) { toast(`No se pudo leer "${f.name}" como audio.`, 'error'); }
  }
  loadImages(); changed({ structure: true });
}

function deleteAsset(kind, id) {
  const inUse = JSON.stringify(project.scenes).includes(kind === 'image' ? `"image":${id}` : `"sound":${id}`);
  if (inUse && !confirm('Este recurso está en uso. Se quitará de los objetos/reglas que lo usan. ¿Continuar?')) return;
  if (kind === 'image') {
    project.assets.images = project.assets.images.filter((a) => a.id !== id);
    for (const s of project.scenes) s.objects = s.objects.filter((o) => !(o.type === 'sprite' && o.image === id));
  } else {
    project.assets.sounds = project.assets.sounds.filter((a) => a.id !== id);
    for (const s of project.scenes) { for (const r of s.rules) r.then = r.then.filter((a) => !(a.type === 'sound' && a.sound === id)); }
  }
  delete project.blobs[id]; loadImages(); changed({ structure: true });
}

/* ---------- Paneles ---------- */
const field = (label, input, cls = '') => h('label', { class: `field ${cls}` }, h('span', {}, label), input);
const numInput = (get, set, o = {}) => h('input', { type: 'number', value: get(), min: o.min, max: o.max, step: o.step || 1, onInput: (e) => { set(Number(e.target.value) || 0); live(); } });
const textInput = (get, set, o = {}) => h('input', { type: 'text', value: get(), maxlength: o.max || 80, onInput: (e) => { set(e.target.value); live(); } });
const colorInput = (get, set) => h('input', { type: 'color', value: get(), onInput: (e) => { set(e.target.value); live(); } });

function selectInput(options, value, onChange) {
  const sel = h('select', { onChange: (e) => onChange(e.target.value) }, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value) }, l)));
  return sel;
}

function renderLeft() {
  const root = refs.left; root.replaceChildren();
  // Escenas
  root.append(h('section', { class: 'panel-sec' },
    h('div', { class: 'sec-head' }, h('h4', {}, 'Escenas'), h('button', { class: 'mini', title: 'Añadir escena', onClick: addScene }, '+')),
    h('ul', { class: 'list' }, project.scenes.map((s) => h('li', { class: s.id === sceneId ? 'active' : '' },
      h('button', { class: 'row', onClick: () => { sceneId = s.id; selectedId = null; refreshAll(); } }, project.startScene === s.id ? '★ ' : '', s.name),
      h('button', { class: 'mini ghost', title: 'Marcar como escena inicial', onClick: () => { project.startScene = s.id; changed({ structure: true }); } }, '★'),
      h('button', { class: 'mini ghost', title: 'Duplicar escena', onClick: () => duplicateScene(s.id) }, '⧉'),
      h('button', { class: 'mini ghost', title: 'Eliminar escena', onClick: () => deleteScene(s.id) }, '🗑'))))));
  // Objetos
  const sc = scene();
  root.append(h('section', { class: 'panel-sec' },
    h('div', { class: 'sec-head' }, h('h4', {}, 'Objetos'),
      h('div', { class: 'addrow' }, Object.entries(OBJECT_TYPES).map(([t, l]) => h('button', { class: 'mini', title: `Añadir ${l.toLowerCase()}`, onClick: () => addObject(t) }, { rect: '▭', text: 'T', sprite: '🖼', button: '⏺' }[t])))),
    h('ul', { class: 'list' }, sc.objects.length ? [...sc.objects].reverse().map((o) => h('li', { class: o.id === selectedId ? 'active' : '' },
      h('button', { class: 'row', onClick: () => selectObject(o.id) }, h('span', { class: 'chip', style: { background: o.color } }), o.name, h('small', {}, o.screen === 'top' ? 'sup' : 'inf')))) : h('li', { class: 'empty' }, 'Sin objetos. Añade uno con los botones de arriba.'))));
  // Recursos
  root.append(h('section', { class: 'panel-sec' },
    h('div', { class: 'sec-head' }, h('h4', {}, 'Imágenes'), h('label', { class: 'mini', title: 'Añadir imágenes (PNG, JPG, WebP…)' }, '+', h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onChange: (e) => { addImages([...e.target.files]); e.target.value = ''; } }))),
    h('ul', { class: 'list' }, project.assets.images.length ? project.assets.images.map((a) => h('li', {},
      h('img', { class: 'thumb', src: project.blobs[a.id], alt: '' }), h('span', { class: 'grow' }, a.name, h('small', {}, `${a.w}×${a.h}`)),
      h('button', { class: 'mini ghost', onClick: () => deleteAsset('image', a.id) }, '🗑'))) : h('li', { class: 'empty' }, 'Sin imágenes. Se reducen a 512 px como máximo.'))));
  root.append(h('section', { class: 'panel-sec' },
    h('div', { class: 'sec-head' }, h('h4', {}, 'Sonidos'), h('label', { class: 'mini', title: 'Añadir sonidos (WAV, OGG, MP3)' }, '+', h('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true, onChange: (e) => { addSounds([...e.target.files]); e.target.value = ''; } }))),
    h('ul', { class: 'list' }, project.assets.sounds.length ? project.assets.sounds.map((a) => h('li', {},
      h('button', { class: 'mini ghost', title: 'Escuchar', onClick: () => { const au = sounds.get(a.id); if (au) { au.currentTime = 0; au.play().catch(() => {}); } } }, '▶'),
      h('span', { class: 'grow' }, a.name, h('small', {}, `${a.seconds}s`)),
      h('button', { class: 'mini ghost', onClick: () => deleteAsset('sound', a.id) }, '🗑'))) : h('li', { class: 'empty' }, 'Sin sonidos. Se convierten a WAV mono 22 kHz.'))));
  // Variables
  root.append(h('section', { class: 'panel-sec' },
    h('div', { class: 'sec-head' }, h('h4', {}, 'Variables'), h('button', { class: 'mini', title: 'Añadir variable', onClick: () => { if (project.variables.length >= LIMITS.variables) return toast(`Máximo ${LIMITS.variables}.`, 'error'); let i = project.variables.length + 1; while (project.variables.some((v) => v.name === `var${i}`)) i++; project.variables.push({ name: `var${i}`, value: 0 }); changed({ structure: true }); } }, '+')),
    h('ul', { class: 'list' }, project.variables.length ? project.variables.map((v, i) => h('li', { class: 'var' },
      h('input', { value: v.name, 'aria-label': 'Nombre', onChange: (e) => renameVar(i, e.target.value, e.target) }),
      h('input', { type: 'number', value: v.value, 'aria-label': 'Valor inicial', onInput: (e) => { v.value = Number(e.target.value) || 0; live(); } }),
      h('button', { class: 'mini ghost', onClick: () => { project.variables.splice(i, 1); changed({ structure: true }); } }, '🗑'))) : h('li', { class: 'empty' }, 'Sin variables. Úsalas para puntos, vidas…'))));
}

function renameVar(i, name, input) {
  const old = project.variables[i].name;
  if (!isVarName(name) || project.variables.some((v, j) => j !== i && v.name === name)) { toast('Nombre inválido o repetido (letras, números y _; sin empezar por número).', 'error'); input.value = old; return; }
  project.variables[i].name = name;
  const fix = (s) => s.replaceAll(`{${old}}`, `{${name}}`);
  for (const s of project.scenes) {
    for (const o of s.objects) o.text = fix(o.text);
    for (const r of s.rules) { if (r.when.var === old) r.when.var = name; for (const a of r.then) { if (a.var === old) a.var = name; if (a.text) a.text = fix(a.text); } }
  }
  changed({ structure: true });
}

function renderRight() {
  const root = refs.right; root.replaceChildren();
  root.append(h('div', { class: 'tabs small', role: 'tablist' }, [['object', 'Objeto'], ['logic', 'Lógica'], ['scene', 'Escena']].map(([k, l]) =>
    h('button', { role: 'tab', 'aria-selected': String(tab === k), onClick: () => { tab = k; renderRight(); } }, l))));
  const body = h('div', { class: 'insp' });
  root.append(body);
  if (tab === 'scene') return renderSceneTab(body);
  if (tab === 'logic') return renderLogic(body);
  const o = selected();
  if (!o) { body.append(h('p', { class: 'empty' }, 'Selecciona un objeto en el escenario o en la lista.')); return; }
  refs.inspFields = {};
  const f = (key, label, el, cls) => { refs.inspFields[key] = el; return field(label, el, cls); };
  body.append(
    f('name', 'Nombre', textInput(() => o.name, (v) => { o.name = v; }, { max: 30 })),
    h('p', { class: 'muted small' }, `Tipo: ${OBJECT_TYPES[o.type]}`),
    f('screen', 'Pantalla', selectInput([['top', 'Superior 400×240'], ['bottom', 'Inferior 320×240 (táctil)']], o.screen, (v) => { o.screen = v; changed(); })),
    h('div', { class: 'grid2' }, f('x', 'X', numInput(() => o.x, (v) => { o.x = v; })), f('y', 'Y', numInput(() => o.y, (v) => { o.y = v; }))),
    h('div', { class: 'row-btns tight', 'aria-label': 'Alinear' }, h('button', { class: 'btn small', title: 'Centrar horizontalmente', onClick: () => centerSelected('x') }, '↔ Centrar X'), h('button', { class: 'btn small', title: 'Centrar verticalmente', onClick: () => centerSelected('y') }, '↕ Centrar Y')),
    o.type !== 'text' ? h('div', { class: 'grid2' }, f('w', 'Ancho', numInput(() => o.w, (v) => { o.w = Math.max(1, v); }, { min: 1 })), f('h', 'Alto', numInput(() => o.h, (v) => { o.h = Math.max(1, v); }, { min: 1 }))) : null,
    o.type !== 'sprite' ? f('color', 'Color', colorInput(() => o.color, (v) => { o.color = v; })) : null,
    o.type === 'text' || o.type === 'button' ? f('text', 'Texto', textInput(() => o.text, (v) => { o.text = v; })) : null,
    o.type === 'text' || o.type === 'button' ? h('p', { class: 'muted small' }, 'Usa {variable} para mostrar su valor, p. ej. “Puntos: {puntos}”.') : null,
    o.type === 'sprite' ? f('image', 'Imagen', selectInput(project.assets.images.map((a) => [a.id, a.name]), o.image, (v) => { o.image = Number(v); changed(); })) : null,
    o.type === 'rect' || o.type === 'sprite' ? f('controls', 'Control', selectInput(Object.entries(CONTROL_MODES), String(o.controls), (v) => { o.controls = v === 'true' ? true : v === 'false' ? false : v; changed({ structure: true }); })) : null,
    o.controls ? f('speed', 'Vel. D-Pad', numInput(() => o.speed, (v) => { o.speed = Math.max(0, Math.min(20, v)); }, { min: 0, max: 20 })) : null,
    o.type === 'rect' || o.type === 'sprite' ? h('div', { class: 'grid2' }, f('vx', 'Vel X', numInput(() => o.vx || 0, (v) => { o.vx = v; }, { step: 0.5 })), f('vy', 'Vel Y', numInput(() => o.vy || 0, (v) => { o.vy = v; }, { step: 0.5 }))) : null,
    o.type === 'rect' || o.type === 'sprite' ? h('p', { class: 'muted small' }, 'Vel X/Y mueven el objeto solo (px por frame). Úsalo con la regla “toca el borde”.') : null,
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.visible, onChange: (e) => { o.visible = e.target.checked; changed(); } }), 'Visible al empezar'),
    h('div', { class: 'row-btns tight', 'aria-label': 'Orden de capas' }, h('button', { class: 'btn small', title: 'Traer al frente', onClick: () => moveSelected('front') }, '⤒ Frente'), h('button', { class: 'btn small', title: 'Subir una capa', onClick: () => moveSelected('up') }, '↑'), h('button', { class: 'btn small', title: 'Bajar una capa', onClick: () => moveSelected('down') }, '↓'), h('button', { class: 'btn small', title: 'Enviar al fondo', onClick: () => moveSelected('back') }, '⤓ Fondo')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn', onClick: duplicateSelected }, 'Duplicar'), h('button', { class: 'btn danger', onClick: deleteSelected }, 'Eliminar')),
  );
}

function syncInspector() {
  const o = selected(); if (!o || !refs.inspFields) return;
  for (const [k, el] of Object.entries(refs.inspFields)) if (k in o && el.value !== undefined && el !== document.activeElement) el.value = o[k];
}

function renderSceneTab(body) {
  const sc = scene();
  body.append(
    field('Nombre', textInput(() => sc.name, (v) => { sc.name = v || 'Escena'; renderLeftSoon(); }, { max: 24 })),
    field('Fondo superior', colorInput(() => sc.bg.top, (v) => { sc.bg.top = v; })),
    field('Fondo inferior', colorInput(() => sc.bg.bottom, (v) => { sc.bg.bottom = v; })),
    h('p', { class: 'muted small' }, project.startScene === sc.id ? '★ Es la escena inicial.' : 'Usa ★ en la lista para marcarla como inicial.'),
  );
}
const renderLeftSoon = debounce(renderLeft, 400);

/* ---------- Lógica (reglas) ---------- */
function fieldEditor(f, obj, ctx) {
  const set = (v) => { obj[f.k] = v; changed(); };
  switch (f.t) {
    case 'key': return selectInput(KEYS.map((k) => [k, KEY_LABEL[k] || k]), obj[f.k], set);
    case 'object': return selectInput(scene().objects.map((o) => [o.id, o.name]), obj[f.k], (v) => set(Number(v)));
    case 'var': return selectInput(project.variables.map((v) => [v.name, v.name]), obj[f.k], set);
    case 'op': return selectInput(OPS.map((o) => [o, OP_LABEL[o]]), obj[f.k], set);
    case 'scene': return selectInput(project.scenes.map((s) => [s.id, s.name]), obj[f.k], (v) => set(Number(v)));
    case 'sound': return selectInput(project.assets.sounds.map((s) => [s.id, s.name]), obj[f.k], (v) => set(Number(v)));
    case 'edge': return selectInput(Object.entries(EDGES), obj[f.k], set);
    case 'axis': return selectInput(Object.entries(AXES), obj[f.k], set);
    case 'randAxis': return selectInput(Object.entries(RAND_AXES), obj[f.k] || 'xy', set);
    case 'number': return h('input', { type: 'number', value: obj[f.k], min: f.min, step: f.step || 1, onInput: (e) => { obj[f.k] = Number(e.target.value) || 0; live(); } });
    default: return h('input', { type: 'text', value: obj[f.k] ?? '', maxlength: 80, onInput: (e) => { obj[f.k] = e.target.value; live(); } });
  }
}

function renderLogic(body) {
  const sc = scene();
  const ctx = { p: project, scene: sc };
  body.append(h('p', { class: 'muted small' }, 'Reglas: “Cuando pase esto → haz esto”. Se evalúan 60 veces por segundo.'));
  for (const [ri, r] of sc.rules.entries()) {
    const when = EVENTS[r.when.type];
    body.append(h('div', { class: `rule ${r.enabled === false ? 'off' : ''}` },
      h('div', { class: 'rule-top' },
        h('label', { class: 'check', title: 'Activar o desactivar la regla' }, h('input', { type: 'checkbox', checked: r.enabled !== false, onChange: (e) => { r.enabled = e.target.checked; changed({ structure: true }); } })),
        h('span', { class: 'rule-summary' }, describeRule(r, project, sc)),
        h('button', { class: 'mini ghost', title: 'Subir regla', disabled: ri === 0, onClick: () => { [sc.rules[ri - 1], sc.rules[ri]] = [sc.rules[ri], sc.rules[ri - 1]]; changed({ structure: true }); } }, '↑'),
        h('button', { class: 'mini ghost', title: 'Bajar regla', disabled: ri === sc.rules.length - 1, onClick: () => { [sc.rules[ri + 1], sc.rules[ri]] = [sc.rules[ri], sc.rules[ri + 1]]; changed({ structure: true }); } }, '↓')),
      h('div', { class: 'rule-head' }, h('b', {}, 'CUANDO'),
        selectInput(Object.entries(EVENTS).map(([k, e]) => [k, e.label]), r.when.type, (v) => { r.when = defaultWhen(v, ctx); changed({ structure: true }); }),
        h('button', { class: 'mini ghost', title: 'Eliminar regla', onClick: () => { sc.rules.splice(ri, 1); changed({ structure: true }); } }, '🗑')),
      h('div', { class: 'rule-fields' }, when.fields.map((f) => field(f.label, fieldEditor(f, r.when, ctx)))),
      h('div', { class: 'rule-head' }, h('b', {}, 'ENTONCES')),
      r.then.map((a, ai) => h('div', { class: 'action' },
        h('div', { class: 'rule-head' },
          selectInput(Object.entries(ACTIONS).map(([k, e]) => [k, e.label]), a.type, (v) => { r.then[ai] = defaultAction(v, ctx); changed({ structure: true }); }),
          h('button', { class: 'mini ghost', onClick: () => { r.then.splice(ai, 1); changed({ structure: true }); } }, '✕')),
        h('div', { class: 'rule-fields' }, ACTIONS[a.type].fields.map((f) => field(f.label, fieldEditor(f, a, ctx)))))),
      h('button', { class: 'btn small', onClick: () => { r.then.push(defaultAction('addVar', ctx)); changed({ structure: true }); } }, '+ Acción')));
  }
  body.append(h('button', { class: 'btn primary', onClick: () => {
    if (sc.rules.length >= LIMITS.rules) return toast(`Máximo ${LIMITS.rules} reglas por escena.`, 'error');
    sc.rules.push({ id: nextId(project), when: defaultWhen('key', ctx), then: [defaultAction('goto', ctx)] }); changed({ structure: true });
  } }, '+ Nueva regla'));
}

/* ---------- Barra superior, estado y avisos ---------- */
function renderStatus() {
  if (!refs.status) return;
  const map = { saved: ['● Guardado en este navegador', 'ok'], dirty: ['● Guardando…', 'warn'], error: ['● Sin guardar', 'err'] };
  refs.status.textContent = map[saveState][0]; refs.status.className = `status ${map[saveState][1]}`;
}
function refreshHistoryButtons() { if (refs.undo) { refs.undo.disabled = !history.canUndo || !!runner; refs.redo.disabled = !history.canRedo || !!runner; } }

function renderWarnings() {
  const list = validate(project);
  refs.warnings.replaceChildren(...list.map((w) => h('li', { class: w.level }, w.text)));
  refs.warnBadge.textContent = list.length ? `${list.filter((x) => x.level === 'error').length} errores · ${list.filter((x) => x.level === 'warn').length} avisos` : 'Sin problemas';
  refs.warnBadge.className = `badge ${list.some((x) => x.level === 'error') ? 'err' : list.length ? 'warn' : 'ok'}`;
}

function refreshAll() {
  if (!refs.left) return;
  refs.name.value = project.name;
  renderLeft(); renderRight(); drawStage(); renderStatus(); refreshHistoryButtons(); renderWarnings();
}

function undo() { if (runner) return; if (history.undo()) { fixSelection(); loadImages(); refreshAll(); autosave(); } }
function redo() { if (runner) return; if (history.redo()) { fixSelection(); loadImages(); refreshAll(); autosave(); } }
function fixSelection() { if (!findScene(project, sceneId)) sceneId = project.scenes[0].id; if (selectedId != null && !selected()) selectedId = null; }

/* ---------- Vista previa ---------- */
function startPlay() {
  const errs = validate(project).filter((x) => x.level === 'error');
  if (errs.length) return showProblems(errs);
  const copy = JSON.parse(JSON.stringify(project));
  copy.startScene = scene().id;
  refs.stageWrap.classList.add('playing');
  refs.play.textContent = '⏹ Detener'; refs.play.classList.add('danger');
  runner = runInCanvases(copy, { top: cv.top, bottom: cv.bottom }, images, sounds, {
    onFrame: (g) => { refs.hud.textContent = `${g.scene.name}${runner?.paused ? ' · en pausa' : ''}`; syncLiveVars(g); },
    onQuit: () => stopPlay(),
  });
  buildLiveVars();
  refs.pauseBtn.textContent = '⏸ Pausa';
  cv.bottom.focus?.();
  refreshHistoryButtons();
}
function buildLiveVars() {
  refs.varsLive.replaceChildren(...project.variables.map((v) => h('label', { class: 'live-var' }, h('span', {}, v.name), h('input', { type: 'number', 'data-var': v.name, value: v.value, onChange: (e) => { if (runner) runner.game.vars[v.name] = Number(e.target.value) || 0; } }))));
}
function syncLiveVars(g) {
  for (const inp of refs.varsLive.querySelectorAll('input')) if (inp !== document.activeElement && g.vars[inp.dataset.var] !== undefined) inp.value = g.vars[inp.dataset.var];
}
function togglePause() {
  if (!runner) return;
  runner.pause(!runner.paused);
  refs.pauseBtn.textContent = runner.paused ? '▶ Seguir' : '⏸ Pausa';
}

function stopPlay() {
  if (!runner) return;
  runner.stop(); runner = null;
  refs.stageWrap?.classList.remove('playing');
  if (refs.play) { refs.play.textContent = '▶ Probar'; refs.play.classList.remove('danger'); }
  refs.hud.textContent = '';
  drawStage(); refreshHistoryButtons();
}

function showProblems(errs) {
  dialog('Hay problemas que arreglar', h('ul', { class: 'problems' }, errs.map((e) => h('li', {}, e.text))));
}

/* ---------- Proyectos (guardar / abrir / copias) ---------- */
function openProjects() {
  const body = h('div', {});
  const draw = () => {
    body.replaceChildren(
      h('h4', {}, 'Nuevo proyecto desde una plantilla'),
      h('div', { class: 'tpl-grid' }, TEMPLATES.map((t) => h('button', { class: 'card tpl', 'data-tpl': t.id, onClick: () => { setProject(t.make(), { fresh: true }); d.close(); } }, h('span', { class: 'card-icon' }, t.icon), h('strong', {}, t.name), h('span', { class: 'muted small' }, t.desc)))),
      h('div', { class: 'row-btns' },
        h('label', { class: 'btn' }, 'Abrir archivo .c3ds.json…', h('input', { type: 'file', accept: '.json,application/json', hidden: true, onChange: async (e) => { const f = e.target.files[0]; if (!f) return; try { const p = migrate(JSON.parse(await f.text())); p.localId = newLocalId(); if (validate(p).some((x) => /^Falta/.test(x.text))) toast('El archivo no contiene todos los recursos.', 'error'); setProject(p, { fresh: true }); d.close(); } catch (err) { toast(`Archivo no válido: ${err.message}`, 'error'); } } }))),
      h('h4', {}, 'Guardados en este navegador'),
      h('ul', { class: 'list proj' }, listProjects().length ? listProjects().map((x) => h('li', { class: x.id === project.localId ? 'active' : '' },
        h('button', { class: 'row', onClick: () => { const p = loadProject(x.id); if (p) { setProject(migrate(p)); d.close(); } else toast('No se pudo abrir.', 'error'); } }, x.name, h('small', {}, `${new Date(x.updated).toLocaleString()} · ${(x.bytes / 1024).toFixed(0)} KB`)),
        h('button', { class: 'mini ghost', title: 'Borrar', onClick: () => { if (confirm(`¿Borrar "${x.name}"?`)) { deleteProject(x.id); draw(); } } }, '🗑'))) : h('li', { class: 'empty' }, 'Todavía no hay proyectos guardados.')),
    );
  };
  const d = dialog('Proyectos y plantillas', body);
  draw();
}

/* ---------- Ayuda ---------- */
function showShortcuts() {
  const rows = [['Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'], ['Ctrl+D', 'Duplicar el objeto seleccionado'], ['Ctrl+C / Ctrl+V', 'Copiar y pegar objetos (también entre escenas)'], ['Supr', 'Eliminar el objeto seleccionado'], ['Flechas', 'Mover 1 px (Mayús: 10 px)'], ['Arrastrar', 'Mover; el cuadro rojo redimensiona'], ['Esc', 'Detener la vista previa'], ['?', 'Esta ayuda'],
    ['Flechas', 'En la vista previa: D-Pad'], ['Z X S A', 'A B X Y'], ['Enter / Shift', 'Start / Select'], ['Ratón', 'Pantalla táctil (inferior)']];
  dialog('Atajos y controles', h('dl', { class: 'shortcuts' }, rows.flatMap(([k, v]) => [h('dt', {}, h('span', { class: 'kbd' }, k)), h('dd', {}, v)])));
}

function showGuide() {
  const steps = [['1', 'Crea', 'Elige una plantilla en 📁 Proyectos o empieza en blanco. Añade rectángulos, textos, sprites y botones táctiles.'], ['2', 'Coloca', 'Arrastra en el escenario; el cuadro rojo redimensiona. Las flechas mueven 1 px; Mayús, 10.'], ['3', 'Programa', 'En Lógica: “Cuando pase esto → haz esto”. Colisiones, bordes, toques, variables y temporizadores.'], ['4', 'Prueba', '▶ Probar: pausa, paso a paso, velocidad y cajas de colisión para depurar.'], ['5', 'Exporta', 'Proyecto 3DS (.zip → .3dsx/.cia), HTML5, o app para Windows, macOS y Linux.']];
  dialog('Guía rápida', h('ol', { class: 'guide-steps' }, steps.map(([n, t, d]) => h('li', {}, h('span', { class: 'num' }, n), h('div', {}, h('strong', {}, t), h('p', { class: 'muted' }, d))))));
}

/* ---------- Exportar ---------- */
function exportBlockers() {
  const errs = validate(project).filter((x) => x.level === 'error');
  if (errs.length) { showProblems(errs); return true; }
  return false;
}
function exportZip() {
  if (exportBlockers()) return;
  const files = exportFiles(project);
  download(createZip(files), `${slug(project.name)}-3ds.zip`, 'application/zip');
  toast('Proyecto 3DS exportado. Descomprímelo y ejecuta make / make cia.', 'ok', 6000);
}
async function exportHtml5() {
  if (exportBlockers()) return;
  try {
    download(buildHtml5(project), `${slug(project.name)}.html`, 'text/html');
    toast('Juego HTML5 exportado (un solo archivo).', 'ok');
  } catch { toast('No se pudo generar el HTML5.', 'error'); }
}
function exportJson() {
  download(JSON.stringify(project, null, 2), `${slug(project.name)}.c3ds.json`, 'application/json');
}

const TARGET_NAME = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };

async function cloudBuild(target = '3ds') {
  if (exportBlockers()) return;
  const status = h('p', { class: 'build-status' }, 'Enviando proyecto…');
  const bar = h('div', { class: 'bar' }, h('i', {}));
  const link = h('div', {});
  const d = dialog('Compilar en la nube', h('div', {}, h('p', { class: 'muted small' }, target !== '3ds' ? `Se empaqueta tu juego como app de ${TARGET_NAME[target]} (Tauri) con GitHub Actions. Tarda unos 5 minutos. No se crea ninguna release.` : 'Se compila con GitHub Actions (devkitARM + tex3ds + makerom). No se crea ninguna release: solo recibes los archivos.'), bar, status, link), [{ label: 'Cerrar' }]);
  try {
    const { id } = await startBuild(project, target);
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      if (!d.el.isConnected) return;
      const s = await buildStatus(id);
      status.textContent = STATUS_LABEL[s.status] || s.status;
      bar.firstChild.style.width = { queued: '15%', running: '60%', success: '100%', failed: '100%' }[s.status] || '10%';
      if (s.status === 'success') {
        const dl = await buildDownload(id);
        link.append(h('a', { class: 'btn primary', href: dl.url }, target !== '3ds' ? `Descargar la app de ${TARGET_NAME[target]} (zip)` : `Descargar ${slug(project.name)}.3dsx + .cia (zip)`), h('p', { class: 'muted small' }, 'El enlace caduca en unos minutos.'));
        return;
      }
      if (s.status === 'failed') { link.append(h('p', { class: 'err' }, 'La compilación falló. Revisa el proyecto o usa “Exportar .zip” y compila en local.'), s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, 'Ver registro en GitHub') : null); return; }
    }
    status.textContent = 'Tarda demasiado. Inténtalo más tarde.';
  } catch (e) {
    status.textContent = e.status === 404 || e.status === 503 ? 'La compilación en la nube no está disponible en este sitio (falta configurar el token en Netlify). Usa “Exportar .zip”.' : e.message;
    status.className = 'build-status err';
  }
}

/* ---------- Montaje ---------- */
export function mountEditor(root) {
  const mk = (id) => h('canvas', { id, width: SCREENS[id.slice(3)].w, height: SCREENS[id.slice(3)].h, tabindex: '0' });
  cv.top = mk('cv-top'); cv.bottom = mk('cv-bottom');
  refs.left = h('aside', { class: 'ed-left', 'aria-label': 'Escenas, objetos y recursos' });
  refs.right = h('aside', { class: 'ed-right', 'aria-label': 'Propiedades' });
  refs.name = h('input', { class: 'proj-name', 'aria-label': 'Nombre del proyecto', maxlength: 40, onInput: (e) => { project.name = e.target.value || 'Sin nombre'; live(); } });
  refs.status = h('span', { class: 'status' });
  refs.undo = h('button', { class: 'icon-btn', title: 'Deshacer (Ctrl+Z)', onClick: undo }, '↶');
  refs.redo = h('button', { class: 'icon-btn', title: 'Rehacer (Ctrl+Y)', onClick: redo }, '↷');
  refs.play = h('button', { class: 'btn primary', id: 'btn-play', onClick: () => (runner ? stopPlay() : startPlay()) }, '▶ Probar');
  refs.hud = h('div', { class: 'hud', 'aria-live': 'off' });
  refs.coords = h('span', { class: 'coords', 'aria-hidden': 'true' });
  refs.pauseBtn = h('button', { class: 'btn small', id: 'btn-pause', title: 'Pausar o seguir', onClick: togglePause }, '⏸ Pausa');
  refs.debugBar = h('div', { class: 'debug-bar' },
    refs.pauseBtn,
    h('button', { class: 'btn small', id: 'btn-step', title: 'Avanzar un frame', onClick: () => { if (runner) { runner.step(); refs.pauseBtn.textContent = '▶ Seguir'; } } }, '⏭ Frame'),
    h('button', { class: 'btn small', id: 'btn-restart', title: 'Reiniciar el juego', onClick: () => { if (runner) { runner.restart(); runner.pause(false); refs.pauseBtn.textContent = '⏸ Pausa'; buildLiveVars(); } } }, '↺ Reiniciar'),
    h('label', { class: 'check small' }, 'Velocidad', selectInput([[0.5, '0.5×'], [1, '1×'], [2, '2×'], [4, '4×']], 1, (v) => runner?.setSpeed(v))),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', id: 'chk-boxes', onChange: (e) => runner?.showBoxes(e.target.checked) }), 'Cajas de colisión'));
  refs.varsLive = h('div', { class: 'vars-live', 'aria-label': 'Variables en vivo' });
  refs.warnings = h('ul', { class: 'warnings', 'aria-live': 'polite' });
  refs.warnBadge = h('button', { class: 'badge', onClick: () => refs.warnPanel.toggleAttribute('hidden') });
  refs.warnPanel = h('div', { class: 'warn-panel', hidden: true }, refs.warnings);
  let guideSeen = false;
  try { guideSeen = localStorage.getItem('c3ds:guide') === '1'; } catch { /* sin almacenamiento */ }
  refs.guide = h('div', { class: 'guide', hidden: guideSeen, id: 'guide' },
    h('span', {}, '👋 ¿Primera vez? Añade objetos con los botones ▭ T 🖼 ⏺, arrástralos, crea reglas en la pestaña Lógica y pulsa ▶ Probar.'),
    h('button', { class: 'btn small', onClick: showGuide }, 'Ver guía rápida'),
    h('button', { class: 'btn small ghost', id: 'btn-guide-close', onClick: () => { refs.guide.hidden = true; try { localStorage.setItem('c3ds:guide', '1'); } catch { /* ok */ } } }, 'Entendido'));
  const menu = h('div', { class: 'menu', onClick: (e) => { if (e.target.closest('[role=menuitem]')) menu.classList.remove('open'); } },
    h('button', { class: 'btn', id: 'btn-export', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onClick: (e) => { const m = e.currentTarget.parentElement; const open = m.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); } }, 'Exportar ▾'),
    h('div', { class: 'menu-items', role: 'menu' },
      h('button', { role: 'menuitem', onClick: exportZip }, '📦 Proyecto 3DS (.zip)  →  .3dsx / .cia'),
      h('button', { role: 'menuitem', id: 'btn-cloud', onClick: () => cloudBuild('3ds') }, '☁ Compilar en la nube (.3dsx + .cia)'),
      h('button', { role: 'menuitem', id: 'btn-html5', onClick: exportHtml5 }, '🌐 Juego HTML5 (jugable en navegador)'),
      h('button', { role: 'menuitem', onClick: exportJson }, '💾 Copia del proyecto (.c3ds.json)'),
      h('button', { role: 'menuitem', id: 'btn-cloud-win', onClick: () => cloudBuild('windows') }, '🪟 Juego para Windows (.exe, en la nube)'),
      h('button', { role: 'menuitem', id: 'btn-cloud-mac', onClick: () => cloudBuild('macos') }, '🍎 Juego para macOS (.dmg, en la nube)'),
      h('button', { role: 'menuitem', id: 'btn-cloud-linux', onClick: () => cloudBuild('linux') }, '🐧 Juego para Linux (.AppImage / .deb, en la nube)')));
  refs.stageWrap = h('div', { class: 'stage-wrap' },
    h('div', { class: 'stage-bar' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: grid, onChange: (e) => { grid = e.target.checked; drawStage(); } }), 'Cuadrícula'),
      h('label', { class: 'check' }, 'Zoom', selectInput([[1, '100%'], [1.25, '125%'], [1.5, '150%'], [2, '200%']], zoom, (v) => { zoom = Number(v); root.style.setProperty('--zoom', zoom); })),
      refs.coords, refs.hud),
    h('div', { class: 'screens' },
      h('figure', {}, h('figcaption', {}, 'Superior 400×240'), cv.top),
      h('figure', {}, h('figcaption', {}, 'Inferior 320×240 · táctil'), cv.bottom)),
    refs.debugBar, refs.varsLive,
    h('div', { class: 'pad', 'aria-label': 'Controles táctiles de la vista previa' },
      h('div', { class: 'dpad' }, ['UP', 'LEFT', 'RIGHT', 'DOWN'].map((k) => padBtn(k, { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' }[k]))),
      h('div', { class: 'abxy' }, ['A', 'B', 'X', 'Y', 'START'].map((k) => padBtn(k, k === 'START' ? 'Start' : k)))));
  root.append(
    h('div', { class: 'ed-toolbar' },
      refs.name, refs.undo, refs.redo, refs.status, h('span', { class: 'spacer' }), refs.warnBadge,
      h('button', { class: 'icon-btn', id: 'btn-help', title: 'Atajos de teclado (?)', 'aria-label': 'Atajos de teclado', onClick: showShortcuts }, '⌨'),
      h('button', { class: 'btn', id: 'btn-projects', onClick: openProjects }, '📁 Proyectos'), refs.play, menu),
    refs.warnPanel,
    refs.guide,
    h('div', { class: 'ed-grid' }, refs.left, refs.stageWrap, refs.right));
  root.style.setProperty('--zoom', zoom);
  bindStage();
  window.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'checkbox';
    if (root.closest('section')?.hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { if (inField) return; e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { if (inField) return; e.preventDefault(); redo(); }
    else if (e.key === 'Escape' && runner) stopPlay();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !inField && !runner) { e.preventDefault(); pasteObject(); }
    else if (e.key === '?' && !inField) showShortcuts();
    else if (!runner && !inField && selected()) {
      const o = selected(); const step = e.shiftKey ? 10 : 1;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      else if (e.key.startsWith('Arrow')) { e.preventDefault(); o.x += { ArrowLeft: -step, ArrowRight: step }[e.key] || 0; o.y += { ArrowUp: -step, ArrowDown: step }[e.key] || 0; syncInspector(); live(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); }
    }
  });
  window.addEventListener('beforeunload', () => { if (saveState === 'dirty') saveProject(project); });
  const last = lastProjectId();
  const saved = last && loadProject(last);
  let p;
  try { p = saved ? migrate(saved) : null; } catch { p = null; }
  setProject(p || newProject(), { fresh: !p });
  return { getProject: () => project, setProject, addImages, addSounds, openProjects };
}

function padBtn(key, label) {
  const b = h('button', { class: 'padbtn', 'data-key': key, 'aria-label': key }, label);
  const on = (v) => (e) => { e.preventDefault(); runner?.hold(key, v); };
  b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false));
  return b;
}
