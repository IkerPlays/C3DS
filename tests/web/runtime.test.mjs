import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, formatText, readGamepad, GAMEPAD_MAP } from '../../web/js/runtime.js';
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

test('mando: botones y stick se traducen a la 3DS', () => {
  const pad = (buttons = [], axes = [0, 0]) => ({ connected: true, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i) })), axes });
  assert.equal(readGamepad(() => []), null);
  assert.equal(readGamepad(() => [null, { connected: false }]), null);
  const r = readGamepad(() => [pad([1, 9, 14], [0.8, -0.05])]);
  assert.deepEqual([...r.held].sort(), ['A', 'LEFT', 'START']);
  assert.deepEqual(r.circle, { x: 0.8, y: 0 }, 'zona muerta en el stick');
  assert.equal(GAMEPAD_MAP[0], 'B');
});

test('objetos sólidos bloquean el paso y dejan apoyarse', async () => {
  const { newProject, makeObject } = await import('../../web/js/model.js');
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.objects.length = 0; sc.rules.length = 0;
  const wall = makeObject(p, 'rect', { name: 'Muro', x: 100, y: 100, w: 20, h: 100, solid: true });
  const floor = makeObject(p, 'rect', { name: 'Suelo', x: 0, y: 200, w: 400, h: 40, solid: true });
  const hero = makeObject(p, 'rect', { name: 'Heroe', x: 60, y: 150, w: 20, h: 20, vx: 3, gravity: 0.5 });
  sc.objects.push(wall, floor, hero);
  const g = new Game(p); g.enter(sc.id);
  const inp = { down: new Set(), held: new Set(), touch: null, touchDown: false };
  for (let i = 0; i < 100; i++) g.step(inp);
  const h = g.objs.find((o) => o.name === 'Heroe');
  assert.ok(h.x + h.w <= 100, 'el muro lo detiene: x=' + h.x);
  assert.equal(h.y + h.h, 200, 'se apoya exactamente en el suelo');
  const c = generateMainC(p);
  assert.match(c, /static int blocked\(int i\)/); assert.match(c, /int solid, follow;/);
  assert.match(c, /0xFF[0-9A-F]{6}, 1, -1, 1\.000f, 1\.000f, 0, 1, 1, 0, 0, 1\.000f \}, \/\/ \d+/);
});

test('seguir a otro objeto y opacidad (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const { validate } = await import('../../web/js/model.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.objects.length = 0; sc.rules.length = 0;
  const target = makeObject(p, 'rect', { name: 'Objetivo', x: 300, y: 100, w: 20, h: 20 });
  const chaser = makeObject(p, 'rect', { name: 'Perseguidor', x: 20, y: 100, w: 20, h: 20, follow: target.id, followSpeed: 2, opacity: 0.5 });
  sc.objects.push(target, chaser);
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p); g.enter(sc.id);
  const c = g.objs.find((o) => o.name === 'Perseguidor');
  for (let i = 0; i < 20; i++) g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.ok(Math.abs(c.x - 60) < 0.01, 'avanza 2 px por frame hacia el objetivo: x=' + c.x);
  for (let i = 0; i < 300; i++) g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.ok(Math.abs(c.x - 300) < 0.6 && Math.abs(c.y - 100) < 0.6, 'llega al objetivo');
  const code = generateMainC(p);
  assert.match(code, /static u32 with_alpha/); assert.match(code, /float fspeed, opacity;/); assert.match(code, /sqrtf\(fdx \* fdx/);
  assert.match(code, /0xFFFFFFFF, 0, 2, 2\.000f, 0\.500f, 0, 1, 1, 0, 0, 1\.000f \}/);
  chaser.follow = 9999;
  assert.ok(validate(p).some((x) => /sigue a un objeto/.test(x.text)));
  chaser.follow = target.id; chaser.opacity = 2;
  assert.ok(validate(p).some((x) => /opacidad/.test(x.text)));
});

