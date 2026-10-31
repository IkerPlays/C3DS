# C3DS · web

Sitio web (Netlify): analizador de proyectos, editor y exportador. Código en `web/index.html` + `web/js`. Sin build: se publica tal cual.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `web-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Cómo añadir una build real
Crea `web/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `web/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
