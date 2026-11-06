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

test('docs/REFERENCIA.md está sincronizado con el código', async () => {
  const { render } = await import('../../scripts/gen-reference.mjs');
  const { readFileSync } = await import('node:fs');
  assert.equal(readFileSync(new URL('../../docs/REFERENCIA.md', import.meta.url), 'utf8'), render(), 'ejecuta: npm run gen:docs');
});

test('touchAny y setColor: simulador y C', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'touchAny' }, then: [{ type: 'setColor', obj: sc.objects[0].id, color: '#00ff00' }] });
  const g = new Game(p); g.enter(sc.id);
  g.step({ down: new Set(), held: new Set(), touch: { x: 1, y: 1 }, touchDown: false });
  assert.equal(g.objs[0].color, '#ff004d');
  g.step({ down: new Set(), held: new Set(), touch: { x: 1, y: 1 }, touchDown: true });
  assert.equal(g.objs[0].color, '#00ff00');
  const c = generateMainC(p);
  assert.match(c, /if \(touched\) \{/); assert.match(c, /objs\[2\]\.color = 0xFF00FF00;/);
  assert.match(describeRule(sc.rules[0], p, sc), /Al tocar la pantalla táctil → color de Jugador = #00ff00/);
  sc.rules[0].then[0].color = 'rojo';
  const { validate } = await import('../../web/js/model.js');
  assert.ok(validate(p).some((x) => /color inválido/.test(x.text)));
});

test('randVar: simulador y C', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'start' }, then: [{ type: 'randVar', var: 'puntos', min: 3, max: 7 }] });
  for (let i = 0; i < 30; i++) {
    const g = new Game(p); g.enter(sc.id);
    g.step({ down: new Set(), held: new Set(), touch: { x: 0, y: 0 }, touchDown: false });
    assert.ok(g.vars.puntos >= 3 && g.vars.puntos <= 7);
  }
  assert.match(generateMainC(p), /vars\[0\] = 3 \+ rand\(\) % 5;/);
  assert.match(describeRule(sc.rules[0], p, sc), /puntos = azar\(3…7\)/);
});

test('setAnim: cambia el grupo de animación (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const { spriteImage } = await import('../../web/js/runtime.js');
  const p = newProject();
  const sc = p.scenes[1];
  const coin = sc.objects.find((o) => o.animGroup === 'moneda');
  const first = p.assets.images.find((a) => a.group === 'moneda').id;
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'start' }, then: [{ type: 'setAnim', obj: coin.id, group: '' }] });
  const g = new Game(p); g.enter(sc.id);
  g.step({ down: new Set(), held: new Set(), touch: { x: 0, y: 0 }, touchDown: false });
  assert.equal(g.objs.find((o) => o.id === coin.id).animGroup, null);
  assert.match(generateMainC(p), /anim_n = 0;/);
  sc.rules[0].then[0].group = 'moneda';
  assert.match(generateMainC(p), /anim_off = 0; objs\[\d+\]\.anim_n = 4;/);
  assert.match(describeRule(sc.rules[0], p, sc), /animación de Moneda = moneda/);
  assert.ok(first);
});

test('keyUp: se suelta un botón (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'keyUp', key: 'A' }, then: [{ type: 'addVar', var: 'puntos', value: 1 }] });
  const g = new Game(p); g.enter(sc.id);
  const base = { down: new Set(), held: new Set(), touch: null, touchDown: false };
  g.step({ ...base, held: new Set(['A']), down: new Set(['A']) });
  assert.equal(g.vars.puntos, 0, 'pulsar no cuenta');
  g.step({ ...base, up: new Set(['A']) });
  assert.equal(g.vars.puntos, 1, 'soltar cuenta');
  assert.match(generateMainC(p), /if \(\(keys_up & KEY_A\)\) \{/);
  assert.match(generateMainC(p), /keys_up = hidKeysUp\(\);/);
  assert.match(describeRule(sc.rules[0], p, sc), /Al soltar A/);
});

