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
