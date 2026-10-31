// Importación de escenas de Godot (.tscn, formato de texto): sprites, textos, rectángulos de color y botones -> objetos del editor.
import { makeObject, makeScene, slug } from './model.js';

const num = (s) => Number(s);
const vec = (s) => { const m = /Vector2i?\(\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*\)/.exec(s || ''); return m ? [num(m[1]), num(m[2])] : null; };
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
const color = (s) => { const m = /Color\(\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)/.exec(s || ''); return m ? `#${hex2(num(m[1]))}${hex2(num(m[2]))}${hex2(num(m[3]))}` : null; };
const str = (s) => { const m = /^"((?:[^"\\]|\\.)*)"$/.exec((s || '').trim()); return m ? m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"') : null; };

/** Tamaño de viewport definido en project.godot (por defecto 1152×648). */
export function parseViewport(projectGodot = '') {
  const w = /window\/size\/viewport_width\s*=\s*(\d+)/.exec(projectGodot); const h = /window\/size\/viewport_height\s*=\s*(\d+)/.exec(projectGodot);
  return { w: w ? num(w[1]) : 1152, h: h ? num(h[1]) : 648 };
}

/** @returns {{resources: Map<string,string>, nodes: object[]}} nodos con posición absoluta (px de Godot). */
export function parseTscn(text) {
  const resources = new Map(); const nodes = [];
  let cur = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      cur = null;
      if (line.startsWith('[ext_resource')) {
        const path = /path="([^"]+)"/.exec(line)?.[1]; const id = /\bid="([^"]+)"/.exec(line)?.[1];
        if (path && id) resources.set(id, path);
      } else if (line.startsWith('[node ')) {
        const name = /name="([^"]*)"/.exec(line)?.[1] ?? 'Nodo';
        const type = /type="([^"]*)"/.exec(line)?.[1] ?? '';
        const parent = /parent="([^"]*)"/.exec(line)?.[1] ?? null;
        cur = { name, type, parent, props: {} };
        nodes.push(cur);
      }
      continue;
    }
    if (cur) { const m = /^([A-Za-z_][\w/]*)\s*=\s*(.*)$/.exec(line); if (m) cur.props[m[1]] = m[2]; }
  }
  // Posiciones absolutas: la ruta de un nodo es "padre/nombre"; el raíz no tiene parent.
  const pos = new Map();
  for (const n of nodes) {
    const key = n.parent == null ? '' : n.parent === '.' ? n.name : `${n.parent}/${n.name}`;
    const parentKey = n.parent == null ? null : n.parent === '.' ? '' : n.parent;
    const base = parentKey != null && pos.has(parentKey) ? pos.get(parentKey) : [0, 0];
    const p = vec(n.props.position) || [num(n.props.offset_left) || 0, num(n.props.offset_top) || 0];
    n.abs = [base[0] + p[0], base[1] + p[1]];
    pos.set(key, n.abs);
  }
  return { resources, nodes };
}

/**
 * Convierte los nodos de una escena en objetos del editor.
 * @param {object} p proyecto destino  @param {string} name nombre de la escena
 * @param {{resources:Map, nodes:object[]}} parsed @param {{w:number,h:number}} vp
 * @param {Map<string,{id:number,w:number,h:number}>} images textura (ruta res://) -> asset ya creado
 */
export function sceneFromTscn(p, name, parsed, vp, images) {
  const sc = makeScene(p, name.slice(0, 24) || 'Escena');
  const k = Math.min(400 / vp.w, 240 / vp.h);
  const skipped = [];
  for (const n of parsed.nodes) {
    if (sc.objects.length >= 60) { skipped.push(`${n.name} (límite)`); continue; }
    const sc2 = vec(n.props.scale) || [1, 1];
    const at = (w, h) => ({ x: Math.round(n.abs[0] * k), y: Math.round(n.abs[1] * k), w: Math.max(4, Math.round(w * k)), h: Math.max(4, Math.round(h * k)) });
    if (['Sprite2D', 'TextureRect', 'Sprite', 'TextureButton'].includes(n.type) && !n.props.texture) { skipped.push(`${n.name} (sin textura)`); continue; }
    if (['Sprite2D', 'TextureRect', 'Sprite', 'TextureButton'].includes(n.type)) {
      const id = /ExtResource\("([^"]+)"\)/.exec(n.props.texture)?.[1];
      const img = images.get(parsed.resources.get(id));
      if (!img) { skipped.push(`${n.name} (sin textura)`); continue; }
      const centered = n.type === 'Sprite2D' || n.type === 'Sprite';
      const g = at(img.nativeW * sc2[0], img.nativeH * sc2[1]);
      sc.objects.push(makeObject(p, 'sprite', { name: n.name.slice(0, 30), image: img.id, ...g, x: centered ? g.x - Math.round(g.w / 2) : g.x, y: centered ? g.y - Math.round(g.h / 2) : g.y }));
    } else if (['Label', 'RichTextLabel'].includes(n.type) && str(n.props.text) != null) {
      const g = at(0, 0);
      sc.objects.push(makeObject(p, 'text', { name: n.name.slice(0, 30), x: g.x, y: g.y, text: str(n.props.text).slice(0, 80), color: color(n.props['theme_override_colors/font_color']) || '#ffffff' }));
    } else if (['ColorRect', 'Panel', 'PanelContainer'].includes(n.type)) {
      const size = vec(n.props.size) || [(num(n.props.offset_right) - num(n.props.offset_left)) || 50, (num(n.props.offset_bottom) - num(n.props.offset_top)) || 50];
      sc.objects.push(makeObject(p, 'rect', { name: n.name.slice(0, 30), ...at(size[0], size[1]), color: color(n.props.color) || '#5f574f' }));
    } else if (['Button', 'LinkButton', 'CheckButton'].includes(n.type)) {
      const size = vec(n.props.size) || [(num(n.props.offset_right) - num(n.props.offset_left)) || 120, (num(n.props.offset_bottom) - num(n.props.offset_top)) || 40];
      const g = at(size[0], size[1]);
      sc.objects.push(makeObject(p, 'button', { name: n.name.slice(0, 30), x: Math.min(g.x, 320 - g.w), y: g.y, w: Math.min(g.w, 320), h: g.h, text: (str(n.props.text) || n.name).slice(0, 40) }));
    }
  }
  for (const o of sc.objects) { const s = o.screen === 'bottom' ? { w: 320, h: 240 } : { w: 400, h: 240 }; if (o.type !== 'text') { o.w = Math.min(o.w, s.w); o.h = Math.min(o.h, s.h); } o.x = Math.max(0, Math.min(s.w - (o.type === 'text' ? 8 : o.w), o.x)); o.y = Math.max(0, Math.min(s.h - (o.type === 'text' ? 12 : o.h), o.y)); }
  return { scene: sc, skipped };
}

export const sceneNameFromPath = (path) => slug(path.split('/').pop().replace(/\.tscn$/i, '')).replace(/-/g, ' ') || 'escena';
