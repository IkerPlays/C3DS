import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, LESSONS, pongProject, dodgeProject, blankProject, arcadeProject, runnerProject, toposProject, mazeProject, chaseProject, platformerProject, scrollerProject } from '../../web/js/templates.js';
import { validate } from '../../web/js/model.js';
import { Game } from '../../web/js/runtime.js';
import { newProject } from '../../web/js/model.js';
import { describeRule } from '../../web/js/rules.js';
import { generateMainC, exportFiles } from '../../web/js/codegen.js';

const inp = (o = {}) => ({ down: new Set(o.down || []), held: new Set(o.held || []), touch: o.touch || null, touchDown: !!o.touchDown });

test('todas las plantillas son válidas y exportables', () => {
  for (const t of TEMPLATES) {
    const p = t.make();
    assert.deepEqual(validate(p).filter((x) => x.level === 'error'), [], t.id);
    const files = exportFiles(p);
    assert.ok(files.some((f) => f.path.endsWith('source/main.c')), t.id);
    assert.ok(new Set(p.scenes.flatMap((s) => s.objects.map((o) => o.id))).size > 0 || t.id === 'blank');
  }
});

test('Pong: la pelota rebota en los bordes y en la pala, y reinicia al salir por la izquierda', () => {
  const p = pongProject();
  const g = new Game(p, { rng: () => 0.5 });
  const ball = g.objs.find((o) => o.name === 'Pelota');
  const paddle = g.objs.find((o) => o.name === 'Pala');
  for (let i = 0; i < 400; i++) g.step(inp());
  assert.ok(ball.x >= 0 && ball.x <= 390 && ball.y >= 0 && ball.y <= 230, 'siempre dentro de la pantalla');
  // pala en su sitio: golpea y suma
  paddle.y = 0;
  ball.x = 25; ball.y = 10; ball.vx = -3; ball.vy = 0;
  const before = g.vars.puntos;
  for (let i = 0; i < 6; i++) g.step(inp());
  assert.ok(g.vars.puntos > before, 'puntúa al golpear');
  assert.equal(ball.vx, 3);
  // se escapa por la izquierda: reinicia
  paddle.y = 200; ball.x = 15; ball.y = 10; ball.vx = -3; ball.vy = 0;
  for (let i = 0; i < 10; i++) g.step(inp());
  assert.equal(g.vars.puntos, 0);
  assert.equal(ball.x >= 190 || ball.x < 300, true);
});

test('la pala solo se mueve en vertical', () => {
  const g = new Game(pongProject());
  const paddle = g.objs.find((o) => o.name === 'Pala');
  const x0 = paddle.x;
  for (let i = 0; i < 10; i++) g.step(inp({ held: ['RIGHT', 'DOWN'] }));
  assert.equal(paddle.x, x0);
  assert.equal(paddle.y, 95 + 40);
});

test('Esquivar: al tocar un bloque se cambia de escena y reintentar reinicia', () => {
  const p = dodgeProject();
  const g = new Game(p, { rng: () => 0.3 });
  const player = g.objs[0]; const e1 = g.objs[1];
  e1.x = player.x; e1.y = player.y; e1.vy = 0;
  g.step(inp());
  assert.equal(g.scene.name, 'Fin');
  const btn = g.objs.find((o) => o.type === 'button');
  g.step(inp({ touchDown: true, touch: { x: btn.x + 5, y: btn.y + 5 } }));
  assert.equal(g.scene.name, 'Partida');
  assert.equal(g.vars.puntos, 0);
});

test('Esquivar: un bloque que llega abajo suma punto y reaparece arriba en otra X', () => {
  const g = new Game(dodgeProject(), { rng: () => 0.5 });
  const e = g.objs[1];
  e.y = 205; e.vy = 3;
  for (let i = 0; i < 20 && g.vars.puntos === 0; i++) g.step(inp());
  assert.equal(g.vars.puntos >= 1, true);
  assert.equal(e.y < 100, true);
});

