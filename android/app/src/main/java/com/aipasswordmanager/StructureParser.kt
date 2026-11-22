package com.aipasswordmanager

import android.app.assist.AssistStructure
import android.app.assist.AssistStructure.ViewNode
import android.text.InputType
import android.util.Log
import android.view.autofill.AutofillId

class StructureParser {
    var usernameId: AutofillId? = null
    var passwordId: AutofillId? = null
    var packageName: String? = null
    var webDomain: String? = null
    var registrableDomain: String? = null
    var isHttpsVerified: Boolean = false
    var focusedId: AutofillId? = null
    var hasValidLoginMetadata: Boolean = false

    private val allTextFieldIds = mutableListOf<AutofillId>()
    private val passwordFieldIds = mutableListOf<AutofillId>()
    private val usernameFieldIds = mutableListOf<AutofillId>()

    private val searchKeywords = listOf(
        "search", "query", "find", "lookup", "filter", "autocomplete", "hint_search", "url_bar", "omnibox"
    )
    private val messageKeywords = listOf(
        "chat", "message", "msg", "comment", "post", "tweet", "feedback", "review",
        "bio", "description", "subject", "title", "chatinput", "messageinput", "commentinput",
        "compose", "reply", "status", "note", "caption"
    )
    private val otpKeywords = listOf(
        "otp", "one-time-code", "verification_code", "verify_code", "2fa", "mfa", "totp", "sms_code"
    )

    fun parse(structure: AssistStructure) {
        val componentPkg = structure.activityComponent?.packageName
        if (!componentPkg.isNullOrBlank()) {
            packageName = componentPkg
        }

        val nodes = structure.windowNodeCount
        for (i in 0 until nodes) {
            val windowNode = structure.getWindowNodeAt(i)
            val viewNode = windowNode.rootViewNode
            parseNode(viewNode)
        }

        // 1. Identify Password field if not already matched
        if (passwordId == null && passwordFieldIds.isNotEmpty()) {
            passwordId = passwordFieldIds[0]
        }

        // 2. Identify Username field: prefer explicit username/email fields, or a preceding valid text field before password
        if (usernameId == null) {
            if (usernameFieldIds.isNotEmpty()) {
                usernameId = usernameFieldIds[0]
            } else if (passwordId != null) {
                // Find a valid text field that appears before the password field
                for (id in allTextFieldIds) {
                    if (id != passwordId) {
                        usernameId = id
                        break
                    }
                }
            }
        }

        // Valid login metadata requires a password field OR an explicit username/email login field
        if (passwordId != null || usernameId != null) {
            hasValidLoginMetadata = true
        }

        if (BuildConfig.DEBUG) {
            Log.d(
                "SecureXAutofill",
                "StructureParser complete: pkg=$packageName, webDomain=$webDomain, registrableDomain=$registrableDomain, isHttps=$isHttpsVerified, hasUsername=${usernameId != null}, hasPassword=${passwordId != null}"
            )
        }
    }

