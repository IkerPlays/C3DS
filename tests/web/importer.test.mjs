import test from 'node:test';
import assert from 'node:assert/strict';
import { detectEngine, parseEngineVersion } from '../../web/js/detect.js';
import { parsePE } from '../../web/js/pe.js';
import { buildReport, classify, pngSize } from '../../web/js/analyze.js';

test('detecta motores', () => {
  assert.equal(detectEngine(['G/Assets/a.cs', 'G/ProjectSettings/ProjectVersion.txt']).engine, 'unity');
  assert.equal(detectEngine(['G/project.godot', 'G/a.gd']).engine, 'godot');
  assert.equal(detectEngine(['My/My.uproject']).engine, 'unreal');
  assert.equal(detectEngine(['game.EXE']).engine, 'exe');
  assert.equal(detectEngine(['readme.txt', 'a.exe']).engine, 'unknown');
  assert.equal(detectEngine(['a\\Assets\\x.png', 'a\\ProjectSettings\\y.asset']).engine, 'unity');
});

test('versiones', () => {
  assert.equal(parseEngineVersion('unity', 'm_EditorVersion: 2022.3.10f1\nm_x: 1'), '2022.3.10f1');
  assert.equal(parseEngineVersion('godot', 'config/features=PackedStringArray("4.2", "Forward Plus")'), '4.2');
  assert.equal(parseEngineVersion('unreal', '{"EngineAssociation":"5.3"}'), '5.3');
  assert.equal(parseEngineVersion('unreal', 'no json'), null);
});

function fakePE({ machine = 0x8664, magic = 0x20b, clr = 0 } = {}) {
  const b = new Uint8Array(1024); const dv = new DataView(b.buffer);
  b[0] = 0x4d; b[1] = 0x5a; dv.setUint32(0x3c, 0x80, true);
  dv.setUint32(0x80, 0x4550, true); dv.setUint16(0x84, machine, true);
  dv.setUint16(0x80 + 20, magic === 0x20b ? 240 : 224, true);
  const opt = 0x80 + 24; dv.setUint16(opt, magic, true); dv.setUint16(opt + 68, 2, true);
  dv.setUint32(opt + (magic === 0x20b ? 112 : 96) + 14 * 8, clr, true);
  return b;
}
test('PE', () => {
  assert.deepEqual(parsePE(new Uint8Array(100)), { valid: false });
  const r = parsePE(fakePE());
  assert.equal(r.valid, true); assert.equal(r.machine, 'x86-64 (64 bits)'); assert.equal(r.managed, false); assert.equal(r.subsystem, 'GUI');
  assert.equal(parsePE(fakePE({ machine: 0x14c, magic: 0x10b, clr: 0x2000 })).managed, true);
});

test('informe', () => {
  const entries = ['a.cs', 'b.cs', 'c.png', 'd.shader', 'e.fbx', 'f.wav'].map((p) => ({ path: p, size: 1000 }));
  const stats = classify(entries);
  assert.equal(stats.script, 2); assert.equal(stats.texture, 1); assert.equal(stats.shader, 1);
  const r = buildReport({ engine: 'unity', stats, textures: [{ path: 'c.png', w: 300, h: 256 }] });
  assert.equal(r.verdict, 'port');
  assert.ok(r.findings.some((f) => f.level === 'error' && /Shaders/.test(f.title)));
  assert.ok(r.findings.some((f) => /Texturas fuera/.test(f.title)));
  const ok = buildReport({ engine: 'godot', stats: classify([{ path: 'a.png', size: 1 }]), textures: [{ path: 'a.png', w: 64, h: 64 }] });
  assert.equal(ok.verdict, 'portable');
  assert.equal(buildReport({ engine: 'exe', stats, pe: parsePE(fakePE()) }).verdict, 'blocked');
  assert.equal(buildReport({ engine: 'unknown', stats }).verdict, 'blocked');
});

test('pngSize', () => {
  const b = new Uint8Array(24); b.set([0x89, 0x50, 0x4e, 0x47]); new DataView(b.buffer).setUint32(16, 128); new DataView(b.buffer).setUint32(20, 64);
  assert.deepEqual(pngSize(b), { w: 128, h: 64 });
  assert.equal(pngSize(new Uint8Array(30)), null);
});

