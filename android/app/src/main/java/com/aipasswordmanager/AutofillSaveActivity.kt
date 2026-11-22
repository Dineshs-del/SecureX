package com.aipasswordmanager

import android.database.sqlite.SQLiteDatabase
import android.os.Bundle
import android.widget.Toast
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

class AutofillSaveActivity : FragmentActivity() {

    private enum class SaveResult {
        SAVED,
        UPDATED,
        UNCHANGED,
        ERROR
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setBackgroundDrawableResource(android.R.color.transparent)

        val name = intent.getStringExtra("save_name") ?: "Account"
        val username = intent.getStringExtra("save_username") ?: ""
        val password = intent.getStringExtra("save_password") ?: ""
        val url = intent.getStringExtra("save_url") ?: ""
        val androidPackage = intent.getStringExtra("save_package") ?: ""
        val domain = intent.getStringExtra("save_domain") ?: ""

        if (password.isBlank() || password.length < 4) {
            finish()
            return
        }

        val isExistingUpdate = hasExistingMatchInMeta(username, androidPackage, domain)
        promptBiometricAndSave(name, username, password, url, androidPackage, domain, isExistingUpdate)
    }

    private fun hasExistingMatchInMeta(username: String, androidPackage: String, domain: String): Boolean {
        return try {
            val arr = readFullVaultArray()
            findMatchingIndex(arr, username, androidPackage, domain) >= 0
        } catch (_: Exception) {
            false
        }
    }

    private fun promptBiometricAndSave(
        name: String,
        username: String,
        password: String,
        url: String,
        androidPackage: String,
        domain: String,
        isExistingUpdate: Boolean
    ) {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        val canAuth = BiometricManager.from(this).canAuthenticate(authenticators)
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(
                applicationContext,
                "Enroll fingerprint in Android Settings to autosave credentials",
                Toast.LENGTH_LONG
            ).show()
            finish()
            return
        }

        try {
            val executor = ContextCompat.getMainExecutor(this)
            val biometricPrompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    try {
                        val vaultKey = unwrapVaultKey()
                        if (vaultKey == null) {
                            Toast.makeText(
                                applicationContext,
                                "Open SecureX and unlock once to enable Autosave",
                                Toast.LENGTH_LONG
                            ).show()
                            finish()
                            return
                        }

                        when (saveCredentialToVault(name, username, password, url, androidPackage, domain, vaultKey)) {
                            SaveResult.SAVED -> Toast.makeText(
                                applicationContext,
                                "Credential saved to SecureX!",
                                Toast.LENGTH_SHORT
                            ).show()
                            SaveResult.UPDATED -> Toast.makeText(
                                applicationContext,
                                "Password updated in SecureX!",
                                Toast.LENGTH_SHORT
                            ).show()
                            SaveResult.UNCHANGED -> Toast.makeText(
                                applicationContext,
                                "Credential already saved in SecureX",
                                Toast.LENGTH_SHORT
                            ).show()
                            SaveResult.ERROR -> Toast.makeText(
                                applicationContext,
                                "Failed to encrypt & save credential",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } catch (_: Exception) {
                        Toast.makeText(
                            applicationContext,
                            "Failed to save credential",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    finish()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    finish()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                }
            })

            val title = if (isExistingUpdate) "Update in SecureX" else "Save to SecureX"
            val subtitle = if (isExistingUpdate) {
                "Verify fingerprint to update $name password"
            } else {
                "Verify fingerprint to save $name login"
            }

            biometricPrompt.authenticate(
                BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(authenticators)
                    .build()
            )
        } catch (_: Exception) {
            finish()
        }
    }

