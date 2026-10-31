// Escritor ZIP (sin compresión) y lector de directorio central (con inflado vía DecompressionStream).
const enc = new TextEncoder();
const dec = new TextDecoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {{path:string, content:string|Uint8Array}[]} files */
export function createZip(files, date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.path);
    const data = typeof f.content === 'string' ? enc.encode(f.content) : f.content;
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, day, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, day, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

/** Lista las entradas de un ZIP. @param {Uint8Array} b */
export function readZipEntries(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('No es un ZIP válido');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Directorio central corrupto');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const size = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const path = dec.decode(b.subarray(p + 46, p + 46 + nlen));
    if (!path.endsWith('/')) out.push({ path, size, csize, method, lho });
    p += 46 + nlen + elen + clen;
  }
  return out;
}

/** Extrae (como máximo `max` bytes) una entrada. */
export async function extractZipEntry(b, entry, max = Infinity) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const start = entry.lho + 30 + dv.getUint16(entry.lho + 26, true) + dv.getUint16(entry.lho + 28, true);
  const raw = b.subarray(start, start + entry.csize);
  if (entry.method === 0) return raw.subarray(0, max);
  if (entry.method !== 8) throw new Error(`Método de compresión ${entry.method} no soportado`);
  const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); total += value.length;
  }
  reader.cancel().catch(() => {});
  const res = new Uint8Array(Math.min(total, max));
  let q = 0;
  for (const c of parts) { const s = c.subarray(0, res.length - q); res.set(s, q); q += s.length; if (q >= res.length) break; }
  return res;
}
