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
