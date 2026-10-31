// Página de inicio (demo en vivo, plantillas) y de descargas (releases de GitHub).
import { h, $, toast } from './ui.js';
import { Game, render } from './runtime.js';
import { newProject } from './model.js';
import { TEMPLATES } from './templates.js';
import { fetchReleases, detectOS, primaryAsset, humanSize, renderNotes, OS_INFO, REPO } from './downloads.js';

export const isNativeApp = () => !!(window.__TAURI_INTERNALS__ || window.__TAURI__ || window.Capacitor);

/* ---------- Demo del hero: el juego de ejemplo jugando solo ---------- */
function mountDemo(root, isVisible) {
  const top = $('#demo-top', root); const bottom = $('#demo-bottom', root);
  if (!top || !bottom) return;
  const project = newProject();
  project.startScene = project.scenes[1].id;
  const g = new Game(project, { rng: Math.random });
  const images = new Map();
  for (const a of project.assets.images) { const im = new Image(); im.src = project.blobs[a.id]; images.set(a.id, im); }
  const ctxs = { top: top.getContext('2d'), bottom: bottom.getContext('2d') };
  let last = 0; let acc = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!isVisible() || document.hidden) { last = now; return; }
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) {
      acc -= 1000 / 60;
      const [pl, coin] = g.objs;
      const held = new Set();
      if (coin.x + 16 > pl.x + pl.w / 2 + 3) held.add('RIGHT'); else if (coin.x + 16 < pl.x + pl.w / 2 - 3) held.add('LEFT');
      if (coin.y + 16 > pl.y + pl.h / 2 + 3) held.add('DOWN'); else if (coin.y + 16 < pl.y + pl.h / 2 - 3) held.add('UP');
      g.step({ down: new Set(), held, touch: null, touchDown: false });
    }
    render(g, ctxs, images);
  };
  requestAnimationFrame(loop);
}

/* ---------- Plantillas ---------- */
/** Dibuja la pantalla superior de la primera escena de la plantilla (miniatura). */
function drawThumb(t, canvas) {
  try {
    const p = t.make();
    const g = new Game(p, { rng: () => 0.37 });
    const best = p.scenes.reduce((a, b) => (b.objects.length > a.objects.length ? b : a), p.scenes[0]);
    if (best) g.enter(best.id);
    const images = new Map();
    let pending = p.assets.images.length;
    const paint = () => render(g, { top: canvas.getContext('2d'), bottom: document.createElement('canvas').getContext('2d') }, images);
    if (!pending) paint();
    for (const a of p.assets.images) { const im = new Image(); im.onload = () => { images.set(a.id, im); if (--pending === 0) paint(); }; im.onerror = () => { if (--pending === 0) paint(); }; im.src = p.blobs[a.id]; }
  } catch { /* sin miniatura */ }
}

function mountTemplates(root, openTemplate) {
  const box = $('#tpl-cards', root);
  if (!box) return;
  box.replaceChildren(...TEMPLATES.filter((t) => t.id !== 'blank').map((t) => {
    const thumb = h('canvas', { class: 'thumb-canvas', width: 400, height: 240, 'aria-hidden': 'true' });
    drawThumb(t, thumb);
    return h('button', { class: 'card tpl', 'data-tpl': t.id, onClick: () => openTemplate(t) },
      thumb, h('strong', {}, `${t.icon} ${t.name}`), h('span', { class: 'muted' }, t.desc), h('span', { class: 'card-cta' }, 'Abrir en el editor →'));
  }));
}

/* ---------- Descargas ---------- */
const CACHE_KEY = 'c3ds:releases';
async function loadReleases() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.t < 10 * 60 * 1000) return c.data;
  } catch { /* sin caché */ }
  const data = await fetchReleases();
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* sin caché */ }
  return data;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

function osCard(os, group, mine) {
  const list = group.byOs[os];
  const main = list[0];
  return h('div', { class: `card os ${mine ? 'mine' : ''}`, 'data-os': os },
    mine ? h('span', { class: 'pill' }, 'Recomendado para ti') : null,
    h('span', { class: 'card-icon' }, OS_INFO[os].icon),
    h('strong', {}, OS_INFO[os].label),
    h('span', { class: 'muted small' }, OS_INFO[os].note),
    h('a', { class: 'btn primary', href: main.url, rel: 'noopener' }, `Descargar ${main.kind}`, h('small', {}, humanSize(main.size))),
    list.length > 1 ? h('ul', { class: 'alt' }, list.slice(1).map((a) => h('li', {}, h('a', { href: a.url, rel: 'noopener' }, a.kind), ' ', h('small', { class: 'muted' }, humanSize(a.size))))) : null);
}

