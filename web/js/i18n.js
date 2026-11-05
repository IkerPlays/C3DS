// Interfaz en español (por defecto) o inglés. La traducción se aplica sobre el DOM (textos y atributos):
// el diccionario está en i18n-en.js. Los datos del proyecto (nombres, textos de los juegos) no se traducen.
import { EN, PATTERNS } from './i18n-en.js';

const KEY = 'c3ds:lang';
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];

export function getLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'es') { try { localStorage.setItem(KEY, q); } catch { /* ok */ } return q; }
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'es') return saved;
    return /^es\b/i.test(navigator.language || 'es') ? 'es' : 'en'; // primera visita: el idioma del navegador
  } catch { return 'es'; }
}

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* ok */ }
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.href = u.toString(); } else location.reload(); // recarga con el idioma nuevo
}

/** Traduce una cadena al inglés (conserva los espacios de los extremos). Devuelve la misma si no la conoce. */
export function translate(str) {
  if (typeof str !== 'string') return str;
  const t = str.replace(/\s+/g, ' ').trim();
  if (!t) return str;
  let out = Object.prototype.hasOwnProperty.call(EN, t) ? EN[t] : null;
  if (out == null) for (const [re, fn] of PATTERNS) { const m = re.exec(t); if (m) { out = fn(m); break; } }
  if (out == null) return str;
  return str.slice(0, str.length - str.trimStart().length) + out + str.slice(str.trimEnd().length);
}

/** Texto según el idioma actual (para cadenas generadas por código). */
export const tr = (es, en) => (getLang() === 'en' ? en : es);

function translateNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)) return;
    const out = translate(node.nodeValue); if (out !== node.nodeValue) node.nodeValue = out;
    return;
  }
  if (node.nodeType !== 1) return;
  for (const a of ATTRS) { const v = node.getAttribute?.(a); if (v) { const out = translate(v); if (out !== v) node.setAttribute(a, out); } }
  if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
  for (const c of node.childNodes) translateNode(c);
}

/** Aplica el inglés a toda la página y a todo lo que se añada después. No hace nada si el idioma es el español. */
export function startI18n() {
  if (getLang() !== 'en') return false;
  document.documentElement.lang = 'en';
  translateNode(document.documentElement);
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach(translateNode);
      else if (r.type === 'characterData') translateNode(r.target);
      else if (r.type === 'attributes') translateNode(r.target);
    }
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return true;
}

/** Botón ES/EN de la cabecera. */
export function mountLangToggle(btn) {
  const cur = getLang();
  btn.textContent = cur === 'en' ? 'EN' : 'ES';
  btn.title = cur === 'en' ? 'Language: English (click for Español)' : 'Idioma: Español (clic para English)';
  btn.setAttribute('aria-label', btn.title);
  btn.addEventListener('click', () => setLang(cur === 'en' ? 'es' : 'en'));
}
