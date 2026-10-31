import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { encodePNG } from '../../web/js/png.js';

const ROOT = new URL('../../web/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

export async function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = normalize(join(ROOT, url === '/' ? 'index.html' : url));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { const d = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/plain' }); res.end(d); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, r));
  return { url: `http://localhost:${server.address().port}`, close: () => server.close() };
}

export async function launch() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  return browser;
}

/** Abre la página y recoge errores de consola / página. */
export async function openPage(browser, url, opts = {}) {
  const { hash = '#editor', ...ctxOpts } = opts;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true, serviceWorkers: 'block', ...ctxOpts });
  const page = await ctx.newPage();
  // La comprobación de versión llama a la API de GitHub: se simula (sin red, sin 404 mientras no haya release).
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('/releases?') ? RELEASES : { tag_name: 'v0.0.1', html_url: 'https://example.com' }) }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url + hash);
  await page.waitForSelector(hash === '#editor' ? '#cv-top' : 'body');
  return { page, ctx, errors };
}

const names = (v) => ['Android.apk', 'iOS-unsigned.ipa', 'Linux-amd64.deb', 'Linux-x86_64.AppImage', 'macOS-arm64.dmg', 'Windows-Portable.exe', 'Windows-Setup.exe'].map((n) => `C3DS-${v}-${n}`).concat('SHA256SUMS.txt');
const mk = (tag, pre, v, body) => ({ tag_name: tag, name: pre ? `Devbuild ${v}` : `C3DS ${tag}`, html_url: `https://github.com/IkerPlays/C3DS/releases/tag/${tag}`, published_at: '2026-10-31T10:07:05Z', prerelease: pre, draft: false, body,
  assets: names(v).map((n) => ({ name: n, size: 2_000_000, browser_download_url: `https://github.com/IkerPlays/C3DS/releases/download/${tag}/${n}` })) });
export const RELEASES = [mk('dev-9', true, '0.1.0-dev.9', ''), mk('v0.1.0', false, '0.1.0', '### Editor\n- **Sprites** y `tex3ds`'), mk('v0.0.9', false, '0.0.9', 'Alfa')];

/** PNG 8x8 válido (para subir como imagen). */
export function tinyPng() {
  const px = new Uint8Array(8 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256));
  return Buffer.from(encodePNG(8, 8, px));
}
