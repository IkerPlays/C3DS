import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTag, resolve, loadPlatforms } from '../../scripts/release-info.mjs';
import { platformsForChanges, buildMatrix } from '../../scripts/plan-devbuild.mjs';
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
  assert.equal(g.matrix.include.length, 6);
  assert.ok(g.notes.length > 10);
  assert.throws(() => resolve('v9.9.9'), /no coincide/);
  assert.throws(() => resolve('web-v9.9.9'), /no coincide/);
});

test('cada plataforma tiene carpeta, VERSION, CHANGELOG y release válidos', () => {
  assert.deepEqual(Object.keys(P).sort(), ['android', 'ios', 'linux', 'macos', 'web', 'windows']);
  for (const p of Object.keys(P)) {
    assert.ok(existsSync(join(ROOT, p, 'README.md')), p);
    const r = resolve(`${p}-v${readFileSync(join(ROOT, p, 'VERSION'), 'utf8').trim()}`);
    assert.equal(r.matrix.include[0].platform, p);
  }
});

test('plan devbuild', () => {
  const names = Object.keys(P);
  assert.deepEqual(platformsForChanges(['android/a.txt', 'README.md'], names), ['android']);
  assert.deepEqual(platformsForChanges(['docs/x.md'], names), []);
  assert.equal(platformsForChanges(['scripts/package.mjs'], names).length, 6);
  const m = buildMatrix(['web'], P, { run: '7', sha: 'abcdef123456', root: ROOT });
  assert.equal(m.include[0].version, `${readFileSync(join(ROOT, 'web/VERSION'), 'utf8').trim()}-dev.7.abcdef1`);
});

test('package: zip con prefijo y sin carpetas de build', () => {
  const out = mkdtempSync(join(tmpdir(), 'c3ds-'));
  try {
    const r = packagePlatform('web', '0.0.0-test', out);
    const names = readZipEntries(new Uint8Array(readFileSync(r.target))).map((e) => e.path);
    assert.ok(names.includes('c3ds-web-0.0.0-test/index.html'));
    assert.ok(names.every((n) => n.startsWith('c3ds-web-0.0.0-test/') && !n.includes('node_modules')));
    assert.throws(() => packagePlatform('ps5', '1.0.0', out), /desconocida/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
