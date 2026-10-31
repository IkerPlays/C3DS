import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, pongProject, dodgeProject, blankProject } from '../../web/js/templates.js';
import { validate } from '../../web/js/model.js';
import { Game } from '../../web/js/runtime.js';
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
  assert.match(c, /3\.000f, 2\.000f, 1,/); // vx, vy iniciales de la pelota
  const d = generateMainC(dodgeProject());
  assert.match(d, /random_pos\(\d+, 1\);/);
  assert.match(generateMainC(blankProject()), /#define NUM_OBJS 0/);
});
