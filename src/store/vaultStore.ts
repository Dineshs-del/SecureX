import { create } from 'zustand';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MasterPasswordManager, MIN_MASTER_PASSWORD_LENGTH } from '../theme/database/MasterPasswordManager';
import { CryptoService } from '../theme/crypto/CryptoService';
import * as Keychain from 'react-native-keychain';
import { extractHostname, extractRegistrableDomain } from '../utils/credentialNormalizer';
import { IconCacheService } from '../services/IconCacheService';
import { analyzeVaultSecurity } from '../utils/securityAudit';

const STORAGE_KEY = 'securex_credentials';
const BREACH_CHECK_KEY = 'securex_breach_check_enabled';
const NEVER_SAVE_DOMAINS_KEY = 'securex_never_save_domains';
const SECURE_SCREEN_KEY = 'securex_secure_screen_enabled';

function syncToAutofill(credentials: any[]) {
  try {
    const meta = credentials.map((c: any) => {
      let doms = c.domains || [];
      if ((!doms || doms.length === 0) && c.url && !c.url.startsWith('android://')) {
        const d = extractRegistrableDomain(c.url);
        if (d) doms = [d];
      }
      return {
        id: c.id,
        name: c.name,
        username: c.username,
        url: c.url || '',
        androidPackage: c.androidPackage || '',
        domains: doms,
      };
    });

    // Always send FULL credential records (with encrypted passwords) so native AutofillSaveActivity
    // never loses fields (url, androidPackage, domains, notes, etc.) when syncing or updating.
    let encryptedVault: any[] = [];
    try {
      const vKey = MasterPasswordManager.getVaultKey();
      encryptedVault = credentials.map((c: any) => {
        let doms = c.domains || [];
        if ((!doms || doms.length === 0) && c.url && !c.url.startsWith('android://')) {
          const d = extractRegistrableDomain(c.url);
          if (d) doms = [d];
        }
        return {
          ...c,
          domains: doms,
          password:
            typeof c.password === 'string' && c.password.startsWith('{') && c.password.includes('ciphertext')
              ? c.password
              : CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
        };
      });
    } catch {
      return;
    }

    NativeModules.AutofillModule?.syncCredentials(JSON.stringify(meta), JSON.stringify(encryptedVault));
  } catch {}
}

export interface VaultCredential {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  category: string;
  notes: string;
  totp?: string;
  favicon: string;
  androidPackage?: string;
  domains?: string[];
  customColor?: string;
  customLetter?: string;
  strength: 'weak' | 'fair' | 'strong';
  breached?: boolean;
  createdAt: string;
  lastAccessed: string;
}

export type NewVaultCredential = Omit<VaultCredential, 'id' | 'createdAt' | 'lastAccessed' | 'favicon' | 'strength'> & {
  id?: string;
  favicon?: string;
  strength?: 'weak' | 'fair' | 'strong';
};

