import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecureNote {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_COLORS = [
  '#1a1a3e', '#003518', '#3B0010',
  '#3A2800', '#001A4A', '#2F1A00',
];

export const NOTE_CATEGORIES = [
  'General', 'Personal', 'Work',
  'Financial', 'Medical', 'Legal',
];

export interface SecureNoteState {
  notes: SecureNote[];
  loadNotes: () => Promise<void>;
  addNote: (note: Omit<SecureNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNote: (id: string, note: Partial<SecureNote>) => Promise<void>;
}

export const useSecureNotesStore = create<SecureNoteState>((set, get) => ({
  notes: [],
  loadNotes: async () => {
    try {
      const data = await AsyncStorage.getItem('@securex_notes');
      if (data) set({ notes: JSON.parse(data) });
    } catch { }
  },
  addNote: async (note) => {
    const newNote: SecureNote = {
      ...note,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...get().notes, newNote];
    set({ notes: updated });
    await AsyncStorage.setItem('@securex_notes', JSON.stringify(updated));
  },
  deleteNote: async (id) => {
    const updated = get().notes.filter(n => n.id !== id);
    set({ notes: updated });
    await AsyncStorage.setItem('@securex_notes', JSON.stringify(updated));
  },
  updateNote: async (id, note) => {
    const updated = get().notes.map(n =>
      n.id === id ? { ...n, ...note, updatedAt: Date.now() } : n
    );
    set({ notes: updated });
    await AsyncStorage.setItem('@securex_notes', JSON.stringify(updated));
  },
}));