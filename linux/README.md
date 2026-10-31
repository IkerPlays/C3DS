# C3DS · linux

App Linux. **Pendiente.** Propuesta: mismo stack que Windows/macOS; distribución como AppImage/.deb.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `linux-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Cómo añadir una build real
Crea `linux/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `linux/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
