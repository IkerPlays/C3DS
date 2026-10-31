#!/usr/bin/env bash
# Empaqueta un juego HTML5 (carpeta con index.html) como .exe de Windows usando la misma plantilla Tauri que la app.
#   bash scripts/build-tauri-game.sh <carpeta-del-juego> <nombre-slug> <carpeta-de-salida>
# Genera <salida>/<slug>.exe (portable) y <salida>/<slug>-setup.exe (instalador NSIS).
set -euo pipefail
game="${1:?carpeta del juego}"; slug="${2:?slug}"; out="${3:?salida}"
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
j.identifier='dev.c3ds.game.'+process.env.SLUG.replace(/-/g,'');
j.app.windows[0].title=process.env.SLUG;
j.app.windows[0].width=860; j.app.windows[0].height=820;
fs.writeFileSync(f,JSON.stringify(j,null,2));"

npm install --no-audit --no-fund
npx tauri icon "$root/assets/icon.png"
npx tauri build --bundles nsis

cp src-tauri/target/release/c3ds.exe "$out/$slug.exe"
cp src-tauri/target/release/bundle/nsis/*-setup.exe "$out/$slug-setup.exe"
ls -la "$out"