test('transición de fundido entre escenas (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const { FADE_FRAMES, render } = await import('../../web/js/runtime.js');
  const p = newProject();
  let g = new Game(p); assert.equal(g.fade, 0, 'sin transición por defecto');
  assert.match(generateMainC(p), /#define FADE_ON 0/);
  p.transition = 'fade';
  g = new Game(p);
  assert.equal(g.fade, FADE_FRAMES);
  const inp = { down: new Set(), held: new Set(), touch: null, touchDown: false };
  for (let i = 0; i < FADE_FRAMES; i++) g.step(inp);
  assert.equal(g.fade, 0, 'el fundido termina');
  g.enter(p.scenes[1].id); assert.equal(g.fade, FADE_FRAMES, 'cada cambio de escena vuelve a fundir');
  const c = generateMainC(p);
  assert.match(c, /#define FADE_ON 1/); assert.match(c, /fade_frames = FADE_ON \? 18 : 0;/); assert.match(c, /fade_frames \/ 18\.0f/);
  // el simulador pinta negro con transparencia
  const calls = []; const ctx = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 8 }) : typeof k === 'string' && /^(fillRect|fillText|drawImage|save|restore|translate|scale)$/.test(k) ? (...a) => calls.push([k, a]) : undefined), set: (t, k, v) => { if (k === 'fillStyle') calls.push(['fillStyle', v]); return true; } });
  render(g, { top: ctx(), bottom: ctx() }, new Map());
  assert.ok(calls.some(([k, v]) => k === 'fillStyle' && /^rgba\(0,0,0,1\)$/.test(v)), 'overlay negro al empezar el fundido');
});

test('mundo ancho y cámara: el objeto se mueve por todo el mundo y la cámara lo sigue (simulador)', async () => {
  const { validate } = await import('../../web/js/model.js');
  const { render } = await import('../../web/js/runtime.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.objects.length = 0; sc.rules.length = 0;
  sc.worldW = 1000;
  const hero = makeObject(p, 'rect', { name: 'Heroe', x: 50, y: 100, w: 20, h: 20, vx: 5 });
  const hud = makeObject(p, 'text', { name: 'HUD', x: 10, y: 10, text: 'HUD', fixed: true });
  sc.objects.push(hero, hud); sc.camera = hero.id;
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p); g.enter(sc.id);
  const inp = { down: new Set(), held: new Set(), touch: null, touchDown: false };
  g.step(inp); assert.equal(g.camX, 0, 'al principio la cámara está a la izquierda');
  for (let i = 0; i < 120; i++) g.step(inp);
  const h = g.objs.find((o) => o.name === 'Heroe');
  assert.ok(h.x > 400, 'pasa de la pantalla (x=' + h.x + ')');
  assert.ok(g.camX > 0, 'la cámara avanza (camX=' + g.camX + ')');
  for (let i = 0; i < 300; i++) g.step(inp);
  assert.equal(h.x, 980, 'se detiene en el borde del mundo');
  assert.equal(g.camX, 600, 'la cámara no se sale del mundo (1000-400)');
  // dibujo: los objetos normales se desplazan con la cámara; los fijos no
  const log = []; const mk = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 8 }) : typeof k === 'string' && /^(fillRect|fillText|drawImage|save|restore|translate|scale)$/.test(k) ? (...a) => log.push([k, ...a]) : undefined), set: () => true });
  render(g, { top: mk(), bottom: mk() }, new Map());
  assert.ok(log.some(([k, x]) => k === 'translate' && x === -600), 'el héroe se dibuja desplazado -600');
  assert.equal(log.filter(([k]) => k === 'save').length, log.filter(([k]) => k === 'restore').length, 'save/restore equilibrados');
  sc.worldW = 5000; assert.ok(validate(p).some((x) => /ancho del mundo/.test(x.text)));
  sc.worldW = 1000; sc.camera = 99999; assert.ok(validate(p).some((x) => /cámara/.test(x.text)));
});

