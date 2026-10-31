import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, validate, migrate, makeObject, makeScene, slug, isVarName, findObject, LIMITS } from '../../web/js/model.js';
import { toneWav, wavInfo, toMono22k, encodeWav } from '../../web/js/wav.js';
import { bytesToBase64, base64ToBytes, fromDataURL, toDataURL } from '../../web/js/bytes.js';

test('proyecto de ejemplo válido', () => {
  const p = newProject();
  assert.equal(p.scenes.length, 2);
  assert.deepEqual(validate(p), []);
  assert.equal(p.assets.images.length, 4);
  assert.equal(p.scenes[1].objects[1].animGroup, 'moneda');
  const ids = p.scenes.flatMap((s) => s.objects.map((o) => o.id));
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
});

test('validación detecta referencias rotas', () => {
  const p = newProject();
  p.scenes[1].rules[0].when.a = 99999;
  p.scenes[0].rules[0].then[1].scene = 12345;
  p.variables.push({ name: '1mala', value: 0 });
  const errs = validate(p).filter((x) => x.level === 'error').map((x) => x.text).join('|');
  assert.match(errs, /objeto que ya no existe/);
  assert.match(errs, /escena de destino/);
  assert.match(errs, /variable inválido/i);
});

test('validación: límites y avisos', () => {
  const p = newProject();
  p.scenes[1].objects[0].x = 390;
  assert.ok(validate(p).some((x) => x.level === 'warn' && /sale de la pantalla/.test(x.text)));
  p.assets.images[0].w = 2000;
  assert.ok(validate(p).some((x) => /supera/.test(x.text)));
  const q = newProject();
  for (let i = 0; i <= LIMITS.objectsPerScene; i++) q.scenes[0].objects.push(makeObject(q, 'rect'));
  assert.ok(validate(q).some((x) => /máximo/i.test(x.text)));
});

test('migra el formato 1', () => {
  const p = migrate({ format: 1, name: 'Viejo', author: 'a', description: '', bg: { top: '#000000', bottom: '#111111' }, entities: [{ id: 1, type: 'rect', screen: 'top', x: 1, y: 2, w: 3, h: 4, color: '#ff0000', text: '', player: true, speed: 5 }] });
  assert.equal(p.format, 2);
  assert.equal(p.scenes[0].objects[0].controls, true);
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  assert.throws(() => migrate({ format: 9 }));
});

test('helpers', () => {
  assert.equal(slug('¡Ñandú Rápido!'), 'nandu-rapido');
  assert.equal(slug('###'), 'juego');
  assert.ok(isVarName('puntos_1') && !isVarName('1x') && !isVarName('a b'));
  const p = newProject();
  const s = makeScene(p, 'X');
  assert.ok(s.id > 0 && findObject(p, p.scenes[0].objects[0].id));
});

test('wav y bytes', () => {
  const w = toneWav(440, 0.1, 8000);
  assert.deepEqual(wavInfo(w), { channels: 1, rate: 8000, bits: 16, bytes: 1600 });
  const m = toMono22k([new Float32Array([1, 1, 1, 1]), new Float32Array([0, 0, 0, 0])], 44100);
  assert.equal(m.rate, 22050); assert.equal(m.samples.length, 2); assert.ok(Math.abs(m.samples[0] - 0.5) < 1e-6);
  assert.equal(wavInfo(encodeWav(new Float32Array(10))).bytes, 20);
  const b = new Uint8Array([0, 1, 2, 250, 255]);
  assert.deepEqual([...base64ToBytes(bytesToBase64(b))], [...b]);
  assert.deepEqual([...fromDataURL(toDataURL(b, 'x/y')).bytes], [...b]);
  assert.throws(() => fromDataURL('nope'));
});

import { estimateMemory, VRAM_BYTES } from '../../web/js/model.js';
test('estimación de memoria y aviso de VRAM', () => {
  const p = newProject();
  const m = estimateMemory(p);
  assert.equal(m.textureBytes, 4 * 32 * 32 * 4);
  assert.ok(m.audioBytes > 0 && m.objects === 6);
  assert.ok(!validate(p).some((x) => /VRAM/.test(x.text)));
  for (let i = 0; i < 6; i++) p.assets.images.push({ id: 9000 + i, name: `g${i}`, w: 512, h: 512 });
  for (let i = 0; i < 6; i++) p.blobs[9000 + i] = p.blobs[Object.keys(p.blobs)[0]];
  assert.ok(estimateMemory(p).textureBytes > VRAM_BYTES);
  assert.ok(validate(p).some((x) => x.level === 'warn' && /VRAM/.test(x.text)));
});
