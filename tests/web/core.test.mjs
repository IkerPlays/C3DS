import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { detectEngine, parseEngineVersion } from '../../web/js/detect.js';
import { parsePE } from '../../web/js/pe.js';
import { buildReport, classify, pngSize } from '../../web/js/analyze.js';
import { createZip, readZipEntries, extractZipEntry, crc32 } from '../../web/js/zip.js';
import { newProject, generateMainC, generateMakefile, exportFiles, validate, cStr, slug } from '../../web/js/project.js';

test('detecta motores', () => {
  assert.equal(detectEngine(['G/Assets/a.cs', 'G/ProjectSettings/ProjectVersion.txt']).engine, 'unity');
  assert.equal(detectEngine(['G/project.godot', 'G/a.gd']).engine, 'godot');
  assert.equal(detectEngine(['My/My.uproject']).engine, 'unreal');
  assert.equal(detectEngine(['game.EXE']).engine, 'exe');
  assert.equal(detectEngine(['readme.txt', 'a.exe']).engine, 'unknown');
  assert.equal(detectEngine(['a\\Assets\\x.png', 'a\\ProjectSettings\\y.asset']).engine, 'unity');
});

test('versiones', () => {
  assert.equal(parseEngineVersion('unity', 'm_EditorVersion: 2022.3.10f1\nm_x: 1'), '2022.3.10f1');
  assert.equal(parseEngineVersion('godot', 'config/features=PackedStringArray("4.2", "Forward Plus")'), '4.2');
  assert.equal(parseEngineVersion('unreal', '{"EngineAssociation":"5.3"}'), '5.3');
  assert.equal(parseEngineVersion('unreal', 'no json'), null);
});

function fakePE({ machine = 0x8664, magic = 0x20b, clr = 0 } = {}) {
  const b = new Uint8Array(1024); const dv = new DataView(b.buffer);
  b[0] = 0x4d; b[1] = 0x5a; dv.setUint32(0x3c, 0x80, true);
  dv.setUint32(0x80, 0x4550, true); dv.setUint16(0x84, machine, true);
  dv.setUint16(0x80 + 20, magic === 0x20b ? 240 : 224, true);
  const opt = 0x80 + 24; dv.setUint16(opt, magic, true); dv.setUint16(opt + 68, 2, true);
  dv.setUint32(opt + (magic === 0x20b ? 112 : 96) + 14 * 8, clr, true);
  return b;
}
test('PE', () => {
  assert.deepEqual(parsePE(new Uint8Array(100)), { valid: false });
  const r = parsePE(fakePE());
  assert.equal(r.valid, true); assert.equal(r.machine, 'x86-64 (64 bits)'); assert.equal(r.managed, false); assert.equal(r.subsystem, 'GUI');
  assert.equal(parsePE(fakePE({ machine: 0x14c, magic: 0x10b, clr: 0x2000 })).managed, true);
});

test('informe', () => {
  const entries = ['a.cs', 'b.cs', 'c.png', 'd.shader', 'e.fbx', 'f.wav'].map((p) => ({ path: p, size: 1000 }));
  const stats = classify(entries);
  assert.equal(stats.script, 2); assert.equal(stats.texture, 1); assert.equal(stats.shader, 1);
  const r = buildReport({ engine: 'unity', stats, textures: [{ path: 'c.png', w: 300, h: 256 }] });
  assert.equal(r.verdict, 'port');
  assert.ok(r.findings.some((f) => f.level === 'error' && /Shaders/.test(f.title)));
  assert.ok(r.findings.some((f) => /Texturas fuera/.test(f.title)));
  const ok = buildReport({ engine: 'godot', stats: classify([{ path: 'a.png', size: 1 }]), textures: [{ path: 'a.png', w: 64, h: 64 }] });
  assert.equal(ok.verdict, 'portable');
  assert.equal(buildReport({ engine: 'exe', stats, pe: parsePE(fakePE()) }).verdict, 'blocked');
  assert.equal(buildReport({ engine: 'unknown', stats }).verdict, 'blocked');
});

test('pngSize', () => {
  const b = new Uint8Array(24); b.set([0x89, 0x50, 0x4e, 0x47]); new DataView(b.buffer).setUint32(16, 128); new DataView(b.buffer).setUint32(20, 64);
  assert.deepEqual(pngSize(b), { w: 128, h: 64 });
  assert.equal(pngSize(new Uint8Array(30)), null);
});

test('zip: crc, escritura y lectura', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const zip = createZip([{ path: 'a/b.txt', content: 'hola ñ' }, { path: 'c.bin', content: new Uint8Array([1, 2, 3]) }]);
  const es = readZipEntries(zip);
  assert.deepEqual(es.map((e) => e.path), ['a/b.txt', 'c.bin']);
  assert.equal(new TextDecoder().decode(await extractZipEntry(zip, es[0])), 'hola ñ');
  assert.deepEqual([...(await extractZipEntry(zip, es[1]))], [1, 2, 3]);
  assert.throws(() => readZipEntries(new Uint8Array(50)));
});