interface VaultState {
  isCheckingSetup: boolean;
  isSetupComplete: boolean;
  isUnlocked: boolean;
  isPasswordVerified: boolean;
  failedAttempts: number;
  credentials: VaultCredential[];
  filteredCredentials: VaultCredential[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    weak: number;
    breached: number;
    reused: number;
    avgScore: number;
    securityScore: number;
  };
  autoLockEnabled: boolean;
  autoLockDuration: number;
  breachCheckEnabled: boolean;
  secureScreenEnabled: boolean;
  neverSaveDomains: string[];
  checkSetup: () => Promise<void>;
  setup: (password: string, biometricEnabled?: boolean) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  confirmUnlock: () => Promise<void>;
  lock: () => void;
  resetVault: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  addCredential: (credential: NewVaultCredential) => Promise<string>;
  bulkAddCredentials: (creds: NewVaultCredential[]) => Promise<number>;
  updateCredential: (id: string, credential: Partial<VaultCredential>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  updateLastAccessed: (id: string) => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
  setBiometricEnabled: (val: boolean) => Promise<void>;
  isAutoLockEnabled: () => Promise<boolean>;
  setAutoLockEnabled: (val: boolean) => Promise<void>;
  getAutoLockDuration: () => Promise<number>;
  setAutoLockDuration: (val: number) => Promise<void>;
  isBreachCheckEnabled: () => Promise<boolean>;
  setBreachCheckEnabled: (val: boolean) => Promise<void>;
  isSecureScreenEnabled: () => Promise<boolean>;
  setSecureScreenEnabled: (val: boolean) => Promise<void>;
  getNeverSaveDomains: () => Promise<string[]>;
  setNeverSaveDomains: (domains: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  loadStats: () => void;
  applyFilters: () => void;
  recalculateAllStrengths: () => Promise<void>;
  autofillEnabled: boolean;
  checkAutofillStatus: () => Promise<void>;
  loadOnlineIcons: boolean;
  getLoadOnlineIcons: () => Promise<boolean>;
  setLoadOnlineIcons: (val: boolean) => Promise<void>;
  clearIconCache: () => Promise<number>;
}

const LOCAL_BREACH_LIST = [
  'password', '123456', 'password123', 'qwerty',
  'abc123', 'letmein', 'monkey', '1234567890',
  'iloveyou', 'admin', 'welcome', 'login',
  'dragon', 'master', 'hello', 'shadow',
];

export async function isPasswordBreached(password: string): Promise<boolean> {
  if (!password) return false;
  if (LOCAL_BREACH_LIST.includes(password.toLowerCase())) return true;

  // Respect the user's "Check for known breaches" privacy setting before making any network call
  try {
    const enabledStr = await AsyncStorage.getItem(BREACH_CHECK_KEY);
    if (enabledStr !== 'true') {
      return false;
    }

    const hash = CryptoService.sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { 'Add-Padding': 'true' } }
    );

    if (!response.ok) return false;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix && hashSuffix.trim().toUpperCase() === suffix.toUpperCase()) {
        return parseInt(count, 10) > 0;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const getPasswordStrength = (pw: string): 'weak' | 'fair' | 'strong' => {
  if (!pw || pw.length < 8) return 'weak';
  const checks = {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    numbers: /[0-9]/.test(pw),
    symbols: /[^A-Za-z0-9]/.test(pw),
    notCommon: !LOCAL_BREACH_LIST.includes(pw.toLowerCase()),
  };
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  return 'strong';
};

export const useVaultStore = create<VaultState>((set, get) => ({
  isCheckingSetup: true,
  isSetupComplete: false,
  isUnlocked: false,
  failedAttempts: 0,
  credentials: [],
  filteredCredentials: [],
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,
  isPasswordVerified: false,
  stats: { total: 0, weak: 0, breached: 0, reused: 0, avgScore: 0, securityScore: 0 },
  autofillEnabled: false,
  autoLockEnabled: true,
  autoLockDuration: 5,
  breachCheckEnabled: false,
  secureScreenEnabled: true,
  neverSaveDomains: [],
  loadOnlineIcons: false,

  checkSetup: async () => {
    const isSetup = await MasterPasswordManager.isSetupComplete();
    const lockEnabled = await get().isAutoLockEnabled();
    const lockDuration = await get().getAutoLockDuration();
    const breachEnabled = await get().isBreachCheckEnabled();
    const secureScreen = await get().isSecureScreenEnabled();
    const neverDomains = await get().getNeverSaveDomains();

    // Cold start must always start locked in-app, while preserving AndroidKeyStore Autofill key
    MasterPasswordManager.lockVault();

    // Sync never-save domains and secure screen setting to Android native layer
    try {
      NativeModules.AutofillModule?.setNeverSaveDomains(JSON.stringify(neverDomains));
      NativeModules.AutofillModule?.setSecureScreen(secureScreen);
    } catch {}

    // Permanently purge stored data of removed features (Payment Cards, Digital ID, Secure Notes, WiFi, Medical, Shares)
    try {
      await AsyncStorage.multiRemove([
        '@securex_identity_docs',
        '@securex_bank_cards',
        '@securex_notes',
        '@securex_shares',
        '@securex_wifi',
        '@securex_medical',
        'securex_notes_pin',
        'securex_active_shares',
        'securex_vault_store',
      ]);
    } catch {}

    const storedAttempts = await AsyncStorage.getItem('securex_failed_attempts');
    const failedAttempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;

    set({
      isCheckingSetup: false,
      isSetupComplete: isSetup,
      isUnlocked: false,
      isPasswordVerified: false,
      failedAttempts,
      autoLockEnabled: lockEnabled,
      autoLockDuration: lockDuration,
      breachCheckEnabled: breachEnabled,
      secureScreenEnabled: secureScreen,
      neverSaveDomains: neverDomains,
    });
  },

  setup: async (password, biometricEnabled = true) => {
    set({ isLoading: true, error: null });
    const result = await MasterPasswordManager.setupMasterPassword(password, biometricEnabled);
    if (result.success) {
      await AsyncStorage.removeItem('securex_failed_attempts');
      await AsyncStorage.removeItem('securex_lockout_until');
      set({
        isSetupComplete: true,
        isUnlocked: true,
        isPasswordVerified: true,
        failedAttempts: 0,
        isLoading: false,
        credentials: [],
        filteredCredentials: [],
        stats: { total: 0, weak: 0, breached: 0, reused: 0, avgScore: 0, securityScore: 100 },
      });
      await get().loadCredentials();
      return true;
    }
    set({ error: result.error || 'Setup failed', isLoading: false });
    return false;
  },

  unlock: async (password) => {
    return await get().verifyPassword(password);
  },

  verifyPassword: async (password) => {
    // Check persisted lockout delay
    const lockoutUntilStr = await AsyncStorage.getItem('securex_lockout_until');
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs > 0) {
        const remainingSecs = Math.ceil(remainingMs / 1000);
        set({
          error: `Too many failed attempts. Try again in ${remainingSecs}s.`,
          isLoading: false,
        });
        return false;
      } else {
        await AsyncStorage.removeItem('securex_lockout_until');
      }
    }

    set({ isLoading: true, error: null });

    const result = await MasterPasswordManager.unlockVault(password);
    if (result.success) {
      await AsyncStorage.removeItem('securex_failed_attempts');
      await AsyncStorage.removeItem('securex_lockout_until');
      set({
        isUnlocked: true,
        isPasswordVerified: true,
        failedAttempts: 0,
        isLoading: false,
        error: null,
      });
      await get().loadCredentials();
      return true;
    }

    MasterPasswordManager.lockVault();
    const storedAttempts = await AsyncStorage.getItem('securex_failed_attempts');
    const currentAttempts = storedAttempts ? parseInt(storedAttempts, 10) : get().failedAttempts;
    const newAttempts = currentAttempts + 1;
    await AsyncStorage.setItem('securex_failed_attempts', newAttempts.toString());

    if (newAttempts >= 5) {
      let delaySeconds = 30;
      if (newAttempts === 5) delaySeconds = 30;
      else if (newAttempts === 6) delaySeconds = 60;
      else if (newAttempts === 7) delaySeconds = 120;
      else if (newAttempts === 8) delaySeconds = 300;
      else delaySeconds = 900;

      const lockoutUntil = Date.now() + delaySeconds * 1000;
      await AsyncStorage.setItem('securex_lockout_until', lockoutUntil.toString());

      set({
        failedAttempts: newAttempts,
        error: `Too many wrong attempts. Locked out for ${delaySeconds} seconds.`,
        isLoading: false,
      });
    } else {
      set({
        failedAttempts: newAttempts,
        error: `Wrong password. ${5 - newAttempts} attempt${5 - newAttempts === 1 ? '' : 's'} remaining before lockout.`,
        isLoading: false,
      });
    }
    return false;
  },

  changeMasterPassword: async (currentPassword, newPassword) => {
    if (!currentPassword) {
      return { success: false, error: 'Current password is required' };
    }
    if (newPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `New password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters`,
      };
    }

    const isValid = await MasterPasswordManager.verifyMasterPassword(currentPassword);
    if (!isValid) {
      return { success: false, error: 'Incorrect current master password' };
    }

    const snapshot = await MasterPasswordManager.getMasterAuthSnapshot();
    const unlockCheck = await MasterPasswordManager.unlockVault(currentPassword);
    if (!unlockCheck.success) {
      return { success: false, error: 'Incorrect current master password' };
    }
    const oldVaultKey = MasterPasswordManager.getVaultKey();

    try {
      // 1. Read & decrypt all persisted credentials using OLD key
      const rawData = await AsyncStorage.getItem(STORAGE_KEY);
      const rawCredentials = rawData ? JSON.parse(rawData) : [];
      const decryptedCredentials = rawCredentials.map((c: any) => {
        let plainPassword = c.password;
        if (typeof c.password === 'string' && c.password.startsWith('{') && c.password.includes('ciphertext')) {
          const enc = CryptoService.stringToEncryptedData(c.password);
          if (enc) {
            const dec = CryptoService.decryptWithKey(enc, oldVaultKey);
            if (dec !== null) {
              plainPassword = dec;
            }
          }
        }
        return { ...c, password: plainPassword };
      });

      // 2. Rotate master password, salt, hash, Keychain, and AndroidKeyStore wrapped key
      const rotation = await MasterPasswordManager.rotateMasterKey(newPassword);
      if (!rotation.success || !rotation.newVaultKey) {
        await MasterPasswordManager.restoreMasterAuthSnapshot(snapshot, oldVaultKey);
        return { success: false, error: rotation.error || 'Failed to rotate master key' };
      }

      // 3. Re-encrypt every credential with the NEW key
      const newVaultKey = rotation.newVaultKey;
      const reEncrypted = decryptedCredentials.map((c: any) => ({
        ...c,
        password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, newVaultKey)),
      }));

      // 4. Persist re-encrypted vault and sync to Android Autofill
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reEncrypted));
      set({ credentials: decryptedCredentials, filteredCredentials: decryptedCredentials });
      syncToAutofill(decryptedCredentials);
      get().applyFilters();
      get().loadStats();

      return { success: true };
    } catch (e: any) {
      // Roll back master key material if anything failed before saving re-encrypted vault
      await MasterPasswordManager.restoreMasterAuthSnapshot(snapshot, oldVaultKey);
      return { success: false, error: e?.message || 'Failed to re-encrypt vault' };
    }
  },

  confirmUnlock: async () => {
    if (MasterPasswordManager.isVaultUnlocked()) {
      set({ isUnlocked: true, isPasswordVerified: true });
      await get().loadCredentials();
    }
  },

  unlockWithBiometrics: async () => {
    set({ isLoading: true, error: null });
    const result = await MasterPasswordManager.unlockWithBiometrics();
    if (result.success) {
      await AsyncStorage.removeItem('securex_failed_attempts');
      await AsyncStorage.removeItem('securex_lockout_until');
      set({
        isUnlocked: true,
        isPasswordVerified: true,
        failedAttempts: 0,
        isLoading: false,
        error: null,
      });
      await get().loadCredentials();
      return true;
    }
    set({ error: result.error || 'Biometric unlock failed', isLoading: false });
    return false;
  },

  isBiometricEnabled: async () => {
    const val = await AsyncStorage.getItem('securex_biometric_enabled');
    return val === null ? true : val === 'true';
  },

  setBiometricEnabled: async (val: boolean) => {
    await AsyncStorage.setItem('securex_biometric_enabled', val ? 'true' : 'false');
  },

  isAutoLockEnabled: async () => {
    const val = await AsyncStorage.getItem('securex_autolock_enabled');
    return val === null ? true : val === 'true';
  },

  setAutoLockEnabled: async (val: boolean) => {
    await AsyncStorage.setItem('securex_autolock_enabled', val ? 'true' : 'false');
    set({ autoLockEnabled: val });
  },

  getAutoLockDuration: async () => {
    const dur = await AsyncStorage.getItem('securex_autolock_duration');
    return dur === null ? 5 : parseInt(dur, 10);
  },

  setAutoLockDuration: async (val: number) => {
    await AsyncStorage.setItem('securex_autolock_duration', val.toString());
    set({ autoLockDuration: val });
  },

  isBreachCheckEnabled: async () => {
    const val = await AsyncStorage.getItem(BREACH_CHECK_KEY);
    const enabled = val === 'true';
    set({ breachCheckEnabled: enabled });
    return enabled;
  },

  setBreachCheckEnabled: async (val: boolean) => {
    await AsyncStorage.setItem(BREACH_CHECK_KEY, val ? 'true' : 'false');
    set({ breachCheckEnabled: val });
    if (MasterPasswordManager.isVaultUnlocked()) {
      await get().recalculateAllStrengths();
    }
  },

  isSecureScreenEnabled: async () => {
    try {
      if (NativeModules.AutofillModule?.isSecureScreenEnabled) {
        const nativeVal = await NativeModules.AutofillModule.isSecureScreenEnabled();
        set({ secureScreenEnabled: !!nativeVal });
        return !!nativeVal;
      }
    } catch {}
    const val = await AsyncStorage.getItem(SECURE_SCREEN_KEY);
    const enabled = val === null ? true : val === 'true';
    set({ secureScreenEnabled: enabled });
    return enabled;
  },

  setSecureScreenEnabled: async (val: boolean) => {
    await AsyncStorage.setItem(SECURE_SCREEN_KEY, val ? 'true' : 'false');
    try {
      await NativeModules.AutofillModule?.setSecureScreen(val);
    } catch {}
    set({ secureScreenEnabled: val });
  },

  getNeverSaveDomains: async () => {
    try {
      const stored = await AsyncStorage.getItem(NEVER_SAVE_DOMAINS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ neverSaveDomains: parsed });
          return parsed;
        }
      }
    } catch {}
    set({ neverSaveDomains: [] });
    return [];
  },

  setNeverSaveDomains: async (domains: string[]) => {
    const cleaned = Array.from(new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean)));
    const json = JSON.stringify(cleaned);
    await AsyncStorage.setItem(NEVER_SAVE_DOMAINS_KEY, json);
    try {
      await NativeModules.AutofillModule?.setNeverSaveDomains(json);
    } catch {}
    set({ neverSaveDomains: cleaned });
  },

  getLoadOnlineIcons: async () => {
    const val = await IconCacheService.isOnlineIconsEnabled();
    set({ loadOnlineIcons: val });
    return val;
  },

  setLoadOnlineIcons: async (val: boolean) => {
    await IconCacheService.setOnlineIconsEnabled(val);
    set({ loadOnlineIcons: val });
  },

  clearIconCache: async () => {
    return await IconCacheService.clearCache();
  },

  lock: () => {
    // Lock in-app state & clear decrypted credentials from JS memory ONLY.
    // Preserves AndroidKeyStore Autofill key so Autofill/Autosave keep working with fingerprint.
    MasterPasswordManager.lockVault();
    set({ isUnlocked: false, isPasswordVerified: false, credentials: [], filteredCredentials: [] });
  },

  resetVault: async () => {
    MasterPasswordManager.lockVault();
    MasterPasswordManager.clearAutofillKey();
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      'master_password_hash',
      'master_salt',
      'is_setup_complete',
      'securex_failed_attempts',
      'securex_lockout_until',
      NEVER_SAVE_DOMAINS_KEY,
      BREACH_CHECK_KEY,
      '@securex_bank_cards',
      '@securex_identity_docs',
      '@securex_notes',
      '@securex_shares',
      '@securex_wifi',
      '@securex_medical',
      'securex_notes_pin',
    ]);
    try {
      await Keychain.resetGenericPassword({ service: 'ai-password-manager-vault-key' });
    } catch {}
    set({
      isSetupComplete: false,
      isUnlocked: false,
      isPasswordVerified: false,
      credentials: [],
      filteredCredentials: [],
      neverSaveDomains: [],
      breachCheckEnabled: false,
      stats: { total: 0, weak: 0, breached: 0, reused: 0, avgScore: 0, securityScore: 100 },
    });
  },

  loadCredentials: async () => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const rawCredentials = data ? JSON.parse(data) : [];
      let needsSave = false;
      const vKey = MasterPasswordManager.getVaultKey();

      const credentials = rawCredentials.map((c: any) => {
        let plainPassword = c.password;

        if (c.password && typeof c.password === 'string' && c.password.startsWith('{') && c.password.includes('ciphertext')) {
          const enc = CryptoService.stringToEncryptedData(c.password);
          if (enc) {
            const dec = CryptoService.decryptWithKey(enc, vKey);
            if (dec !== null) plainPassword = dec;
          }
        } else {
          needsSave = true;
        }

        const next = { ...c, password: plainPassword };
        if (!next.id) {
          needsSave = true;
          next.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!next.strength) {
          needsSave = true;
          next.strength = getPasswordStrength(plainPassword);
        }
        if (!next.domains || next.domains.length === 0) {
          if (next.url && !next.url.startsWith('android://')) {
            const regDom = extractRegistrableDomain(next.url);
            if (regDom) {
              next.domains = [regDom];
              needsSave = true;
            }
          }
        }
        return next;
      });

      if (needsSave && credentials.length > 0) {
        const encryptedToSave = credentials.map((c: any) => ({
          ...c,
          password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedToSave));
      }

      set({ credentials, filteredCredentials: credentials, isLoading: false });
      syncToAutofill(credentials);
      get().applyFilters();
      get().loadStats();
    } catch (e: any) {
      set({ error: e.message, isLoading: false, credentials: [], filteredCredentials: [] });
      get().loadStats();
    }
  },

  addCredential: async (newCred) => {
    const now = new Date().toISOString();
    let favicon = '';
    let domains = newCred.domains || [];
    if (newCred.url) {
      try {
        const u = newCred.url.includes('://') ? newCred.url : `https://${newCred.url}`;
        const hostname = u.split('/')[2] || u;
        favicon = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
        if (domains.length === 0 && !newCred.url.startsWith('android://')) {
          const reg = extractRegistrableDomain(newCred.url);
          if (reg) domains = [reg];
        }
      } catch (e) {
        console.warn('Favicon fetch failed:', e);
      }
    }
    const credential: VaultCredential = {
      ...newCred,
      id: newCred.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domains,
      favicon: favicon,
      strength: getPasswordStrength(newCred.password),
      breached: await isPasswordBreached(newCred.password),
      createdAt: now,
      lastAccessed: now,
    };

    const { credentials } = get();
    const updated = [...credentials, credential];

    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    syncToAutofill(updated);
    get().applyFilters();
    get().loadStats();
    return credential.id;
  },

  bulkAddCredentials: async (creds) => {
    const now = new Date().toISOString();
    const { credentials } = get();
    const vKey = MasterPasswordManager.getVaultKey();
    const newCredentials: VaultCredential[] = [];

    const getCredKey = (c: { url?: string; androidPackage?: string; name?: string; username?: string }) => {
      const host = c.androidPackage
        ? `pkg:${c.androidPackage.toLowerCase()}`
        : (c.url ? `host:${extractHostname(c.url)}` : `name:${(c.name || '').toLowerCase().trim()}`);
      return `${host}::${(c.username || '').toLowerCase().trim()}`;
    };

    for (const newCred of creds) {
      const targetKey = getCredKey(newCred);
      const isDupe =
        credentials.some((c) => getCredKey(c) === targetKey) ||
        newCredentials.some((c) => getCredKey(c) === targetKey);

      if (!isDupe) {
        let favicon = '';
        let domains = newCred.domains || [];
        if (newCred.url) {
          try {
            const u = newCred.url.includes('://') ? newCred.url : `https://${newCred.url}`;
            const hostname = u.split('/')[2] || u;
            favicon = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
            if (domains.length === 0 && !newCred.url.startsWith('android://')) {
              const reg = extractRegistrableDomain(newCred.url);
              if (reg) domains = [reg];
            }
          } catch {}
        }
        newCredentials.push({
          ...newCred,
          id: (newCred as any).id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          domains,
          favicon,
          strength: getPasswordStrength(newCred.password),
          breached: LOCAL_BREACH_LIST.includes((newCred.password || '').toLowerCase()),
          createdAt: now,
          lastAccessed: now,
        });
      }
    }

    if (newCredentials.length === 0) return 0;

    const updated = [...credentials, ...newCredentials];
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    syncToAutofill(updated);
    get().applyFilters();
    get().loadStats();

    return newCredentials.length;
  },

  updateCredential: async (id, changes) => {
    const { credentials } = get();
    const updated = await Promise.all(
      credentials.map(async (c) => {
        if (c.id === id) {
          let isBreached = c.breached;
          if (changes.password) {
            isBreached = await isPasswordBreached(changes.password);
          }
          const next = {
            ...c,
            ...changes,
            breached: isBreached,
            lastAccessed: new Date().toISOString(),
          };
          if (changes.password) {
            next.strength = getPasswordStrength(changes.password);
          }
          if (changes.url && !changes.url.startsWith('android://')) {
            const reg = extractRegistrableDomain(changes.url);
            if (reg) next.domains = [reg];
          }
          return next;
        }
        return c;
      })
    );

    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    syncToAutofill(updated);
    get().applyFilters();
    get().loadStats();
  },

  deleteCredential: async (id) => {
    const { credentials } = get();
    const updated = credentials.filter((c) => c.id !== id);

    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    syncToAutofill(updated);
    get().applyFilters();
    get().loadStats();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    get().applyFilters();
  },

  applyFilters: () => {
    const { credentials, searchQuery, selectedCategory } = get();
    let filtered = credentials;
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }
    set({ filteredCredentials: filtered });
  },

  updateLastAccessed: async (id: string) => {
    const { credentials } = get();
    const updated = credentials.map((c) =>
      c.id === id ? { ...c, lastAccessed: new Date().toISOString() } : c
    );
    set({ credentials: updated });
    try {
      const vKey = MasterPasswordManager.getVaultKey();
      const storageUpdated = updated.map((c: any) => ({
        ...c,
        password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    } catch (e) {
      console.error('Failed to update lastAccessed:', e);
    }
  },

  loadStats: () => {
    const { credentials } = get();
    const audit = analyzeVaultSecurity(credentials);
    set({
      stats: {
        total: credentials.length,
        weak: audit.weakCount,
        breached: audit.breachedCount,
        reused: audit.reusedCount,
        avgScore: 0,
        securityScore: credentials.length === 0 ? 100 : audit.score,
      },
    });
  },

  recalculateAllStrengths: async () => {
    const { credentials } = get();
    const updated = await Promise.all(
      credentials.map(async (c) => ({
        ...c,
        strength: getPasswordStrength(c.password),
        breached: await isPasswordBreached(c.password),
      }))
    );

    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));

    set({ credentials: updated });
    syncToAutofill(updated);
    get().applyFilters();
    get().loadStats();
  },

  checkAutofillStatus: async () => {
    try {
      const { AutofillModule } = NativeModules;
      if (AutofillModule) {
        const result = await AutofillModule.isAutofillEnabled();
        set({ autofillEnabled: result });
      } else {
        set({ autofillEnabled: false });
      }
    } catch {
      set({ autofillEnabled: false });
    }
  },
}));
