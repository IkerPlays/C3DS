import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, ACTIONS, defaultWhen, defaultAction } from '../../web/js/rules.js';
import { newProject, validate } from '../../web/js/model.js';
import { Game } from '../../web/js/runtime.js';

test('todas las acciones y eventos por defecto son válidos y ejecutables', () => {
  const p = newProject();
  const scene = p.scenes[1];
  const ctx = { p, scene };
  scene.rules.length = 0;
  for (const type of Object.keys(EVENTS)) {
    const when = defaultWhen(type, ctx);
    assert.equal(when.type, type);
    scene.rules.push({ id: 1000 + scene.rules.length, when, then: Object.keys(ACTIONS).filter((a) => a !== 'quit').map((a) => defaultAction(a, ctx)) });
  }
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p, { rng: () => 0.1 });
  g.enter(scene.id);
  for (let i = 0; i < 70; i++) g.step({ down: new Set(['A']), held: new Set(['A']) });
  assert.ok(g.frames >= 0);
});

import { describeRule } from '../../web/js/rules.js';
test('describeRule resume reglas en lenguaje natural', () => {
  const p = newProject();
  const sc = p.scenes[1];
  const t = describeRule(sc.rules[0], p, sc);
  assert.match(t, /^Si Jugador choca con Moneda → /);
  assert.match(t, /puntos \+= 1/); assert.match(t, /sonar “moneda”/); assert.match(t, /Moneda al azar/);
  assert.match(describeRule({ when: { type: 'edge', obj: sc.objects[0].id, edge: 'left' }, then: [] }, p, sc), /borde izquierdo → nada/);
});

test('las reglas desactivadas no se ejecutan ni se generan', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject();
  p.scenes[1].rules[0].enabled = false;
  const g = new Game(p); g.enter(p.scenes[1].id);
  g.objs[0].x = g.objs[1].x; g.objs[0].y = g.objs[1].y;
  g.step({ down: new Set(), held: new Set() });
  assert.equal(g.vars.puntos, 0);
  assert.ok(!generateMainC(p).includes('random_pos(3, 0);'));
});
