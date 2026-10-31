#!/usr/bin/env bash
# Compila la app móvil (Capacitor, open source) para android | ios.
#   C3DS_VERSION=1.2.3 bash scripts/build-capacitor.sh <android|ios>
# android -> .apk (firmado con la clave debug: instalable directamente)
# ios     -> .ipa SIN firmar (hay que firmarlo para instalarlo: AltStore, Sideloadly, Xcode...)
set -euo pipefail
platform="${1:?uso: build-capacitor.sh <android|ios>}"
V="${C3DS_VERSION:?define C3DS_VERSION}"
base="${V%%-*}"   # versión numérica X.Y.Z (las stores no admiten sufijos)
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$root/$platform/.build"
out="$root/$platform/dist"

rm -rf "$work" "$out"; mkdir -p "$work" "$out"
cp -R "$root/shared/capacitor/." "$work/"
cp -R "$root/web" "$work/www"
cd "$work"

npm install --no-audit --no-fund
npx cap add "$platform"
npx cap sync "$platform"

case "$platform" in
  android)
    sed -i.bak "s/versionName \".*\"/versionName \"$V\"/" android/app/build.gradle
    (cd android && ./gradlew --no-daemon assembleDebug)
    cp android/app/build/outputs/apk/debug/app-debug.apk "$out/c3ds-android-$V.apk" ;;
  ios)
    sed -i.bak "s/MARKETING_VERSION = .*;/MARKETING_VERSION = $base;/" ios/App/App.xcodeproj/project.pbxproj
    xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
      -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$work/derived" \
      CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
    app="$(find "$work/derived/Build/Products/Release-iphoneos" -maxdepth 1 -name '*.app' | head -1)"
    mkdir -p "$work/ipa/Payload" && cp -R "$app" "$work/ipa/Payload/"
    (cd "$work/ipa" && zip -qry "$out/c3ds-ios-$V-unsigned.ipa" Payload) ;;
  *) echo "plataforma no soportada: $platform" >&2; exit 1 ;;
esac
ls -la "$out"
