import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeProject, decodeProject, shareUrl, tokenFromHash, MAX_LINK_CHARS } from '../../web/js/share.js';
import { newProject, validate } from '../../web/js/model.js';
import { pongProject } from '../../web/js/templates.js';

test('codificar y decodificar un proyecto (ida y vuelta)', async () => {
  for (const p of [newProject(), pongProject()]) {
    p.localId = 'abc';
    const token = await encodeProject(p);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    const back = await decodeProject(token);
    assert.equal(back.localId, undefined, 'no se comparte el id local');
    assert.equal(back.name, p.name);
    assert.deepEqual(back.scenes, p.scenes);
    assert.deepEqual(validate(back).filter((x) => x.level === 'error'), []);
  }
});

test('los enlaces de las plantillas son razonablemente cortos', async () => {
  assert.ok((await encodeProject(pongProject())).length < MAX_LINK_CHARS / 4);
  assert.ok((await encodeProject(newProject())).length < MAX_LINK_CHARS);
});

test('enlaces dañados o ajenos se rechazan con mensajes claros', async () => {
  await assert.rejects(() => decodeProject('no valido!'), /Enlace no válido/);
  await assert.rejects(() => decodeProject('AAAA'), /dañado|incompleto/);
  const { deflateRawSync } = await import('node:zlib');
  const tok = (o) => Buffer.from(deflateRawSync(Buffer.from(JSON.stringify(o)))).toString('base64url');
  await assert.rejects(() => decodeProject(tok({ hola: 1 })), /no contiene un proyecto/);
  await assert.rejects(() => decodeProject(tok({ format: 9 })), /no contiene un proyecto/);
});

test('hash y url', () => {
  assert.equal(tokenFromHash('#p=abc_-9'), 'abc_-9');
  assert.equal(tokenFromHash('#editor'), null);
  assert.equal(shareUrl('https://x.app/#home', 'tok'), 'https://x.app/#p=tok');
});
