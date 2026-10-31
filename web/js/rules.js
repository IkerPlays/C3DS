// Esquema de eventos y acciones del editor (qué campos tiene cada uno y sus valores por defecto).
import { KEYS } from './model.js';

export const EDGES = { left: 'Izquierdo', right: 'Derecho', top: 'Superior', bottom: 'Inferior' };
export const AXES = { x: 'Horizontal (X)', y: 'Vertical (Y)' };
export const RAND_AXES = { xy: 'Cualquier posición', x: 'Solo en X', y: 'Solo en Y' };
export const OPS = ['==', '!=', '>', '>=', '<', '<='];
export const OP_LABEL = { '==': 'es igual a', '!=': 'es distinto de', '>': 'es mayor que', '>=': 'es mayor o igual que', '<': 'es menor que', '<=': 'es menor o igual que' };

export const EVENTS = {
  start: { label: 'La escena empieza', fields: [] },
  key: { label: 'Se pulsa un botón', fields: [{ k: 'key', t: 'key', label: 'Botón' }] },
  keyHeld: { label: 'Se mantiene un botón', fields: [{ k: 'key', t: 'key', label: 'Botón' }] },
  collide: { label: 'Dos objetos chocan', fields: [{ k: 'a', t: 'object', label: 'Objeto' }, { k: 'b', t: 'object', label: 'con' }] },
  touch: { label: 'Se toca un objeto (pantalla inferior)', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }] },
  var: { label: 'Una variable cumple una condición', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'op', t: 'op', label: '' }, { k: 'value', t: 'number', label: 'Valor' }] },
  edge: { label: 'Un objeto toca el borde de la pantalla', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'edge', t: 'edge', label: 'Borde' }] },
  timer: { label: 'Cada cierto tiempo', fields: [{ k: 'seconds', t: 'number', label: 'Segundos', min: 0.1, step: 0.1 }] },
};

export const ACTIONS = {
  goto: { label: 'Ir a la escena', fields: [{ k: 'scene', t: 'scene', label: 'Escena' }] },
  setVar: { label: 'Poner variable a', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'value', t: 'number', label: 'Valor' }] },
  addVar: { label: 'Sumar a variable', fields: [{ k: 'var', t: 'var', label: 'Variable' }, { k: 'value', t: 'number', label: 'Cantidad' }] },
  sound: { label: 'Reproducir sonido', fields: [{ k: 'sound', t: 'sound', label: 'Sonido' }] },
  setPos: { label: 'Colocar objeto en', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'x', t: 'number', label: 'X' }, { k: 'y', t: 'number', label: 'Y' }] },
  move: { label: 'Mover objeto', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'dx', t: 'number', label: 'ΔX' }, { k: 'dy', t: 'number', label: 'ΔY' }] },
  randomPos: { label: 'Colocar objeto al azar', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'axis', t: 'randAxis', label: 'En' }] },
  setVel: { label: 'Cambiar velocidad (px/frame)', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'axis', t: 'axis', label: 'Eje' }, { k: 'value', t: 'number', label: 'Valor', step: 0.5 }] },
  setText: { label: 'Cambiar texto (usa {variable})', fields: [{ k: 'obj', t: 'object', label: 'Objeto' }, { k: 'text', t: 'text', label: 'Texto' }] },
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
    case 'number': return field.k === 'seconds' ? 1 : field.k === 'value' && field.label === 'Cantidad' ? 1 : 0;
    case 'text': return 'Texto';
    case 'scene': return p.scenes.find((s) => s.id !== scene.id)?.id ?? p.scenes[0]?.id ?? null;
    case 'sound': return p.assets.sounds[0]?.id ?? null;
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
