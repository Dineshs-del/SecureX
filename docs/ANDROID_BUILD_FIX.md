# SecureX — Android Build Fix

This README documents the fixes required to run the SecureX React Native Android application.

## Current Environment

* React Native: `0.83.2`
* React Native Reanimated: `4.3.0` (pinned)
* React Native CLI: `@react-native-community/cli`
* Platform: Android

---

## 1. React Native CLI Error

### Error
```text
react-native depends on @react-native-community/cli for cli commands.
```

### Fix
Install the React Native Community CLI:
```powershell
npm install --save-dev @react-native-community/cli
```

---

## 2. React Native Reanimated Dependency Conflict

### Error
The project originally had:
```text
react-native@0.83.2
react-native-reanimated@4.7.0
```
But Reanimated `4.7.0` requires React Native:
```text
0.86 - 0.88
```
This caused:
```text
ERESOLVE unable to resolve dependency tree
```

### Fix
Install a compatible Reanimated version:
```powershell
npm install react-native-reanimated@4.3.0
```

### Important
Keep the Reanimated version pinned instead of allowing npm to automatically upgrade it.
Use:
```json
"react-native-reanimated": "4.3.0"
```
instead of:
```json
"react-native-reanimated": "^4.3.0"
```
The `^` allows npm to install newer versions that may not be compatible with React Native `0.83.2`.

---

## 3. Verify Dependencies

Run:
```powershell
npm list react-native react-native-reanimated
```
Expected result:
```text
react-native@0.83.2
react-native-reanimated@4.3.0
```

---

## 4. Android Build Error: Java Heap Space

### Error
```text
Execution failed for task ':app:checkDebugAarMetadata'.
Could not resolve all files for configuration ':app:debugRuntimeClasspath'.
Failed to transform react-android-0.83.2-debug.aar
Execution failed for JetifyTransform
Java heap space
```

### Cause
Gradle does not have enough Java heap memory to process the React Native Android dependencies during JetifyTransform.

---

## 5. Increase Gradle Heap Memory

In `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -XX:+UseG1GC
android.useAndroidX=true
android.enableJetifier=true
```

---

## 6. Stop Existing Gradle Processes

From the project directory:
```powershell
cd android
.\gradlew --stop
cd ..
```

---

## 7. Run the Android Application

```powershell
npx react-native run-android
```

---

## 8. Do Not Run `npm audit fix --force`

The installation reported moderate vulnerabilities. Do **not** run `npm audit fix --force`, as `--force` will upgrade React Native or its core dependencies and re-introduce peer dependency mismatches.
