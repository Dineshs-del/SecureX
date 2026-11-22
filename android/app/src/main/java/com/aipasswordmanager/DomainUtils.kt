package com.aipasswordmanager

import java.net.URI

object DomainUtils {

    /**
     * Extracts the registrable domain (eTLD+1) from a domain string or URL.
     * e.g., "login.example.com" -> "example.com"
     * "ssp.postmatric.karnataka.gov.in" -> "karnataka.gov.in"
     * "example.com" -> "example.com"
     * Returns lowercase, stripped of "www.", ports, and paths.
     */
    fun getRegistrableDomain(domainOrUrl: String?): String? {
        if (domainOrUrl.isNullOrBlank()) return null
        var clean = domainOrUrl.trim().lowercase()

        if (clean.startsWith("android://")) return null

        if (clean.contains("://")) {
            try {
                val uri = URI(clean)
                clean = uri.host ?: clean
            } catch (e: Exception) {
                val schemeIdx = clean.indexOf("://")
                if (schemeIdx != -1) {
                    clean = clean.substring(schemeIdx + 3)
                }
            }
        }

        val slashIdx = clean.indexOf('/')
        if (slashIdx != -1) clean = clean.substring(0, slashIdx)
        val colonIdx = clean.indexOf(':')
        if (colonIdx != -1) clean = clean.substring(0, colonIdx)

        if (clean.startsWith("www.")) {
            clean = clean.substring(4)
        }

        if (clean.isBlank() || !clean.contains(".")) return null

        val parts = clean.split(".")
        if (parts.size <= 2) return clean

        val lastTwo = "${parts[parts.size - 2]}.${parts[parts.size - 1]}"
        val commonTwoPartTlds = setOf(
            "co.uk", "gov.uk", "org.uk", "me.uk",
            "gov.in", "co.in", "net.in", "org.in", "ac.in", "res.in",
            "com.au", "net.au", "org.au", "edu.au", "gov.au",
            "co.jp", "ne.jp", "or.jp", "ac.jp",
            "com.br", "net.br", "org.br", "gov.br",
            "co.za", "gov.za", "org.za",
            "com.sg", "edu.sg", "gov.sg",
            "com.mx", "gob.mx", "edu.mx"
        )

        return if (commonTwoPartTlds.contains(lastTwo) && parts.size >= 3) {
            "${parts[parts.size - 3]}.$lastTwo"
        } else {
            "${parts[parts.size - 2]}.${parts[parts.size - 1]}"
        }
    }
}
