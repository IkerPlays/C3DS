import test from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../../web/js/history.js';
import { saveProject, loadProject, listProjects, deleteProject, lastProjectId } from '../../web/js/storage.js';
import { fitSize, pow2Size } from '../../web/js/images.js';
import { buildHtml5 } from '../../web/js/html5.js';
import { compareVersions, checkForUpdate } from '../../web/js/update-check.js';
import { newProject } from '../../web/js/model.js';
import { readFileSync } from 'node:fs';

const memStore = (limit = Infinity) => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if ([...m.values()].join('').length + v.length > limit) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); m.set(k, v); }, removeItem: (k) => m.delete(k) };
};

test('deshacer / rehacer', () => {
  const p = newProject();
  const h = new History(p);
  assert.equal(h.commit(), false, 'sin cambios no añade');
  p.name = 'A'; assert.equal(h.commit(), true);
  p.name = 'B'; p.scenes[0].name = 'Otra'; h.commit();
  assert.equal(h.canUndo, true); assert.equal(h.canRedo, false);
  h.undo(); assert.equal(p.name, 'A'); assert.equal(p.scenes[0].name, 'Menú');
  assert.ok(Object.keys(p.blobs).length === 5, 'los blobs se conservan');
  h.undo(); assert.equal(p.name, 'Mi primer juego');
  assert.equal(h.undo(), false);
  h.redo(); h.redo(); assert.equal(p.name, 'B'); assert.equal(h.redo(), false);
  h.undo(); p.name = 'C'; h.commit(); assert.equal(h.canRedo, false, 'nueva rama borra el rehacer');
});

test('historial limitado', () => {
  const p = newProject(); const h = new History(p, 5);
  for (let i = 0; i < 20; i++) { p.name = `n${i}`; h.commit(); }
  assert.equal(h.stack.length, 5);
});

test('guardado local: varios proyectos, cargar, borrar y cuota', () => {
  const st = memStore();
  const a = newProject(); a.name = 'Uno';
  const b = newProject(); b.name = 'Dos';
  assert.equal(saveProject(a, st).ok, true);
  assert.equal(saveProject(b, st).ok, true);
  assert.deepEqual(listProjects(st).map((x) => x.name), ['Dos', 'Uno']);
  assert.equal(lastProjectId(st), b.localId);
  assert.equal(loadProject(a.localId, st).name, 'Uno');
  a.name = 'Uno v2'; saveProject(a, st);
  assert.equal(listProjects(st).length, 2);
  assert.equal(listProjects(st)[0].name, 'Uno v2');
  deleteProject(a.localId, st);
  assert.equal(loadProject(a.localId, st), null);
  const small = memStore(1000);
  const r = saveProject(newProject(), small);
  assert.equal(r.ok, false); assert.match(r.error, /almacenamiento local/);
  assert.equal(saveProject(newProject(), null).ok, false);
  assert.equal(loadProject('x', { getItem() { throw new Error('x'); } }), null);
});

test('tamaños de imagen', () => {
  assert.deepEqual(fitSize(100, 50), { w: 100, h: 50 });
  assert.deepEqual(fitSize(2048, 1024, 512), { w: 512, h: 256 });
  assert.deepEqual(pow2Size(100, 33), { w: 128, h: 64 });
  assert.deepEqual(pow2Size(5000, 3), { w: 1024, h: 8 });
});

test('HTML5 exportado incluye el motor y el proyecto, sin romper el HTML', () => {
  const p = newProject(); p.name = '</script><b>x';
  const html = buildHtml5(p, readFileSync(new URL('../../web/js/runtime.js', import.meta.url), 'utf8'));
  assert.match(html, /<canvas id="top"/);
  assert.match(html, /class Game/);
  assert.ok(!/^import /m.test(html) && !/^export /m.test(html));
  assert.equal(html.split('</script>').length - 1, 2, 'solo los cierres legítimos');
  const m = /<script type="application\/json" id="project">(.*?)<\/script>/s.exec(html);
  assert.equal(JSON.parse(m[1]).name, '</script><b>x');
  assert.ok(!html.includes('<title></script>'));
});

test('runtime-source.js está sincronizado con runtime.js', async () => {
  const { render } = await import('../../scripts/gen-runtime-source.mjs');
  assert.equal(readFileSync(new URL('../../web/js/runtime-source.js', import.meta.url), 'utf8'), render(), 'ejecuta: npm run gen:runtime');
  const html = buildHtml5(newProject());
  assert.match(html, /class Game/);
});

test('aviso de actualización', async () => {
  assert.equal(compareVersions('v1.2.0', '1.1.9'), 1);
  assert.equal(compareVersions('0.1.0', '0.1.0-dev.4'), 0);
  assert.equal(compareVersions('0.1.0', '0.2.0'), -1);
  const ok = async () => ({ ok: true, json: async () => ({ tag_name: 'v0.3.0', html_url: 'u' }) });
  assert.deepEqual(await checkForUpdate('0.2.0', ok), { version: '0.3.0', url: 'u' });
  assert.equal(await checkForUpdate('0.3.0', ok), null);
  assert.equal(await checkForUpdate('0.1.0', async () => { throw new Error('x'); }), null);
  assert.equal(await checkForUpdate('0.1.0', async () => ({ ok: false })), null);
});
