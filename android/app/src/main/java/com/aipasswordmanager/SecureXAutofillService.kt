package com.aipasswordmanager

import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.util.Log
import android.view.autofill.AutofillId
import android.widget.RemoteViews
import org.json.JSONArray

class SecureXAutofillService : AutofillService() {

    companion object {
        const val PREFS_NAME = "securex_autofill_prefs"
        const val KEY_VAULT_KEY = "vault_key"
        const val STORAGE_KEY = "securex_credentials"
        const val KEY_FILL_GENERATION = "fill_generation"
        const val KEY_SECURE_SCREEN = "secure_screen_enabled"
        const val KEY_NEVER_SAVE_DOMAINS = "never_save_domains"
    }

    data class CredentialMeta(
        val id: String,
        val name: String,
        val username: String,
        val url: String = "",
        val androidPackage: String = "",
        val domains: List<String> = emptyList()
    )

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val fillContexts = request.fillContexts
        if (fillContexts.isEmpty()) {
            callback.onSuccess(null)
            return
        }

        val structure = fillContexts[fillContexts.size - 1].structure
        val parser = StructureParser()
        parser.parse(structure)

        // Never autofill inside SecureX itself
        if (parser.packageName == packageName) {
            callback.onSuccess(null)
            return
        }

        if (!parser.hasValidLoginMetadata) {
            if (BuildConfig.DEBUG) {
                Log.d("SecureXAutofill", "FillRequest skipped: No valid login metadata found in structure.")
            }
            callback.onSuccess(null)
            return
        }

        val targetRegistrableDomain = parser.registrableDomain
        val isHttpsVerified = parser.isHttpsVerified
        val targetPackage = parser.packageName
        val isWebRequest = !targetRegistrableDomain.isNullOrBlank()

        if (BuildConfig.DEBUG) {
            Log.d(
                "SecureXAutofill",
                "FillRequest received: isWeb=$isWebRequest, domain=$targetRegistrableDomain, isHttps=$isHttpsVerified, pkg=$targetPackage, hasUsername=${parser.usernameId != null}, hasPassword=${parser.passwordId != null}"
            )
        }

        if (isWebRequest && !isHttpsVerified) {
            if (BuildConfig.DEBUG) {
                Log.d("SecureXAutofill", "FillRequest skipped: Web origin is not HTTPS (unverified).")
            }
            callback.onSuccess(null)
            return
        }

        val isPasswordOnlyStep = parser.passwordId != null && parser.usernameId == null
        if (isPasswordOnlyStep && isWebRequest && targetRegistrableDomain.isNullOrBlank()) {
            callback.onSuccess(null)
            return
        }

        val allCredentials = loadCredentialMetadata()
        val matchedList = if (isWebRequest && !targetRegistrableDomain.isNullOrBlank()) {
            val mainDomainPart = targetRegistrableDomain.split(".")[0].lowercase()
            allCredentials.filter { cred ->
                val credDomain = DomainUtils.getRegistrableDomain(cred.url)
                val matchesDomainList = cred.domains.any { d ->
                    DomainUtils.getRegistrableDomain(d) == targetRegistrableDomain
                }
                val matchesUrlDomain = (credDomain != null && credDomain == targetRegistrableDomain)
                val matchesName = mainDomainPart.length >= 4 && cred.name.lowercase().contains(mainDomainPart)
                matchesDomainList || matchesUrlDomain || matchesName
            }
        } else if (!targetPackage.isNullOrBlank()) {
            val pkgMainName = extractPackageMainName(targetPackage)
            allCredentials.filter { cred ->
                val exactPkg = cred.androidPackage.isNotBlank() &&
                    cred.androidPackage.equals(targetPackage, ignoreCase = true)
                val fallbackMatch = pkgMainName.length >= 4 && (
                    cred.domains.any { d -> d.lowercase().contains(pkgMainName) } ||
                    (DomainUtils.getRegistrableDomain(cred.url)?.lowercase()?.contains(pkgMainName) == true) ||
                    cred.name.lowercase().contains(pkgMainName)
                )
                exactPkg || fallbackMatch
            }
        } else {
            emptyList()
        }

        val responseBuilder = FillResponse.Builder()
        var hasContent = false

