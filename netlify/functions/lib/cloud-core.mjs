// Lógica de la compilación en la nube. Recibe un PROYECTO (datos, no código), regenera los archivos con las
// plantillas de confianza del propio sitio y lanza el workflow `cloud-build.yml` de GitHub Actions.
// El resultado es un artifact descargable (NO se crea ninguna release). El token vive solo en variables de Netlify.
import { createZip } from '../../../web/js/zip.js';
import { exportFiles } from '../../../web/js/codegen.js';
import { validate, migrate, slug } from '../../../web/js/model.js';
import { bytesToBase64 } from '../../../web/js/bytes.js';
import { buildHtml5 } from '../../../web/js/html5.js';

export const BRANCH = 'cloud-builds';
export const WORKFLOW = 'cloud-build.yml';
export const MAX_BODY_BYTES = 4.5 * 1024 * 1024; // las Functions de Netlify aceptan ~6 MB
export const MAX_ACTIVE = 3;
const ID_RE = /^[a-f0-9]{16}$/;
export const TARGETS = ['3ds', 'windows'];

const json = (status, body) => ({ status, body });
const randomId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

export function createGithub({ token, repo, fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repo}`;
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'c3ds-cloud-build' };
  return {
    async call(path, { method = 'GET', body, redirect } = {}) {
      const res = await fetchImpl(`${base}${path}`, { method, headers: body ? { ...headers, 'content-type': 'application/json' } : headers, body: body ? JSON.stringify(body) : undefined, redirect });
      return res;
    },
  };
}

async function must(res, what) {
  if (res.ok) return res.status === 204 ? null : res.json();
  const text = await res.text().catch(() => '');
  throw Object.assign(new Error(`GitHub (${what}): ${res.status}`), { status: 502, detail: text.slice(0, 200) });
}

async function ensureBranch(gh) {
  const have = await gh.call(`/git/ref/heads/${BRANCH}`);
  if (have.ok) return;
  const repo = await must(await gh.call(''), 'repo');
  const ref = await must(await gh.call(`/git/ref/heads/${repo.default_branch}`), 'ref base');
  const created = await gh.call('/git/refs', { method: 'POST', body: { ref: `refs/heads/${BRANCH}`, sha: ref.object.sha } });
  if (!created.ok && created.status !== 422) await must(created, 'crear rama');
}

async function listRuns(gh, query) {
  const data = await must(await gh.call(`/actions/workflows/${WORKFLOW}/runs?${query}`), 'runs');
  return data.workflow_runs || [];
}

async function findRun(gh, id) {
  const runs = await listRuns(gh, 'event=workflow_dispatch&per_page=40');
  return runs.find((r) => `${r.display_title} ${r.name}`.includes(id)) || null;
}

export async function startBuild(gh, raw, target = '3ds') {
  if (!TARGETS.includes(target)) return json(400, { error: 'Destino no válido.' });
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'El proyecto es demasiado grande para compilarlo en la nube (máx. ≈4 MB). Reduce imágenes o sonidos.' });
  let project;
  try { project = migrate(JSON.parse(raw)); } catch { return json(400, { error: 'Proyecto no válido.' }); }
  const errors = validate(project).filter((x) => x.level === 'error');
  if (errors.length) return json(400, { error: `El proyecto tiene errores: ${errors.map((e) => e.text).join(' ')}` });

  const active = (await listRuns(gh, 'status=in_progress&per_page=30')).length + (await listRuns(gh, 'status=queued&per_page=30')).length;
  if (active >= MAX_ACTIVE) return json(429, { error: 'Hay muchas compilaciones en curso. Inténtalo en unos minutos.' });

  // 3ds: proyecto C regenerado en el servidor. windows: el juego HTML5 que el workflow empaqueta en un .exe (Tauri).
  const files = target === 'windows'
    ? [{ path: `${slug(project.name)}/index.html`, content: buildHtml5(project) }]
    : exportFiles(project).filter((f) => !f.path.includes('/.github/'));
  const zip = createZip(files);
  const id = randomId();
  await ensureBranch(gh);
  await must(await gh.call(`/contents/jobs/${id}.zip`, { method: 'PUT', body: { message: `cloud build ${id}`, content: bytesToBase64(zip), branch: BRANCH } }), 'subir proyecto');
  const repo = await must(await gh.call(''), 'repo');
  await must(await gh.call(`/actions/workflows/${WORKFLOW}/dispatches`, { method: 'POST', body: { ref: repo.default_branch, inputs: { job_id: id, target } } }), 'lanzar workflow');
  return json(202, { id, name: slug(project.name), target });
}

export async function status(gh, id) {
  if (!ID_RE.test(id)) return json(400, { error: 'Id no válido.' });
  const run = await findRun(gh, id);
  if (!run) return json(200, { status: 'queued' });
  if (run.status !== 'completed') return json(200, { status: run.status === 'in_progress' ? 'running' : 'queued' });
  return json(200, run.conclusion === 'success' ? { status: 'success' } : { status: 'failed', url: run.html_url });
}

export async function download(gh, id) {
  if (!ID_RE.test(id)) return json(400, { error: 'Id no válido.' });
  const run = await findRun(gh, id);
  if (!run || run.status !== 'completed' || run.conclusion !== 'success') return json(409, { error: 'La compilación aún no ha terminado.' });
  const arts = await must(await gh.call(`/actions/runs/${run.id}/artifacts`), 'artifacts');
  const art = (arts.artifacts || []).find((a) => a.name === `build-${id}` && !a.expired);
  if (!art) return json(404, { error: 'El archivo ya no está disponible (caduca en 1 día).' });
  const res = await gh.call(`/actions/artifacts/${art.id}/zip`, { redirect: 'manual' });
  const url = res.headers.get('location');
  if (!url || ![301, 302, 303, 307].includes(res.status)) return json(502, { error: 'No se pudo obtener el enlace de descarga.' });
  return json(200, { url });
}

/** Enrutador: devuelve { status, body }. `env` = { C3DS_GITHUB_TOKEN, C3DS_REPO }. */
export async function route({ method, pathname, search = '', body, env, fetchImpl }) {
  const token = env.C3DS_GITHUB_TOKEN;
  if (!token) return json(503, { error: 'La compilación en la nube no está configurada en este sitio.' });
  const gh = createGithub({ token, repo: env.C3DS_REPO || 'IkerPlays/C3DS', fetchImpl });
  const parts = pathname.replace(/^\/api\/build\/?/, '').split('/').filter(Boolean);
  try {
    if (method === 'POST' && parts.length === 0) return await startBuild(gh, body || '', new URLSearchParams(search).get('target') || '3ds');
    if (method === 'GET' && parts.length === 1) return await status(gh, parts[0]);
    if (method === 'GET' && parts.length === 2 && parts[1] === 'download') return await download(gh, parts[0]);
    return json(404, { error: 'No encontrado.' });
  } catch (e) {
    return json(e.status || 500, { error: e.status === 502 ? 'Error al hablar con GitHub.' : 'Error interno.' });
  }
}
