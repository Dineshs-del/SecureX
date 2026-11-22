package com.aipasswordmanager

import android.app.assist.AssistStructure
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.service.autofill.Dataset
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
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

class AutofillAuthActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setBackgroundDrawableResource(android.R.color.transparent)

        val credentialId = intent.getStringExtra("credential_id")
        var usernameId = getParcelableExtraCompat<AutofillId>(intent, "username_id")
        var passwordId = getParcelableExtraCompat<AutofillId>(intent, "password_id")

        if (usernameId == null && passwordId == null) {
            val structure = getParcelableExtraCompat<AssistStructure>(intent, AutofillManager.EXTRA_ASSIST_STRUCTURE)
            if (structure != null) {
                val parser = StructureParser()
                parser.parse(structure)
                usernameId = parser.usernameId
                passwordId = parser.passwordId
            }
        }

        if (credentialId == null || (usernameId == null && passwordId == null)) {
            setResult(RESULT_CANCELED)
            finish()
            return
        }

        authenticateAndFill(credentialId, usernameId, passwordId)
    }

    private inline fun <reified T : Parcelable> getParcelableExtraCompat(intent: Intent, key: String): T? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(key, T::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(key) as? T
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun authenticateAndFill(credentialId: String, usernameId: AutofillId?, passwordId: AutofillId?) {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        val canAuth = BiometricManager.from(this).canAuthenticate(authenticators)
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(
                applicationContext,
                "Enroll fingerprint in Android Settings to use SecureX Autofill",
                Toast.LENGTH_LONG
            ).show()
            setResult(RESULT_CANCELED)
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
                                "Open SecureX and unlock once to enable Autofill",
                                Toast.LENGTH_LONG
                            ).show()
                            setResult(RESULT_CANCELED)
                            finish()
                            return
                        }

                        val cred = loadCredentialById(credentialId, vaultKey)
                        if (cred == null) {
                            Toast.makeText(
                                applicationContext,
                                "Could not decrypt credential — open SecureX to refresh",
                                Toast.LENGTH_SHORT
                            ).show()
                            setResult(RESULT_CANCELED)
                            finish()
                            return
                        }

                        val datasetBuilder = Dataset.Builder()
                        if (usernameId != null) {
                            datasetBuilder.setValue(usernameId, AutofillValue.forText(cred.username))
                        }
                        if (passwordId != null) {
                            datasetBuilder.setValue(passwordId, AutofillValue.forText(cred.password))
                        }

                        val dataset = datasetBuilder.build()
                        val replyIntent = Intent().apply {
                            putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset)
                        }
                        setResult(RESULT_OK, replyIntent)
                        finish()
                    } catch (_: Exception) {
                        setResult(RESULT_CANCELED)
                        finish()
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    setResult(RESULT_CANCELED)
                    finish()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                }
            })

            biometricPrompt.authenticate(
                BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock SecureX Credential")
                    .setSubtitle("Verify fingerprint to autofill")
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(authenticators)
                    .build()
            )
        } catch (_: Exception) {
            setResult(RESULT_CANCELED)
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

    data class DecryptedCredential(val id: String, val name: String, val username: String, val password: String)

    private fun loadCredentialById(credentialId: String, vaultKey: String): DecryptedCredential? {
        try {
            val prefs = getSharedPreferences(SecureXAutofillService.PREFS_NAME, MODE_PRIVATE)
            val json = prefs.getString("cached_encrypted_vault_json", null)
            if (!json.isNullOrBlank()) {
                val found = findInVaultJson(json, credentialId, vaultKey)
                if (found != null) return found
            }
        } catch (_: Exception) {}

        return try {
            val dbFile = getDatabasePath("RKStorage")
            if (!dbFile.exists()) return null

            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery(
                "SELECT value FROM catalystLocalStorage WHERE key = ?",
                arrayOf(SecureXAutofillService.STORAGE_KEY)
            )

            if (!cursor.moveToFirst()) {
                cursor.close()
                db.close()
                return null
            }

            val json = cursor.getString(0)
            cursor.close()
            db.close()

            findInVaultJson(json, credentialId, vaultKey)
        } catch (_: Exception) {
            null
        }
    }

    private fun findInVaultJson(json: String, credentialId: String, vaultKey: String): DecryptedCredential? {
        val array = JSONArray(json)
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            val id = obj.optString("id", "")
            if (id == credentialId) {
                val name = obj.optString("name", "Account")
                val username = obj.optString("username", "")
                val encPassword = obj.optString("password", "")
                val password = decryptPassword(encPassword, vaultKey) ?: continue
                return DecryptedCredential(id, name, username, password)
            }
        }
        return null
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
}
