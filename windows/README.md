# C3DS · windows

App Windows. **Pendiente.** Propuesta: Tauri o Electron, con integración del toolchain devkitPro para compilar `.3dsx`/`.cia` en local y exportar `.exe`.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `windows-vX.Y.Z`. Devbuild: automático al hacer push a `main` con cambios en esta carpeta.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Cómo añadir una build real
Crea `windows/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `windows/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
