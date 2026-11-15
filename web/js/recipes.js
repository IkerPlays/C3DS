// Recetas: grupos de reglas ya hechos para lo que casi todos los juegos necesitan. Es código puro (se prueba en Node).
import { nextId } from './model.js';

/** Cada receta pide unos parámetros (objeto, variable, escena) y devuelve las reglas que hay que añadir. */
export const RECIPES = [
  { id: 'collect', label: 'Recoger algo al chocar (suma y desaparece)',
    params: [{ k: 'player', t: 'object', label: 'Quien recoge' }, { k: 'item', t: 'object', label: 'Lo que se recoge' }, { k: 'var', t: 'var', label: 'Variable que suma' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'collide', a: v.player, b: v.item }, then: [{ type: 'addVar', var: v.var, value: 1 }, { type: 'hide', obj: v.item }] }] },
  { id: 'jump', label: 'Saltar con A (solo desde el suelo)',
    params: [{ k: 'player', t: 'object', label: 'Quien salta (con gravedad)' }, { k: 'ground', t: 'object', label: 'Suelo o plataforma' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'key', key: 'A' }, also: { type: 'standing', obj: v.player, on: v.ground }, then: [{ type: 'setVel', obj: v.player, axis: 'y', value: -9 }] }] },
  { id: 'gameover', label: 'Fin del juego al chocar (ir a otra escena)',
    params: [{ k: 'player', t: 'object', label: 'Jugador' }, { k: 'danger', t: 'object', label: 'Peligro' }, { k: 'scene', t: 'scene', label: 'Escena de destino' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'collide', a: v.player, b: v.danger }, then: [{ type: 'goto', scene: v.scene }] }] },
  { id: 'button', label: 'Botón táctil que cambia de escena',
    params: [{ k: 'btn', t: 'object', label: 'Botón' }, { k: 'scene', t: 'scene', label: 'Escena de destino' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'touch', obj: v.btn }, then: [{ type: 'goto', scene: v.scene }] }] },
  { id: 'pause', label: 'Pausa con START (muestra un texto)',
    params: [{ k: 'label', t: 'object', label: 'Texto “Pausa” (oculto al empezar)' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'key', key: 'START' }, then: [{ type: 'pause', mode: 'toggle' }, { type: 'toggle', obj: v.label }] }] },
  { id: 'respawn', label: 'Volver a empezar la escena con SELECT',
    params: [{ k: 'scene', t: 'scene', label: 'Esta escena' }],
    build: (v, p) => [{ id: nextId(p), when: { type: 'key', key: 'SELECT' }, then: [{ type: 'goto', scene: v.scene }] }] },
];

/** Valores por defecto razonables para los parámetros de una receta en la escena actual. */
export function defaultValues(recipe, p, scene) {
  const out = {};
  for (const prm of recipe.params) {
    if (prm.t === 'object') out[prm.k] = scene.objects[Object.keys(out).filter((k) => recipe.params.find((q) => q.k === k).t === 'object').length]?.id ?? scene.objects[0]?.id ?? null;
    else if (prm.t === 'var') out[prm.k] = p.variables[0]?.name ?? '';
    else if (prm.t === 'scene') out[prm.k] = prm.k === 'scene' && recipe.id === 'respawn' ? scene.id : (p.scenes.find((s) => s.id !== scene.id) ?? scene).id;
  }
  return out;
}

/** Añade las reglas de la receta a la escena (respeta el límite). Devuelve cuántas añadió. */
export function applyRecipe(recipe, vals, p, scene, limit = 60) {
  const rules = recipe.build(vals, p);
  if (scene.rules.length + rules.length > limit) throw new Error('Se superaría el máximo de reglas por escena.');
  scene.rules.push(...rules);
  return rules.length;
}
