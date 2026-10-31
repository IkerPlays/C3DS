// WAV PCM 16-bit. Es el único formato de audio que usa el código generado para la 3DS (ndsp).
export function encodeWav(samples, rate = 22050) {
  const n = samples.length * 2;
  const b = new Uint8Array(44 + n);
  const dv = new DataView(b.buffer);
  const tag = (o, s) => { for (let i = 0; i < 4; i++) b[o + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); dv.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  tag(36, 'data'); dv.setUint32(40, n, true);
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return b;
}

export function silentWav(seconds = 1, rate = 22050) { return encodeWav(new Float32Array(seconds * rate), rate); }

/** Pitido con envolvente (para el sonido de ejemplo). */
export function toneWav(freq = 880, seconds = 0.15, rate = 22050) {
  const n = Math.round(seconds * rate);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = Math.sin((2 * Math.PI * freq * i) / rate) * 0.4 * (1 - i / n);
  return encodeWav(s, rate);
}

/** Mezcla a mono y remuestrea (interpolación lineal) a `rate`. @param {Float32Array[]} channels */
export function toMono22k(channels, srcRate, rate = 22050) {
  const len = channels[0].length;
  const mono = new Float32Array(len);
  for (const c of channels) for (let i = 0; i < len; i++) mono[i] += c[i] / channels.length;
  if (srcRate === rate) return { samples: mono, rate };
  const outLen = Math.max(1, Math.floor((len * rate) / srcRate));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = (i * srcRate) / rate; const i0 = Math.floor(pos); const f = pos - i0;
    out[i] = mono[i0] * (1 - f) + (mono[Math.min(i0 + 1, len - 1)] * f);
  }
  return { samples: out, rate };
}

export function wavInfo(b) {
  if (b.length < 44 || String.fromCharCode(...b.subarray(0, 4)) !== 'RIFF') return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { channels: dv.getUint16(22, true), rate: dv.getUint32(24, true), bits: dv.getUint16(34, true), bytes: dv.getUint32(40, true) };
}
