#!/usr/bin/env node
// Genera en <dir> el proyecto 3DS de ejemplo del editor (para validarlo en CI compilándolo de verdad).
//   node scripts/gen-sample.mjs <dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { TEMPLATES } from '../web/js/templates.js';
import { exportFiles } from '../web/js/codegen.js';
import { buildHtml5 } from '../web/js/html5.js';

const out = process.argv[2];
const html5 = process.argv.includes('--html5');
const tplId = (process.argv.find((a) => a.startsWith('--template=')) || '--template=coins').split('=')[1];
const tpl = TEMPLATES.find((t) => t.id === tplId);
if (!tpl) { console.error(`plantilla desconocida: ${tplId}`); process.exit(2); }
if (!out) { console.error('uso: gen-sample.mjs <dir>'); process.exit(2); }
if (html5) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), buildHtml5(tpl.make()));
  console.log(`Juego HTML5 de ejemplo escrito en ${out}`);
  process.exit(0);
}
for (const f of exportFiles(tpl.make())) {
  const rel = f.path.split('/').slice(1).join('/'); // quita la carpeta raíz del zip
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, f.content);
}
console.log(`Proyecto de ejemplo (${tplId}) escrito en ${out}`);
