import { LIMIT_ROWS } from './limits.js';
import { h, $, $$, toast } from './ui.js';
import { mountEditor } from './editor.js';
import { mountImporter } from './importer.js';
import { checkForUpdate } from './update-check.js';

const TABS = ['editor', 'import', 'limits', 'about'];
let editor;

function showTab(name) {
  if (!TABS.includes(name)) name = 'editor';
  for (const b of $$('#tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const s of $$('main > section')) s.hidden = s.id !== `tab-${name}`;
  try { history.replaceState(null, '', `#${name}`); } catch { /* sin historial */ }
}

for (const b of $$('#tabs button')) b.addEventListener('click', () => showTab(b.dataset.tab));

for (const [k, v] of LIMIT_ROWS) $('#limits-table').append(h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v)));

editor = mountEditor($('#editor-root'));
mountImporter($('#tab-import'), {
  openInEditor: (project) => {
    if (project) editor.setProject(project, { fresh: true });
    showTab('editor');
    if (project) toast('Proyecto creado con los assets convertidos.', 'ok');
  },
});

showTab(location.hash.slice(1));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// Aviso de nueva versión (solo si hay una release estable más nueva).
fetch('VERSION').then((r) => (r.ok ? r.text() : '')).then(async (v) => {
  const current = v.trim();
  if (current) $('#app-version').textContent = `v${current}`;
  if (!current) return;
  const up = await checkForUpdate(current);
  if (up) {
    const bar = $('#update-bar');
    bar.hidden = false;
    bar.replaceChildren('Hay una versión nueva: ', h('a', { href: up.url, target: '_blank', rel: 'noopener' }, `C3DS ${up.version}`));
  }
}).catch(() => {});

window.c3ds = { editor }; // útil para depurar y para los tests de interfaz
