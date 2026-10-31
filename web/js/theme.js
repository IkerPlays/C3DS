// Tema claro / oscuro / automático, recordado en localStorage.
const KEY = 'c3ds:theme';
const ORDER = ['auto', 'light', 'dark'];
const LABEL = { auto: '🌓 Auto', light: '☀️ Claro', dark: '🌙 Oscuro' };

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
  const paint = () => { btn.textContent = LABEL[t]; btn.title = 'Cambiar tema (auto / claro / oscuro)'; };
  paint();
  btn.addEventListener('click', () => {
    t = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, t); } catch { /* sin almacenamiento */ }
    applyTheme(t); paint();
  });
}
