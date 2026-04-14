import { CryptoService } from '../theme/crypto/CryptoService';

/**
 * BreachDetector checks passwords against HaveIBeenPwned
 * Uses k-anonymity — only first 5 chars of SHA-1 hash sent
 * Your actual password NEVER leaves the device
 */
export class BreachDetector {

  static async checkPassword(password: string): Promise<{ isBreached: boolean; count: number }> {
    try {
      const hash = CryptoService.sha1Hash(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
      });

      if (!response.ok) return { isBreached: false, count: 0 };

      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          return { isBreached: true, count: parseInt(countStr.trim(), 10) };
        }
      }
      return { isBreached: false, count: 0 };
    } catch {
      // Network error — don't flag as breached
      return { isBreached: false, count: 0 };
    }
  }

  /**
   * Check URL for phishing indicators
   */
  static analyzeUrl(url: string): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // No HTTPS
    if (url.startsWith('http://')) {
      reasons.push('Not using HTTPS — connection is not secure');
    }

    // IP address instead of domain
    if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
      reasons.push('Uses IP address instead of domain name');
    }

    // Suspicious TLDs
    const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq'];
    if (suspiciousTlds.some(tld => url.includes(tld))) {
      reasons.push('Uses an uncommon or free domain extension');
    }

    // Homograph / typosquatting check
    const commonDomains = ['google', 'facebook', 'amazon', 'apple', 'microsoft', 'paypal', 'netflix'];
    const urlLower = url.toLowerCase();
    for (const domain of commonDomains) {
      const levenshtein = this.levenshteinDistance(urlLower, domain);
      if (levenshtein > 0 && levenshtein <= 2 && urlLower.includes(domain.substring(0, 3))) {
        reasons.push(`Domain may be impersonating ${domain}.com`);
      }
    }

    // Excessive subdomains
    const domainPart = url.replace(/https?:\/\//, '').split('/')[0];
    const subdomainCount = domainPart.split('.').length - 2;
    if (subdomainCount > 2) {
      reasons.push('Excessive subdomains — possible phishing site');
    }

    return { isSuspicious: reasons.length > 0, reasons };
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}