// Graba las escenas del tráiler de C3DS con la app real.
// Uso:  node trailer/make.mjs <carpeta-salida> [escena ...]
// Genera <salida>/<escena>.webm y <salida>/clips.json (desfase y duración de cada clip) para assemble.sh.
import { mkdir, rename, readdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, launch, openScene, actor, W, H } from './lib.mjs';

const EN = process.env.TRAILER_LANG === 'en';
const L = (es, en) => (EN ? en : es);
const q = EN ? '?lang=en' : '';
const OUT = process.argv[2];
const ONLY = process.argv.slice(3);
if (!OUT) { console.error('uso: node trailer/make.mjs <salida> [escena ...]'); process.exit(1); }

/** Escenas en orden. `dur` = segundos exactos que durará en el vídeo final (bloques de compases de 2 s). */
const SCENES = [
  { name: '01-intro', dur: 4, path: `/trailer/cards.html${q}#intro`, dress: false, ready: 'body[data-ready]', async run({ a }) { await a.wait(4500); } },

  { name: '02-hook', dur: 6, speed: 1.3, scheme: 'light', path: '/#home', ready: '#demo-top', async run({ a, page }) {
    await a.wait(200);
    await a.cap(L('Sin instalar nada', 'No install needed'), L('Diseña juegos de 3DS desde el navegador', 'Design 3DS games right in your browser'));
    await a.glide(1380, 520, 700);
    await a.wait(1500);
    await a.capOff();
    await a.click('#theme-btn', { ms: 700 });      // auto -> claro
    await a.wait(250);
    await a.click('#theme-btn', { ms: 200 });      // -> oscuro
    await a.cap(L('Tema claro y oscuro', 'Light and dark theme'), L('Se adapta a tu pantalla', 'Adapts to your screen'));
    await a.wait(900);
    await a.capOff();
    await a.smoothScroll(900, 1100);
    await a.cap(L('Todo incluido', 'Everything included'), L('Editor visual · Simulador · Plantillas', 'Visual editor · Simulator · Templates'));
    await a.wait(1000);
  } },

  { name: '03-plantillas', dur: 6, path: '/#editor', ready: '#cv-top', async run({ a, page }) {
    await a.cap(L('Empieza rápido', 'Start fast'), L('Elige una plantilla y ya tienes un juego', 'Pick a template and you already have a game'));
    await a.click('#btn-projects', { ms: 800 });
    await a.wait(700);
    for (const id of ['coins', 'pong', 'arcade']) { await a.hover(`.dlg [data-tpl=${id}]`, 420); await a.wait(120); }
    await a.hover('.dlg [data-tpl=runner]', 500);
    await a.ring('.dlg [data-tpl=runner]', { soft: true });
    await a.wait(500);
    await a.click('.dlg [data-tpl=runner]', { ms: 150 });
    await a.ringOff();
    await a.wait(900);
  } },

  { name: '04-editor', dur: 10, speed: 1.55, path: '/#editor', ready: '#cv-top', setup: 'runner', async run({ a, page }) {
    await page.locator('label.check:has-text("Zoom") select').selectOption('1');
    await a.cap(L('Editor visual', 'Visual editor'), L('Arrastra, suelta y ajusta cada objeto', 'Drag, drop and tweak every object'));
    await a.wait(600);
    const item = (name) => page.locator('.ed-left .panel-sec').nth(1).locator('li', { hasText: name }).first();
    const itemBox = async (name) => (await item(name).boundingBox());
    // seleccionar al jugador desde la lista
    let b = await itemBox('Jugador'); await a.clickAt(b.x + 70, b.y + b.height / 2, 800);
    await a.wait(500);
    // arrastrarlo por el escenario
    const cv = await page.locator('#cv-top').boundingBox(); const sc = cv.width / 400;
    const at = (x, y) => ({ x: cv.x + x * sc, y: cv.y + y * sc });
    await a.drag(at(62, 166), at(150, 110), 900);
    await a.wait(300);
    await a.drag(at(150, 110), at(70, 150), 800);
    await a.wait(300);
    // propiedades en el inspector: gravedad
    await a.ring('.insp .field:has(span:text-is("Gravedad"))', { soft: true });
    await a.wait(700);
    await a.ringOff();
    await a.cap(L('Física incluida', 'Physics built in'), L('Gravedad, velocidad y objetos sólidos', 'Gravity, speed and solid objects'));
    b = await itemBox('Suelo'); await a.clickAt(b.x + 70, b.y + b.height / 2, 700);
    await a.wait(500);
    await a.ring('.insp label.check:has-text("Sólido")', { soft: true });
    await a.wait(900);
    await a.click('.insp label.check:has-text("Sólido") input', { ms: 500 });
    await a.wait(700);
    await a.ringOff();
    b = await itemBox('Obstáculo'); await a.clickAt(b.x + 70, b.y + b.height / 2, 600);
    await a.wait(500);
    await a.type('.insp .field:has(span:text-is("Vel X")) input', '-6', { delay: 120, ms: 500 });
    await page.keyboard.press('Tab');
    await a.wait(900);
  } },

  { name: '05-logica', dur: 10, speed: 1.85, path: '/#editor', ready: '#cv-top', setup: 'runner', async run({ a, page }) {
    await page.locator('label.check:has-text("Zoom") select').selectOption('1');
    await a.cap(L('Lógica visual', 'Visual logic'), L('“Cuando pase esto → haz esto”', '“When this happens → do that”'));
    await a.click('.ed-right [role=tab]:has-text("Lógica")', { ms: 800 });
    await a.wait(700);
    await a.ring('.rule', { i: 1, soft: true });
    await a.wait(1400);
    await a.ringOff();
    await a.hover('.rule', 500, 2);
    await a.wait(700);
    await a.cap(L('Pruébalo al instante', 'Try it instantly'), L('Simulador con depuración integrada', 'Simulator with built-in debugging'));
    await a.click('#btn-play', { ms: 700 });
    await a.wait(900);
    // Un "jugador" automático salta los obstáculos (A = tecla Z), para que se vea una partida de verdad.
    await page.evaluate(() => {
      const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: 'z', bubbles: true }));
      window.__bot = setInterval(() => {
        const g = window.c3ds.editor.getGame?.(); if (!g) return;
        const p = g.objs.find((o) => o.name === 'Jugador'); const o = g.objs.find((o) => o.name === 'Obstáculo'); const f = g.objs.find((o) => o.name === 'Suelo');
        if (p && o && f && o.x > p.x && o.x - (p.x + p.w) < 60 && p.y + p.h >= f.y - 1) { key('keydown'); setTimeout(() => key('keyup'), 60); }
      }, 16);
    });
    await a.wait(4200);
    await a.click('#btn-pause', { ms: 600 });
    await a.wait(400);
    for (let i = 0; i < 3; i++) { await a.click('#btn-step', { ms: i ? 150 : 450, hold: 60 }); await a.wait(160); }
    await a.click('#btn-pause', { ms: 500 });
    await a.wait(1500);
  } },

  { name: '06-montaje', dur: 8, path: `/trailer/montage.html${q}`, dress: false, ready: 'body[data-ready]', async run({ a, page }) {
    await page.evaluate(() => window.__go(1000));
    await a.wait(8400);
  } },

  { name: '07-recursos', dur: 8, speed: 1.35, path: '/#editor', ready: '#cv-top', setup: 'arcade', async run({ a, page }) {
    await page.locator('label.check:has-text("Zoom") select').selectOption('1');
    await a.cap(L('Sprites y animación', 'Sprites and animation'), L('Importa imágenes, córtalas y anímalas', 'Import images, slice them and animate them'));
    await a.ring('.ed-left .panel-sec:has(h4:text-is("Imágenes"))', { soft: true });
    await a.wait(1600);
    await a.ringOff();
    await a.click('#btn-slicer', { ms: 900 });
    await a.wait(1500);
    await page.keyboard.press('Escape'); await a.wait(300);
    const close = page.locator('.dlg button:has-text("Cerrar")'); if (await close.count()) await a.click('.dlg button:has-text("Cerrar")', { ms: 400 });
    await a.cap(L('Sonido y variables', 'Sound and variables'), L('Efectos, música en bucle y récords guardados', 'Effects, looping music and saved high scores'));
    await a.ring('.ed-left .panel-sec:has(h4:text-is("Sonidos"))', { soft: true });
    await a.wait(1500);
    await a.ring('.ed-left .panel-sec:has(h4:text-is("Variables"))', { soft: true });
    await a.wait(1500);
    await a.ringOff();
    await a.click('.ed-right [role=tab]:has-text("Escena")', { ms: 700 });
    await a.cap(L('Escenas', 'Scenes'), L('Menús, niveles y pantalla final', 'Menus, levels and a game-over screen'));
    await a.wait(900);
  } },

  { name: '08-exportar', dur: 8, path: '/#editor', ready: '#cv-top', setup: 'runner', async run({ a, page }) {
    await page.locator('label.check:has-text("Zoom") select').selectOption('1');
    await a.cap(L('Un clic', 'One click'), L('.3dsx y .cia para tu 3DS · HTML5 · Windows · macOS · Linux', '.3dsx and .cia for your 3DS · HTML5 · Windows · macOS · Linux'));
    await a.click('#btn-export', { ms: 800 });
    await a.wait(500);
    for (const id of ['btn-cloud', 'btn-html5', 'btn-cloud-win', 'btn-cloud-mac', 'btn-cloud-linux', 'btn-share']) { await a.hover('#' + id, 520); await a.wait(260); }
    await a.wait(300);
  } },

  { name: '09-descargas', dur: 5, path: '/#downloads', ready: '#tab-downloads', async run({ a, page }) {
    await a.wait(500);
    await a.cap(L('Descárgalo', 'Download it'), L('Apps para Windows, macOS, Linux, Android e iOS', 'Apps for Windows, macOS, Linux, Android and iOS'));
    await a.smoothScroll(330, 1500);
    await a.wait(2500);
  } },

  { name: '10-importar', dur: 5, speed: 1.15, path: '/#import', ready: '#tab-import', async run({ a, page }) {
    await a.cap(L('Importa tus proyectos', 'Import your projects'), L('Godot y Unity: escenas, sprites y assets', 'Godot and Unity: scenes, sprites and assets'));
    await a.wait(700);
    await a.hover('#drop label.btn', 600);
    await page.setInputFiles('#pick-dir', await godotFixture());
    await page.waitForSelector('#btn-godot-scenes');
    await a.wait(1200);
    await a.hover('#btn-godot-scenes', 700);
    await a.ring('#btn-godot-scenes', { soft: true });
    await a.wait(500);
    await a.click('#btn-godot-scenes', { ms: 200 });
    await a.ringOff();
    await a.wait(1200);
  } },

  { name: '11-plataformas', dur: 8, path: `/trailer/cards.html${q}#platforms`, dress: false, ready: 'body[data-ready]', async run({ a }) { await a.wait(8400); } },
  { name: '12-final', dur: 6, path: `/trailer/cards.html${q}#outro`, dress: false, ready: 'body[data-ready]', async run({ a }) { await a.wait(6400); } },
];

