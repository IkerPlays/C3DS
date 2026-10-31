// Netlify Function (v2): /api/build  ·  /api/build/:id  ·  /api/build/:id/download
// Variables de entorno (Netlify → Site settings → Environment variables):
//   C3DS_GITHUB_TOKEN  fine-grained PAT SOLO para este repo: Contents RW, Actions RW, Metadata R
//   C3DS_REPO          opcional, por defecto IkerPlays/C3DS
import { route } from './lib/cloud-core.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.text() : '';
  const { status, body: out } = await route({ method: req.method, pathname: url.pathname, search: url.search, body, env: process.env, fetchImpl: fetch });
  return new Response(JSON.stringify(out), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

export const config = { path: ['/api/build', '/api/build/*'] };