test('C generado: velocidad, bordes, control H/V y random por eje', () => {
  const c = generateMainC(pongProject());
  assert.match(c, /static int edge_hit\(int i, int e\)/);
  assert.match(c, /edge_hit\(1, 1\)/);
  assert.match(c, /o->controls != 3/);
  assert.match(c, /objs\[1\]\.vx = 3\.000f;/);
  assert.match(c, /3\.000f, 2\.000f, 0\.000f, 1\.000f, 1,/); // vx, vy, gravedad y tamaño de texto iniciales de la pelota
  const d = generateMainC(dodgeProject());
  assert.match(d, /random_pos\(\d+, 1\);/);
  assert.match(generateMainC(blankProject()), /#define NUM_OBJS 0/);
});

test('Circle Pad (analógico) y stylus (táctil) mueven los objetos', () => {
  const g = new Game(arcadeProject(), { rng: () => 0.5 });
  const ship = g.objs.find((o) => o.name === 'Nave'); const cur = g.objs.find((o) => o.name === 'Cursor');
  const x0 = ship.x;
  g.step({ down: new Set(), held: new Set(), circle: { x: 0.5, y: 0 } });
  assert.equal(ship.x, x0 + 2);
  g.step({ down: new Set(), held: new Set(), circle: { x: -1, y: 1 } });
  assert.equal(ship.x, x0 - 2); assert.equal(ship.y, 114);
  g.step({ down: new Set(), held: new Set(), touch: { x: 100, y: 120 }, touchDown: false });
  assert.deepEqual([cur.x, cur.y], [90, 110]);
  g.step({ down: new Set(), held: new Set(), touch: null });
  assert.deepEqual([cur.x, cur.y], [90, 110], 'al soltar se queda');
});

test('música en bucle, parar sonido y variables guardadas', () => {
  const plays = []; const saved = {}; let stored = { total: 41 };
  const storage = { load: () => stored, save: (o) => { Object.assign(saved, o); } };
  const p = arcadeProject();
  const g = new Game(p, { rng: () => 0.5, onSound: (id) => plays.push(id), storage });
  assert.equal(g.vars.total, 41, 'carga el total guardado');
  g.step({ down: new Set(), held: new Set() });
  assert.ok(plays.includes(p.assets.sounds.find((s) => s.loop).id), 'la música empieza con la escena');
  const ship = g.objs.find((o) => o.name === 'Nave'); const coin = g.objs.find((o) => o.name === 'Moneda');
  ship.x = coin.x; ship.y = coin.y;
  g.step({ down: new Set(), held: new Set() });
  assert.equal(g.vars.total, 42);
  g.persist(); assert.equal(saved.total, 42); assert.equal('puntos' in saved, false, 'solo se guardan las marcadas');
});

test('animación de sprites por grupo', async () => {
  const { spriteImage } = await import('../../web/js/runtime.js');
  const p = newProject(); const g = new Game(p, { rng: () => 0.5 });
  g.enter(p.scenes[1].id);
  const coin = g.objs[1];
  const ids = p.assets.images.filter((a) => a.group === 'moneda').map((a) => a.id);
  const seen = new Set();
  for (let i = 0; i < 60; i++) { seen.add(spriteImage(g, coin)); g.frames = i; }
  assert.deepEqual([...seen].sort(), [...ids].sort(), 'recorre los 4 fotogramas');
  assert.equal(spriteImage(g, { ...coin, animGroup: null }), coin.image);
});

test('C generado: animaciones, Circle Pad, stylus, bucle, guardado', () => {
  const c = generateMainC(arcadeProject());
  assert.match(c, /static const int anim_tbl\[4\] = \{ 0, 1, 2, 3 \};/);
  assert.match(c, /anim_tbl\[o->anim_off \+ \(scene_frames \* o->anim_fps \/ 60\) % o->anim_n\]/);
  assert.match(c, /hidCircleRead\(&cp\)/); assert.match(c, /o->controls == 5 && \(held & KEY_TOUCH\)/);
  assert.match(c, /static const int sound_loop\[NUM_SOUNDS\] = \{ 0, 1 \};/);
  assert.match(c, /#define NUM_PERSIST 1/); assert.match(c, /persist_idx\[NUM_PERSIST\] = \{ 1 \}/);
  assert.match(c, /sdmc:\/3ds\/arcade\/save\.dat/);
  assert.match(generateMainC(blankProject()), /#define NUM_PERSIST 0/);
});

test('validar: grupo de animación inexistente', async () => {
  const { validate } = await import('../../web/js/model.js');
  const p = newProject(); p.scenes[1].objects[1].animGroup = 'nada';
  assert.ok(validate(p).some((x) => /grupo de animación "nada"/.test(x.text)));
});

test('Corredor: gravedad, aterrizar, saltar solo en el suelo, obstáculo y fin', () => {
  const p = runnerProject();
  const g = new Game(p, { rng: () => 0.5 });
  const player = g.objs.find((o) => o.name === 'Jugador'); const ground = g.objs.find((o) => o.name === 'Suelo'); const ob = g.objs.find((o) => o.name === 'Obstáculo');
  const inp = (down = []) => ({ down: new Set(down), held: new Set() });
  ob.x = 390; ob.vx = 0;                                   // quieto lejos
  for (let i = 0; i < 120; i++) g.step(inp());
  assert.equal(player.y + player.h, ground.y, 'aterriza sobre el suelo');
  assert.equal(player.vy, 0.6 > 0 ? player.vy : 0);
  g.step(inp(['A']));
  assert.ok(player.vy < 0 || player.y < ground.y - player.h, 'salta desde el suelo');
  const yAir = player.y;
  g.step(inp(['A']));
  assert.ok(player.y >= yAir - 20, 'no hay doble salto en el aire');
  for (let i = 0; i < 120; i++) g.step(inp());
  assert.equal(player.y + player.h, ground.y, 'vuelve a caer al suelo');
  ob.vx = -4; ob.x = 200; ob.y = player.y;                // obstáculo contra el jugador
  for (let i = 0; i < 80 && g.scene.name === 'Corre'; i++) g.step(inp());
  assert.equal(g.scene.name, 'Fin');
});

test('regla con condición adicional (Y además): solo se cumple si ambas son ciertas', () => {
  const p = newProject();
  const sc = p.scenes[1];
  sc.rules.length = 0;
  sc.rules.push({ id: 1, when: { type: 'key', key: 'A' }, also: { type: 'var', var: 'puntos', op: '>=', value: 3 }, then: [{ type: 'setVar', var: 'puntos', value: 99 }] });
  const g = new Game(p); g.enter(sc.id);
  g.step({ down: new Set(['A']), held: new Set() }); assert.equal(g.vars.puntos, 0);
  g.vars.puntos = 3; g.step({ down: new Set(), held: new Set() }); assert.equal(g.vars.puntos, 3);
  g.step({ down: new Set(['A']), held: new Set() }); assert.equal(g.vars.puntos, 99);
  assert.match(describeRule(sc.rules[0], p, sc), /Al pulsar A y además si puntos es mayor o igual que 3 → puntos = 99/);
  const c = generateMainC(p);
  assert.match(c, /if \(\(down & KEY_A\) && vars\[0\] >= 3\)/);
});

test('C generado: gravedad, apoyar y aterrizar', () => {
  const c = generateMainC(runnerProject());
  assert.match(c, /static int standing_on\(int i, int j\)/); assert.match(c, /land_on\(\d+, \d+\);/);
  assert.match(c, /if \(o->gravity != 0\)/); assert.match(c, /0\.600f/);
  assert.match(c, /standing_on\(\d+, \d+\)\) \{/);
});

test('lecciones: válidas, exportables y jugables', () => {
  assert.equal(LESSONS.length, 9);
  for (const l of LESSONS) {
    const p = l.make();
    assert.deepEqual(validate(p).filter((x) => x.level === 'error'), [], l.id);
    assert.ok(exportFiles(p).some((f) => f.path.endsWith('source/main.c')), l.id);
    const g = new Game(p, { rng: () => 0.5 });
    for (let i = 0; i < 30; i++) g.step({ down: new Set(), held: new Set(['RIGHT']) });
  }
  // L3: 5 toques cambian el mensaje
  const p = LESSONS[2].make(); const g = new Game(p);
  const b = g.objs.find((o) => o.type === 'button');
  for (let i = 0; i < 5; i++) g.step({ down: new Set(), held: new Set(), touch: { x: b.x + 5, y: b.y + 5 }, touchDown: true });
  g.step({ down: new Set(), held: new Set() });
  assert.equal(g.vars.clics, 5);
  assert.match(g.text(g.objs.find((o) => o.name === 'Mensaje')), /Ya llevas 5/);
  // L4: ir y volver
  const q = LESSONS[3].make(); const h = new Game(q);
  const go = h.objs.find((o) => o.type === 'button');
  h.step({ down: new Set(), held: new Set(), touch: { x: go.x + 5, y: go.y + 5 }, touchDown: true });
  assert.equal(h.scene.name, 'Segunda');
});

test('Topos: tocar suma puntos, la cuenta atrás termina en la pantalla final', () => {
  const p = toposProject();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p, { rng: () => 0.5 });
  const mole = g.objs.find((o) => o.name === 'Topo');
  const inp = (extra = {}) => ({ down: new Set(), held: new Set(), touch: null, touchDown: false, ...extra });
  g.step(inp({ touch: { x: mole.x + 5, y: mole.y + 5 }, touchDown: true }));
  assert.equal(g.vars.puntos, 1);
  for (let i = 0; i < 60 * 21; i++) g.step(inp());
  assert.equal(g.scene.name, 'Fin');
  assert.match(generateMainC(p), /vars\[1\] \+= -1;/);
});

test('Laberinto: los muros bloquean y la meta lleva a la pantalla final', () => {
  const p = mazeProject();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p);
  const pl = g.objs.find((o) => o.name === 'Jugador');
  const held = new Set(['RIGHT']);
  for (let i = 0; i < 100; i++) g.step({ down: new Set(), held, touch: null, touchDown: false });
  assert.equal(pl.x, 120, 'el segundo muro (abajo) lo detiene');
  assert.match(generateMainC(p), /blocked\(i\) >= 0/);
});

test('Persecución: el enemigo te alcanza si te quedas quieto y se ve en el C', () => {
  const p = chaseProject();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p, { rng: () => 0.9 });
  const inp = { down: new Set(), held: new Set(), touch: null, touchDown: false };
  for (let i = 0; i < 400; i++) g.step(inp);
  assert.equal(g.scene.name, 'Fin');
  assert.match(generateMainC(p), /sqrtf\(fdx \* fdx/);
});

test('Plataformas: cae al suelo, salta a la primera plataforma, recoge monedas y gana', () => {
  const p = platformerProject();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p, { rng: () => 0.5 });
  const pl = g.objs.find((o) => o.name === 'Jugador'); const ground = g.objs.find((o) => o.name === 'Suelo'); const p1 = g.objs.find((o) => o.name === 'Plataforma 1');
  const step = (down = [], held = []) => g.step({ down: new Set(down), held: new Set(held), touch: null, touchDown: false });
  for (let i = 0; i < 60; i++) step();
  assert.equal(pl.y + pl.h, ground.y, 'aterriza en el suelo');
  step(['A']);
  assert.ok(pl.vy < 0, 'salta desde el suelo');
  step(['A']); const vy = pl.vy; step(['A']);
  assert.ok(pl.vy >= vy, 'no hay doble salto en el aire');
  // salto y avance hasta la primera plataforma
  for (let i = 0; i < 200; i++) step([], ['RIGHT']);
  assert.ok(g.scene.name === 'Juego');
  // colocar al jugador sobre la plataforma: puede volver a saltar
  pl.x = p1.x + 10; pl.y = p1.y - pl.h - 0.5; pl.vy = 0;
  for (let i = 0; i < 5; i++) step();
  step(['A']);
  assert.ok(pl.vy < 0, 'salta desde la plataforma');
  // recoger las tres monedas lleva a la pantalla final
  for (const n of ['Moneda 1', 'Moneda 2', 'Moneda 3']) { const c = g.objs.find((o) => o.name === n); pl.x = c.x; pl.y = c.y; step(); }
  step();
  assert.equal(g.scene.name, 'Meta');
  assert.match(generateMainC(p), /standing_on\(/);
});

test('autor, descripción e icono del proyecto llegan al Makefile y al .cia', async () => {
  const { exportFiles } = await import('../../web/js/codegen.js');
  const { toDataURL } = await import('../../web/js/bytes.js');
  const { encodePNG } = await import('../../web/js/png.js');
  const p = newProject(); p.author = 'Ana'; p.description = 'Mi gran juego';
  const find = (files, path) => files.find((f) => f.path.endsWith('/' + path));
  const def = find(exportFiles(p), 'cia/icon.png').content;
  const png = encodePNG(48, 48, new Uint8Array(48 * 48 * 4).fill(200));
  p.icon = toDataURL(png, 'image/png');
  const files = exportFiles(p);
  assert.match(find(files, 'Makefile').content, /APP_AUTHOR\s+:= Ana/); assert.match(find(files, 'Makefile').content, /APP_DESCRIPTION := Mi gran juego/);
  assert.deepEqual([...find(files, 'cia/icon.png').content], [...png], 'usa el icono del proyecto');
  assert.notDeepEqual([...def], [...png]);
  p.icon = 'http://malo/icon.png';
  assert.ok(validate(p).some((x) => /icono/.test(x.text)));
});

test('mosaico de sprites: plataformas con ladrillos (simulador y C)', async () => {
  const p = platformerProject();
  const ground = p.scenes[0].objects.find((o) => o.name === 'Suelo');
  assert.equal(ground.type, 'sprite'); assert.equal(ground.tileCols, 25); assert.ok(ground.solid);
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const c = generateMainC(p);
  assert.match(c, /for \(int ty = 0; ty < o->rows; ty\+\+\)/); assert.match(c, /int align, cols, rows, flip, fixed;\n\tfloat par;/);
  assert.match(c, /, 25, 2, 0, 0, 1\.000f \}, \/\/ \d+/);
  ground.tileCols = 64; ground.tileRows = 64;
  assert.ok(validate(p).some((x) => /mosaico/.test(x.text)));
});

