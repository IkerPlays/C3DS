// Lectura mínima de la cabecera PE de un .exe (solo análisis, no conversión).
const MACHINES = { 0x14c: 'x86 (32 bits)', 0x8664: 'x86-64 (64 bits)', 0xaa64: 'ARM64', 0x1c4: 'ARM (Thumb-2)' };

/** @param {Uint8Array} b primeros KB del archivo */
export function parsePE(b) {
  if (b.length < 0x40 || b[0] !== 0x4d || b[1] !== 0x5a) return { valid: false };
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const pe = dv.getUint32(0x3c, true);
  if (pe + 24 > b.length || dv.getUint32(pe, true) !== 0x00004550) return { valid: false };
  const machine = dv.getUint16(pe + 4, true);
  const optSize = dv.getUint16(pe + 20, true);
  const opt = pe + 24;
  let managed = false;
  let subsystem = null;
  if (opt + 70 <= b.length && optSize >= 70) {
    const magic = dv.getUint16(opt, true);
    subsystem = dv.getUint16(opt + 68, true);
    const ddBase = magic === 0x20b ? opt + 112 : magic === 0x10b ? opt + 96 : -1;
    const clr = ddBase + 14 * 8;
    if (ddBase > 0 && clr + 8 <= b.length) managed = dv.getUint32(clr, true) !== 0;
  }
  return {
    valid: true,
    machine: MACHINES[machine] || `0x${machine.toString(16)}`,
    subsystem: subsystem === 2 ? 'GUI' : subsystem === 3 ? 'Consola' : 'otro',
    managed,
  };
}
