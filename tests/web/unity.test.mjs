import test from 'node:test';
import assert from 'node:assert/strict';
import { splitDocs, parseUnityScene, parseMetaGuid, sceneFromUnity, PX_PER_UNIT } from '../../web/js/unity.js';
import { newProject, validate } from '../../web/js/model.js';

const GUID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const SCENE = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &100
GameObject:
  m_ObjectHideFlags: 0
  m_Component:
  - component: {fileID: 101}
  - component: {fileID: 102}
  m_Name: Player
--- !u!4 &101
Transform:
  m_GameObject: {fileID: 100}
  m_LocalPosition: {x: 2, y: -1, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_Father: {fileID: 0}
--- !u!212 &102
SpriteRenderer:
  m_GameObject: {fileID: 100}
  m_Color: {r: 1, g: 1, b: 1, a: 1}
  m_Sprite: {fileID: 21300000, guid: ${GUID}, type: 3}
--- !u!1 &200
GameObject:
  m_Name: Box
--- !u!4 &201
Transform:
  m_GameObject: {fileID: 200}
  m_LocalPosition: {x: 1, y: 1, z: 0}
  m_LocalScale: {x: 2, y: 1, z: 1}
  m_Father: {fileID: 101}
--- !u!212 &202
SpriteRenderer:
  m_GameObject: {fileID: 200}
  m_Color: {r: 1, g: 0, b: 0, a: 1}
  m_Sprite: {fileID: 10913, guid: 0000000000000000f000000000000000, type: 0}
`;

test('splitDocs y meta', () => {
  assert.equal(splitDocs(SCENE).length, 6);
  assert.equal(parseMetaGuid(`fileFormatVersion: 2\nguid: ${GUID}\nTextureImporter:`), GUID);
});

test('parseUnityScene: posiciones de mundo, jerarquía y sprites', () => {
  const s = parseUnityScene(SCENE);
  assert.deepEqual(s.map((x) => x.name), ['Player', 'Box']);
  assert.deepEqual([s[0].x, s[0].y], [2, -1]);
  assert.deepEqual([s[1].x, s[1].y], [3, 0], 'el hijo suma la posición del padre');
  assert.equal(s[0].guid, GUID); assert.equal(s[1].scaleX, 2);
});

test('sceneFromUnity: textura -> sprite, sin textura -> rectángulo, dentro de pantalla', () => {
  const p = newProject();
  const imgs = new Map([[GUID, { id: p.assets.images[0].id, nativeW: 100, nativeH: 100 }]]);
  const { scene, skipped } = sceneFromUnity(p, 'Level1', parseUnityScene(SCENE), imgs);
  const [player, box] = scene.objects;
  assert.equal(player.type, 'sprite'); assert.equal(player.w, PX_PER_UNIT);
  assert.equal(player.x, Math.round(200 + 2 * PX_PER_UNIT - PX_PER_UNIT / 2)); // centro + 2 unidades
  assert.equal(box.type, 'rect'); assert.equal(box.color, '#ff0000'); assert.equal(box.w, 2 * PX_PER_UNIT);
  assert.equal(skipped.length, 1);
  p.scenes = [scene]; p.startScene = scene.id;
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
});
