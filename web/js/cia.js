// Recursos necesarios para empaquetar un .cia: app.rsf, icono, banner y audio de banner.
// Herramientas open source usadas en el build: makerom (3DSGuy/Project_CTR) y bannertool (diasurgical/bannertool).
import { encodePNG } from './png.js';
import { silentWav } from './wav.js';

export const MAKEROM_URL = 'https://github.com/3DSGuy/Project_CTR/releases/download/makerom-v0.18/makerom-v0.18-ubuntu_x86_64.zip';
export const MAKEROM_SHA256 = 'c6f8aafba8f1cdb403929719c95173cada707cd9ceacfa2bec5118f8f96c6f8a';
export const BANNERTOOL_URL = 'https://github.com/diasurgical/bannertool/releases/download/1.2.0/bannertool.zip';
export const BANNERTOOL_SHA256 = '69768596f836acb3e3aeaa66e47c6ba560dde813c6dfcd33c8afc25fe29b7524';

/** Hash FNV-1a de 32 bits. */
const fnv = (s) => { let h = 0x811c9dc5; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h; };

/** UniqueId determinista dentro del rango 0xF0000-0xFEFFF (evita choques con títulos oficiales y con 0xFF3FF). */
export function uniqueId(name) { return 0xf0000 + (fnv(name) % 0xf000); }

const alnum = (s, n, fallback) => (String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n) || fallback);

