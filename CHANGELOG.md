# Changelog

Notas de las releases **globales** (todas las plataformas a la vez). Cada plataforma tiene además su propio `CHANGELOG.md`.
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado: [SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.0] - 2026-10-31
### Añadido
- **Web**: analizador de proyectos Unity, Godot y Unreal (carpeta o .zip) y de ejecutables .exe, con informe de compatibilidad con los límites de la 3DS.
- **Web**: editor visual básico (pantalla superior e inferior) que exporta un proyecto C + citro2d con `Makefile` y workflow para compilar `.3dsx`.
- Estructura de carpetas `web/`, `android/`, `ios/`, `windows/`, `macos/`, `linux/` (las apps nativas son por ahora esqueletos).
- Workflows: CI, release global, release por plataforma y devbuilds.

### Limitaciones conocidas
- La generación de `.cia` y la compilación en la nube aún no están implementadas.
- Un `.exe` nativo no se puede convertir a 3DS; solo se analiza.
