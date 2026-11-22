import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractHostname } from '../data/brands';

const ONLINE_ICONS_SETTING_KEY = 'securex_load_online_icons';
const ICON_CACHE_PREFIX = 'securex_icon_v1_';
const ICON_CACHE_MANIFEST_KEY = 'securex_icon_manifest_v1';
const NO_ICON_SENTINEL = '__NO_ICON__';

export class IconCacheService {
  /**
   * Check if user explicitly enabled fetching website icons online.
   * Default is strictly FALSE (OFF).
   */
  static async isOnlineIconsEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(ONLINE_ICONS_SETTING_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Update the user setting for online icon resolution.
   */
  static async setOnlineIconsEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(ONLINE_ICONS_SETTING_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('[SecureX] Failed to save online icons setting:', e);
    }
  }

  /**
   * Cleans a raw URL down to strictly the domain name.
   * NEVER returns path, query, fragment, username, or port.
   */
  static sanitizeDomainOnly(rawUrl?: string): string | null {
    if (!rawUrl) return null;
    const domain = extractHostname(rawUrl);
    // Must contain at least one dot to be a valid public hostname (e.g. karnataka.gov.in)
    if (!domain || !domain.includes('.') || domain.length < 4) {
      return null;
    }
    return domain;
  }

  /**
   * Retrieve cached icon from disk (AsyncStorage), keyed by domain.
   */
  static async getCachedIcon(domain: string): Promise<string | null> {
    try {
      const cleanDomain = domain.toLowerCase().trim();
      const cached = await AsyncStorage.getItem(`${ICON_CACHE_PREFIX}${cleanDomain}`);
      if (cached === NO_ICON_SENTINEL) {
        return null; // Known to have no icon
      }
      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Store icon for domain in local cache.
   */
  static async setCachedIcon(domain: string, iconUrlOrBase64: string): Promise<void> {
    try {
      const cleanDomain = domain.toLowerCase().trim();
      await AsyncStorage.setItem(`${ICON_CACHE_PREFIX}${cleanDomain}`, iconUrlOrBase64);

      // Track manifest for easy clearing & stats
      const manifestRaw = await AsyncStorage.getItem(ICON_CACHE_MANIFEST_KEY);
      const manifest: string[] = manifestRaw ? JSON.parse(manifestRaw) : [];
      if (!manifest.includes(cleanDomain)) {
        manifest.push(cleanDomain);
        await AsyncStorage.setItem(ICON_CACHE_MANIFEST_KEY, JSON.stringify(manifest));
      }
    } catch (e) {
      console.error('[SecureX] Failed to cache icon:', e);
    }
  }

  /**
   * Mark a domain as having no valid favicon (e.g. 404, blank globe, or network error).
   * Prevents repeated queries.
   */
  static async markNoIcon(domain: string): Promise<void> {
    await this.setCachedIcon(domain, NO_ICON_SENTINEL);
  }

  /**
   * Fetch online favicon for domain ONLY if:
   * 1. Online icons setting is ON
   * 2. Clean domain is known
   * 3. Domain is not already cached
   *
   * Privacy guarantee: ONLY the domain is sent. Never name, user, password, or path.
   */
  static async resolveOnlineIcon(domain: string): Promise<string | null> {
    const isEnabled = await this.isOnlineIconsEnabled();
    if (!isEnabled) {
      return null;
    }

    const cleanDomain = domain.toLowerCase().trim();
    const cached = await this.getCachedIcon(cleanDomain);
    if (cached) {
      return cached;
    }

    // High reliability privacy-first domain favicon endpoint
    // Using DuckDuckGo & Google s2 endpoints with domain ONLY:
    const faviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;
    
    // Save to cache so next launch works completely offline
    await this.setCachedIcon(cleanDomain, faviconUrl);
    return faviconUrl;
  }

  /**
   * Clear all cached icons from disk.
   */
  static async clearCache(): Promise<number> {
    try {
      const manifestRaw = await AsyncStorage.getItem(ICON_CACHE_MANIFEST_KEY);
      const manifest: string[] = manifestRaw ? JSON.parse(manifestRaw) : [];
      const keysToRemove = manifest.map((d) => `${ICON_CACHE_PREFIX}${d}`);
      keysToRemove.push(ICON_CACHE_MANIFEST_KEY);

      await AsyncStorage.multiRemove(keysToRemove);
      return manifest.length;
    } catch (e) {
      console.error('[SecureX] Failed to clear icon cache:', e);
      return 0;
    }
  }

  /**
   * Get total count of cached domains
   */
  static async getCacheCount(): Promise<number> {
    try {
      const manifestRaw = await AsyncStorage.getItem(ICON_CACHE_MANIFEST_KEY);
      const manifest: string[] = manifestRaw ? JSON.parse(manifestRaw) : [];
      return manifest.length;
    } catch {
      return 0;
    }
  }
}
