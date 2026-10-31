// Límites de hardware de la Nintendo 3DS. Valores aproximados y orientativos
// (la memoria disponible depende del modo de ejecución y del firmware).
export const LIMITS = Object.freeze({
  cpu: { old: 'ARM11 MPCore 268 MHz (2 núcleos, 1 usable por apps)', new: 'ARM11 MPCore 804 MHz (4 núcleos)' },
  ramMB: { old: 64, new: 124 },
  vramMB: 6,
  screens: {
    top: { w: 400, h: 240 },
    bottom: { w: 320, h: 240 },
  },
  texture: { maxSize: 1024, minSize: 8, powerOfTwo: true },
  assetsWarnMB: 128,
});

export const LIMIT_ROWS = [
  ['CPU (Old 3DS)', LIMITS.cpu.old],
  ['CPU (New 3DS)', LIMITS.cpu.new],
  ['RAM para apps', `~${LIMITS.ramMB.old} MB (Old) / ~${LIMITS.ramMB.new} MB (New)`],
  ['VRAM', `${LIMITS.vramMB} MB`],
  ['Pantalla superior', `${LIMITS.screens.top.w}×${LIMITS.screens.top.h}`],
  ['Pantalla inferior (táctil)', `${LIMITS.screens.bottom.w}×${LIMITS.screens.bottom.h}`],
  ['Texturas', `potencia de 2, ${LIMITS.texture.minSize}–${LIMITS.texture.maxSize} px por lado`],
  ['GPU', 'PICA200: shaders en ensamblador PICA, sin HLSL/GLSL/compute'],
  ['Audio', 'DSP (ndsp): WAV/OGG/MP3 vía librerías; sin FMOD/Wwise'],
  ['Scripting', 'Solo código nativo C/C++ (devkitARM). Sin Mono, IL2CPP, GDScript ni Blueprints'],
];

export const isPow2 = (n) => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
