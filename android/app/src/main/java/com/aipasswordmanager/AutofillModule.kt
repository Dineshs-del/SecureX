package com.aipasswordmanager

import android.content.Context
import android.os.Build
import android.view.autofill.AutofillManager
import com.facebook.react.bridge.*

class AutofillModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AutofillModule"

  @ReactMethod
  fun isAutofillEnabled(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { promise.resolve(false); return }
      val mgr = reactApplicationContext.getSystemService(AutofillManager::class.java)
      promise.resolve(mgr?.hasEnabledAutofillServices() ?: false)
    } catch (e: Exception) { promise.resolve(false) }
  }

  // Called from JS when vault is unlocked — stores key for autofill service
  @ReactMethod
  fun setVaultKey(vaultKey: String, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit().putString(SecureXAutofillService.KEY_VAULT_KEY, vaultKey).apply()
      promise.resolve(true)
    } catch (e: Exception) { promise.resolve(false) }
  }

  // Called from JS when vault is locked — clears key from autofill service
  @ReactMethod
  fun clearVaultKey(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        SecureXAutofillService.PREFS_NAME, Context.MODE_PRIVATE
      )
      prefs.edit().remove(SecureXAutofillService.KEY_VAULT_KEY).apply()
      promise.resolve(true)
    } catch (e: Exception) { promise.resolve(false) }
  }
}