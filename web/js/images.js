// Procesado de imágenes y audio en el navegador (canvas / Web Audio) + cálculos de tamaño puros.
import { encodeWav, toMono22k } from './wav.js';
import { toDataURL } from './bytes.js';
import { LIMITS } from './model.js';

/** Reduce (nunca amplía) manteniendo la proporción hasta que ningún lado supere `max`. */
export function fitSize(w, h, max = LIMITS.maxImageSide) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Potencia de 2 más cercana por encima (8..max), como exige el hardware de la 3DS para texturas sueltas. */
export function pow2Size(w, h, max = 1024) {
  const up = (n) => Math.min(max, Math.max(8, 2 ** Math.ceil(Math.log2(Math.max(1, n)))));
  return { w: up(w), h: up(h) };
}

async function decodeImage(file) {
  const bmp = await createImageBitmap(file);
  return bmp;
}

function canvasPng(canvas) {
  return new Promise((res, rej) => canvas.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error('No se pudo codificar la imagen'))), 'image/png'));
}

/** Convierte un archivo de imagen en PNG limitado a `LIMITS.maxImageSide`. */
export async function imageToAsset(file, { pow2 = false, max = LIMITS.maxImageSide } = {}) {
  const bmp = await decodeImage(file);
  const size = pow2 ? pow2Size(bmp.width, bmp.height, max) : fitSize(bmp.width, bmp.height, max);
  const c = document.createElement('canvas');
  c.width = size.w; c.height = size.h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, size.w, size.h);
  const bytes = await canvasPng(c);
  return { w: size.w, h: size.h, bytes, dataURL: toDataURL(bytes, 'image/png'), scaled: size.w !== bmp.width || size.h !== bmp.height };
}

/** Convierte audio (wav/ogg/mp3...) a WAV PCM16 mono 22 050 Hz (máx. 15 s). */
export async function audioToWav(arrayBuffer, maxSeconds = 15) {
  const Ctx = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const ctx = new Ctx(1, 1, 22050);
  const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const chans = [];
  const len = Math.min(buf.length, Math.floor(buf.sampleRate * maxSeconds));
  for (let i = 0; i < buf.numberOfChannels; i++) chans.push(buf.getChannelData(i).subarray(0, len));
  const { samples, rate } = toMono22k(chans, buf.sampleRate);
  const bytes = encodeWav(samples, rate);
  return { bytes, dataURL: toDataURL(bytes, 'audio/wav'), seconds: samples.length / rate, trimmed: buf.length > len };
}

/** Corta una hoja de sprites (cuadrícula cols×rows) en fotogramas PNG. Los fotogramas se limitan a `max` px. */
export async function sliceSheet(file, cols, rows, max = LIMITS.maxImageSide) {
  const bmp = await decodeImage(file);
  const fw = Math.floor(bmp.width / cols); const fh = Math.floor(bmp.height / rows);
  if (fw < 1 || fh < 1) throw new Error('La cuadrícula es mayor que la imagen');
  const size = fitSize(fw, fh, max);
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cv = document.createElement('canvas'); cv.width = size.w; cv.height = size.h;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, c * fw, r * fh, fw, fh, 0, 0, size.w, size.h);
    const bytes = await canvasPng(cv);
    out.push({ w: size.w, h: size.h, bytes, dataURL: toDataURL(bytes, 'image/png') });
  }
  return out;
}
