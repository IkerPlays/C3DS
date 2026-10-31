# C3DS

Importa/analiza proyectos (Unity, Godot, Unreal, .exe) para **Nintendo 3DS homebrew** y crea juegos/apps desde cero con un editor visual que exporta un proyecto compilable a `.3dsx` y `.cia`.

> Estado: **alfa 0.1**. Empezamos por lo sencillo; ver "Qué hace hoy" y "Qué NO hace (todavía)".

## Qué hace hoy
- **Editor visual** (pestaña *Editor*): escenas, sprites, sonido, variables, reglas “cuando → entonces”, botones táctiles, **vista previa** al instante, guardado automático en el navegador y deshacer/rehacer.
- **Exportar**: proyecto 3DS (`.zip` → `make` = `.3dsx`, `make cia` = `.cia`), juego **HTML5** y **compilación en la nube** (ver [docs/CLOUD-BUILD.md](docs/CLOUD-BUILD.md)).
- **Importar y analizar** (en el navegador, sin subir nada): Unity, Godot, Unreal y `.exe`; mide límites de la 3DS, **convierte texturas y audio** (PNG en potencia de 2 ≤1024, WAV) y crea un proyecto del editor con ellos.
- **Apps**: Windows, macOS, Linux (Tauri) · Android, iOS (Capacitor). Aviso de nueva versión.

## Qué NO hace (todavía) — y por qué
- **No convierte un proyecto de Unity/Godot/Unreal tal cual**: ningún motor tiene runtime para la 3DS (ARM11, 64–124 MB de RAM, GPU PICA200). Se reutilizan los assets y se rehace la lógica ([guía de portado](#) dentro del zip de assets).
- **No convierte un `.exe`**: un binario x86/x64 no se puede pasar a ARM11 automáticamente.
- **Windows `.exe` desde el editor** y **actualizaciones automáticas dentro de las apps**: pendientes (hoy hay HTML5, la app de escritorio y un aviso de versión).
- El `.cia` compila en el CI, pero **no se ha probado en consola real**. Para probar el `.3dsx`/`.cia` usa el emulador [Azahar](https://azahar-emu.org) o una consola con homebrew.
- macOS no está notarizado, iOS sale sin firmar y Android usa clave de depuración.

## Estructura
```
web/        sitio estático (Netlify)         android/  ios/  windows/  macos/  linux/   apps nativas
shared/     plantillas Tauri y Capacitor      assets/  icono fuente
scripts/    release-info, package, plan-devbuild, changelog     tests/   pruebas (node:test + Playwright)
netlify/    Function de compilación en la nube
.github/workflows/   ci · release · release-platform · devbuild · cloud-build · _build
docs/RELEASING.md    cómo publicar
```

## Desarrollo
```bash
npm test          # pruebas unitarias (Node >= 20)
npm run test:ui   # pruebas de interfaz (Chromium + Playwright)
npm run serve     # sirve web/ en http://localhost:8080
```
Releases y devbuilds: [docs/RELEASING.md](docs/RELEASING.md).
