// Pequeñas utilidades de interfaz: creación de DOM, avisos y diálogos.
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (['value', 'checked', 'disabled', 'selected', 'hidden', 'textContent', 'innerHTML'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  // Accesibilidad: un botón/etiqueta solo con icono usa su título como nombre accesible.
  if ((tag === 'button' || tag === 'label') && props?.title && !props['aria-label'] && !(e.textContent || '').trim()) e.setAttribute('aria-label', props.title);
  return e;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(text, kind = 'info', ms = 3500) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = h('div', { class: `toast ${kind}`, role: 'status' }, text);
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Diálogo modal simple. `body` es un nodo; `actions` = [{label, kind, onClick}]. Devuelve { close }. */
export function dialog(title, body, actions = [{ label: 'Cerrar' }]) {
  const dlg = h('dialog', { class: 'dlg' });
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.append(
    h('header', {}, h('h3', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onClick: close }, '✕')),
    h('div', { class: 'dlg-body' }, body),
    h('footer', {}, actions.map((a) => h('button', { class: `btn ${a.kind || ''}`, disabled: a.disabled, onClick: async () => { const keep = await a.onClick?.(); if (keep !== false) close(); } }, a.label))),
  );
  dlg.addEventListener('cancel', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return { close, el: dlg };
}

export function download(bytesOrText, filename, mime = 'application/octet-stream') {
  const blob = new Blob([bytesOrText], { type: mime });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
