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
  for (const n of ['source/main.c', 'Makefile', 'gfx/sprites.t3s', 'cia/app.rsf', 'romfs/sounds/moneda-5.wav']) assert.ok(names.includes(`mi-primer-juego/${n}`), n);
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
  await page.waitForFunction(() => window.c3ds.editor.getProject().assets.images.length === 5);
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

test('el menú Exportar ofrece Windows, macOS y Linux', async () => {
  const { page, ctx } = await openPage(browser, server.url);
  await page.click('#btn-export');
  assert.equal(await page.locator('#btn-cloud-win').isVisible(), true);
  assert.equal(await page.locator('#btn-cloud-mac').isVisible(), true);
  assert.equal(await page.locator('#btn-cloud-linux').isVisible(), true);
  await ctx.close();
});

const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

test('inicio: hero, demo en vivo, plantillas y descarga recomendada', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url, { hash: '#home', userAgent: WIN_UA });
  assert.match(await page.textContent('h1'), /Nintendo\s*3DS/);
  await page.waitForSelector('#hero-download[href*="Windows-Setup"]');
  assert.match(await page.textContent('#hero-download'), /Windows/);
  await page.waitForTimeout(600);
  const painted = await page.locator('#demo-top').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 77) n++; return n; });
  assert.ok(painted > 500, 'la demo dibuja al jugador');
  assert.equal(await page.locator('#tpl-cards .tpl').count(), 9);
  await page.click('#tpl-cards [data-tpl=pong]');
  await page.waitForSelector('#cv-top');
  assert.equal(await page.inputValue('.proj-name'), 'Pong');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('descargas: tarjetas por sistema, recomendada, checksums y devbuild', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url, { hash: '#downloads', userAgent: WIN_UA });
  await page.waitForSelector('#dl-stable .card.os');
  assert.equal(await page.locator('#dl-stable .card.os').count(), 5);
  assert.equal(await page.locator('#dl-stable .card.os').first().getAttribute('data-os'), 'windows', 'el sistema del usuario va primero');
  assert.match(await page.textContent('#dl-stable .card.mine'), /Recomendado/);
  assert.equal(await page.locator('#dl-stable a[href$="SHA256SUMS.txt"]').count(), 1);
  assert.equal(await page.locator('#dl-stable a.btn[href*="Windows-Setup"]').count(), 1);
  assert.equal(await page.locator('#dl-stable a[href*="/v0.1.0/"]').count() > 5, true);
  assert.match(await page.textContent('#dl-dev'), /Devbuild 0\.1\.0-dev\.9/);
  assert.match(await page.textContent('#dl-old'), /Versiones anteriores[\s\S]*C3DS 0\.0\.9/);
  assert.equal(await page.locator('#dl-old .chip-link').count(), 5);
  await page.click('#dl-notes summary');
  assert.match(await page.textContent('#dl-notes .notes'), /Sprites/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('descargas: si GitHub falla se explica y se enlaza a las releases', async () => {
  const { page, ctx } = await openPage(browser, server.url, { hash: '#downloads' });
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 500, body: '{}' }));
  await page.evaluate(() => sessionStorage.clear());
  await page.reload(); await page.waitForSelector('#dl-stable .finding');
  assert.match(await page.textContent('#dl-stable'), /releases en GitHub/);
  await ctx.close();
});

