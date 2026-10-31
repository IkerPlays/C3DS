// Tema claro / oscuro / automático, recordado en localStorage.
const KEY = 'c3ds:theme';
const ORDER = ['auto', 'light', 'dark'];
import { icon } from './icons.js';
const LABEL = { auto: ['contrast', 'Auto'], light: ['sun', 'Claro'], dark: ['moon', 'Oscuro'] };

export const getTheme = () => { try { const v = localStorage.getItem(KEY); return ORDER.includes(v) ? v : 'auto'; } catch { return 'auto'; } };

export function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = t === 'light' ? '#f4f5fb' : '#0e1020';
}

export function mountThemeToggle(btn) {
  let t = getTheme();
  applyTheme(t);
  const paint = () => { btn.replaceChildren(icon(LABEL[t][0], 16), ` ${LABEL[t][1]}`); btn.title = 'Cambiar tema (auto / claro / oscuro)'; };
  paint();
  btn.addEventListener('click', () => {
    t = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, t); } catch { /* sin almacenamiento */ }
    applyTheme(t); paint();
  });
}
