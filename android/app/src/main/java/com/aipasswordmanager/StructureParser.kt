package com.aipasswordmanager

import android.app.assist.AssistStructure
import android.app.assist.AssistStructure.ViewNode
import android.view.autofill.AutofillId

class StructureParser {
    var usernameId: AutofillId? = null
    var passwordId: AutofillId? = null

    fun parse(structure: AssistStructure) {
        val nodes = structure.windowNodeCount
        for (i in 0 until nodes) {
            val windowNode = structure.getWindowNodeAt(i)
            val viewNode = windowNode.rootViewNode
            parseNode(viewNode)
        }
    }

    private fun parseNode(node: ViewNode) {
        val hints = node.autofillHints
        if (hints != null) {
            for (hint in hints) {
                if (hint.equals("username", ignoreCase = true) || hint.contains("email")) {
                    usernameId = node.autofillId
                } else if (hint.equals("password", ignoreCase = true)) {
                    passwordId = node.autofillId
                }
            }
        }

        // Fallback to resource ID or class name
        val resourceId = node.idEntry
        if (resourceId != null) {
            if (resourceId.contains("username", ignoreCase = true) || resourceId.contains("email")) {
                if (usernameId == null) usernameId = node.autofillId
            } else if (resourceId.contains("password", ignoreCase = true)) {
                if (passwordId == null) passwordId = node.autofillId
            }
        }

        for (i in 0 until node.childCount) {
            parseNode(node.getChildAt(i))
        }
    }
}
