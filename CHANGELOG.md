# Changelog

Notas de las releases **globales** (todas las plataformas a la vez). Cada plataforma tiene además su propio `CHANGELOG.md`.
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado: [SemVer](https://semver.org/lang/es/).

## [Unreleased]
- Reglas: evento **“Se suelta un botón”** (simulador, C con `hidKeysUp` y mando).
- Arreglo: el inspector de objetos mostraba la palabra “null” entre campos.
- Objetos **sólidos** (muros, suelos, plataformas) que bloquean el paso, en simulador y en C; plantilla **Laberinto**.
- Reglas: acción **“Cambiar animación de un sprite”** (andar, saltar, parado…) en simulador, C y referencia.
- Plantilla **Topos** (táctil, temporizador y cuenta atrás); el CI la compila a `.3dsx`/`.cia`.
- Reglas: acción **“Poner variable a un número al azar”** (simulador, C y referencia).
- Arreglo del formato del changelog de la 0.3.0.

## [0.3.0] - 2026-10-31
- Reglas: evento **“Se toca la pantalla táctil”** y acción **“Cambiar el color de un objeto”**.
- **Mando** (API Gamepad) en la vista previa: botones con disposición Nintendo y stick como Circle Pad.
- **Arrastrar y soltar** imágenes, sonidos o un `.c3ds.json` sobre el escenario del editor.
- Descargas: lista de **versiones anteriores** con enlaces por sistema.
- **Compartir con un enlace**: el proyecto viaja comprimido dentro del enlace (`#p=…`); quien lo abre lo ve en su editor. Sin servidor.
- **Accesibilidad**: los botones solo con icono tienen nombre accesible (y un test lo vigila).
- **Iconos SVG propios** (Windows, macOS, Linux, Android, iOS, plantillas, lecciones, menús y botones del editor) en lugar de emojis.
- **Tamaño de texto** configurable (también en la 3DS). La compilación en la nube indica el paso que falló.
- **Lecciones**: 5 mini-proyectos guiados (mover, colisiones, variables, escenas, sonido) en el Inicio y en 📁 Proyectos.

## [0.2.0] - 2026-10-31
### Añadido
- **Exportar tu juego a macOS (`.dmg`) y Linux (`.AppImage` + `.deb`)** desde el editor, además de Windows, con la compilación en la nube (Tauri).
- **Web**: nueva página de **Inicio** (qué es C3DS, demo en vivo, funciones, cómo funciona, plantillas, estado y honestidad sobre las limitaciones) y pestaña de **Descargas** que lee las releases de GitHub, recomienda el archivo de tu sistema, muestra las novedades, el checksum y los devbuilds.
- **Web**: tema claro/oscuro/auto, diseño renovado, instalable como **PWA** (editor sin conexión).
- **Editor**: plantillas (Recoger monedas, **Pong**, **Esquivar**, en blanco), velocidad automática de objetos, evento “toca el borde”, acción “cambiar velocidad”, control solo horizontal/vertical, colocar al azar por eje, centrar, orden de capas, duplicar escena, coordenadas del cursor y ayuda de atajos (`?`).
- **Simulación**: pausa, paso a paso (frame), reinicio, velocidad 0.5×–4×, cajas de colisión y variables editables en vivo.
- **Editor**: reglas que se pueden desactivar y reordenar, con resumen en lenguaje natural; copiar y pegar objetos (también entre escenas); guía de bienvenida.
- **Motor 3DS**: control con **Circle Pad** y **seguir el stylus**; **música en bucle** y acción “parar sonido”; variables que se **guardan en la SD** (récords); **animación de sprites** con cortador de hojas de sprites.
- Plantilla **Arcade** (Circle Pad + stylus + música + total guardado + moneda animada). La moneda de la plantilla de ejemplo ahora gira.
- **Memoria**: estimación de VRAM/audio con aviso si superas los límites de la 3DS; botón 📸 Captura en la vista previa.
- **Plataformas**: gravedad, evento “apoyado sobre”, acción “aterrizar sobre” y reglas con condición adicional (“Y además”). Plantilla **Corredor** (saltos, obstáculos y récord).
- **Importar Godot**: las escenas `.tscn` se convierten en escenas del editor (sprites con su textura, textos, rectángulos de color y botones, escalados a las pantallas de la 3DS).
- **Importar Unity**: las escenas `.unity` (YAML de texto) con sprites 2D se convierten en escenas del editor, usando los `.meta` para encontrar las texturas.
- `docs/REFERENCIA.md`: referencia del editor generada desde el código (y vigilada por un test).
- **Exportar HTML5 para itch.io** (`.zip` con `index.html`). Las plantillas del Inicio muestran una miniatura en vivo.
- Tests: 85 unitarios y 26 de interfaz.

## [0.1.0] - 2026-10-31
Primera versión pública (alfa).

### Editor
- Rediseño completo de la interfaz: escenas, objetos, recursos y variables a la izquierda; propiedades, lógica y escena a la derecha; cuadrícula, zoom y arrastrar/redimensionar en el escenario.
- **Sprites e imágenes** (PNG/JPG/WebP…, se reducen a ≤512 px) → `tex3ds` → `.t3x`; **sonido** (WAV/OGG/MP3 → WAV mono 22 kHz) con ndsp.
- **Escenas y lógica**: varias escenas, variables, reglas “cuando → entonces” (botones, colisiones, toques, variables, temporizadores), botones táctiles en la pantalla inferior, texto con `{variable}`.
- **Vista previa** dentro del editor con el mismo motor que el exportador HTML5 (teclado, ratón/táctil y mando en pantalla).
- **Guardado automático** en el navegador (varios proyectos), deshacer/rehacer (Ctrl+Z / Ctrl+Y), copia en archivo `.c3ds.json`.
- **Exportar**: proyecto 3DS (`.zip` con `make` y `make cia`), juego HTML5 (un solo archivo), **juego para Windows `.exe`** (en la nube, con Tauri) y compilación en la nube.

### Compilación
- `.3dsx` y **`.cia`** (makerom 0.18 + bannertool 1.2.0, fijados por SHA-256). El CI compila un proyecto de ejemplo con sprites y sonido.
- **Compilación en la nube** (Netlify Function + GitHub Actions): devuelve los archivos como artifact, sin crear releases. Ver `docs/CLOUD-BUILD.md`.

### Importador
- Análisis de Unity, Godot, Unreal y `.exe`; **conversión de assets** (texturas a PNG ≤1024 en potencia de 2, audio a WAV) y creación de un proyecto del editor con ellos; guía de portado.
- Aviso dentro de la app cuando hay una versión nueva.

### Apps y releases
- Apps nativas: Windows, macOS, Linux (Tauri v2), Android, iOS (Capacitor).
- Archivos con nombres claros: `C3DS-<versión>-<Plataforma>…` (p. ej. `C3DS-0.1.0-Windows-Setup.exe`).
- Workflows: CI (tests + interfaz con Playwright + compilación real de ejemplos), release global, release por plataforma, devbuilds (`dev-<n>`) y cloud build.
- La web se despliega en Netlify y **no** se incluye en las releases.

### Limitaciones conocidas
- Actualizaciones automáticas dentro de las apps pendientes (requieren claves de firma propias); hoy hay aviso de nueva versión.
- Unity/Godot/Unreal no se convierten automáticamente: se reutilizan los assets y se rehace la lógica. Un `.exe` solo se analiza.
- macOS sin notarizar, iOS sin firmar y Android con clave de depuración.
- El `.cia` no se ha probado en consola real.