test('zip: entrada deflate', async () => {
  const data = new TextEncoder().encode('abc'.repeat(500));
  const z = deflateRawSync(data);
  const name = new TextEncoder().encode('x.txt');
  const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(8, 8, true); lh.setUint32(18, z.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
  const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(10, 8, true); ch.setUint32(20, z.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
  const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true);
  const cdOff = 30 + name.length + z.length; end.setUint32(12, 46 + name.length, true); end.setUint32(16, cdOff, true);
  const zip = Buffer.concat([Buffer.from(lh.buffer), name, z, Buffer.from(ch.buffer), name, Buffer.from(end.buffer)]);
  const u8 = new Uint8Array(zip);
  const [e] = readZipEntries(u8);
  assert.equal(e.method, 8);
  assert.equal((await extractZipEntry(u8, e)).length, 1500);
  assert.equal((await extractZipEntry(u8, e, 10)).length, 10);
});

test('generación de proyecto 3DS', () => {
  const p = newProject();
  const c = generateMainC(p);
  assert.match(c, /#include <citro2d.h>/);
  assert.match(c, /NUM_ENTITIES 3/);
  assert.match(c, /C2D_DrawRectSolid\(ents\[0\]/);
  assert.match(c, /C2D_TextParse\(&texts\[1\], textBuf, "Hola 3DS!"\)/);
  assert.match(c, /C2D_Color32\(255, 0, 77, 255\)/);
  const mk = generateMakefile(p);
  assert.match(mk, /\n\t@mkdir -p \$@/);
  assert.match(mk, /3ds_rules/);
  const files = exportFiles(p).map((f) => f.path);
  assert.ok(files.includes('mi-juego-c3ds/source/main.c') && files.includes('mi-juego-c3ds/Makefile'));
  assert.ok(files.every((f) => !f.includes('..')));
});

test('escape y validación', () => {
  assert.equal(cStr('a"b\\c\nñ'), 'a\\"b\\\\c??');
  assert.equal(slug('  ¡Ñandú Rápido! '), 'nandu-rapido');
  assert.equal(slug('###'), 'game');
  const p = newProject();
  p.entities[0].x = 390; p.entities.push({ ...p.entities[0], id: 9 });
  const w = validate(p);
  assert.ok(w.some((x) => /sale de la pantalla/.test(x)));
  assert.ok(w.some((x) => /varios objetos controlables/.test(x)));
  const evil = newProject(); evil.entities[1].text = '"; system("x"); //';
  assert.ok(!/[^\\]"; system/.test(generateMainC(evil)));
  assert.ok(generateMainC(evil).includes('\\"; system(\\"x\\")'));
});

import { encodePNG } from '../../web/js/png.js';
import { generateRsf, gradientPNG, silentWav, uniqueId, ciaAssets, MAKEROM_SHA256 } from '../../web/js/cia.js';
import { inflateSync } from 'node:zlib';

test('PNG válido y decodificable', () => {
  const px = new Uint8Array(3 * 2 * 4).map((_, i) => i * 7);
  const png = encodePNG(3, 2, px);
  assert.deepEqual([...png.slice(1, 4)], [0x50, 0x4e, 0x47]);
  const dv = new DataView(png.buffer);
  assert.equal(dv.getUint32(16), 3); assert.equal(dv.getUint32(20), 2);
  const idatLen = dv.getUint32(33);
  const raw = inflateSync(png.slice(41, 41 + idatLen));
  assert.equal(raw.length, 2 * (1 + 12));
  assert.deepEqual([...raw.slice(1, 13)], [...px.slice(0, 12)]);
  assert.throws(() => encodePNG(2, 2, new Uint8Array(3)));
  assert.equal(new DataView(gradientPNG(256, 128, '#112233').buffer).getUint32(16), 256);
});

test('recursos .cia', () => {
  const p = newProject();
  const rsf = generateRsf(p);
  assert.match(rsf, /ProductCode\s+: CTR-P-[A-Z0-9]{4}\n/);
  assert.match(rsf, /UniqueId\s+: 0xf[0-9a-f]{4}\n/);
  assert.equal(uniqueId('a'), uniqueId('a')); assert.notEqual(uniqueId('a'), uniqueId('b'));
  const id = uniqueId('Zzz'); assert.ok(id >= 0xf0000 && id <= 0xfefff);
  const w = silentWav(1, 8000); assert.equal(w.length, 44 + 16000); assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF');
  assert.deepEqual(ciaAssets(p).map((f) => f.path), ['cia/app.rsf', 'cia/banner.png', 'cia/icon.png', 'cia/audio.wav']);
  assert.match(MAKEROM_SHA256, /^[0-9a-f]{64}$/);
  const names = exportFiles(p).map((f) => f.path);
  assert.ok(names.includes('mi-juego-c3ds/cia/app.rsf'));
  assert.match(generateMakefile(p), /\ncia: \$\(BUILD\)\n\t@bannertool makebanner/);
  assert.match(exportFiles(p).find((f) => f.path.endsWith('build.yml')).content, /make cia/);
});
