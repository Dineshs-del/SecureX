import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DocType =
  | 'Aadhaar Card' | 'PAN Card' | 'Passport'
  | 'Driving License' | 'Voter ID' | 'Ration Card'
  | 'Birth Certificate' | 'Marriage Certificate'
  | 'Vehicle RC' | 'GST Number' | 'Other';

export interface IdentityDocument {
  id: string;
  docType: DocType;
  docNickname: string;
  docNumber: string;
  fullName: string;
  dob?: string;
  address?: string;
  notes?: string;
  issuingCountry: string;
  issueDate?: number;
  expiryDate?: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  isExpired: boolean;
  expiresInDays: number;
  docIcon: string;
}

export const DOC_METADATA: Record<DocType, { icon: string; color: string }> = {
  'Aadhaar Card': { icon: '\uD83E\uDEAA', color: '#1B4F9A' },
  'PAN Card': { icon: '\uD83D\uDCB3', color: '#8B4513' },
  'Passport': { icon: '\uD83D\uDCD5', color: '#002868' },
  'Driving License': { icon: '\uD83D\uDE97', color: '#228B22' },
  'Voter ID': { icon: '\uD83D\uDDF3', color: '#800000' },
  'Ration Card': { icon: '\uD83D\uDCCB', color: '#FF8C00' },
  'Birth Certificate': { icon: '\uD83D\uDC76', color: '#4169E1' },
  'Marriage Certificate': { icon: '\uD83D\uDC8D', color: '#C71585' },
  'Vehicle RC': { icon: '\uD83D\uDE99', color: '#2E8B57' },
  'GST Number': { icon: '\uD83C\uDFE2', color: '#4B0082' },
  'Other': { icon: '\uD83D\uDCC4', color: '#696969' },
};

export interface IdentityState {
  docs: IdentityDocument[];
  loadDocs: () => Promise<void>;
  addDoc: (doc: Omit<IdentityDocument, 'id' | 'createdAt' | 'updatedAt' | 'isExpired' | 'expiresInDays' | 'docIcon'>) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  docs: [],
  loadDocs: async () => {
    try {
      const data = await AsyncStorage.getItem('@securex_identity_docs');
      if (data) set({ docs: JSON.parse(data) });
    } catch { }
  },
  addDoc: async (doc) => {
    const newDoc: IdentityDocument = {
      ...doc,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpired: false,
      expiresInDays: 999,
      docIcon: DOC_METADATA[doc.docType]?.icon || '\uD83D\uDCC4',
    };
    const updated = [...get().docs, newDoc];
    set({ docs: updated });
    await AsyncStorage.setItem('@securex_identity_docs', JSON.stringify(updated));
  },
  deleteDoc: async (id) => {
    const updated = get().docs.filter(d => d.id !== id);
    set({ docs: updated });
    await AsyncStorage.setItem('@securex_identity_docs', JSON.stringify(updated));
  },
}));