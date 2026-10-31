// Importación y análisis de proyectos (Unity / Godot / Unreal / .exe) + conversión de assets para 3DS.
import { h, $, download } from './ui.js';
import { detectEngine, parseEngineVersion, ENGINES } from './detect.js';
import { buildReport, classify, pngSize, extOf } from './analyze.js';
import { parsePE } from './pe.js';
import { readZipEntries, extractZipEntry, createZip } from './zip.js';
import { imageToAsset, audioToWav } from './images.js';
import { slug, newProject, makeScene, nextId, LIMITS } from './model.js';
import { parseTscn, parseViewport, sceneFromTscn, sceneNameFromPath } from './godot.js';

const MAX_FILES = 200000;
const IMG_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);
const AUDIO_EXT = new Set(['wav', 'ogg', 'mp3']);
const MAX_ASSET_BYTES = 8 * 1048576;

async function readDirEntry(entry, prefix, out) {
  if (out.length > MAX_FILES) return;
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push(fromFile(file, prefix + entry.name));
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const c of batch) await readDirEntry(c, `${prefix}${entry.name}/`, out);
    }
  }
}

const fromFile = (file, path = file.webkitRelativePath || file.name) => ({ path, size: file.size, read: async (n) => new Uint8Array(await file.slice(0, n).arrayBuffer()) });

async function entriesFromZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return readZipEntries(bytes).map((e) => ({ path: e.path, size: e.size, read: (n) => extractZipEntry(bytes, e, n) }));
}

const PORTING = `# Guía de portado a 3DS

Los assets de esta carpeta ya cumplen los límites de la consola. La lógica hay que rehacerla (ningún motor tiene runtime para 3DS).

| Si vienes de… | Equivale en C3DS |
|---|---|
| Unity \`Start()\` / Godot \`_ready()\` | Regla “La escena empieza” |
| Unity \`Update()\` / Godot \`_process()\` | Reglas evaluadas 60 veces por segundo |
| \`Input.GetKey\` / \`Input.is_action_pressed\` | “Se pulsa / se mantiene un botón” |
| Colliders y triggers | “Dos objetos chocan” (cajas rectangulares) |
| \`SceneManager.LoadScene\` / \`change_scene\` | Acción “Ir a la escena” |
| Variables de script (puntos, vidas) | Variables del proyecto, texto con {variable} |
| UI con botones | Botones táctiles en la pantalla inferior |

## Pasos
1. Importa estos PNG/WAV en el editor de C3DS (pestaña Importar → “Crear proyecto en el editor”).
2. Recrea escenas colocando sprites; añade reglas.
3. Exporta el proyecto 3DS (.zip) o usa “Compilar en la nube”.
4. Para algo más complejo, edita \`source/main.c\` a mano (libctru + citro2d).

Límites: 64–124 MB de RAM, pantallas 400×240 y 320×240, texturas de hasta 1024×1024 (aquí ≤ 512 en sprites).
`;

