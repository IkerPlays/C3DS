// Iconos SVG propios (24×24, trazo con currentColor). Sustituyen a los emojis para que se vean igual en todos los sistemas.
const S = (d) => d; // marcador de legibilidad
const F = (d) => d.replace(/<path /g, '<path fill="currentColor" stroke="none" ');

const ICONS = {
  // ---- sistemas operativos ----
  windows: F('<path d="M3 5.6 10.6 4.5v7H3zM11.8 4.3 21 3v8.5h-9.2zM3 12.5h7.6v7L3 18.4zM11.8 12.5H21V21l-9.2-1.3z"/>'),
  macos: S('<rect x="3.5" y="5" width="17" height="11.5" rx="1.8"/><path d="M2 19.5h20M9.5 19.5l.6-3M14.5 19.5l-.6-3"/>'),
  linux: S('<path d="M12 3c-2.3 0-3.6 2-3.6 4.6 0 1.2-.8 2.2-1.5 3.3-1 1.6-1.5 3.3-1.5 5.1C5.4 19 8 21 12 21s6.6-2 6.6-5c0-1.8-.5-3.5-1.5-5.1-.7-1.1-1.5-2.1-1.5-3.3C15.6 5 14.3 3 12 3z"/><path d="M9.6 14.2c0 2.4 1 3.8 2.4 3.8s2.4-1.4 2.4-3.8"/><path d="M11 9.3l1 .8 1-.8"/><circle cx="10.4" cy="7.2" r=".7" fill="currentColor"/><circle cx="13.6" cy="7.2" r=".7" fill="currentColor"/><path d="M6.6 19.6l-1.5 1.2M17.4 19.6l1.5 1.2"/>'),
  android: S('<path d="M5.5 14.5a6.5 6.5 0 0 1 13 0z"/><path d="M8.2 6.3 7 4.4M15.8 6.3 17 4.4"/><circle cx="9.6" cy="11.6" r=".8" fill="currentColor"/><circle cx="14.4" cy="11.6" r=".8" fill="currentColor"/><path d="M5.5 16.2v3.5A1.3 1.3 0 0 0 6.8 21h10.4a1.3 1.3 0 0 0 1.3-1.3v-3.5M3.3 14.5v4M20.7 14.5v4"/>'),
  ios: S('<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 5.2h3M10.5 18.6h3"/>'),
  web: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>'),
  // ---- interfaz ----
  pencil: S('<path d="M4 20l1-4.2L16.3 4.5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.8L8.2 19z"/><path d="M14.5 6.5l3 3"/>'),
  download: S('<path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M4.5 19.5h15"/>'),
  lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  save: S('<path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>'),
  gamepad: S('<rect x="2.5" y="7" width="19" height="10.5" rx="4.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.2" r=".9" fill="currentColor"/><circle cx="18" cy="13.4" r=".9" fill="currentColor"/>'),
  blocks: S('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"/><path d="M16.8 13v7.5M13 16.8h7.5"/>'),
  play: S('<circle cx="12" cy="12" r="9"/><path d="M10 8.4l5.6 3.6-5.6 3.6z"/>'),
  image: S('<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4.5"/>'),
  logic: S('<circle cx="6" cy="6.5" r="2.5"/><circle cx="18" cy="6.5" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.5 6.5h7M7.3 8.7l3.5 6.9M16.7 8.7l-3.5 6.9"/>'),
  package: S('<path d="M3.5 7.6 12 3l8.5 4.6v8.8L12 21l-8.5-4.6z"/><path d="M3.5 7.6 12 12.2l8.5-4.6M12 12.2V21"/>'),
  convert: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4M19.5 4v4.5H15"/>'),
  // ---- plantillas y lecciones ----
  coin: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><path d="M12 9.6v4.8"/>'),
  pong: S('<rect x="3.5" y="8" width="3" height="8" rx="1"/><circle cx="14.5" cy="12" r="2"/><path d="M19 4v16" stroke-dasharray="2 2.6"/>'),
  comet: S('<circle cx="16.5" cy="7.5" r="3.5"/><path d="M14 10 4.5 19.5M12.5 9 6 11.5M15 12.5 12.5 18"/>'),
  joystick: S('<circle cx="12" cy="6" r="3"/><path d="M12 9v6"/><rect x="4" y="15" width="16" height="5" rx="2"/>'),
  runner: S('<circle cx="14.5" cy="4.8" r="1.9"/><path d="M11.5 9.5 9 13l3.5 2.5-1 5M11.5 9.5l4 .5 2 3M9 13l-3.5 1M5 20.5h14"/>'),
  move: S('<path d="M12 3v18M3 12h18M12 3l-2.5 2.8M12 3l2.5 2.8M12 21l-2.5-2.8M12 21l2.5-2.8M3 12l2.8-2.5M3 12l2.8 2.5M21 12l-2.8-2.5M21 12l-2.8 2.5"/>'),
  burst: S('<path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/><circle cx="12" cy="12" r="2.2"/>'),
  hash: S('<path d="M9 3.5 7.5 20.5M16.5 3.5 15 20.5M4 8.5h16.5M3.5 15.5H20"/>'),
  clapper: S('<rect x="3" y="9" width="18" height="11" rx="1.8"/><path d="M3 9l2.5-5 3 1.4L6 10.4M10 5.4l3 1.4-2.5 5M14.5 6.8 17.5 8.2 15 13"/>'),
  sound: S('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  // ---- varios ----
  trash: S('<path d="M4.5 6.5h15M9.5 6.5V4.2h5v2.3M6.5 6.5l.8 13a1.3 1.3 0 0 0 1.3 1.2h6.8a1.3 1.3 0 0 0 1.3-1.2l.8-13M10 10.5v6.5M14 10.5v6.5"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>'),
  moon: S('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),
  contrast: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>'),
  scissors: S('<circle cx="6" cy="6.5" r="2.6"/><circle cx="6" cy="17.5" r="2.6"/><path d="M8 8.2 20 18M8 15.8 20 6"/>'),
  repeat: S('<path d="M17 3.5l3 3-3 3M4 11V9.5A3 3 0 0 1 7 6.5h13M7 20.5l-3-3 3-3M20 13v1.5a3 3 0 0 1-3 3H4"/>'),
  undo: S('<path d="M9 5 4 10l5 5M4.5 10H15a5 5 0 0 1 0 10h-3"/>'),
  redo: S('<path d="M15 5l5 5-5 5M19.5 10H9a5 5 0 0 0 0 10h3"/>'),
  restart: S('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4M4.5 4v4.5H9"/>'),
  rect: S('<rect x="4" y="7" width="16" height="10" rx="1.5"/>'),
  btnobj: S('<rect x="3.5" y="8" width="17" height="8" rx="4"/><path d="M8.5 12h7"/>'),
  keyboard: S('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>'),
  folder: S('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.3h8.8A1.5 1.5 0 0 1 21 8.8v9.7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>'),
  cloud: S('<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.4A3.8 3.8 0 0 1 17.5 18.5z"/>'),
  link: S('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  camera: S('<path d="M4 8h3.3l1.5-2.5h6.4L16.7 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  waves: S('<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>'),
  wave: S('<path d="M8 12.5 6 8.5a1.3 1.3 0 0 1 2.3-1.2l1.3 2.3M10 9.2l.6-3.8a1.3 1.3 0 0 1 2.5.5L12.6 10M13 10l.8-2.7a1.3 1.3 0 0 1 2.5.7L15.5 12M16 12l2.3-1.7a1.3 1.3 0 0 1 1.6 2L16 17a5 5 0 0 1-7.4.3L6 14.5"/>'),
};

export function iconSvg(name, size = 24) {
  const body = ICONS[name] || ICONS.blocks;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Elemento <span class="svg-icon"> con el icono. */
export function icon(name, size = 24, cls = '') {
  const el = document.createElement('span');
  el.className = `svg-icon ${cls}`.trim();
  el.setAttribute('data-icon-name', name);
  el.innerHTML = iconSvg(name, size);
  return el;
}

/** Sustituye <span data-icon="nombre" [data-size="20"]> por el SVG correspondiente. */
export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (el.firstChild?.nodeName === 'svg') continue;
    el.classList.add('svg-icon');
    el.innerHTML = iconSvg(el.dataset.icon, Number(el.dataset.size) || 24);
  }
}

export const iconNames = () => Object.keys(ICONS);
