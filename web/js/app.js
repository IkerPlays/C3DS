import { LIMIT_ROWS } from './limits.js';
import { h, $, $$, toast } from './ui.js';
import { mountEditor } from './editor.js';
import { mountImporter } from './importer.js';
import { mountHome, isNativeApp } from './home.js';
import { mountThemeToggle } from './theme.js';
import { checkForUpdate } from './update-check.js';
import { decodeProject, tokenFromHash } from './share.js';

const TABS = ['home', 'editor', 'import', 'downloads', 'limits'];

function showTab(name) {
  if (!TABS.includes(name)) name = 'home';
  for (const b of $$('#tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const s of $$('main > section')) s.hidden = s.id !== `tab-${name}`;
  document.title = { home: 'C3DS - Crea juegos para Nintendo 3DS', editor: 'Editor · C3DS', import: 'Importar · C3DS', downloads: 'Descargas · C3DS', limits: 'Límites 3DS · C3DS' }[name];
  try { history.replaceState(null, '', `#${name}`); } catch { /* sin historial */ }
  if (name !== 'home') window.scrollTo({ top: 0 });
}

for (const b of $$('#tabs button')) b.addEventListener('click', () => showTab(b.dataset.tab));
// Enlaces internos (#editor, #downloads…) dentro de la página.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const t = a.getAttribute('href').slice(1);
  if (TABS.includes(t)) { e.preventDefault(); showTab(t); }
});

mountThemeToggle($('#theme-btn'));
for (const [k, v] of LIMIT_ROWS) $('#limits-table').append(h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v)));

const editor = mountEditor($('#editor-root'));
mountImporter($('#tab-import'), {
  openInEditor: (project) => {
    if (project) editor.setProject(project, { fresh: true });
    showTab('editor');
    if (project) toast('Proyecto creado con los assets convertidos.', 'ok');
  },
});
mountHome($('#tab-home').parentElement, {
  openTemplate: (t) => { editor.setProject(t.make(), { fresh: true }); showTab('editor'); toast(`Plantilla “${t.name}” abierta.`, 'ok'); },
});

async function openSharedFromHash() {
  const token = tokenFromHash(location.hash);
  if (!token) return false;
  try {
    const p = await decodeProject(token);
    editor.setProject(p, { fresh: true });
    toast(`Proyecto “${p.name}” abierto desde el enlace.`, 'ok', 5000);
  } catch (e) { toast(e.message, 'error', 7000); }
  showTab('editor');
  return true;
}

(async () => { if (!(await openSharedFromHash())) showTab(location.hash.slice(1)); })();
window.addEventListener('hashchange', async () => { if (!(await openSharedFromHash())) showTab(location.hash.slice(1)); });

// Versión y aviso de actualización.
fetch('VERSION').then((r) => (r.ok ? r.text() : '')).then(async (v) => {
  const current = v.trim();
  if (!current) return;
  $('#app-version').textContent = `v${current}`;
  const up = await checkForUpdate(current);
  if (up && isNativeApp()) {
    const bar = $('#update-bar');
    bar.hidden = false;
    bar.replaceChildren('Hay una versión nueva: ', h('a', { href: up.url, target: '_blank', rel: 'noopener' }, `C3DS ${up.version}`));
  }
}).catch(() => {});

// PWA: instalable y con editor sin conexión (no dentro de las apps nativas).
if ('serviceWorker' in navigator && !isNativeApp() && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.c3ds = { editor }; // útil para depurar y para los tests de interfaz