test('setOpacity y alineación centrada: simulador y C', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const { makeObject } = await import('../../web/js/model.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.rules.length = 0;
  const t = makeObject(p, 'text', { name: 'Titulo', x: 200, y: 10, text: 'Hola', align: 'center' });
  sc.objects.push(t);
  sc.rules.push({ id: 1, when: { type: 'start' }, then: [{ type: 'setOpacity', obj: t.id, value: 0.25 }] });
  const g = new Game(p); g.enter(sc.id);
  g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.objs.find((o) => o.id === t.id).opacity, 0.25);
  const c = generateMainC(p);
  assert.match(c, /\.opacity = 0\.250f;/); assert.match(c, /C2D_AlignCenter/); assert.match(c, /, 1, 1, 0, 0 \}, \/\/ \d+/);
  assert.match(describeRule(sc.rules[0], p, sc), /opacidad de Titulo = 0\.25/);
});

test('textos de varias líneas: \\n en el simulador y en el C', async () => {
  const { generateMainC, textTemplate } = await import('../../web/js/codegen.js');
  const { makeObject } = await import('../../web/js/model.js');
  const p = newProject(); const sc = p.scenes[1];
  const t = makeObject(p, 'text', { name: 'Multi', text: 'Linea 1\\nPuntos: {puntos}' });
  sc.objects.push(t);
  const g = new Game(p); g.enter(sc.id);
  assert.equal(g.text(g.objs.find((o) => o.id === t.id)), 'Linea 1\nPuntos: 0');
  const { fmt } = textTemplate('A\\nB {puntos}', new Map([['puntos', 0]]));
  assert.equal(fmt, 'A\nB %d');
  assert.match(generateMainC(p), /Linea 1\\012Puntos: %d/);
});

test('setFlip: espejo horizontal de un sprite (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  const coin = sc.objects.find((o) => o.type === 'sprite');
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'start' }, then: [{ type: 'setFlip', obj: coin.id, flip: true }] });
  const g = new Game(p); g.enter(sc.id);
  assert.equal(g.objs.find((o) => o.id === coin.id).flipX, false);
  g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.objs.find((o) => o.id === coin.id).flipX, true);
  const c = generateMainC(p);
  assert.match(c, /\.flip = 1;/); assert.match(c, /o->flip \? -tw : tw/); assert.match(c, /int align, cols, rows, flip, fixed;/);
  assert.match(describeRule(sc.rules[0], p, sc), /voltear Moneda/);
});

test('anyKey, after (una vez) y toggle: simulador y C', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.rules.length = 0;
  const o = sc.objects[0];
  sc.rules.push(
    { id: 1, when: { type: 'anyKey' }, then: [{ type: 'toggle', obj: o.id }] },
    { id: 2, when: { type: 'after', seconds: 1 }, then: [{ type: 'addVar', var: 'puntos', value: 10 }] },
  );
  const g = new Game(p); g.enter(sc.id);
  const step = (down = []) => g.step({ down: new Set(down), held: new Set(), touch: null, touchDown: false });
  const obj = g.objs.find((x) => x.id === o.id);
  assert.equal(obj.visible, true);
  step(['B']); assert.equal(obj.visible, false, 'cualquier botón alterna');
  step(['A']); assert.equal(obj.visible, true);
  step(); assert.equal(obj.visible, true, 'sin botones no cambia');
  for (let i = 0; i < 200; i++) step();
  assert.equal(g.vars.puntos, 10, 'after solo salta una vez');
  const c = generateMainC(p);
  assert.match(c, /\(down & ~KEY_TOUCH\)/); assert.match(c, /scene_frames == 60/); assert.match(c, /\.visible = !objs\[\d+\]\.visible;/);
  assert.match(describeRule(sc.rules[1], p, sc), /[Aa] los 1 s de empezar/);
});
