import { create } from 'zustand';
import { encryptData, decryptData } from './encryption';
import { VaultStorage } from './storage';
import { NotificationService } from './notifications';

const STORE_KEY = 'securex_identities';

export type IdentityType = 'Aadhaar' | 'PAN' | 'Passport' | 'DrivingLicense' | 'Other';

export interface IdentityDoc {
  id: string;
  type: IdentityType;
  docName: string;
  encryptedNumber: string;
  encryptedMetadata: string;
  encryptedExpiry: string;
}

export interface IdentityInput {
  type: IdentityType;
  docName?: string;
  number: string;
  expiry?: string;
  metadata?: Record<string, string>;
}

interface IdentityVaultState {
  docs: IdentityDoc[];
  loadDocs: () => Promise<void>;
  addDoc: (input: IdentityInput) => Promise<void>;
  updateDoc: (id: string, input: Partial<IdentityInput>) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  checkExpiries: () => void;
  getRawDoc: (id: string) => IdentityInput | null;
}

// --- VALIDATORS ---
export const validateIdentityNumber = (type: IdentityType, value: string): void => {
  const num = value.trim();
  if (type === 'Aadhaar') {
    if (!/^\d{12}$/.test(num)) throw new Error('Invalid Aadhaar format. Must be 12 digits.');
  } else if (type === 'PAN') {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(num)) throw new Error('Invalid PAN format (e.g. ABCDE1234F).');
  }
};

export const useIdentityVault = create<IdentityVaultState>((set, get) => ({
  docs: [],

  loadDocs: async () => {
    try {
      const stored = await VaultStorage.loadItems<IdentityDoc>(STORE_KEY);
      set({ docs: stored });
      get().checkExpiries();
    } catch (e) {
      console.error('Failed to load identities:', e);
    }
  },

  addDoc: async (input) => {
    validateIdentityNumber(input.type, input.number);

    const newDoc: IdentityDoc = {
      id: Date.now().toString(),
      type: input.type,
      docName: input.docName || input.type,
      encryptedNumber: encryptData(input.number.trim()),
      encryptedExpiry: encryptData(input.expiry || ''),
      encryptedMetadata: encryptData(input.metadata ? JSON.stringify(input.metadata) : '')
    };

    const updated = [...get().docs, newDoc];
    set({ docs: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  updateDoc: async (id, input) => {
    const { docs } = get();
    const updated = docs.map(doc => {
      if (doc.id === id) {
        let sensitiveUpdates: Partial<IdentityDoc> = {};
        
        if (input.type) sensitiveUpdates.type = input.type;
        if (input.docName !== undefined) sensitiveUpdates.docName = input.docName;
        
        if (input.number !== undefined) {
          validateIdentityNumber(input.type || doc.type, input.number);
          sensitiveUpdates.encryptedNumber = encryptData(input.number.trim());
        }
        
        if (input.expiry !== undefined) {
          sensitiveUpdates.encryptedExpiry = encryptData(input.expiry);
        }

        if (input.metadata !== undefined) {
          sensitiveUpdates.encryptedMetadata = encryptData(JSON.stringify(input.metadata));
        }

        return { ...doc, ...sensitiveUpdates };
      }
      return doc;
    });

    set({ docs: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  deleteDoc: async (id) => {
    const updated = get().docs.filter(d => d.id !== id);
    set({ docs: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  checkExpiries: () => {
    get().docs.forEach(doc => {
      if (!doc.encryptedExpiry) return;
      try {
        const rawExpiry = decryptData(doc.encryptedExpiry);
        if (NotificationService.isExpiringSoon(rawExpiry, 30)) {
          NotificationService.triggerExpiryAlert(doc.docName, 'Document');
        }
      } catch (e) {}
    });
  },

  getRawDoc: (id) => {
    const doc = get().docs.find(d => d.id === id);
    if (!doc) return null;

    try {
      const metaStr = decryptData(doc.encryptedMetadata);
      return {
        type: doc.type,
        docName: doc.docName,
        number: decryptData(doc.encryptedNumber),
        expiry: decryptData(doc.encryptedExpiry),
        metadata: metaStr ? JSON.parse(metaStr) : undefined
      };
    } catch {
      return null;
    }
  }
}));