        // 1. Configure Autosave via SaveInfo only when we have a password field and the domain/app is not excluded
        val excluded = isExcludedDomain(targetRegistrableDomain, targetPackage)
        if (!excluded && parser.hasValidLoginMetadata && parser.passwordId != null) {
            try {
                val requiredIds = arrayOf(parser.passwordId!!)
                val saveType = if (parser.usernameId != null) {
                    SaveInfo.SAVE_DATA_TYPE_PASSWORD or SaveInfo.SAVE_DATA_TYPE_USERNAME
                } else {
                    SaveInfo.SAVE_DATA_TYPE_PASSWORD
                }
                val saveInfoBuilder = SaveInfo.Builder(saveType, requiredIds)
                parser.usernameId?.let { userId ->
                    saveInfoBuilder.setOptionalIds(arrayOf(userId))
                }
                responseBuilder.setSaveInfo(saveInfoBuilder.build())
                hasContent = true
            } catch (_: Exception) {}
        }

        // 2. Add Matching Datasets for Autofill (every dataset requires fingerprint verification via AutofillAuthActivity)
        if (matchedList.isNotEmpty()) {
            val displayList = matchedList.take(5)
            for ((index, cred) in displayList.withIndex()) {
                val intent = Intent(this, AutofillAuthActivity::class.java).apply {
                    putExtra("credential_id", cred.id)
                    if (parser.usernameId != null) putExtra("username_id", parser.usernameId)
                    if (parser.passwordId != null) putExtra("password_id", parser.passwordId)
                }

                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val reqCode = ((cred.id.hashCode() * 31 + index) and 0x7fffffff)
                val pendingIntent = PendingIntent.getActivity(this, reqCode, intent, flags)

                val presentation = RemoteViews(packageName, R.layout.autofill_list_item)
                val label = if (cred.username.isNotBlank()) {
                    "${cred.name} • ${cred.username}"
                } else {
                    cred.name
                }
                presentation.setTextViewText(R.id.autofill_label, label)

                val datasetBuilder = Dataset.Builder()
                parser.usernameId?.let { datasetBuilder.setValue(it, null, presentation) }
                parser.passwordId?.let { datasetBuilder.setValue(it, null, presentation) }
                datasetBuilder.setAuthentication(pendingIntent.intentSender)

                responseBuilder.addDataset(datasetBuilder.build())
                hasContent = true
            }
        }

        if (hasContent) {
            callback.onSuccess(responseBuilder.build())
        } else {
            callback.onSuccess(null)
        }
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        val fillContexts = request.fillContexts
        if (fillContexts.isEmpty()) {
            callback.onSuccess()
            return
        }

        val structure = fillContexts[fillContexts.size - 1].structure
        val parser = StructureParser()
        parser.parse(structure)

        // Never prompt to save inside SecureX itself
        if (parser.packageName == packageName) {
            callback.onSuccess()
            return
        }

        // Strict validation: must have valid login metadata and an explicit password field
        if (!parser.hasValidLoginMetadata || parser.passwordId == null) {
            callback.onSuccess()
            return
        }

        val domain = parser.registrableDomain ?: ""
        val pkg = parser.packageName ?: ""

        // Enforce Never-Save sites exclusion list
        if (isExcludedDomain(domain, pkg)) {
            callback.onSuccess()
            return
        }

        // Additional safeguard: never save from messaging/chat/SMS apps
        if (pkg.contains("chat", ignoreCase = true) ||
            pkg.contains("messaging", ignoreCase = true) ||
            pkg.contains("whatsapp", ignoreCase = true) ||
            pkg.contains("telegram", ignoreCase = true) ||
            pkg.contains("sms", ignoreCase = true) ||
            pkg.contains("mms", ignoreCase = true) ||
            pkg.contains("messenger", ignoreCase = true)
        ) {
            callback.onSuccess()
            return
        }

        val submittedUsername = extractFieldValue(structure, parser.usernameId) ?: ""
        val submittedPassword = extractFieldValue(structure, parser.passwordId) ?: ""

        // Validate password quality/length for a credential save prompt (min length 4, not blank)
        if (submittedPassword.isBlank() || submittedPassword.length < 4) {
            callback.onSuccess()
            return
        }

        val friendlyName = when {
            domain.isNotBlank() -> domain.split(".")[0].replaceFirstChar { it.uppercase() }
            pkg.isNotBlank() -> extractPackageMainName(pkg).replaceFirstChar { it.uppercase() }.ifBlank { "Account" }
            submittedUsername.isNotBlank() -> submittedUsername
            else -> "Account"
        }

