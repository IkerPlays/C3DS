// Despedida: C3DS 1.0.0 es la última versión. Mensaje, números y créditos (se muestra una vez y desde el pie de la web).
import { h, dialog } from './ui.js';
import { TEMPLATES, LESSONS } from './templates.js';
import { EVENTS, ACTIONS } from './rules.js';
import { tr as tr0 } from './i18n.js';
const tr = (es, en) => tr0(es, en).replace(/[`*]/g, ''); // sin marcas de Markdown en el texto
import { icon } from './icons.js';

export const FAREWELL_VERSION = '1.0.0';
const KEY = `c3ds:farewell:${FAREWELL_VERSION}`;

const CREDITS = [
  ['devkitPro · devkitARM · libctru · citro2d · citro3d', 'La base de todo el homebrew de 3DS', 'The foundation of all 3DS homebrew'],
  ['tex3ds · makerom · bannertool', 'Texturas, .cia e iconos', 'Textures, .cia and icons'],
  ['Tauri · Capacitor', 'Apps de escritorio y móviles', 'Desktop and mobile apps'],
  ['Playwright · Node.js · ffmpeg', 'Pruebas y vídeo', 'Tests and video'],
  ['Azahar · Homebrew Launcher · FBI', 'Para probar y jugar en la 3DS', 'To test and play on the 3DS'],
];

export function farewellStats() {
  return { templates: TEMPLATES.length, lessons: LESSONS.length, events: Object.keys(EVENTS).length, actions: Object.keys(ACTIONS).length };
}

export function showFarewell() {
  const st = farewellStats();
  const stat = (n, es, en) => h('div', { class: 'fw-stat' }, h('b', {}, String(n)), h('span', {}, tr(es, en)));
  const body = h('div', { class: 'farewell' },
    h('p', { class: 'fw-lead' }, tr('Esta es la última versión de C3DS.', 'This is the last version of C3DS.')),
    h('p', {}, tr(
      'Gracias por haber hecho juegos aquí. C3DS nació para que crear un juego de Nintendo 3DS no exigiera montar un toolchain ni saber C, y llega a su versión final con un editor visual, un simulador, un motor con física y cámara, y todo lo que hace falta para llevar tu juego a la consola.',
      'Thank you for making games here. C3DS started so that creating a Nintendo 3DS game would not require setting up a toolchain or knowing C, and it reaches its final version with a visual editor, a simulator, an engine with physics and a camera, and everything needed to take your game to the console.')),
    h('div', { class: 'fw-stats' },
      stat(st.templates, 'plantillas', 'templates'), stat(st.lessons, 'lecciones', 'lessons'),
      stat(st.events, 'eventos', 'events'), stat(st.actions, 'acciones', 'actions')),
    h('h4', {}, tr('Qué pasa ahora', 'What happens now')),
    h('ul', { class: 'fw-list' },
      h('li', {}, tr('No habrá más actualizaciones, pero **todo sigue funcionando**: la web, las apps y tus proyectos (se guardan en tu navegador y puedes exportarlos a `.c3ds.json`).', 'There will be no more updates, but **everything keeps working**: the web app, the apps and your projects (saved in your browser and exportable to `.c3ds.json`).').replace(/\*\*/g, '')),
      h('li', {}, tr('El código es libre: puedes hacer un fork, alojarlo tú mismo o seguir mejorándolo.', 'The code is free: you can fork it, host it yourself or keep improving it.')),
      h('li', {}, tr('Tus juegos exportados (`.3dsx`, `.cia`, HTML5, escritorio) son tuyos y no dependen de C3DS.', 'Your exported games (`.3dsx`, `.cia`, HTML5, desktop) are yours and do not depend on C3DS.'))),
    h('h4', {}, tr('Construido sobre el trabajo de otros', 'Built on the work of others')),
    h('ul', { class: 'fw-credits' }, CREDITS.map(([name, es, en]) => h('li', {}, h('strong', {}, name), h('span', { class: 'muted small' }, ' — ' + tr(es, en))))),
    h('p', { class: 'fw-sign' }, tr('Hasta siempre, y a seguir creando. 🎮', 'So long, and keep creating. 🎮')));
  try { localStorage.setItem(KEY, '1'); } catch { /* ok */ }
  return dialog(tr('Gracias por todo', 'Thanks for everything'), body, [
    { label: tr('Ver el código en GitHub', 'See the code on GitHub'), onClick: () => { window.open('https://github.com/IkerPlays/C3DS', '_blank', 'noopener'); return true; } },
    { label: tr('Cerrar', 'Close'), kind: 'primary' },
  ]);
}

/** Muestra la despedida una sola vez (la primera vez que se abre la web con esta versión). */
export function maybeShowFarewell() {
  try { if (localStorage.getItem(KEY)) return false; } catch { return false; }
  showFarewell();
  return true;
}

/** Tarjeta de la despedida para el Inicio. */
export function farewellCard() {
  return h('div', { class: 'farewell-card', id: 'farewell-card' },
    icon('gamepad', 28),
    h('div', {}, h('strong', {}, tr('Última versión', 'Final version')),
      h('p', { class: 'muted' }, tr('C3DS 1.0.0 cierra el camino: gracias por haber creado juegos con él.', 'C3DS 1.0.0 closes the road: thank you for creating games with it.'))),
    h('button', { class: 'btn', id: 'btn-farewell', onClick: showFarewell }, tr('Leer la despedida', 'Read the farewell')));
}
