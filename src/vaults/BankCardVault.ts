import { create } from 'zustand';
import { encryptData, decryptData } from './encryption';
import { VaultStorage } from './storage';
import { NotificationService } from './notifications';

const STORE_KEY = 'securex_bank_cards';

export type CardNetwork = 'Visa' | 'MasterCard' | 'RuPay' | 'Amex' | 'Discover' | 'Unknown';

export interface BankCard {
  id: string;
  cardName: string;
  cardholderName: string;
  encryptedNumber: string; 
  encryptedExpiry: string;
  encryptedCvv: string;
  encryptedPin: string;
  network: CardNetwork;
  lastFour: string;
}

export interface BankCardInput {
  cardName: string;
  cardholderName: string;
  number: string;
  expiry: string;
  cvv: string;
  pin: string;
}

interface BankCardVaultState {
  cards: BankCard[];
  loadCards: () => Promise<void>;
  addCard: (input: BankCardInput) => Promise<void>;
  updateCard: (id: string, input: Partial<BankCardInput>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  checkExpiries: () => void;
  getRawCard: (id: string) => BankCardInput | null;
}

// --- UTILS ---

/**
 * Implements Luhn algorithm validation for credit card numbers.
 */
export const isValidLuhn = (cardNumber: string): boolean => {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

/**
 * Detects the card network based on the starting digits.
 */
export const detectCardNetwork = (cardNumber: string): CardNetwork => {
  const num = cardNumber.replace(/\D/g, '');
  if (/^4/.test(num)) return 'Visa';
  if (/^5[1-5]/.test(num) || /^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/.test(num)) return 'MasterCard';
  if (/^3[47]/.test(num)) return 'Amex';
  if (/^6(?:011|5\d{2}|4[4-9]\d|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5])))/.test(num)) return 'Discover';
  if (/^6(0|52|53|58|81|82|83)/.test(num)) return 'RuPay'; // RuPay prefixes in India
  return 'Unknown';
};

export const useBankCardVault = create<BankCardVaultState>((set, get) => ({
  cards: [],

  loadCards: async () => {
    try {
      const stored = await VaultStorage.loadItems<BankCard>(STORE_KEY);
      set({ cards: stored });
      get().checkExpiries();
    } catch (error) {
      console.error('Failed to load bank cards:', error);
    }
  },

  addCard: async (input) => {
    // Validate Luhn before saving
    if (!isValidLuhn(input.number)) {
      throw new Error('Invalid Card Number (Luhn check failed)');
    }

    const sanitizedNum = input.number.replace(/\D/g, '');
    const newCard: BankCard = {
      id: Date.now().toString(),
      cardName: input.cardName || 'My Card',
      cardholderName: input.cardholderName,
      network: detectCardNetwork(sanitizedNum),
      lastFour: sanitizedNum.slice(-4),
      // Encrypt sensitive fields individually
      encryptedNumber: encryptData(sanitizedNum),
      encryptedExpiry: encryptData(input.expiry),
      encryptedCvv: encryptData(input.cvv),
      encryptedPin: encryptData(input.pin)
    };

    const updated = [...get().cards, newCard];
    set({ cards: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  updateCard: async (id, input) => {
    const { cards } = get();
    const updated = cards.map(card => {
      if (card.id === id) {
        let sensitiveUpdates: Partial<BankCard> = {};
        
        if (input.number) {
          if (!isValidLuhn(input.number)) throw new Error('Invalid Card Number (Luhn check failed)');
          const sanitizedNum = input.number.replace(/\D/g, '');
          sensitiveUpdates.encryptedNumber = encryptData(sanitizedNum);
          sensitiveUpdates.network = detectCardNetwork(sanitizedNum);
          sensitiveUpdates.lastFour = sanitizedNum.slice(-4);
        }
        
        if (input.cardName !== undefined) sensitiveUpdates.cardName = input.cardName;
        if (input.cardholderName !== undefined) sensitiveUpdates.cardholderName = input.cardholderName;
        if (input.expiry) sensitiveUpdates.encryptedExpiry = encryptData(input.expiry);
        if (input.cvv) sensitiveUpdates.encryptedCvv = encryptData(input.cvv);
        if (input.pin !== undefined) sensitiveUpdates.encryptedPin = encryptData(input.pin);

        return { ...card, ...sensitiveUpdates };
      }
      return card;
    });

    set({ cards: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  deleteCard: async (id) => {
    const updated = get().cards.filter(c => c.id !== id);
    set({ cards: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  checkExpiries: () => {
    const { cards } = get();
    // Decode expiry for each card locally to check threshold
    cards.forEach(card => {
      try {
        const rawExpiry = decryptData(card.encryptedExpiry);
        if (NotificationService.isExpiringSoon(rawExpiry, 30)) {
          NotificationService.triggerExpiryAlert(card.cardName, 'Card');
        }
      } catch (e) {
        // Ignore decryption fails (e.g., if vault is locked)
      }
    });
  },

  getRawCard: (id) => {
    const card = get().cards.find(c => c.id === id);
    if (!card) return null;

    try {
      return {
        cardName: card.cardName,
        cardholderName: card.cardholderName,
        number: decryptData(card.encryptedNumber),
        expiry: decryptData(card.encryptedExpiry),
        cvv: decryptData(card.encryptedCvv),
        pin: decryptData(card.encryptedPin),
      };
    } catch {
      return null;
    }
  }
}));
