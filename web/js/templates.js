// Plantillas de proyecto para empezar rápido.
import { newProject, makeScene, makeObject, nextId } from './model.js';
import { toDataURL } from './bytes.js';
import { toneWav, melodyWav } from './wav.js';
import { encodePNG } from './png.js';

function empty(name) {
  const p = newProject();
  p.name = name; p.scenes = []; p.assets = { images: [], sounds: [] }; p.blobs = {}; p.variables = [];
  return p;
}

function addBeep(p, name, freq) {
  const id = nextId(p);
  p.assets.sounds.push({ id, name, seconds: 0.12 });
  p.blobs[id] = toDataURL(toneWav(freq, 0.12), 'audio/wav');
  return id;
}

export function blankProject() {
  const p = empty('Proyecto nuevo');
  const s = makeScene(p, 'Escena 1');
  p.scenes.push(s); p.startScene = s.id;
  return p;
}

/** Squash/Pong de un jugador: la pelota rebota en los bordes y en la pala; si cruza el borde izquierdo, reinicia. */
export function pongProject() {
  const p = empty('Pong');
  p.variables = [{ name: 'puntos', value: 0 }, { name: 'mejor', value: 0 }];
  const beep = addBeep(p, 'rebote', 660);
  const s = makeScene(p, 'Partida');
  s.bg.top = '#000000'; s.bg.bottom = '#1d2b53';
  const paddle = makeObject(p, 'rect', { name: 'Pala', x: 12, y: 95, w: 8, h: 50, color: '#ffffff', controls: 'v', speed: 4 });
  const ball = makeObject(p, 'rect', { name: 'Pelota', x: 200, y: 110, w: 10, h: 10, color: '#ffec27', vx: 3, vy: 2 });
  const score = makeObject(p, 'text', { name: 'Marcador', x: 170, y: 8, text: '{puntos}', color: '#ffffff' });
  const best = makeObject(p, 'text', { name: 'Mejor', screen: 'bottom', x: 20, y: 20, text: 'Mejor racha: {mejor}', color: '#00e436' });
  const help = makeObject(p, 'text', { name: 'Ayuda', screen: 'bottom', x: 20, y: 200, text: 'Arriba/Abajo mueven la pala', color: '#c2c3c7' });
  s.objects.push(paddle, ball, score, best, help);
  s.rules.push(
    { id: nextId(p), when: { type: 'collide', a: ball.id, b: paddle.id }, then: [{ type: 'setVel', obj: ball.id, axis: 'x', value: 3 }, { type: 'addVar', var: 'puntos', value: 1 }, { type: 'sound', sound: beep }] },
    { id: nextId(p), when: { type: 'edge', obj: ball.id, edge: 'right' }, then: [{ type: 'setVel', obj: ball.id, axis: 'x', value: -3 }] },
    { id: nextId(p), when: { type: 'edge', obj: ball.id, edge: 'top' }, then: [{ type: 'setVel', obj: ball.id, axis: 'y', value: 2 }] },
    { id: nextId(p), when: { type: 'edge', obj: ball.id, edge: 'bottom' }, then: [{ type: 'setVel', obj: ball.id, axis: 'y', value: -2 }] },
    { id: nextId(p), when: { type: 'var', var: 'puntos', op: '>', value: 0 }, then: [] },
    { id: nextId(p), when: { type: 'edge', obj: ball.id, edge: 'left' }, then: [
      { type: 'setPos', obj: ball.id, x: 200, y: 110 }, { type: 'setVel', obj: ball.id, axis: 'x', value: 3 }, { type: 'setVel', obj: ball.id, axis: 'y', value: 2 }, { type: 'setVar', var: 'puntos', value: 0 },
    ] },
  );
  s.rules = s.rules.filter((r) => r.then.length);
  p.scenes.push(s); p.startScene = s.id;
  return p;
}

