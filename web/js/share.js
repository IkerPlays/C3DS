// Compartir un proyecto como enlace: JSON comprimido (deflate-raw) en base64url dentro del hash (#p=...).
import { bytesToBase64, base64ToBytes } from './bytes.js';
import { migrate } from './model.js';

export const MAX_LINK_CHARS = 200_000;      // por encima, los navegadores/chats suelen truncar el enlace
const MAX_JSON_BYTES = 8 * 1048576;

const toB64Url = (bytes) => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s) => base64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

async function pump(stream, bytes, max = Infinity) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const parts = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) throw new Error('El proyecto del enlace es demasiado grande');
    parts.push(value);
  }
  const out = new Uint8Array(total); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export async function encodeProject(project) {
  const clean = { ...project }; delete clean.localId;
  const json = new TextEncoder().encode(JSON.stringify(clean));
  const z = await pump(new CompressionStream('deflate-raw'), json);
  return toB64Url(z);
}

/** Decodifica y valida. Devuelve el proyecto (formato 2) o lanza un Error con un mensaje claro. */
export async function decodeProject(token) {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Enlace no válido');
  let raw;
  try { raw = await pump(new DecompressionStream('deflate-raw'), fromB64Url(token), MAX_JSON_BYTES); } catch (e) { throw new Error(e.message.includes('grande') ? e.message : 'El enlace está dañado o incompleto'); }
  let p;
  try { p = migrate(JSON.parse(new TextDecoder().decode(raw))); } catch { throw new Error('El enlace no contiene un proyecto de C3DS'); }
  if (!Array.isArray(p.scenes) || !p.assets || !p.blobs) throw new Error('El proyecto del enlace está incompleto');
  delete p.localId;
  return p;
}

export const shareUrl = (base, token) => `${base.split('#')[0]}#p=${token}`;
export const tokenFromHash = (hash) => (/^#p=([A-Za-z0-9_-]+)$/.exec(hash || '') || [])[1] || null;
