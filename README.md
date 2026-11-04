# MO FIT v0.6 — Android starter

**New:** offline gender-neutral SVG mannequin motion demonstrations (squat, wall push-up, bridge), play/pause and speed controls. **Limitations:** schematic 2D animation, NOT anatomically validated 3D movement; not suitable as a sole technique reference.

# MO FIT — Android project

**Status:** runnable Android *starter*, not a completed 3D exercise library. Arabic offline home/gym workouts, beginner plans, posture/mobility guidance, progress measurements and optional photo diary are implemented in a local WebView. Exercise motions are **text-only**; no anatomically verified animations, exercise MP4 library, automatic Drive sync, or signed production release yet.

## Build an APK with GitHub — no Android Studio needed

1. Open https://github.com/new and create a **Private** repository named `mo-fit-android`. Select **Add a README file** to initialize the `main` branch.
2. Upload **the contents of this project folder** (including the hidden `.github` folder) to the repository. You can use Git locally, or GitHub → **Add file → Upload files**. With Git, the reliable commands are:

   ```bash
   git clone https://github.com/YOUR-USERNAME/mo-fit-android.git
   cd mo-fit-android
   # Copy ALL the files from this project folder into this repository, including .github
   git add -A
   git commit -m "Add MO FIT Android source and APK workflow"
   git push origin main
   ```

3. In GitHub open **Actions → Build MO FIT Android APK → Run workflow**. If Actions is disabled for a new private repository, enable it in repository settings.
4. When the run is **green**, open it and download `MO-FIT-v0.6.0-debug-APK` under **Artifacts**. Unzip it, then install `app-debug.apk` on Android (allow installation from your chosen file manager if prompted).
5. Push updates to `main` to trigger builds automatically.

## Build locally

- Android Studio with Android SDK 35, JDK 17 and Android Gradle Plugin 8.7.3; Gradle 8.10.2.
- `gradle :app:assembleDebug` (system Gradle) produces `app/build/outputs/apk/debug/app-debug.apk`.
- This archive **does not include** a Gradle wrapper (`gradlew`); GitHub Actions installs a pinned Gradle version instead.

## Privacy & safety

- Default operation is fully offline; there is **no Internet permission** in the manifest.
- Images and measurements are stored in the application's WebView local storage. Export via Android document picker. A JSON export includes photos and measurements in readable form; **do not put backups in public repositories**. Automatic Google Drive sync is not implemented.
- Basic fitness education only, not a posture diagnosis or medical treatment. Stop exercises for pain, numbness, faintness, or new weakness. Pregnancy and significant health issues require suitable professional assessment.

## Roadmap

- **Done, starter:** Arabic navigation, exercise notes, activity tracking, short sessions, photos/measurements, backup/export, Android app skeleton, GitHub Actions debug APK build.
- **Next:** 3D gender-neutral rigged mannequin, vetted joint motion per exercise, exercise video export MP4; more plans and expert review; local user profiles and protected photo storage.
- **Future:** optional opt-in encrypted Drive backups, release-signing configuration, testing on physical Android devices.

Package: `com.mofit.app`. App: `MO FIT`. Version: `0.5.0`.

**Build verification:** This ZIP was structurally checked, but no Android SDK or Gradle CLI was available in the authoring environment to run an actual APK build. GitHub Actions is the verification point.
