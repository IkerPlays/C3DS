#!/usr/bin/env node
// Interpreta un tag de release, valida VERSION + CHANGELOG y extrae las notas.
//   v1.2.3 / v1.2.3-beta.1      -> release global (todas las plataformas)
//   android-v1.2.3              -> release individual de una plataforma
// Uso: node scripts/release-info.mjs <tag> --notes <archivo>
// Escribe las salidas en $GITHUB_OUTPUT (si existe) y en stdout.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractSection } from './changelog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const loadPlatforms = () => JSON.parse(readFileSync(join(ROOT, 'scripts/platforms.json'), 'utf8'));
/** Plataformas que se publican en releases (la web se despliega aparte en Netlify). */
export const releasable = (platforms) => Object.keys(platforms).filter((k) => platforms[k].release !== false);

export const SEMVER = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?';

export function parseTag(tag, platforms = loadPlatforms()) {
  const m = new RegExp(`^(?:([a-z]+)-)?v(${SEMVER})$`).exec(tag);
  if (!m) throw new Error(`Tag inválido "${tag}". Usa vX.Y.Z (global) o <plataforma>-vX.Y.Z.`);
  const [, platform, version] = m;
  if (platform && !platforms[platform]) throw new Error(`Plataforma desconocida "${platform}". Válidas: ${releasable(platforms).join(', ')}`);
  if (platform && platforms[platform].release === false) throw new Error(`"${platform}" no se publica en releases (se despliega en Netlify).`);
  return { scope: platform ? 'platform' : 'all', platform: platform || null, version, prerelease: version.includes('-') };
}

export function resolve(tag, root = ROOT) {
  const platforms = loadPlatforms();
  const info = parseTag(tag, platforms);
  const dir = info.platform ? join(root, info.platform) : root;
  const declared = readFileSync(join(dir, 'VERSION'), 'utf8').trim();
  if (declared !== info.version) throw new Error(`El tag ${tag} no coincide con ${info.platform ? `${info.platform}/` : ''}VERSION (${declared}).`);
  const notes = extractSection(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8'), info.version);
  if (!notes) throw new Error(`Falta la sección "## [${info.version}]" (con contenido) en ${info.platform ? `${info.platform}/` : ''}CHANGELOG.md.`);
  const names = info.platform ? [info.platform] : releasable(platforms);
  const matrix = { include: names.map((p) => ({ platform: p, runner: platforms[p].runner })) };
  return { ...info, notes, matrix };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const args = process.argv.slice(2);
    const tag = args[0];
    const nIdx = args.indexOf('--notes');
    const r = resolve(tag);
    if (nIdx >= 0) writeFileSync(args[nIdx + 1], `${r.notes}\n`);
    const out = { scope: r.scope, platform: r.platform ?? '', version: r.version, prerelease: String(r.prerelease), matrix: JSON.stringify(r.matrix) };
    const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`).join('\n');
    console.log(lines);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exit(1);
  }
}
