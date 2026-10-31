#!/usr/bin/env node
// Empaqueta una plataforma en dist/c3ds-<plataforma>-<versión>.zip
//   node scripts/package.mjs <plataforma> <versión> [outDir]
// Contrato para plataformas con compilación real:
//   si existe <plataforma>/build.sh se ejecuta (variable C3DS_VERSION) y debe dejar
//   su resultado en <plataforma>/dist/. Si no existe, se empaquetan las fuentes.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
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
  const built = join(pdir, 'dist');
  const useBuilt = existsSync(built);
  const base = useBuilt ? built : pdir;
  const skip = new Set([...(platforms[platform].exclude || []), ...(useBuilt ? [] : ['dist', 'build'])]);
  const files = collectFiles(base, skip).filter((f) => useBuilt || !/^(dist|build)\//.test(f.path));
  if (!files.length) throw new Error(`${platform}: no hay archivos que empaquetar`);
  const prefix = `c3ds-${platform}-${version}`;
  const zip = createZip(files.map((f) => ({ path: `${prefix}/${f.path}`, content: new Uint8Array(readFileSync(f.full)) })));
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, `${prefix}.zip`);
  writeFileSync(target, zip);
  return { target, count: files.length, kind: useBuilt ? 'build' : 'source' };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [platform, version, outDir] = process.argv.slice(2);
  if (!platform || !version) { console.error('uso: package.mjs <plataforma> <versión> [outDir]'); process.exit(2); }
  try {
    const r = packagePlatform(platform, version, outDir);
    console.log(`${r.target} (${r.count} archivos, ${r.kind})`);
  } catch (e) { console.error(`::error::${e.message}`); process.exit(1); }
}
