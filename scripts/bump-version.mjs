#!/usr/bin/env node
// Sube la versión en todos los sitios a la vez y convierte [Unreleased] del changelog en la nueva versión.
//   node scripts/bump-version.mjs 0.5.0 [--note "texto para los changelogs de las plataformas"]
//   node scripts/bump-version.mjs --check        (solo comprueba que todas las versiones coinciden)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PLATFORMS = ['web', 'android', 'ios', 'windows', 'macos', 'linux'];
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const write = (f, s) => writeFileSync(join(ROOT, f), s);

/** Todas las versiones que deben coincidir. */
export function versions() {
  const out = { 'VERSION': read('VERSION').trim() };
  for (const p of PLATFORMS) out[`${p}/VERSION`] = read(`${p}/VERSION`).trim();
  for (const f of ['package.json', 'shared/capacitor/package.json', 'shared/tauri/package.json', 'shared/tauri/src-tauri/tauri.conf.json']) out[f] = JSON.parse(read(f)).version;
  out['shared/tauri/src-tauri/Cargo.toml'] = /^version = "([^"]+)"/m.exec(read('shared/tauri/src-tauri/Cargo.toml'))[1];
  return out;
}

export function bump(version, note, date = new Date().toISOString().slice(0, 10)) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`versión inválida: ${version}`);
  write('VERSION', `${version}\n`);
  for (const p of PLATFORMS) write(`${p}/VERSION`, `${version}\n`);
  for (const f of ['package.json', 'shared/capacitor/package.json', 'shared/tauri/package.json', 'shared/tauri/src-tauri/tauri.conf.json']) write(f, read(f).replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));
  write('shared/tauri/src-tauri/Cargo.toml', read('shared/tauri/src-tauri/Cargo.toml').replace(/^version = "[^"]+"/m, `version = "${version}"`));
  const heading = `## [${version}] - ${date}`;
  const g = read('CHANGELOG.md');
  if (!g.includes('## [Unreleased]')) throw new Error('CHANGELOG.md no tiene sección [Unreleased]');
  if (g.includes(`## [${version}]`)) throw new Error(`CHANGELOG.md ya tiene la versión ${version}`);
  write('CHANGELOG.md', g.replace('## [Unreleased]\n', `## [Unreleased]\n\n${heading}\n`));
  for (const p of PLATFORMS) {
    const f = `${p}/CHANGELOG.md`; if (!existsSync(join(ROOT, f))) continue;
    write(f, read(f).replace('## [Unreleased]\n', `## [Unreleased]\n\n${heading}\n- ${note || 'Mismas mejoras que la web.'}\n`));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const v = versions(); const set = new Set(Object.values(v));
    if (set.size !== 1) { console.error('Versiones distintas:', v); process.exit(1); }
    console.log('✓ todas las versiones son', [...set][0]);
  } else {
    const i = args.indexOf('--note'); const note = i >= 0 ? args[i + 1] : '';
    bump(args[0], note);
    console.log('✓ versión', args[0], '- revisa el changelog y haz commit');
  }
}
