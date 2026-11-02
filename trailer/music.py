#!/usr/bin/env python3
"""Música original del tráiler de C3DS (sintetizada con numpy, sin samples ni voces).

120 BPM, La menor: Am - F - C - G. 42 compases = 84 s.
Estructura (compases de 2 s):
  0-2   intro: pad + riser
  2-8   entra el arpegio, luego el bajo
  7-8   riser y redoble hacia el primer drop
  8-18  DROP 1 (batería, bajo, lead)
  18-22 montaje de plantillas (batería sin bombo en el último compás)
  22-26 breakdown suave (pad + arpegio + campanas)
  26-30 subida (caja, riser)
  30-35 DROP 2 (todo, melodía más alta)
  35-39 final con lead y batería
  39-42 cola con campanas y reverb

Uso: python3 trailer/music.py salida.wav
"""
import sys
import numpy as np

SR = 44100
BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 42
N = int((BARS * BAR + 3.0) * SR)  # +3 s de cola
rng = np.random.default_rng(3)  # determinista

mix_l = np.zeros(N, dtype=np.float64)
mix_r = np.zeros(N, dtype=np.float64)
rev_l = np.zeros(N, dtype=np.float64)  # envío a reverb
rev_r = np.zeros(N, dtype=np.float64)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, a, d, s, r):
    """Envolvente ADSR de n muestras (tiempos en segundos)."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    env = np.ones(n)
    a_n = min(a_n, n)
    env[:a_n] = np.linspace(0, 1, a_n, endpoint=False) if a_n else 1
    d_end = min(a_n + d_n, n)
    if d_end > a_n:
        env[a_n:d_end] = np.linspace(1, s, d_end - a_n)
    env[d_end:] = s
    r_n = min(r_n, n)
    if r_n:
        env[n - r_n:] *= np.linspace(1, 0, r_n)
    return env


def osc(freq, n, kind="saw", pw=0.5, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    ph = (f * t + phase) % 1.0
    if kind == "saw":
        return 2 * ph - 1
    if kind == "square":
        return np.where(ph < pw, 1.0, -1.0)
    if kind == "tri":
        return 4 * np.abs(ph - 0.5) - 1
    return np.sin(2 * np.pi * ph)


def lowpass(x, cutoff):
    """Pasa-bajos de un polo, cutoff puede ser escalar o array."""
    if np.isscalar(cutoff):
        a = 1 - np.exp(-2 * np.pi * cutoff / SR)
        out = np.empty_like(x)
        y = 0.0
        for i in range(len(x)):  # lento pero suficiente para notas cortas
            y += a * (x[i] - y)
            out[i] = y
        return out
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(x)
    y = 0.0
    for i in range(len(x)):
        y += a[i] * (x[i] - y)
        out[i] = y
    return out


def fast_lowpass(x, cutoff):
    """Pasa-bajos vía FFT (para señales largas)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def put(buf_l, buf_r, start_s, sig, pan=0.0, gain=1.0, send=0.0):
    i = int(start_s * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    buf_l[i:i + len(sig)] += sig * gl
    buf_r[i:i + len(sig)] += sig * gr
    if send:
        rev_l[i:i + len(sig)] += sig * gl * send
        rev_r[i:i + len(sig)] += sig * gr * send


# ---------------------------------------------------------------- instrumentos
def kick(t0, gain=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 140 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.25
    put(mix_l, mix_r, t0, (s + click), 0.0, 0.95 * gain)


def snare(t0, gain=1.0):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - fast_lowpass(noise, 1500)  # pasa-altos
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    s = noise * np.exp(-t * 17) * 0.8 + body * 0.5
    put(mix_l, mix_r, t0, s, 0.05, 0.6 * gain, send=0.25)


def hat(t0, gain=1.0, open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - fast_lowpass(noise, 7000)
    s = noise * np.exp(-t * (14 if open_ else 90))
    put(mix_l, mix_r, t0, s, 0.3, 0.22 * gain)


def crash(t0, gain=1.0, length=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - fast_lowpass(noise, 4000)
    s = noise * np.exp(-t * 1.8)
    put(mix_l, mix_r, t0, s, 0.0, 0.35 * gain, send=0.4)


def riser(t0, length, gain=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # barrido de brillo creciente: mezcla de bandas crecientes
    out = np.zeros(n)
    prog = t / length
    for lo in (500, 1500, 4000):
        band = fast_lowpass(noise, lo * 2) - fast_lowpass(noise, lo)
        out += band * np.clip(prog * 1.5 - (lo / 8000), 0, 1)
    out *= prog ** 2.2
    # tono ascendente
    f = 220 * 2 ** (prog * 2.0)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * prog ** 3 * 0.35
    sig = (out * 0.9 + tone)
    put(mix_l, mix_r, t0, sig, 0.0, 0.5 * gain, send=0.3)


def pad(t0, notes, length, gain=1.0, bright=1800):
    n = int(length * SR)
    sig = np.zeros(n)
    for k, m in enumerate(notes):
        for d in (-0.006, 0.0, 0.007):
            sig += osc(midi(m), n, "saw", detune=d, phase=rng.random())
    sig /= len(notes) * 3
    sig = fast_lowpass(sig, bright)
    sig *= adsr(n, 0.6, 0.3, 0.85, 1.2)
    put(mix_l, mix_r, t0, sig, -0.2, 0.5 * gain, send=0.5)
    put(mix_l, mix_r, t0 + 0.012, sig, 0.2, 0.0)  # ligero ensanchado


def bass(t0, note, length, gain=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = midi(note)
    sig = osc(f, n, "saw") * 0.55 + osc(f, n, "square", 0.5) * 0.3 + osc(f / 2, n, "sine") * 0.6
    cutoff = 300 + 1400 * np.exp(-t * 18)
    sig = lowpass(sig, cutoff)
    sig *= adsr(n, 0.004, 0.08, 0.7, 0.05)
    put(mix_l, mix_r, t0, sig, 0.0, 0.62 * gain)


def pluck(t0, note, length, gain=1.0, pan=0.0, kind="square", pw=0.25, send=0.35):
    """Sonido tipo chiptune: pulso estrecho con decaimiento rápido."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = midi(note)
    sig = osc(f, n, kind, pw) * 0.7 + osc(f * 2, n, "tri") * 0.2
    sig *= adsr(n, 0.002, 0.12, 0.35, 0.06) * np.exp(-t * 3.0)
    put(mix_l, mix_r, t0, sig, pan, 0.32 * gain, send=send)


def lead(t0, note, length, gain=1.0, pan=0.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = midi(note) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = (np.where(np.sin(ph) > 0.3, 1.0, -1.0) * 0.55 + np.sin(ph) * 0.35 + np.sign(np.sin(ph * 2)) * 0.12)
    sig *= adsr(n, 0.004, 0.1, 0.75, 0.09)
    put(mix_l, mix_r, t0, sig, pan, 0.4 * gain, send=0.4)


def bell(t0, note, gain=1.0, pan=0.0):
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    f = midi(note)
    sig = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 2)
           + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 4)) * np.exp(-t * 1.3)
    put(mix_l, mix_r, t0, sig, pan, 0.28 * gain, send=0.6)


# ---------------------------------------------------------------- armonía
# Am - F - C - G (un acorde por compás)
CHORDS = [
    (45, [57, 60, 64]),   # Am: raíz A2
    (41, [53, 57, 60]),   # F
    (48, [55, 60, 64]),   # C
    (43, [55, 59, 62]),   # G
]
ARP = [  # notas del arpegio en octava alta por acorde (tríada + octava)
    [69, 72, 76, 81],
    [65, 69, 72, 77],
    [67, 72, 76, 79],
    [67, 71, 74, 79],
]
MOTIF_A = [  # lead: 16 pasos de semicorchea por compás (None = silencio), La menor pentatónica
    [76, None, 81, None, 79, None, 76, None, 74, None, 76, None, 72, None, None, None],
    [77, None, 81, None, 77, None, 76, None, 72, None, 74, None, 69, None, None, None],
    [79, None, 76, None, 79, None, 84, None, 83, None, 79, None, 76, None, None, None],
    [74, None, 79, None, 83, None, 79, None, 74, None, 71, None, 74, None, None, None],
]
MOTIF_B = [  # una octava arriba y más movido (drop 2)
    [88, 88, 84, None, 88, None, 91, None, 88, None, 84, None, 81, None, 84, None],
    [89, 89, 84, None, 89, None, 93, None, 89, None, 84, None, 81, None, 77, None],
    [91, 91, 88, None, 91, None, 96, None, 95, None, 91, None, 88, None, 84, None],
    [86, 86, 91, None, 95, None, 91, None, 86, None, 83, None, 86, None, 91, 95],
]

MOTIF_B = [[None if n is None else n - 12 for n in bar] for bar in MOTIF_B]  # registro cómodo


def bar_t(b):
    return b * BAR


def drums(b, kick_on=True, snare_on=True, hats=True, fill=False):
    t0 = bar_t(b)
    for beat in range(4):
        if kick_on:
            kick(t0 + beat * BEAT)
        if snare_on and beat in (1, 3):
            snare(t0 + beat * BEAT)
    if hats:
        for i in range(8):
            hat(t0 + i * BEAT / 2 + BEAT / 4 * 0, 0.8 if i % 2 else 1.0, open_=(i == 7))
        for i in range(16):
            if i % 2 == 1:
                hat(t0 + i * BEAT / 4, 0.35)
    if fill:
        for i in range(8):
            snare(t0 + BAR - (8 - i) * BEAT / 4 * 0.5 * 2 / 2 + 0.0, 0.5 + i * 0.08)


def play_arp(b, gain=1.0, density=2, shift=0):
    root_i = b % 4
    notes = ARP[root_i]
    t0 = bar_t(b)
    steps = 8 if density == 1 else 16
    for s in range(steps):
        idx = [0, 1, 2, 3, 2, 1, 2, 3][s % 8] if steps == 8 else [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2][s]
        t = t0 + s * (BAR / steps)
        pluck(t, notes[idx] + shift, 0.22, gain * (1.0 if s % 4 == 0 else 0.75), pan=-0.5 + (s % 4) * 0.33)


def play_bass(b, gain=1.0, style="eighths"):
    root, _ = CHORDS[b % 4]
    t0 = bar_t(b)
    if style == "whole":
        bass(t0, root, BAR * 0.98, gain)
    elif style == "eighths":
        for i in range(8):
            note = root + (12 if i in (3, 6) else 0)
            bass(t0 + i * BEAT / 2, note, BEAT / 2 * 0.9, gain)
    else:  # offbeat sincopado
        for i in range(8):
            if i % 2 == 1 or i == 0:
                bass(t0 + i * BEAT / 2, root + (12 if i == 5 else 0), BEAT / 2 * 0.9, gain)


def play_lead(b, motif, gain=1.0):
    pattern = motif[b % 4]
    t0 = bar_t(b)
    step = BAR / 16
    i = 0
    while i < 16:
        n = pattern[i]
        if n is None:
            i += 1
            continue
        j = i + 1
        while j < 16 and pattern[j] is None:
            j += 1
        pan = 0.25 if (i // 4) % 2 else -0.25
        lead(t0 + i * step, n, (j - i) * step * 0.95, gain, pan)
        i = j


# ---------------------------------------------------------------- arreglo
for b in range(BARS):
    root, tri = CHORDS[b % 4]
    t0 = bar_t(b)

    # PAD: casi siempre; en el breakdown más abierto
    if b < 41:
        pad(t0, tri + [tri[0] + 12], BAR * 1.02, gain=0.8 if 8 <= b < 22 or 30 <= b < 39 else 1.0, bright=1400 if b < 8 else 2200)

    # ARPEGIO
    if 2 <= b < 8:
        play_arp(b, gain=0.55 + 0.05 * (b - 2), density=1 if b < 4 else 2)
    elif 8 <= b < 22:
        play_arp(b, gain=0.6, density=2)
    elif 22 <= b < 26:
        play_arp(b, gain=0.7, density=1, shift=0)
    elif 26 <= b < 30:
        play_arp(b, gain=0.75, density=2)
    elif 30 <= b < 39:
        play_arp(b, gain=0.6, density=2, shift=12 if b % 8 == 7 else 0)

    # BAJO
    if 4 <= b < 8:
        play_bass(b, 0.7, "whole" if b < 6 else "eighths")
    elif 8 <= b < 22:
        play_bass(b, 1.0, "eighths")
    elif 26 <= b < 30:
        play_bass(b, 0.85, "sync")
    elif 30 <= b < 39:
        play_bass(b, 1.0, "eighths")
    elif b == 39:
        play_bass(b, 0.8, "whole")

    # BATERÍA
    if 4 <= b < 8:
        for beat in range(4):  # solo hats suaves
            hat(t0 + beat * BEAT + BEAT / 2, 0.55)
        if b >= 6:
            kick(t0)
            kick(t0 + 2 * BEAT)
    elif b == 7:
        for i in range(8):
            snare(t0 + BAR / 2 + i * BAR / 16, 0.35 + i * 0.09)
    if 8 <= b < 21:
        drums(b, kick_on=True, snare_on=True, hats=True)
    elif b == 21:
        drums(b, kick_on=False, snare_on=True, hats=True)
    elif 26 <= b < 30:
        for beat in range(4):
            if b >= 28:
                kick(t0 + beat * BEAT, 0.85)
            hat(t0 + beat * BEAT + BEAT / 2, 0.6)
        if b == 29:
            for i in range(16):
                snare(t0 + i * BAR / 16, 0.3 + i * 0.05)
    elif 30 <= b < 38:
        drums(b, kick_on=True, snare_on=True, hats=True)
    elif b == 38:
        drums(b, kick_on=True, snare_on=False, hats=False)

    # LEAD
    if 8 <= b < 18:
        play_lead(b, MOTIF_A, gain=1.0 if b >= 10 else 0.8)
    elif 30 <= b < 38:
        play_lead(b, MOTIF_B, gain=0.9)
    elif b == 38:
        lead(t0, 81, BAR * 0.95, 0.9)

    # CAMPANAS (breakdown y cola)
    if 22 <= b < 26 or b >= 39:
        notes = ARP[b % 4]
        for i, k in enumerate([0, 2, 3, 1]):
            if b >= 39 and i > 1:
                continue
            bell(t0 + i * BEAT, notes[k] + 12, gain=0.9 if b < 41 else 0.7, pan=-0.4 + 0.27 * i)

# RISERS y CRASHES
riser(bar_t(1) * 0 + 0.0, bar_t(2), 0.6)                       # intro
riser(bar_t(6), bar_t(2), 0.9)                                  # hacia el drop 1
riser(bar_t(28), bar_t(2), 1.0)                                 # hacia el drop 2
for b in (8, 30, 38):
    crash(bar_t(b))
crash(bar_t(18), 0.6)
crash(bar_t(22), 0.5)
crash(bar_t(39), 0.7, length=3.0)
# nota final grave
bass(bar_t(40), 45, BAR * 2.4, 0.9)

# ---------------------------------------------------------------- reverb
ir_len = int(2.4 * SR)
tt = np.arange(ir_len) / SR
ir_l = rng.standard_normal(ir_len) * np.exp(-tt * 2.6)
ir_r = rng.standard_normal(ir_len) * np.exp(-tt * 2.6)
ir_l = fast_lowpass(ir_l, 6000)
ir_r = fast_lowpass(ir_r, 6000)
ir_l /= np.sqrt(np.sum(ir_l ** 2))
ir_r /= np.sqrt(np.sum(ir_r ** 2))


def fft_conv(x, ir):
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)
    return y[: len(x)]


wet_l = fft_conv(rev_l, ir_l) * 0.45
wet_r = fft_conv(rev_r, ir_r) * 0.45
mix_l += wet_l
mix_r += wet_r

# eco punteado (3/16) muy suave sobre todo el mix agudo
delay = int(BEAT * 0.75 * SR)
hp_l = mix_l - fast_lowpass(mix_l, 1200)
hp_r = mix_r - fast_lowpass(mix_r, 1200)
mix_l[delay:] += hp_r[:-delay] * 0.14
mix_r[delay:] += hp_l[:-delay] * 0.14

# ---------------------------------------------------------------- master
# compresión sidechain suave: el bombo agacha pad/arp (se aproxima con envolvente del bombo)
out = np.stack([mix_l, mix_r], axis=1)
peak = np.max(np.abs(out))
out = out / peak * 0.9
out = np.tanh(out * 1.25) / np.tanh(1.25)       # saturación suave
# fundidos
fade_in = int(0.05 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
tail = int(2.4 * SR)
out[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
out = out / np.max(np.abs(out)) * 0.89


def write_wav(path, data):
    import wave
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "c3ds-trailer.wav"
    write_wav(path, out)
    print(f"{path}: {len(out) / SR:.1f} s, pico {np.max(np.abs(out)):.2f}")
