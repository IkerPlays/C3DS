# Releases y devbuilds

Hay tres tipos de publicación. Todas se hacen con GitHub Actions (`.github/workflows/`).

| Tipo | Cuándo | Tag | Notas | Workflow |
|---|---|---|---|---|
| **Release global** | Update para todos los dispositivos | `vX.Y.Z` | `CHANGELOG.md` (raíz) | `release.yml` |
| **Release individual** | Update de una sola plataforma | `<plataforma>-vX.Y.Z` | `<plataforma>/CHANGELOG.md` | `release-platform.yml` |
| **Devbuild** | Cambios pequeños en `main` | `dev-<n>` (prerelease) | commits desde la anterior | `devbuild.yml` |

Plataformas: `web`, `android`, `ios`, `windows`, `macos`, `linux` (definidas en `scripts/platforms.json`).

## Release global
1. Sube la versión en `VERSION` (raíz) y, si procede, en `<plataforma>/VERSION`.
2. En `CHANGELOG.md` renombra `## [Unreleased]` a `## [X.Y.Z] - AAAA-MM-DD` (y deja un `## [Unreleased]` vacío arriba).
3. Merge a `main`, y después:
   ```bash
   git tag v0.2.0 && git push origin v0.2.0
   ```
4. El workflow valida que el tag == `VERSION` y que existe la sección del changelog (si no, falla), compila las 6 plataformas, genera `SHA256SUMS.txt` y crea la release con todos los archivos y el changelog. Un tag con sufijo (`v0.2.0-beta.1`) se publica como *pre-release*.

## Release individual
Igual, pero con `<plataforma>/VERSION`, `<plataforma>/CHANGELOG.md` y el tag `android-v0.1.1`.

## Devbuilds
Cada push a `main` que toque cualquier plataforma (o `scripts/`, `VERSION`) publica **una sola** pre-release `dev-<n>` con los archivos de **todas** las plataformas, igual que la release estable global, y la lista de commits. Se conservan las 10 últimas. También se puede lanzar a mano (Actions → Devbuild → Run workflow). Su versión es `X.Y.Z-dev.<n>` (`VERSION` de la raíz); el commit está en las notas. Si una plataforma falla se publica igualmente con las demás y la nota lo avisa.

## Añadir una build real a una plataforma
Crea `<plataforma>/build.sh`; se ejecuta en el runner de esa plataforma (ver `platforms.json`) con `C3DS_VERSION` definida y debe dejar los binarios en `<plataforma>/dist/`. Hoy: Windows/macOS/Linux con Tauri v2 (`scripts/build-tauri.sh`), Android/iOS con Capacitor (`scripts/build-capacitor.sh`). Los archivos deben llamarse `C3DS-<versión>-<Plataforma>*` (el packager exporta la variable `C3DS_ASSET_PREFIX`; p. ej. `C3DS-0.1.0-Windows-Setup.exe`) (el packager lo valida) y se publican tal cual en la release. Si no existe `build.sh` (caso de `web`), se publica un zip con las fuentes.

## Web (Netlify)
`netlify.toml` publica la carpeta `web/` sin build. Conecta el repositorio en Netlify y se despliega solo en cada push a `main`. La release de la plataforma `web` es solo un zip del mismo sitio.
