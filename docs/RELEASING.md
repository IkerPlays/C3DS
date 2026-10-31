# Releases y devbuilds

Hay tres tipos de publicación. Todas se hacen con GitHub Actions (`.github/workflows/`).

| Tipo | Cuándo | Tag | Notas | Workflow |
|---|---|---|---|---|
| **Release global** | Update para todos los dispositivos | `vX.Y.Z` | `CHANGELOG.md` (raíz) | `release.yml` |
| **Release individual** | Update de una sola plataforma | `<plataforma>-vX.Y.Z` | `<plataforma>/CHANGELOG.md` | `release-platform.yml` |
| **Devbuild** | Cambios pequeños en `main` | `dev-<plataforma>-<n>` (prerelease) | commits de esa carpeta | `devbuild.yml` |

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
Cada push a `main` que toque `<plataforma>/**` publica una pre-release `dev-<plataforma>-<n>` solo para esa plataforma (cambios en `scripts/` reconstruyen todas). Se conservan las 10 últimas por plataforma. También se pueden lanzar a mano (Actions → Devbuild → Run workflow). Su versión es `X.Y.Z-dev.<n>.<sha>`.

## Añadir una build real a una plataforma
Crea `<plataforma>/build.sh`; se ejecuta en el runner de esa plataforma (ver `platforms.json`) con `C3DS_VERSION` definida y debe dejar los binarios en `<plataforma>/dist/`. Si no existe, la release contiene un zip con las fuentes (estado actual de las apps nativas).

## Web (Netlify)
`netlify.toml` publica la carpeta `web/` sin build. Conecta el repositorio en Netlify y se despliega solo en cada push a `main`. La release de la plataforma `web` es solo un zip del mismo sitio.
