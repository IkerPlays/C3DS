#!/usr/bin/env node
// Decide qué plataformas necesitan devbuild según los archivos cambiados.
//   node scripts/plan-devbuild.mjs --before <sha> --after <sha> --run <n> [--only <plataforma|all>]
// Un cambio en scripts/ o en el workflow de build reconstruye todas las plataformas.
import { readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GLOBAL_PATHS = ['scripts/', '.github/workflows/_build.yml', '.github/workflows/devbuild.yml', 'package.json'];

export function platformsForChanges(files, names) {
  if (files.some((f) => GLOBAL_PATHS.some((g) => f.startsWith(g)))) return [...names];
  return names.filter((n) => files.some((f) => f.startsWith(`${n}/`)));
}

export function buildMatrix(selected, platforms, { run, sha, root = ROOT }) {
  return {
    include: selected.map((p) => {
      const v = readFileSync(join(root, p, 'VERSION'), 'utf8').trim().replace(/\+.*$/, '');
      return { platform: p, runner: platforms[p].runner, version: `${v}-dev.${run}.${sha.slice(0, 7)}` };
    }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
  const platforms = JSON.parse(readFileSync(join(ROOT, 'scripts/platforms.json'), 'utf8'));
  const names = Object.keys(platforms);
  let selected;
  if (a.only && a.only !== 'all') {
    if (!platforms[a.only]) { console.error(`::error::Plataforma desconocida ${a.only}`); process.exit(1); }
    selected = [a.only];
  } else if (a.only === 'all') {
    selected = names;
  } else {
    const zero = !a.before || /^0+$/.test(a.before);
    let files;
    try {
      files = execFileSync('git', zero ? ['diff', '--name-only', `${a.after}~1`, a.after] : ['diff', '--name-only', a.before, a.after], { encoding: 'utf8', cwd: ROOT }).split('\n').filter(Boolean);
    } catch { files = names.map((n) => `${n}/`); }
    selected = platformsForChanges(files, names);
  }
  const matrix = buildMatrix(selected, platforms, { run: a.run || '0', sha: a.after || 'local' });
  const lines = `any=${selected.length > 0}\nmatrix=${JSON.stringify(matrix)}`;
  console.log(lines);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
}
