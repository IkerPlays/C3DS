// Modelo del proyecto (formato 2): escenas, objetos, reglas, variables y recursos.
import { encodePNG } from './png.js';
import { toDataURL } from './bytes.js';
import { toneWav, wavInfo } from './wav.js';
import { fromDataURL } from './bytes.js';

export const SCREENS = { top: { w: 400, h: 240 }, bottom: { w: 320, h: 240 } };
export const KEYS = ['A', 'B', 'X', 'Y', 'L', 'R', 'START', 'SELECT', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
export const KEY_LABEL = { UP: '⬆ Arriba', DOWN: '⬇ Abajo', LEFT: '⬅ Izquierda', RIGHT: '➡ Derecha', START: 'Start', SELECT: 'Select' };
export const LIMITS = { scenes: 16, objectsPerScene: 64, images: 32, sounds: 16, variables: 32, rules: 64, maxImageSide: 512 };
export const CONTROL_MODES = { false: 'Ninguno', true: 'D-Pad (4 direcciones)', h: 'Solo horizontal', v: 'Solo vertical' };
export const OBJECT_TYPES = { rect: 'Rectángulo', text: 'Texto', sprite: 'Sprite', button: 'Botón táctil' };

export const slug = (s) => (String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'juego').slice(0, 40);
export const isVarName = (s) => /^[A-Za-z_][A-Za-z0-9_]{0,23}$/.test(s);
const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (s) => HEX.test(s);

export function nextId(p) { p.seq = (p.seq || 0) + 1; return p.seq; }

export function makeObject(p, type, over = {}) {
  const base = { id: nextId(p), name: '', type, screen: 'top', x: 40, y: 40, w: 40, h: 40, color: '#ffffff', text: '', image: null, controls: false, speed: 3, vx: 0, vy: 0, visible: true };
  if (type === 'text') Object.assign(base, { w: 0, h: 0, text: 'Texto' });
  if (type === 'button') Object.assign(base, { screen: 'bottom', w: 120, h: 40, color: '#29adff', text: 'Botón' });
  const o = { ...base, ...over };
  if (!o.name) o.name = `${OBJECT_TYPES[type]} ${o.id}`;
  return o;
}

export function makeScene(p, name = 'Escena') {
  return { id: nextId(p), name, bg: { top: '#1d2b53', bottom: '#222222' }, objects: [], rules: [] };
}

/** Proyecto de ejemplo: menú + juego de recoger monedas, con un sprite y un sonido generados. */
export function newProject() {
  const p = { format: 2, seq: 0, name: 'Mi primer juego', author: 'Autor', description: 'Creado con C3DS', assets: { images: [], sounds: [] }, blobs: {}, variables: [{ name: 'puntos', value: 0 }], scenes: [], startScene: 0 };

  const star = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5);
    const i = (y * 32 + x) * 4;
    if (d < 14) { star[i] = 255; star[i + 1] = d < 8 ? 236 : 163; star[i + 2] = d < 8 ? 39 : 0; star[i + 3] = 255; }
  }
  const imgId = nextId(p);
  p.assets.images.push({ id: imgId, name: 'moneda', w: 32, h: 32 });
  p.blobs[imgId] = toDataURL(encodePNG(32, 32, star), 'image/png');
  const sndId = nextId(p);
  p.assets.sounds.push({ id: sndId, name: 'moneda', seconds: 0.15 });
  p.blobs[sndId] = toDataURL(toneWav(988, 0.15), 'audio/wav');

  const menu = makeScene(p, 'Menú');
  const game = makeScene(p, 'Juego');
  game.bg.top = '#008751';
  const title = makeObject(p, 'text', { name: 'Título', x: 120, y: 90, text: 'MI PRIMER JUEGO', color: '#ffec27' });
  const play = makeObject(p, 'button', { name: 'Botón jugar', x: 100, y: 100, text: 'Jugar' });
  menu.objects.push(title, play);
  const player = makeObject(p, 'rect', { name: 'Jugador', x: 180, y: 100, color: '#ff004d', controls: true, speed: 3 });
  const coin = makeObject(p, 'sprite', { name: 'Moneda', x: 300, y: 60, w: 32, h: 32, image: imgId });
  const score = makeObject(p, 'text', { name: 'Marcador', x: 10, y: 8, text: 'Puntos: {puntos}', color: '#ffffff' });
  const hint = makeObject(p, 'text', { name: 'Ayuda', screen: 'bottom', x: 20, y: 110, text: 'D-Pad: mover   START: menú', color: '#c2c3c7' });
  game.objects.push(player, coin, score, hint);
  menu.rules.push({ id: nextId(p), when: { type: 'touch', obj: play.id }, then: [{ type: 'setVar', var: 'puntos', value: 0 }, { type: 'goto', scene: game.id }] });
  game.rules.push(
    { id: nextId(p), when: { type: 'collide', a: player.id, b: coin.id }, then: [{ type: 'addVar', var: 'puntos', value: 1 }, { type: 'sound', sound: sndId }, { type: 'randomPos', obj: coin.id, axis: 'xy' }] },
    { id: nextId(p), when: { type: 'key', key: 'START' }, then: [{ type: 'goto', scene: menu.id }] },
  );
  p.scenes.push(menu, game);
  p.startScene = menu.id;
  return p;
}

