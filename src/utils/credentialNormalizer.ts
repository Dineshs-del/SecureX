// ─────────────────────────────────────────────────────────────────────────────
// SECUREX CREDENTIAL NORMALIZER
// Cleans messy CSV exports from Chrome, Google Password Manager, Bitwarden, 1Password
// Normalizes names, URLs, Android packages, usernames, passwords, and de-duplicates
// ─────────────────────────────────────────────────────────────────────────────

import { VaultCredential } from '../store/vaultStore';

export interface NormalizedRow {
  id: string;
  name: string;
  url: string;
  androidPackage?: string;
  username: string;
  password: string;
  notes: string;
  category: string;
  totp?: string;
  selected?: boolean;
}

export interface NormalizationSummary {
  newItems: NormalizedRow[];
  duplicatesSkipped: number;
  errorsSkipped: number;
  totalRows: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMON ANDROID PACKAGES MAP
// ─────────────────────────────────────────────────────────────────────────────
export const COMMON_APP_PACKAGES: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.whatsapp': 'WhatsApp',
  'com.whatsapp.w4b': 'WhatsApp Business',
  'com.facebook.katana': 'Facebook',
  'com.facebook.orca': 'Messenger',
  'com.facebook.lite': 'Facebook Lite',
  'com.google.android.youtube': 'YouTube',
  'com.spotify.music': 'Spotify',
  'com.twitter.android': 'X (Twitter)',
  'com.x.android': 'X',
  'com.snapchat.android': 'Snapchat',
  'org.telegram.messenger': 'Telegram',
  'org.telegram.plus': 'Telegram Plus',
  'com.linkedin.android': 'LinkedIn',
  'com.reddit.frontpage': 'Reddit',
  'com.amazon.mShop.android.shopping': 'Amazon',
  'com.amazon.mp3': 'Amazon Music',
  'com.amazon.avod.thirdpartyclient': 'Prime Video',
  'com.netflix.mediaclient': 'Netflix',
  'com.discord': 'Discord',
  'com.pinterest': 'Pinterest',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.ss.android.ugc.trill': 'TikTok',
  'com.google.android.gm': 'Gmail',
  'com.google.android.apps.photos': 'Google Photos',
  'com.google.android.apps.docs': 'Google Drive',
  'com.microsoft.office.outlook': 'Outlook',
  'com.microsoft.teams': 'Microsoft Teams',
  'com.adobe.reader': 'Adobe Acrobat',
  // Indian Services
  'com.phonepe.app': 'PhonePe',
  'net.one97.paytm': 'Paytm',
  'com.google.android.apps.nbu.paisa.user': 'Google Pay',
  'in.org.npci.upiapp': 'BHIM',
  'com.flipkart.android': 'Flipkart',
  'in.swiggy.android': 'Swiggy',
  'com.application.zomato': 'Zomato',
  'com.myntra.android': 'Myntra',
  'com.olacabs.customer': 'Ola',
  'com.ubercab': 'Uber',
  'in.hotstar.android': 'Disney+ Hotstar',
  'com.jio.myjio': 'MyJio',
  'com.jio.media.jiobeats': 'JioSaavn',
  'com.jio.jioplay.tv': 'JioCinema',
  'com.myairtelapp': 'Airtel Thanks',
  'cris.org.in.prs.ima': 'IRCTC Rail Connect',
  'com.sbi.lotusintouch': 'YONO SBI',
  'com.snapwork.hdfc': 'HDFC Bank MobileBanking',
  'com.csam.icici.bank.imobile': 'iMobile Pay (ICICI)',
  'com.axis.mobile': 'Axis Mobile',
  'com.zerodha.kite3': 'Zerodha Kite',
  'com.nextbillion.groww': 'Groww',
  'com.dreamplug.androidapp': 'CRED',
  'com.makemytrip': 'MakeMyTrip',
  'com.goibibo': 'Goibibo',
  'com.cleartrip.android': 'Cleartrip',
  'com.bookmyshow.android': 'BookMyShow',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMON DOMAIN TO FRIENDLY NAME MAP
// ─────────────────────────────────────────────────────────────────────────────
export const COMMON_DOMAINS_MAP: Record<string, string> = {
  'google.com': 'Google',
  'accounts.google.com': 'Google',
  'youtube.com': 'YouTube',
  'github.com': 'GitHub',
  'spotify.com': 'Spotify',
  'open.spotify.com': 'Spotify',
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X',
  'linkedin.com': 'LinkedIn',
  'microsoft.com': 'Microsoft',
  'login.microsoftonline.com': 'Microsoft',
  'login.live.com': 'Microsoft',
  'apple.com': 'Apple',
  'appleid.apple.com': 'Apple',
  'icloud.com': 'iCloud',
  'amazon.com': 'Amazon',
  'amazon.in': 'Amazon India',
  'netflix.com': 'Netflix',
  'reddit.com': 'Reddit',
  'discord.com': 'Discord',
  'openai.com': 'OpenAI',
  'auth0.openai.com': 'OpenAI',
  'chatgpt.com': 'ChatGPT',
  'dropbox.com': 'Dropbox',
  'slack.com': 'Slack',
  'notion.so': 'Notion',
  'zoom.us': 'Zoom',
  'adobe.com': 'Adobe',
  'paypal.com': 'PayPal',
  'twitch.tv': 'Twitch',
  // Indian Services
  'flipkart.com': 'Flipkart',
  'paytm.com': 'Paytm',
  'phonepe.com': 'PhonePe',
  'swiggy.com': 'Swiggy',
  'zomato.com': 'Zomato',
  'myntra.com': 'Myntra',
  'irctc.co.in': 'IRCTC',
  'onlinesbi.sbi': 'SBI',
  'onlinesbi.com': 'SBI',
  'hdfcbank.com': 'HDFC Bank',
  'icicibank.com': 'ICICI Bank',
  'axisbank.com': 'Axis Bank',
  'jio.com': 'Jio',
  'airtel.in': 'Airtel',
  'hotstar.com': 'Disney+ Hotstar',
  'karnataka.gov.in': 'Karnataka Gov',
  'ssp.postmatric.karnataka.gov.in': 'Karnataka Gov',
  'techsaksham.org': 'TechSaksham',
  'incometax.gov.in': 'Income Tax India',
  'epfindia.gov.in': 'EPFO India',
  'uidai.gov.in': 'UIDAI (Aadhaar)',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Derive a friendly name from an Android package name */
export function deriveFriendlyNameFromPackage(pkg: string): string {
  const cleanedPkg = pkg.toLowerCase().trim();
  if (COMMON_APP_PACKAGES[cleanedPkg]) {
    return COMMON_APP_PACKAGES[cleanedPkg];
  }

  // Split by dots
  const parts = cleanedPkg.split('.').filter(Boolean);
  if (parts.length >= 2) {
    // Standard android package: e.g. com.instagram.android -> second to last is 'instagram'
    // If last part is 'android', 'app', 'mobile', or 'client', take the previous part
    let candidate = parts[parts.length - 2];
    if (['android', 'app', 'mobile', 'client', 'frontpage', 'katana', 'orca'].includes(parts[parts.length - 1])) {
      candidate = parts[parts.length - 2];
    } else if (parts.length === 2 && parts[0] === 'com') {
      candidate = parts[1];
    } else {
      candidate = parts[parts.length - 1];
    }

    if (candidate && candidate !== 'com' && candidate !== 'org' && candidate !== 'net') {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  return 'Android App';
}

/** Extract clean package name from an android:// URL string */
export function extractAndroidPackage(urlOrString: string): string | null {
  if (!urlOrString || !urlOrString.startsWith('android://')) {
    return null;
  }

  // Chrome format: android://<hash>@<package>/ or android://<package>/
  let pkgPart = urlOrString.replace('android://', '');
  if (pkgPart.includes('@')) {
    pkgPart = pkgPart.split('@')[1];
  }
  // Remove trailing path or query
  pkgPart = pkgPart.split('/')[0].split('?')[0].trim();

  // Validate package format: at least one dot, valid chars
  if (/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(pkgPart)) {
    return pkgPart;
  }

  return pkgPart || null;
}

/** Extract hostname from URL or string */
export function extractHostname(url: string): string {
  if (!url) return '';
  try {
    let clean = url.trim();
    if (!clean.includes('://')) {
      clean = `https://${clean}`;
    }
    const u = new URL(clean);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    // Fallback extraction
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?#:]+)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

/** Extract registrable domain (eTLD+1) from URL */
export function extractRegistrableDomain(url: string): string | null {
  if (!url || url.startsWith('android://')) return null;
  const host = extractHostname(url);
  if (!host || !host.includes('.')) return null;

  const parts = host.split('.');
  if (parts.length <= 2) return host;

  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  const commonTwoPartTlds = [
    'co.uk', 'gov.uk', 'org.uk',
    'gov.in', 'co.in', 'net.in', 'org.in', 'ac.in',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'co.jp', 'ne.jp', 'or.jp',
    'com.br', 'net.br', 'org.br',
    'co.za', 'gov.za',
    'com.sg', 'edu.sg', 'gov.sg',
  ];

  if (commonTwoPartTlds.includes(lastTwo) && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${lastTwo}`;
  }
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

/** Derive a friendly name from a domain name */
export function deriveFriendlyNameFromDomain(domain: string): string {
  if (!domain) return 'Web Account';
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

  if (COMMON_DOMAINS_MAP[cleanDomain]) {
    return COMMON_DOMAINS_MAP[cleanDomain];
  }

  // Check parent domains (e.g. ssp.postmatric.karnataka.gov.in -> karnataka.gov.in)
  const parts = cleanDomain.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (COMMON_DOMAINS_MAP[parent]) {
      return COMMON_DOMAINS_MAP[parent];
    }
  }

  // Handle common TLDs: .gov.in, .co.in, .com, .org, .net, .edu, .io, .in, etc.
  let hostWithoutTld = cleanDomain
    .replace(/\.(gov|co|ac|edu|nic|res|org)\.[a-z]{2,3}$/i, '')
    .replace(/\.[a-z]{2,6}$/i, '');

  // Strip subdomains like login, accounts, auth, ssp, postmatric, m, api, www
  const subparts = hostWithoutTld.split('.');
  const meaningfulParts = subparts.filter(
    (p) => !['login', 'accounts', 'auth', 'signin', 'ssp', 'postmatric', 'm', 'mobile', 'api', 'app', 'web', 'portal', 'idp'].includes(p.toLowerCase())
  );

  const mainPart = meaningfulParts.length > 0 ? meaningfulParts[meaningfulParts.length - 1] : subparts[subparts.length - 1];

  if (!mainPart) return 'Web Account';

  // Capitalize and clean up hyphens
  return mainPart
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Clean and normalize a Name field:
 * If the name field contains a URL stuck to it, strip the URL; use the clean site name.
 * If the name is empty, derive it from the domain or androidPackage.
 */
export function normalizeCredentialName(
  rawName: string,
  rawUrl: string,
  androidPackage?: string
): string {
  let name = (rawName || '').trim();

  // If androidPackage is present and name is empty or looks like an android URI
  if (androidPackage && (!name || name.startsWith('android://') || name.includes(androidPackage))) {
    return deriveFriendlyNameFromPackage(androidPackage);
  }

  // Check if a URL is stuck to the name (e.g. "karnataka.gov.inhttps://ssp.postmatric...", "Spotifyhttps://open.spotify.com")
  if (name.includes('http://') || name.includes('https://') || name.includes('android://')) {
    const urlIdx = name.search(/https?:\/\/|android:\/\//i);
    if (urlIdx > 0) {
      // Something precedes the URL (e.g. "karnataka.gov.in" or "Spotify")
      const prefix = name.substring(0, urlIdx).trim();
      if (prefix.length > 1) {
        // If prefix looks like a domain, derive friendly name
        if (prefix.includes('.')) {
          name = deriveFriendlyNameFromDomain(prefix);
        } else {
          name = prefix;
        }
      } else {
        name = '';
      }
    } else {
      // Name starts directly with the URL
      name = '';
    }
  }

  // If name is just a bare domain (e.g. "github.com", "open.spotify.com")
  if (name && (name.endsWith('.com') || name.endsWith('.in') || name.endsWith('.org') || name.endsWith('.gov.in') || name.endsWith('.net') || name.endsWith('.io'))) {
    name = deriveFriendlyNameFromDomain(name);
  }

  // If name is still empty, derive from URL or androidPackage
  if (!name) {
    if (androidPackage) {
      name = deriveFriendlyNameFromPackage(androidPackage);
    } else if (rawUrl) {
      const host = extractHostname(rawUrl);
      name = deriveFriendlyNameFromDomain(host);
    } else {
      name = 'Imported Account';
    }
  }

  return name.trim();
}

/**
 * Clean and normalize a URL:
 * Only keep real http(s) URLs, trimmed.
 * Remove tracking paths and long query strings (keep scheme + host + short path).
 */
export function normalizeCredentialUrl(rawUrl: string): { url: string; androidPackage?: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { url: '' };
  }

  const trimmed = rawUrl.trim();

  // 1. Android URI check
  if (trimmed.startsWith('android://')) {
    const pkg = extractAndroidPackage(trimmed);
    return {
      url: '',
      androidPackage: pkg || undefined,
    };
  }

  // 2. Real Web URL check
  try {
    let clean = trimmed;
    if (!clean.includes('://')) {
      // If it looks like a valid domain, prepend https://
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(clean)) {
        clean = `https://${clean}`;
      } else {
        return { url: '' };
      }
    }

    const u = new URL(clean);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { url: '' };
    }

    const host = u.hostname.toLowerCase();

    // Clean tracking query parameters
    const TRACKING_PARAMS = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'callback', 'continue', 'redirect_uri',
      'session', 'token', 'auth', 'state'
    ];

    const params = new URLSearchParams(u.search);
    for (const key of Array.from(params.keys())) {
      if (TRACKING_PARAMS.includes(key.toLowerCase()) || key.length > 30) {
        params.delete(key);
      }
    }

    // Short path limit: keep short path (under 60 chars) without long tracking hash segments
    let path = u.pathname;
    if (path.length > 60 || path.includes('/oauth') || path.includes('/authorize') || path.includes('/login/identifier')) {
      // Reduce to primary directory or root
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0 && segments[0].length < 25) {
        path = `/${segments[0]}`;
      } else {
        path = '';
      }
    }

    // Remove trailing slash if root
    if (path === '/') path = '';

    const searchStr = params.toString();
    const finalUrl = `${u.protocol}//${host}${path}${searchStr ? '?' + searchStr : ''}`;
    return { url: finalUrl };
  } catch {
    // If URL parsing fails, check if it's a domain-like string
    const match = trimmed.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s\?#]*)/i);
    if (match) {
      return { url: `https://${match[1].replace(/\/$/, '')}` };
    }
    return { url: '' };
  }
}

/**
 * Normalizes an individual row before saving into the vault
 */
export function normalizeRow(
  rawName: string,
  rawUrl: string,
  rawUsername: string,
  rawPassword: string,
  rawNotes: string = '',
  category: string = 'Web Logins'
): NormalizedRow | null {
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();

  // If both username and password are empty, invalid row
  if (!username && !password && !rawName && !rawUrl) {
    return null;
  }

  // 1. Normalize URL and detect androidPackage
  const urlRes = normalizeCredentialUrl(rawUrl);
  let androidPackage = urlRes.androidPackage;

  // Sometimes Android package is placed in the name or username field by mistake
  if (!androidPackage && rawName.startsWith('android://')) {
    androidPackage = extractAndroidPackage(rawName) || undefined;
  }

  // 2. Normalize Name
  const name = normalizeCredentialName(rawName, urlRes.url, androidPackage);

  // 3. Category assignment
  let cat = category;
  if (androidPackage) {
    cat = 'Android Apps';
  }

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name,
    url: urlRes.url,
    androidPackage,
    username,
    password,
    notes: (rawNotes || '').trim(),
    category: cat,
    selected: true,
  };
}

