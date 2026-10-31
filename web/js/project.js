import { ciaAssets, MAKEROM_URL, MAKEROM_SHA256, BANNERTOOL_URL, BANNERTOOL_SHA256 } from './cia.js';

// Modelo del proyecto del editor + generación de un proyecto homebrew para 3DS (libctru + citro2d).
export const SCREENS = { top: { w: 400, h: 240 }, bottom: { w: 320, h: 240 } };
export const MAX_ENTITIES = 256;

export function newProject() {
  return {
    format: 1,
    name: 'Mi juego C3DS',
    author: 'Autor',
    description: 'Creado con C3DS',
    bg: { top: '#1d2b53', bottom: '#222222' },
    entities: [
      { id: 1, type: 'rect', screen: 'top', x: 180, y: 100, w: 40, h: 40, color: '#ff004d', text: '', player: true, speed: 3 },
      { id: 2, type: 'text', screen: 'top', x: 110, y: 20, w: 0, h: 0, color: '#ffffff', text: 'Hola 3DS!', player: false, speed: 0 },
      { id: 3, type: 'text', screen: 'bottom', x: 40, y: 110, w: 0, h: 0, color: '#ffec27', text: 'D-Pad mueve el cuadrado - START sale', player: false, speed: 0 },
    ],
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
export const cStr = (s) => String(s).replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
export const slug = (s) => (String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'game');
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

/** Devuelve una lista de avisos; no modifica el proyecto. */
export function validate(p) {
  const w = [];
  if (p.entities.length > MAX_ENTITIES) w.push(`Hay ${p.entities.length} objetos; el máximo recomendado es ${MAX_ENTITIES}.`);
  for (const e of p.entities) {
    const s = SCREENS[e.screen];
    if (!s) { w.push(`Objeto #${e.id}: pantalla inválida.`); continue; }
    if (!HEX.test(e.color)) w.push(`Objeto #${e.id}: color inválido.`);
    if (e.x < 0 || e.y < 0 || e.x + (e.w || 0) > s.w || e.y + (e.h || 0) > s.h) w.push(`Objeto #${e.id} sale de la pantalla ${e.screen === 'top' ? 'superior' : 'inferior'}.`);
  }
  if (p.entities.filter((e) => e.player).length > 1) w.push('Hay varios objetos controlables: todos se moverán con el D-Pad.');
  return w;
}

function drawCalls(p, screen) {
  const lines = [];
  for (const e of p.entities.filter((x) => x.screen === screen)) {
    const i = p.entities.indexOf(e);
    const [r, g, b] = rgb(HEX.test(e.color) ? e.color : '#ffffff');
    const col = `C2D_Color32(${r}, ${g}, ${b}, 255)`;
    if (e.type === 'rect') lines.push(`\t\tC2D_DrawRectSolid(ents[${i}].x, ents[${i}].y, 0.0f, ${clampInt(e.w, 1, 400)}, ${clampInt(e.h, 1, 240)}, ${col});`);
    else lines.push(`\t\tC2D_DrawText(&texts[${i}], C2D_WithColor, ents[${i}].x, ents[${i}].y, 0.0f, 0.6f, 0.6f, ${col});`);
  }
  return lines.join('\n');
}

export function generateMainC(p) {
  const n = p.entities.length;
  const [tr, tg, tb] = rgb(HEX.test(p.bg.top) ? p.bg.top : '#000000');
  const [br, bg, bb] = rgb(HEX.test(p.bg.bottom) ? p.bg.bottom : '#000000');
  const init = p.entities.map((e, i) => `\tents[${i}] = (Entity){ ${clampInt(e.x, -4000, 4000)}.0f, ${clampInt(e.y, -4000, 4000)}.0f, ${e.player ? clampInt(e.speed, 0, 20) : 0}.0f, ${e.player ? 1 : 0} };`).join('\n');
  const texts = p.entities.map((e, i) => (e.type === 'text' ? `\tC2D_TextParse(&texts[${i}], textBuf, "${cStr(e.text)}");\n\tC2D_TextOptimize(&texts[${i}]);` : '')).filter(Boolean).join('\n');
  return `// Generado por C3DS - ${cStr(p.name)}
// Compilar con devkitARM + libctru + citro2d (ver Makefile).
#include <3ds.h>
#include <citro2d.h>

#define NUM_ENTITIES ${n}

typedef struct { float x, y, speed; int player; } Entity;

static Entity ents[NUM_ENTITIES > 0 ? NUM_ENTITIES : 1];
static C2D_Text texts[NUM_ENTITIES > 0 ? NUM_ENTITIES : 1];

int main(int argc, char* argv[]) {
\t(void)argc; (void)argv;
\tgfxInitDefault();
\tC3D_Init(C3D_DEFAULT_CMDBUF_SIZE);
\tC2D_Init(C2D_DEFAULT_MAX_OBJECTS);
\tC2D_Prepare();

\tC3D_RenderTarget* top = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
\tC3D_RenderTarget* bottom = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
\tC2D_TextBuf textBuf = C2D_TextBufNew(4096);

${init}
${texts}

\twhile (aptMainLoop()) {
\t\thidScanInput();
\t\tu32 down = hidKeysDown();
\t\tu32 held = hidKeysHeld();
\t\tif (down & KEY_START) break;

\t\tfor (int i = 0; i < NUM_ENTITIES; i++) {
\t\t\tif (!ents[i].player) continue;
\t\t\tif (held & KEY_DLEFT)  ents[i].x -= ents[i].speed;
\t\t\tif (held & KEY_DRIGHT) ents[i].x += ents[i].speed;
\t\t\tif (held & KEY_DUP)    ents[i].y -= ents[i].speed;
\t\t\tif (held & KEY_DDOWN)  ents[i].y += ents[i].speed;
\t\t}

\t\tC3D_FrameBegin(C3D_FRAME_SYNCDRAW);
\t\tC2D_TargetClear(top, C2D_Color32(${tr}, ${tg}, ${tb}, 255));
\t\tC2D_SceneBegin(top);
${drawCalls(p, 'top')}
\t\tC2D_TargetClear(bottom, C2D_Color32(${br}, ${bg}, ${bb}, 255));
\t\tC2D_SceneBegin(bottom);
${drawCalls(p, 'bottom')}
\t\tC3D_FrameEnd(0);
\t}

\tC2D_TextBufDelete(textBuf);
\tC2D_Fini();
\tC3D_Fini();
\tgfxExit();
\treturn 0;
}
`;
}

export function generateMakefile(p) {
  const T = '\t';
  return `# Generado por C3DS. Basado en la plantilla oficial de libctru (solo C + citro2d).
.SUFFIXES:
ifeq ($(strip $(DEVKITARM)),)
$(error "Define DEVKITARM (instala devkitPro: https://devkitpro.org)")
endif
TOPDIR ?= $(CURDIR)
include $(DEVKITARM)/3ds_rules

TARGET      := game
BUILD       := build
SOURCES     := source
INCLUDES    := include

APP_TITLE       := ${cStr(p.name).slice(0, 0x40)}
APP_DESCRIPTION := ${cStr(p.description).slice(0, 0x80)}
APP_AUTHOR      := ${cStr(p.author).slice(0, 0x40)}
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
export _3DSXFLAGS += --smdh=$(OUTPUT).smdh

.PHONY: $(BUILD) clean all
all: $(BUILD)
$(BUILD):
${T}@mkdir -p $@
${T}@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile
clean:
${T}@rm -fr $(BUILD) $(TARGET).3dsx $(TARGET).smdh $(TARGET).elf $(TARGET).cia

# .cia: requiere makerom y bannertool en el PATH (ver README).
.PHONY: cia
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

export function generateWorkflow() {
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
          name: game-3ds
          path: |
            game.3dsx
            game.cia
`;
}

export function exportFiles(p) {
  const root = slug(p.name);
  const readme = `# ${p.name}

Proyecto generado con C3DS para Nintendo 3DS homebrew.

## Compilar .3dsx
1. Instala devkitPro con devkitARM, libctru y citro2d (\`dkp-pacman -S 3ds-dev\`).
2. Ejecuta \`make\` -> obtendrás \`game.3dsx\`.
3. Copia \`game.3dsx\` a \`/3ds/\` en la SD y ábrelo desde Homebrew Launcher, o pruébalo en Citra/Azahar.

También puedes subir esta carpeta a GitHub: el workflow incluido compila el .3dsx.

## Compilar .cia
Además necesitas [makerom](https://github.com/3DSGuy/Project_CTR) y [bannertool](https://github.com/diasurgical/bannertool) en el PATH. Después: \`make cia\` -> \`game.cia\` (instálalo con FBI). El workflow incluido los descarga y verifica su SHA-256.

Personaliza \`cia/banner.png\` (256×128), \`cia/icon.png\` (48×48) y \`cia/audio.wav\`; el UniqueId y el ProductCode están en \`cia/app.rsf\`.
`;
  return [
    { path: `${root}/source/main.c`, content: generateMainC(p) },
    { path: `${root}/Makefile`, content: generateMakefile(p) },
    { path: `${root}/project.c3ds.json`, content: JSON.stringify(p, null, 2) },
    { path: `${root}/README.md`, content: readme },
    { path: `${root}/.github/workflows/build.yml`, content: generateWorkflow() },
    ...ciaAssets(p).map((f) => ({ ...f, path: `${root}/${f.path}` })),
  ];
}
