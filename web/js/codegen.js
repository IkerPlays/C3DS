// Generador de proyectos 3DS (devkitARM + libctru + citro2d + ndsp) a partir de un proyecto del editor.
import { SCREENS, slug, animFrames } from './model.js';
import { fromDataURL } from './bytes.js';
import { ciaAssets, MAKEROM_URL, MAKEROM_SHA256, BANNERTOOL_URL, BANNERTOOL_SHA256 } from './cia.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(i, i + 2) : 'ffffff', 16));
// Literal constante (los inicializadores estáticos de C no admiten llamadas): 0xAABBGGRR = C2D_Color32(r, g, b, a).
const col = (hex) => { const [r, g, b] = rgb(hex); return `0xFF${[b, g, r].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`; };
const int = (v, lo = -100000, hi = 100000) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const flt = (v, lim = 50) => `${Math.max(-lim, Math.min(lim, Number(v) || 0)).toFixed(3)}f`;
const ctl = (c) => (c === true ? 1 : c === 'h' ? 2 : c === 'v' ? 3 : c === 'circle' ? 4 : c === 'touch' ? 5 : 0);

/** Cadena C en UTF-8 con escapes octales (seguro para cualquier texto). `%` se duplica para printf. */
export function cString(s, forPrintf = false) {
  let out = '';
  for (const b of new TextEncoder().encode(String(s))) {
    const ch = String.fromCharCode(b);
    if (ch === '"') out += '\\"'; else if (ch === '\\') out += '\\\\';
    else if (ch === '%' && forPrintf) out += '%%';
    else if (b >= 0x20 && b < 0x7f && ch !== '?') out += ch;
    else out += `\\${b.toString(8).padStart(3, '0')}`;
  }
  return `"${out}"`;
}

/**
 * Texto seguro para variables del Makefile y comandos de shell: se descarta todo lo que make o el shell
 * podrían interpretar ($, `, comillas, \\, #, saltos de línea...). Evita inyección de comandos al compilar.
 */