/**
 * De-duplicate a list of normalized rows:
 * Duplicate key: same normalized host (or androidPackage) + same username = one entry.
 * Resolves by keeping the entry with a password, or the latest.
 */
export function deduplicateNormalizedRows(
  rows: NormalizedRow[],
  existingVault: VaultCredential[] = []
): { uniqueRows: NormalizedRow[]; duplicatesCount: number } {
  const map = new Map<string, NormalizedRow>();
  let duplicatesCount = 0;

  // Build existing lookup keys
  const existingKeys = new Set<string>();
  for (const c of existingVault) {
    const host = c.androidPackage ? `pkg:${c.androidPackage.toLowerCase()}` : (c.url ? `host:${extractHostname(c.url)}` : `name:${c.name.toLowerCase().trim()}`);
    const user = (c.username || '').toLowerCase().trim();
    existingKeys.add(`${host}::${user}`);
  }

  for (const row of rows) {
    const host = row.androidPackage
      ? `pkg:${row.androidPackage.toLowerCase()}`
      : (row.url ? `host:${extractHostname(row.url)}` : `name:${row.name.toLowerCase().trim()}`);
    const user = (row.username || '').toLowerCase().trim();
    const key = `${host}::${user}`;

    if (existingKeys.has(key)) {
      duplicatesCount++;
      continue;
    }

    if (map.has(key)) {
      duplicatesCount++;
      const current = map.get(key)!;
      // Keep the one with a password, or prefer row with longer notes/url
      if (!current.password && row.password) {
        map.set(key, row);
      } else if (row.password && (!current.notes && row.notes)) {
        map.set(key, row);
      }
    } else {
      map.set(key, row);
    }
  }

  return {
    uniqueRows: Array.from(map.values()),
    duplicatesCount,
  };
}