function renderHomeDownload(root, rel, os) {
  const box = $('#hero-dl', root);
  const ver = $('#hero-version', root);
  if (ver) ver.textContent = rel ? rel.version : '0.1';
  if (!box) return;
  const a = rel && os ? primaryAsset(rel, os) : null;
  box.replaceChildren(a
    ? h('a', { class: 'btn big', href: a.url, rel: 'noopener', id: 'hero-download' }, `⬇ Descargar para ${OS_INFO[os].label}`, h('small', {}, `v${rel.version} · ${humanSize(a.size)}`))
    : h('button', { class: 'btn big', id: 'hero-download', onClick: () => { location.hash = 'downloads'; } }, '⬇ Descargas'));
}

function renderDownloadsPage(root, data, os, error) {
  const stableBox = $('#dl-stable', root); const devBox = $('#dl-dev', root); const notesBox = $('#dl-notes', root);
  if (!stableBox) return;
  if (error) {
    stableBox.replaceChildren(h('div', { class: 'finding warn' }, h('b', {}, 'No se pudieron cargar las descargas'), h('span', {}, `${error} · `, h('a', { href: `https://github.com/${REPO}/releases`, target: '_blank', rel: 'noopener' }, 'Abrir la página de releases en GitHub'))));
    return;
  }
  const { stable, dev } = data;
  if (!stable) {
    stableBox.replaceChildren(h('div', { class: 'finding info' }, h('b', {}, 'Todavía no hay una versión estable publicada'), h('span', {}, 'Prueba el editor en el navegador o descarga un devbuild.')));
  } else {
    const order = [...stable.oses].sort((a, b) => (b === os) - (a === os));
    stableBox.replaceChildren(
      h('div', { class: 'rel-head' }, h('h3', {}, `C3DS ${stable.version}`), h('span', { class: 'muted' }, `Publicada el ${fmtDate(stable.date)}`),
        h('a', { href: stable.url, target: '_blank', rel: 'noopener' }, 'Ver en GitHub'), stable.checksums ? h('a', { href: stable.checksums, rel: 'noopener' }, 'SHA256SUMS.txt') : null),
      h('div', { class: 'cards' }, order.map((o) => osCard(o, stable, o === os))));
    notesBox?.replaceChildren(h('details', {}, h('summary', {}, 'Novedades de esta versión'), h('div', { class: 'notes' }, renderNotes(stable.notes, h))));
  }
  if (devBox) {
    if (dev) devBox.replaceChildren(
      h('p', { class: 'muted' }, `Última versión de desarrollo: ${dev.name} · ${fmtDate(dev.date)}. Puede fallar; se genera con cada cambio.`),
      h('div', { class: 'chips' }, dev.oses.flatMap((o) => dev.byOs[o].map((a) => h('a', { class: 'chip-link', href: a.url, rel: 'noopener' }, `${OS_INFO[o].icon} ${a.kind} `, h('small', {}, humanSize(a.size)))))));
    else devBox.replaceChildren(h('p', { class: 'muted' }, 'No hay devbuilds publicados.'));
  }
}

export async function mountHome(root, { openTemplate }) {
  mountTemplates(root, openTemplate);
  mountDemo(root, () => !$('#tab-home', document)?.hidden);
  const os = detectOS(navigator.userAgent, navigator.platform || '', navigator.maxTouchPoints || 0);
  if (isNativeApp()) {
    for (const el of root.querySelectorAll('[data-web-only]')) el.hidden = true;
    for (const el of root.querySelectorAll('[data-app-only]')) el.hidden = false;
  }
  try {
    const data = await loadReleases();
    renderHomeDownload(root, data.stable || data.dev, os);
    renderDownloadsPage(root, data, os);
  } catch (e) {
    renderHomeDownload(root, null, os);
    renderDownloadsPage(root, null, os, e.message);
    if (!/403|429/.test(e.message)) toast('No se pudieron leer las releases de GitHub.', 'error');
  }
}
