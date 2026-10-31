import test from 'node:test';
import assert from 'node:assert/strict';
import { route, MAX_BODY_BYTES } from '../../netlify/functions/lib/cloud-core.mjs';
import { newProject } from '../../web/js/model.js';
import { readZipEntries } from '../../web/js/zip.js';

const ID = 'abcdef0123456789';

/** GitHub simulado: registra llamadas y responde según una tabla. */
function fakeGithub(over = {}) {
  const calls = [];
  const state = { runs: [], branch: false, ...over };
  const res = (status, body, headers = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body ?? ''), headers: { get: (k) => headers[k.toLowerCase()] ?? null } });
  const fetchImpl = async (url, opts = {}) => {
    const path = url.replace('https://api.github.com/repos/IkerPlays/C3DS', '');
    calls.push({ method: opts.method || 'GET', path, body: opts.body ? JSON.parse(opts.body) : null, auth: opts.headers.authorization, redirect: opts.redirect });
    const m = opts.method || 'GET';
    if (path === '') return res(200, { default_branch: 'main' });
    if (path === '/git/ref/heads/cloud-builds') return state.branch ? res(200, {}) : res(404, {});
    if (path === '/git/ref/heads/main') return res(200, { object: { sha: 'abc' } });
    if (path === '/git/refs' && m === 'POST') { state.branch = true; return res(201, {}); }
    if (path.startsWith(`/contents/jobs/`) && m === 'PUT') return res(201, {});
    if (path.includes('/dispatches')) return res(204, null);
    if (path.includes('/runs?status=')) return res(200, { workflow_runs: state.active || [] });
    if (path.includes('/runs?event=')) return res(200, { workflow_runs: state.runs });
    if (path.endsWith('/artifacts')) return res(200, { artifacts: state.artifacts || [] });
    if (path.includes('/artifacts/') && path.endsWith('/zip')) return res(302, null, { location: 'https://blob.example/zip?sig=1' });
    return res(500, {});
  };
  return { fetchImpl, calls, state };
}
const env = { C3DS_GITHUB_TOKEN: 'ghp_secret' };

test('sin token: 503 y no se llama a GitHub', async () => {
  const g = fakeGithub();
  const r = await route({ method: 'POST', pathname: '/api/build', body: '{}', env: {}, fetchImpl: g.fetchImpl });
  assert.equal(r.status, 503); assert.equal(g.calls.length, 0);
});

test('iniciar compilación: sube un zip regenerado en el servidor y lanza el workflow', async () => {
  const g = fakeGithub();
  const r = await route({ method: 'POST', pathname: '/api/build', body: JSON.stringify(newProject()), env, fetchImpl: g.fetchImpl });
  assert.equal(r.status, 202); assert.match(r.body.id, /^[a-f0-9]{16}$/);
  const put = g.calls.find((c) => c.method === 'PUT');
  assert.match(put.path, /^\/contents\/jobs\/[a-f0-9]{16}\.zip$/); assert.equal(put.body.branch, 'cloud-builds');
  const names = readZipEntries(new Uint8Array(Buffer.from(put.body.content, 'base64'))).map((e) => e.path);
  assert.ok(names.includes('mi-primer-juego/Makefile') && names.includes('mi-primer-juego/source/main.c'));
  assert.ok(!names.some((n) => n.includes('.github')), 'no se sube ningún workflow del usuario');
  const d = g.calls.find((c) => c.path.includes('/dispatches'));
  assert.deepEqual(d.body, { ref: 'main', inputs: { job_id: r.body.id, target: '3ds' } });
  assert.ok(g.calls.every((c) => c.auth === 'Bearer ghp_secret'));
  assert.ok(g.calls.some((c) => c.path === '/git/refs'), 'crea la rama si no existe');
});

test('rechaza proyectos grandes, inválidos o con errores y limita concurrencia', async () => {
  const g = fakeGithub();
  assert.equal((await route({ method: 'POST', pathname: '/api/build', body: 'x'.repeat(MAX_BODY_BYTES + 1), env, fetchImpl: g.fetchImpl })).status, 413);
  assert.equal((await route({ method: 'POST', pathname: '/api/build', body: 'no json', env, fetchImpl: g.fetchImpl })).status, 400);
  const bad = newProject(); bad.scenes[1].rules[0].when.a = 12345;
  const r = await route({ method: 'POST', pathname: '/api/build', body: JSON.stringify(bad), env, fetchImpl: g.fetchImpl });
  assert.equal(r.status, 400); assert.match(r.body.error, /errores/);
  const busy = fakeGithub({ active: [{}, {}] });
  assert.equal((await route({ method: 'POST', pathname: '/api/build', body: JSON.stringify(newProject()), env, fetchImpl: busy.fetchImpl })).status, 429);
  assert.equal(g.calls.filter((c) => c.method === 'PUT').length, 0, 'nada se sube si se rechaza');
});

