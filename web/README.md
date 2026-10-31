# C3DS · web

Sitio web (Netlify): analizador de proyectos, editor y exportador. Código en `web/index.html` + `web/js`. Sin build: se publica tal cual. **No se incluye en las releases** (solo en Netlify).

## Versionado
- `VERSION` y `CHANGELOG.md` de esta carpeta documentan la web; el despliegue es automático en Netlify (cada push a `main`).
- La web **no** se publica en releases ni en devbuilds; las apps nativas la llevan empaquetada (por eso un cambio aquí sí dispara un devbuild de las apps).

## Cómo añadir una build real
Crea `web/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `web/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
