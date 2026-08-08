# Lethean Mobile

## Android client for Lethean zero-knowledge encrypted vault

Lethean Mobile packages the same zero-knowledge vault client as an
installed Android application instead of a page loaded fresh from a
server on every visit. The cryptography, the no-account model, and the
duress code are unchanged, this only changes *how the code reaches your
device*.

## Why an Android client?

The web version re-downloads and re-trusts its JavaScript on every page
load. A compromised, coerced, or subpoenaed server can serve different
code to one specific user on one specific day, and nothing about that is
visible to the person unlocking their vault. An installed app doesn't
have that problem.

## Features

Everything in the [web client](https://github.com/umutcamliyurt/Lethean/blob/main/README.md), plus:

- Code fixed at install time, no re-fetch on every launch
- No browser required

## Building

```bash
git clone https://github.com/umutcamliyurt/Lethean_Mobile
cd Lethean_Mobile/
npm install
```

**Pointing at a backend:** the backend URL appears in two places
in `src-tauri/tauri.conf.json`, both must match.

### Prerequisites

- Android SDK, Android NDK, and a JDK (17+), with `ANDROID_HOME` /
  `NDK_HOME` set
- Rust targets for all four Android ABIs:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi \
    i686-linux-android x86_64-linux-android
  ```

### First-time project setup

```bash
npm run tauri android init
```

This generates `src-tauri/gen/android/`. It's regenerated (and wiped)
by this command, so signing config and any manual native-side edits
need to be reapplied after a clean init.

### Signing

Android release builds must be signed. Create
`src-tauri/gen/android/keystore.properties`:

```
keyAlias=<your alias>
storePassword=<keystore password>
keyPassword=<key password>
storeFile=/path/to/your/upload-keystore.jks
```

and wire it into `src-tauri/gen/android/app/build.gradle.kts`'s
`signingConfigs` block

### Build

```bash
npm run tauri android build --release
```

Output APK/AAB lands under
`src-tauri/gen/android/app/build/outputs/`.

## Threat model

This extends the [web client's threat model](https://github.com/umutcamliyurt/Lethean/blob/main/README.md#threat-model).
Everything listed there as in scope or out of scope still applies; this
section covers only what changes by shipping an installed Android app.

### In scope

- **Server-pushed code tampering.** The web version's biggest weak point,
  a compromised or coerced server silently serving different JavaScript to
  a specific target, no longer works.

### Out of scope / not defended against

- **OS, WebView-engine, and hardware compromise.** As with the web
  version, a compromised operating system, tampered WebView runtime, or
  seized unlocked device is out of scope. This is device and
  operational-security territory, not something code delivery can fix.

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full
terms.