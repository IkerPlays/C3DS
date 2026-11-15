# Despedida de C3DS

**C3DS 1.0.0 es la última versión.** No habrá más actualizaciones.

Gracias por haber hecho juegos aquí. C3DS nació con una idea sencilla: que crear un juego para la Nintendo 3DS no exigiera montar un toolchain ni saber C. Llega a su versión final con:

- un **editor visual** con escenas, sprites animados, sonido (con volumen), variables y reglas;
- un **simulador** con pausa, paso a paso y depuración, que usa la misma lógica que el juego exportado;
- un **motor** con física (gravedad, sólidos, perseguir), cámara con scroll, paralaje, transiciones y pausa;
- **11 plantillas** y **9 lecciones**, en español e inglés;
- exportación a **`.3dsx` y `.cia`**, HTML5, **Windows, macOS, Linux, Android e iOS**;
- importadores de **Godot** y **Unity**.

## Qué pasa ahora
- **Todo sigue funcionando.** La web, las apps y tus proyectos (guardados en tu navegador; exporta una copia con *Exportar → Copia del proyecto*).
- **El código es libre.** Puedes hacer un fork, alojarlo tú mismo (`web/` es un sitio estático) o seguir mejorándolo. La guía para contribuir está en [`ARQUITECTURA.md`](ARQUITECTURA.md).
- **Tus juegos son tuyos.** Lo exportado no depende de C3DS.

## Lo que quedó sin hacer
- Actualizaciones automáticas dentro de las apps (necesitan claves de firma propias).
- Tilemaps y más importadores de escenas (Unreal, mapas de Unity/Godot).
- Probar el `.cia` en una consola real: se compila en el CI, pero no se ha probado en hardware.

## Gracias
A quienes mantienen devkitPro, libctru, citro2d, tex3ds, makerom y bannertool; a Tauri y Capacitor; y a la comunidad del homebrew de 3DS. Sin su trabajo esto no existiría.

*Hasta siempre, y a seguir creando.* 🎮

---

# Farewell (English)

**C3DS 1.0.0 is the last version.** There will be no more updates.

Thank you for making games here. C3DS started with a simple idea: creating a Nintendo 3DS game should not require setting up a toolchain or knowing C. It reaches its final version with a visual editor, a simulator, an engine with physics, a scrolling camera, parallax, transitions and pause, **11 templates** and **9 lessons** in Spanish and English, export to `.3dsx`/`.cia`, HTML5, Windows, macOS, Linux, Android and iOS, and Godot/Unity importers.

**What now:** everything keeps working; the code is free (fork it, host `web/` yourself, keep improving it); your exported games are yours.

**Left undone:** automatic in-app updates, tilemaps and more scene importers, and testing the `.cia` on real hardware.

Thanks to everyone who maintains devkitPro, libctru, citro2d, tex3ds, makerom, bannertool, Tauri and Capacitor, and to the 3DS homebrew community.

*So long, and keep creating.* 🎮
