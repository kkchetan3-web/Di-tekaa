# 07 — Android APK build & install

## Pipeline (GitHub Actions — `.github/workflows/apk.yml`)
Triggers: push to `main` touching game/CI files, or manual `workflow_dispatch`.
Steps: `npm ci` → `bash tools/make-www.sh` (regenerates `www/`, never committed) →
`npx cap sync android` (copies web bundle + regenerates the gitignored
`capacitor-cordova-android-plugins/` bridge) → `android/gradlew -p android assembleDebug`
→ publishes `DiTekaaaa-debug.apk` as a GitHub **Release** (`apk-v<run number>`).
Build failures open an issue containing the gradle log tail (sandbox/CI diagnostics channel).

## Install (Android device)
1. Open the latest release: https://github.com/kkchetan3-web/Di-tekaa/releases
2. Download `DiTekaaaa-debug.apk`.
3. Open the file; when prompted, allow "install unknown apps" for your browser/file manager.
4. Launch **Di Tekaaaa!** — landscape, fullscreen webview, offline-capable (assets bundled).

## App identity
`com.ditekaaaa.game` · label "Di Tekaaaa!" · minSdk 22 (Android 5.1) · targetSdk 34 ·
adaptive launcher icon (theme #140a1e). Debug-signed (not Play-Store release-signed);
for a signed store build, wire a keystore as a CI secret and switch to `assembleRelease`.

## Local rebuild (requires Android SDK + JDK 17 — unavailable in this sandbox)
`sh tools/make-www.sh && npx cap sync android && android/gradlew -p android assembleDebug`
