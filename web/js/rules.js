// Esquema de eventos y acciones del editor (qué campos tiene cada uno y sus valores por defecto).
import { KEYS } from './model.js';
import { tr } from './i18n.js';

export const EDGES = { left: 'Izquierdo', right: 'Derecho', top: 'Superior', bottom: 'Inferior' };
export const AXES = { x: 'Horizontal (X)', y: 'Vertical (Y)' };
export const FLIPS = { false: 'Normal', true: 'Espejo (volteado)' };
export const RAND_AXES = { xy: 'Cualquier posición', x: 'Solo en X', y: 'Solo en Y' };
export const OPS = ['==', '!=', '>', '>=', '<', '<='];
export const OP_LABEL = { '==': 'es igual a', '!=': 'es distinto de', '>': 'es mayor que', '>=': 'es mayor o igual que', '<': 'es menor que', '<=': 'es menor o igual que' };

export const EVENTS = {
  start: { label: 'La escena empieza', fields: [] },
  key: { label: 'Se pulsa un botón', fields: [{ k: 'key', t: 'key', label: 'Botón' }] },
  keyUp: { label: 'Se suelta un botón', fields: [{ k: 'key', t: 'key', label: 'Botón' }] },
  anyKey: { label: 'Se pulsa cualquier botón', fields: [] },
  after: { label: 'Pasan unos segundos desde que empieza la escena (una vez)', fields: [{ k: 'seconds', t: 'number', label: 'Segundos', min: 0.1, step: 0.1 }] },
  keyHeld: { label: 'Se mantiene un botón', fields: [{ k: 'key', t: 'key', label: 'Botón' }] },
  collide: { label: 'Dos objetos chocan', fields: [{ k: 'a', t: 'object', label: 'Objeto' }, { k: 'b', t: 'object', label: 'con' }] },
  touchAny: { label: 'Se toca la pantalla táctil (en cualquier sitio)', fields: [] },
  touch: { label: 'Se toca un objeto (pantalla inferior)', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }] },
  var: { label: 'Una variable cumple una condición', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'op', t: 'op', label: '' }, { k: 'value', t: 'number', label: 'Valor' }] },
  edge: { label: 'Un objeto toca el borde de la pantalla', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'edge', t: 'edge', label: 'Borde' }] },
  standing: { label: 'Un objeto está apoyado sobre otro', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'on', t: 'object', label: 'sobre' }] },
  timer: { label: 'Cada cierto tiempo', fields: [{ k: 'seconds', t: 'number', label: 'Segundos', min: 0.1, step: 0.1 }] },
};

