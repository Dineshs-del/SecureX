package com.aipasswordmanager

import android.app.PendingIntent
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

class SecureXAutofillService : AutofillService() {

    companion object {
        const val PREFS_NAME = "securex_autofill_prefs"
        const val KEY_VAULT_KEY = "vault_key"
        const val STORAGE_KEY = "securex_credentials"
    }

    data class Credential(val name: String, val username: String, val password: String)

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts[request.fillContexts.size - 1].structure
        val parser = StructureParser()
        parser.parse(structure)

        if (parser.usernameId == null && parser.passwordId == null) {
            callback.onSuccess(null)
            return
        }

        val responseBuilder = FillResponse.Builder()
        val autofillIds = arrayOf(parser.usernameId, parser.passwordId)
            .filterNotNull().toTypedArray()

        // Try to show credentials directly if vault is unlocked
        val vaultKey = getVaultKey()
        if (vaultKey != null) {
            val credentials = loadCredentials(vaultKey)
            if (credentials.isNotEmpty()) {
                for (cred in credentials) {
                    val presentation = RemoteViews(packageName, R.layout.autofill_list_item)
                    presentation.setTextViewText(R.id.autofill_label, "${cred.name}  •  ${cred.username}")

                    val datasetBuilder = Dataset.Builder()
                    parser.usernameId?.let {
                        datasetBuilder.setValue(it, AutofillValue.forText(cred.username), presentation)
                    }
                    parser.passwordId?.let {
                        val passPresentation = RemoteViews(packageName, R.layout.autofill_list_item)
                        passPresentation.setTextViewText(R.id.autofill_label, "${cred.name}  •  ${cred.username}")
                        datasetBuilder.setValue(it, AutofillValue.forText(cred.password), passPresentation)
                    }
                    responseBuilder.addDataset(datasetBuilder.build())
                }
                callback.onSuccess(responseBuilder.build())
                return
            }
        }

        // Vault locked — show "Unlock SecureX" prompt
        val presentation = RemoteViews(packageName, R.layout.autofill_list_item)
        presentation.setTextViewText(R.id.autofill_label, "🔐 Unlock SecureX to fill")

        val intent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(this, 0, intent, flags)
        responseBuilder.setAuthentication(autofillIds, pendingIntent.intentSender, presentation)
        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        callback.onSuccess()
    }

    private fun getVaultKey(): String? {
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        return prefs.getString(KEY_VAULT_KEY, null)
    }

    private fun loadCredentials(vaultKey: String): List<Credential> {
        return try {
            val dbPath = "/data/data/$packageName/databases/RKStorage"
            if (!File(dbPath).exists()) return emptyList()

            val db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery(
                "SELECT value FROM catalystLocalStorage WHERE key = ?",
                arrayOf(STORAGE_KEY)
            )

            if (!cursor.moveToFirst()) { cursor.close(); db.close(); return emptyList() }

            val json = cursor.getString(0)
            cursor.close()
            db.close()

            val array = JSONArray(json)
            val credentials = mutableListOf<Credential>()

            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val name = obj.optString("name", "")
                val username = obj.optString("username", "")
                val encryptedPassword = obj.optString("password", "")
                val password = decryptPassword(encryptedPassword, vaultKey) ?: continue
                credentials.add(Credential(name, username, password))
            }
            credentials
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun decryptPassword(encryptedJson: String, vaultKey: String): String? {
        return try {
            if (!encryptedJson.startsWith("{")) return encryptedJson // legacy plain text

            val obj = JSONObject(encryptedJson)
            val ciphertext = obj.getString("ciphertext")
            val iv = obj.getString("iv")

            val keyBytes = hexToBytes(vaultKey)
            val ivBytes = hexToBytes(iv)
            val cipherBytes = android.util.Base64.decode(ciphertext, android.util.Base64.DEFAULT)

            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), IvParameterSpec(ivBytes))
            String(cipher.doFinal(cipherBytes), Charsets.UTF_8)
        } catch (e: Exception) {
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