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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  // La comprobación de versión llama a la API de GitHub: se simula (sin red, sin 404 mientras no haya release).
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tag_name: 'v0.0.1', html_url: 'https://example.com' }) }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url);
  await page.waitForSelector('#cv-top');
  return { page, ctx, errors };
}

/** PNG 8x8 válido (para subir como imagen). */
export function tinyPng() {
  const px = new Uint8Array(8 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256));
  return Buffer.from(encodePNG(8, 8, px));
}