    private fun parseNode(node: ViewNode) {
        // Extract Web Domain and Scheme
        val rawDomain = node.webDomain
        if (!rawDomain.isNullOrBlank()) {
            val scheme = node.webScheme?.lowercase() ?: ""
            if (scheme != "http" && !rawDomain.startsWith("http://")) {
                isHttpsVerified = true
            }
            if (webDomain == null) {
                webDomain = rawDomain
                registrableDomain = DomainUtils.getRegistrableDomain(rawDomain)
            }
        }

        if (packageName == null && !node.idPackage.isNullOrBlank() && node.idPackage != "android") {
            packageName = node.idPackage
        }

        if (node.isFocused && node.autofillId != null) {
            focusedId = node.autofillId
        }

        val className = node.className ?: ""
        val inputType = node.inputType
        val hints = node.autofillHints
        val resourceId = node.idEntry?.lowercase() ?: ""
        val hintText = node.hint?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        // Skip search bars, messaging boxes, comment boxes, filters, and OTP fields
        if (isNonCredentialField(resourceId, hintText, contentDesc, inputType, hints)) {
            for (i in 0 until node.childCount) {
                parseNode(node.getChildAt(i))
            }
            return
        }

        var isPasswordNode = false
        var isUsernameNode = false

        // 1. Android Autofill Hints (highest priority)
        if (hints != null) {
            for (hint in hints) {
                if (isPasswordHint(hint)) isPasswordNode = true
                if (isUsernameHint(hint)) isUsernameNode = true
            }
        }

        // 2. HTML Info (Browsers & WebViews)
        node.htmlInfo?.let { htmlInfo ->
            if (htmlInfo.tag.equals("input", ignoreCase = true)) {
                var htmlType = ""
                htmlInfo.attributes?.forEach { attr ->
                    val attrName = attr.first?.lowercase() ?: ""
                    val attrVal = attr.second?.lowercase() ?: ""
                    if (attrName == "type") {
                        htmlType = attrVal
                        if (attrVal == "password") isPasswordNode = true
                        if (attrVal == "email") isUsernameNode = true
                    }
                    if (attrName == "autocomplete" || attrName == "name" || attrName == "id") {
                        if (isPasswordAttributeValue(attrVal)) isPasswordNode = true
                        if (isUsernameAttributeValue(attrVal)) isUsernameNode = true
                    }
                }
                if (htmlType == "search" || htmlType == "hidden" || htmlType == "submit" || htmlType == "button") {
                    isPasswordNode = false
                    isUsernameNode = false
                }
            }
        }

        // 3. InputType Variations
        if (inputType != InputType.TYPE_NULL) {
            val inputClass = inputType and InputType.TYPE_MASK_CLASS
            val variation = inputType and InputType.TYPE_MASK_VARIATION
            if (inputClass == InputType.TYPE_CLASS_TEXT && (
                    variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                    variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                    variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
                )
            ) {
                isPasswordNode = true
            } else if (inputClass == InputType.TYPE_CLASS_NUMBER &&
                variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
            ) {
                isPasswordNode = true
            } else if (inputClass == InputType.TYPE_CLASS_TEXT && (
                    variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
                    variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS
                )
            ) {
                isUsernameNode = true
            }
        }

        // 4. Conservative Resource ID / Hint fallback
        if (!isPasswordNode && (isPasswordAttributeValue(resourceId) || isPasswordAttributeValue(hintText))) {
            isPasswordNode = true
        }
        if (!isUsernameNode && (isUsernameAttributeValue(resourceId) || isUsernameAttributeValue(hintText))) {
            isUsernameNode = true
        }

        val isMultiLineText = (inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0
        val isTextInput = !isMultiLineText && (
            node.autofillType == android.view.View.AUTOFILL_TYPE_TEXT ||
            inputType != InputType.TYPE_NULL ||
            className.contains("EditText", ignoreCase = true) ||
            className.contains("TextInput", ignoreCase = true) ||
            className.contains("AppCompatEditText", ignoreCase = true)
        )

        if (isTextInput && node.autofillId != null) {
            if (isPasswordNode) {
                if (!passwordFieldIds.contains(node.autofillId)) {
                    passwordFieldIds.add(node.autofillId!!)
                }
                if (passwordId == null) {
                    passwordId = node.autofillId
                }
            } else if (isUsernameNode) {
                if (!usernameFieldIds.contains(node.autofillId)) {
                    usernameFieldIds.add(node.autofillId!!)
                }
                if (usernameId == null && node.autofillId != passwordId) {
                    usernameId = node.autofillId
                }
            } else {
                if (!allTextFieldIds.contains(node.autofillId)) {
                    allTextFieldIds.add(node.autofillId!!)
                }
            }
        }

        for (i in 0 until node.childCount) {
            parseNode(node.getChildAt(i))
        }
    }

    private fun isNonCredentialField(
        resourceId: String,
        hint: String,
        desc: String,
        inputType: Int,
        hints: Array<String>?
    ): Boolean {
        if (hints != null) {
            for (h in hints) {
                val lower = h.lowercase()
                if (otpKeywords.any { lower.contains(it) }) return true
                if (isPasswordHint(lower)) return false
            }
        }
        val inputClass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        if (inputClass == InputType.TYPE_CLASS_TEXT && (
                variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
            )
        ) {
            return false
        }
        if (inputClass == InputType.TYPE_CLASS_NUMBER &&
            variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
        ) {
            return false
        }
        if (inputClass == InputType.TYPE_CLASS_TEXT) {
            if (variation == InputType.TYPE_TEXT_VARIATION_URI ||
                variation == InputType.TYPE_TEXT_VARIATION_FILTER ||
                variation == InputType.TYPE_TEXT_VARIATION_SHORT_MESSAGE ||
                variation == InputType.TYPE_TEXT_VARIATION_LONG_MESSAGE ||
                variation == InputType.TYPE_TEXT_VARIATION_EMAIL_SUBJECT
            ) {
                return true
            }
        }
        for (kw in searchKeywords) {
            if (resourceId.contains(kw) || hint.contains(kw) || desc.contains(kw)) return true
        }
        for (kw in messageKeywords) {
            if (resourceId.contains(kw) || hint.contains(kw) || desc.contains(kw)) return true
        }
        for (kw in otpKeywords) {
            if (resourceId.contains(kw) || hint.contains(kw) || desc.contains(kw)) return true
        }
        return false
    }

    private fun isUsernameHint(hint: String): Boolean {
        val lower = hint.lowercase()
        return lower == "username" || lower == "email" || lower == "emailaddress" ||
            lower == "email_address" || lower == "login" || lower == "identifier" ||
            lower.contains("username") || lower.contains("emailaddress") || lower.contains("login")
    }

    private fun isPasswordHint(hint: String): Boolean {
        val lower = hint.lowercase()
        return lower == "password" || lower == "newpassword" || lower == "currentpassword" ||
            lower == "new-password" || lower == "current-password" ||
            lower.contains("password") || lower.contains("passwd")
    }

    private fun isUsernameAttributeValue(valStr: String?): Boolean {
        if (valStr.isNullOrBlank()) return false
        val lower = valStr.lowercase()
        return lower.contains("username") || lower.contains("email") || lower.contains("login") ||
            lower.contains("identifier") || lower.contains("userid") || lower.contains("signin") ||
            lower == "user" || lower == "account"
    }

    private fun isPasswordAttributeValue(valStr: String?): Boolean {
        if (valStr.isNullOrBlank()) return false
        val lower = valStr.lowercase()
        return lower.contains("password") || lower.contains("passwd") ||
            lower.contains("current-password") || lower.contains("new-password") ||
            lower == "pwd" || lower == "pass"
    }
}
