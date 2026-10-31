import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, makeObject } from '../../web/js/model.js';
import { generateMainC, generateMakefile, generateWorkflow, exportFiles, cString, textTemplate, makeSafe } from '../../web/js/codegen.js';
import { generateRsf, uniqueId, ciaAssets, MAKEROM_SHA256 } from '../../web/js/cia.js';

test('cString: UTF-8 y escapes seguros', () => {
  assert.equal(cString('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(cString('ñ'), '"\\303\\261"');
  assert.equal(cString('línea\n'), '"l\\303\\255nea\\012"');
  assert.equal(cString('100%', true), '"100%%"');
  assert.equal(cString('"; system("x"); //'), '"\\"; system(\\"x\\"); //"');
  assert.ok(!cString('??/').includes('??/'), 'sin trigrafos');
});

test('textTemplate', () => {
  const vi = new Map([['puntos', 0], ['vidas', 1]]);
  assert.deepEqual(textTemplate('P: {puntos}/{vidas} 100%', vi), { fmt: 'P: %d/%d 100%%', args: ['vars[0]', 'vars[1]'] });
  assert.deepEqual(textTemplate('{nada}', vi), { fmt: '{nada}', args: [] });
});

test('main.c del proyecto de ejemplo', () => {
  const c = generateMainC(newProject());
  assert.match(c, /#define NUM_OBJS 6/);
  assert.match(c, /#define NUM_SOUNDS 1/);
  assert.match(c, /sheet = C2D_SpriteSheetLoad\("romfs:\/gfx\/sprites.t3x"\)/);
  assert.match(c, /snprintf\(out, n, "Puntos: %d", vars\[0\]\)/);
  assert.match(c, /touch_in\(1, touched, tx, ty\)/);
  assert.match(c, /hit\(2, 3\)/);
  assert.match(c, /next_scene = 1;/);
  assert.match(c, /play_sound\(0\);/);
  assert.match(c, /random_pos\(3\);/);
  assert.match(c, /\(down & KEY_START\)/);
  assert.ok(!/C2D_Color32\(\d+, \d+, \d+, 255\) \}/.test(c.split('static Obj objs')[0]), 'sin llamadas en inicializadores estáticos');
  assert.match(c, /0xFF4D00FF/); // rojo #ff004d -> AABBGGRR
});

test('sin imágenes ni sonidos no hay romfs ni ndsp', () => {
  const p = newProject();
  p.assets = { images: [], sounds: [] }; p.blobs = {};
  p.scenes[0].rules.length = 0; p.scenes[1].rules.length = 0;
  p.scenes[1].objects = p.scenes[1].objects.filter((o) => o.type !== 'sprite');
  const c = generateMainC(p);
  assert.ok(!c.includes('C2D_SpriteSheetLoad'));
  assert.match(c, /#define NUM_SOUNDS 0/);
  const mk = generateMakefile(p);
  assert.ok(!mk.includes('--romfs') && !mk.includes('tex3ds'));
  const names = exportFiles(p).map((f) => f.path);
  assert.ok(!names.some((n) => n.includes('/gfx/') || n.includes('/romfs/')));
  assert.ok(!generateRsf(p, { romfs: false }).includes('RootPath'));
});

test('Makefile: tabulaciones, tex3ds y objetivo por defecto', () => {
  const mk = generateMakefile(newProject());
  assert.match(mk, /TARGET\s+:= mi-primer-juego/);
  assert.match(mk, /-lcitro2d -lcitro3d -lctru -lm/);
  assert.ok(!mk.includes('-lndsp'), 'ndsp está dentro de libctru');
  assert.ok(mk.indexOf('\nall: $(BUILD)') > 0 && mk.indexOf('\nall: $(BUILD)') < mk.indexOf('\n$(SPRITES):'), 'all va antes que la regla de sprites (objetivo por defecto)');
  assert.match(mk, /\n\t@tex3ds -i \$< -o \$@/);
  assert.match(mk, /export _3DSXFLAGS \+= --romfs=/);
  assert.match(mk, /\ncia: \$\(BUILD\)\n\t@bannertool makebanner/);
  const inner = mk.split('\nelse\n')[1];
  assert.match(inner.split('\n').find((l) => /^\$\(OUTPUT\)\.\w+\s*:/.test(l)), /^\$\(OUTPUT\)\.3dsx\s*:/);
  assert.equal([...mk.matchAll(/^ +@/gm)].length, 0, 'las recetas usan tabulador, no espacios');
});

test('archivos exportados', () => {
  const files = exportFiles(newProject());
  const names = files.map((f) => f.path);
  for (const n of ['source/main.c', 'Makefile', 'gfx/sprites.t3s', 'cia/app.rsf', 'cia/banner.png', 'romfs/sounds/moneda-2.wav', 'mi-primer-juego.c3ds.json']) assert.ok(names.includes(`mi-primer-juego/${n}`), n);
  assert.ok(files.every((f) => f.path.startsWith('mi-primer-juego/') && !f.path.includes('..')));
  assert.match(files.find((f) => f.path.endsWith('sprites.t3s')).content, /^--atlas -f rgba -z auto\nmoneda-1\.png\n$/);
  assert.match(files.find((f) => f.path.endsWith('build.yml')).content, /mi-primer-juego\.cia/);
  assert.match(generateWorkflow(newProject()), new RegExp(MAKEROM_SHA256));
});

test('rsf del .cia', () => {
  const p = newProject();
  const rsf = generateRsf(p, { romfs: true });
  assert.match(rsf, /ProductCode\s+: CTR-P-[A-Z0-9]{4}\n/);
  assert.match(rsf, /UniqueId\s+: 0xf[0-9a-f]{4}\n/);
  assert.match(rsf, /RootPath\s+: romfs/);
  assert.match(rsf, /- dsp::DSP/);
  const id = uniqueId('Zzz'); assert.ok(id >= 0xf0000 && id <= 0xfefff);
  assert.deepEqual(ciaAssets(p).map((f) => f.path), ['cia/app.rsf', 'cia/banner.png', 'cia/icon.png', 'cia/audio.wav']);
});

test('nombres con caracteres raros no rompen el código', () => {
  const p = newProject();
  p.name = 'Ñu "Rápido" %d\\'; p.author = 'Yo\nTú';
  p.scenes[0].objects.push(makeObject(p, 'text', { text: '"); system("rm -rf /"); //%s {puntos}' }));
  const c = generateMainC(p);
  assert.ok(!/system\("rm/.test(c));
  assert.match(generateMakefile(p), /APP_AUTHOR\s+:= Yo Tú/);
});

test('el Makefile no admite inyección de comandos desde nombre/autor/descripción', () => {
  const p = newProject();
  p.name = 'X $(shell id) `whoami` "q" \\ # ${HOME}'; p.author = '$(error boom)'; p.description = 'a\nb; rm -rf /';
  const mk = generateMakefile(p);
  const vars = mk.split('\n').filter((l) => /^APP_(TITLE|DESCRIPTION|AUTHOR)\s*:=/.test(l)).join('\n');
  assert.ok(!/[$`"\\#{]/.test(vars.replace(/:=/g, '')), vars);
  assert.equal(makeSafe('a$(b)`c`'), 'a(b)c');
});