test('tema: alterna y se recuerda; navegación por pestañas y enlaces', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url, { hash: '#home' });
  await page.click('#theme-btn'); await page.click('#theme-btn');
  assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
  await page.reload(); await page.waitForSelector('#theme-btn');
  assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
  await page.click('#cta-editor');
  await page.waitForSelector('#cv-top');
  assert.equal(await page.locator('#tab-editor').isVisible(), true);
  await page.click('[data-tab=limits]');
  assert.match(await page.textContent('#limits-table'), /VRAM/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('editor: alinear, capas, duplicar escena y atajos', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.locator('.ed-left .panel-sec').nth(1).locator('li .row', { hasText: 'Título' }).click();
  await page.click('button:has-text("Centrar X")');
  const x = await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects[0].x);
  assert.ok(x > 100 && x < 200, `centrado (${x})`);
  await page.click('button:has-text("Frente")');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects.at(-1).name), 'Título');
  await page.click('[title="Duplicar escena"] >> nth=1');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().scenes.length), 3);
  const copy = await page.evaluate(() => { const p = window.c3ds.editor.getProject(); const s = p.scenes[2]; return { name: s.name, ids: s.objects.map((o) => o.id), rule: s.rules[0].when.a }; });
  assert.match(copy.name, /copia/); assert.ok(copy.ids.includes(copy.rule), 'las reglas apuntan a los objetos de la copia');
  await page.click('#btn-help'); assert.match(await page.textContent('.dlg'), /Deshacer/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('plantilla Pong: se puede jugar en la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=pong]');
  await page.click('#btn-play');
  await page.waitForFunction(() => /Partida/.test(document.querySelector('.hud').textContent));
  await page.waitForTimeout(500);
  const found = await page.locator('#cv-top').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 236 && d[i + 2] === 39) n++; return n; });
  assert.ok(found > 50, 'se ve la pelota amarilla');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('vista previa: pausa, paso, reinicio, velocidad, cajas y variables en vivo', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=pong]');
  await page.click('#btn-play');
  await page.waitForSelector('.vars-live input[data-var=puntos]');
  await page.click('#btn-pause');
  const x1 = await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects[1].x);
  const px = async () => page.evaluate(() => document.querySelector('#cv-top').getContext('2d').getImageData(0, 0, 400, 240).data.join('').length);
  await page.waitForTimeout(300);
  assert.match(await page.textContent('#btn-pause'), /Seguir/);
  assert.match(await page.textContent('.hud'), /pausa/);
  await page.click('#btn-step'); await page.click('#btn-step');
  await page.check('#chk-boxes');
  await page.waitForTimeout(150);
  const green = await page.locator('#cv-top').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0 && d[i + 1] === 228 && d[i + 2] === 54) n++; return n; });
  assert.ok(green > 20, 'se dibujan las cajas de colisión');
  await page.fill('.vars-live input[data-var=puntos]', '7'); await page.press('.vars-live input[data-var=puntos]', 'Tab');
  await page.click('#btn-restart');
  await page.waitForTimeout(200);
  assert.equal(await page.inputValue('.vars-live input[data-var=puntos]'), '0');
  assert.ok(x1 >= 0 && (await px()) > 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('copiar y pegar objetos, reglas activables y guía de bienvenida', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  assert.equal(await page.locator('#guide').isVisible(), true);
  await page.click('#btn-guide-close');
  await page.reload(); await page.waitForSelector('#cv-top');
  assert.equal(await page.locator('#guide').isVisible(), false, 'la guía no vuelve a salir');
  await page.locator('.ed-left .panel-sec').nth(1).locator('li .row', { hasText: 'Título' }).click();
  await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects.length), 3);
  await page.click('.tabs.small button:has-text("Lógica")');
  assert.match(await page.textContent('.rule-summary'), /Al tocar Botón jugar/);
  await page.locator('.rule .rule-top input[type=checkbox]').first().uncheck();
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].rules[0].enabled), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('cortar hoja de sprites crea un grupo animable', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-sheet-'));
  const { encodePNG } = await import('../../web/js/png.js');
  const px = new Uint8Array(32 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 13) % 256));
  await writeFile(join(dir, 'heroe.png'), Buffer.from(encodePNG(32, 8, px)));
  await page.click('#btn-slicer');
  await page.setInputFiles('#sl-file', join(dir, 'heroe.png'));
  await page.fill('#sl-cols', '4'); await page.fill('#sl-rows', '1');
  await page.click('.dlg button:has-text("Cortar y añadir")');
  await page.waitForFunction(() => window.c3ds.editor.getProject().assets.images.filter((a) => a.group === 'heroe').length === 4);
  await page.locator('.ed-left .panel-sec').nth(1).locator('[title="Añadir sprite"]').click();
  await page.waitForSelector('.insp select');
  const opts = await page.locator('.insp .field:has(span:text-is("Animación")) option').allTextContents();
  assert.ok(opts.some((o) => /heroe \(4 fotogramas\)/.test(o)), opts.join('|'));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('plantilla Arcade: se carga con música en bucle y variable guardada', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=arcade]');
  const info = await page.evaluate(() => { const p = window.c3ds.editor.getProject(); return { loop: p.assets.sounds.some((s) => s.loop), persist: p.variables.some((v) => v.persist) }; });
  assert.deepEqual(info, { loop: true, persist: true });
  await page.click('#btn-play'); await page.waitForTimeout(400);
  await page.click('#btn-play');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('captura de pantalla y resumen de memoria', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('.badge'); assert.match(await page.textContent('#mem-info'), /Memoria estimada/);
  await page.click('#btn-play');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-shot')]);
  assert.equal(dl.suggestedFilename(), 'mi-primer-juego-captura.png');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('plantilla Corredor y condición “Y además” desde la interfaz', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=runner]');
  await page.click('.tabs.small button:has-text("Lógica")');
  assert.match(await page.textContent('.rules, .insp'), /y además/i);
  await page.click('.rule:nth-of-type(1) button:has-text("+ Y además")');
  assert.equal(await page.locator('.also').count() >= 2, true);
  await page.click('#btn-play'); await page.waitForTimeout(500);
  const ok = await page.evaluate(() => /Corre/.test(document.querySelector('.hud').textContent));
  assert.equal(ok, true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('importar escenas de Godot (.tscn) crea escenas con sprites, textos y botones', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('[data-tab=import]');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-godot2-'));
  await mkdir(join(dir, 'art')); await mkdir(join(dir, 'scenes'));
  await writeFile(join(dir, 'project.godot'), 'window/size/viewport_width=800\nwindow/size/viewport_height=480\nconfig/features=PackedStringArray("4.2")');
  await writeFile(join(dir, 'art', 'hero.png'), tinyPng());
  await writeFile(join(dir, 'scenes', 'main.tscn'), `[gd_scene format=3]
[ext_resource type="Texture2D" path="res://art/hero.png" id="1_a"]
[node name="Main" type="Node2D"]
[node name="Hero" type="Sprite2D" parent="."]
position = Vector2(400, 240)
texture = ExtResource("1_a")
[node name="Score" type="Label" parent="."]
offset_left = 40.0
offset_top = 20.0
text = "Hola Godot"
[node name="Play" type="Button" parent="."]
offset_left = 300.0
offset_top = 300.0
offset_right = 500.0
offset_bottom = 360.0
text = "Jugar"
`);
  await page.setInputFiles('#pick-dir', dir);
  await page.waitForSelector('#btn-godot-scenes');
  await page.click('#btn-godot-scenes');
  await page.waitForFunction(() => window.c3ds.editor.getProject().name === 'Proyecto de Godot');
  const info = await page.evaluate(() => { const p = window.c3ds.editor.getProject(); return { scenes: p.scenes.map((s) => s.name), types: p.scenes[0].objects.map((o) => o.type).sort(), images: p.assets.images.length }; });
  assert.deepEqual(info, { scenes: ['main'], types: ['button', 'sprite', 'text'], images: 1 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('importar escenas de Unity (.unity + .meta) crea sprites en su posición', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('[data-tab=import]');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-unity-'));
  const GUID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  await mkdir(join(dir, 'Assets')); await mkdir(join(dir, 'ProjectSettings'));
  await writeFile(join(dir, 'ProjectSettings', 'ProjectVersion.txt'), 'm_EditorVersion: 2022.3.10f1');
  await writeFile(join(dir, 'Assets', 'hero.png'), tinyPng());
  await writeFile(join(dir, 'Assets', 'hero.png.meta'), `fileFormatVersion: 2\nguid: ${GUID}\nTextureImporter:\n  spritePixelsToUnits: 8\n`);
  await writeFile(join(dir, 'Assets', 'Level1.unity'), `%YAML 1.1
--- !u!1 &100
GameObject:
  m_Name: Hero
--- !u!4 &101
Transform:
  m_GameObject: {fileID: 100}
  m_LocalPosition: {x: 1, y: 2, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_Father: {fileID: 0}
--- !u!212 &102
SpriteRenderer:
  m_GameObject: {fileID: 100}
  m_Sprite: {fileID: 21300000, guid: ${GUID}, type: 3}
`);
  await page.setInputFiles('#pick-dir', dir);
  await page.waitForSelector('#btn-unity-scenes');
  await page.click('#btn-unity-scenes');
  await page.waitForFunction(() => window.c3ds.editor.getProject().name === 'Proyecto de Unity');
  const o = await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects[0]);
  assert.equal(o.type, 'sprite'); assert.equal(o.name, 'Hero');
  assert.ok(o.x > 200 && o.y < 120, `posición (${o.x}, ${o.y})`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('exportar zip para itch.io y miniaturas de plantillas', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#btn-export'); await page.click('#btn-itch'); })()]);
  assert.equal(dl.suggestedFilename(), 'mi-primer-juego-itchio.zip');
  const path = join(await mkdtemp(join(tmpdir(), 'c3ds-itch-')), 'a.zip'); await dl.saveAs(path);
  assert.deepEqual(readZipEntries(new Uint8Array(await readFile(path))).map((e) => e.path), ['index.html']);
  await page.goto(server.url + '#home'); await page.waitForSelector('#tpl-cards .thumb-canvas');
  await page.waitForTimeout(400);
  const painted = await page.locator('#tpl-cards [data-tpl=pong] canvas').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; return d.some((v, i) => i % 4 === 0 && v > 200); });
  assert.ok(painted, 'la miniatura de Pong tiene contenido');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('lecciones en el inicio y en el diálogo de proyectos', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url, { hash: '#home' });
  assert.equal(await page.locator('#lesson-cards .lesson').count(), 7);
  await page.click('#lesson-cards [data-lesson=l3]');
  await page.waitForSelector('#cv-top');
  assert.match(await page.inputValue('.proj-name'), /Lección 3/);
  await page.click('#btn-projects');
  assert.equal(await page.locator('.dlg [data-lesson]').count(), 7);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('compartir con un enlace: el enlace abre una copia del proyecto', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=pong]');
  await page.click('#btn-export'); await page.click('#btn-share');
  const url = await page.inputValue('#share-url');
  assert.match(url, /#p=[A-Za-z0-9_-]+$/);
  const other = await ctx.newPage(); const errs = [];
  other.on('pageerror', (e) => errs.push(e.message));
  await other.goto(url);
  await other.waitForFunction(() => window.c3ds?.editor.getProject().name === 'Pong');
  assert.equal(await other.evaluate(() => location.hash), '#editor', 'la URL se limpia tras abrir el proyecto');
  assert.equal(await other.locator('#tab-editor').isVisible(), true);
  const bad = await ctx.newPage(); await bad.goto(server.url + '#p=AAAA');
  await bad.waitForSelector('.toast.error');
  assert.deepEqual([errors, errs], [[], []]);
  await ctx.close();
});

test('accesibilidad: todos los botones del editor tienen nombre accesible', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('.tabs.small button:has-text("Lógica")');
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('#tab-editor button, #tab-editor [role=menuitem]')].filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).map((b) => b.outerHTML.slice(0, 80)));
  assert.deepEqual(unnamed, []);
  const noAlt = await page.evaluate(() => [...document.querySelectorAll('#tab-editor img:not([alt])')].length);
  assert.equal(noAlt, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('arrastrar una imagen y un proyecto .json al escenario', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const png = [...tinyPng()];
  await page.evaluate((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], 'arrastrada.png', { type: 'image/png' }));
    document.querySelector('.stage-wrap').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, png);
  await page.waitForFunction(() => window.c3ds.editor.getProject().assets.images.some((a) => a.name === 'arrastrada'));
  const json = JSON.stringify({ ...(await page.evaluate(() => window.c3ds.editor.getProject())), name: 'Desde archivo' });
  await page.evaluate((txt) => {
    const dt = new DataTransfer();
    dt.items.add(new File([txt], 'p.c3ds.json', { type: 'application/json' }));
    document.querySelector('.stage-wrap').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, json);
  await page.waitForFunction(() => window.c3ds.editor.getProject().name === 'Desde archivo');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('un mando conectado mueve al jugador en la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-lesson=l1]');
  await page.evaluate(() => {
    window.__padRight = false;
    navigator.getGamepads = () => [{ connected: true, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 15 && window.__padRight })), axes: [0, 0] }];
  });
  await page.click('#btn-play'); await page.waitForTimeout(200);
  const x0 = await page.evaluate(() => window.c3ds.editor.getProject().scenes[0].objects[0].x);
  await page.evaluate(() => { window.__padRight = true; });
  await page.waitForTimeout(400);
  const moved = await page.locator('#cv-top').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let minX = 999; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 77) minX = Math.min(minX, x); } return minX; });
  assert.ok(moved > x0 + 20, `el cuadrado rojo se movió a la derecha (x0=${x0}, ahora ${moved})`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('objeto sólido: casilla en el inspector y el laberinto bloquea al jugador en la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=maze]');
  await page.waitForSelector('#cv-top');
  await page.locator('.ed-left .panel-sec').nth(1).locator('li:has-text("Muro 1")').click();
  const solid = page.locator('.insp label.check:has-text("Sólido") input');
  assert.ok(!/null|undefined/.test(await page.locator('.insp').innerText()), 'el inspector no muestra "null"');
  assert.equal(await solid.isChecked(), true, 'los muros de la plantilla son sólidos');
  await solid.uncheck();
  await page.waitForTimeout(300);
  await solid.check();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('interfaz en inglés: ?lang=en traduce la web y el selector vuelve al español', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url + '/?lang=en', { hash: '#home' });
  assert.equal(await page.locator('#tabs button').first().textContent(), 'Home');
  assert.match(await page.textContent('#tab-home'), /Make games for/);
  await page.click('[data-tab=editor]');
  assert.equal(await page.inputValue('.proj-name'), 'My first game', 'el proyecto inicial sale en inglés');
  assert.equal((await page.textContent('#btn-export')).trim(), 'Export ▾');
  await page.click('#btn-projects');
  assert.ok(await page.locator('.dlg [data-tpl=runner]', { hasText: 'Runner (jumping)' }).count(), 'las plantillas salen en inglés');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('.dlg')?.closest('dialog')?.close?.());
  await page.click('#lang-btn');
  await page.waitForFunction(() => document.querySelector('#tabs button')?.textContent === 'Inicio');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('inspector: “Sigue a” y “Opacidad” en el objeto, y la plantilla Persecución juega sola en la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=chase]');
  await page.waitForSelector('#cv-top');
  await page.locator('.ed-left .panel-sec').nth(1).locator('li', { hasText: 'Enemigo' }).click();
  assert.equal(await page.locator('.insp .field:has(span:text-is("Sigue a")) select').inputValue() !== '', true, 'el enemigo sigue a alguien');
  assert.ok(await page.locator('.insp .field:has(span:text-is("Vel. al seguir"))').count(), 'aparece la velocidad al seguir');
  assert.equal(await page.locator('.insp .field:has(span:text-is("Opacidad")) input').inputValue(), '0.9');
  await page.click('#btn-play');
  await page.waitForTimeout(900);
  const moved = await page.evaluate(() => { const g = window.c3ds.editor.getGame(); const e = g.objs.find((o) => o.name === 'Enemigo'); return e.x < 340; });
  assert.ok(moved, 'el enemigo se mueve hacia el jugador');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('zoom “Ajustar”: el escenario se adapta a la altura de la ventana', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  const sel = page.locator('label.check:has-text("Zoom") select');
  await sel.selectOption('fit');
  const a = (await page.locator('#cv-top').boundingBox()).width;
  await page.setViewportSize({ width: 1400, height: 700 });
  await page.waitForTimeout(300);
  const b = (await page.locator('#cv-top').boundingBox()).width;
  assert.ok(b < a, `con menos altura el escenario es más pequeño (${a} → ${b})`);
  assert.ok(a >= 300 && a <= 1000);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('borrar un objeto limpia lo que lo referenciaba (reglas, “y además” y “sigue a”)', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=chase]');
  await page.waitForSelector('#cv-top');
  await page.locator('.ed-left .panel-sec').nth(1).locator('li', { hasText: 'Jugador' }).click();
  await page.locator('.insp button', { hasText: 'Eliminar' }).click();
  const info = await page.evaluate(() => { const p = window.c3ds.editor.getProject(); const e = p.scenes[0].objects.find((o) => o.name === 'Enemigo'); return { follow: e.follow, rules: p.scenes[0].rules.length }; });
  assert.equal(info.follow, null, 'el enemigo ya no sigue a nadie');
  assert.equal(info.rules, 0, 'las dos reglas de la escena usaban al jugador y se borran');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reglas: duplicar una regla la copia justo debajo', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=runner]');
  await page.waitForSelector('#cv-top');
  await page.click('.ed-right [role=tab]:has-text("Lógica")');
  const before = await page.locator('.rule').count();
  await page.locator('.rule').first().locator('button[title="Duplicar regla"]').click();
  assert.equal(await page.locator('.rule').count(), before + 1);
  const texts = await page.locator('.rule .rule-summary').allTextContents();
  assert.equal(texts[0], texts[1], 'la copia es idéntica y queda justo debajo');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('interfaz en inglés: ninguna pantalla principal conserva textos con acentos españoles', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url + '/?lang=en', { hash: '#home' });
  const leftovers = new Set();
  const scan = async (label) => {
    const found = await page.evaluate(() => {
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) continue; const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) out.push(t); }
      for (const el of document.querySelectorAll('[title],[aria-label],[placeholder]')) for (const a of ['title', 'aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v) out.push(v); }
      return out;
    });
    for (const t of found) if (/[áéíóúñ¿¡]/i.test(t) && !/^Language: English \(click for Español\)$/.test(t)) leftovers.add(`${label}: ${t}`);
  };
  await scan('inicio');
  for (const tab of ['editor', 'import', 'downloads', 'limits']) { await page.click(`[data-tab=${tab}]`); await page.waitForTimeout(300); await scan(tab); }
  await page.click('[data-tab=editor]');
  await page.click('#btn-projects'); await page.waitForTimeout(200); await scan('proyectos');
  await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('.dlg')?.closest('dialog')?.close?.());
  for (const mk of ['runner', 'arcade', 'topos', 'platformer']) {
    await page.evaluate(async (m) => { const t = await import('/js/templates.js'); window.c3ds.editor.setProject(t.TEMPLATES.find((x) => x.id === m).make(), { fresh: true }); }, mk);
    await page.waitForTimeout(250);
    for (const tabName of ['Logic', 'Scene', 'Object']) { await page.locator('.ed-right [role=tab]', { hasText: tabName }).click(); await scan(`${mk}/${tabName}`); }
    const items = page.locator('.ed-left .panel-sec').nth(1).locator('li'); const n = await items.count();
    for (let i = 0; i < Math.min(n, 4); i++) { await items.nth(i).click(); await scan(`${mk}/objeto ${i}`); }
  }
  assert.deepEqual([...leftovers], [], 'quedan textos en español');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('ayuda: referencia de todos los eventos y acciones', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-help');
  await page.click('#btn-reference');
  const text = await page.textContent('#reference');
  for (const s of ['La escena empieza', 'Se suelta un botón', 'Cambiar la opacidad de un objeto', 'Poner variable a un número al azar', 'Cambiar animación de un sprite']) assert.ok(text.includes(s), `falta "${s}"`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('selección múltiple: Mayús + clic, mover, duplicar y borrar varios a la vez', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=runner]');
  await page.waitForSelector('#cv-top');
  const list = page.locator('.ed-left .panel-sec').nth(1);
  const pos = () => page.evaluate(() => { const p = window.c3ds.editor.getProject(); const o = (n) => p.scenes[0].objects.find((x) => x.name === n); return { j: o('Jugador').x, ob: o('Obstáculo').x, n: p.scenes[0].objects.length }; });
  const before = await pos();
  await list.locator('li', { hasText: 'Jugador' }).click();
  await list.locator('li', { hasText: 'Obstáculo' }).click({ modifiers: ['Shift'] });
  assert.match(await page.textContent('.sel-note'), /2 objetos seleccionados/);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  const moved = await pos();
  assert.equal(moved.j, before.j + 2); assert.equal(moved.ob, before.ob + 2, 'los dos se mueven a la vez');
  await page.keyboard.press('Control+d');
  assert.equal((await pos()).n, before.n + 2, 'se duplican los dos');
  await page.keyboard.press('Delete');
  assert.equal((await pos()).n, before.n, 'se borran las dos copias');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('proyecto: autor, descripción e icono (se reduce a 48×48) en la pestaña Escena', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('.ed-right [role=tab]:has-text("Escena")');
  await page.locator('.insp .field:has(span:text-is("Autor")) input').fill('Ana');
  await page.locator('.insp .field:has(span:text-is("Descripción")) input').fill('Un juego');
  await page.setInputFiles('#pick-icon', { name: 'icono.png', mimeType: 'image/png', buffer: tinyPng() });
  await page.waitForSelector('.app-icon[src^="data:image/png"]');
  const info = await page.evaluate(() => { const p = window.c3ds.editor.getProject(); const im = document.querySelector('img.app-icon'); return { a: p.author, d: p.description, icon: p.icon.slice(0, 22), nw: im.naturalWidth, nh: im.naturalHeight }; });
  assert.deepEqual(info, { a: 'Ana', d: 'Un juego', icon: 'data:image/png;base64,', nw: 48, nh: 48 });
  await page.click('#btn-icon-clear');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().icon), undefined);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('mosaico: el suelo de la plantilla Plataformas se dibuja repetido en la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('#btn-projects'); await page.click('.dlg [data-tpl=platformer]');
  await page.waitForSelector('#cv-top');
  await page.locator('.ed-left .panel-sec').nth(1).locator('li', { hasText: 'Suelo' }).click();
  assert.equal(await page.locator('.insp .field:has(span:text-is("Mosaico: columnas")) input').inputValue(), '25');
  // el suelo ocupa el borde inferior del escenario y tiene los colores del ladrillo (verde arriba, marrón abajo)
  const px = await page.evaluate(() => { const c = document.querySelector('#cv-top'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const at = (x, y) => [...d.slice((y * c.width + x) * 4, (y * c.width + x) * 4 + 3)]; return { grass: at(8, 217), brick: at(8, 223), grass2: at(8, 229) }; });
  assert.ok(px.grass[1] > 150 && px.grass[0] < 50, 'hierba arriba: ' + px.grass);
  assert.ok(px.brick[0] > 80 && px.brick[2] < 80, 'ladrillo debajo: ' + px.brick);
  assert.ok(px.grass2[1] > 150 && px.grass2[0] < 50, 'la segunda fila repite la hierba (mosaico): ' + px.grass2);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('referencia de reglas en inglés: también los nombres de los campos', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url + '/?lang=en', { hash: '#home' });
  await page.click('[data-tab=editor]'); await page.click('#btn-help'); await page.click('#btn-reference');
  const text = await page.textContent('#reference');
  assert.ok(text.includes('Object') && text.includes('Compare with'), 'campos en inglés');
  assert.ok(!/Objeto|Variable \(récord\)|Comparar/.test(text), 'sin español: ' + text.slice(0, 120));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('transición entre escenas: se elige en la pestaña Escena', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.click('.ed-right [role=tab]:has-text("Escena")');
  const sel = page.locator('.insp .field:has(span:text-is("Transición entre escenas")) select');
  assert.equal(await sel.inputValue(), 'none');
  await sel.selectOption('fade');
  assert.equal(await page.evaluate(() => window.c3ds.editor.getProject().transition), 'fade');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('las miniaturas de plantillas con fundido no salen en negro', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url, { hash: '#home' });
  await page.waitForSelector('#tpl-cards [data-tpl=topos] canvas');
  const lit = await page.evaluate(() => { const c = document.querySelector('#tpl-cards [data-tpl=topos] canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
  assert.ok(lit > 200, 'la miniatura de Topos se ve (píxeles claros: ' + lit + ')');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('primera visita: el idioma sale del navegador (inglés por defecto salvo en español) y la elección manda', async () => {
  const en = await openPage(browser, server.url, { hash: '#home', locale: 'en-US' });
  assert.equal(await en.page.locator('#tabs button').first().textContent(), 'Home');
  assert.equal(await en.page.textContent('#lang-btn'), 'EN');
  await en.page.click('#lang-btn');                       // elige español a mano
  await en.page.waitForFunction(() => document.querySelector('#tabs button')?.textContent === 'Inicio');
  await en.page.reload();
  assert.equal(await en.page.locator('#tabs button').first().textContent(), 'Inicio', 'la elección se recuerda');
  await en.ctx.close();
  const es = await openPage(browser, server.url, { hash: '#home', locale: 'es-ES' });
  assert.equal(await es.page.locator('#tabs button').first().textContent(), 'Inicio');
  await es.ctx.close();
});

test('atajo Ctrl+Intro: arranca y detiene la vista previa', async () => {
  const { page, ctx, errors } = await openPage(browser, server.url);
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(() => !!window.c3ds.editor.getGame());
  assert.match(await page.textContent('#btn-play'), /Detener/);
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(() => !window.c3ds.editor.getGame());
  assert.match(await page.textContent('#btn-play'), /Probar/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
