// Guardado de proyectos en localStorage (varios proyectos + copia de seguridad en archivo).
const INDEX = 'c3ds:projects';
const PREFIX = 'c3ds:project:';
const LAST = 'c3ds:last';

const defaultStore = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function newLocalId() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

export function listProjects(store = defaultStore()) {
  try { return JSON.parse(store?.getItem(INDEX) || '[]'); } catch { return []; }
}

export function saveProject(p, store = defaultStore()) {
  if (!store) return { ok: false, error: 'El navegador no permite guardar localmente.' };
  try {
    p.localId ||= newLocalId();
    const json = JSON.stringify(p);
    store.setItem(PREFIX + p.localId, json);
    const idx = listProjects(store).filter((x) => x.id !== p.localId);
    idx.unshift({ id: p.localId, name: p.name, updated: Date.now(), bytes: json.length });
    store.setItem(INDEX, JSON.stringify(idx));
    store.setItem(LAST, p.localId);
    return { ok: true, bytes: json.length };
  } catch (e) {
    const quota = /quota|exceeded/i.test(`${e?.name} ${e?.message}`);
    return { ok: false, error: quota ? 'No cabe en el almacenamiento local (≈5 MB). Quita imágenes/sonidos grandes o exporta el proyecto a un archivo.' : `No se pudo guardar: ${e?.message || e}` };
  }
}

export function loadProject(id, store = defaultStore()) {
  try { const raw = store?.getItem(PREFIX + id); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function deleteProject(id, store = defaultStore()) {
  try {
    store?.removeItem(PREFIX + id);
    store?.setItem(INDEX, JSON.stringify(listProjects(store).filter((x) => x.id !== id)));
    if (store?.getItem(LAST) === id) store.removeItem(LAST);
    return true;
  } catch { return false; }
}

export function lastProjectId(store = defaultStore()) { try { return store?.getItem(LAST) || null; } catch { return null; } }
