#!/usr/bin/env node
// Empaqueta una plataforma en dist/c3ds-<plataforma>-<versión>.zip
//   node scripts/package.mjs <plataforma> <versión> [outDir]
// Contrato para plataformas con compilación real:
//   si existe <plataforma>/build.sh se ejecuta (variable C3DS_VERSION) y debe dejar
//   sus binarios finales en <plataforma>/dist/ con nombre c3ds-<plataforma>-<versión>*
//   (.exe, .apk, .dmg...); se publican tal cual, sin zip. Si no existe build.sh,
//   se publica un zip con las fuentes.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createZip } from '../web/js/zip.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALWAYS_SKIP = new Set(['.git', 'node_modules', '.DS_Store']);

export function collectFiles(dir, skip = new Set()) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      if (ALWAYS_SKIP.has(name)) continue;
      const full = join(d, name);
      const rel = relative(dir, full).split(sep).join('/');
      if (skip.has(rel)) continue;
      if (statSync(full).isDirectory()) walk(full); else out.push({ path: rel, full });
    }
  };
  walk(dir);
  return out;
}

export function packagePlatform(platform, version, outDir = 'dist', root = ROOT) {
  const platforms = JSON.parse(readFileSync(join(root, 'scripts/platforms.json'), 'utf8'));
  if (!platforms[platform]) throw new Error(`Plataforma desconocida: ${platform}`);
  const pdir = join(root, platform);
  const build = join(pdir, 'build.sh');
  if (existsSync(build)) {
    const r = spawnSync('bash', [build], { cwd: pdir, stdio: 'inherit', env: { ...process.env, C3DS_VERSION: version } });
    if (r.status !== 0) throw new Error(`${platform}/build.sh falló (código ${r.status})`);
  }
  const prefix = `c3ds-${platform}-${version}`;
  mkdirSync(outDir, { recursive: true });
  const built = join(pdir, 'dist');
  if (existsSync(build)) {
    const names = existsSync(built) ? readdirSync(built).filter((n) => statSync(join(built, n)).isFile()) : [];
    if (!names.length) throw new Error(`${platform}/build.sh no dejó archivos en ${platform}/dist/`);
    const bad = names.filter((n) => !n.startsWith(prefix));
    if (bad.length) throw new Error(`Nombres inválidos en ${platform}/dist/ (deben empezar por ${prefix}): ${bad.join(', ')}`);
    for (const n of names) copyFileSync(join(built, n), join(outDir, n));
    return { target: names.map((n) => join(outDir, n)), count: names.length, kind: 'build' };
  }
  const skip = new Set([...(platforms[platform].exclude || []), 'dist', 'build', '.build']);
  const files = collectFiles(pdir, skip);
  if (!files.length) throw new Error(`${platform}: no hay archivos que empaquetar`);
  const zip = createZip(files.map((f) => ({ path: `${prefix}/${f.path}`, content: new Uint8Array(readFileSync(f.full)) })));
  const target = join(outDir, `${prefix}.zip`);
  writeFileSync(target, zip);
  return { target: [target], count: files.length, kind: 'source' };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [platform, version, outDir] = process.argv.slice(2);
  if (!platform || !version) { console.error('uso: package.mjs <plataforma> <versión> [outDir]'); process.exit(2); }
  try {
    const r = packagePlatform(platform, version, outDir);
    console.log(`${r.target.join('\n')}\n(${r.count} archivos, ${r.kind})`);
  } catch (e) { console.error(`::error::${e.message}`); process.exit(1); }
}
