import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssetName, groupRelease, detectOS, humanSize, fetchReleases, primaryAsset } from '../../web/js/downloads.js';

const asset = (name, size = 1000) => ({ name, size, browser_download_url: `https://x/${name}` });
const rel = (tag, pre, names, body = '') => ({ tag_name: tag, name: tag, html_url: `https://r/${tag}`, published_at: '2026-01-01', prerelease: pre, draft: false, body, assets: names.map((n) => asset(n)) });
const NAMES = ['C3DS-0.1.0-Android.apk', 'C3DS-0.1.0-iOS-unsigned.ipa', 'C3DS-0.1.0-Linux-amd64.deb', 'C3DS-0.1.0-Linux-x86_64.AppImage', 'C3DS-0.1.0-macOS-arm64.dmg', 'C3DS-0.1.0-Windows-Portable.exe', 'C3DS-0.1.0-Windows-Setup.exe', 'SHA256SUMS.txt'];

test('parseAssetName', () => {
  assert.deepEqual(parseAssetName('C3DS-0.1.0-Windows-Setup.exe'), { version: '0.1.0', os: 'windows', detail: 'Setup', ext: 'exe' });
  assert.deepEqual(parseAssetName('C3DS-0.1.0-dev.8-macOS-arm64.dmg'), { version: '0.1.0-dev.8', os: 'macos', detail: 'arm64', ext: 'dmg' });
  assert.equal(parseAssetName('C3DS-0.1.0-Android.apk').os, 'android');
  assert.equal(parseAssetName('SHA256SUMS.txt'), null);
  assert.equal(parseAssetName('C3DS-0.1.0-Plan9.exe'), null);
});

test('groupRelease: agrupa por sistema, ordena y recomienda el instalador', () => {
  const g = groupRelease(rel('v0.1.0', false, NAMES));
  assert.deepEqual(g.oses, ['windows', 'macos', 'linux', 'android', 'ios']);
  assert.equal(g.version, '0.1.0');
  assert.equal(primaryAsset(g, 'windows').kind, 'Instalador');
  assert.equal(g.byOs.windows[1].kind, 'Portable (sin instalar)');
  assert.equal(primaryAsset(g, 'linux').kind, 'AppImage (cualquier distro)');
  assert.equal(g.checksums, 'https://x/SHA256SUMS.txt');
  assert.equal(primaryAsset(g, 'plan9'), null);
});

test('detectOS', () => {
  assert.equal(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'), 'windows');
  assert.equal(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0), 'macos');
  assert.equal(detectOS('Mozilla/5.0 (Macintosh)', 'MacIntel', 5), 'ios', 'iPad en modo escritorio');
  assert.equal(detectOS('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l'), 'android');
  assert.equal(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17)', 'iPhone'), 'ios');
  assert.equal(detectOS('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64'), 'linux');
  assert.equal(detectOS('', ''), null);
});

test('humanSize', () => {
  assert.equal(humanSize(500), '1 KB'); assert.equal(humanSize(3816288), '3.6 MB'); assert.equal(humanSize(80652792), '77 MB');
});

test('fetchReleases: elige la estable y el último devbuild', async () => {
  const data = [rel('dev-9', true, NAMES.map((n) => n.replace('0.1.0', '0.1.0-dev.9'))), rel('v0.1.0', false, NAMES), rel('dev-8', true, NAMES)];
  data.push({ ...rel('v0.0.9', false, NAMES), draft: true });
  const r = await fetchReleases(async () => ({ ok: true, json: async () => data }));
  assert.equal(r.stable.tag, 'v0.1.0'); assert.equal(r.dev.tag, 'dev-9'); assert.equal(r.all.length, 3);
  await assert.rejects(() => fetchReleases(async () => ({ ok: false, status: 403 })), /403/);
  const none = await fetchReleases(async () => ({ ok: true, json: async () => [] }));
  assert.equal(none.stable, null);
});
