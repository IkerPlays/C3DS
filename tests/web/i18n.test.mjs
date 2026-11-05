import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, getLang, tr } from '../../web/js/i18n.js';
import { EN } from '../../web/js/i18n-en.js';
import { describeRule } from '../../web/js/rules.js';
import { newProject } from '../../web/js/model.js';

test('el idioma por defecto es el español', () => {
  assert.equal(getLang(), 'es');
  assert.equal(tr('hola', 'hello'), 'hola');
});

test('translate: exactas, con espacios, con patrones y desconocidas', () => {
  assert.equal(translate('Inicio'), 'Home');
  assert.equal(translate('  Descargas\n '), '  Downloads\n ');
  assert.equal(translate('Eliminar sonido salto'), 'Delete sound salto');
  assert.equal(translate('Publicada el 31 de octubre de 2026'), 'Published on 31 Oct 2026');
  assert.equal(translate('Memoria estimada: texturas 0.02 / 6 MB VRAM · audio 0.01 MB · 6 objetos'), 'Estimated memory: textures 0.02 / 6 MB VRAM · audio 0.01 MB · 6 objects');
  assert.equal(translate('Máximo 8 escenas.'), 'Maximum 8 scenes.');
  assert.equal(translate('Texto que no existe en el diccionario'), 'Texto que no existe en el diccionario');
});

test('el diccionario no tiene entradas vacías ni con espacios en los extremos', () => {
  for (const [k, v] of Object.entries(EN)) {
    assert.ok(v && v.trim() === v, `valor raro para "${k}"`);
    assert.equal(k, k.trim(), `clave con espacios: "${k}"`);
  }
});

test('describeRule sigue en español por defecto', () => {
  const p = newProject(); const sc = p.scenes[1];
  assert.match(describeRule(sc.rules[0], p, sc), /choca con/);
});

test('proyectos de ejemplo en inglés: coherentes, sin errores y jugables', async () => {
  const { localizeProject } = await import('../../web/js/localize.js');
  const { TEMPLATES, LESSONS } = await import('../../web/js/templates.js');
  const { validate } = await import('../../web/js/model.js');
  const { Game } = await import('../../web/js/runtime.js');
  const { generateMainC } = await import('../../web/js/codegen.js');
  const make = [newProject, ...TEMPLATES.map((t) => t.make), ...LESSONS.map((l) => l.make)];
  for (const m of make) {
    const p = localizeProject(m());
    const errors = validate(p).filter((x) => x.level === 'error');
    assert.deepEqual(errors, [], `${p.name}: ${errors.map((e) => e.text).join('; ')}`);
    const left = JSON.stringify(p.scenes.map((s) => [s.name, s.objects.map((o) => [o.name, o.text])]));
    assert.ok(!/puntos|jugador|moneda|escena|Reintentar|Pulsa|juego/i.test(left), `${p.name}: queda español: ${left.slice(0, 200)}`);
    const g = new Game(p, { rng: () => 0.5 });
    for (let i = 0; i < 30; i++) g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
    assert.ok(generateMainC(p).includes('int main'));
  }
  const p = localizeProject(newProject());
  assert.equal(p.name, 'My first game');
  assert.ok(p.variables.some((v) => v.name === 'score'));
  assert.ok(p.scenes[1].objects.some((o) => o.text === 'Score: {score}'));
});
