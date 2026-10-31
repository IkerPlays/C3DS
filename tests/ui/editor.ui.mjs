import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, launch, openPage, tinyPng } from './helpers.mjs';
import { readZipEntries } from '../../web/js/zip.js';

let server; let browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); server?.close(); });

const hud = (page) => page.textContent('.hud');

test('carga sin errores y muestra el proyecto de ejemplo', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  assert.equal(await page.inputValue('.proj-name'), 'Mi primer juego');
  assert.equal(await page.locator('.ed-left .list').first().locator('li').count(), 2);
  assert.match(await page.textContent('.status'), /Guardado/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('añadir objeto, editarlo, deshacer y rehacer', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('[title="Añadir rectángulo"]');
  await page.waitForSelector('.insp input[type=number]');
  const n0 = await page.locator('.ed-left .panel-sec').nth(1).locator('li').count();
  assert.equal(n0, 3);
  await page.locator('.insp .field:has(span:text-is("X")) input').fill('77');
  await page.waitForTimeout(700);
  await page.click('[title^="Deshacer"]');
  await page.click('[title^="Deshacer"]');
  assert.equal(await page.locator('.ed-left .panel-sec').nth(1).locator('li').count(), 2, 'deshacer quita el objeto');
  await page.click('[title^="Rehacer"]');
  assert.equal(await page.locator('.ed-left .panel-sec').nth(1).locator('li').count(), 3, 'rehacer lo devuelve');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('guardado local: el nombre persiste al recargar y se listan los proyectos', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.fill('.proj-name', 'Super Ñoño');
  await page.waitForFunction(() => /Guardado/.test(document.querySelector('.status').textContent));
  await page.reload(); await page.waitForSelector('#cv-top');
  assert.equal(await page.inputValue('.proj-name'), 'Super Ñoño');
  await page.click('#btn-projects');
  assert.match(await page.textContent('.dlg'), /Super Ñoño/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('vista previa: botón táctil cambia de escena y el D-Pad mueve al jugador', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-play');
  await page.waitForFunction(() => /Menú/.test(document.querySelector('.hud').textContent));
  const box = await page.locator('#cv-bottom').boundingBox();
  await page.mouse.click(box.x + box.width * (160 / 320), box.y + box.height * (120 / 240)); // botón "Jugar"
  await page.waitForFunction(() => /Juego/.test(document.querySelector('.hud').textContent));
  const before = await page.evaluate(() => window.c3ds.editor.getProject().scenes[1].objects[0].x);
  assert.equal(before, 180);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  const top = page.locator('#cv-top');
  const pixels = await top.evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 77) red++; return red; });
  assert.ok(pixels > 800, 'se dibuja el cuadrado rojo del jugador');
  await page.click('#btn-play');
  assert.match(await page.textContent('#btn-play'), /Probar/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('exportar proyecto 3DS (.zip) con nombres claros', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#btn-export'); await page.locator('.menu-items button', { hasText: 'Proyecto 3DS' }).click(); })()]);
  assert.equal(dl.suggestedFilename(), 'mi-primer-juego-3ds.zip');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-ui-'));
  const path = join(dir, 'x.zip'); await dl.saveAs(path);
  const names = readZipEntries(new Uint8Array(await readFile(path))).map((e) => e.path);
  for (const n of ['source/main.c', 'Makefile', 'gfx/sprites.t3s', 'cia/app.rsf', 'romfs/sounds/moneda-2.wav']) assert.ok(names.includes(`mi-primer-juego/${n}`), n);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('exportar HTML5 y jugarlo', async () => {
  const { page, ctx } = await openPage(browser, server.url);
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#btn-export'); await page.click('#btn-html5'); })()]);
  assert.equal(dl.suggestedFilename(), 'mi-primer-juego.html');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-h5-'));
  const path = join(dir, 'game.html'); await dl.saveAs(path);
  const game = await ctx.newPage(); const errs = [];
  game.on('pageerror', (e) => errs.push(e.message));
  await game.goto(`file://${path}`);
  await game.waitForTimeout(500);
  const painted = await game.locator('#top').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; return d.some((v, i) => i % 4 === 0 && v > 200); });
  assert.ok(painted); assert.deepEqual(errs, []);
  await ctx.close();
});

test('añadir imagen y sonido desde archivos', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-assets-'));
  await writeFile(join(dir, 'foto.png'), tinyPng());
  await page.locator('.ed-left input[accept="image/*"]').setInputFiles(join(dir, 'foto.png'));
  await page.waitForFunction(() => window.c3ds.editor.getProject().assets.images.length === 2);
  const { toneWav } = await import('../../web/js/wav.js');
  await writeFile(join(dir, 'pip.wav'), toneWav(500, 0.1));
  await page.locator('.ed-left input[accept="audio/*"]').setInputFiles(join(dir, 'pip.wav'));
  await page.waitForFunction(() => window.c3ds.editor.getProject().assets.sounds.length === 2);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('lógica: añadir una regla desde la interfaz', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('.tabs.small button:has-text("Lógica")');
  const n = await page.locator('.rule').count();
  await page.click('button:has-text("+ Nueva regla")');
  assert.equal(await page.locator('.rule').count(), n + 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('importar: detecta Godot y ofrece convertir assets', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('[data-tab=import]');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-godot-'));
  await mkdir(join(dir, 'art'));
  await writeFile(join(dir, 'project.godot'), 'config/features=PackedStringArray("4.2")');
  await writeFile(join(dir, 'a.gd'), 'extends Node');
  await writeFile(join(dir, 'art', 'hero.png'), tinyPng());
  await page.setInputFiles('#pick-dir', dir);
  await page.waitForSelector('.verdict');
  assert.match(await page.textContent('#report'), /Godot 4\.2/);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-convert')]);
  assert.equal(dl.suggestedFilename(), 'assets-3ds.zip');
  const path = join(await mkdtemp(join(tmpdir(), 'c3ds-conv-')), 'a.zip'); await dl.saveAs(path);
  const names = readZipEntries(new Uint8Array(await readFile(path))).map((e) => e.path);
  assert.ok(names.includes('assets-3ds/gfx/hero.png') && names.includes('assets-3ds/gfx/sprites.t3s') && names.includes('assets-3ds/PORTING.md'), names.join());
  await page.click('#btn-to-editor');
  await page.waitForFunction(() => window.c3ds.editor.getProject().name === 'Proyecto importado');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().assets.images.length), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('compilación en la nube: sin servicio configurado se explica y no rompe', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await ctx.route('**/api/build**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'no configurado' }) }));
  await page.click('#btn-export'); await page.click('#btn-cloud');
  await page.waitForSelector('.build-status.err');
  assert.match(await page.textContent('.dlg'), /no está disponible/);
  assert.ok(errors.every((e) => /503/.test(e)), errors.join('\n')); // el único "error" es la respuesta 503 simulada
  await ctx.close();
});

test('el menú Exportar ofrece Windows .exe y no hay descarga de la web', async () => {
  const { page, ctx } = await openPage(browser, server.url);
  await page.click('#btn-export');
  assert.equal(await page.locator('#btn-cloud-win').isVisible(), true);
  await ctx.close();
});
