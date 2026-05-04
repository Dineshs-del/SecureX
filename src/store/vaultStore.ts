import { create } from 'zustand';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';
import { CryptoService } from '../theme/crypto/CryptoService';

const STORAGE_KEY = 'securex_credentials';

export interface VaultCredential {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  category: string;
  notes: string;
  totp: string;
  favicon: string;
  strength: 'weak' | 'fair' | 'strong';
  breached?: boolean;
  createdAt: string;
  lastAccessed: string;
}

interface VaultState {
  isSetupComplete: boolean;
  isUnlocked: boolean;
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
  checkSetup: () => Promise<void>;
  setup: (password: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  lock: () => void;
  loadCredentials: () => Promise<void>;
  addCredential: (credential: Omit<VaultCredential, 'id' | 'createdAt' | 'lastAccessed'>) => Promise<string>;
  bulkAddCredentials: (creds: Omit<VaultCredential, 'id' | 'createdAt' | 'lastAccessed'>[]) => Promise<number>;
  updateCredential: (id: string, credential: Partial<VaultCredential>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  updateLastAccessed: (id: string) => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
  setBiometricEnabled: (val: boolean) => Promise<void>;
  isAutoLockEnabled: () => Promise<boolean>;
  setAutoLockEnabled: (val: boolean) => Promise<void>;
  getAutoLockDuration: () => Promise<number>;
  setAutoLockDuration: (val: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  loadStats: () => void;
  applyFilters: () => void;
  recalculateAllStrengths: () => Promise<void>;
  autofillEnabled: boolean;
  checkAutofillStatus: () => Promise<void>;
}

const LOCAL_BREACH_LIST = [
  "password", "123456", "password123", "qwerty",
  "abc123", "letmein", "monkey", "1234567890",
  "iloveyou", "admin", "welcome", "login",
  "dragon", "master", "hello", "shadow"
];

export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const hash = CryptoService.sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { 'Add-Padding': 'true' } }
    );
    
    if (!response.ok) return LOCAL_BREACH_LIST.includes(password.toLowerCase());
    
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return parseInt(count) > 0;
      }
    }
    return false;
  } catch (error) {
    return LOCAL_BREACH_LIST.includes(password.toLowerCase());
  }
}

export const getPasswordStrength = (pw: string): 'weak' | 'fair' | 'strong' => {
  if (!pw) return 'weak';
  const checks = {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    numbers: /[0-9]/.test(pw),
    symbols: /[^A-Za-z0-9]/.test(pw),
    notCommon: !LOCAL_BREACH_LIST.includes(pw.toLowerCase())
  };
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  return 'strong';
};

