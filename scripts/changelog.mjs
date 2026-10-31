#!/usr/bin/env node
// Extrae las notas de una versión de un CHANGELOG (formato "Keep a Changelog").
//   node scripts/changelog.mjs <CHANGELOG.md> <versión|Unreleased>
// Imprime la sección "## [versión] ..." sin el encabezado. Sale con 1 si no existe o está vacía.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function extractSection(markdown, version) {
  const v = version.replace(/^v/i, '').toLowerCase();
  const lines = markdown.split(/\r?\n/);
  const isHeading = (l) => /^##\s+/.test(l);
  const start = lines.findIndex((l) => {
    if (!isHeading(l)) return false;
    const m = /^##\s+\[?v?([^\]\s]+)\]?/i.exec(l);
    return m && m[1].toLowerCase() === v;
  });
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && isHeading(l));
  if (end < 0) end = lines.length;
  // Descarta los enlaces de referencia del final ("[1.0.0]: https://...").
  const body = lines.slice(start + 1, end).filter((l) => !/^\[[^\]]+\]:\s*\S+/.test(l)).join('\n').trim();
  return body || null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, version] = process.argv.slice(2);
  if (!file || !version) { console.error('uso: changelog.mjs <archivo> <versión>'); process.exit(2); }
  const out = extractSection(readFileSync(file, 'utf8'), version);
  if (!out) { console.error(`No hay notas para ${version} en ${file}`); process.exit(1); }
  console.log(out);
}