/** Esquivar: caen bloques; mueve al jugador con izquierda/derecha. Si te tocan, fin de partida. */
export function dodgeProject() {
  const p = empty('Esquivar');
  p.variables = [{ name: 'puntos', value: 0 }];
  const beep = addBeep(p, 'punto', 880);
  const game = makeScene(p, 'Partida');
  const over = makeScene(p, 'Fin');
  game.bg.top = '#1d2b53'; over.bg.top = '#7e2553'; over.bg.bottom = '#1d2b53';
  const player = makeObject(p, 'rect', { name: 'Jugador', x: 180, y: 210, w: 40, h: 20, color: '#00e436', controls: 'h', speed: 4 });
  const e1 = makeObject(p, 'rect', { name: 'Bloque 1', x: 80, y: 0, w: 30, h: 30, color: '#ff004d', vy: 3 });
  const e2 = makeObject(p, 'rect', { name: 'Bloque 2', x: 280, y: -0, w: 30, h: 30, color: '#ffa300', vy: 4 });
  const score = makeObject(p, 'text', { name: 'Marcador', x: 10, y: 8, text: 'Puntos: {puntos}', color: '#ffffff' });
  game.objects.push(player, e1, e2, score);
  for (const e of [e1, e2]) {
    // La colisión va primero: tocar al jugador tiene prioridad sobre llegar al suelo.
    game.rules.push({ id: nextId(p), when: { type: 'collide', a: player.id, b: e.id }, then: [{ type: 'goto', scene: over.id }] });
    game.rules.push({ id: nextId(p), when: { type: 'edge', obj: e.id, edge: 'bottom' }, then: [{ type: 'addVar', var: 'puntos', value: 1 }, { type: 'sound', sound: beep }, { type: 'setPos', obj: e.id, x: 0, y: 0 }, { type: 'randomPos', obj: e.id, axis: 'x' }] });
  }
  const title = makeObject(p, 'text', { name: 'Fin', x: 150, y: 90, text: 'FIN  -  {puntos} puntos', color: '#ffffff' });
  const again = makeObject(p, 'button', { name: 'Reintentar', x: 100, y: 100, text: 'Reintentar' });
  over.objects.push(title, again);
  over.rules.push({ id: nextId(p), when: { type: 'touch', obj: again.id }, then: [{ type: 'setVar', var: 'puntos', value: 0 }, { type: 'goto', scene: game.id }] });
  p.scenes.push(game, over); p.startScene = game.id;
  return p;
}

/** Arcade: Circle Pad + stylus + música en bucle + récord guardado en la SD + moneda animada. */
export function arcadeProject() {
  const p = newProject();
  const base = newProject();
  p.name = 'Arcade'; p.scenes = []; p.variables = [{ name: 'puntos', value: 0 }, { name: 'total', value: 0, persist: true }];
  p.assets = base.assets; p.blobs = base.blobs; p.seq = base.seq;
  const coinSound = p.assets.sounds[0].id;
  const musId = nextId(p);
  p.assets.sounds.push({ id: musId, name: 'musica', seconds: 2, loop: true });
  p.blobs[musId] = toDataURL(melodyWav([523, 659, 784, 659, 523, 392, 523, 0]), 'audio/wav');
  const s = makeScene(p, 'Arcade');
  s.bg.top = '#1d2b53'; s.bg.bottom = '#000000';
  const player = makeObject(p, 'rect', { name: 'Nave', x: 180, y: 110, w: 28, h: 28, color: '#29adff', controls: 'circle', speed: 4 });
  const coin = makeObject(p, 'sprite', { name: 'Moneda', x: 300, y: 60, w: 32, h: 32, image: p.assets.images[0].id, animGroup: 'moneda', animFps: 10 });
  const cursor = makeObject(p, 'rect', { name: 'Cursor', screen: 'bottom', x: 150, y: 100, w: 20, h: 20, color: '#ff004d', controls: 'touch' });
  const t1 = makeObject(p, 'text', { name: 'Puntos', x: 10, y: 8, text: 'Puntos: {puntos}   Total guardado: {total}', color: '#ffffff' });
  const t2 = makeObject(p, 'text', { name: 'Ayuda', screen: 'bottom', x: 20, y: 200, text: 'Circle Pad: nave · Stylus: cursor', color: '#c2c3c7' });
  s.objects.push(player, coin, cursor, t1, t2);
  s.rules.push(
    { id: nextId(p), when: { type: 'start' }, then: [{ type: 'sound', sound: musId }] },
    { id: nextId(p), when: { type: 'collide', a: player.id, b: coin.id }, then: [{ type: 'addVar', var: 'puntos', value: 1 }, { type: 'addVar', var: 'total', value: 1 }, { type: 'sound', sound: coinSound }, { type: 'randomPos', obj: coin.id, axis: 'xy' }] },
  );
  p.scenes.push(s); p.startScene = s.id;
  return p;
}