/** Estado inicial de las escenas del editor (para empezar con la plantilla cargada). */
async function setup(page, name) {
  if (!name) return;
  await page.evaluate(async (n) => {
    const m = await import('/js/templates.js');
    const make = { runner: m.runnerProject, arcade: m.arcadeProject }[n];
    window.c3ds.editor.setProject(make(), { fresh: true });
  }, name);
  await page.waitForTimeout(500);
}

/** Un proyecto de Godot de mentira (con una escena, un sprite, un texto y un botón) para la escena de importación. */
async function godotFixture() {
  const { encodePNG } = await import('../web/js/png.js');
  const { mkdtemp, writeFile, mkdir } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'c3ds-godot-trailer-'));
  await mkdir(join(dir, 'art')); await mkdir(join(dir, 'scenes')); await mkdir(join(dir, 'scripts'));
  const px = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4; const dx = x - 15.5; const dy = y - 15.5; const r = Math.hypot(dx, dy);
    const inside = r < 14; const eye = (Math.abs(dx + 5) < 2.2 || Math.abs(dx - 5) < 2.2) && Math.abs(dy + 4) < 3; const mouth = dy > 4 && dy < 8 && Math.abs(dx) < 8 - (dy - 4);
    const c = !inside ? [0, 0, 0, 0] : eye || mouth ? [40, 30, 60, 255] : [255, 204, 0, 255];
    px.set(c, i);
  }
  await writeFile(join(dir, 'art', 'hero.png'), Buffer.from(encodePNG(32, 32, px)));
  await writeFile(join(dir, 'project.godot'), 'config/name="Mi aventura"\nwindow/size/viewport_width=800\nwindow/size/viewport_height=480\nconfig/features=PackedStringArray("4.2")');
  await writeFile(join(dir, 'scripts', 'player.gd'), 'extends Node2D');
  await writeFile(join(dir, 'scenes', 'main.tscn'), `[gd_scene format=3]
[ext_resource type="Texture2D" path="res://art/hero.png" id="1_a"]
[node name="Main" type="Node2D"]
[node name="Hero" type="Sprite2D" parent="."]
position = Vector2(400, 240)
scale = Vector2(4, 4)
texture = ExtResource("1_a")
[node name="Titulo" type="Label" parent="."]
offset_left = 300.0
offset_top = 40.0
text = "Mi aventura"
[node name="Jugar" type="Button" parent="."]
offset_left = 300.0
offset_top = 380.0
offset_right = 500.0
offset_bottom = 440.0
text = "Jugar"
`);
  return dir;
}

