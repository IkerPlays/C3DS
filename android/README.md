# C3DS · android

App Android con [Capacitor](https://capacitorjs.com) (open source), que envuelve `web/` en un WebView. Salida: `.apk` firmado con la clave *debug* (instalable directamente). Para Play Store hará falta una clave de firma propia. Limitación: Android no permite elegir carpetas con `<input webkitdirectory>`; usa `.zip`.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `android-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Build
`build.sh` (en esta carpeta) se ejecuta en el CI con `C3DS_VERSION` y deja los binarios en `dist/`, con nombre `C3DS-<versión>-<Plataforma>*`. Lógica compartida en `scripts/build-capacitor.sh`; plantilla del proyecto nativo en `shared/capacitor/`. Local: `C3DS_VERSION=0.1.0 bash build.sh`.
