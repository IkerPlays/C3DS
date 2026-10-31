# C3DS

Importa/analiza proyectos (Unity, Godot, Unreal, .exe) para **Nintendo 3DS homebrew** y crea juegos/apps desde cero con un editor visual que exporta un proyecto compilable a `.3dsx` y `.cia`.

> Estado: **alfa 0.1**. Empezamos por lo sencillo; ver "Qué hace hoy" y "Qué NO hace (todavía)".

## Qué hace hoy
- **Importar y analizar** (en el navegador, sin subir nada): detecta Unity/Godot/Unreal/.exe, mide texturas PNG, cuenta scripts/shaders/modelos y los compara con los límites de la 3DS (ver pestaña *Límites*).
- **Editor**: objetos rectángulo/texto en las pantallas superior (400×240) e inferior (320×240), movimiento con D-Pad. **Exportar .zip** → proyecto C (libctru + citro2d) + `Makefile` + workflow de GitHub que compila el `.3dsx` y el `.cia` (con banner, icono y `app.rsf` generados).

## Qué NO hace (todavía) — y por qué
- **No convierte un proyecto de Unity/Godot/Unreal tal cual**: ningún motor tiene runtime para la 3DS (ARM11, 64–124 MB de RAM, GPU PICA200). Lo realista es reutilizar assets y portar la lógica.
- **No convierte un `.exe`**: un binario x86/x64 no se puede pasar a ARM11 automáticamente.
- **Compilar desde la web**: la web no compila; el proyecto exportado se compila con `make` / `make cia` en local o con el workflow de GitHub incluido (devkitARM + makerom + bannertool).
- El `Makefile` generado sigue la plantilla oficial de libctru pero **no se ha podido compilar en este entorno** (sin devkitPro): pruébalo y avisa si falla.
- Apps nativas (Tauri para escritorio, Capacitor para móvil): envuelven la misma web. macOS no está notarizado e iOS sale sin firmar; Android usa clave debug.

## Estructura
```
web/        sitio estático (Netlify)         android/  ios/  windows/  macos/  linux/   apps nativas
shared/     plantillas Tauri y Capacitor      assets/  icono fuente
scripts/    release-info, package, plan-devbuild, changelog     tests/   pruebas (node:test)
.github/workflows/   ci · release · release-platform · devbuild · _build
docs/RELEASING.md    cómo publicar
```

## Desarrollo
```bash
npm test          # pruebas (Node >= 20)
npm run serve     # sirve web/ en http://localhost:8080
```
Releases y devbuilds: [docs/RELEASING.md](docs/RELEASING.md).