export const ACTIONS = {
  goto: { label: 'Ir a la escena', fields: [{ k: 'scene', t: 'scene', label: 'Escena' }] },
  setVar: { label: 'Poner variable a', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'value', t: 'number', label: 'Valor' }] },
  addVar: { label: 'Sumar a variable', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'value', t: 'number', label: 'Cantidad' }] },
  randVar: { label: 'Poner variable a un número al azar', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'min', t: 'number', label: 'Mínimo' }, { k: 'max', t: 'number', label: 'Máximo' }] },
  maxVar: { label: 'Guardar el máximo en una variable (récord)', fields: [{ k: 'var', t: 'var', label: 'Variable (récord)' }, { k: 'from', t: 'var', label: 'Comparar con' }] },
  sound: { label: 'Reproducir sonido', fields: [{ k: 'sound', t: 'sound', label: 'Sonido' }] },
  stopSound: { label: 'Parar sonido / música', fields: [{ k: 'sound', t: 'sound', label: 'Sonido' }] },
  setPos: { label: 'Colocar objeto en', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'x', t: 'number', label: 'X' }, { k: 'y', t: 'number', label: 'Y' }] },
  move: { label: 'Mover objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'dx', t: 'number', label: 'ΔX' }, { k: 'dy', t: 'number', label: 'ΔY' }] },
  randomPos: { label: 'Colocar objeto al azar', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'axis', t: 'randAxis', label: 'En' }] },
  landOn: { label: 'Apoyar objeto sobre otro (aterrizar)', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'on', t: 'object', label: 'sobre' }] },
  setVel: { label: 'Cambiar velocidad (px/frame)', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'axis', t: 'axis', label: 'Eje' }, { k: 'value', t: 'number', label: 'Valor', step: 0.5 }] },
  setText: { label: 'Cambiar texto (usa {variable})', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'text', t: 'text', label: 'Texto' }] },
  setColor: { label: 'Cambiar el color de un objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'color', t: 'color', label: 'Color' }] },
  setAnim: { label: 'Cambiar animación de un sprite', fields: [{ k: 'obj', t: 'object', label: 'Sprite' }, { k: 'group', t: 'group', label: 'Grupo' }] },
  setOpacity: { label: 'Cambiar la opacidad de un objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'value', t: 'number', label: 'Opacidad (0 a 1)', step: 0.1, min: 0, max: 1 }] },
  setFlip: { label: 'Voltear un sprite (espejo horizontal)', fields: [{ k: 'obj', t: 'object', label: 'Sprite' }, { k: 'flip', t: 'flip', label: 'Espejo' }] },
  toggle: { label: 'Alternar visible / oculto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }] },
  show: { label: 'Mostrar objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }] },
  hide: { label: 'Ocultar objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }] },
  quit: { label: 'Salir del juego', fields: [] },
};

/** Valor por defecto de un campo según el contexto (proyecto + escena actual). */
export function defaultFor(field, ctx) {
  const { p, scene } = ctx;
  switch (field.t) {
    case 'key': return KEYS[0];
    case 'object': return scene.objects[0]?.id ?? null;
    case 'var': return p.variables[0]?.name ?? '';
    case 'op': return '==';
    case 'number': return field.label.startsWith('Opacidad') ? 1 : field.k === 'seconds' ? 1 : field.k === 'max' ? 10 : field.k === 'value' && field.label === 'Cantidad' ? 1 : 0;
    case 'text': return 'Texto';
    case 'scene': return p.scenes.find((s) => s.id !== scene.id)?.id ?? p.scenes[0]?.id ?? null;
    case 'sound': return p.assets.sounds[0]?.id ?? null;
    case 'color': return '#ff004d';
    case 'flip': return true;
    case 'group': return p.assets.images.find((a) => a.group)?.group ?? '';
    case 'edge': return 'left';
    case 'axis': return 'x';
    case 'randAxis': return 'xy';
    default: return null;
  }
}

function build(schema, type, ctx) {
  const o = { type };
  for (const f of schema[type].fields) o[f.k] = defaultFor(f, ctx);
  return o;
}
export const defaultWhen = (type, ctx) => build(EVENTS, type, ctx);
export const defaultAction = (type, ctx) => build(ACTIONS, type, ctx);

/** Resumen en lenguaje natural de una regla (para la cabecera de la tarjeta). */
export function describeRule(r, p, scene) {
  const base = describeBase(r, p, scene);
  if (!r.also) return base;
  const extra = describeBase({ when: r.also, then: [] }, p, scene).split(' → ')[0].toLowerCase();
  return base.replace(' → ', ` ${tr('y además', 'and also')} ${extra} → `);
}

const EDGE_EN = { left: 'left', right: 'right', top: 'top', bottom: 'bottom' };
const OP_EN = { '==': 'equals', '!=': 'is not equal to', '>': 'is greater than', '>=': 'is greater than or equal to', '<': 'is less than', '<=': 'is less than or equal to' };

function describeBase(r, p, scene) {
  const obj = (id) => scene.objects.find((o) => o.id === id)?.name ?? '¿?';
  const sc = (id) => p.scenes.find((x) => x.id === id)?.name ?? '¿?';
  const snd = (id) => p.assets.sounds.find((x) => x.id === id)?.name ?? '¿?';
  const w = r.when;
  const T = (es, en) => tr(es, en);
  const when = {
    start: () => T('al empezar la escena', 'when the scene starts'), key: () => T(`al pulsar ${w.key}`, `when ${w.key} is pressed`),
    keyHeld: () => T(`mientras se mantiene ${w.key}`, `while ${w.key} is held`), keyUp: () => T(`al soltar ${w.key}`, `when ${w.key} is released`),
    anyKey: () => T('al pulsar cualquier botón', 'when any button is pressed'), after: () => T(`a los ${w.seconds} s de empezar`, `${w.seconds} s after the scene starts`),
    collide: () => T(`si ${obj(w.a)} choca con ${obj(w.b)}`, `if ${obj(w.a)} collides with ${obj(w.b)}`), touch: () => T(`al tocar ${obj(w.obj)}`, `when ${obj(w.obj)} is tapped`),
    var: () => T(`si ${w.var} ${OP_LABEL[w.op] || w.op} ${w.value}`, `if ${w.var} ${OP_EN[w.op] || w.op} ${w.value}`),
    edge: () => T(`si ${obj(w.obj)} toca el borde ${EDGES[w.edge]?.toLowerCase() || ''}`, `if ${obj(w.obj)} touches the ${EDGE_EN[w.edge] || ''} edge`),
    touchAny: () => T('al tocar la pantalla táctil', 'when the touch screen is tapped'), timer: () => T(`cada ${w.seconds} s`, `every ${w.seconds} s`),
    standing: () => T(`si ${obj(w.obj)} está sobre ${obj(w.on)}`, `if ${obj(w.obj)} is on ${obj(w.on)}`),
  }[w.type]?.() ?? '…';
  const act = (a) => ({
    goto: () => T(`ir a “${sc(a.scene)}”`, `go to “${sc(a.scene)}”`), setVar: () => `${a.var} = ${a.value}`, addVar: () => `${a.var} ${a.value >= 0 ? '+' : '-'}= ${Math.abs(a.value)}`,
    randVar: () => T(`${a.var} = azar(${a.min}…${a.max})`, `${a.var} = random(${a.min}…${a.max})`),
    maxVar: () => T(`${a.var} = máx(${a.var}, ${a.from})`, `${a.var} = max(${a.var}, ${a.from})`),
    sound: () => T(`sonar “${snd(a.sound)}”`, `play “${snd(a.sound)}”`), stopSound: () => T(`parar “${snd(a.sound)}”`, `stop “${snd(a.sound)}”`),
    setPos: () => `${obj(a.obj)} → (${a.x}, ${a.y})`, move: () => T(`mover ${obj(a.obj)} (${a.dx}, ${a.dy})`, `move ${obj(a.obj)} (${a.dx}, ${a.dy})`),
    randomPos: () => T(`${obj(a.obj)} al azar`, `${obj(a.obj)} at random`), landOn: () => T(`${obj(a.obj)} aterriza sobre ${obj(a.on)}`, `${obj(a.obj)} lands on ${obj(a.on)}`),
    setVel: () => T(`vel. ${a.axis === 'y' ? 'Y' : 'X'} de ${obj(a.obj)} = ${a.value}`, `speed ${a.axis === 'y' ? 'Y' : 'X'} of ${obj(a.obj)} = ${a.value}`),
    setAnim: () => T(`animación de ${obj(a.obj)} = ${a.group || 'ninguna'}`, `animation of ${obj(a.obj)} = ${a.group || 'none'}`),
    setText: () => T(`texto de ${obj(a.obj)}`, `text of ${obj(a.obj)}`), setColor: () => T(`color de ${obj(a.obj)} = ${a.color}`, `color of ${obj(a.obj)} = ${a.color}`),
    setOpacity: () => T(`opacidad de ${obj(a.obj)} = ${a.value}`, `opacity of ${obj(a.obj)} = ${a.value}`),
    setFlip: () => T(`${a.flip ? 'voltear' : 'enderezar'} ${obj(a.obj)}`, `${a.flip ? 'flip' : 'unflip'} ${obj(a.obj)}`),
    toggle: () => T(`alternar ${obj(a.obj)}`, `toggle ${obj(a.obj)}`),
    show: () => T(`mostrar ${obj(a.obj)}`, `show ${obj(a.obj)}`), hide: () => T(`ocultar ${obj(a.obj)}`, `hide ${obj(a.obj)}`), quit: () => T('salir', 'quit'),
  }[a.type]?.() ?? '…');
  return `${when.charAt(0).toUpperCase()}${when.slice(1)} → ${r.then.map(act).join(', ') || T('nada', 'nothing')}`;
}
