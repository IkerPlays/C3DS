// Monta el tráiler: recorta cada clip, los une al compás de la música y mezcla el audio.
// Uso:  node trailer/assemble.mjs <carpeta-clips> <musica.wav> <salida.mp4>
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [CLIPS, MUSIC, OUT] = process.argv.slice(2);
if (!CLIPS || !MUSIC || !OUT) { console.error('uso: node trailer/assemble.mjs <clips> <musica.wav> <salida.mp4>'); process.exit(1); }
const meta = JSON.parse(readFileSync(join(CLIPS, 'clips.json'), 'utf8'));
const names = Object.keys(meta).sort();
const FPS = 30;
const run = (args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' }); if (r.status !== 0) { console.error('ffmpeg falló:', args.join(' ')); process.exit(1); } };

/** Empuje lento hacia el centro (efecto "cámara") durante todo el clip. */
const pushIn = (dur) => `scale=w='trunc(1920*(1+0.025*t/${dur})/2)*2':h='trunc(1080*(1+0.025*t/${dur})/2)*2':eval=frame:flags=bicubic,crop=1920:1080`;

const tmp = join(CLIPS, '_parts'); mkdirSync(tmp, { recursive: true });
const list = [];
let total = 0;
for (const n of names) {
  const m = meta[n]; const part = join(tmp, `${n}.mp4`);
  // 1) recorta (quita el arranque en blanco), alarga con el último fotograma si falta y normaliza a 1080p30
  run(['-ss', String(m.offset), '-i', join(CLIPS, `${n}.webm`),
    '-vf', `tpad=stop_mode=clone:stop_duration=3,fps=${FPS},scale=1920:1080:flags=lanczos,${m.push ? pushIn(m.dur) : 'null'},format=yuv420p,setsar=1`,
    '-t', String(m.dur), '-an', '-c:v', 'libx264', '-crf', '12', '-preset', 'medium', '-r', String(FPS), part]);
  list.push(`file '${part}'`); total += m.dur;
  console.log(`  ${n}  ${m.dur}s  (desde ${m.offset}s)`);
}
writeFileSync(join(tmp, 'list.txt'), list.join('\n'));
console.log(`duración total: ${total}s`);

// 2) une, con fundido inicial/final y dos destellos blancos en los drops (compases 8 y 30)
const flash = (t) => `drawbox=x=0:y=0:w=iw:h=ih:color=white@0.55:t=fill:enable='between(t,${t},${t + 0.07})',drawbox=x=0:y=0:w=iw:h=ih:color=white@0.25:t=fill:enable='between(t,${t + 0.07},${t + 0.2})'`;
const vf = `${flash(16)},${flash(60)},fade=t=in:st=0:d=0.5,fade=t=out:st=${total - 0.8}:d=0.8`;
run(['-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-vf', vf, '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', String(FPS), join(tmp, 'video.mp4')]);

// 3) audio: ganancia lineal (se conserva la dinámica: intro suave, drops fuertes) + limitador, con fundido final
run(['-i', MUSIC, '-t', String(total), '-af', `volume=1.3dB,alimiter=limit=0.78:attack=3:release=80:level=disabled,afade=t=out:st=${total - 2.4}:d=2.4,aresample=48000`, '-c:a', 'pcm_s16le', join(tmp, 'music.wav')]);

// 4) mezcla final
run(['-i', join(tmp, 'video.mp4'), '-i', join(tmp, 'music.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT]);
console.log('✓', OUT);