export const makeSafe = (s) => String(s).normalize('NFC').replace(/[^\p{L}\p{N}\s .,:;!?'\-_+&@()[\]]/gu, '').replace(/\s+/g, ' ').trim();

/** Plantilla de texto "Puntos: {puntos}" -> { fmt:'Puntos: %d', args:['vars[0]'] } */
export function textTemplate(tpl, varIndex) {
  const args = [];
  let fmt = '';
  let last = 0;
  for (const m of String(tpl).matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    if (!varIndex.has(m[1])) continue;
    fmt += String(tpl).slice(last, m.index).replace(/%/g, '%%') + '%d';
    args.push(`vars[${varIndex.get(m[1])}]`);
    last = m.index + m[0].length;
  }
  fmt += String(tpl).slice(last).replace(/%/g, '%%');
  return { fmt, args };
}

export function analyze(p) {
  const objs = p.scenes.flatMap((s, si) => s.objects.map((o) => ({ ...o, scene: si })));
  const objIndex = new Map(objs.map((o, i) => [o.id, i]));
  const sceneIndex = new Map(p.scenes.map((s, i) => [s.id, i]));
  const imageIndex = new Map(p.assets.images.map((a, i) => [a.id, i]));
  const soundIndex = new Map(p.assets.sounds.map((a, i) => [a.id, i]));
  const varIndex = new Map(p.variables.map((v, i) => [v.name, i]));
  // Tabla de animaciones: por cada objeto animado, sus fotogramas (índices de imagen) en una tabla global.
  const animTable = []; const animOf = new Map();
  for (const o of objs) {
    const frames = o.type === 'sprite' && o.animGroup ? animFrames(p, o.animGroup).map((a) => imageIndex.get(a.id)) : [];
    if (frames.length) { animOf.set(o.id, { off: animTable.length, n: frames.length }); animTable.push(...frames); }
  }
  const persistVars = p.variables.map((v, i) => (v.persist ? i : -1)).filter((i) => i >= 0);
  return { objs, objIndex, sceneIndex, imageIndex, soundIndex, varIndex, animTable, animOf, persistVars, hasImages: p.assets.images.length > 0, hasSounds: p.assets.sounds.length > 0 };
}

const KEYC = { A: 'KEY_A', B: 'KEY_B', X: 'KEY_X', Y: 'KEY_Y', L: 'KEY_L', R: 'KEY_R', START: 'KEY_START', SELECT: 'KEY_SELECT', UP: 'KEY_DUP', DOWN: 'KEY_DDOWN', LEFT: 'KEY_DLEFT', RIGHT: 'KEY_DRIGHT' };
const OPC = { '==': '==', '!=': '!=', '>': '>', '>=': '>=', '<': '<', '<=': '<=' };

export function generateMainC(p) {
  const A = analyze(p);
  const NO = Math.max(1, A.objs.length);
  // Plantillas de texto: iniciales + las de acciones setText.
  const templates = [];
  const tplId = (t) => { let i = templates.indexOf(t); if (i < 0) { templates.push(t); i = templates.length - 1; } return i; };
  const objInit = A.objs.map((o) => {
    const t = o.type === 'text' || o.type === 'button' ? tplId(o.text) : -1;
        return `\t{ ${{ rect: 0, text: 1, sprite: 2, button: 3 }[o.type]}, ${o.scene}, ${o.screen === 'top' ? 0 : 1}, ${A.imageIndex.get(o.image) ?? 0}, ${ctl(o.controls)}, ${t}, ${A.animOf.get(o.id)?.off ?? 0}, ${A.animOf.get(o.id)?.n ?? 0}, ${int(o.animFps, 1, 60) || 8}, ${int(o.x)}.0f, ${int(o.y)}.0f, ${int(o.w, 0, 400)}.0f, ${int(o.h, 0, 240)}.0f, ${int(o.speed, 0, 40)}.0f, ${flt(o.vx)}, ${flt(o.vy)}, ${flt(o.gravity, 5)}, ${flt(o.size || 1, 4)}, ${o.visible ? 1 : 0}, ${col(o.color)} }, // ${o.id}`;
  });

  const cond = (w) => {
    switch (w.type) {
      case 'start': return 'scene_frames == 0';
      case 'key': return `(down & ${KEYC[w.key] || 'KEY_A'})`;
      case 'keyHeld': return `(held & ${KEYC[w.key] || 'KEY_A'})`;
      case 'collide': return `hit(${A.objIndex.get(w.a) ?? 0}, ${A.objIndex.get(w.b) ?? 0})`;
      case 'touchAny': return 'touched';
      case 'touch': return `touch_in(${A.objIndex.get(w.obj) ?? 0}, touched, tx, ty)`;
      case 'var': return `vars[${A.varIndex.get(w.var) ?? 0}] ${OPC[w.op] || '=='} ${int(w.value)}`;
      case 'edge': return `edge_hit(${A.objIndex.get(w.obj) ?? 0}, ${{ left: 0, right: 1, top: 2, bottom: 3 }[w.edge] ?? 0})`;
      case 'standing': return `standing_on(${A.objIndex.get(w.obj) ?? 0}, ${A.objIndex.get(w.on) ?? 0})`;
      case 'timer': return `(scene_frames > 0 && scene_frames % ${Math.max(1, Math.round((Number(w.seconds) || 1) * 60))} == 0)`;
      default: return '0';
    }
  };
  const act = (a) => {
    const o = a.obj != null ? A.objIndex.get(a.obj) ?? 0 : 0;
    const v = A.varIndex.get(a.var) ?? 0;
    switch (a.type) {
      case 'goto': return `next_scene = ${A.sceneIndex.get(a.scene) ?? 0};`;
      case 'setVar': return `vars[${v}] = ${int(a.value)};`;
      case 'addVar': return `vars[${v}] += ${int(a.value)};`;
      case 'randVar': { const lo = Math.min(int(a.min), int(a.max)), hi = Math.max(int(a.min), int(a.max)); return `vars[${v}] = ${lo} + rand() % ${hi - lo + 1};`; }
      case 'sound': return `play_sound(${A.soundIndex.get(a.sound) ?? 0});`;
      case 'stopSound': return `stop_sound(${A.soundIndex.get(a.sound) ?? 0});`;
      case 'setPos': return `objs[${o}].x = ${int(a.x)}.0f; objs[${o}].y = ${int(a.y)}.0f;`;
      case 'move': return `objs[${o}].x += ${int(a.dx)}.0f; objs[${o}].y += ${int(a.dy)}.0f;`;
      case 'landOn': return `land_on(${o}, ${A.objIndex.get(a.on) ?? 0});`;
      case 'randomPos': return `random_pos(${o}, ${{ xy: 0, x: 1, y: 2 }[a.axis || 'xy'] ?? 0});`;
      case 'setVel': return `objs[${o}].${a.axis === 'y' ? 'vy' : 'vx'} = ${flt(a.value)};`;
      case 'setText': return `objs[${o}].tmpl = ${tplId(a.text)};`;
      case 'setColor': return `objs[${o}].color = ${col(a.color)};`;
      case 'show': return `objs[${o}].visible = 1;`;
      case 'hide': return `objs[${o}].visible = 0;`;
      case 'quit': return 'quit = 1;';
      default: return ';';
    }
  };
  const sceneRules = p.scenes.map((s, i) => {
    const body = s.rules.filter((r) => r.enabled !== false).map((r) => `\t\tif (${cond(r.when)}${r.also ? ` && ${cond(r.also)}` : ''}) {\n${r.then.map((a) => `\t\t\t${act(a)}`).join('\n')}\n\t\t}`).join('\n');
    return `\tcase ${i}: // ${s.name.replace(/[^\w ]/g, '_')}\n${body}\n\t\tbreak;`;
  }).join('\n');

  const tplCases = templates.map((t, i) => {
    const { fmt, args } = textTemplate(t, A.varIndex);
    return `\tcase ${i}: snprintf(out, n, ${cString(fmt)}${args.length ? `, ${args.join(', ')}` : ''}); break;`;
  }).join('\n');

  const bg = p.scenes.map((s) => `\t{ ${col(s.bg.top)}, ${col(s.bg.bottom)} },`).join('\n');
  const soundLoops = p.assets.sounds.map((x) => (x.loop ? 1 : 0)).join(', ');
  const soundFiles = p.assets.sounds.map((s) => `\t${cString(`romfs:/sounds/${slug(s.name)}-${s.id}.wav`)},`).join('\n');

  return `// Generado por C3DS - ${p.name.replace(/[^\w ]/g, '_')}
// Compilar con devkitARM + libctru + citro2d (ver Makefile).
#include <3ds.h>
#include <citro2d.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#define NUM_OBJS ${A.objs.length}
#define NUM_VARS ${Math.max(1, p.variables.length)}
#define NUM_SCENES ${Math.max(1, p.scenes.length)}
#define NUM_SOUNDS ${p.assets.sounds.length}
#define START_SCENE ${A.sceneIndex.get(p.startScene) ?? 0}

enum { T_RECT, T_TEXT, T_SPRITE, T_BUTTON };

typedef struct {
	int type, scene, screen, image, controls, tmpl, anim_off, anim_n, anim_fps;
	float x, y, w, h, speed, vx, vy, gravity, tsize;
	int visible;
	u32 color;
} Obj;

static const Obj init_objs[${NO}] = {
${objInit.join('\n') || '\t{ 0 }'}
};
static Obj objs[${NO}];
static int vars[NUM_VARS] = { ${p.variables.map((v) => int(v.value)).join(', ') || '0'} };
static int cur_scene = START_SCENE, next_scene = -1, scene_frames = 0, quit = 0;
static const u32 scene_bg[NUM_SCENES][2] = {
${bg || '\t{ 0, 0 },'}
};
static const float screen_w[2] = { ${SCREENS.top.w}.0f, ${SCREENS.bottom.w}.0f };
static const float screen_h[2] = { ${SCREENS.top.h}.0f, ${SCREENS.bottom.h}.0f };

static void format_text(int tmpl, char* out, size_t n) {
	switch (tmpl) {
${tplCases}
	default: out[0] = 0; break;
	}
}

static int hit(int a, int b) {
	const Obj *p = &objs[a], *q = &objs[b];
	return p->visible && q->visible && p->screen == q->screen &&
		p->x < q->x + q->w && q->x < p->x + p->w && p->y < q->y + q->h && q->y < p->y + p->h;
}

static int touch_in(int i, int touched, int tx, int ty) {
	const Obj* o = &objs[i];
	return touched && o->visible && o->screen == 1 && tx >= o->x && tx < o->x + o->w && ty >= o->y && ty < o->y + o->h;
}

static int standing_on(int i, int j) {
	const Obj *a = &objs[i], *b = &objs[j];
	return a->visible && b->visible && a->screen == b->screen && a->vy >= 0 &&
		a->y + a->h >= b->y - 1 && a->y + a->h <= b->y + 3 && a->x < b->x + b->w && b->x < a->x + a->w;
}

static void land_on(int i, int j) {
	objs[i].y = objs[j].y - objs[i].h;
	objs[i].vy = 0;
}

static int edge_hit(int i, int e) {
	const Obj* o = &objs[i];
	if (!o->visible) return 0;
	switch (e) {
	case 0: return o->x <= 0;
	case 1: return o->x + o->w >= screen_w[o->screen];
	case 2: return o->y <= 0;
	default: return o->y + o->h >= screen_h[o->screen];
	}
}

/* mode: 0 = X e Y, 1 = solo X, 2 = solo Y */
static void random_pos(int i, int mode) {
	Obj* o = &objs[i];
	float mw = screen_w[o->screen] - o->w, mh = screen_h[o->screen] - o->h;
	if (mode != 2) o->x = (float)(rand() % (int)(mw > 1 ? mw : 1));
	if (mode != 1) o->y = (float)(rand() % (int)(mh > 1 ? mh : 1));
}

/* ---------- Guardado (variables marcadas con "guardar") en la SD ---------- */
#define NUM_PERSIST ${A.persistVars.length}
#if NUM_PERSIST > 0
static const int persist_idx[NUM_PERSIST] = { ${A.persistVars.join(', ')} };
static const char* save_dir = "sdmc:/3ds/${slug(p.name)}";
static const char* save_file = "sdmc:/3ds/${slug(p.name)}/save.dat";

static void load_vars(void) {
	FILE* f = fopen(save_file, "rb");
	if (!f) return;
	int tmp[NUM_PERSIST];
	if (fread(tmp, sizeof(int), NUM_PERSIST, f) == NUM_PERSIST) for (int i = 0; i < NUM_PERSIST; i++) vars[persist_idx[i]] = tmp[i];
	fclose(f);
}

static void save_vars(void) {
	mkdir("sdmc:/3ds", 0777);
	mkdir(save_dir, 0777);
	FILE* f = fopen(save_file, "wb");
	if (!f) return;
	int tmp[NUM_PERSIST];
	for (int i = 0; i < NUM_PERSIST; i++) tmp[i] = vars[persist_idx[i]];
	fwrite(tmp, sizeof(int), NUM_PERSIST, f);
	fclose(f);
}
#else
static void load_vars(void) {}
static void save_vars(void) {}
#endif

static void enter_scene(int s) {
	save_vars();
	cur_scene = s;
	scene_frames = 0;
	for (int i = 0; i < NUM_OBJS; i++) if (init_objs[i].scene == s) objs[i] = init_objs[i];
}

/* ---------- Audio (ndsp, WAV PCM16 en romfs:/sounds) ---------- */
#if NUM_SOUNDS > 0
typedef struct { s16* data; u32 samples; u32 rate; int channels; int ok; } Sound;
static Sound sounds[NUM_SOUNDS];
static ndspWaveBuf wave_bufs[NUM_SOUNDS];
static int audio_ok = 0;
static const char* sound_files[NUM_SOUNDS] = {
${soundFiles}
};
static const int sound_loop[NUM_SOUNDS] = { ${soundLoops} };

static void load_sounds(void) {
	audio_ok = R_SUCCEEDED(ndspInit());
	if (!audio_ok) return;
	ndspSetOutputMode(NDSP_OUTPUT_STEREO);
	for (int i = 0; i < NUM_SOUNDS; i++) {
		FILE* f = fopen(sound_files[i], "rb");
		if (!f) continue;
		u8 h[44];
		if (fread(h, 1, 44, f) != 44 || memcmp(h, "RIFF", 4) || memcmp(h + 36, "data", 4)) { fclose(f); continue; }
		u32 size = h[40] | (h[41] << 8) | (h[42] << 16) | ((u32)h[43] << 24);
		sounds[i].channels = h[22];
		sounds[i].rate = h[24] | (h[25] << 8) | (h[26] << 16) | ((u32)h[27] << 24);
		sounds[i].data = (s16*)linearAlloc(size);
		if (sounds[i].data && fread(sounds[i].data, 1, size, f) == size) {
			DSP_FlushDataCache(sounds[i].data, size);
			sounds[i].samples = size / (2 * sounds[i].channels);
			sounds[i].ok = 1;
		}
		fclose(f);
	}
}

static void play_sound(int i) {
	if (!audio_ok || i < 0 || i >= NUM_SOUNDS || !sounds[i].ok) return;
	float mix[12] = { 0 };
	mix[0] = mix[1] = 1.0f;
	ndspChnReset(i);
	ndspChnSetInterp(i, NDSP_INTERP_LINEAR);
	ndspChnSetRate(i, (float)sounds[i].rate);
	ndspChnSetFormat(i, sounds[i].channels == 1 ? NDSP_FORMAT_MONO_PCM16 : NDSP_FORMAT_STEREO_PCM16);
	ndspChnSetMix(i, mix);
	memset(&wave_bufs[i], 0, sizeof(ndspWaveBuf));
	wave_bufs[i].data_vaddr = sounds[i].data;
	wave_bufs[i].nsamples = sounds[i].samples;
	wave_bufs[i].looping = sound_loop[i] ? true : false;
	ndspChnWaveBufAdd(i, &wave_bufs[i]);
}

static void stop_sound(int i) {
	if (!audio_ok || i < 0 || i >= NUM_SOUNDS) return;
	ndspChnReset(i);
}

static void free_sounds(void) {
	if (!audio_ok) return;
	for (int i = 0; i < NUM_SOUNDS; i++) if (sounds[i].data) linearFree(sounds[i].data);
	ndspExit();
}
#else
static void load_sounds(void) {}
static void play_sound(int i) { (void)i; }
static void stop_sound(int i) { (void)i; }
static void free_sounds(void) {}
#endif

/* ---------- Lógica ---------- */
static void update(u32 down, u32 held, int touched, int tx, int ty, float cx, float cy) {
	for (int i = 0; i < NUM_OBJS; i++) {
		Obj* o = &objs[i];
		if (o->scene != cur_scene || !o->visible) continue;
		/* controls: 0 ninguno, 1 D-Pad, 2 horizontal, 3 vertical, 4 Circle Pad, 5 stylus */
		if (o->controls == 4) { o->x += cx * o->speed; o->y += cy * o->speed; }
		if (o->controls == 5 && (held & KEY_TOUCH) && o->screen == 1) { o->x = tx - o->w / 2; o->y = ty - o->h / 2; }
		if (o->controls >= 1 && o->controls <= 3 && o->controls != 3) {
			if (held & KEY_DLEFT)  o->x -= o->speed;
			if (held & KEY_DRIGHT) o->x += o->speed;
		}
		if (o->controls >= 1 && o->controls <= 3 && o->controls != 2) {
			if (held & KEY_DUP)    o->y -= o->speed;
			if (held & KEY_DDOWN)  o->y += o->speed;
		}
		if (o->gravity != 0) { o->vy += o->gravity; if (o->vy > 12) o->vy = 12; }
		o->x += o->vx;
		o->y += o->vy;
		if (o->x < 0) o->x = 0;
		if (o->y < 0) o->y = 0;
		if (o->x > screen_w[o->screen] - o->w) o->x = screen_w[o->screen] - o->w;
		if (o->y > screen_h[o->screen] - o->h) o->y = screen_h[o->screen] - o->h;
	}
	(void)down; (void)held; (void)touched; (void)tx; (void)ty; (void)cx; (void)cy;
	switch (cur_scene) {
${sceneRules}
	default: break;
	}
	scene_frames++;
}

/* ---------- Dibujo ---------- */
${A.hasImages ? `static C2D_SpriteSheet sheet;\nstatic const int anim_tbl[${Math.max(1, A.animTable.length)}] = { ${A.animTable.join(', ') || '0'} };\n` : ''}static C2D_TextBuf text_buf;

static void draw_text(const char* s, float x, float y, u32 color, float size) {
	C2D_Text t;
	C2D_TextParse(&t, text_buf, s);
	C2D_TextOptimize(&t);
	C2D_DrawText(&t, C2D_WithColor, x, y, 0.0f, 0.55f * size, 0.55f * size, color);
}

static void draw_screen(int screen) {
	char buf[96];
	for (int i = 0; i < NUM_OBJS; i++) {
		const Obj* o = &objs[i];
		if (o->scene != cur_scene || !o->visible || o->screen != screen) continue;
		switch (o->type) {
		case T_RECT: C2D_DrawRectSolid(o->x, o->y, 0.0f, o->w, o->h, o->color); break;
		case T_SPRITE:
${A.hasImages ? `			{ int idx = o->anim_n ? anim_tbl[o->anim_off + (scene_frames * o->anim_fps / 60) % o->anim_n] : o->image;
			  C2D_Image img = C2D_SpriteSheetGetImage(sheet, idx);
			  C2D_DrawImageAt(img, o->x, o->y, 0.0f, NULL, o->w / img.subtex->width, o->h / img.subtex->height); }` : '			C2D_DrawRectSolid(o->x, o->y, 0.0f, o->w, o->h, o->color);'}
			break;
		case T_TEXT: format_text(o->tmpl, buf, sizeof buf); draw_text(buf, o->x, o->y, o->color, o->tsize); break;
		case T_BUTTON:
			C2D_DrawRectSolid(o->x, o->y, 0.0f, o->w, o->h, o->color);
			format_text(o->tmpl, buf, sizeof buf);
			draw_text(buf, o->x + 6, o->y + o->h / 2 - 8 * o->tsize, 0xFF000000, o->tsize);
			break;
		}
	}
}

int main(int argc, char* argv[]) {
	(void)argc; (void)argv;
	gfxInitDefault();
	romfsInit();
	C3D_Init(C3D_DEFAULT_CMDBUF_SIZE);
	C2D_Init(C2D_DEFAULT_MAX_OBJECTS);
	C2D_Prepare();
	C3D_RenderTarget* top = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
	C3D_RenderTarget* bottom = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
	text_buf = C2D_TextBufNew(8192);
${A.hasImages ? '\tsheet = C2D_SpriteSheetLoad("romfs:/gfx/sprites.t3x");\n\tif (!sheet) svcBreak(USERBREAK_PANIC);\n' : ''}	load_sounds();
	srand((unsigned)svcGetSystemTick());
	load_vars();
	enter_scene(START_SCENE);

	while (aptMainLoop() && !quit) {
		hidScanInput();
		u32 down = hidKeysDown(), held = hidKeysHeld();
		touchPosition tp;
		circlePosition cp;
		hidTouchRead(&tp);
		hidCircleRead(&cp);
		float cx = cp.dx / 156.0f, cy = -cp.dy / 156.0f;
		if (cx > -0.1f && cx < 0.1f) cx = 0;
		if (cy > -0.1f && cy < 0.1f) cy = 0;
		update(down, held, (down & KEY_TOUCH) != 0, tp.px, tp.py, cx, cy);
		if (next_scene >= 0) { enter_scene(next_scene); next_scene = -1; }

		C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
		C2D_TextBufClear(text_buf);
		C2D_TargetClear(top, scene_bg[cur_scene][0]);
		C2D_SceneBegin(top);
		draw_screen(0);
		C2D_TargetClear(bottom, scene_bg[cur_scene][1]);
		C2D_SceneBegin(bottom);
		draw_screen(1);
		C3D_FrameEnd(0);
	}

	save_vars();
	free_sounds();
${A.hasImages ? '\tC2D_SpriteSheetFree(sheet);\n' : ''}	C2D_TextBufDelete(text_buf);
	C2D_Fini();
	C3D_Fini();
	romfsExit();
	gfxExit();
	return 0;
}
`;
}

export function generateMakefile(p) {
  const A = analyze(p);
  const T = '\t';
  const romfs = A.hasImages || A.hasSounds;
  const name = slug(p.name);
  return `# Generado por C3DS. Basado en la plantilla oficial de libctru.
.SUFFIXES:
ifeq ($(strip $(DEVKITARM)),)
$(error "Define DEVKITARM (instala devkitPro: https://devkitpro.org)")
endif
TOPDIR ?= $(CURDIR)
include $(DEVKITARM)/3ds_rules

TARGET      := ${name}
BUILD       := build
SOURCES     := source
INCLUDES    := include
ROMFS       := romfs

APP_TITLE       := ${makeSafe(p.name).slice(0, 0x40) || 'Juego'}
APP_DESCRIPTION := ${makeSafe(p.description).slice(0, 0x80) || 'Juego para 3DS'}
APP_AUTHOR      := ${makeSafe(p.author).slice(0, 0x40) || 'C3DS'}
APP_ICON        := $(DEVKITPRO)/libctru/default_icon.png

ARCH     := -march=armv6k -mtune=mpcore -mfloat-abi=hard -mtp=soft
CFLAGS   := -g -Wall -O2 -mword-relocations -ffunction-sections $(ARCH)
CFLAGS   += $(INCLUDE) -D__3DS__ -std=gnu11
ASFLAGS  := -g $(ARCH)
LDFLAGS   = -specs=3dsx.specs -g $(ARCH) -Wl,-Map,$(notdir $*.map)
LIBS     := -lcitro2d -lcitro3d -lctru -lm
LIBDIRS  := $(PORTLIBS) $(CTRULIB)

ifneq ($(BUILD),$(notdir $(CURDIR)))
export OUTPUT  := $(CURDIR)/$(TARGET)
export TOPDIR  := $(CURDIR)
export VPATH   := $(foreach dir,$(SOURCES),$(CURDIR)/$(dir))
export DEPSDIR := $(CURDIR)/$(BUILD)
CFILES         := $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
export LD      := $(CC)
export OFILES  := $(CFILES:.c=.o)
export INCLUDE := $(foreach dir,$(INCLUDES),-I$(CURDIR)/$(dir)) $(foreach dir,$(LIBDIRS),-I$(dir)/include) -I$(CURDIR)/$(BUILD)
export LIBPATHS := $(foreach dir,$(LIBDIRS),-L$(dir)/lib)
export _3DSXDEPS := $(OUTPUT).smdh
export _3DSXFLAGS += --smdh=$(OUTPUT).smdh${romfs ? '\nexport _3DSXFLAGS += --romfs=$(CURDIR)/$(ROMFS)' : ''}
.PHONY: $(BUILD) clean all cia
# La primera regla es el objetivo por defecto: all.
all: $(BUILD)
${A.hasImages ? `
# Texturas: gfx/sprites.t3s (lista de PNG) -> romfs/gfx/sprites.t3x con tex3ds
SPRITES := $(ROMFS)/gfx/sprites.t3x
$(SPRITES): gfx/sprites.t3s $(wildcard gfx/*.png)
${T}@mkdir -p $(dir $@)
${T}@tex3ds -i $< -o $@
${T}@echo "built ... $@"
` : ''}
$(BUILD):${A.hasImages ? ' $(SPRITES)' : ''}
${T}@mkdir -p $@
${T}@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile
clean:
${T}@rm -fr $(BUILD) $(TARGET).3dsx $(TARGET).smdh $(TARGET).elf $(TARGET).cia${A.hasImages ? ' $(ROMFS)/gfx' : ''}

# .cia: requiere makerom y bannertool en el PATH (ver README).
cia: $(BUILD)
${T}@bannertool makebanner -i cia/banner.png -a cia/audio.wav -o $(BUILD)/banner.bnr
${T}@bannertool makesmdh -s "$(APP_TITLE)" -l "$(APP_DESCRIPTION)" -p "$(APP_AUTHOR)" -i cia/icon.png -o $(BUILD)/icon.icn
${T}@makerom -f cia -o $(TARGET).cia -elf $(TARGET).elf -rsf cia/app.rsf -icon $(BUILD)/icon.icn -banner $(BUILD)/banner.bnr -exefslogo -target t
${T}@echo "built ... $(TARGET).cia"
else
DEPENDS := $(OFILES:.o=.d)
# La primera regla es el objetivo por defecto: debe ser el .3dsx.
$(OUTPUT).3dsx : $(OUTPUT).elf $(_3DSXDEPS)
$(OUTPUT).elf : $(OFILES)
$(OUTPUT).smdh : $(APP_ICON)
${T}@smdhtool --create "$(APP_TITLE)" "$(APP_DESCRIPTION)" "$(APP_AUTHOR)" $(APP_ICON) $@
-include $(DEPENDS)
endif
`;
}

export function generateWorkflow(p) {
  const name = slug(p.name);
  return `name: Build 3DS
on:
  push:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    container: devkitpro/devkitarm:latest
    steps:
      - uses: actions/checkout@v4
      - name: Instalar makerom y bannertool (para el .cia)
        run: |
          set -e
          (command -v wget && command -v unzip) >/dev/null || (apt-get update && apt-get install -y wget unzip)
          wget -q ${MAKEROM_URL}
          wget -q ${BANNERTOOL_URL}
          echo "${MAKEROM_SHA256}  makerom-v0.18-ubuntu_x86_64.zip" | sha256sum -c -
          echo "${BANNERTOOL_SHA256}  bannertool.zip" | sha256sum -c -
          unzip -o makerom-v0.18-ubuntu_x86_64.zip makerom -d /usr/local/bin
          unzip -oj bannertool.zip linux-x86_64/bannertool -d /usr/local/bin
          chmod +x /usr/local/bin/makerom /usr/local/bin/bannertool
      - run: make
      - run: make cia
      - uses: actions/upload-artifact@v4
        with:
          name: ${name}-3ds
          path: |
            ${name}.3dsx
            ${name}.cia
`;
}

/** Archivos del proyecto 3DS exportado. Las rutas llevan la carpeta raíz `<slug>/`. */
export function exportFiles(p) {
  const A = analyze(p);
  const root = slug(p.name);
  const romfs = A.hasImages || A.hasSounds;
  const files = [
    { path: 'source/main.c', content: generateMainC(p) },
    { path: 'Makefile', content: generateMakefile(p) },
    { path: `${root}.c3ds.json`, content: JSON.stringify(p, null, 2) },
    { path: 'README.md', content: readme(p) },
    { path: '.github/workflows/build.yml', content: generateWorkflow(p) },
    ...ciaAssets(p, { romfs }),
  ];
  const t3s = ['--atlas -f rgba -z auto'];
  for (const a of p.assets.images) {
    const name = `${slug(a.name)}-${a.id}.png`;
    files.push({ path: `gfx/${name}`, content: fromDataURL(p.blobs[a.id]).bytes });
    t3s.push(name);
  }
  if (A.hasImages) files.push({ path: 'gfx/sprites.t3s', content: `${t3s.join('\n')}\n` });
  for (const s of p.assets.sounds) files.push({ path: `romfs/sounds/${slug(s.name)}-${s.id}.wav`, content: fromDataURL(p.blobs[s.id]).bytes });
  return files.map((f) => ({ ...f, path: `${root}/${f.path}` }));
}

function readme(p) {
  const n = slug(p.name);
  return `# ${p.name}

Proyecto para Nintendo 3DS homebrew generado con C3DS.

## Compilar
1. Instala [devkitPro](https://devkitpro.org) con el grupo \`3ds-dev\` (devkitARM, libctru, citro2d, tex3ds).
2. \`make\` → \`${n}.3dsx\` (cópialo a \`/3ds/\` en la SD y ábrelo desde Homebrew Launcher).
3. \`make cia\` → \`${n}.cia\` (instálalo con FBI). Necesita [makerom](https://github.com/3DSGuy/Project_CTR) y [bannertool](https://github.com/diasurgical/bannertool) en el PATH.

También puedes subir esta carpeta a GitHub: el workflow incluido compila ambos archivos.

## Probar
Abre el \`.3dsx\` o el \`.cia\` en el emulador [Azahar](https://azahar-emu.org). El sonido necesita el firmware DSP (dump de tu consola) en consola real/emulador.

## Archivos
- \`source/main.c\`: juego (generado).
- \`gfx/\`: imágenes PNG y \`sprites.t3s\` (lista para tex3ds).
- \`romfs/sounds/\`: sonidos WAV.
- \`cia/\`: \`app.rsf\`, banner, icono y audio del banner (personalízalos).
`;
}
