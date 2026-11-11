# MO FIT Android

MO FIT is an Arabic-first Android fitness app. It includes exercise instructions, short session plans and an optional progress diary stored locally.

## Build

The Android source is in `app/`. Run `npm ci`, `npm run build`, then `gradle :app:assembleDebug` with JDK 17, Gradle 8.10.2 and Android SDK 35. The JavaScript bundle contains the model and renderer so the exercise viewer works offline. GitHub Actions builds and verifies the APK, then publishes a direct APK download on pushes to main.

## Motion preview

The 3D viewer uses a faceless mesh skinned to a joint rig, with separate GLB animation clips for chair sit-to-stand, wall push-up and glute bridge. It requires WebGL 2. Use Blender 4.3 and `blender --background --python tools/create_motion_model.py` to regenerate the model and clips.

The movement library and device verification are still in development. See [exercise QA](docs/exercise-qa.csv) for movement references and verification status. Debug builds use a development signature. Export a local backup before replacing an existing build that Android reports as signed with a different key.
