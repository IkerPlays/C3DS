// Cliente de la compilación en la nube (Netlify Function + GitHub Actions). Los archivos NO se publican como release.
async function call(path, opts) {
  let res;
  try { res = await fetch(path, opts); } catch { throw new Error('Sin conexión con el servicio de compilación.'); }
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw Object.assign(new Error(data?.error || `Error ${res.status}`), { status: res.status });
  return data;
}

export const startBuild = (project) => call('/api/build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project) });
export const buildStatus = (id) => call(`/api/build/${encodeURIComponent(id)}`);
export const buildDownload = (id) => call(`/api/build/${encodeURIComponent(id)}/download`);

export const STATUS_LABEL = { queued: 'En cola…', running: 'Compilando…', success: 'Listo', failed: 'Falló la compilación' };