export function mountImporter(root, { openInEditor }) {
  const out = $('#report', root);
  let current = null;

  async function analyze(entries) {
    out.hidden = false; out.replaceChildren(h('p', { class: 'muted' }, 'Analizando…'));
    const det = detectEngine(entries.map((e) => e.path));
    const stats = classify(entries);
    let version = null; let pe = null; const textures = [];
    try {
      if (det.versionFile) {
        const e = entries.find((x) => x.path.replace(/\\/g, '/') === det.versionFile) || entries.find((x) => x.path.endsWith(det.versionFile));
        if (e) version = parseEngineVersion(det.engine, new TextDecoder().decode(await e.read(65536)));
      }
      if (det.engine === 'exe') pe = parsePE(await entries[0].read(4096));
      for (const e of entries.filter((x) => extOf(x.path) === 'png').slice(0, 400)) { const s = pngSize(await e.read(32)); if (s) textures.push({ path: e.path, ...s }); }
    } catch (err) { console.warn('Lectura parcial', err); }

    const rep = buildReport({ engine: det.engine, version, stats, textures, pe });
    current = { entries, det };
    const verdicts = {
      portable: 'Sin bloqueos duros: los assets son reutilizables; la lógica hay que portarla.',
      port: 'Requiere un portado importante (ver errores). Parte de los assets sí se reutiliza.',
      blocked: 'No se puede convertir automáticamente.',
    };
    out.replaceChildren(
      h('h3', {}, `Resultado: ${ENGINES[det.engine].label}${version ? ` ${version}` : ''}`),
      h('div', { class: `verdict ${rep.verdict}` }, verdicts[rep.verdict]),
      ...rep.findings.map((f) => h('div', { class: `finding ${f.level}` }, h('b', {}, f.title), h('span', {}, f.detail))));
    const imgs = entries.filter((e) => IMG_EXT.has(extOf(e.path)));
    const auds = entries.filter((e) => AUDIO_EXT.has(extOf(e.path)));
    if (['unity', 'godot', 'unreal'].includes(det.engine) && (imgs.length || auds.length)) {
      const status = h('p', { class: 'muted small' }, `${imgs.length} imágenes y ${auds.length} audios convertibles (PNG/JPG/WebP/BMP/GIF y WAV/OGG/MP3).`);
      out.append(h('div', { class: 'convert' }, h('h4', {}, 'Conversión de assets'), status,
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn primary', id: 'btn-convert', onClick: () => convert(status, false) }, 'Descargar assets listos para 3DS (.zip)'),
          h('button', { class: 'btn', id: 'btn-to-editor', onClick: () => convert(status, true) }, 'Crear proyecto en el editor con estos assets'))));
    }
    const tscns = entries.filter((e) => /\.tscn$/i.test(e.path) && e.size < 2 * 1048576);
    if (det.engine === 'godot' && tscns.length) {
      const st = h('p', { class: 'muted small' }, `${tscns.length} escena(s) .tscn encontradas. Se convierten sprites, textos, rectángulos de color y botones; la lógica (GDScript) hay que rehacerla con reglas.`);
      out.append(h('div', { class: 'convert' }, h('h4', {}, 'Escenas de Godot'), st, h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', id: 'btn-godot-scenes', onClick: () => importGodotScenes(entries, tscns, st) }, 'Crear proyecto con las escenas de Godot'))));
    }
    if (det.engine !== 'unknown') out.append(h('button', { class: 'btn', onClick: () => openInEditor(null) }, 'Empezar un proyecto 3DS nuevo en el editor'));
  }

  async function convert(status, toEditor) {
    if (!current) return;
    const { entries, det } = current;
    const imgs = entries.filter((e) => IMG_EXT.has(extOf(e.path))).slice(0, toEditor ? LIMITS.images : 200);
    const auds = entries.filter((e) => AUDIO_EXT.has(extOf(e.path))).slice(0, toEditor ? LIMITS.sounds : 60);
    const files = []; const skipped = []; const used = new Set();
    const uniq = (base, ext) => { let n = slug(base); let i = 1; while (used.has(`${n}.${ext}`)) n = `${slug(base)}-${++i}`; used.add(`${n}.${ext}`); return n; };
    const assets = { images: [], sounds: [] }; const blobs = {}; let seq = 0;
    let done = 0;
    for (const e of imgs) {
      status.textContent = `Convirtiendo… ${++done}/${imgs.length + auds.length}`;
      try {
        if (e.size > MAX_ASSET_BYTES) throw new Error('muy grande');
        const bytes = await e.read(MAX_ASSET_BYTES);
        // En el ZIP: potencia de 2 (hasta 1024). En el editor: se conserva la proporción (≤ 512).
        const r = await imageToAsset(new Blob([bytes]), toEditor ? {} : { pow2: true, max: 1024 });
        const name = uniq(e.path.split('/').pop().replace(/\.[^.]+$/, ''), 'png');
        files.push({ path: `gfx/${name}.png`, content: r.bytes });
        assets.images.push({ id: ++seq, name: name.slice(0, 24), w: r.w, h: r.h }); blobs[seq] = r.dataURL;
      } catch { skipped.push(e.path); }
    }
    for (const e of auds) {
      status.textContent = `Convirtiendo… ${++done}/${imgs.length + auds.length}`;
      try {
        if (e.size > MAX_ASSET_BYTES) throw new Error('muy grande');
        const raw = await e.read(MAX_ASSET_BYTES);
        const r = await audioToWav(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
        const name = uniq(e.path.split('/').pop().replace(/\.[^.]+$/, ''), 'wav');
        files.push({ path: `sounds/${name}.wav`, content: r.bytes });
        assets.sounds.push({ id: ++seq, name: name.slice(0, 24), seconds: Math.round(r.seconds * 100) / 100 }); blobs[seq] = r.dataURL;
      } catch { skipped.push(e.path); }
    }
    const pngs = files.filter((f) => f.path.startsWith('gfx/')).map((f) => f.path.slice(4));
    if (pngs.length) files.push({ path: 'gfx/sprites.t3s', content: `--atlas -f rgba -z auto\n${pngs.join('\n')}\n` });
    files.push({ path: 'PORTING.md', content: PORTING }, { path: 'informe.txt', content: `Motor: ${ENGINES[det.engine].label}\nImágenes convertidas: ${assets.images.length}\nAudios convertidos: ${assets.sounds.length}\nOmitidos (${skipped.length}):\n${skipped.join('\n')}\n` });
    status.textContent = `Listo: ${assets.images.length} imágenes y ${assets.sounds.length} audios convertidos${skipped.length ? `, ${skipped.length} omitidos (formato no soportado por el navegador o demasiado grandes)` : ''}.`;
    if (toEditor) {
      const p = newProject();
      p.name = 'Proyecto importado'; p.scenes = [makeScene(p, 'Escena 1')]; p.startScene = p.scenes[0].id; p.variables = [];
      p.seq = seq + 1000; p.assets = assets; p.blobs = blobs;
      openInEditor(p);
    } else {
      download(createZip(files.map((f) => ({ path: `assets-3ds/${f.path}`, content: f.content }))), 'assets-3ds.zip', 'application/zip');
    }
  }

  async function importGodotScenes(entries, tscns, status) {
    const p = newProject();
    p.name = 'Proyecto de Godot'; p.scenes = []; p.variables = []; p.assets = { images: [], sounds: [] }; p.blobs = {}; p.seq = 0;
    const godotCfg = entries.find((e) => /(^|\/)project\.godot$/i.test(e.path));
    const vp = parseViewport(godotCfg ? new TextDecoder().decode(await godotCfg.read(65536)) : '');
    const imageCache = new Map(); const skipped = [];
    const byPath = (res) => { const rel = String(res).replace(/^res:\/\//, ''); return entries.find((e) => e.path.replace(/\\/g, '/').endsWith(rel)); };
    let done = 0;
    for (const e of tscns.slice(0, LIMITS.scenes)) {
      status.textContent = `Convirtiendo escenas… ${++done}/${Math.min(tscns.length, LIMITS.scenes)}`;
      const parsed = parseTscn(new TextDecoder().decode(await e.read(2 * 1048576)));
      for (const [, res] of parsed.resources) {
        if (imageCache.has(res) || !/\.(png|jpe?g|webp|bmp)$/i.test(res) || p.assets.images.length >= LIMITS.images) continue;
        const f = byPath(res); if (!f || f.size > MAX_ASSET_BYTES) continue;
        try {
          const probe = await createImageBitmap(new Blob([await f.read(MAX_ASSET_BYTES)]));
          const r = await imageToAsset(new Blob([await f.read(MAX_ASSET_BYTES)]));
          const id = nextId(p);
          p.assets.images.push({ id, name: slug(res.split('/').pop().replace(/\.[^.]+$/, '')).slice(0, 24), w: r.w, h: r.h }); p.blobs[id] = r.dataURL;
          imageCache.set(res, { id, w: r.w, h: r.h, nativeW: probe.width, nativeH: probe.height });
        } catch { skipped.push(res); }
      }
      const { scene, skipped: sk } = sceneFromTscn(p, sceneNameFromPath(e.path), parsed, vp, imageCache);
      skipped.push(...sk.map((x) => `${scene.name}: ${x}`));
      if (scene.objects.length) p.scenes.push(scene);
    }
    if (!p.scenes.length) { status.textContent = 'No se encontró nada convertible en las escenas.'; return; }
    p.startScene = p.scenes[0].id;
    status.textContent = `Listo: ${p.scenes.length} escena(s), ${p.scenes.reduce((n, s) => n + s.objects.length, 0)} objetos${skipped.length ? `; ${skipped.length} elementos omitidos` : ''}.`;
    openInEditor(p);
  }

  async function handleFiles(files) {
    try {
      if (files.length === 1 && /\.zip$/i.test(files[0].name)) return await analyze(await entriesFromZip(files[0]));
      return await analyze(files.map((f) => fromFile(f)));
    } catch (err) {
      out.hidden = false;
      out.replaceChildren(h('div', { class: 'finding error' }, `No se pudo leer: ${err.message}`));
    }
  }

  const drop = $('#drop', root);
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async (e) => {
    const items = [...e.dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    if (items.some((i) => i.isDirectory)) {
      const list = [];
      try { for (const i of items) await readDirEntry(i, '', list); } catch (err) { console.warn(err); }
      return analyze(list);
    }
    handleFiles([...e.dataTransfer.files]);
  });
  $('#pick-dir', root).addEventListener('change', (e) => handleFiles([...e.target.files]));
  $('#pick-file', root).addEventListener('change', (e) => handleFiles([...e.target.files]));
  return { handleFiles };
}
