#!/usr/bin/env bash
# Empaqueta un juego HTML5 (carpeta con index.html) como app de escritorio con la misma plantilla Tauri que C3DS.
#   bash scripts/build-tauri-game.sh <carpeta-del-juego> <nombre-slug> <carpeta-de-salida> [windows|macos|linux]
# windows -> <slug>.exe (portable) y <slug>-setup.exe (instalador NSIS)
# macos   -> <slug>-<arquitectura>.dmg (sin firmar ni notarizar)
# linux   -> <slug>-<arquitectura>.AppImage y <slug>-amd64.deb
set -euo pipefail
game="${1:?carpeta del juego}"; slug="${2:?slug}"; out="${3:?salida}"; target="${4:-windows}"
case "$target" in windows|macos|linux) ;; *) echo "destino inválido: $target" >&2; exit 1;; esac
[[ "$slug" =~ ^[a-z0-9-]{1,40}$ ]] || { echo "slug inválido: $slug" >&2; exit 1; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
game="$(cd "$game" && pwd)"; mkdir -p "$out"; out="$(cd "$out" && pwd)"
work="$root/.build-game"
test -f "$game/index.html"

rm -rf "$work"; mkdir -p "$work"
cp -R "$root/shared/tauri/." "$work/"
cp -R "$game" "$work/www"
cd "$work"

SLUG="$slug" node -e "
const fs=require('fs');const f='src-tauri/tauri.conf.json';
const j=JSON.parse(fs.readFileSync(f,'utf8'));
j.productName=process.env.SLUG;
j.identifier='dev.c3ds.game.g'+process.env.SLUG.replace(/-/g,'');
j.app.windows[0].title=process.env.SLUG;
j.app.windows[0].width=860; j.app.windows[0].height=820;
fs.writeFileSync(f,JSON.stringify(j,null,2));"

if [ "$target" = linux ] && [ -n "${CI:-}" ]; then
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
fi

npm install --no-audit --no-fund
npx tauri icon "$root/assets/icon.png"

bundle=src-tauri/target/release/bundle
case "$target" in
  windows)
    npx tauri build --bundles nsis
    cp src-tauri/target/release/c3ds.exe "$out/$slug.exe"
    cp "$bundle"/nsis/*-setup.exe "$out/$slug-setup.exe" ;;
  macos)
    npx tauri build --bundles dmg
    cp "$bundle"/dmg/*.dmg "$out/$slug-$(uname -m).dmg" ;;
  linux)
    export NO_STRIP=true
    npx tauri build --bundles deb,appimage
    cp "$bundle"/deb/*.deb "$out/$slug-$(dpkg --print-architecture).deb"
    cp "$bundle"/appimage/*.AppImage "$out/$slug-$(uname -m).AppImage" ;;
esac
ls -la "$out"