const server = await startServer();
const browser = await launch();
await mkdir(OUT, { recursive: true });
let meta = {};
try { meta = JSON.parse(await readFile(join(OUT, 'clips.json'), 'utf8')); } catch { /* primera vez */ }

for (const sc of SCENES) {
  if (ONLY.length && !ONLY.some((o) => sc.name.includes(o))) continue;
  const dir = join(OUT, '_raw', sc.name);
  await mkdir(dir, { recursive: true });
  for (const f of await readdir(dir)) await rename(join(dir, f), join(dir, f + '.old')).catch(() => {});
  const { ctx, page, offset } = await openScene(browser, server, { dir, path: sc.path, ready: sc.ready, dress: sc.dress !== false, scheme: sc.scheme || 'dark' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  const a = actor(page, sc.speed || 1);
  await setup(page, sc.setup);
  try { await sc.run({ a, page }); } catch (e) { console.error(`✗ ${sc.name}:`, e.message.split('\n')[0]); }
  const spent = (Date.now() - t0) / 1000;
  if (spent < sc.dur + 0.3) await page.waitForTimeout((sc.dur + 0.3 - spent) * 1000);
  await ctx.close();
  const vids = (await readdir(dir)).filter((f) => f.endsWith('.webm'));
  await rename(join(dir, vids[0]), join(OUT, `${sc.name}.webm`));
  meta[sc.name] = { offset: +(offset + 0.05).toFixed(2), dur: sc.dur, push: sc.dress !== false, spent: +spent.toFixed(2), errors };
  console.log(`✓ ${sc.name}  gastado ${spent.toFixed(1)} s / objetivo ${sc.dur} s${spent > sc.dur ? '  ⚠ se pasa' : ''}${errors.length ? '  errores: ' + errors.join('; ') : ''}`);
}
await writeFile(join(OUT, 'clips.json'), JSON.stringify(meta, null, 2));
await browser.close(); server.close();
