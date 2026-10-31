#!/usr/bin/env node
// Genera en <dir> el proyecto 3DS de ejemplo del editor (para validarlo en CI compilándolo de verdad).
//   node scripts/gen-sample.mjs <dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { newProject, exportFiles } from '../web/js/project.js';

const out = process.argv[2];
if (!out) { console.error('uso: gen-sample.mjs <dir>'); process.exit(2); }
for (const f of exportFiles(newProject())) {
  const rel = f.path.split('/').slice(1).join('/'); // quita la carpeta raíz del zip
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, f.content);
}
console.log(`Proyecto de ejemplo escrito en ${out}`);
