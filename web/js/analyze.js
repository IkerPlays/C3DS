import { LIMITS, isPow2 } from './limits.js';
import { parsePE } from './pe.js';

const EXT = {
  texture: ['png', 'jpg', 'jpeg', 'tga', 'bmp', 'psd', 'dds', 'exr', 'hdr', 'webp'],
  audio: ['wav', 'ogg', 'mp3', 'flac', 'aif', 'aiff', 'wem', 'bank'],
  model: ['fbx', 'obj', 'blend', 'dae', 'gltf', 'glb', '3ds', 'uasset', 'umap'],
  shader: ['shader', 'cginc', 'hlsl', 'glsl', 'shadergraph', 'gdshader', 'usf', 'ush', 'compute'],
  script: ['cs', 'gd', 'cpp', 'h', 'hpp', 'c', 'js', 'py', 'lua'],
};
const BY_EXT = new Map(Object.entries(EXT).flatMap(([k, v]) => v.map((e) => [e, k])));
export const extOf = (p) => (p.includes('.') ? p.split('.').pop().toLowerCase() : '');
export const categoryOf = (p) => BY_EXT.get(extOf(p)) || 'other';

export function pngSize(b) {
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

export function classify(entries) {
  const stats = { texture: 0, audio: 0, model: 0, shader: 0, script: 0, other: 0, totalBytes: 0, files: entries.length };
  const exts = {};
  for (const e of entries) {
    stats[categoryOf(e.path)]++;
    stats.totalBytes += e.size || 0;
    const x = extOf(e.path);
    if (x) exts[x] = (exts[x] || 0) + 1;
  }
  stats.exts = exts;
  return stats;
}

const SCRIPT_INFO = {
  unity: ['C# (Mono/IL2CPP)', 'Hay que reescribir la lógica en C/C++ con libctru/citro2d.'],
  godot: ['GDScript / C#', 'Hay que reescribir la lógica en C/C++ con libctru/citro2d.'],
  unreal: ['C++ / Blueprints', 'Unreal no tiene runtime para ARM11; la lógica debe reescribirse con libctru/citro3d.'],
};

/**
 * @param {{engine:string, version?:string|null, stats:object, textures?:{path:string,w:number,h:number}[], pe?:object}} i
 * @returns {{verdict:'portable'|'port'|'blocked', findings:{level:'ok'|'info'|'warn'|'error', title:string, detail:string}[]}}
 */
export function buildReport({ engine, version = null, stats, textures = [], pe = null }) {
  const f = [];
  const add = (level, title, detail) => f.push({ level, title, detail });

  if (engine === 'exe') {
    if (!pe || !pe.valid) {
      add('error', 'No es un ejecutable PE válido', 'No se pudo leer la cabecera del .exe.');
    } else if (pe.managed) {
      add('warn', 'Ensamblado .NET (administrado)', `Arquitectura ${pe.machine}. Se podría portar a partir del código fuente, pero el binario no se ejecuta en 3DS.`);
    } else {
      add('error', 'Binario nativo de Windows', `Arquitectura ${pe.machine}, subsistema ${pe.subsystem}. Un .exe x86/x64 no puede convertirse automáticamente a ARM11 de 3DS: se necesita el código fuente o el proyecto del motor.`);
    }
    add('info', 'Qué hacer', 'Importa el proyecto original (Unity, Godot o Unreal) o recrea el juego en el editor de C3DS.');
    return { verdict: 'blocked', findings: f };
  }
  if (engine === 'unknown') {
    add('error', 'Proyecto no reconocido', 'Se buscó ProjectSettings/ (Unity), project.godot (Godot), *.uproject (Unreal) o un único .exe.');
    return { verdict: 'blocked', findings: f };
  }

  add('ok', 'Motor detectado', `${engine}${version ? ` ${version}` : ''} · ${stats.files} archivos · ${(stats.totalBytes / 1048576).toFixed(1)} MB`);

  const [lang, advice] = SCRIPT_INFO[engine];
  if (stats.script > 0 || engine !== 'unknown') add('warn', `Scripts en ${lang}`, `${stats.script} archivo(s) de código. ${advice}`);

  if (stats.shader > 0) add('error', 'Shaders incompatibles', `${stats.shader} shader(s). La GPU PICA200 solo admite shaders en ensamblador PICA: deben reescribirse a mano.`);
  if (stats.model > 0) add('warn', 'Modelos 3D', `${stats.model} modelo(s)/escena(s). Hay que convertirlos a formato citro3d y reducir polígonos. Los juegos 2D se portan mucho mejor.`);

  const bad = textures.filter((t) => !isPow2(t.w) || !isPow2(t.h) || t.w > LIMITS.texture.maxSize || t.h > LIMITS.texture.maxSize);
  if (bad.length) {
    add('warn', 'Texturas fuera de límites', `${bad.length} PNG con tamaño no válido (potencia de 2, máx ${LIMITS.texture.maxSize}px). Se reescalarán. Ej.: ${bad.slice(0, 3).map((t) => `${t.path} (${t.w}×${t.h})`).join(', ')}`);
  } else if (stats.texture > 0) {
    add('ok', 'Texturas', `${stats.texture} textura(s)${textures.length ? `; ${textures.length} PNG comprobados dentro de límites` : ''}.`);
  }
  if (stats.texture - textures.length > 0 && stats.texture > 0) add('info', 'Texturas sin comprobar', 'Solo se miden dimensiones de PNG; el resto se validará al convertir.');

  if (stats.audio > 0) add('info', 'Audio', `${stats.audio} archivo(s). WAV/OGG/MP3 son viables; bancos FMOD/Wwise (.bank/.wem) no.`);

  const mb = stats.totalBytes / 1048576;
  if (mb > LIMITS.assetsWarnMB) add('warn', 'Proyecto muy grande', `${mb.toFixed(0)} MB. La 3DS tiene ~${LIMITS.ramMB.old} MB de RAM (Old): habrá que recortar y cargar recursos bajo demanda.`);

  const errors = f.filter((x) => x.level === 'error').length;
  return { verdict: errors ? 'port' : 'portable', findings: f };
}

export { parsePE };
