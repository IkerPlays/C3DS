import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, defaultValues, applyRecipe } from '../../web/js/recipes.js';
import { newProject, validate, makeObject } from '../../web/js/model.js';
import { Game } from '../../web/js/runtime.js';
import { generateMainC } from '../../web/js/codegen.js';
import { describeRule } from '../../web/js/rules.js';

test('todas las recetas generan reglas válidas, se describen y se exportan a C', () => {
  for (const r of RECIPES) {
    const p = newProject(); const sc = p.scenes[1];
    const before = sc.rules.length;
    const n = applyRecipe(r, defaultValues(r, p, sc), p, sc);
    assert.equal(sc.rules.length, before + n, r.id);
    assert.deepEqual(validate(p).filter((x) => x.level === 'error'), [], `${r.id}: ${validate(p).map((x) => x.text).join('; ')}`);
    assert.ok(!/…|¿\?/.test(describeRule(sc.rules.at(-1), p, sc)), `${r.id}: ${describeRule(sc.rules.at(-1), p, sc)}`);
    assert.ok(generateMainC(p).includes('int main'));
  }
});

test('receta “recoger”: suma y hace desaparecer al chocar', () => {
  const p = newProject(); const sc = p.scenes[1]; sc.rules.length = 0; sc.objects.length = 0;
  const a = makeObject(p, 'rect', { name: 'A', x: 10, y: 10, w: 20, h: 20 }); const b = makeObject(p, 'rect', { name: 'B', x: 15, y: 15, w: 10, h: 10 });
  sc.objects.push(a, b);
  applyRecipe(RECIPES.find((r) => r.id === 'collect'), { player: a.id, item: b.id, var: 'puntos' }, p, sc);
  const g = new Game(p); g.enter(sc.id);
  g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.vars.puntos, 1); assert.equal(g.objs.find((o) => o.id === b.id).visible, false);
});

test('receta “saltar”: salta desde el suelo y no en el aire', () => {
  const p = newProject(); const sc = p.scenes[1]; sc.rules.length = 0; sc.objects.length = 0;
  const ground = makeObject(p, 'rect', { name: 'S', x: 0, y: 200, w: 400, h: 40, solid: true }); const pl = makeObject(p, 'rect', { name: 'J', x: 50, y: 150, w: 20, h: 30, gravity: 0.6 });
  sc.objects.push(ground, pl);
  applyRecipe(RECIPES.find((r) => r.id === 'jump'), { player: pl.id, ground: ground.id }, p, sc);
  const g = new Game(p); g.enter(sc.id);
  const step = (down = []) => g.step({ down: new Set(down), held: new Set(), touch: null, touchDown: false });
  for (let i = 0; i < 60; i++) step();
  const o = g.objs.find((x) => x.id === pl.id);
  step(['A']); assert.ok(o.vy < 0, 'salta');
});

test('el límite de reglas se respeta', () => {
  const p = newProject(); const sc = p.scenes[1];
  assert.throws(() => applyRecipe(RECIPES[0], defaultValues(RECIPES[0], p, sc), p, sc, sc.rules.length), /máximo/);
});
