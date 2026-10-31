# Changelog

Notas de las releases **globales** (todas las plataformas a la vez). Cada plataforma tiene además su propio `CHANGELOG.md`.
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado: [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### Añadido
- **.cia**: el proyecto 3DS exportado compila también a `.cia` (`make cia`) con makerom y bannertool (versiones fijadas y verificadas por SHA-256). CI valida el generador compilando un proyecto de ejemplo con devkitARM.
- **Apps nativas con build real**: Windows (`-setup.exe` y portable), macOS (`.dmg`), Linux (`.deb`, `.AppImage`) con Tauri v2; Android (`.apk`) e iOS (`.ipa` sin firmar) con Capacitor. Las releases publican los binarios directamente, no zips.

## [0.1.0] - 2026-10-31
### Añadido
- **Web**: analizador de proyectos Unity, Godot y Unreal (carpeta o .zip) y de ejecutables .exe, con informe de compatibilidad con los límites de la 3DS.
- **Web**: editor visual básico (pantalla superior e inferior) que exporta un proyecto C + citro2d con `Makefile` y workflow para compilar `.3dsx`.
- Estructura de carpetas `web/`, `android/`, `ios/`, `windows/`, `macos/`, `linux/` (las apps nativas son por ahora esqueletos).
- Workflows: CI, release global, release por plataforma y devbuilds.

### Limitaciones conocidas
- La generación de `.cia` y la compilación en la nube aún no están implementadas.
- Un `.exe` nativo no se puede convertir a 3DS; solo se analiza.
