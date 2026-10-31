// Utilidades de bytes <-> base64 / data URL (funcionan en navegador y en Node).
export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const toDataURL = (bytes, mime) => `data:${mime};base64,${bytesToBase64(bytes)}`;
export function fromDataURL(url) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(url || '');
  if (!m) throw new Error('data URL inválida');
  return { mime: m[1], bytes: base64ToBytes(m[2]) };
}
