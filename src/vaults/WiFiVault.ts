import { create } from 'zustand';
import Clipboard from '@react-native-clipboard/clipboard';
import { encryptData, decryptData } from './encryption';
import { VaultStorage } from './storage';

const STORE_KEY = 'securex_wifi';

export type WiFiSecurityType = 'WPA' | 'WEP' | 'nopass';

export interface WiFiNetwork {
  id: string;
  encryptedSsid: string;
  encryptedPassword: string;
  securityType: WiFiSecurityType;
  isHidden: boolean;
}

export interface WiFiInput {
  ssid: string;
  password?: string;
  securityType: WiFiSecurityType;
  isHidden?: boolean;
}

interface WiFiVaultState {
  networks: WiFiNetwork[];
  loadNetworks: () => Promise<void>;
  addNetwork: (input: WiFiInput) => Promise<void>;
  updateNetwork: (id: string, input: Partial<WiFiInput>) => Promise<void>;
  deleteNetwork: (id: string) => Promise<void>;
  getRawNetwork: (id: string) => WiFiInput | null;
}

// --- LOGIC UTILITIES ---

/**
 * Builds the standard raw WiFi string needed by any QR Code generator library.
 */
export const buildWiFiQRCodeData = (ssid: string, password?: string, security: WiFiSecurityType = 'WPA', isHidden: boolean = false): string => {
  // Format: WIFI:S:<SSID>;T:<WEP|WPA|blank>;P:<PASSWORD>;H:<true|false|blank>;;
  const escapeString = (str: string) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:');
  
  const s = escapeString(ssid);
  const p = password ? escapeString(password) : '';
  const t = security === 'nopass' ? '' : security;
  const h = isHidden ? 'true' : '';

  return `WIFI:S:${s};T:${t};P:${p};H:${h};;`;
};

/**
 * Auto-detects the currently connected WiFi SSID.
 * Pure logic simulation as native WiFi libraries (like react-native-wifi-reborn) are restricted.
 */
export const autoDetectCurrentWiFi = async (): Promise<string> => {
  console.log('[WiFiVault] Auto-detect called. Returning logical stub connection.');
  return Promise.resolve("My_Home_Network_5G");
};

/**
 * Convenience helper to securely copy the decrypted password to the device clipboard.
 */
export const copyPasswordToClipboard = (password: string): void => {
  if (password) {
    Clipboard.setString(password);
  }
};

// --- STORE ---

export const useWiFiVault = create<WiFiVaultState>((set, get) => ({
  networks: [],

  loadNetworks: async () => {
    try {
      const stored = await VaultStorage.loadItems<WiFiNetwork>(STORE_KEY);
      set({ networks: stored });
    } catch (e) {
      console.error('Failed to load WiFi networks:', e);
    }
  },

  addNetwork: async (input) => {
    if (!input.ssid) throw new Error('SSID is required');

    const newNetwork: WiFiNetwork = {
      id: Date.now().toString(),
      securityType: input.securityType,
      isHidden: input.isHidden || false,
      encryptedSsid: encryptData(input.ssid),
      encryptedPassword: encryptData(input.password || '')
    };

    const updated = [...get().networks, newNetwork];
    set({ networks: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  updateNetwork: async (id, input) => {
    const { networks } = get();
    const updated = networks.map(net => {
      if (net.id === id) {
        const sensitiveUpdates: Partial<WiFiNetwork> = {};
        
        if (input.ssid !== undefined) sensitiveUpdates.encryptedSsid = encryptData(input.ssid);
        if (input.password !== undefined) sensitiveUpdates.encryptedPassword = encryptData(input.password);
        if (input.securityType !== undefined) sensitiveUpdates.securityType = input.securityType;
        if (input.isHidden !== undefined) sensitiveUpdates.isHidden = input.isHidden;

        return { ...net, ...sensitiveUpdates };
      }
      return net;
    });

    set({ networks: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  deleteNetwork: async (id) => {
    const updated = get().networks.filter(n => n.id !== id);
    set({ networks: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  getRawNetwork: (id) => {
    const net = get().networks.find(n => n.id === id);
    if (!net) return null;

    try {
      return {
        ssid: decryptData(net.encryptedSsid),
        password: decryptData(net.encryptedPassword),
        securityType: net.securityType,
        isHidden: net.isHidden
      };
    } catch {
      return null;
    }
  }
}));
