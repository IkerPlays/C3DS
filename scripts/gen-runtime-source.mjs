#!/usr/bin/env node
// Genera web/js/runtime-source.js: el código de runtime.js como cadena, para incrustarlo en el HTML5 exportado
// también desde la Netlify Function (que no puede leer archivos del sitio). `npm test` falla si está desactualizado.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'js');
export function render() {
  const src = readFileSync(join(dir, 'runtime.js'), 'utf8');
  return `// GENERADO por scripts/gen-runtime-source.mjs a partir de runtime.js. No editar a mano (npm run gen:runtime).\nexport const RUNTIME_SOURCE = ${JSON.stringify(src)};\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { writeFileSync(join(dir, 'runtime-source.js'), render()); console.log('web/js/runtime-source.js actualizado'); }
