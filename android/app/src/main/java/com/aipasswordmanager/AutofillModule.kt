package com.aipasswordmanager

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.view.WindowManager
import android.view.autofill.AutofillManager
import com.facebook.react.bridge.*
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class AutofillModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AutofillModule"

  companion object {
    const val KEYSTORE_ALIAS = "SecureXAutofillKey_v2"
  }

  @ReactMethod
  fun isAutofillEnabled(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(false)
        return
      }
      val mgr = reactApplicationContext.getSystemService(AutofillManager::class.java)
      promise.resolve(mgr?.hasEnabledAutofillServices() ?: false)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openAutofillSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE).apply {
          data = Uri.parse("package:${reactApplicationContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          reactApplicationContext.startActivity(intent)
        }
        promise.resolve(true)
        return
      }
      val fallback = Intent(Settings.ACTION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(fallback)
      promise.resolve(true)
    } catch (e: Exception) {
      try {
        val fallback = Intent(Settings.ACTION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(fallback)
        promise.resolve(true)
      } catch (inner: Exception) {
        promise.reject("AUTOFILL_SETTINGS_ERROR", inner.message, inner)
      }
    }
  }

  @ReactMethod
  fun setSecureScreen(enabled: Boolean, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit()
        .putBoolean(SecureXAutofillService.KEY_SECURE_SCREEN, enabled)
        .apply()

      val activity = reactApplicationContext.currentActivity
      activity?.runOnUiThread {
        if (enabled) {
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SECURE_SCREEN_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun isSecureScreenEnabled(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      promise.resolve(prefs.getBoolean(SecureXAutofillService.KEY_SECURE_SCREEN, true))
    } catch (e: Exception) {
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun setNeverSaveDomains(jsonArray: String, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit()
        .putString(SecureXAutofillService.KEY_NEVER_SAVE_DOMAINS, jsonArray)
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun getNeverSaveDomains(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      promise.resolve(prefs.getString(SecureXAutofillService.KEY_NEVER_SAVE_DOMAINS, "[]") ?: "[]")
    } catch (e: Exception) {
      promise.resolve("[]")
    }
  }

  @ReactMethod
  fun storeWrappedVaultKey(vaultKey: String, promise: Promise) {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)

      if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        keyGenerator.init(
          KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
          )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build()
        )
        keyGenerator.generateKey()
      }

      val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, secretKey)
      val iv = cipher.iv
      val encryptedBytes = cipher.doFinal(vaultKey.toByteArray(Charsets.UTF_8))

      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit()
        .putString("wrapped_key", android.util.Base64.encodeToString(encryptedBytes, android.util.Base64.NO_WRAP))
        .putString("wrapped_iv", android.util.Base64.encodeToString(iv, android.util.Base64.NO_WRAP))
        .apply()

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("WRAP_KEY_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun setVaultKey(vaultKey: String, promise: Promise) {
    storeWrappedVaultKey(vaultKey, promise)
  }

  @ReactMethod
  fun syncCredentials(jsonString: String, encryptedVaultJson: String, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit()
        .putString("cached_credentials_json", jsonString)
        .putString("cached_encrypted_vault_json", encryptedVaultJson)
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun clearVaultKey(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit()
        .remove("wrapped_key")
        .remove("wrapped_iv")
        .remove("cached_credentials_json")
        .remove("cached_encrypted_vault_json")
        .remove(SecureXAutofillService.KEY_VAULT_KEY)
        .remove(SecureXAutofillService.KEY_NEVER_SAVE_DOMAINS)
        .apply()

      try {
        val keyStore = KeyStore.getInstance("AndroidKeyStore")
        keyStore.load(null)
        if (keyStore.containsAlias(KEYSTORE_ALIAS)) {
          keyStore.deleteEntry(KEYSTORE_ALIAS)
        }
      } catch (_: Exception) {}

      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}