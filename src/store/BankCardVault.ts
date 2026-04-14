import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardType = 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Maestro' | 'Other';

export interface BankCard {
  id: string;
  cardNickname: string;
  bankName: string;
  cardType: CardType;
  cardColor: string;
  cardNumber: string;
  cvv: string;
  expiry: string;
  pin?: string;
  cardholderName: string;
  billingAddress?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  maskedNumber: string;
  isExpired: boolean;
  expiresInDays: number;
}

export const CARD_COLORS: Record<string, string> = {
  'HDFC Bank': '#004C8F',
  'SBI': '#22409A',
  'ICICI Bank': '#F58220',
  'Axis Bank': '#800000',
  'Kotak': '#ED1C24',
  'Yes Bank': '#00AEEF',
  'Default': '#1a1a3e',
};

export interface BankCardState {
  cards: BankCard[];
  loadCards: () => Promise<void>;
  addCard: (card: Omit<BankCard, 'id' | 'createdAt' | 'updatedAt' | 'maskedNumber' | 'isExpired' | 'expiresInDays'>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

export const useBankCardStore = create<BankCardState>((set, get) => ({
  cards: [],
  loadCards: async () => {
    try {
      const data = await AsyncStorage.getItem('@securex_bank_cards');
      if (data) set({ cards: JSON.parse(data) });
    } catch { }
  },
  addCard: async (card) => {
    const last4 = card.cardNumber.replace(/\s/g, '').slice(-4);
    const newCard: BankCard = {
      ...card,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maskedNumber: `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${last4}`,
      isExpired: false,
      expiresInDays: 999,
    };
    const updated = [...get().cards, newCard];
    set({ cards: updated });
    await AsyncStorage.setItem('@securex_bank_cards', JSON.stringify(updated));
  },
  deleteCard: async (id) => {
    const updated = get().cards.filter(c => c.id !== id);
    set({ cards: updated });
    await AsyncStorage.setItem('@securex_bank_cards', JSON.stringify(updated));
  },
}));