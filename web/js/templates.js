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

export const TEMPLATES = [
  { id: 'coins', name: 'Recoger monedas', desc: 'Menú con botón táctil, jugador con D-Pad, sprite y sonido.', icon: '🪙', make: () => newProject() },
  { id: 'pong', name: 'Pong (1 jugador)', desc: 'Pelota con velocidad y rebotes en los bordes; pala vertical.', icon: '🏓', make: pongProject },
  { id: 'dodge', name: 'Esquivar', desc: 'Bloques que caen, marcador y pantalla de fin con reintento.', icon: '☄️', make: dodgeProject },
  { id: 'arcade', name: 'Arcade (Circle Pad + stylus)', desc: 'Nave con Circle Pad, cursor táctil, música en bucle, moneda animada y total guardado en la SD.', icon: '🕹️', make: arcadeProject },
  { id: 'blank', name: 'En blanco', desc: 'Una escena vacía.', icon: '📄', make: blankProject },
];