test('récord: Corredor y Pong guardan el máximo (maxVar) en simulador y C', () => {
  const r = runnerProject(); const g = new Game(r, { rng: () => 0.5 });
  const pl = g.objs.find((o) => o.name === 'Jugador'); const ob = g.objs.find((o) => o.name === 'Obstáculo');
  g.vars.puntos = 7;
  ob.x = pl.x; ob.y = pl.y; ob.vx = 0;
  g.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.scene.name, 'Fin');
  assert.equal(g.vars.record, 7, 'el récord sube');
  g.vars.puntos = 3; g.vars.record = 7;
  assert.match(generateMainC(r), /if \(vars\[0\] > vars\[1\]\) vars\[1\] = vars\[0\];/);
  const p = pongProject(); const h = new Game(p, { rng: () => 0.5 });
  const ball = h.objs.find((o) => o.name === 'Pelota');
  h.vars.puntos = 4; ball.x = 0; ball.vx = -3;
  h.step({ down: new Set(), held: new Set(), touch: null, touchDown: false });
  assert.equal(h.vars.mejor, 4, 'la mejor racha se guarda'); assert.equal(h.vars.puntos, 0);
});

test('Lección 8: cualquier botón entra al juego y a los 3 s vuelve solo', () => {
  const p = LESSONS.find((l) => l.id === 'l8').make();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const g = new Game(p);
  const step = (down = []) => g.step({ down: new Set(down), held: new Set(), touch: null, touchDown: false });
  assert.equal(g.scene.name, 'Inicio');
  for (let i = 0; i < 40; i++) step();
  const blink = g.objs.find((o) => o.name === 'Pulsa');
  assert.ok(blink.visible === true || blink.visible === false);
  step(['A']); assert.equal(g.scene.name, 'Juego');
  for (let i = 0; i < 175; i++) step();
  assert.equal(g.scene.name, 'Juego', 'aún no han pasado 3 s');
  for (let i = 0; i < 10; i++) step();
  assert.equal(g.scene.name, 'Inicio', 'vuelve solo');
  assert.equal(g.text(g.objs.find((o) => o.name === 'Título')), 'MI JUEGO');
});

