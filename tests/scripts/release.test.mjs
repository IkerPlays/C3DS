import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTag, resolve, loadPlatforms } from '../../scripts/release-info.mjs';
import { buildMatrix } from '../../scripts/plan-devbuild.mjs';
import { packagePlatform } from '../../scripts/package.mjs';
import { readZipEntries } from '../../web/js/zip.js';

const ROOT = new URL('../../', import.meta.url).pathname;
const P = loadPlatforms();

test('parseTag', () => {
  assert.deepEqual(parseTag('v1.2.3', P), { scope: 'all', platform: null, version: '1.2.3', prerelease: false });
  assert.deepEqual(parseTag('android-v1.2.3-beta.1', P), { scope: 'platform', platform: 'android', version: '1.2.3-beta.1', prerelease: true });
  for (const bad of ['1.2.3', 'v1.2', 'ps5-v1.0.0', 'v1.2.3;rm', 'dev-web-3']) assert.throws(() => parseTag(bad, P), bad);
});

test('resolve: coincide con VERSION y changelog del repo', () => {
  const g = resolve(`v${readFileSync(join(ROOT, 'VERSION'), 'utf8').trim()}`);
  assert.equal(g.matrix.include.length, 5);
  assert.ok(!g.matrix.include.some((m) => m.platform === 'web'), 'la web no va en las releases');
  assert.ok(g.notes.length > 10);
  assert.throws(() => resolve('v9.9.9'), /no coincide/);
  assert.throws(() => resolve('web-v0.1.0'), /no se publica en releases/);
});

test('cada plataforma tiene carpeta, VERSION, CHANGELOG y release válidos', () => {
  assert.deepEqual(Object.keys(P).sort(), ['android', 'ios', 'linux', 'macos', 'web', 'windows']);
  for (const p of Object.keys(P)) {
    assert.ok(existsSync(join(ROOT, p, 'README.md')), p);
    if (P[p].release === false) continue;
    const r = resolve(`${p}-v${readFileSync(join(ROOT, p, 'VERSION'), 'utf8').trim()}`);
    assert.equal(r.matrix.include[0].platform, p);
  }
});

test('plan devbuild: todas las plataformas en una sola versión', () => {
  const { version, matrix } = buildMatrix(P, { run: '7', root: ROOT });
  assert.equal(version, `${readFileSync(join(ROOT, 'VERSION'), 'utf8').trim()}-dev.7`);
  assert.deepEqual(matrix.include.map((m) => m.platform).sort(), ['android', 'ios', 'linux', 'macos', 'windows']);
});

test('package: zip con prefijo y sin carpetas de build', () => {
  const out = mkdtempSync(join(tmpdir(), 'c3ds-'));
  try {
    const r = packagePlatform('web', '0.0.0-test', out);
    const names = readZipEntries(new Uint8Array(readFileSync(r.target[0]))).map((e) => e.path);
    assert.ok(names.includes('C3DS-0.0.0-test-Web/index.html'));
    assert.ok(names.every((n) => n.startsWith('C3DS-0.0.0-test-Web/') && !n.includes('node_modules')));
    assert.throws(() => packagePlatform('ps5', '1.0.0', out), /desconocida/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('package: plataforma con build.sh publica binarios tal cual y valida nombres', () => {
  const root = mkdtempSync(join(tmpdir(), 'c3ds-root-'));
  const out = join(root, 'out');
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'scripts/platforms.json'), JSON.stringify({ fake: { label: 'Fake', runner: 'x', exclude: [] } }));
    mkdirSync(join(root, 'fake'));
    writeFileSync(join(root, 'fake/build.sh'), 'mkdir -p dist && echo hi > "dist/$C3DS_ASSET_PREFIX.apk"\n');
    const r = packagePlatform('fake', '1.0.0', out, root);
    assert.equal(r.kind, 'build');
    assert.deepEqual(readdirSync(out), ['C3DS-1.0.0-Fake.apk']);
    writeFileSync(join(root, 'fake/build.sh'), 'rm -rf dist; mkdir -p dist && echo hi > dist/otro.apk\n');
    assert.throws(() => packagePlatform('fake', '1.0.0', out, root), /Nombres inválidos/);
    writeFileSync(join(root, 'fake/build.sh'), 'exit 3\n');
    assert.throws(() => packagePlatform('fake', '1.0.0', out, root), /falló/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
