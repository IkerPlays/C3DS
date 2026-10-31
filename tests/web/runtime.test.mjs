import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, formatText } from '../../web/js/runtime.js';
import { newProject, makeObject, makeScene } from '../../web/js/model.js';

const input = (o = {}) => ({ down: new Set(o.down || []), held: new Set(o.held || []), touch: o.touch || null, touchDown: !!o.touchDown });

test('formatText', () => {
  assert.equal(formatText('P: {puntos} {nada}', { puntos: 3 }), 'P: 3 {nada}');
});

test('movimiento con el D-Pad y límites de pantalla', () => {
  const g = new Game(newProject());
  g.enter(g.p.scenes[1].id);
  const pl = g.objs[0];
  g.step(input({ held: ['RIGHT'] }));
  assert.equal(pl.x, 183);
  for (let i = 0; i < 300; i++) g.step(input({ held: ['LEFT', 'UP'] }));
  assert.equal(pl.x, 0); assert.equal(pl.y, 0);
  for (let i = 0; i < 300; i++) g.step(input({ held: ['RIGHT', 'DOWN'] }));
  assert.equal(pl.x, 400 - 40); assert.equal(pl.y, 240 - 40);
});

test('botón táctil cambia de escena y reinicia variables', () => {
  const sounds = [];
  const g = new Game(newProject(), { onSound: (id) => sounds.push(id), rng: () => 0.5 });
  assert.equal(g.scene.name, 'Menú');
  g.step(input({ touchDown: true, touch: { x: 5, y: 5 } }));
  assert.equal(g.scene.name, 'Menú', 'toque fuera del botón');
  g.step(input({ touchDown: true, touch: { x: 110, y: 110 } }));
  assert.equal(g.scene.name, 'Juego');
  assert.equal(g.frames, 0);
});

test('colisión suma puntos, suena y recoloca la moneda', () => {
  const sounds = [];
  const g = new Game(newProject(), { onSound: (id) => sounds.push(id), rng: () => 0.5 });
  g.enter(g.p.scenes[1].id);
  const [pl, coin] = g.objs;
  pl.x = coin.x; pl.y = coin.y;
  g.step(input());
  assert.equal(g.vars.puntos, 1);
  assert.equal(sounds.length, 1);
  assert.equal(coin.x, Math.floor(0.5 * (400 - 32)));
  assert.equal(g.text(g.objs[2]), 'Puntos: 1');
  g.step(input());
  assert.equal(g.vars.puntos, 1, 'ya no se solapan');
});

test('teclas, variables, temporizador, show/hide y quit', () => {
  const p = newProject();
  const sc = p.scenes[1];
  const t = makeObject(p, 'text', { text: 'a' });
  sc.objects.push(t);
  sc.rules.length = 0;
  sc.rules.push(
    { id: 1, when: { type: 'key', key: 'A' }, then: [{ type: 'addVar', var: 'puntos', value: 5 }, { type: 'hide', obj: t.id }] },
    { id: 2, when: { type: 'var', var: 'puntos', op: '>=', value: 5 }, then: [{ type: 'setText', obj: t.id, text: 'ganaste {puntos}' }, { type: 'show', obj: t.id }] },
    { id: 3, when: { type: 'timer', seconds: 1 }, then: [{ type: 'move', obj: t.id, dx: 2, dy: 3 }] },
    { id: 4, when: { type: 'keyHeld', key: 'START' }, then: [{ type: 'quit' }] },
  );
  const g = new Game(p);
  g.enter(sc.id);
  g.step(input({ down: ['A'] }));
  assert.equal(g.vars.puntos, 5);
  const o = g.obj(t.id);
  assert.equal(o.visible, true);
  assert.equal(g.text(o), 'ganaste 5');
  const x0 = o.x;
  for (let i = 0; i < 60; i++) g.step(input());
  assert.equal(o.x, x0 + 2);
  g.step(input({ held: ['START'] }));
  assert.equal(g.quit, true);
});

test('inicio de escena y objetos fuera de pantalla inferior no reciben toques', () => {
  const p = newProject();
  const s = makeScene(p, 'Extra');
  const b = makeObject(p, 'button', { screen: 'top', x: 0, y: 0, w: 50, h: 50 });
  s.objects.push(b);
  s.rules.push({ id: 7, when: { type: 'start' }, then: [{ type: 'setVar', var: 'puntos', value: 42 }] }, { id: 8, when: { type: 'touch', obj: b.id }, then: [{ type: 'quit' }] });
  p.scenes.push(s);
  const g = new Game(p);
  g.enter(s.id);
  g.step(input({ touchDown: true, touch: { x: 10, y: 10 } }));
  assert.equal(g.vars.puntos, 42);
  assert.equal(g.quit, false);
});