export const useVaultStore = create<VaultState>((set, get) => ({
  isSetupComplete: false,
  isUnlocked: false,
  failedAttempts: 0,
  credentials: [],
  filteredCredentials: [],
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,
  stats: { total: 0, weak: 0, breached: 0, reused: 0, avgScore: 0, securityScore: 0 },
  autofillEnabled: false,
  autoLockEnabled: true,
  autoLockDuration: 5,

  checkSetup: async () => {
    const isSetup = await MasterPasswordManager.isSetupComplete();
    const lockEnabled = await get().isAutoLockEnabled();
    const lockDuration = await get().getAutoLockDuration();
    set({ 
      isSetupComplete: isSetup, 
      isUnlocked: MasterPasswordManager.isVaultUnlocked(),
      autoLockEnabled: lockEnabled,
      autoLockDuration: lockDuration,
    });
    if (MasterPasswordManager.isVaultUnlocked()) {
      await get().loadCredentials();
    }
  },

  setup: async (password) => {
    set({ isLoading: true, error: null });
    const result = await MasterPasswordManager.setupMasterPassword(password);
    if (result.success) {
      set({ isSetupComplete: true, isUnlocked: true, isLoading: false });
      await get().loadCredentials();
      return true;
    }
    set({ error: result.error || 'Setup failed', isLoading: false });
    return false;
  },

  unlock: async (password) => {
    const { failedAttempts } = get();
    if (failedAttempts >= 5) {
      set({ isUnlocked: true, failedAttempts: 0, isLoading: false });
      set({ error: 'Too many attempts. Please restart the app.' });
      return false;
    }
    set({ isLoading: true, error: null });
    const result = await MasterPasswordManager.unlockVault(password);
    if (result.success) {
      set({ isUnlocked: true, failedAttempts: 0, isLoading: false });
      await get().loadCredentials();
      return true;
    }
    const newAttempts = failedAttempts + 1;
    set({
      failedAttempts: newAttempts,
      error: `Wrong password. ${5 - newAttempts} attempts remaining.`,
      isLoading: false,
    });
    return false;
  },

  unlockWithBiometrics: async () => {
    set({ isLoading: true, error: null });
    const result = await MasterPasswordManager.unlockWithBiometrics();
    if (result.success) {
      set({ isUnlocked: true, failedAttempts: 0, isLoading: false });
      set({ isUnlocked: true, failedAttempts: 0, isLoading: false });
      await get().loadCredentials();
      return true;
    }
    set({ error: result.error || 'Biometric unlock failed', isLoading: false });
    return false;
  },

  isBiometricEnabled: async () => {
    const val = await AsyncStorage.getItem('securex_biometric_enabled');
    return val === 'true';
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
    return dur === null ? 5 : parseInt(dur);
  },

  setAutoLockDuration: async (val: number) => {
    await AsyncStorage.setItem('securex_autolock_duration', val.toString());
    set({ autoLockDuration: val });
  },

  lock: () => {
    MasterPasswordManager.lockVault();  
    NativeModules.AutofillModule?.clearVaultKey();
    set({ isUnlocked: false, credentials: [], filteredCredentials: [] });
  },

  loadCredentials: async () => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      let rawCredentials = data ? JSON.parse(data) : [];
      let needsSave = false;
      const vKey = MasterPasswordManager.getVaultKey();

      const credentials = rawCredentials.map((c: any) => {
        let plainPassword = c.password;
        
        // Check if password is encrypted (looks like JSON with ciphertext)
        if (c.password.startsWith('{') && c.password.includes('ciphertext')) {
          const enc = CryptoService.stringToEncryptedData(c.password);
          if (enc) {
            const dec = CryptoService.decryptWithKey(enc, vKey);
            if (dec) plainPassword = dec;
          }
        } else {
          // Legacy plain text — needs migration on next save
          needsSave = true;
        }

        const next = { ...c, password: plainPassword };
        if (!next.strength) {
          needsSave = true;
          next.strength = getPasswordStrength(plainPassword);
        }
        return next;
      });

      if (needsSave) {
        // We'll migrate them to encrypted format in storage
        const encryptedToSave = credentials.map((c: any) => ({
          ...c,
          password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedToSave));
      }

      set({ credentials, filteredCredentials: credentials, isLoading: false });
      get().applyFilters();
      get().loadStats();
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  addCredential: async (newCred) => {
    const now = new Date().toISOString();
    let favicon = '';
    if (newCred.url) {
      try {
        const u = newCred.url.includes('://') ? newCred.url : `https://${newCred.url}`;
        const hostname = u.split('/')[2] || u;
        favicon = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
      } catch (e) {
        console.warn('Favicon fetch failed:', e);
      }
    }
    const credential: VaultCredential = {
      ...newCred,
      id: Date.now().toString(),
      favicon: favicon,
      strength: getPasswordStrength(newCred.password),
      breached: await isPasswordBreached(newCred.password),
      createdAt: now,
      lastAccessed: now,
    };

    const { credentials } = get();
    const updated = [...credentials, credential];
    
    // Encrypt for storage
    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
    }));
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    get().applyFilters();
    get().loadStats();
    return credential.id;
  },

  bulkAddCredentials: async (creds) => {
    const now = new Date().toISOString();
    const { credentials } = get();
    const vKey = MasterPasswordManager.getVaultKey();
    const newCredentials: VaultCredential[] = [];

    for (const newCred of creds) {
      const isDupe = credentials.some(c => 
        (c.url.toLowerCase() === newCred.url.toLowerCase() || (c.url === '' && newCred.url === '')) &&
        (c.username.toLowerCase() === newCred.username.toLowerCase() || (c.username === '' && newCred.username === '')) &&
        (c.name.toLowerCase() === newCred.name.toLowerCase())
      ) || newCredentials.some(c => 
        (c.url.toLowerCase() === newCred.url.toLowerCase() || (c.url === '' && newCred.url === '')) &&
        (c.username.toLowerCase() === newCred.username.toLowerCase() || (c.username === '' && newCred.username === '')) &&
        (c.name.toLowerCase() === newCred.name.toLowerCase())
      );

      if (!isDupe) {
        let favicon = '';
        if (newCred.url) {
          try {
            const u = newCred.url.includes('://') ? newCred.url : `https://${newCred.url}`;
            const hostname = u.split('/')[2] || u;
            favicon = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
          } catch (e) {}
        }
        newCredentials.push({
          ...newCred,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          favicon,
          strength: getPasswordStrength(newCred.password),
          breached: false,
          createdAt: now,
          lastAccessed: now,
        });
      }
    }

    if (newCredentials.length === 0) return 0;

    const updated = [...credentials, ...newCredentials];
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
    }));
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    get().applyFilters();
    get().loadStats();
    
    return newCredentials.length;
  },

  updateCredential: async (id, changes) => {
    const { credentials } = get();
    const updated = await Promise.all(credentials.map(async (c) => {
      if (c.id === id) {
        let isBreached = c.breached;
        if (changes.password) {
          isBreached = await isPasswordBreached(changes.password);
        }
        const next = { 
          ...c, 
          ...changes, 
          breached: isBreached,
          lastAccessed: new Date().toISOString() 
        };
        if (changes.password) {
          next.strength = getPasswordStrength(changes.password);
        }
        return next;
      }
      return c;
    }));

    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
    get().applyFilters();
    get().loadStats();
  },

  deleteCredential: async (id) => {
    const { credentials } = get();
    const updated = credentials.filter(c => c.id !== id);
    
    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map((c: any) => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
    }));
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    set({ credentials: updated });
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
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }
    set({ filteredCredentials: filtered });
  },

  updateLastAccessed: async (id: string) => {
    const { credentials } = get();
    const updated = credentials.map(c => 
      c.id === id ? { ...c, lastAccessed: new Date().toISOString() } : c
    );
    set({ credentials: updated });
    try {
      const vKey = MasterPasswordManager.getVaultKey();
      const storageUpdated = updated.map((c: any) => ({
        ...c,
        password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    } catch (e) {
      console.error('Failed to update lastAccessed:', e);
    }
  },

  loadStats: () => {
    const { credentials } = get();
    const total = credentials.length;
    
    // Live stats from local vault
    const weak = credentials.filter(c => c.strength === 'weak').length;
    const breached = credentials.filter(c => c.breached === true).length;
    
    // Placeholder logic for reused - can be detailed later
    const passMap: any = {};
    credentials.forEach(c => { passMap[c.password] = (passMap[c.password] || 0) + 1; });
    const reused = Object.values(passMap).filter((v: any) => v > 1).length;

    const strong = credentials.filter(c => c.strength === 'strong').length;
    const score = total === 0 ? 100 : Math.round((strong / total) * 100);
    set({ stats: { total, weak, breached, reused, avgScore: 0, securityScore: score } });
  },

  recalculateAllStrengths: async () => {
    const { credentials } = get();
    const updated = await Promise.all(credentials.map(async (c) => ({
      ...c, 
      strength: getPasswordStrength(c.password),
      breached: await isPasswordBreached(c.password)
    })));
    
    const vKey = MasterPasswordManager.getVaultKey();
    const storageUpdated = updated.map(c => ({
      ...c,
      password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey))
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageUpdated));
    
    set({ credentials: updated });
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
        console.error("[SECUREX] AutofillModule not found in NativeModules. Rebuild required.");
        set({ autofillEnabled: false });
      }
    } catch (error) {
      console.error("[SECUREX] Native bridge error in checkAutofillStatus:", error);
      set({ autofillEnabled: false });
    }
  },
}));
