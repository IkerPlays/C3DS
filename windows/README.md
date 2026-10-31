# C3DS · windows

App de escritorio para Windows con [Tauri v2](https://tauri.app) (open source). Empaqueta `web/` en una ventana nativa. Salida: instalador `-setup.exe` (NSIS) y `-portable.exe`.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `windows-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Build
`build.sh` (en esta carpeta) se ejecuta en el CI con `C3DS_VERSION` y deja los binarios en `dist/`, con nombre `C3DS-<versión>-<Plataforma>*`. Lógica compartida en `scripts/build-tauri.sh`; plantilla del proyecto nativo en `shared/tauri/`. Local: `C3DS_VERSION=0.1.0 bash build.sh`.