/** Corredor: salta (A) los obstáculos que se acercan; gravedad, aterrizaje y condición “y además”. */
export function runnerProject() {
  const p = empty('Corredor');
  p.variables = [{ name: 'puntos', value: 0 }, { name: 'record', value: 0, persist: true }];
  const beep = addBeep(p, 'salto', 520);
  const game = makeScene(p, 'Corre'); const over = makeScene(p, 'Fin');
  game.bg.top = '#29adff'; game.bg.bottom = '#1d2b53'; over.bg.top = '#7e2553'; over.bg.bottom = '#1d2b53';
  const ground = makeObject(p, 'rect', { name: 'Suelo', x: 0, y: 216, w: 400, h: 24, color: '#00e436' });
  const player = makeObject(p, 'rect', { name: 'Jugador', x: 50, y: 150, w: 24, h: 32, color: '#ff004d', gravity: 0.6 });
  const ob = makeObject(p, 'rect', { name: 'Obstáculo', x: 380, y: 184, w: 20, h: 32, color: '#5f574f', vx: -4 });
  const score = makeObject(p, 'text', { name: 'Puntos', x: 10, y: 8, text: 'Puntos: {puntos}   Récord: {record}', color: '#ffffff' });
  const help = makeObject(p, 'text', { name: 'Ayuda', screen: 'bottom', x: 20, y: 110, text: 'Pulsa A para saltar', color: '#c2c3c7' });
  game.objects.push(ground, player, ob, score, help);
  game.rules.push(
    { id: nextId(p), when: { type: 'collide', a: player.id, b: ground.id }, then: [{ type: 'landOn', obj: player.id, on: ground.id }] },
    { id: nextId(p), when: { type: 'key', key: 'A' }, also: { type: 'standing', obj: player.id, on: ground.id }, then: [{ type: 'setVel', obj: player.id, axis: 'y', value: -9 }, { type: 'sound', sound: beep }] },
    { id: nextId(p), when: { type: 'edge', obj: ob.id, edge: 'left' }, then: [{ type: 'setPos', obj: ob.id, x: 380, y: 184 }, { type: 'addVar', var: 'puntos', value: 1 }] },
    { id: nextId(p), when: { type: 'collide', a: player.id, b: ob.id }, then: [{ type: 'goto', scene: over.id }] },
  );
  const fin = makeObject(p, 'text', { name: 'Fin', x: 130, y: 90, text: '¡Tropezaste!  {puntos} puntos', color: '#ffffff' });
  const again = makeObject(p, 'button', { name: 'Reintentar', x: 100, y: 100, text: 'Reintentar' });
  over.objects.push(fin, again);
  over.rules.push({ id: nextId(p), when: { type: 'touch', obj: again.id }, then: [{ type: 'setVar', var: 'puntos', value: 0 }, { type: 'goto', scene: game.id }] });
  p.scenes.push(game, over); p.startScene = game.id;
  return p;
}

