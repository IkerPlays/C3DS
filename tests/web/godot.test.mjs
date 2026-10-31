import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTscn, parseViewport, sceneFromTscn, sceneNameFromPath } from '../../web/js/godot.js';
import { newProject, validate } from '../../web/js/model.js';

const TSCN = `[gd_scene load_steps=3 format=3 uid="uid://abc"]

[ext_resource type="Texture2D" uid="uid://x" path="res://art/hero.png" id="1_hero"]
[ext_resource type="Script" path="res://hero.gd" id="2_s"]

[node name="Main" type="Node2D"]
position = Vector2(100, 50)

[node name="Hero" type="Sprite2D" parent="."]
position = Vector2(200, 100)
scale = Vector2(2, 2)
texture = ExtResource("1_hero")

[node name="Score" type="Label" parent="."]
offset_left = 20.0
offset_top = 10.0
text = "Puntos: 0"

[node name="Floor" type="ColorRect" parent="."]
offset_left = 0.0
offset_top = 500.0
size = Vector2(1152, 148)
color = Color(0.2, 0.8, 0.4, 1)

[node name="Play" type="Button" parent="."]
offset_left = 400.0
offset_top = 300.0
offset_right = 600.0
offset_bottom = 360.0
text = "Jugar"

[node name="Enemy" type="CharacterBody2D" parent="."]

[node name="Body" type="Sprite2D" parent="Enemy"]
position = Vector2(10, 10)
`;

test('parseViewport', () => {
  assert.deepEqual(parseViewport(''), { w: 1152, h: 648 });
  assert.deepEqual(parseViewport('window/size/viewport_width=1280\nwindow/size/viewport_height=720'), { w: 1280, h: 720 });
});

test('parseTscn: recursos, nodos y posiciones absolutas', () => {
  const r = parseTscn(TSCN);
  assert.equal(r.resources.get('1_hero'), 'res://art/hero.png');
  assert.deepEqual(r.nodes.map((n) => n.name), ['Main', 'Hero', 'Score', 'Floor', 'Play', 'Enemy', 'Body']);
  assert.deepEqual(r.nodes[1].abs, [300, 150], 'hijo suma la posición del padre');
  assert.equal(r.nodes[6].parent, 'Enemy');
});

test('sceneFromTscn: genera objetos del editor dentro de la pantalla', () => {
  const p = newProject();
  const imgs = new Map([['res://art/hero.png', { id: p.assets.images[0].id, nativeW: 64, nativeH: 64 }]]);
  const { scene, skipped } = sceneFromTscn(p, 'main', parseTscn(TSCN), { w: 1152, h: 648 }, imgs);
  const byName = Object.fromEntries(scene.objects.map((o) => [o.name, o]));
  assert.equal(byName.Hero.type, 'sprite'); assert.equal(byName.Hero.image, p.assets.images[0].id);
  assert.ok(byName.Hero.w > 30 && byName.Hero.w < 80, `tamaño escalado (${byName.Hero.w})`);
  assert.equal(byName.Score.text, 'Puntos: 0'); assert.equal(byName.Score.type, 'text');
  assert.equal(byName.Floor.type, 'rect'); assert.equal(byName.Floor.color, '#33cc66');
  assert.equal(byName.Play.type, 'button'); assert.equal(byName.Play.text, 'Jugar'); assert.equal(byName.Play.screen, 'bottom');
  assert.ok(skipped.some((s) => /Body/.test(s)), 'sprite sin textura se omite');
  p.scenes = [scene]; p.startScene = scene.id;
  assert.deepEqual(validate(p).filter((x) => x.level === 'error'), []);
  for (const o of scene.objects) { const w = o.screen === 'bottom' ? 320 : 400; assert.ok(o.x >= 0 && o.x <= w && o.y >= 0 && o.y <= 240, o.name); }
});

test('nombre de escena desde la ruta', () => {
  assert.equal(sceneNameFromPath('res://scenes/Main_Menu.tscn'), 'main menu');
});
