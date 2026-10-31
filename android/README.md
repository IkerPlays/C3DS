# C3DS · android

App Android. **Pendiente.** Propuesta: empaquetar la web con Capacitor (WebView) + acceso nativo a ficheros para importar proyectos grandes.

## Versionado y releases
- Versión actual: ver `VERSION`. Notas: `CHANGELOG.md`.
- Release individual: tag `android-vX.Y.Z`. Devbuild: automático al hacer push a `main`; incluye todas las plataformas en una sola pre-release `dev-<n>`.
- Ver [docs/RELEASING.md](../docs/RELEASING.md).

## Cómo añadir una build real
Crea `android/build.sh`: se ejecuta en el CI (variable `C3DS_VERSION`) y debe dejar los binarios en `android/dist/`. Lo que haya en `dist/` es lo que se publica; mientras no exista `build.sh`, se publica un zip con las fuentes.
