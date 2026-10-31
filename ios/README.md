# C3DS · ios

App iOS con [Capacitor](https://capacitorjs.com) (open source). Salida: `.ipa` **sin firmar** (`-unsigned.ipa`); instálalo firmándolo con AltStore/Sideloadly/Xcode. La distribución en App Store requiere cuenta de Apple Developer.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `ios-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Build
`build.sh` (en esta carpeta) se ejecuta en el CI con `C3DS_VERSION` y deja los binarios en `dist/`, con nombre `C3DS-<versión>-<Plataforma>*`. Lógica compartida en `scripts/build-capacitor.sh`; plantilla del proyecto nativo en `shared/capacitor/`. Local: `C3DS_VERSION=0.1.0 bash build.sh`.
