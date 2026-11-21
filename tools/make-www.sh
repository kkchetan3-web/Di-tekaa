#!/bin/sh
# Regenerates www/ (the web bundle packaged into the Android APK by Capacitor).
# Run from the repo root. www/ is NOT committed — it is rebuilt in CI
# (.github/workflows/apk.yml) and locally before `npx cap copy android`.
set -e
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp index.html enhanced.html manifest.webmanifest www/
cp -r src vendor assets www/
echo "www/ ready: $(du -sh www | cut -f1)"