export function generateRsf(p, { romfs = false } = {}) {
  const id = uniqueId(p.name);
  return `# Generado por C3DS. Basado en el RSF de ejemplo de jakcron (autor de makerom).
BasicInfo:
  Title                   : ${alnum(p.name, 8, 'C3DSAPP')}
  ProductCode             : CTR-P-${alnum(p.name, 4, 'C3DS').padEnd(4, 'X')}
  Logo                    : Nintendo
${romfs ? `
RomFs:
  RootPath                : romfs
` : ''}
TitleInfo:
  Category                : Application
  UniqueId                : 0x${id.toString(16)}

Option:
  UseOnSD                 : true
  FreeProductCode         : true
  MediaFootPadding        : false
  EnableCrypt             : false
  EnableCompress          : true

AccessControlInfo:
  CoreVersion                   : 2
  DescVersion                   : 2
  ReleaseKernelMajor            : "02"
  ReleaseKernelMinor            : "33"
  UseExtSaveData                : false
  FileSystemAccess:
   - DirectSdmc
  MemoryType                    : Application
  SystemMode                    : 64MB
  IdealProcessor                : 0
  AffinityMask                  : 1
  Priority                      : 16
  MaxCpu                        : 0
  HandleTableSize               : 0x200
  DisableDebug                  : false
  EnableForceDebug              : false
  CanWriteSharedPage            : true
  CanUsePrivilegedPriority      : false
  CanUseNonAlphabetAndNumber    : true
  PermitMainFunctionArgument    : true
  CanShareDeviceMemory          : true
  RunnableOnSleep               : false
  SpecialMemoryArrange          : true
  SystemModeExt                 : 124MB
  CpuSpeed                      : 804MHz
  EnableL2Cache                 : true
  CanAccessCore2                : true
  IORegisterMapping:
   - 1ff00000-1ff7ffff
  MemoryMapping:
   - 1f000000-1f5fffff:r
  SystemCallAccess:
    ArbitrateAddress: 34
    Break: 60
    CancelTimer: 28
    ClearEvent: 25
    ClearTimer: 29
    CloseHandle: 35
    ConnectToPort: 45
    ControlMemory: 1
    CreateAddressArbiter: 33
    CreateEvent: 23
    CreateMemoryBlock: 30
    CreateMutex: 19
    CreateSemaphore: 21
    CreateThread: 8
    CreateTimer: 26
    DuplicateHandle: 39
    ExitProcess: 3
    ExitThread: 9
    GetCurrentProcessorNumber: 17
    GetHandleInfo: 41
    GetProcessId: 53
    GetProcessIdOfThread: 54
    GetProcessIdealProcessor: 6
    GetProcessInfo: 43
    GetResourceLimit: 56
    GetResourceLimitCurrentValues: 58
    GetResourceLimitLimitValues: 57
    GetSystemInfo: 42
    GetSystemTick: 40
    GetThreadContext: 59
    GetThreadId: 55
    GetThreadIdealProcessor: 15
    GetThreadInfo: 44
    GetThreadPriority: 11
    MapMemoryBlock: 31
    OutputDebugString: 61
    QueryMemory: 2
    ReleaseMutex: 20
    ReleaseSemaphore: 22
    SendSyncRequest1: 46
    SendSyncRequest2: 47
    SendSyncRequest3: 48
    SendSyncRequest4: 49
    SendSyncRequest: 50
    SetThreadPriority: 12
    SetTimer: 27
    SignalEvent: 24
    SleepThread: 10
    UnmapMemoryBlock: 32
    WaitSynchronization1: 36
    WaitSynchronizationN: 37
    Backdoor: 123
  ServiceAccessControl:
   - cfg:u
   - dsp::DSP
   - fs:USER
   - gsp::Gpu
   - hid:USER
   - ndm:u
   - pxi:dev
   - APT:U
   - ac:u
   - am:net
   - boss:U
   - cam:u
   - cecd:u
   - csnd:SND
   - frd:u
   - http:C
   - ir:USER
   - ir:u
   - ir:rst
   - ldr:ro
   - mic:u
   - news:u
   - nim:aoc
   - nwm::UDS
   - ptm:u
   - soc:U
   - ssl:C
   - y2r:u

SystemControlInfo:
  SaveDataSize: 0K
  RemasterVersion: 0
  StackSize: 0x40000
  Dependency:
    ac: 0x0004013000002402
    am: 0x0004013000001502
    boss: 0x0004013000003402
    camera: 0x0004013000001602
    cecd: 0x0004013000002602
    cfg: 0x0004013000001702
    codec: 0x0004013000001802
    csnd: 0x0004013000002702
    dlp: 0x0004013000002802
    dsp: 0x0004013000001a02
    friends: 0x0004013000003202
    gpio: 0x0004013000001b02
    gsp: 0x0004013000001c02
    hid: 0x0004013000001d02
    http: 0x0004013000002902
    i2c: 0x0004013000001e02
    ir: 0x0004013000003302
    mcu: 0x0004013000001f02
    mic: 0x0004013000002002
    ndm: 0x0004013000002b02
    news: 0x0004013000003502
    nim: 0x0004013000002c02
    nwm: 0x0004013000002d02
    pdn: 0x0004013000002102
    ps: 0x0004013000003102
    ptm: 0x0004013000002202
    ro: 0x0004013000003702
    socket: 0x0004013000002e02
    spi: 0x0004013000002302
    ssl: 0x0004013000002f02
`;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Imagen sencilla: degradado vertical con el color del proyecto y un marco claro. */
export function gradientPNG(w, h, hexColor) {
  const [r, g, b] = /^#[0-9a-f]{6}$/i.test(hexColor) ? hex(hexColor) : [29, 43, 83];
  const px = new Uint8Array(w * h * 4);
  const border = Math.max(1, Math.round(Math.min(w, h) / 24));
  for (let y = 0; y < h; y++) {
    const k = 0.55 + 0.45 * (1 - y / (h - 1));
    for (let x = 0; x < w; x++) {
      const edge = x < border || y < border || x >= w - border || y >= h - border;
      const i = (y * w + x) * 4;
      px[i] = edge ? 255 : Math.round(r * k); px[i + 1] = edge ? 255 : Math.round(g * k); px[i + 2] = edge ? 255 : Math.round(b * k); px[i + 3] = 255;
    }
  }
  return encodePNG(w, h, px);
}

export function ciaAssets(p, opts = {}) {
  return [
    { path: 'cia/app.rsf', content: generateRsf(p, opts) },
    { path: 'cia/banner.png', content: gradientPNG(256, 128, p.scenes[0]?.bg.top) },
    { path: 'cia/icon.png', content: gradientPNG(48, 48, '#ff004d') },
    { path: 'cia/audio.wav', content: silentWav() },
  ];
}