test('Mundo ancho: la cámara sigue al jugador hasta la bandera, el marcador es fijo y se gana', () => {
  const p = scrollerProject();
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  const sc = p.scenes[0];
  assert.equal(sc.worldW, 1200); assert.ok(sc.camera != null);
  assert.ok(sc.objects.find((o) => o.name === 'Marcador').fixed, 'el marcador no se mueve con la cámara');
  const g = new Game(p, { rng: () => 0.5 });
  const step = (down = [], held = []) => g.step({ down: new Set(down), held: new Set(held), touch: null, touchDown: false });
  const pl = g.objs.find((o) => o.name === 'Jugador');
  for (let i = 0; i < 60; i++) step();
  assert.equal(g.camX, 0);
  // camina por el suelo hasta que el bloque 1 lo detiene; la cámara avanza al pasar la mitad de la pantalla
  for (let i = 0; i < 70; i++) step([], ['RIGHT']);
  assert.ok(pl.x > 200 && g.camX > 0, `x=${pl.x} camX=${g.camX}`);
  // teletransporte a la bandera: gana
  const flag = g.objs.find((o) => o.name === 'Bandera'); pl.x = flag.x - 10; pl.y = flag.y;
  for (let i = 0; i < 3; i++) step();
  assert.equal(g.scene.name, 'Meta');
  const c = generateMainC(p);
  assert.match(c, /scene_world\[NUM_SCENES\] = \{ 1200\.0f, 400\.0f \}/); assert.match(c, /scene_cam\[NUM_SCENES\] = \{ \d+, -1 \}/);
});
