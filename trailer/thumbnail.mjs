// Miniatura de YouTube (1280x720) a partir de la tarjeta "thumb".
// Uso: node trailer/thumbnail.mjs <salida.png>
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { startServer } from './lib.mjs';
const out = process.argv[2] || 'thumbnail.png';
const server = await startServer();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await page.goto(server.url + '/trailer/cards.html#thumb');
await page.waitForSelector('body[data-ready]');
await page.waitForTimeout(1500);
await page.screenshot({ path: out + '.big.png' });
await browser.close(); server.close();
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out + '.big.png', '-vf', 'scale=1280:720:flags=lanczos', out]);
execFileSync('rm', ['-f', out + '.big.png']);
console.log('✓', out);