test('mundo ancho y cámara en el C generado', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const p = newProject(); const sc = p.scenes[1];
  sc.worldW = 800; sc.camera = sc.objects[0].id; sc.objects[2].fixed = true;
  const c = generateMainC(p);
  assert.match(c, /static const float scene_world\[NUM_SCENES\] = \{ 400\.0f, 800\.0f \};/);
  assert.match(c, /static const int scene_cam\[NUM_SCENES\] = \{ -1, 2 \};/);
  assert.match(c, /static float max_w\(const Obj\* o\)/); assert.match(c, /update_camera\(\);\n\tscene_frames\+\+;/);
  assert.match(c, /float ox = \(screen == 0\) \? o->x - cam_x \* cam_f\(o\) : o->x;/);
  assert.match(c, /int align, cols, rows, flip, fixed;\n\tfloat par;/);
  assert.match(c, /if \(nx > max_w\(o\) - o->w\) nx = max_w\(o\) - o->w;/);
  assert.match(c, /, 0, 1, 1, 0, 1, 1\.000f \}, \/\/ \d+/);
});

test('paralaje: los fondos se desplazan menos que la cámara (simulador y C)', async () => {
  const { generateMainC } = await import('../../web/js/codegen.js');
  const { render, camFactor } = await import('../../web/js/runtime.js');
  assert.equal(camFactor({ fixed: true }), 0); assert.equal(camFactor({}), 1); assert.equal(camFactor({ parallax: 0.5 }), 0.5); assert.equal(camFactor({ parallax: 7 }), 1);
  const p = newProject(); const sc = p.scenes[1];
  sc.objects.length = 0; sc.rules.length = 0; sc.worldW = 1000;
  const hero = makeObject(p, 'rect', { name: 'Heroe', x: 700, y: 100, w: 20, h: 20 });
  const bg = makeObject(p, 'rect', { name: 'Montes', x: 100, y: 150, w: 100, h: 50, parallax: 0.5 });
  sc.objects.push(hero, bg); sc.camera = hero.id;
  const g = new Game(p); g.enter(sc.id); g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.camX, 510);
  const log = []; const mk = () => new Proxy({}, { get: (t, k) => (typeof k === 'string' && /^(fillRect|save|restore|translate)$/.test(k) ? (...a) => log.push([k, ...a]) : undefined), set: () => true });
  render(g, { top: mk(), bottom: mk() }, new Map());
  const tr = log.filter(([k]) => k === 'translate').map(([, x]) => x);
  assert.deepEqual(tr, [-510, -255], 'héroe -510, montañas (paralaje 0.5) -255');
  const c = generateMainC(p);
  assert.match(c, /static float cam_f\(const Obj\* o\)/); assert.match(c, /o->x - cam_x \* cam_f\(o\)/); assert.match(c, /, 0\.500f \}, \/\/ \d+/);
});

test('aviso: mundo ancho sin cámara', async () => {
  const { validate } = await import('../../web/js/model.js');
  const p = newProject(); const sc = p.scenes[1];
  assert.ok(!validate(p).some((x) => /cámara no sigue/.test(x.text)));
  sc.worldW = 800;
  const w = validate(p).find((x) => /cámara no sigue/.test(x.text));
  assert.ok(w && w.level === 'warn');
  sc.camera = sc.objects[0].id;
  assert.ok(!validate(p).some((x) => /cámara no sigue/.test(x.text)));
});

test('aviso de “sale de la pantalla” usa el ancho del mundo', async () => {
  const { validate, makeObject } = await import('../../web/js/model.js');
  const p = newProject(); const sc = p.scenes[1];
  const far = makeObject(p, 'rect', { name: 'Lejos', x: 700, y: 50, w: 20, h: 20 });
  sc.objects.push(far);
  assert.ok(validate(p).some((x) => /Lejos/.test(x.text) && /sale de la pantalla/.test(x.text)), 'con mundo de 400 px sí avisa');
  sc.worldW = 800; sc.camera = sc.objects[0].id;
  assert.ok(!validate(p).some((x) => /Lejos/.test(x.text)), 'con mundo de 800 px ya no');
  far.fixed = true;
  assert.ok(validate(p).some((x) => /Lejos/.test(x.text)), 'un objeto fijo sí debe caber en la pantalla');
});