/* ===================== Lecciones (proyectos mínimos para aprender un concepto) ===================== */
function lesson(name, build) {
  const p = empty(name);
  const sc = makeScene(p, 'Lección');
  sc.bg.top = '#1d2b53'; sc.bg.bottom = '#0e1020';
  p.scenes.push(sc); p.startScene = sc.id;
  build(p, sc);
  return p;
}
const note = (p, sc, text, y = 200) => sc.objects.push(makeObject(p, 'text', { name: 'Instrucciones', screen: 'bottom', x: 12, y, text, color: '#c2c3c7' }));

export const lessonMove = () => lesson('Lección 1 - Mover', (p, sc) => {
  sc.objects.push(makeObject(p, 'rect', { name: 'Jugador', x: 180, y: 100, w: 40, h: 40, color: '#ff004d', controls: true, speed: 3 }));
  note(p, sc, 'Prueba ▶ y usa el D-Pad.', 20);
  note(p, sc, 'Selecciona el rectángulo: cambia “Control” a Circle Pad o solo horizontal.', 50);
});

export const lessonCollide = () => lesson('Lección 2 - Colisiones', (p, sc) => {
  p.variables = [{ name: 'monedas', value: 0 }];
  const player = makeObject(p, 'rect', { name: 'Jugador', x: 40, y: 100, w: 30, h: 30, color: '#29adff', controls: true, speed: 3 });
  const coin = makeObject(p, 'rect', { name: 'Moneda', x: 300, y: 100, w: 20, h: 20, color: '#ffec27' });
  const hud = makeObject(p, 'text', { name: 'Marcador', x: 10, y: 8, text: 'Monedas: {monedas}', color: '#ffffff' });
  sc.objects.push(player, coin, hud);
  sc.rules.push({ id: nextId(p), when: { type: 'collide', a: player.id, b: coin.id }, then: [{ type: 'addVar', var: 'monedas', value: 1 }, { type: 'randomPos', obj: coin.id, axis: 'xy' }] });
  note(p, sc, 'Regla: cuando el jugador choca con la moneda → suma 1 y la mueve.', 20);
});

export const lessonVariables = () => lesson('Lección 3 - Variables', (p, sc) => {
  p.variables = [{ name: 'clics', value: 0 }];
  const b = makeObject(p, 'button', { name: 'Botón +1', x: 90, y: 90, w: 140, h: 50, text: '¡Pulsa!' });
  const t = makeObject(p, 'text', { name: 'Contador', x: 150, y: 100, text: 'Clics: {clics}', color: '#ffffff' });
  const msg = makeObject(p, 'text', { name: 'Mensaje', x: 120, y: 140, text: '', color: '#00e436' });
  sc.objects.push(b, t, msg);
  sc.rules.push(
    { id: nextId(p), when: { type: 'touch', obj: b.id }, then: [{ type: 'addVar', var: 'clics', value: 1 }] },
    { id: nextId(p), when: { type: 'var', var: 'clics', op: '>=', value: 5 }, then: [{ type: 'setText', obj: msg.id, text: '¡Ya llevas {clics}!' }] },
  );
  note(p, sc, 'Toca el botón de abajo (pantalla táctil). Con 5 clics cambia el mensaje.', 20);
});

export const lessonScenes = () => {
  const p = lesson('Lección 4 - Escenas', () => {});
  const a = p.scenes[0]; a.name = 'Inicio'; a.bg.top = '#1d2b53';
  const b = makeScene(p, 'Segunda'); b.bg.top = '#7e2553'; b.bg.bottom = '#0e1020';
  const go = makeObject(p, 'button', { name: 'Ir a la segunda', x: 80, y: 100, w: 160, h: 50, text: 'Ir a “Segunda”' });
  const back = makeObject(p, 'button', { name: 'Volver', x: 80, y: 100, w: 160, h: 50, text: 'Volver' });
  a.objects.push(makeObject(p, 'text', { name: 'Título', x: 150, y: 100, text: 'Escena: Inicio', color: '#ffffff' }), go);
  b.objects.push(makeObject(p, 'text', { name: 'Título', x: 140, y: 100, text: 'Escena: Segunda', color: '#ffffff' }), back);
  a.rules.push({ id: nextId(p), when: { type: 'touch', obj: go.id }, then: [{ type: 'goto', scene: b.id }] });
  b.rules.push({ id: nextId(p), when: { type: 'touch', obj: back.id }, then: [{ type: 'goto', scene: a.id }] });
  p.scenes.push(b);
  return p;
};

