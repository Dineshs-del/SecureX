# SecureX

**A zero-knowledge, offline-first Android password manager with hardware-backed encryption and fingerprint-verified native Autofill & Autosave.**

![Platform](https://img.shields.io/badge/Platform-Android%20(API%2024%E2%80%9335)-3DDC84?logo=android&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.83-61DAFB?logo=react&logoColor=black)
![Kotlin](https://img.shields.io/badge/Kotlin-2.1-7F52FF?logo=kotlin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Encryption](https://img.shields.io/badge/Encryption-AES--256%20%2B%20Android%20Keystore-00B4D8)

---

## Overview

SecureX (`com.aipasswordmanager`) is a local-first credential vault built for Android with React Native, TypeScript, and native Kotlin. All credentials are encrypted on-device before persistence, and every system Autofill fill, save, or password update requires native Android biometric verification.

---

## Core Features

- **Zero-Knowledge Encrypted Vault**
  - Master password protection with local AES-256 encryption, atomic master-key rotation, and automatic vault locking on background/timeout.
  - Bruteforce lockout protection with progressive cooldown timers and configurable auto-lock intervals (`Immediate`, `1m`, `5m`, `15m`, `30m`).
- **Fingerprint-Verified Android Autofill**
  - Integrates directly with the Android Autofill Framework (`AutofillService`) across browsers and native Android apps.
  - Context-aware field classification (`StructureParser`) detects legitimate login forms while ignoring search bars, messaging inputs, multiline text boxes, and OTP fields.
  - Every autofill suggestion is gated behind Android's native `BiometricPrompt` via `AutofillAuthActivity` — credentials are never decrypted or returned without successful biometric confirmation.
- **Fingerprint-Verified Credential Autosave & Update**
  - Detects new logins and password changes via Android `SaveInfo` and `onSaveRequest` (using `SaveCallback.onSuccess(IntentSender)` on Android 9+ to comply with Background Activity Launch restrictions).
  - Automatically distinguishes between saving a new login (**Save to SecureX**) and updating an existing account's password (**Update in SecureX**) after fingerprint verification.
  - Supports a persistent **Never-Save Sites** exclusion list synced directly to the native Autofill service.
- **Password Generator & Security Audit**
  - Cryptographically generated random passwords, memorable passphrases, and PINs with live strength evaluation.
  - Vault health scoring that flags weak, reused, stale, and breached passwords (offline local breach list plus optional Have I Been Pwned k-anonymity checks).
- **Encrypted Backup & Vault Migration**
  - Export password-protected `.json` encrypted vault backups directly to device storage.
  - Import credentials from SecureX encrypted `.json` backups or standard `.csv` exports (Chrome, Bitwarden, 1Password, and generic CSV) with automatic normalization and deduplication.
- **Device & Privacy Controls**
  - Live `FLAG_SECURE` screen protection toggle to block screenshots and hide vault contents in the Android recents switcher.
  - 30-second automatic clipboard clearing after copying sensitive values.
  - Offline-first SVG brand icon system with optional domain-only favicon caching.

---

## Security Architecture

### Key Hierarchy & Storage

| Layer | Implementation |
| --- | --- |
| **Credential Encryption** | AES-256-CBC with per-entry random IVs stored in React Native's local SQLite store (`RKStorage`) |
| **Vault Key Protection** | Random vault key wrapped using an **Android Keystore** AES-GCM secret key (`SecureXAutofillKey_v2`) |
| **Biometric Gate** | `androidx.biometric.BiometricPrompt` required on app unlock (configurable), detail password reveal/copy, and every Autofill fill/save/update |
| **Session Locking** | Locking clears the in-memory JS vault key and decrypted store state while preserving the hardware-wrapped Android Keystore key so background Autofill & Autosave remain functional |
| **Vault Wipe** | Permanently deletes all stored credentials, preferences, caches, and the Android Keystore wrapping key |

### Native Autofill & Autosave Flow

```text
Target App / Browser Login Form
        │
        ▼
SecureXAutofillService (Kotlin)
  ├── StructureParser.kt         ── Classifies login fields; filters search/chat/OTP inputs
  ├── DomainUtils.kt             ── Extracts registrable domain & enforces HTTPS / Never-Save rules
  │
  ├── [Fill Flow]  Dataset.setAuthentication(PendingIntent)
  │        └──▶ AutofillAuthActivity ──▶ BiometricPrompt ──▶ Unwrap Key (AndroidKeyStore)
  │                                                         ──▶ Decrypt & Return Dataset
  │
  └── [Save Flow]  SaveInfo + onSaveRequest() -> callback.onSuccess(IntentSender)
           └──▶ AutofillSaveActivity ──▶ BiometricPrompt ──▶ Unwrap Key (AndroidKeyStore)
                                                            ──▶ Encrypt & Persist to RKStorage
```

---

## Project Structure

```text
.
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       ├── res/xml/autofill_service.xml
│       └── java/com/aipasswordmanager/
│           ├── MainActivity.kt              # App entry point & persisted FLAG_SECURE handling
│           ├── AutofillModule.kt            # React Native bridge (Keystore wrap, settings, sync)
│           ├── SecureXAutofillService.kt    # Android AutofillService (onFillRequest / onSaveRequest)
│           ├── StructureParser.kt           # AssistStructure login field classifier
│           ├── DomainUtils.kt               # Registrable domain & host normalization
│           ├── AutofillAuthActivity.kt      # Biometric prompt & decryption for Autofill fill
│           └── AutofillSaveActivity.kt      # Biometric prompt & encrypted write for Autosave/Update
├── src/
│   ├── ai/                                  # Password generator
│   ├── components/                          # Glass UI, headers, tab bar, SVG icons, toasts
│   ├── navigation/                          # Stack & tab navigation, AppState auto-lock lifecycle
│   ├── screens/                             # Setup, Unlock, Dashboard, Vault, Detail, Add/Edit,
│   │                                        # Audit, Generator, Autofill Setup, Import/Export, Settings
│   ├── services/                            # Domain icon cache service
│   ├── store/                               # Zustand vault store, encryption orchestration & native sync
│   ├── theme/                               # Design tokens, CryptoService & MasterPasswordManager
│   └── utils/                               # CSV parser, credential normalizer, encrypted import/export, audit
├── App.tsx
└── package.json
```

---

## Tech Stack

- **Mobile Framework:** React Native `0.83.2`, React `19.2`, TypeScript `5.8`
- **Native Android:** Kotlin `2.1.20`, Android Gradle Plugin `8.7.2`, AndroidX Biometric `1.1.0`, Android Autofill Framework, Android Keystore (`minSdk 24`, `targetSdk 35`, `compileSdk 36`)
- **State & Storage:** Zustand, AsyncStorage (`RKStorage`), React Native Keychain, React Native Biometrics, React Native FS
- **UI & Graphics:** React Navigation v7, `react-native-svg`, `react-native-linear-gradient`, `react-native-reanimated`

---

## Getting Started

### Prerequisites

- **Node.js** `>= 22.11.0`
- **JDK 17**
- **Android Studio / Android SDK** with:
  - Android SDK Platform **36** (`compileSdkVersion = 36`)
  - Build Tools **36.0.0**
  - NDK **27.1.12297006**
- Physical Android device (recommended for fingerprint/biometric testing) or Android Emulator with enrolled fingerprint

### Installation & Development

1. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

2. **Start the Metro bundler:**
   ```bash
   npm start
   ```

3. **Build and install on a connected Android device:**
   ```bash
   npm run android
   ```

### Building a Release APK

```bash
cd android && ./gradlew assembleRelease
```

The compiled APK is output to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

### Enabling SecureX Autofill on Android

1. Launch **SecureX**, create a Master Password, and complete initial vault unlock (this initializes the Android Keystore key wrapper).
2. Open **Settings → Android Autofill** inside SecureX and tap **Enable Autofill** (or navigate manually to **Android Settings → Passwords, passkeys & accounts → Autofill service**).
3. Select **SecureX Password Manager** as the active Autofill provider.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start Metro bundler |
| `npm run android` | Compile and run on a connected Android device/emulator |
| `npm run lint` | Run ESLint across the codebase |
| `npx tsc --noEmit` | Run strict TypeScript type-checking |
| `npm test` | Run Jest unit tests |

---

## Manual Verification Checklist

1. **Multi-Account Autofill with Biometrics**
   - Add two accounts for the same service in SecureX (for example, `alex.chen@example.com` and `jordan.taylor@example.com`).
   - Open the service's login screen and focus the username field.
   - Confirm SecureX displays distinct suggestions formatted as `Service • alex.chen@example.com` and `Service • jordan.taylor@example.com`.
   - Select a suggestion → verify the Android fingerprint prompt appears immediately and fills the form only after successful verification.
2. **Biometric Cancellation & Rejection**
   - Tap an autofill suggestion, then cancel the prompt or scan an unenrolled finger → verify no credentials are populated.
3. **Autofill & Autosave While App Is Locked or Closed**
   - Swipe SecureX away from recent apps or let it auto-lock.
   - Trigger autofill on a saved login or submit a brand-new login → verify biometric authentication succeeds and newly saved credentials appear when SecureX is reopened.
4. **False-Positive Rejection**
   - Type into browser search bars, messaging apps, or note fields → verify neither autofill suggestions nor credential save prompts appear.
5. **Password Update Flow**
   - Sign in to an existing saved account with a new password → verify the biometric save prompt displays **Update in SecureX** and updates the existing record without creating duplicates.
6. **Never-Save Exclusions & Screen Protection**
   - Add a domain under **Settings → Never-Save Sites** and confirm autosave is suppressed for that domain.
   - Toggle **Block Screenshots** and verify screenshots and recents previews are blocked when enabled.

---

## License

Third-party dependency licenses are documented in [`LICENSES.md`](./LICENSES.md).
