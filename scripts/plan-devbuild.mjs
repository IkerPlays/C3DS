#!/usr/bin/env node
// Prepara la matriz del devbuild: SIEMPRE todas las plataformas, en una sola release.
//   node scripts/plan-devbuild.mjs --run <n> --after <sha>
// Versión: <VERSION raíz>-dev.<run>.<sha7>
import { readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function buildMatrix(platforms, { run, sha, root = ROOT }) {
  const base = readFileSync(join(root, 'VERSION'), 'utf8').trim().replace(/[-+].*$/, '');
  const version = `${base}-dev.${run}.${sha.slice(0, 7)}`;
  return { version, matrix: { include: Object.entries(platforms).map(([platform, p]) => ({ platform, runner: p.runner })) } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
  const platforms = JSON.parse(readFileSync(join(ROOT, 'scripts/platforms.json'), 'utf8'));
  const { version, matrix } = buildMatrix(platforms, { run: a.run || '0', sha: a.after || 'local' });
  const lines = `version=${version}\nmatrix=${JSON.stringify(matrix)}`;
  console.log(lines);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
}