test('estado de la compilación', async () => {
  const mk = (run) => fakeGithub({ runs: run ? [run] : [] });
  const q = async (g) => (await route({ method: 'GET', pathname: `/api/build/${ID}`, env, fetchImpl: g.fetchImpl })).body;
  assert.deepEqual(await q(mk(null)), { status: 'queued' });
  assert.deepEqual(await q(mk({ display_title: `Cloud build ${ID}`, status: 'in_progress' })), { status: 'running' });
  assert.deepEqual(await q(mk({ display_title: `Cloud build ${ID}`, status: 'completed', conclusion: 'success' })), { status: 'success' });
  assert.deepEqual(await q(mk({ display_title: `Cloud build ${ID}`, status: 'completed', conclusion: 'failure', html_url: 'u' })), { status: 'failed', url: 'u' });
  assert.equal((await route({ method: 'GET', pathname: '/api/build/../../etc', env, fetchImpl: mk(null).fetchImpl })).status, 404);
  assert.equal((await route({ method: 'GET', pathname: '/api/build/NOPE', env, fetchImpl: mk(null).fetchImpl })).status, 400);
});

test('descarga: devuelve la URL firmada (no el token) y no crea releases', async () => {
  const g = fakeGithub({ runs: [{ id: 9, display_title: `Cloud build ${ID}`, status: 'completed', conclusion: 'success' }], artifacts: [{ id: 5, name: `build-${ID}`, expired: false }] });
  const r = await route({ method: 'GET', pathname: `/api/build/${ID}/download`, env, fetchImpl: g.fetchImpl });
  assert.deepEqual(r.body, { url: 'https://blob.example/zip?sig=1' });
  assert.ok(JSON.stringify(r).indexOf('ghp_secret') < 0);
  assert.equal(g.calls.find((c) => c.path.endsWith('/zip')).redirect, 'manual');
  assert.ok(!g.calls.some((c) => /releases/.test(c.path)), 'sin releases');
  const none = fakeGithub({ runs: [{ id: 9, display_title: `Cloud build ${ID}`, status: 'completed', conclusion: 'success' }] });
  assert.equal((await route({ method: 'GET', pathname: `/api/build/${ID}/download`, env, fetchImpl: none.fetchImpl })).status, 404);
  const pending = fakeGithub({ runs: [{ id: 9, display_title: `Cloud build ${ID}`, status: 'in_progress' }] });
  assert.equal((await route({ method: 'GET', pathname: `/api/build/${ID}/download`, env, fetchImpl: pending.fetchImpl })).status, 409);
});

test('errores de GitHub no filtran detalles internos', async () => {
  const boom = async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => 'token=ghp_secret', headers: { get: () => null } });
  const r = await route({ method: 'POST', pathname: '/api/build', body: JSON.stringify(newProject()), env, fetchImpl: boom });
  assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes('ghp_secret'));
});

test('destino Windows: sube el juego HTML5 (no código C) y lo indica al workflow', async () => {
  const g = fakeGithub();
  const r = await route({ method: 'POST', pathname: '/api/build', search: '?target=windows', body: JSON.stringify(newProject()), env, fetchImpl: g.fetchImpl });
  assert.equal(r.status, 202); assert.equal(r.body.target, 'windows');
  const put = g.calls.find((c) => c.method === 'PUT');
  const names = readZipEntries(new Uint8Array(Buffer.from(put.body.content, 'base64'))).map((e) => e.path);
  assert.deepEqual(names, ['mi-primer-juego/index.html']);
  assert.deepEqual(g.calls.find((c) => c.path.includes('/dispatches')).body.inputs, { job_id: r.body.id, target: 'windows' });
  for (const target of ['macos', 'linux']) {
    const r2 = await route({ method: 'POST', pathname: '/api/build', search: `?target=${target}`, body: JSON.stringify(newProject()), env, fetchImpl: fakeGithub().fetchImpl });
    assert.equal(r2.status, 202); assert.equal(r2.body.target, target);
  }
  const bad = await route({ method: 'POST', pathname: '/api/build', search: '?target=rm', body: JSON.stringify(newProject()), env, fetchImpl: g.fetchImpl });
  assert.equal(bad.status, 400);
});
