// Importación de escenas de Unity 2D (.unity, YAML de texto): GameObjects con SpriteRenderer -> sprites del editor.
// Unidades: cámara ortográfica por defecto (tamaño 5 = 10 unidades de alto) sobre 240 px => 24 px por unidad.
import { makeObject, makeScene } from './model.js';

export const PX_PER_UNIT = 24;

/** Divide el YAML en documentos "--- !u!<clase> &<fileID>". */
export function splitDocs(text) {
  const docs = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^--- !u!(\d+) &(-?\d+)/.exec(line);
    if (m) { cur = { cls: Number(m[1]), id: m[2], lines: [] }; docs.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return docs;
}

const field = (lines, key) => { for (const l of lines) { const m = new RegExp(`^\\s{2}${key}:\\s*(.*)$`).exec(l); if (m) return m[1].trim(); } return null; };
const fileId = (s) => /fileID:\s*(-?\d+)/.exec(s || '')?.[1] ?? null;
const vec = (s) => { const m = /x:\s*(-?[\d.eE+-]+),\s*y:\s*(-?[\d.eE+-]+)/.exec(s || ''); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };

/** Devuelve [{name, x, y, scaleX, scaleY, guid, color}] con posición en unidades de mundo. */
export function parseUnityScene(text) {
  const docs = splitDocs(text);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const transforms = new Map(); // gameObjectId -> {pos, scale, father}
  for (const d of docs.filter((x) => x.cls === 4)) {
    const go = fileId(field(d.lines, 'm_GameObject'));
    transforms.set(go, { id: d.id, pos: vec(field(d.lines, 'm_LocalPosition')), scale: vec(field(d.lines, 'm_LocalScale')), father: fileId(field(d.lines, 'm_Father')) });
  }
  const worldOf = (goId, depth = 0) => {
    const t = transforms.get(goId); if (!t) return [0, 0];
    if (!t.father || t.father === '0' || depth > 20) return t.pos;
    const parentGo = [...transforms.entries()].find(([, v]) => v.id === t.father)?.[0];
    const pw = parentGo ? worldOf(parentGo, depth + 1) : [0, 0];
    return [pw[0] + t.pos[0], pw[1] + t.pos[1]];
  };
  const out = [];
  for (const d of docs.filter((x) => x.cls === 212)) { // SpriteRenderer
    const go = fileId(field(d.lines, 'm_GameObject'));
    const goDoc = byId.get(go);
    const name = goDoc ? (field(goDoc.lines, 'm_Name') || 'Sprite') : 'Sprite';
    const spriteLine = d.lines.find((l) => /^\s{2}m_Sprite:/.test(l)) || '';
    const guid = /guid:\s*([0-9a-f]{32})/.exec(spriteLine)?.[1] ?? null;
    const c = /m_Color:\s*\{r:\s*([\d.]+),\s*g:\s*([\d.]+),\s*b:\s*([\d.]+)/.exec(d.lines.join('\n'));
    const t = transforms.get(go);
    const w = worldOf(go);
    out.push({ name, x: w[0], y: w[1], scaleX: t?.scale?.[0] || 1, scaleY: t?.scale?.[1] || 1, guid, color: c ? [Number(c[1]), Number(c[2]), Number(c[3])] : null });
  }
  return out;
}

/** guid en un .meta: "guid: 0123...". */
export const parseMetaGuid = (text) => /^guid:\s*([0-9a-f]{32})/m.exec(String(text))?.[1] ?? null;

/**
 * @param {Map<string,{id:number,nativeW:number,nativeH:number,ppu?:number}>} images guid -> asset creado
 */
export function sceneFromUnity(p, name, sprites, images) {
  const sc = makeScene(p, name.slice(0, 24) || 'Escena');
  const skipped = [];
  for (const s of sprites) {
    if (sc.objects.length >= 60) { skipped.push(`${s.name} (límite)`); continue; }
    const img = s.guid ? images.get(s.guid) : null;
    const px = (v) => v * PX_PER_UNIT;
    if (img) {
      const w = Math.max(4, Math.round(((img.nativeW / (img.ppu || 100)) * Math.abs(s.scaleX)) * PX_PER_UNIT));
      const h = Math.max(4, Math.round(((img.nativeH / (img.ppu || 100)) * Math.abs(s.scaleY)) * PX_PER_UNIT));
      sc.objects.push(makeObject(p, 'sprite', { name: s.name.slice(0, 30), image: img.id, w, h, x: Math.round(200 + px(s.x) - w / 2), y: Math.round(120 - px(s.y) - h / 2) }));
    } else {
      // Sin textura (sprite integrado de Unity): un rectángulo de color de 1×1 unidad.
      const w = Math.max(4, Math.round(Math.abs(s.scaleX) * PX_PER_UNIT)); const h = Math.max(4, Math.round(Math.abs(s.scaleY) * PX_PER_UNIT));
      const col = s.color ? `#${s.color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}` : '#c2c3c7';
      sc.objects.push(makeObject(p, 'rect', { name: s.name.slice(0, 30), color: col, w, h, x: Math.round(200 + px(s.x) - w / 2), y: Math.round(120 - px(s.y) - h / 2) }));
      skipped.push(`${s.name} (sin textura: se usa un rectángulo)`);
    }
  }
  for (const o of sc.objects) { o.w = Math.min(o.w, 400); o.h = Math.min(o.h, 240); o.x = Math.max(0, Math.min(400 - o.w, o.x)); o.y = Math.max(0, Math.min(240 - o.h, o.y)); }
  return { scene: sc, skipped };
}
