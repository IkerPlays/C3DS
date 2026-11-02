# Tráiler de C3DS

Todo el tráiler se genera con código, así que se puede rehacer cada vez que cambie la app:

- **Imagen:** `make.mjs` abre la web de verdad con Playwright (Chromium), la maneja con un cursor visible, subtítulos y anillos de resalte, y graba cada escena.
- **Música:** `music.py` sintetiza una pista original (120 BPM, La menor) con numpy. No usa samples ni voces.
- **Montaje:** `assemble.mjs` recorta cada clip, los une al compás de la música (los *drops* caen en los segundos 16 y 60) y mezcla el audio.
- **Miniatura:** `thumbnail.mjs`.

## Cómo regenerarlo

Hace falta Node 20+, Playwright con Chromium, Python 3 con numpy y ffmpeg.

```bash
python3 trailer/music.py /tmp/trailer/musica.wav
node trailer/make.mjs /tmp/trailer/clips            # graba las 12 escenas (unos 3 min)
node trailer/make.mjs /tmp/trailer/clips 05-logica  # o solo las que contengan ese nombre
node trailer/assemble.mjs /tmp/trailer/clips /tmp/trailer/musica.wav trailer/out/C3DS-trailer.mp4
node trailer/thumbnail.mjs trailer/out/C3DS-trailer-miniatura.png
```

Para la versión en inglés, antes de `make.mjs` y `thumbnail.mjs` hay que indicar el idioma (los subtítulos, las tarjetas y el montaje de plantillas cambian; la interfaz de la app sigue en español porque aún no tiene versión en inglés):

```bash
TRAILER_LANG=en node trailer/make.mjs /tmp/trailer/clips-en
node trailer/assemble.mjs /tmp/trailer/clips-en /tmp/trailer/musica.wav trailer/out/C3DS-trailer-en.mp4
node trailer/thumbnail.mjs trailer/out/C3DS-trailer-thumbnail-en.png en
```

`trailer/out/` no se sube al repositorio.

## Guion (84 s, 1920×1080, 30 fps)

| Tiempo | Escena | Qué enseña |
|---|---|---|
| 0:00 | Intro | Logo y lema |
| 0:04 | Inicio | La web con la demo en vivo; cambio de tema claro/oscuro |
| 0:10 | Plantillas | El diálogo de proyectos y plantillas |
| 0:16 | Editor | Arrastrar objetos, inspector, gravedad y objetos sólidos |
| 0:26 | Lógica y simulador | Reglas visuales, partida de prueba, pausa y paso a paso |
| 0:36 | Montaje | 8 plantillas jugando solas dentro de una 3DS |
| 0:44 | Recursos | Sprites, cortador de hojas, sonido, variables y escenas |
| 0:52 | Exportar | `.3dsx`/`.cia`, HTML5, Windows, macOS, Linux, enlace |
| 1:00 | Descargas | Las releases de GitHub, por sistema |
| 1:05 | Importar | Un proyecto de Godot convertido en escenas |
| 1:10 | Plataformas | Un proyecto, todas las plataformas |
| 1:18 | Cierre | Logo y enlace del repositorio |

Para cambiar una escena, edita su bloque en `make.mjs`. El campo `dur` es la duración final en segundos, y `speed` acelera los gestos de esa escena si no caben.
