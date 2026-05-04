// ─────────────────────────────────────────────────────────
// CRYPTOSERVICE.TS — AES-256 encryption for all credentials
// Every password is encrypted BEFORE saving to database
// Decrypted ONLY when displayed to the user
// ─────────────────────────────────────────────────────────

import CryptoJS from 'crypto-js';

// Result of an encryption operation
export interface EncryptedData {
  ciphertext: string;  // The encrypted value (base64 string)
  iv: string;          // Initialization vector (unique per encryption)
  salt: string;        // Salt used for key derivation
}

export class CryptoService {
  private static randomBytes(byteLength: number): Uint8Array {
    // react-native-get-random-values provides global crypto.getRandomValues
    const cryptoObj: any = (globalThis as any).crypto;
    if (cryptoObj?.getRandomValues) {
      const bytes = new Uint8Array(byteLength);
      cryptoObj.getRandomValues(bytes);
      return bytes;
    }
    // Fallback (non-cryptographic) — should not happen once polyfill loads
    const bytes = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
  }

  private static bytesToHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // ─────────────────────────────────────────────────────────
  // KEY DERIVATION
  // Converts master password into a 256-bit encryption key
  // Uses PBKDF2 with 10000 iterations — slow by design (resists brute force)
  // ─────────────────────────────────────────────────────────

  static deriveKey(masterPassword: string, salt: string): string {
    const key = CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: 256 / 32,    // 256 bits
      iterations: 10000,    // 10,000 rounds — adjust higher for more security
    });
    return key.toString();
  }

  static deriveShareKey(pin: string, salt: string): string {
    const key = CryptoJS.PBKDF2(pin, salt, {
      keySize: 256 / 32,
      iterations: 200000, 
    });
    return key.toString();
  }

  static generateSalt(): string {
    return this.bytesToHex(this.randomBytes(256 / 8));
  }

  static generateIV(): string {
    return this.bytesToHex(this.randomBytes(128 / 8));
  }

  // ─────────────────────────────────────────────────────────
  // ENCRYPTION
  // Takes plain text + master password → returns encrypted blob
  // Each encryption uses a NEW random IV — so identical passwords
  // produce completely different ciphertexts in the database
  // ─────────────────────────────────────────────────────────

  static encrypt(plaintext: string, masterPassword: string): EncryptedData {
    const salt = this.generateSalt();
    const iv = this.generateIV();
    const key = this.deriveKey(masterPassword, salt);

    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(key), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      ciphertext: encrypted.toString(),
      iv,
      salt,
    };
  }

  // ─────────────────────────────────────────────────────────
  // DECRYPTION
  // Takes encrypted blob + master password → returns plain text
  // If wrong password is used — returns null (never throws)
  // ─────────────────────────────────────────────────────────

  static decrypt(
    encryptedData: EncryptedData,
    masterPassword: string
  ): string | null {
    try {
      const key = this.deriveKey(masterPassword, encryptedData.salt);

      const decrypted = CryptoJS.AES.decrypt(
        encryptedData.ciphertext,
        CryptoJS.enc.Hex.parse(key),
        {
          iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      // Empty string means wrong password was used
      if (!plaintext) return null;
      return plaintext;
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // DIRECT KEY ENCRYPTION (Uses pre-derived vault key)
  // ─────────────────────────────────────────────────────────
  static encryptWithKey(plaintext: string, hexKey: string): EncryptedData {
    const iv = this.generateIV();
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(hexKey), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return { ciphertext: encrypted.toString(), iv, salt: '' };
  }

  static decryptWithKey(encryptedData: EncryptedData, hexKey: string): string | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        encryptedData.ciphertext,
        CryptoJS.enc.Hex.parse(hexKey),
        {
          iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      return plaintext || null;
    } catch {
      return null;
    }
  }

  static encryptStringWithKey(plaintext: string, hexKey: string): string {
    return this.encryptedDataToString(this.encryptWithKey(plaintext, hexKey));
  }

  static decryptStringWithKey(encryptedStr: string, hexKey: string): string {
    const data = this.stringToEncryptedData(encryptedStr);
    return data ? (this.decryptWithKey(data, hexKey) || '') : '';
  }

  // ─────────────────────────────────────────────────────────
  // PASSWORD HASHING
  // Used for storing/verifying the master password itself
  // SHA-256 hash — we NEVER store the master password in plain text
  // ─────────────────────────────────────────────────────────

  static hashPassword(password: string, salt: string): string {
    return CryptoJS.SHA256(password + salt).toString();
  }

  // ─────────────────────────────────────────────────────────
  // HIBP BREACH CHECK HELPER
  // Generates SHA-1 hash of password for k-anonymity check
  // We only send first 5 characters to the API — never the full hash
  // ─────────────────────────────────────────────────────────

  static sha1Hash(text: string): string {
    return CryptoJS.SHA1(text).toString().toUpperCase();
  }

  // Converts EncryptedData object to a single storable string
  static encryptedDataToString(data: EncryptedData): string {
    return JSON.stringify(data);
  }

  // Converts stored string back to EncryptedData object
  static stringToEncryptedData(str: string): EncryptedData | null {
    try {
      return JSON.parse(str) as EncryptedData;
    } catch {
      return null;
    }
  }
}