    private fun unwrapVaultKey(): String? {
        return try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore")
            keyStore.load(null)

            val alias = if (keyStore.containsAlias(AutofillModule.KEYSTORE_ALIAS)) {
                AutofillModule.KEYSTORE_ALIAS
            } else {
                "SecureXAutofillKey"
            }
            if (!keyStore.containsAlias(alias)) return null

            val secretKey = keyStore.getKey(alias, null) as SecretKey
            val prefs = getSharedPreferences(SecureXAutofillService.PREFS_NAME, MODE_PRIVATE)
            val ivBase64 = prefs.getString("wrapped_iv", null) ?: return null
            val encryptedKeyBase64 = prefs.getString("wrapped_key", null) ?: return null

            val iv = android.util.Base64.decode(ivBase64, android.util.Base64.DEFAULT)
            val encryptedKeyBytes = android.util.Base64.decode(encryptedKeyBase64, android.util.Base64.DEFAULT)

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, iv))
            val vaultKeyBytes = cipher.doFinal(encryptedKeyBytes)
            String(vaultKeyBytes, Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    private fun readFullVaultArray(): JSONArray {
        // Source of truth: React Native RKStorage SQLite DB first, fallback to SharedPreferences cache
        try {
            val dbFile = getDatabasePath("RKStorage")
            if (dbFile.exists()) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
                val cursor = db.rawQuery(
                    "SELECT value FROM catalystLocalStorage WHERE key = ?",
                    arrayOf(SecureXAutofillService.STORAGE_KEY)
                )
                if (cursor.moveToFirst()) {
                    val json = cursor.getString(0)
                    cursor.close()
                    db.close()
                    if (!json.isNullOrBlank()) {
                        return JSONArray(json)
                    }
                } else {
                    cursor.close()
                    db.close()
                }
            }
        } catch (_: Exception) {}

        return try {
            val prefs = getSharedPreferences(SecureXAutofillService.PREFS_NAME, MODE_PRIVATE)
            val cachedVaultJson = prefs.getString("cached_encrypted_vault_json", "[]") ?: "[]"
            JSONArray(cachedVaultJson)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    private fun findMatchingIndex(
        vaultArr: JSONArray,
        username: String,
        androidPackage: String,
        domain: String
    ): Int {
        val normDomain = DomainUtils.getRegistrableDomain(domain) ?: domain.trim().lowercase()
        for (i in 0 until vaultArr.length()) {
            val obj = vaultArr.getJSONObject(i)
            val existingPkg = obj.optString("androidPackage", "")
            val existingUrl = obj.optString("url", "")
            val existingUsername = obj.optString("username", "")

            val pkgMatch = androidPackage.isNotBlank() &&
                existingPkg.equals(androidPackage, ignoreCase = true)

            var domainMatch = false
            if (normDomain.isNotBlank()) {
                val existingUrlDomain = DomainUtils.getRegistrableDomain(existingUrl)
                if (existingUrlDomain != null && existingUrlDomain == normDomain) {
                    domainMatch = true
                } else {
                    val existingDomains = obj.optJSONArray("domains")
                    if (existingDomains != null) {
                        for (d in 0 until existingDomains.length()) {
                            val dom = DomainUtils.getRegistrableDomain(existingDomains.optString(d, ""))
                            if (dom != null && dom == normDomain) {
                                domainMatch = true
                                break
                            }
                        }
                    }
                }
            }

            val userMatch = if (username.isNotBlank()) {
                existingUsername.equals(username, ignoreCase = true)
            } else {
                existingUsername.isBlank()
            }

            if ((pkgMatch || domainMatch) && userMatch) {
                return i
            }
        }
        return -1
    }

    private fun evaluateStrength(password: String): String {
        if (password.length < 8) return "weak"
        var score = 0
        if (password.length >= 12) score++
        if (password.any { it.isUpperCase() }) score++
        if (password.any { it.isLowerCase() }) score++
        if (password.any { it.isDigit() }) score++
        if (password.any { !it.isLetterOrDigit() }) score++
        return when {
            score <= 2 -> "weak"
            score <= 3 -> "fair"
            else -> "strong"
        }
    }

    private fun saveCredentialToVault(
        name: String,
        username: String,
        password: String,
        url: String,
        androidPackage: String,
        domain: String,
        vaultKey: String
    ): SaveResult {
        return try {
            // Never allow saving plaintext if encryption fails
            val encPassJson = encryptPassword(password, vaultKey) ?: return SaveResult.ERROR

            val vaultArr = readFullVaultArray()
            val nowStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                .format(java.util.Date())
            val strength = evaluateStrength(password)

            val foundIndex = findMatchingIndex(vaultArr, username, androidPackage, domain)
            val resultType: SaveResult

            if (foundIndex >= 0) {
                val existingVaultObj = vaultArr.getJSONObject(foundIndex)
                val existingEncPass = existingVaultObj.optString("password", "")
                val existingPlainPass = decryptPassword(existingEncPass, vaultKey)

                if (existingPlainPass == password) {
                    return SaveResult.UNCHANGED
                }

                existingVaultObj.put("password", encPassJson)
                existingVaultObj.put("strength", strength)
                existingVaultObj.put("lastAccessed", nowStr)
                if (existingVaultObj.optString("androidPackage", "").isBlank() && androidPackage.isNotBlank()) {
                    existingVaultObj.put("androidPackage", androidPackage)
                }
                if (existingVaultObj.optString("url", "").isBlank()) {
                    val resolvedUrl = if (url.isNotBlank()) url else if (domain.isNotBlank()) "https://$domain" else ""
                    if (resolvedUrl.isNotBlank()) existingVaultObj.put("url", resolvedUrl)
                }
                if (domain.isNotBlank()) {
                    val existingDomains = existingVaultObj.optJSONArray("domains") ?: JSONArray()
                    var hasDom = false
                    for (d in 0 until existingDomains.length()) {
                        if (existingDomains.optString(d, "").equals(domain, ignoreCase = true)) {
                            hasDom = true
                            break
                        }
                    }
                    if (!hasDom) existingDomains.put(domain)
                    existingVaultObj.put("domains", existingDomains)
                }
                resultType = SaveResult.UPDATED
            } else {
                val newId = "${System.currentTimeMillis()}-${(1000..9999).random()}"
                val domainsArr = JSONArray()
                if (domain.isNotBlank()) domainsArr.put(domain)

                val resolvedUrl = if (url.isNotBlank()) url else if (domain.isNotBlank()) "https://$domain" else ""
                val category = if (domain.isNotBlank()) "Web" else "Apps"

                val vaultObj = JSONObject().apply {
                    put("id", newId)
                    put("name", name)
                    put("username", username)
                    put("password", encPassJson)
                    put("url", resolvedUrl)
                    put("androidPackage", androidPackage)
                    put("domains", domainsArr)
                    put("category", category)
                    put("notes", "Autosaved via Android Autofill")
                    put("favicon", "")
                    put("strength", strength)
                    put("breached", false)
                    put("createdAt", nowStr)
                    put("lastAccessed", nowStr)
                }

                vaultArr.put(vaultObj)
                resultType = SaveResult.SAVED
            }

            // Rebuild lightweight metadata array from full vault array so caches are always 100% consistent
            val metaArr = JSONArray()
            for (i in 0 until vaultArr.length()) {
                val obj = vaultArr.getJSONObject(i)
                val metaObj = JSONObject().apply {
                    put("id", obj.optString("id", ""))
                    put("name", obj.optString("name", "Account"))
                    put("username", obj.optString("username", ""))
                    put("url", obj.optString("url", ""))
                    put("androidPackage", obj.optString("androidPackage", ""))
                    put("domains", obj.optJSONArray("domains") ?: JSONArray())
                }
                metaArr.put(metaObj)
            }

            val updatedMetaJsonStr = metaArr.toString()
            val updatedVaultJsonStr = vaultArr.toString()

            // 1. Update Autofill SharedPreferences cache
            val prefs = getSharedPreferences(SecureXAutofillService.PREFS_NAME, MODE_PRIVATE)
            prefs.edit()
                .putString("cached_credentials_json", updatedMetaJsonStr)
                .putString("cached_encrypted_vault_json", updatedVaultJsonStr)
                .apply()

            // 2. Persist full vault to React Native AsyncStorage SQLite DB
            saveToReactNativeStorage(updatedVaultJsonStr)

            resultType
        } catch (_: Exception) {
            SaveResult.ERROR
        }
    }

    private fun saveToReactNativeStorage(vaultJson: String) {
        try {
            val dbFile = getDatabasePath("RKStorage")
            if (dbFile.exists()) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
                db.execSQL(
                    "INSERT OR REPLACE INTO catalystLocalStorage (key, value) VALUES (?, ?)",
                    arrayOf(SecureXAutofillService.STORAGE_KEY, vaultJson)
                )
                db.close()
            }
        } catch (_: Exception) {}
    }

    private fun encryptPassword(plaintext: String, vaultKey: String): String? {
        return try {
            val keyBytes = hexToBytes(vaultKey)
            val ivBytes = ByteArray(16).apply { java.security.SecureRandom().nextBytes(this) }

            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), IvParameterSpec(ivBytes))
            val cipherBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

            val ciphertextBase64 = android.util.Base64.encodeToString(cipherBytes, android.util.Base64.NO_WRAP)
            val ivHex = bytesToHex(ivBytes)

            JSONObject().apply {
                put("ciphertext", ciphertextBase64)
                put("iv", ivHex)
                put("salt", "")
            }.toString()
        } catch (_: Exception) {
            null
        }
    }

    private fun decryptPassword(encryptedJson: String, vaultKey: String): String? {
        return try {
            if (!encryptedJson.startsWith("{")) return encryptedJson
            val obj = JSONObject(encryptedJson)
            val ciphertext = obj.getString("ciphertext")
            val iv = obj.getString("iv")

            val keyBytes = hexToBytes(vaultKey)
            val ivBytes = hexToBytes(iv)
            val cipherBytes = android.util.Base64.decode(ciphertext, android.util.Base64.DEFAULT)

            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), IvParameterSpec(ivBytes))
            String(cipher.doFinal(cipherBytes), Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    private fun hexToBytes(hex: String): ByteArray {
        val data = ByteArray(hex.length / 2)
        for (i in hex.indices step 2) {
            data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
        }
        return data
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder()
        for (b in bytes) sb.append(String.format("%02x", b))
        return sb.toString()
    }
}