/** Convierte proyectos del formato 1 (v0.1 alfa) al formato 2. */
export function migrate(src) {
  if (src && src.format === 2) return src;
  if (!src || src.format !== 1) throw new Error('Formato de proyecto desconocido');
  const p = newProject();
  p.name = src.name; p.author = src.author; p.description = src.description || '';
  p.assets = { images: [], sounds: [] }; p.blobs = {}; p.variables = [];
  const sc = makeScene(p, 'Escena 1');
  sc.bg = { ...src.bg };
  for (const e of src.entities || []) {
    sc.objects.push(makeObject(p, e.type === 'text' ? 'text' : 'rect', { name: undefined, screen: e.screen, x: e.x, y: e.y, w: e.w, h: e.h, color: e.color, text: e.text, controls: !!e.player, speed: e.speed || 3 }));
  }
  p.scenes = [sc]; p.startScene = sc.id;
  return p;
}

export function findScene(p, id) { return p.scenes.find((s) => s.id === id); }
export function findObject(p, id) { for (const s of p.scenes) for (const o of s.objects) if (o.id === id) return o; return null; }
export function sceneOfObject(p, id) { return p.scenes.find((s) => s.objects.some((o) => o.id === id)); }

/** Reglas válidas para el generador: descarta referencias rotas. Devuelve lista de problemas. */
export function validate(p) {
  const out = [];
  const warn = (level, text) => out.push({ level, text });
  if (!p.scenes.length) warn('error', 'El proyecto no tiene escenas.');
  if (p.scenes.length > LIMITS.scenes) warn('error', `Máximo ${LIMITS.scenes} escenas.`);
  if (!findScene(p, p.startScene)) warn('error', 'La escena inicial no existe.');
  if (p.variables.length > LIMITS.variables) warn('error', `Máximo ${LIMITS.variables} variables.`);
  const names = new Set();
  for (const v of p.variables) { if (!isVarName(v.name)) warn('error', `Nombre de variable inválido: "${v.name}".`); if (names.has(v.name)) warn('error', `Variable repetida: ${v.name}.`); names.add(v.name); }
  if (p.assets.images.length > LIMITS.images) warn('error', `Máximo ${LIMITS.images} imágenes.`);
  if (p.assets.sounds.length > LIMITS.sounds) warn('error', `Máximo ${LIMITS.sounds} sonidos.`);
  for (const a of [...p.assets.images, ...p.assets.sounds]) if (!p.blobs[a.id]) warn('error', `Falta el archivo de "${a.name}".`);
  for (const a of p.assets.images) if (a.w > LIMITS.maxImageSide || a.h > LIMITS.maxImageSide) warn('error', `La imagen "${a.name}" supera ${LIMITS.maxImageSide}px.`);
  const objIds = new Set(p.scenes.flatMap((s) => s.objects.map((o) => o.id)));
  const imgIds = new Set(p.assets.images.map((a) => a.id));
  const sndIds = new Set(p.assets.sounds.map((a) => a.id));
  const sceneIds = new Set(p.scenes.map((s) => s.id));
  for (const s of p.scenes) {
    if (s.objects.length > LIMITS.objectsPerScene) warn('error', `Escena "${s.name}": máximo ${LIMITS.objectsPerScene} objetos.`);
    if (s.rules.length > LIMITS.rules) warn('error', `Escena "${s.name}": máximo ${LIMITS.rules} reglas.`);
    if (!isHex(s.bg.top) || !isHex(s.bg.bottom)) warn('error', `Escena "${s.name}": color de fondo inválido.`);
    for (const o of s.objects) {
      const scr = SCREENS[o.screen];
      if (!scr) { warn('error', `"${o.name}": pantalla inválida.`); continue; }
      if (!isHex(o.color)) warn('error', `"${o.name}": color inválido.`);
      if (o.type === 'sprite' && !imgIds.has(o.image)) warn('error', `"${o.name}" (${s.name}): no tiene imagen.`);
      if (o.type !== 'text' && (o.x < 0 || o.y < 0 || o.x + o.w > scr.w || o.y + o.h > scr.h)) warn('warn', `"${o.name}" (${s.name}) sale de la pantalla.`);
      if (o.type === 'button' && o.screen !== 'bottom') warn('warn', `"${o.name}": los botones táctiles solo funcionan en la pantalla inferior.`);
    }
    for (const r of s.rules) {
      const refs = [];
      const w = r.when;
      if (w.type === 'collide') refs.push(w.a, w.b); if (w.type === 'touch') refs.push(w.obj);
      if (w.type === 'var' && !names.has(w.var)) warn('error', `Regla en "${s.name}": variable "${w.var}" no existe.`);
      for (const a of r.then) {
        if (a.obj != null) refs.push(a.obj);
        if (a.type === 'goto' && !sceneIds.has(a.scene)) warn('error', `Regla en "${s.name}": escena de destino no existe.`);
        if (a.type === 'sound' && !sndIds.has(a.sound)) warn('error', `Regla en "${s.name}": sonido no existe.`);
        if ((a.type === 'setVar' || a.type === 'addVar') && !names.has(a.var)) warn('error', `Regla en "${s.name}": variable "${a.var}" no existe.`);
      }
      if (refs.some((id) => !objIds.has(id))) warn('error', `Regla en "${s.name}": hace referencia a un objeto que ya no existe.`);
    }
  }
  const bytes = Object.values(p.blobs).reduce((n, d) => n + d.length * 0.75, 0);
  if (bytes > 3 * 1048576) warn('warn', `Los recursos pesan ${(bytes / 1048576).toFixed(1)} MB: el guardado local y la compilación en la nube pueden fallar.`);
  return out;
}

export function checkSound(p, id) {
  const { bytes } = fromDataURL(p.blobs[id]);
  const info = wavInfo(bytes);
  return !!info && info.bits === 16;
}