export const lessonSound = () => lesson('Lección 5 - Sonido', (p, sc) => {
  const beep = addBeep(p, 'pitido', 700);
  const musId = nextId(p);
  p.assets.sounds.push({ id: musId, name: 'musica', seconds: 2, loop: true });
  p.blobs[musId] = toDataURL(melodyWav([392, 494, 587, 494, 392, 330, 392, 0]), 'audio/wav');
  const b1 = makeObject(p, 'button', { name: 'Pitido', x: 20, y: 40, w: 130, h: 50, text: 'Pitido' });
  const b2 = makeObject(p, 'button', { name: 'Música', x: 170, y: 40, w: 130, h: 50, text: 'Música ♪' });
  const b3 = makeObject(p, 'button', { name: 'Parar', x: 90, y: 110, w: 140, h: 50, text: 'Parar música' });
  sc.objects.push(b1, b2, b3);
  sc.rules.push(
    { id: nextId(p), when: { type: 'touch', obj: b1.id }, then: [{ type: 'sound', sound: beep }] },
    { id: nextId(p), when: { type: 'touch', obj: b2.id }, then: [{ type: 'sound', sound: musId }] },
    { id: nextId(p), when: { type: 'touch', obj: b3.id }, then: [{ type: 'stopSound', sound: musId }] },
  );
  note(p, sc, 'Las canciones usan “bucle” (el icono de repetir en la lista de sonidos).', 200);
});

export const LESSONS = [
  { id: 'l1', name: '1 · Mover un objeto', desc: 'D-Pad, Circle Pad y control solo horizontal/vertical.', icon: 'move', make: lessonMove },
  { id: 'l2', name: '2 · Colisiones', desc: 'Una regla “cuando chocan → sumar y recolocar”.', icon: 'burst', make: lessonCollide },
  { id: 'l3', name: '3 · Variables y marcador', desc: 'Contar toques y mostrar texto con {variable}.', icon: 'hash', make: lessonVariables },
  { id: 'l4', name: '4 · Varias escenas', desc: 'Botones táctiles que cambian de escena.', icon: 'clapper', make: lessonScenes },
  { id: 'l5', name: '5 · Sonido y música', desc: 'Efectos, música en bucle y parar sonido.', icon: 'sound', make: lessonSound },
];

export const TEMPLATES = [
  { id: 'coins', name: 'Recoger monedas', desc: 'Menú con botón táctil, jugador con D-Pad, sprite y sonido.', icon: 'coin', make: () => newProject() },
  { id: 'pong', name: 'Pong (1 jugador)', desc: 'Pelota con velocidad y rebotes en los bordes; pala vertical.', icon: 'pong', make: pongProject },
  { id: 'dodge', name: 'Esquivar', desc: 'Bloques que caen, marcador y pantalla de fin con reintento.', icon: 'comet', make: dodgeProject },
  { id: 'arcade', name: 'Arcade (Circle Pad + stylus)', desc: 'Nave con Circle Pad, cursor táctil, música en bucle, moneda animada y total guardado en la SD.', icon: 'joystick', make: arcadeProject },
  { id: 'runner', name: 'Corredor (saltos)', desc: 'Gravedad, saltar con A solo desde el suelo, obstáculos y récord guardado.', icon: 'runner', make: runnerProject },
  { id: 'blank', name: 'En blanco', desc: 'Una escena vacía.', icon: 'blocks', make: blankProject },
];
