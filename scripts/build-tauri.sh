#!/usr/bin/env bash
# Compila la app de escritorio (Tauri v2, open source) para windows | macos | linux.
#   C3DS_VERSION=1.2.3 bash scripts/build-tauri.sh <plataforma>
# Deja los instaladores en <plataforma>/dist/ con nombre C3DS-<versión>-<Plataforma>* (C3DS_ASSET_PREFIX).
set -euo pipefail
platform="${1:?uso: build-tauri.sh <windows|macos|linux>}"
V="${C3DS_VERSION:?define C3DS_VERSION}"
P="${C3DS_ASSET_PREFIX:?define C3DS_ASSET_PREFIX}"   # p. ej. C3DS-0.1.0-Windows
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$root/$platform/.build"
out="$root/$platform/dist"

rm -rf "$work" "$out"; mkdir -p "$work" "$out"
cp -R "$root/shared/tauri/." "$work/"
cp -R "$root/web" "$work/www"
cd "$work"

# Versión de la app (semver válido: el sufijo -dev.N.sha de los devbuilds también lo es).
V="$V" node -e "
const fs=require('fs');const f='src-tauri/tauri.conf.json';
const j=JSON.parse(fs.readFileSync(f,'utf8'));j.version=process.env.V;
fs.writeFileSync(f,JSON.stringify(j,null,2));"

if [ "$platform" = linux ] && [ -n "${CI:-}" ]; then
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
fi

npm install --no-audit --no-fund
npx tauri icon "$root/assets/icon.png"

case "$platform" in
  windows) bundles=nsis ;;
  macos)   bundles=dmg ;;
  linux)   bundles=deb,appimage; export NO_STRIP=true ;;
  *) echo "plataforma no soportada: $platform" >&2; exit 1 ;;
esac
npx tauri build --bundles "$bundles"

bundle="src-tauri/target/release/bundle"
case "$platform" in
  windows)
    cp "$bundle"/nsis/*-setup.exe "$out/$P-Setup.exe"
    cp src-tauri/target/release/c3ds.exe "$out/$P-Portable.exe" ;;
  macos)
    cp "$bundle"/dmg/*.dmg "$out/$P-$(uname -m).dmg" ;;
  linux)
    cp "$bundle"/deb/*.deb "$out/$P-$(dpkg --print-architecture).deb"
    cp "$bundle"/appimage/*.AppImage "$out/$P-$(uname -m).AppImage" ;;
esac
ls -la "$out"
