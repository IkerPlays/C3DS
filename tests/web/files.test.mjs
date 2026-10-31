import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, inflateSync } from 'node:zlib';
import { createZip, readZipEntries, extractZipEntry, crc32 } from '../../web/js/zip.js';
import { encodePNG } from '../../web/js/png.js';
import { gradientPNG } from '../../web/js/cia.js';

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

