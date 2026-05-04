import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveShare {
  id: string; // Unique ID for the share record
  credentialName: string;
  expiresAt: number; // timestamp
  createdAt: number;
}

interface ShareState {
  activeShares: ActiveShare[];
  loadShares: () => Promise<void>;
  addShare: (share: ActiveShare) => Promise<void>;
  removeShare: (id: string) => Promise<void>;
  pruneExpiredShares: () => Promise<void>;
}

const STORAGE_KEY = 'securex_active_shares';

export const useShareStore = create<ShareState>((set, get) => ({
  activeShares: [],

  loadShares: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        set({ activeShares: JSON.parse(data) });
      }
      get().pruneExpiredShares();
    } catch {}
  },

  addShare: async (share) => {
    try {
      const updated = [...get().activeShares, share];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ activeShares: updated });
    } catch {}
  },

  removeShare: async (id) => {
    try {
      const updated = get().activeShares.filter(s => s.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ activeShares: updated });
    } catch {}
  },

  pruneExpiredShares: async () => {
    try {
      const now = Date.now();
      const { activeShares } = get();
      const updated = activeShares.filter(s => s.expiresAt > now);
      if (updated.length !== activeShares.length) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        set({ activeShares: updated });
      }
    } catch {}
  }
}));
