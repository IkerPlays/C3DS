# C3DS · ios

App iOS/iPadOS. **Pendiente.** Propuesta: Capacitor. Requiere runner macOS y cuenta de desarrollador de Apple para firmar.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `ios-vX.Y.Z`. Devbuild: automático al hacer push a `main` con cambios en esta carpeta.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Cómo añadir una build real
Crea `ios/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `ios/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
