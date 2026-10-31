#!/usr/bin/env node
// Genera docs/REFERENCIA.md (eventos, acciones, controles y límites) a partir del código del editor. `npm test` falla si está desactualizado.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { EVENTS, ACTIONS, EDGES, AXES } from '../web/js/rules.js';
import { CONTROL_MODES, LIMITS, KEYS, OBJECT_TYPES } from '../web/js/model.js';
import { TEMPLATES } from '../web/js/templates.js';

const FIELD = { key: 'botón', object: 'objeto', var: 'variable', op: 'comparación', number: 'número', text: 'texto', scene: 'escena', sound: 'sonido', edge: 'borde', axis: 'eje', randAxis: 'eje (X, Y o ambos)' };
const row = (key, e) => `| \`${key}\` | ${e.label} | ${e.fields.map((f) => `${f.label || f.k} (${FIELD[f.t] || f.t})`).join(', ') || '—'} |`;

export function render() {
  return `# Referencia del editor

> Generado automáticamente por \`scripts/gen-reference.mjs\`. No editar a mano (\`npm run gen:docs\`).

## Objetos
${Object.entries(OBJECT_TYPES).map(([k, v]) => `- **${v}** (\`${k}\`)`).join('\n')}

## Control de objetos
${Object.entries(CONTROL_MODES).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}

Otras propiedades de un objeto: posición, tamaño, color, pantalla (superior 400×240 o inferior 320×240 táctil), velocidad automática (Vel X / Vel Y), gravedad, animación por grupo de imágenes, tamaño del texto y visibilidad inicial.

## Eventos (“Cuando…”)
| Id | Descripción | Campos |
|---|---|---|
${Object.entries(EVENTS).map(([k, e]) => row(k, e)).join('\n')}

Cualquier regla puede llevar una segunda condición (“Y además…”) y se puede desactivar o reordenar. Bordes: ${Object.values(EDGES).join(', ')}. Ejes: ${Object.values(AXES).join(', ')}.

## Acciones (“Entonces…”)
| Id | Descripción | Campos |
|---|---|---|
${Object.entries(ACTIONS).map(([k, e]) => row(k, e)).join('\n')}

## Botones
${KEYS.join(', ')}. En la vista previa: flechas = D-Pad, Z X S A = A B X Y, Q W = L R, Enter = Start, Mayús = Select, I J K L = Circle Pad, ratón = pantalla táctil; un mando conectado también funciona (A = botón derecho, B = abajo, X = arriba, Y = izquierda; stick izquierdo = Circle Pad).

## Texto con variables
En textos y botones, \`{nombre}\` se sustituye por el valor de la variable. Las variables marcadas con 💾 se guardan en la SD (\`sdmc:/3ds/<juego>/save.dat\`) y se cargan al arrancar.

## Límites del editor
- Escenas: ${LIMITS.scenes} · Objetos por escena: ${LIMITS.objectsPerScene} · Reglas por escena: ${LIMITS.rules}
- Imágenes: ${LIMITS.images} (máx. ${LIMITS.maxImageSide} px por lado) · Sonidos: ${LIMITS.sounds} · Variables: ${LIMITS.variables}

## Plantillas
${TEMPLATES.map((t) => `- **${t.name}**: ${t.desc}`).join('\n')}
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'REFERENCIA.md'), render()); console.log('docs/REFERENCIA.md actualizado'); }
