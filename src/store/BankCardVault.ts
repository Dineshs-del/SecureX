import { DatabaseService } from '../database/DatabaseService';
import { CryptoService } from '../crypto/CryptoService';
import { MasterPasswordManager } from '../crypto/MasterPasswordManager';
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────

export type CardType = 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Maestro' | 'Other';

export interface BankCard {
  id: string;
  cardNickname: string;
  bankName: string;
  cardType: CardType;
  cardColor: string;
  cardNumber: string;       // Decrypted — 16 digits
  cvv: string;              // Decrypted — 3/4 digits
  expiry: string;           // Decrypted — MM/YY
  pin?: string;             // Decrypted — 4/6 digits
  cardholderName: string;   // Decrypted
  billingAddress?: string;  // Decrypted
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  // Computed
  maskedNumber: string;     // **** **** **** 1234
  isExpired: boolean;
  expiresInDays: number;
}

export type NewBankCard = Omit<BankCard,
  'id' | 'createdAt' | 'updatedAt' | 'maskedNumber' | 'isExpired' | 'expiresInDays'
>;

// Card color presets
export const CARD_COLORS = {
  'HDFC Bank':  '#004C8F',
  'SBI':        '#22409A',
  'ICICI Bank': '#F58220',
  'Axis Bank':  '#800000',
  'Kotak':      '#ED1C24',
  'Yes Bank':   '#00AEEF',
  'Punjab National': '#1B4F9A',
  'Bank of Baroda':  '#F47920',
  'Default':    '#1a1a3e',
};

// ── Repository ───────────────────────────────────────

export class BankCardRepository {

  // ── READ ──────────────────────────────────────────

  static getAll(): BankCard[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM bank_cards ORDER BY card_nickname ASC'
    );
    return this.rowsToCards(result.rows ?? []);
  }

  static getById(id: string): BankCard | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM bank_cards WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToCard(result.rows[0]);
  }

  static getFavorites(): BankCard[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM bank_cards WHERE is_favorite = 1'
    );
    return this.rowsToCards(result.rows ?? []);
  }

  static getExpiringCards(daysThreshold: number = 30): BankCard[] {
    const cutoff = Date.now() + (daysThreshold * 24 * 60 * 60 * 1000);
    const all = this.getAll();
    return all.filter(card => {
      const expDate = this.parseExpiry(card.expiry);
      return expDate && expDate.getTime() < cutoff;
    });
  }

  // ── WRITE ─────────────────────────────────────────

  static add(card: NewBankCard): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO bank_cards (
        id, card_nickname, bank_name, card_type, card_color,
        encrypted_card_number, encrypted_cvv, encrypted_expiry,
        encrypted_pin, encrypted_cardholder_name, encrypted_billing_address,
        is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        card.cardNickname,
        card.bankName,
        card.cardType,
        card.cardColor,
        CryptoService.encrypt(card.cardNumber, vaultKey),
        CryptoService.encrypt(card.cvv, vaultKey),
        CryptoService.encrypt(card.expiry, vaultKey),
        card.pin ? CryptoService.encrypt(card.pin, vaultKey) : null,
        CryptoService.encrypt(card.cardholderName, vaultKey),
        card.billingAddress
          ? CryptoService.encrypt(card.billingAddress, vaultKey)
          : null,
        card.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static update(id: string, card: Partial<NewBankCard>): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('Card not found');

    db.execute(
      `UPDATE bank_cards SET
        card_nickname=?, bank_name=?, card_type=?, card_color=?,
        encrypted_card_number=?, encrypted_cvv=?, encrypted_expiry=?,
        encrypted_pin=?, encrypted_cardholder_name=?,
        encrypted_billing_address=?, is_favorite=?, updated_at=?
      WHERE id=?`,
      [
        card.cardNickname ?? existing.cardNickname,
        card.bankName ?? existing.bankName,
        card.cardType ?? existing.cardType,
        card.cardColor ?? existing.cardColor,
        CryptoService.encrypt(card.cardNumber ?? existing.cardNumber, vaultKey),
        CryptoService.encrypt(card.cvv ?? existing.cvv, vaultKey),
        CryptoService.encrypt(card.expiry ?? existing.expiry, vaultKey),
        (card.pin ?? existing.pin)
          ? CryptoService.encrypt(card.pin ?? existing.pin!, vaultKey)
          : null,
        CryptoService.encrypt(
          card.cardholderName ?? existing.cardholderName, vaultKey
        ),
        (card.billingAddress ?? existing.billingAddress)
          ? CryptoService.encrypt(
              card.billingAddress ?? existing.billingAddress!, vaultKey
            )
          : null,
        (card.isFavorite ?? existing.isFavorite) ? 1 : 0,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    const db = DatabaseService.getDatabase();
    db.execute('DELETE FROM bank_cards WHERE id = ?', [id]);
  }

  static toggleFavorite(id: string, isFavorite: boolean): void {
    const db = DatabaseService.getDatabase();
    db.execute(
      'UPDATE bank_cards SET is_favorite = ? WHERE id = ?',
      [isFavorite ? 1 : 0, id]
    );
  }

  static markUsed(id: string): void {
    const db = DatabaseService.getDatabase();
    db.execute(
      'UPDATE bank_cards SET last_used_at = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  // ── HELPERS ───────────────────────────────────────

  static detectCardType(cardNumber: string): CardType {
    const num = cardNumber.replace(/\s/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num)) return 'Mastercard';
    if (/^3[47]/.test(num)) return 'Amex';
    if (/^6/.test(num)) return 'RuPay';
    if (/^5018|^5020|^5038/.test(num)) return 'Maestro';
    return 'Other';
  }

  static maskCardNumber(cardNumber: string): string {
    const clean = cardNumber.replace(/\s/g, '');
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  static formatCardNumber(input: string): string {
    const clean = input.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }

  private static parseExpiry(expiry: string): Date | null {
    const parts = expiry.split('/');
    if (parts.length !== 2) return null;
    const month = parseInt(parts[0]) - 1;
    const year = parseInt('20' + parts[1]);
    return new Date(year, month + 1, 0); // Last day of expiry month
  }

  private static rowToCard(row: any): BankCard {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const cardNumber = CryptoService.decrypt(row.encrypted_card_number, vaultKey);
    const expiry = CryptoService.decrypt(row.encrypted_expiry, vaultKey);
    const expDate = this.parseExpiry(expiry);
    const now = Date.now();
    const expiresInDays = expDate
      ? Math.floor((expDate.getTime() - now) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: row.id,
      cardNickname: row.card_nickname,
      bankName: row.bank_name,
      cardType: row.card_type as CardType,
      cardColor: row.card_color,
      cardNumber,
      cvv: CryptoService.decrypt(row.encrypted_cvv, vaultKey),
      expiry,
      pin: row.encrypted_pin
        ? CryptoService.decrypt(row.encrypted_pin, vaultKey)
        : undefined,
      cardholderName: CryptoService.decrypt(row.encrypted_cardholder_name, vaultKey),
      billingAddress: row.encrypted_billing_address
        ? CryptoService.decrypt(row.encrypted_billing_address, vaultKey)
        : undefined,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsedAt: row.last_used_at,
      maskedNumber: this.maskCardNumber(cardNumber),
      isExpired: expiresInDays < 0,
      expiresInDays,
    };
  }

  private static rowsToCards(rows: any[]): BankCard[] {
    const results: BankCard[] = [];
    for (const row of rows) {
      try { results.push(this.rowToCard(row)); } catch {}
    }
    return results;
  }
}