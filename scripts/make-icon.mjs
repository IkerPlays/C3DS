#!/usr/bin/env node
// Genera assets/icon.png (1024x1024, comprimido). Se usa como fuente de iconos para Tauri/Capacitor.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { crc32 } from '../web/js/zip.js';

const N = 1024;
const raw = Buffer.alloc(N * (1 + N * 4));
for (let y = 0; y < N; y++) {
  raw[y * (1 + N * 4)] = 0;
  for (let x = 0; x < N; x++) {
    const i = y * (1 + N * 4) + 1 + x * 4;
    // Cuadrado con esquinas redondeadas: degradado rosa->azul con una "3" estilizada (barras).
    const r = 180; const cx = Math.min(Math.max(x, r), N - r); const cy = Math.min(Math.max(y, r), N - r);
    const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    const t = y / N;
    let c = [Math.round(255 - 150 * t), Math.round(77 + 60 * t), Math.round(109 + 120 * t)];
    const bar = (x > 300 && x < 700) && ((y > 250 && y < 340) || (y > 470 && y < 560) || (y > 690 && y < 780)) || (x > 620 && x < 710 && y > 250 && y < 780);
    if (bar) c = [255, 255, 255];
    raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = inside ? 255 : 0;
  }
}
const chunk = (type, data) => {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0); b.write(type, 4); data.copy(b, 8);
  b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
  return b;
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
mkdirSync('assets', { recursive: true });
writeFileSync('assets/icon.png', png);
console.log(`assets/icon.png (${png.length} bytes)`);
