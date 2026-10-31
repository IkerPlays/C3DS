// Codificador PNG mínimo (RGBA 8 bits, deflate "stored" => sin compresión). Sin dependencias.
import { crc32 } from './zip.js';

function adler32(b) {
  let a = 1; let c = 0;
  for (let i = 0; i < b.length; i++) { a = (a + b[i]) % 65521; c = (c + a) % 65521; }
  return ((c << 16) | a) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** @param {number} w @param {number} h @param {Uint8Array} rgba w*h*4 */
export function encodePNG(w, h, rgba) {
  if (rgba.length !== w * h * 4) throw new Error('Tamaño de píxeles incorrecto');
  const raw = new Uint8Array(h * (1 + w * 4));
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (1 + w * 4) + 1);
  const blocks = Math.ceil(raw.length / 65535) || 1;
  const z = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  z[0] = 0x78; z[1] = 0x01;
  let p = 2;
  for (let i = 0; i < blocks; i++) {
    const part = raw.subarray(i * 65535, (i + 1) * 65535);
    z[p++] = i === blocks - 1 ? 1 : 0;
    z[p++] = part.length & 0xff; z[p++] = part.length >> 8;
    z[p++] = ~part.length & 0xff; z[p++] = (~part.length >> 8) & 0xff;
    z.set(part, p); p += part.length;
  }
  new DataView(z.buffer).setUint32(p, adler32(raw));
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, c) => n + c.length, 0));
  let q = 0;
  for (const c of parts) { out.set(c, q); q += c.length; }
  return out;
}
