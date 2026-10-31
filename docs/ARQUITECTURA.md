# Arquitectura

C3DS es una web estática (sin build) más una función de Netlify. Todo el código del editor son módulos ES en `web/js/`.

## Piezas
| Módulo | Qué hace |
|---|---|
| `model.js` | Modelo del proyecto (escenas, objetos, reglas, variables, recursos), validación, estimación de memoria. |
| `rules.js` | Esquema de eventos/acciones y su resumen en lenguaje natural. |
| `runtime.js` | **Simulador**: `Game` (lógica pura, probada en Node), `render`, mando/teclado. Es la misma lógica que el C generado. |
| `codegen.js` | Genera el proyecto de 3DS (`main.c`, `Makefile`, `.t3s`, workflow). Cualquier cambio de comportamiento se hace **en runtime.js y codegen.js a la vez**. |
| `cia.js` | `app.rsf`, banner, icono y audio para el `.cia`. |
| `editor.js` | Interfaz del editor (DOM). `history.js` (deshacer), `storage.js` (localStorage), `share.js` (enlaces). |
| `importer.js`, `godot.js`, `unity.js`, `detect.js`, `analyze.js`, `pe.js` | Análisis y conversión de proyectos ajenos. |
| `html5.js`, `runtime-source.js` | Exportación HTML5 (el motor se incrusta como texto; **se regenera con `npm run gen:runtime`**). |
| `home.js`, `downloads.js`, `icons.js`, `theme.js` | Inicio, descargas desde las releases de GitHub, iconos SVG y tema. |

## Flujo de un cambio de comportamiento
1. `model.js` / `rules.js`: nuevo campo, evento o acción.
2. `runtime.js`: cómo se simula. 3. `codegen.js`: el mismo comportamiento en C.
4. `editor.js`: cómo se edita. 5. Tests en `tests/web/` (y `tests/ui/` si hay interfaz).
6. `npm run gen:runtime && npm run gen:docs`, `CHANGELOG.md`.

## Pruebas
- `npm test`: unitarias (Node). Incluye comprobaciones de que `runtime-source.js` y `docs/REFERENCIA.md` están sincronizados.
- `npm run test:ui`: Chromium con Playwright (editor, importadores, exportaciones, descargas, accesibilidad).
- El CI (`.github/workflows/ci.yml`) además **compila de verdad** cada plantilla a `.3dsx` y `.cia` con devkitARM, y empaqueta el juego para Windows, macOS y Linux con Tauri.

## Compilación en la nube
`netlify/functions/build.mjs` → `lib/cloud-core.mjs`: recibe el **proyecto** (datos), regenera los archivos con las plantillas del sitio y lanza `cloud-build.yml`. Detalles de seguridad en `docs/CLOUD-BUILD.md`.

## Releases
Ver `docs/RELEASING.md`. La web se despliega en Netlify y no va en las releases.