        val intent = Intent(this, AutofillSaveActivity::class.java).apply {
            putExtra("save_name", friendlyName)
            putExtra("save_username", submittedUsername)
            putExtra("save_password", submittedPassword)
            putExtra("save_url", if (domain.isNotBlank()) "https://$domain" else "")
            putExtra("save_package", pkg)
            putExtra("save_domain", domain)
        }

        // Android 9+ (API 28+): pass IntentSender to callback.onSuccess() so Android launches
        // AutofillSaveActivity safely without Background Activity Launch (BAL) restrictions.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val reqCode = ((System.currentTimeMillis() and 0x7fffffff).toInt())
                val pendingIntent = PendingIntent.getActivity(this, reqCode, intent, flags)
                callback.onSuccess(pendingIntent.intentSender)
                return
            } catch (_: Exception) {}
        }

        // API 26-27 fallback
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (_: Exception) {}
        callback.onSuccess()
    }

    private fun isExcludedDomain(domain: String?, pkg: String?): Boolean {
        return try {
            val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            val json = prefs.getString(KEY_NEVER_SAVE_DOMAINS, "[]") ?: "[]"
            val arr = JSONArray(json)
            val normDomain = DomainUtils.getRegistrableDomain(domain) ?: domain?.trim()?.lowercase() ?: ""
            val normPkg = pkg?.trim()?.lowercase() ?: ""
            for (i in 0 until arr.length()) {
                val raw = arr.optString(i, "").trim().lowercase()
                if (raw.isBlank()) continue
                val cleanRule = DomainUtils.getRegistrableDomain(raw) ?: raw
                if (normDomain.isNotBlank() && (normDomain == cleanRule || normDomain.endsWith(".$cleanRule"))) {
                    return true
                }
                if (normPkg.isNotBlank() && (normPkg == raw || normPkg.contains(cleanRule))) {
                    return true
                }
            }
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun extractFieldValue(structure: AssistStructure, targetId: AutofillId?): String? {
        if (targetId == null) return null
        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            val value = findValueInNode(windowNode.rootViewNode, targetId)
            if (value != null) return value
        }
        return null
    }

    private fun findValueInNode(node: AssistStructure.ViewNode, targetId: AutofillId): String? {
        if (node.autofillId == targetId) {
            val autofillValue = node.autofillValue
            if (autofillValue != null && autofillValue.isText) {
                val text = autofillValue.textValue?.toString()
                if (!text.isNullOrBlank()) return text
            }
            val text = node.text?.toString()
            if (!text.isNullOrBlank()) return text
        }
        for (i in 0 until node.childCount) {
            val valInChild = findValueInNode(node.getChildAt(i), targetId)
            if (valInChild != null) return valInChild
        }
        return null
    }

    private fun extractPackageMainName(pkg: String): String {
        val parts = pkg.lowercase().split(".")
        for (part in parts.reversed()) {
            if (part !in listOf("com", "org", "net", "android", "app", "mobile", "client", "katana", "orca", "lite", "inc")) {
                return part
            }
        }
        return ""
    }

    private fun loadCredentialMetadata(): List<CredentialMeta> {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            val json = prefs.getString("cached_credentials_json", null)
            if (!json.isNullOrBlank()) {
                val credentials = parseMetaJson(json)
                if (credentials.isNotEmpty()) return credentials
            }
        } catch (_: Exception) {}

        return try {
            val dbFile = getDatabasePath("RKStorage")
            if (!dbFile.exists()) return emptyList()

            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery(
                "SELECT value FROM catalystLocalStorage WHERE key = ?",
                arrayOf(STORAGE_KEY)
            )

            if (!cursor.moveToFirst()) {
                cursor.close()
                db.close()
                return emptyList()
            }

            val json = cursor.getString(0)
            cursor.close()
            db.close()

            parseMetaJson(json)
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun parseMetaJson(json: String): List<CredentialMeta> {
        val array = JSONArray(json)
        val credentials = mutableListOf<CredentialMeta>()
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            val id = obj.optString("id", "")
            val name = obj.optString("name", "Account")
            val username = obj.optString("username", "")
            val url = obj.optString("url", "")
            val androidPackage = obj.optString("androidPackage", "")
            val domainsList = mutableListOf<String>()
            val domainsArr = obj.optJSONArray("domains")
            if (domainsArr != null) {
                for (d in 0 until domainsArr.length()) {
                    val domStr = domainsArr.optString(d, "")
                    if (domStr.isNotBlank()) domainsList.add(domStr)
                }
            }
            credentials.add(CredentialMeta(id, name, username, url, androidPackage, domainsList))
        }
        return credentials
    }
}
